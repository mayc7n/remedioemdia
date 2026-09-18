import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Consulta,
  EstadoApp,
  Medicamento,
  atualizarRegistro,
  criarRegistro,
  estadoInicial,
  ocorrenciasDoDia,
} from './src/dominio/agenda';
import { carregarEstado, salvarEstado } from './src/dados/armazenamento';
import { adiarLembrete, agendarLembrete, prepararNotificacoes } from './src/notificacoes';

type Aba = 'inicio' | 'medicamentos' | 'historico' | 'mais';
type ModalAtivo = 'medicamento' | 'consulta' | 'cuidador' | 'emergencia' | null;

const hoje = () => new Date();
const dataHoje = () => hoje().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
const idNovo = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const textoEstado = { pendente: 'Pendente', taken: 'Tomado', snoozed: 'Adiado', missed: 'Esquecido' } as const;

function Botao({ texto, onPress, variante = 'primario', desativado = false }: { texto: string; onPress: () => void; variante?: 'primario' | 'suave' | 'perigo' | 'texto'; desativado?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={texto}
      accessibilityState={{ disabled: desativado }}
      disabled={desativado}
      onPress={onPress}
      style={({ pressed }) => [styles.botao, styles[`botao_${variante}`], pressed && styles.pressionado, desativado && styles.desativado]}
    >
      <Text style={[styles.textoBotao, variante === 'texto' && styles.textoBotaoTexto]}>{texto}</Text>
    </Pressable>
  );
}

function Titulo({ children, pequeno = false }: { children: React.ReactNode; pequeno?: boolean }) {
  return <Text style={pequeno ? styles.tituloPequeno : styles.titulo}>{children}</Text>;
}

function AvisoMedico() {
  return (
    <View style={styles.aviso} accessibilityRole="text">
      <Text style={styles.avisoTitulo}>Um lembrete, não uma prescrição</Text>
      <Text style={styles.avisoTexto}>Siga sempre a orientação do seu médico. O Remédio em Dia não altera doses nem oferece diagnóstico.</Text>
    </View>
  );
}

function CartaoMedicamento({ medicamento, estado, onAction }: { medicamento: Medicamento; estado: keyof typeof textoEstado; onAction: (acao: 'taken' | 'snoozed' | 'missed') => void }) {
  return (
    <View style={styles.cartao}>
      <View style={styles.linhaEntre}>
        <View style={styles.flexivel}>
          <Text style={styles.nomeMedicamento}>{medicamento.nome}</Text>
          <Text style={styles.horario}>{medicamento.horarios.join('  ·  ')}</Text>
        </View>
        {estado !== 'pendente' && <Text style={[styles.estado, estado === 'taken' ? styles.estadoVerde : styles.estadoAtencao]}>{textoEstado[estado]}</Text>}
      </View>
      <View style={styles.acoes}>
        <Botao texto="Tomei" variante="suave" onPress={() => onAction('taken')} desativado={estado !== 'pendente'} />
        <Botao texto="Adiar 15 min" variante="suave" onPress={() => onAction('snoozed')} desativado={estado !== 'pendente'} />
        <Botao texto="Esqueci" variante="texto" onPress={() => onAction('missed')} desativado={estado !== 'pendente'} />
      </View>
    </View>
  );
}

