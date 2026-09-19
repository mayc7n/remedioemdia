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
  atualizarRegistro,
  criarRegistro,
  estadoInicial,
  ocorrenciasDoDia,
} from './src/dominio/agenda';
import {
  adiarLembrete,
  agendarAdiantamento,
  prepararNotificacoes,
  sincronizarNotificacoesComFuso,
} from './src/notificacoes';
import { Historico } from './src/telas/Historico';
import { Inicio } from './src/telas/Inicio';
import { DetalheMedicamento } from './src/telas/DetalheMedicamento';
import { Medicamentos } from './src/telas/Medicamentos';
import { interpretarAcaoWidget } from './src/widget/acoes';

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
  const [cuidadorNome, setCuidadorNome] = useState('');
  const [cuidadorContato, setCuidadorContato] = useState('');

  const persistir = async (proximo: EstadoApp, sincronizar = true) => {
    const resultado = sincronizar ? await sincronizarNotificacoesComFuso(proximo) : { estado: proximo, fusoMudou: false, quantidade: 0 };
    setEstado(resultado.estado);
    await salvarEstado(resultado.estado);
  };

  useEffect(() => {
    let montado = true;
    (async () => {
      const salvo = await carregarEstado();
      const resultado = await sincronizarNotificacoesComFuso(salvo);
      if (!montado) return;
      setEstado(resultado.estado);
      if (resultado.fusoMudou) await salvarEstado(resultado.estado);
      setCarregando(false);
    })();
    return () => { montado = false; };
  }, []);

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
    const nova: Consulta = { id: idNovo(), tipo: consultaTipo, titulo: consultaTitulo.trim(), marcadoPara: consultaData, lembretes: true, concluida: false };
    await persistir({ ...estado, consultas: [...estado.consultas, nova] });
    setConsultaTitulo('');
    setConsultaData('');
    setModal(null);
  };

  const salvarCuidador = async () => {
    if (!cuidadorNome.trim() || !cuidadorContato.trim()) {
      Alert.alert('Confira os dados', 'Informe o nome e uma forma de contato.');
      return;
    }
    Alert.alert('Autorizar cuidador?', 'O compartilhamento só será ativado com sua confirmação.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Autorizar', onPress: async () => {
        await persistir({ ...estado, cuidador: { nome: cuidadorNome.trim(), contato: cuidadorContato.trim(), consentimentoAtivo: true, autorizadoEm: new Date().toISOString(), avisos: { esquecido: true, adiado: true, consulta: true } } });
        setModal(null);
      } },
    ]);
  };

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
      {aba === 'mais' && <Mais consultas={consultasFuturas} cuidador={estado.cuidador} abrirConsulta={() => setModal('consulta')} abrirCuidador={() => setModal('cuidador')} />}
    </ScrollView>
    <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: cores.texto, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 }}>
      {([['inicio', 'Hoje'], ['medicamentos', 'Remédios'], ['historico', 'Histórico'], ['mais', 'Mais']] as [Aba, string][]).map(([chave, texto]) => <Pressable key={chave} accessibilityRole="tab" accessibilityState={{ selected: aba === chave }} onPress={() => setAba(chave)} style={{ alignItems: 'center', minWidth: 70, minHeight: 48, justifyContent: 'center' }}><Text style={{ color: aba === chave ? cores.branco : '#A9B7B0', fontSize: 12, fontWeight: '700' }}>{texto}</Text></Pressable>)}
    </View>
    <ModalConsulta visivel={modal === 'consulta'} fechar={() => setModal(null)} titulo={consultaTitulo} setTitulo={setConsultaTitulo} data={consultaData} setData={setConsultaData} tipo={consultaTipo} setTipo={setConsultaTipo} salvar={cadastrarConsulta} />
    <ModalCuidador visivel={modal === 'cuidador'} fechar={() => setModal(null)} nome={cuidadorNome} setNome={setCuidadorNome} contato={cuidadorContato} setContato={setCuidadorContato} salvar={salvarCuidador} />
  </SafeAreaView>;
}

function Mais({ consultas, cuidador, abrirConsulta, abrirCuidador }: { consultas: Consulta[]; cuidador?: EstadoApp['cuidador']; abrirConsulta: () => void; abrirCuidador: () => void }) {
  return <View><Text style={estilos.secundario}>Mais opções</Text><Text style={estilos.titulo}>Cuidados da rotina</Text><Botao texto="Cadastrar consulta ou exame" onPress={abrirConsulta} /><Botao texto="Adicionar cuidador autorizado" variante="suave" onPress={abrirCuidador} /><View style={estilos.cartao}><Text style={estilos.nome}>Cuidador</Text><Text style={estilos.secundario}>{cuidador?.consentimentoAtivo ? `${cuidador.nome} está autorizado neste aparelho.` : 'Nenhum cuidador autorizado.'}</Text></View><View style={estilos.cartao}><Text style={estilos.nome}>Privacidade</Text><Text style={estilos.secundario}>Seus dados ficam neste aparelho. Nenhum aviso externo foi enviado.</Text></View><Text style={[estilos.secundario, { textAlign: 'center', marginTop: 28 }]}>Remédio em Dia · versão MVP</Text></View>;
}

function ModalConsulta({ visivel, fechar, titulo, setTitulo, data, setData, tipo, setTipo, salvar }: { visivel: boolean; fechar: () => void; titulo: string; setTitulo: (value: string) => void; data: string; setData: (value: string) => void; tipo: 'consulta' | 'exame'; setTipo: (value: 'consulta' | 'exame') => void; salvar: () => void }) {
  return <CaixaModal visivel={visivel} fechar={fechar} titulo="Novo compromisso"><View style={estilos.escolhas}><Botao texto="Consulta" variante={tipo === 'consulta' ? 'primario' : 'suave'} onPress={() => setTipo('consulta')} /><Botao texto="Exame" variante={tipo === 'exame' ? 'primario' : 'suave'} onPress={() => setTipo('exame')} /></View><Campo label="Nome" value={titulo} onChangeText={setTitulo} placeholder="Ex.: Retorno com cardiologista" /><Campo label="Data e hora" value={data} onChangeText={setData} placeholder="2026-09-20T14:30" /><Botao texto="Salvar compromisso" onPress={salvar} /></CaixaModal>;
}

function ModalCuidador({ visivel, fechar, nome, setNome, contato, setContato, salvar }: { visivel: boolean; fechar: () => void; nome: string; setNome: (value: string) => void; contato: string; setContato: (value: string) => void; salvar: () => void }) {
  return <CaixaModal visivel={visivel} fechar={fechar} titulo="Cuidador autorizado"><Text style={estilos.ajuda}>O compartilhamento exige sua autorização. Nenhum aviso externo foi enviado nesta versão.</Text><Campo label="Nome do cuidador" value={nome} onChangeText={setNome} placeholder="Ex.: Ana" /><Campo label="Contato" value={contato} onChangeText={setContato} placeholder="Telefone ou e-mail" keyboardType="phone-pad" /><Botao texto="Autorizar cuidador" onPress={salvar} /></CaixaModal>;
}
