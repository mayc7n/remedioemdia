import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Linking, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Botao } from './src/componentes/Botao';
import type { ModoCuidadorEscolhido } from './src/componentes/EscolhaModoCuidador';
import { Navegacao } from './src/componentes/Navegacao';
import { cores, espacamentos, estilos } from './src/componentes/tema';
import { carregarEstado, salvarEstado } from './src/dados/armazenamento';
import {
  Consulta,
  EstadoApp,
  Medicamento,
  RegistroMedicamento,
  aplicarAcaoNaOcorrencia,
  atualizarRegistro,
  criarRegistro,
  desfazerAcaoNaOcorrencia,
  estadoInicial,
  ocorrenciaPorId,
  ocorrenciasDoDia,
} from './src/dominio/agenda';
import {
  agendarAdiantamento,
  configurarNotificacoesNativas,
  deveSincronizarAoRetomar,
  interpretarRespostaNotificacao,
  prepararNotificacoes,
  processarRespostaNotificacao,
  processarAcaoNotificacao,
  sincronizarNotificacoesComFuso,
} from './src/notificacoes';
import * as Notifications from 'expo-notifications';
import { definirModoCuidador, salvarCuidadorComConsentimento, revogarCuidador } from './src/cuidador';
import { Historico } from './src/telas/Historico';
import { BoasVindas } from './src/telas/BoasVindas';
import { Inicio } from './src/telas/Inicio';
import { DetalheMedicamento } from './src/telas/DetalheMedicamento';
import { Mais as MaisTela } from './src/telas/Mais';
import { Medicamentos } from './src/telas/Medicamentos';
import { ModalConsulta, ModalCuidador } from './src/telas/Modais';
import { interpretarAcaoWidget, interpretarAlvoWidget } from './src/widget/acoes';
import { atualizarTimelineWidget, estaNoExpoGo, lerEAceitarAcoesDoLedger } from './src/widget/ledger';
import { atualizarWidgetAndroid, criarSnapshotWidget, type WidgetSnapshot } from './src/widget/estado';

type Aba = 'inicio' | 'medicamentos' | 'historico' | 'mais';
type ModalAtivo = 'consulta' | 'cuidador' | 'emergencia' | null;
type DesfazerPendente = { ocorrenciaId: string; acao: 'taken' | 'snoozed' | 'missed'; registroAnterior?: RegistroMedicamento; adiamentoId?: string };
const JANELA_DESFAZER_MS = 8000;

const idNovo = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const hoje = () => new Date();

const medicamentoNovo = (): Medicamento => {
  const agora = new Date().toISOString();
  return { id: 'novo', nome: '', horarios: ['08:00'], frequencia: { tipo: 'diaria' }, situacao: 'ativo', criadoEm: agora, atualizadoEm: agora };
};

const atualizarAgenda = (estado: EstadoApp, medicamento: Medicamento) => {
  const existente = estado.medicamentos.some((item) => item.id === medicamento.id);
  const medicamentos = existente
    ? estado.medicamentos.map((item) => item.id === medicamento.id ? medicamento : item)
    : [...estado.medicamentos, { ...medicamento, id: idNovo() }];
  return { ...estado, medicamentos };
};