export default function App() {
  const [estado, setEstado] = useState<EstadoApp>(estadoInicial);
  const [aba, setAba] = useState<Aba>('inicio');
  const [modal, setModal] = useState<ModalAtivo>(null);
  const [carregando, setCarregando] = useState(true);
  const [nome, setNome] = useState('');
  const [horario, setHorario] = useState('08:00');
  const [frequencia, setFrequencia] = useState<'diaria' | 'diasDaSemana'>('diaria');
  const [consultaTitulo, setConsultaTitulo] = useState('');
  const [consultaData, setConsultaData] = useState('');
  const [consultaTipo, setConsultaTipo] = useState<'consulta' | 'exame'>('consulta');
  const [cuidadorNome, setCuidadorNome] = useState('');
  const [cuidadorContato, setCuidadorContato] = useState('');

  useEffect(() => {
    carregarEstado().then((salvo) => {
      setEstado(salvo);
      setCarregando(false);
    });
  }, []);

  const ocorrencias = useMemo(() => ocorrenciasDoDia(estado.medicamentos, hoje()), [estado.medicamentos]);
  const consultasFuturas = estado.consultas.filter((item) => !item.concluida).sort((a, b) => a.marcadoPara.localeCompare(b.marcadoPara));

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    try {
      const Widget = require('./src/widget/RemedioWidget.ios').default;
      const proximo = ocorrencias[0];
      Widget.updateSnapshot({ nome: proximo?.medicamentoNome ?? 'Nenhum lembrete', horario: proximo?.horario ?? '--:--' });
    } catch {
      // Widgets só existem em um development build nativo, não no Expo Go.
    }
  }, [ocorrencias]);

  const persistir = async (proximo: EstadoApp) => {
    setEstado(proximo);
    await salvarEstado(proximo);
  };

  const marcar = async (ocorrencia: ReturnType<typeof ocorrenciasDoDia>[number], acao: 'taken' | 'snoozed' | 'missed') => {
    const medicamento = estado.medicamentos.find((item) => item.id === ocorrencia.medicamentoId);
    if (!medicamento) return;
    const atual = estado.registros.find((item) => item.id === ocorrencia.id) ?? criarRegistro(medicamento, ocorrencia.previstoPara.slice(0, 10), ocorrencia.horario);
    const atualizado = atualizarRegistro(atual, acao, 'app');
    if (atualizado.id === atual.id && atual.estado !== 'pendente') return;
    const registros = estado.registros.some((item) => item.id === atual.id)
      ? estado.registros.map((item) => item.id === atual.id ? atualizado : item)
      : [...estado.registros, atualizado];
    await persistir({ ...estado, registros });
    if (acao === 'snoozed') await adiarLembrete(medicamento.nome);
  };

  const cadastrarMedicamento = async () => {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo || !/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)) {
      Alert.alert('Confira os dados', 'Informe o nome e um horário no formato 08:00.');
      return;
    }
    const novo: Medicamento = {
      id: idNovo(),
      nome: nomeLimpo,
      horarios: [horario],
      frequencia: frequencia === 'diaria' ? { tipo: 'diaria' } : { tipo: 'diasDaSemana', dias: [1, 2, 3, 4, 5] },
      ativo: true,
      criadoEm: new Date().toISOString(),
    };
    const proximo = { ...estado, medicamentos: [...estado.medicamentos, novo] };
    await persistir(proximo);
    const permitido = await prepararNotificacoes();
    if (permitido) {
      const proximaData = new Date();
      const [horas, minutos] = horario.split(':').map(Number);
      proximaData.setHours(horas, minutos, 0, 0);
      if (proximaData.getTime() <= Date.now()) proximaData.setDate(proximaData.getDate() + 1);
      await agendarLembrete(novo.nome, proximaData);
    }
    setNome('');
    setHorario('08:00');
    setModal(null);
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
        await persistir({ ...estado, cuidador: { nome: cuidadorNome.trim(), contato: cuidadorContato.trim(), consentimentoAtivo: true, avisos: { esquecido: true, adiado: true, consulta: true } } });
        setModal(null);
      } },
    ]);
  };

  const abrirEmergencia = () => setModal('emergencia');

  if (carregando) return <View style={styles.carregando}><ActivityIndicator color={cores.verde} size="large" /></View>;

  if (!estado.concluiuBoasVindas) {
    return <SafeAreaView style={styles.tela}><StatusBar style="dark" /><View style={styles.boasVindas}>
      <Text style={styles.marca}>Remédio em Dia</Text>
      <Text style={styles.boasTitulo}>Uma ajuda para lembrar, no seu ritmo.</Text>
      <Text style={styles.boasTexto}>Organize medicamentos, consultas e exames. Seus dados ficam neste aparelho e o app continua funcionando sem Internet.</Text>
      <AvisoMedico />
      <Botao texto="Entendi, começar" onPress={() => persistir({ ...estado, concluiuBoasVindas: true })} />
      <Botao texto="Emergência" variante="perigo" onPress={abrirEmergencia} />
    </View><ModalEmergencia visivel={modal === 'emergencia'} fechar={() => setModal(null)} /></SafeAreaView>;
  }

  return <SafeAreaView style={styles.tela}>
    <StatusBar style="dark" />
    <ScrollView contentContainerStyle={styles.conteudo}>
      {aba === 'inicio' && <Inicio ocorrencias={ocorrencias} registros={estado.registros} consultas={consultasFuturas} marcar={marcar} abrirEmergencia={abrirEmergencia} abrirMedicamento={() => setModal('medicamento')} />}
      {aba === 'medicamentos' && <Medicamentos medicamentos={estado.medicamentos} abrir={() => setModal('medicamento')} />}
      {aba === 'historico' && <Historico registros={estado.registros} />}
      {aba === 'mais' && <Mais consultas={consultasFuturas} cuidador={estado.cuidador} abrirConsulta={() => setModal('consulta')} abrirCuidador={() => setModal('cuidador')} abrirEmergencia={abrirEmergencia} />}
    </ScrollView>
    <View style={styles.navegacao}>
      {([['inicio', 'Hoje'], ['medicamentos', 'Remédios'], ['historico', 'Histórico'], ['mais', 'Mais']] as [Aba, string][]).map(([chave, texto]) => <Pressable key={chave} accessibilityRole="tab" accessibilityState={{ selected: aba === chave }} onPress={() => setAba(chave)} style={styles.itemNav}><Text style={[styles.iconeNav, aba === chave && styles.navAtiva]}>{chave === 'inicio' ? '●' : chave === 'medicamentos' ? '＋' : chave === 'historico' ? '≡' : '⋯'}</Text><Text style={[styles.textoNav, aba === chave && styles.navAtiva]}>{texto}</Text></Pressable>)}
    </View>
    <ModalMedicamento visivel={modal === 'medicamento'} fechar={() => setModal(null)} nome={nome} setNome={setNome} horario={horario} setHorario={setHorario} frequencia={frequencia} setFrequencia={setFrequencia} salvar={cadastrarMedicamento} />
    <ModalConsulta visivel={modal === 'consulta'} fechar={() => setModal(null)} titulo={consultaTitulo} setTitulo={setConsultaTitulo} data={consultaData} setData={setConsultaData} tipo={consultaTipo} setTipo={setConsultaTipo} salvar={cadastrarConsulta} />
    <ModalCuidador visivel={modal === 'cuidador'} fechar={() => setModal(null)} nome={cuidadorNome} setNome={setCuidadorNome} contato={cuidadorContato} setContato={setCuidadorContato} salvar={salvarCuidador} />
    <ModalEmergencia visivel={modal === 'emergencia'} fechar={() => setModal(null)} />
  </SafeAreaView>;
}

