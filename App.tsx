import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { Botao } from './src/componentes/Botao';
import { CaixaModal } from './src/componentes/CaixaModal';
import { Campo } from './src/componentes/Campo';
import { cores, estilos } from './src/componentes/tema';
import { carregarEstado, salvarEstado } from './src/dados/armazenamento';
import {
  Consulta,
  EstadoApp,
  Medicamento,
  aplicarAcaoNaOcorrencia,
  atualizarRegistro,
  criarRegistro,
  estadoInicial,
  ocorrenciasDoDia,
} from './src/dominio/agenda';
import {
  agendarAdiantamento,
  prepararNotificacoes,
  sincronizarNotificacoesComFuso,
} from './src/notificacoes';
import { salvarCuidadorComConsentimento, revogarCuidador } from './src/cuidador';
import { ConsultaForm } from './src/telas/ConsultaForm';
import { CuidadorForm } from './src/telas/CuidadorForm';
import { Historico } from './src/telas/Historico';
import { Inicio } from './src/telas/Inicio';
import { DetalheMedicamento } from './src/telas/DetalheMedicamento';
import { Mais as MaisTela } from './src/telas/Mais';
import { Medicamentos } from './src/telas/Medicamentos';
import { interpretarAcaoWidget } from './src/widget/acoes';
import { atualizarTimelineWidget, lerEAceitarAcoesDoLedger } from './src/widget/ledger';
import { atualizarWidgetAndroid, criarSnapshotWidget, type WidgetSnapshot } from './src/widget/estado';

type Aba = 'inicio' | 'medicamentos' | 'historico' | 'mais';
type ModalAtivo = 'consulta' | 'cuidador' | 'emergencia' | null;