export default function App() {
  const [estado, setEstado] = useState<EstadoApp>(estadoInicial);
  const [aba, setAba] = useState<Aba>('inicio');
  const [modal, setModal] = useState<ModalAtivo>(null);
  const [medicamentoAberto, setMedicamentoAberto] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [consultaTitulo, setConsultaTitulo] = useState('');
  const [consultaData, setConsultaData] = useState('');
  const [consultaTipo, setConsultaTipo] = useState<'consulta' | 'exame'>('consulta');
  const [consultaLocal, setConsultaLocal] = useState('');
  const [consultaObservacao, setConsultaObservacao] = useState('');
  const [cuidadorNome, setCuidadorNome] = useState('');
  const [cuidadorContato, setCuidadorContato] = useState('');
  const [cuidadorAvisos, setCuidadorAvisos] = useState({ esquecido: true, adiado: true, consulta: true });
  const [desfazerPendente, setDesfazerPendente] = useState<DesfazerPendente | null>(null);
  const estadoRef = useRef(estado);
  const sincronizandoRetomadaRef = useRef(false);

  const persistir = async (proximo: EstadoApp, sincronizar = true) => {
    const resultado = sincronizar ? await sincronizarNotificacoesComFuso(proximo) : { estado: proximo, fusoMudou: false, quantidade: 0 };
    estadoRef.current = resultado.estado;
    setEstado(resultado.estado);
    await salvarEstado(resultado.estado);
    await atualizarWidgetAndroid(resultado.estado);
  };

  const alternarDetalhesNotificacao = async () => {
    await persistir({ ...estado, mostrarDetalhesNotificacao: !estado.mostrarDetalhesNotificacao });
  };

  const alterarModoCuidador = async (modo: 'semCuidador' | 'comCuidador', confirmacaoRevogacao: boolean) => {
    await persistir(definirModoCuidador(estado, modo, confirmacaoRevogacao));
  };

  const concluirBoasVindas = async (modo: ModoCuidadorEscolhido) => {
    await persistir({ ...estado, concluiuBoasVindas: true, modoCuidador: modo });
  };

  const concluirEscolhaMigrada = async (modo: ModoCuidadorEscolhido) => {
    await persistir(definirModoCuidador(estado, modo, false));
  };

  useEffect(() => {
    if (!desfazerPendente) return undefined;
    const timer = setTimeout(() => setDesfazerPendente(null), JANELA_DESFAZER_MS);
    return () => clearTimeout(timer);
  }, [desfazerPendente]);

  useEffect(() => {
    let montado = true;
    (async () => {
      const salvo = await carregarEstado();
      const acoesDoWidget = await lerEAceitarAcoesDoLedger();
      const respostaInicial = await Notifications.getLastNotificationResponseAsync().catch(() => null);
      const acaoInicial = interpretarRespostaNotificacao(respostaInicial);
      const comRespostaInicial = processarRespostaNotificacao(salvo, respostaInicial);
      const comAcoes = acoesDoWidget.reduce((atual, acao) => aplicarAcaoNaOcorrencia(atual, acao.ocorrenciaId, acao.acao, 'widget'), comRespostaInicial);
      await configurarNotificacoesNativas();
      if (acaoInicial?.acao === 'snoozed') {
        const ocorrencia = ocorrenciaPorId(comAcoes.medicamentos, acaoInicial.ocorrenciaId);
        const medicamento = ocorrencia ? comAcoes.medicamentos.find((item) => item.id === ocorrencia.medicamentoId) : undefined;
        if (ocorrencia && medicamento) await agendarAdiantamento(medicamento.nome, ocorrencia.id, comAcoes.mostrarDetalhesNotificacao);
      }
      if (respostaInicial) await Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
      const resultado = await sincronizarNotificacoesComFuso(comAcoes);
      if (!montado) return;
      estadoRef.current = resultado.estado;
      setEstado(resultado.estado);
      if (resultado.fusoMudou) await salvarEstado(resultado.estado);
      await atualizarWidgetAndroid(resultado.estado);
      setCarregando(false);
    })();
    return () => { montado = false; };
  }, []);

  useEffect(() => {
    let anterior = AppState.currentState;
    const assinatura = AppState.addEventListener('change', (atual) => {
      const retomar = deveSincronizarAoRetomar(anterior, atual);
      anterior = atual;
      if (!retomar || sincronizandoRetomadaRef.current) return;
      sincronizandoRetomadaRef.current = true;
      void persistir(estadoRef.current).catch(() => undefined).finally(() => {
        sincronizandoRetomadaRef.current = false;
      });
    });
    return () => assinatura.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'ios' || estaNoExpoGo()) return;
    const snapshot = criarSnapshotWidget(estado);
    const futuras: Array<{ date: Date; snapshot: WidgetSnapshot }> = [];
    for (let deslocamento = 1; deslocamento <= 7; deslocamento += 1) {
      const dia = new Date();
      dia.setHours(0, 0, 0, 0);
      dia.setDate(dia.getDate() + deslocamento);
      const ocorrencia = ocorrenciasDoDia(estado.medicamentos, dia)[0];
      if (ocorrencia) futuras.push({ date: new Date(ocorrencia.previstoPara), snapshot: { nome: ocorrencia.medicamentoNome, horario: ocorrencia.horario, estado: 'pendente', ocorrenciaId: ocorrencia.id, atualizadoEm: new Date().toISOString() } });
    }
    atualizarTimelineWidget(snapshot, futuras);
  }, [estado.medicamentos, estado.registros]);

  const ocorrencias = useMemo(() => ocorrenciasDoDia(estado.medicamentos, hoje()), [estado.medicamentos]);
  const consultasFuturas = estado.consultas.filter((item) => !item.concluida).sort((a, b) => a.marcadoPara.localeCompare(b.marcadoPara));
  const medicamentoSelecionado = medicamentoAberto === 'novo'
    ? medicamentoNovo()
    : estado.medicamentos.find((item) => item.id === medicamentoAberto);

  const marcar = async (ocorrencia: ReturnType<typeof ocorrenciasDoDia>[number], acao: 'taken' | 'snoozed' | 'missed') => {
    const medicamento = estado.medicamentos.find((item) => item.id === ocorrencia.medicamentoId);
    if (!medicamento) return;
    const registroAnterior = estado.registros.find((item) => item.id === ocorrencia.id);
    const atual = registroAnterior ?? criarRegistro(medicamento, ocorrencia.previstoPara.slice(0, 10), ocorrencia.horario);
    const atualizado = atualizarRegistro(atual, acao, 'app');
    if (atualizado === atual) return;
    const registros = estado.registros.some((item) => item.id === atual.id)
      ? estado.registros.map((item) => item.id === atual.id ? atualizado : item)
      : [...estado.registros, atualizado];
    await persistir({ ...estado, registros });
    const adiamentoId = acao === 'snoozed' ? await agendarAdiantamento(medicamento.nome, ocorrencia.id, estado.mostrarDetalhesNotificacao) : undefined;
    if (desfazerPendente?.adiamentoId) await Notifications.cancelScheduledNotificationAsync(desfazerPendente.adiamentoId);
    setDesfazerPendente({ ocorrenciaId: ocorrencia.id, acao, registroAnterior, adiamentoId });
  };

  const desfazer = async () => {
    const pendente = desfazerPendente;
    if (!pendente) return;
    const proximo = desfazerAcaoNaOcorrencia(estado, pendente.ocorrenciaId, pendente.acao, pendente.registroAnterior);
    if (proximo === estado) {
      setDesfazerPendente(null);
      return;
    }
    await persistir(proximo);
    if (pendente.adiamentoId) await Notifications.cancelScheduledNotificationAsync(pendente.adiamentoId);
    setDesfazerPendente(null);
  };

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let assinatura: { remove: () => void } | undefined;
    try {
      const { addUserInteractionListener } = require('expo-widgets') as typeof import('expo-widgets');
      assinatura = addUserInteractionListener(({ source, target }: { source: string; target: string }) => {
        if (source !== 'RemedioWidget') return;
        const alvo = interpretarAlvoWidget(target);
        const proximo = alvo ? ocorrenciaPorId(estado.medicamentos, alvo.ocorrenciaId) : null;
        if (proximo && alvo) void marcar(proximo, alvo.acao);
      });
    } catch {
      // O módulo só está disponível no development build com o alvo WidgetKit.
    }
    return () => assinatura?.remove();
  }, [estado.registros, ocorrencias]);

  useEffect(() => {
    const assinatura = Notifications.addNotificationResponseReceivedListener((resposta) => {
      const acao = interpretarRespostaNotificacao(resposta);
      if (!acao) return;
      const ocorrencia = ocorrenciaPorId(estado.medicamentos, acao.ocorrenciaId);
      const medicamento = ocorrencia ? estado.medicamentos.find((item) => item.id === ocorrencia.medicamentoId) : undefined;
      const proximo = processarAcaoNotificacao(estado, acao.ocorrenciaId, acao.acao);
      if (proximo === estado) return;
      void persistir(proximo).then(async () => {
        if (acao.acao === 'snoozed' && medicamento) await agendarAdiantamento(medicamento.nome, acao.ocorrenciaId, estado.mostrarDetalhesNotificacao);
      });
    });
    return () => assinatura.remove();
  }, [estado]);

  useEffect(() => {
    const aplicarUrl = async (url: string | null) => {
      const acao = url ? interpretarAcaoWidget(url) : null;
      const proximo = ocorrencias.find((item) => !estado.registros.some((registro) => registro.id === item.id && registro.estado !== 'pendente'));
      if (!acao || !proximo) return;
      await marcar(proximo, acao);
      setAba('inicio');
    };
    const assinatura = Linking.addEventListener('url', ({ url }) => { void aplicarUrl(url); });
    void Linking.getInitialURL().then(aplicarUrl);
    return () => assinatura.remove();
  }, [estado.registros, ocorrencias]);

  const salvarMedicamento = async (rascunho: Medicamento) => {
    const novo = rascunho.id === 'novo';
    if (novo) await prepararNotificacoes();
    const proximo = atualizarAgenda(estado, rascunho);
    await persistir(proximo);
    setMedicamentoAberto(null);
  };

  const mudarSituacao = async (situacao: 'ativo' | 'pausado') => {
    if (!medicamentoSelecionado || medicamentoSelecionado.id === 'novo') return;
    await salvarMedicamento({ ...medicamentoSelecionado, situacao, atualizadoEm: new Date().toISOString() });
  };

  const excluirMedicamento = async () => {
    if (!medicamentoSelecionado || medicamentoSelecionado.id === 'novo') return;
    await salvarMedicamento({ ...medicamentoSelecionado, situacao: 'excluido', atualizadoEm: new Date().toISOString() });
    setMedicamentoAberto(null);
  };

  const cadastrarConsulta = async () => {
    if (!consultaTitulo.trim() || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(consultaData)) {
      Alert.alert('Confira os dados', 'Escolha uma data e hora no formato brasileiro: 20/09/2026 às 14:30.');
      return;
    }
    const nova: Consulta = { id: idNovo(), tipo: consultaTipo, titulo: consultaTitulo.trim(), marcadoPara: consultaData, local: consultaLocal.trim() || undefined, observacao: consultaObservacao.trim() || undefined, lembretes: true, concluida: false };
    await persistir({ ...estado, consultas: [...estado.consultas, nova] });
    setConsultaTitulo('');
    setConsultaData('');
    setConsultaLocal('');
    setConsultaObservacao('');
    setModal(null);
  };

  const concluirConsulta = async (id: string) => {
    await persistir({ ...estado, consultas: estado.consultas.map((consulta) => consulta.id === id ? { ...consulta, concluida: true } : consulta) });
  };

  const excluirConsulta = async (id: string) => {
    await persistir({ ...estado, consultas: estado.consultas.filter((consulta) => consulta.id !== id) });
  };

  const salvarCuidador = async () => {
    if (!cuidadorNome.trim() || !cuidadorContato.trim()) {
      Alert.alert('Confira os dados', 'Informe o nome e uma forma de contato.');
      return;
    }
    Alert.alert('Autorizar cuidador?', 'O compartilhamento só será ativado com sua confirmação.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Autorizar', onPress: async () => {
        await persistir(salvarCuidadorComConsentimento(estado, { nome: cuidadorNome, contato: cuidadorContato, avisos: cuidadorAvisos }, true));
        setModal(null);
      } },
    ]);
  };

  const revogarAutorizacao = () => Alert.alert('Revogar autorização?', 'Nenhum aviso externo será enviado.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Revogar', style: 'destructive', onPress: async () => { await persistir(revogarCuidador(estado, true)); setModal(null); } },
  ]);

  if (carregando) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.fundo }}><ActivityIndicator color={cores.verde} size="large" /></View>;

  if (!estado.concluiuBoasVindas) return <BoasVindas onConcluir={concluirBoasVindas} />;

  if (estado.modoCuidador === 'naoInformado') return <BoasVindas somenteModo onConcluir={concluirEscolhaMigrada} />;

  if (medicamentoSelecionado) return <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}><StatusBar style="dark" /><View style={{ flex: 1, padding: 22 }}><Botao texto="Voltar para medicamentos" variante="texto" onPress={() => setMedicamentoAberto(null)} /><DetalheMedicamento medicamento={medicamentoSelecionado} novo={medicamentoSelecionado.id === 'novo'} registros={estado.registros} onSalvar={salvarMedicamento} onPausar={mudarSituacao} onExcluir={excluirMedicamento} /></View></SafeAreaView>;

  return <SafeAreaView edges={['top', 'left', 'right']} style={estilos.tela}>
    <StatusBar style="dark" />
    <ScrollView style={estilos.flexivel} contentContainerStyle={[estilos.conteudo, { paddingTop: espacamentos.lg, paddingBottom: espacamentos.lg }]}>
      {aba === 'inicio' && <Inicio ocorrencias={ocorrencias} registros={estado.registros} consultas={consultasFuturas} marcar={marcar} abrirMedicamento={() => setMedicamentoAberto('novo')} desfazerOcorrenciaId={desfazerPendente?.ocorrenciaId} desfazer={desfazer} />}
      {aba === 'medicamentos' && <Medicamentos medicamentos={estado.medicamentos} abrirDetalhe={setMedicamentoAberto} abrirNovo={() => setMedicamentoAberto('novo')} />}
      {aba === 'historico' && <Historico registros={estado.registros} />}
      {aba === 'mais' && <MaisTela consultas={consultasFuturas} cuidador={estado.cuidador} modoCuidador={estado.modoCuidador === 'comCuidador' ? 'comCuidador' : 'semCuidador'} alterarModoCuidador={alterarModoCuidador} abrirConsulta={() => setModal('consulta')} abrirCuidador={() => setModal('cuidador')} concluirConsulta={concluirConsulta} excluirConsulta={excluirConsulta} mostrarDetalhesNotificacao={estado.mostrarDetalhesNotificacao} alternarDetalhesNotificacao={alternarDetalhesNotificacao} />}
    </ScrollView>
    <Navegacao aba={aba} onChange={setAba} />
    <ModalConsulta visivel={modal === 'consulta'} fechar={() => setModal(null)} titulo={consultaTitulo} setTitulo={setConsultaTitulo} data={consultaData} setData={setConsultaData} tipo={consultaTipo} setTipo={setConsultaTipo} local={consultaLocal} setLocal={setConsultaLocal} observacao={consultaObservacao} setObservacao={setConsultaObservacao} salvar={cadastrarConsulta} />
    <ModalCuidador visivel={modal === 'cuidador'} fechar={() => setModal(null)} nome={cuidadorNome} setNome={setCuidadorNome} contato={cuidadorContato} setContato={setCuidadorContato} avisos={cuidadorAvisos} setAvisos={setCuidadorAvisos} salvar={salvarCuidador} revogar={estado.cuidador?.consentimentoAtivo ? revogarAutorizacao : undefined} />
  </SafeAreaView>;
}