function Inicio({ ocorrencias, registros, consultas, marcar, abrirEmergencia, abrirMedicamento }: { ocorrencias: ReturnType<typeof ocorrenciasDoDia>; registros: EstadoApp['registros']; consultas: Consulta[]; marcar: (item: ReturnType<typeof ocorrenciasDoDia>[number], acao: 'taken' | 'snoozed' | 'missed') => void; abrirEmergencia: () => void; abrirMedicamento: () => void }) {
  return <View>
    <Text style={styles.data}>{dataHoje()}</Text>
    <View style={styles.cabecalho}><View><Text style={styles.ola}>Olá, vamos por partes.</Text><Text style={styles.subtitulo}>Sua agenda de hoje</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Abrir emergência" onPress={abrirEmergencia} style={styles.emergenciaPequena}><Text style={styles.emergenciaTexto}>Emergência</Text></Pressable></View>
    <AvisoMedico />
    <Titulo>Medicamentos de hoje</Titulo>
    {ocorrencias.length === 0 ? <View style={styles.vazio}><Text style={styles.vazioTitulo}>Nenhum medicamento para hoje</Text><Text style={styles.vazioTexto}>Quando cadastrar um lembrete, ele aparece aqui.</Text><Botao texto="Adicionar medicamento" onPress={abrirMedicamento} /></View> : ocorrencias.map((item) => {
      const registro = registros.find((atual) => atual.id === item.id);
      return <CartaoMedicamento key={item.id} medicamento={{ id: item.medicamentoId, nome: item.medicamentoNome, horarios: [item.horario], frequencia: { tipo: 'diaria' }, ativo: true, criadoEm: item.previstoPara }} estado={registro?.estado ?? 'pendente'} onAction={(acao) => marcar(item, acao)} />;
    })}
    <Titulo>Próximos compromissos</Titulo>
    {consultas.length === 0 ? <Text style={styles.textoSecundario}>Nenhuma consulta ou exame cadastrado.</Text> : consultas.slice(0, 2).map((consulta) => <View style={styles.linhaCompromisso} key={consulta.id}><Text style={styles.pontoVerde}>●</Text><View><Text style={styles.nomeCompromisso}>{consulta.titulo}</Text><Text style={styles.textoSecundario}>{consulta.tipo} · {new Date(consulta.marcadoPara).toLocaleString('pt-BR')}</Text></View></View>)}
  </View>;
}