const idNovo = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const hoje = () => new Date();
const dataHoje = () => hoje().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

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

  const persistir = async (proximo: EstadoApp, sincronizar = true) => {
    const resultado = sincronizar ? await sincronizarNotificacoesComFuso(proximo) : { estado: proximo, fusoMudou: false, quantidade: 0 };
    setEstado(resultado.estado);
    await salvarEstado(resultado.estado);
    await atualizarWidgetAndroid(resultado.estado);
  };

  useEffect(() => {
    let montado = true;
    (async () => {
      const salvo = await carregarEstado();
      const acoesDoWidget = await lerEAceitarAcoesDoLedger();
      const comAcoes = acoesDoWidget.reduce((atual, acao) => aplicarAcaoNaOcorrencia(atual, acao.ocorrenciaId, acao.acao, 'widget'), salvo);
      const resultado = await sincronizarNotificacoesComFuso(comAcoes);
      if (!montado) return;
      setEstado(resultado.estado);
      if (resultado.fusoMudou) await salvarEstado(resultado.estado);
      await atualizarWidgetAndroid(resultado.estado);
      setCarregando(false);
    })();
    return () => { montado = false; };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
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
    const atual = estado.registros.find((item) => item.id === ocorrencia.id) ?? criarRegistro(medicamento, ocorrencia.previstoPara.slice(0, 10), ocorrencia.horario);
    const atualizado = atualizarRegistro(atual, acao, 'app');
    if (atualizado === atual) return;
    const registros = estado.registros.some((item) => item.id === atual.id)
      ? estado.registros.map((item) => item.id === atual.id ? atualizado : item)
      : [...estado.registros, atualizado];
    await persistir({ ...estado, registros });
    if (acao === 'snoozed') await agendarAdiantamento(medicamento.nome, ocorrencia.id);
  };

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let assinatura: { remove: () => void } | undefined;
    try {
      const { addUserInteractionListener } = require('expo-widgets') as typeof import('expo-widgets');
      assinatura = addUserInteractionListener(({ source, target }: { source: string; target: string }) => {
        if (source !== 'RemedioWidget' || (target !== 'taken' && target !== 'snoozed')) return;
        const proximo = ocorrencias.find((item) => !estado.registros.some((registro) => registro.id === item.id && registro.estado !== 'pendente'));
        if (proximo) void marcar(proximo, target);
      });
    } catch {
      // O módulo só está disponível no development build com o alvo WidgetKit.
    }
    return () => assinatura?.remove();
  }, [estado.registros, ocorrencias]);

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
    const proximo = atualizarAgenda(estado, rascunho);
    await persistir(proximo);
    if (rascunho.id === 'novo') await prepararNotificacoes();
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
      Alert.alert('Confira os dados', 'Use a data e hora no formato 2026-09-20T14:30.');
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

  const excluirConsulta = (id: string) => Alert.alert('Remover compromisso?', 'Os lembretes desse compromisso serão cancelados.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Remover', style: 'destructive', onPress: async () => persistir({ ...estado, consultas: estado.consultas.filter((consulta) => consulta.id !== id) }) },
  ]);

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

  if (!estado.concluiuBoasVindas) return <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}><StatusBar style="dark" /><View style={{ flex: 1, justifyContent: 'center', padding: 26 }}><Text style={{ color: cores.verde, fontWeight: '800', fontSize: 18, marginBottom: 28 }}>Remédio em Dia</Text><Text style={{ color: cores.texto, fontSize: 34, lineHeight: 40, fontWeight: '800' }}>Uma ajuda para lembrar, no seu ritmo.</Text><Text style={{ color: cores.mutado, fontSize: 18, lineHeight: 27, marginTop: 16, marginBottom: 22 }}>Organize medicamentos, consultas e exames. Seus dados ficam neste aparelho e o app continua funcionando sem Internet.</Text><View style={{ backgroundColor: cores.verdeClaro, borderRadius: 16, padding: 16, marginVertical: 18, borderLeftWidth: 4, borderLeftColor: cores.verde }}><Text style={estilos.nome}>Um lembrete, não uma prescrição</Text><Text style={estilos.secundario}>Siga sempre a orientação do seu médico. O app não altera doses nem oferece diagnóstico.</Text></View><Botao texto="Entendi, começar" onPress={() => persistir({ ...estado, concluiuBoasVindas: true })} /></View></SafeAreaView>;

  if (medicamentoSelecionado) return <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}><StatusBar style="dark" /><View style={{ flex: 1, padding: 22 }}><Botao texto="Voltar para medicamentos" variante="texto" onPress={() => setMedicamentoAberto(null)} /><DetalheMedicamento medicamento={medicamentoSelecionado} novo={medicamentoSelecionado.id === 'novo'} registros={estado.registros} onSalvar={salvarMedicamento} onPausar={mudarSituacao} onExcluir={excluirMedicamento} /></View></SafeAreaView>;

  return <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
    <StatusBar style="dark" />
    <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 100 }}>
      <Text style={[estilos.secundario, { textTransform: 'capitalize' }]}>{dataHoje()}</Text>
      {aba === 'inicio' && <Inicio ocorrencias={ocorrencias} registros={estado.registros} consultas={consultasFuturas} marcar={marcar} abrirMedicamento={() => setMedicamentoAberto('novo')} />}
      {aba === 'medicamentos' && <Medicamentos medicamentos={estado.medicamentos} abrirDetalhe={setMedicamentoAberto} abrirNovo={() => setMedicamentoAberto('novo')} />}
      {aba === 'historico' && <Historico registros={estado.registros} />}
      {aba === 'mais' && <MaisTela consultas={consultasFuturas} cuidador={estado.cuidador} abrirConsulta={() => setModal('consulta')} abrirCuidador={() => setModal('cuidador')} concluirConsulta={concluirConsulta} excluirConsulta={excluirConsulta} />}
    </ScrollView>
    <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: cores.texto, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 }}>
      {([['inicio', 'Hoje'], ['medicamentos', 'Remédios'], ['historico', 'Histórico'], ['mais', 'Mais']] as [Aba, string][]).map(([chave, texto]) => <Pressable key={chave} accessibilityRole="tab" accessibilityState={{ selected: aba === chave }} onPress={() => setAba(chave)} style={{ alignItems: 'center', minWidth: 70, minHeight: 48, justifyContent: 'center' }}><Text style={{ color: aba === chave ? cores.branco : '#A9B7B0', fontSize: 12, fontWeight: '700' }}>{texto}</Text></Pressable>)}
    </View>
    <ModalConsulta visivel={modal === 'consulta'} fechar={() => setModal(null)} titulo={consultaTitulo} setTitulo={setConsultaTitulo} data={consultaData} setData={setConsultaData} tipo={consultaTipo} setTipo={setConsultaTipo} local={consultaLocal} setLocal={setConsultaLocal} observacao={consultaObservacao} setObservacao={setConsultaObservacao} salvar={cadastrarConsulta} />
    <ModalCuidador visivel={modal === 'cuidador'} fechar={() => setModal(null)} nome={cuidadorNome} setNome={setCuidadorNome} contato={cuidadorContato} setContato={setCuidadorContato} avisos={cuidadorAvisos} setAvisos={setCuidadorAvisos} salvar={salvarCuidador} revogar={estado.cuidador?.consentimentoAtivo ? revogarAutorizacao : undefined} />
  </SafeAreaView>;
}

function ModalConsulta({ visivel, fechar, titulo, setTitulo, data, setData, tipo, setTipo, local, setLocal, observacao, setObservacao, salvar }: { visivel: boolean; fechar: () => void; titulo: string; setTitulo: (value: string) => void; data: string; setData: (value: string) => void; tipo: 'consulta' | 'exame'; setTipo: (value: 'consulta' | 'exame') => void; local: string; setLocal: (value: string) => void; observacao: string; setObservacao: (value: string) => void; salvar: () => void }) {
  return <CaixaModal visivel={visivel} fechar={fechar} titulo="Novo compromisso"><ConsultaForm titulo={titulo} setTitulo={setTitulo} data={data} setData={setData} tipo={tipo} setTipo={setTipo} local={local} setLocal={setLocal} observacao={observacao} setObservacao={setObservacao} salvar={salvar} /></CaixaModal>;
}

function ModalCuidador({ visivel, fechar, nome, setNome, contato, setContato, avisos, setAvisos, salvar, revogar }: { visivel: boolean; fechar: () => void; nome: string; setNome: (value: string) => void; contato: string; setContato: (value: string) => void; avisos: { esquecido: boolean; adiado: boolean; consulta: boolean }; setAvisos: (value: { esquecido: boolean; adiado: boolean; consulta: boolean }) => void; salvar: () => void; revogar?: () => void }) {
  return <CaixaModal visivel={visivel} fechar={fechar} titulo="Cuidador autorizado"><CuidadorForm nome={nome} setNome={setNome} contato={contato} setContato={setContato} avisos={avisos} setAvisos={setAvisos} salvar={salvar} revogar={revogar} /></CaixaModal>;
}