function Medicamentos({ medicamentos, abrir }: { medicamentos: Medicamento[]; abrir: () => void }) {
  return <View><Text style={styles.data}>Sua lista</Text><Titulo>Medicamentos</Titulo><Text style={styles.lead}>Lembretes simples, no horário que você combinou com seu médico.</Text><Botao texto="Adicionar medicamento" onPress={abrir} />{medicamentos.map((medicamento) => <View style={styles.cartaoSimples} key={medicamento.id}><Text style={styles.nomeMedicamento}>{medicamento.nome}</Text><Text style={styles.textoSecundario}>{medicamento.horarios.join(' · ')} · {medicamento.frequencia.tipo === 'diaria' ? 'todos os dias' : 'dias úteis'}</Text></View>)}{medicamentos.length === 0 && <View style={styles.vazio}><Text style={styles.vazioTitulo}>Sua lista está vazia</Text><Text style={styles.vazioTexto}>Cadastre o primeiro lembrete para começar.</Text></View>}</View>;
}

function Historico({ registros }: { registros: EstadoApp['registros'] }) {
  const ordenados = [...registros].sort((a, b) => b.previstoPara.localeCompare(a.previstoPara));
  return <View><Text style={styles.data}>Acompanhe sem culpa</Text><Titulo>Histórico</Titulo><Text style={styles.lead}>Um registro simples do que aconteceu com seus lembretes.</Text>{ordenados.length === 0 ? <View style={styles.vazio}><Text style={styles.vazioTitulo}>Ainda não há registros</Text><Text style={styles.vazioTexto}>As marcações de hoje aparecerão aqui.</Text></View> : ordenados.map((registro) => <View style={styles.linhaHistorico} key={registro.id}><View style={[styles.bolinha, registro.estado === 'taken' ? styles.bolinhaVerde : styles.bolinhaAmarela]} /><View style={styles.flexivel}><Text style={styles.nomeCompromisso}>{registro.medicamentoNome}</Text><Text style={styles.textoSecundario}>{new Date(registro.previstoPara).toLocaleString('pt-BR')} · {textoEstado[registro.estado]}</Text></View></View>)}</View>;
}

function Mais({ consultas, cuidador, abrirConsulta, abrirCuidador, abrirEmergencia }: { consultas: Consulta[]; cuidador?: EstadoApp['cuidador']; abrirConsulta: () => void; abrirCuidador: () => void; abrirEmergencia: () => void }) {
  return <View><Text style={styles.data}>Mais opções</Text><Titulo>Cuidados da rotina</Titulo><View style={styles.menu}><Botao texto="Cadastrar consulta ou exame" onPress={abrirConsulta} /><Botao texto="Adicionar cuidador autorizado" variante="suave" onPress={abrirCuidador} /><Botao texto="Emergência" variante="perigo" onPress={abrirEmergencia} /></View><View style={styles.cartaoSimples}><Text style={styles.nomeCompromisso}>Cuidador</Text><Text style={styles.textoSecundario}>{cuidador?.consentimentoAtivo ? `${cuidador.nome} está autorizado neste aparelho.` : 'Nenhum cuidador autorizado.'}</Text></View><View style={styles.cartaoSimples}><Text style={styles.nomeCompromisso}>Privacidade</Text><Text style={styles.textoSecundario}>Seus dados ficam neste aparelho. O app não envia avisos externos sem uma futura conexão autorizada.</Text></View><Text style={styles.rodape}>Remédio em Dia · versão MVP</Text></View>;
}

function Campo({ label, value, onChangeText, placeholder, keyboardType = 'default' }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'default' | 'phone-pad' }) { return <View style={styles.campo}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={cores.mutado} keyboardType={keyboardType} style={styles.input} /></View>; }

function CaixaModal({ children, visivel, fechar, titulo }: { children: React.ReactNode; visivel: boolean; fechar: () => void; titulo: string }) { return <Modal visible={visivel} animationType="slide" transparent onRequestClose={fechar}><View style={styles.fundoModal}><View style={styles.caixaModal}><View style={styles.linhaEntre}><Text style={styles.tituloModal}>{titulo}</Text><Pressable accessibilityLabel="Fechar" accessibilityRole="button" onPress={fechar}><Text style={styles.fechar}>Fechar</Text></Pressable></View><ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView></View></View></Modal>; }

function ModalMedicamento({ visivel, fechar, nome, setNome, horario, setHorario, frequencia, setFrequencia, salvar }: { visivel: boolean; fechar: () => void; nome: string; setNome: (value: string) => void; horario: string; setHorario: (value: string) => void; frequencia: 'diaria' | 'diasDaSemana'; setFrequencia: (value: 'diaria' | 'diasDaSemana') => void; salvar: () => void }) { return <CaixaModal visivel={visivel} fechar={fechar} titulo="Novo medicamento"><Campo label="Nome do medicamento" value={nome} onChangeText={setNome} placeholder="Ex.: Remédio da manhã" /><Campo label="Horário" value={horario} onChangeText={setHorario} placeholder="08:00" /><Text style={styles.label}>Frequência</Text><View style={styles.escolhas}><Botao texto="Todos os dias" variante={frequencia === 'diaria' ? 'primario' : 'suave'} onPress={() => setFrequencia('diaria')} /><Botao texto="Dias úteis" variante={frequencia === 'diasDaSemana' ? 'primario' : 'suave'} onPress={() => setFrequencia('diasDaSemana')} /></View><Text style={styles.ajuda}>Cadastre apenas o que foi orientado pelo seu médico.</Text><Botao texto="Salvar lembrete" onPress={salvar} /></CaixaModal>; }

function ModalConsulta({ visivel, fechar, titulo, setTitulo, data, setData, tipo, setTipo, salvar }: { visivel: boolean; fechar: () => void; titulo: string; setTitulo: (value: string) => void; data: string; setData: (value: string) => void; tipo: 'consulta' | 'exame'; setTipo: (value: 'consulta' | 'exame') => void; salvar: () => void }) { return <CaixaModal visivel={visivel} fechar={fechar} titulo="Novo compromisso"><Text style={styles.label}>Tipo</Text><View style={styles.escolhas}><Botao texto="Consulta" variante={tipo === 'consulta' ? 'primario' : 'suave'} onPress={() => setTipo('consulta')} /><Botao texto="Exame" variante={tipo === 'exame' ? 'primario' : 'suave'} onPress={() => setTipo('exame')} /></View><Campo label="Nome" value={titulo} onChangeText={setTitulo} placeholder="Ex.: Retorno com cardiologista" /><Campo label="Data e hora" value={data} onChangeText={setData} placeholder="2026-09-20T14:30" /><Botao texto="Salvar compromisso" onPress={salvar} /></CaixaModal>; }

function ModalCuidador({ visivel, fechar, nome, setNome, contato, setContato, salvar }: { visivel: boolean; fechar: () => void; nome: string; setNome: (value: string) => void; contato: string; setContato: (value: string) => void; salvar: () => void }) { return <CaixaModal visivel={visivel} fechar={fechar} titulo="Cuidador autorizado"><Text style={styles.ajuda}>O compartilhamento exige sua autorização. Neste MVP, o cadastro fica apenas neste aparelho.</Text><Campo label="Nome do cuidador" value={nome} onChangeText={setNome} placeholder="Ex.: Ana" /><Campo label="Contato" value={contato} onChangeText={setContato} placeholder="Telefone ou e-mail" /><Botao texto="Autorizar cuidador" onPress={salvar} /></CaixaModal>; }

function ModalEmergencia({ visivel, fechar }: { visivel: boolean; fechar: () => void }) { return <CaixaModal visivel={visivel} fechar={fechar} titulo="Emergência"><View style={styles.emergenciaBox}><Text style={styles.emergenciaTitulo}>Se houver risco imediato</Text><Text style={styles.emergenciaCorpo}>Ligue para o SAMU pelo 192 ou procure o serviço local de emergência. Este app não substitui atendimento.</Text><Botao texto="Ligar para 192" variante="perigo" onPress={() => Linking.openURL(Platform.OS === 'ios' ? 'telprompt:192' : 'tel:192')} /></View></CaixaModal>; }

const cores = { fundo: '#F7F5F0', texto: '#24312E', verde: '#2F6B58', verdeClaro: '#E4EFE8', borda: '#D8DED8', mutado: '#71807A', ambar: '#B26A27', ambarClaro: '#F6EBDD', vermelho: '#B84C45', vermelhoClaro: '#F8E7E5', branco: '#FFFFFF' };
const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo }, conteudo: { padding: 22, paddingBottom: 100 }, carregando: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.fundo }, boasVindas: { flex: 1, justifyContent: 'center', padding: 26 }, marca: { color: cores.verde, fontWeight: '800', fontSize: 18, marginBottom: 28 }, boasTitulo: { color: cores.texto, fontSize: 34, lineHeight: 40, fontWeight: '800', maxWidth: 340 }, boasTexto: { color: cores.mutado, fontSize: 18, lineHeight: 27, marginTop: 16, marginBottom: 22 }, data: { color: cores.verde, fontSize: 15, fontWeight: '700', textTransform: 'capitalize', marginBottom: 10 }, cabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }, ola: { color: cores.texto, fontSize: 25, fontWeight: '800', maxWidth: 245 }, subtitulo: { color: cores.mutado, fontSize: 17, marginTop: 5 }, titulo: { color: cores.texto, fontSize: 23, fontWeight: '800', marginTop: 27, marginBottom: 12 }, tituloPequeno: { color: cores.texto, fontSize: 18, fontWeight: '800' }, lead: { color: cores.mutado, fontSize: 17, lineHeight: 25, marginBottom: 18 }, aviso: { backgroundColor: cores.verdeClaro, borderRadius: 16, padding: 16, marginVertical: 18, borderLeftWidth: 4, borderLeftColor: cores.verde }, avisoTitulo: { color: cores.texto, fontSize: 15, fontWeight: '800', marginBottom: 5 }, avisoTexto: { color: cores.texto, fontSize: 14, lineHeight: 21 }, cartao: { backgroundColor: cores.branco, borderRadius: 18, padding: 17, marginBottom: 12, borderWidth: 1, borderColor: cores.borda }, cartaoSimples: { backgroundColor: cores.branco, borderRadius: 16, padding: 17, marginBottom: 12, borderWidth: 1, borderColor: cores.borda }, linhaEntre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }, flexivel: { flex: 1 }, nomeMedicamento: { color: cores.texto, fontSize: 19, fontWeight: '800' }, horario: { color: cores.verde, fontSize: 17, fontWeight: '700', marginTop: 5 }, estado: { fontSize: 13, fontWeight: '800', paddingVertical: 5, paddingHorizontal: 8, borderRadius: 9 }, estadoVerde: { color: cores.verde, backgroundColor: cores.verdeClaro }, estadoAtencao: { color: cores.ambar, backgroundColor: cores.ambarClaro }, acoes: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginTop: 16 }, botao: { minHeight: 48, borderRadius: 13, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', marginTop: 10 }, botao_primario: { backgroundColor: cores.verde }, botao_suave: { backgroundColor: cores.verdeClaro }, botao_perigo: { backgroundColor: cores.vermelhoClaro, borderWidth: 1, borderColor: '#E5B7B2' }, botao_texto: { backgroundColor: 'transparent', paddingHorizontal: 5 }, textoBotao: { color: cores.branco, fontSize: 15, fontWeight: '800' }, textoBotaoTexto: { color: cores.ambar, textDecorationLine: 'underline' }, pressionado: { opacity: 0.7 }, desativado: { opacity: 0.45 }, emergenciaPequena: { backgroundColor: cores.vermelhoClaro, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 10 }, emergenciaTexto: { color: cores.vermelho, fontSize: 12, fontWeight: '800' }, vazio: { padding: 20, alignItems: 'flex-start', backgroundColor: cores.branco, borderWidth: 1, borderColor: cores.borda, borderRadius: 18 }, vazioTitulo: { color: cores.texto, fontSize: 18, fontWeight: '800' }, vazioTexto: { color: cores.mutado, fontSize: 16, lineHeight: 23, marginTop: 6 }, textoSecundario: { color: cores.mutado, fontSize: 15, lineHeight: 22 }, linhaCompromisso: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 9 }, pontoVerde: { color: cores.verde, fontSize: 18 }, nomeCompromisso: { color: cores.texto, fontSize: 16, fontWeight: '800' }, bolinha: { width: 12, height: 12, borderRadius: 6, marginTop: 5, marginRight: 12 }, bolinhaVerde: { backgroundColor: cores.verde }, bolinhaAmarela: { backgroundColor: cores.ambar }, linhaHistorico: { flexDirection: 'row', alignItems: 'flex-start', padding: 15, marginBottom: 8, backgroundColor: cores.branco, borderRadius: 15, borderWidth: 1, borderColor: cores.borda }, menu: { marginBottom: 14 }, rodape: { color: cores.mutado, textAlign: 'center', marginTop: 28, fontSize: 13 }, navegacao: { position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: cores.texto, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8, paddingBottom: 8 }, itemNav: { alignItems: 'center', minWidth: 70, minHeight: 48, justifyContent: 'center' }, iconeNav: { color: '#A9B7B0', fontSize: 18, lineHeight: 20 }, textoNav: { color: '#A9B7B0', fontSize: 12, fontWeight: '700', marginTop: 2 }, navAtiva: { color: cores.branco }, fundoModal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(36,49,46,0.3)' }, caixaModal: { maxHeight: '88%', backgroundColor: cores.fundo, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22 }, tituloModal: { color: cores.texto, fontSize: 23, fontWeight: '800' }, fechar: { color: cores.verde, fontSize: 15, fontWeight: '800', padding: 8 }, campo: { marginTop: 18 }, label: { color: cores.texto, fontSize: 15, fontWeight: '800', marginBottom: 7 }, input: { minHeight: 52, borderWidth: 1, borderColor: cores.borda, borderRadius: 13, backgroundColor: cores.branco, paddingHorizontal: 14, color: cores.texto, fontSize: 17 }, escolhas: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, ajuda: { color: cores.mutado, fontSize: 15, lineHeight: 22, marginVertical: 14 }, emergenciaBox: { backgroundColor: cores.vermelhoClaro, padding: 18, borderRadius: 16, marginTop: 18 }, emergenciaTitulo: { color: cores.vermelho, fontSize: 21, fontWeight: '800' }, emergenciaCorpo: { color: cores.texto, fontSize: 17, lineHeight: 25, marginTop: 9 },
});
