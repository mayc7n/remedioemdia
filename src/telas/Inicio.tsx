import { Alert, Text, View } from 'react-native';
import { Consulta, EstadoApp, RegistroMedicamento, ocorrenciasDoDia } from '../dominio/agenda';
import { Botao } from '../componentes/Botao';
import { estilos } from '../componentes/tema';
import { formatarDataHoraBrasileira } from '../componentes/DataHoraPicker';

const estadoEmTexto = (estado: RegistroMedicamento['estado']) => estado === 'taken' ? 'Tomado' : estado === 'snoozed' ? 'Adiado' : estado === 'missed' ? 'Esquecido' : 'Pendente';
const estadoIcone = (estado: RegistroMedicamento['estado']) => estado === 'taken' ? '✓' : estado === 'snoozed' ? '↻' : estado === 'missed' ? '!' : '○';

type Props = {
  ocorrencias: ReturnType<typeof ocorrenciasDoDia>;
  registros: EstadoApp['registros'];
  consultas: Consulta[];
  marcar: (item: ReturnType<typeof ocorrenciasDoDia>[number], acao: 'taken' | 'snoozed' | 'missed') => void;
  abrirMedicamento: () => void;
  desfazerDisponivel: boolean;
  desfazer: () => void;
};

export function Inicio({ ocorrencias, registros, consultas, marcar, abrirMedicamento, desfazerDisponivel, desfazer }: Props) {
  const pendentes = ocorrencias.filter((item) => !registros.some((registro) => registro.id === item.id && registro.estado !== 'pendente'));
  const marcarAcao = (item: ReturnType<typeof ocorrenciasDoDia>[number], acao: 'taken' | 'snoozed' | 'missed') => {
    if (acao !== 'missed') {
      marcar(item, acao);
      return;
    }
    Alert.alert('Marcar como esquecido?', 'Isso ficará registrado no histórico.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Esqueci', style: 'destructive', onPress: () => marcar(item, 'missed') },
    ]);
  };

  return <View>
    {desfazerDisponivel && <View style={estilos.cartao}><Text style={estilos.secundario}>Ação registrada. Você pode desfazer por alguns segundos.</Text><Botao texto="Desfazer" variante="texto" onPress={desfazer} accessibilityLabel="Desfazer marcação" accessibilityHint="Reverte a última marcação do histórico" /></View>}
    <View style={estilos.listaCabecalho}><View><Text style={estilos.secundario}>Hoje</Text><Text style={estilos.titulo}>Medicamentos</Text></View><Text style={estilos.cabecalhoResumo}>{pendentes.length} pendente{pendentes.length === 1 ? '' : 's'}</Text></View>
    <Text style={estilos.secaoTitulo}>Horários de hoje</Text>
    {ocorrencias.length === 0 ? <View style={estilos.vazio}><Text style={estilos.nome}>Nenhum lembrete para hoje</Text><Text style={estilos.secundario}>Quando cadastrar um medicamento, o próximo horário aparece aqui.</Text><Botao texto="Adicionar medicamento" onPress={abrirMedicamento} /></View> : ocorrencias.map((item) => {
      const registro = registros.find((atual) => atual.id === item.id);
      const finalizado = registro?.estado && registro.estado !== 'pendente';
      const estado = finalizado ? registro.estado : 'pendente';
      return <View key={item.id} style={estilos.rotinaItem}>
        <View style={estilos.rotinaLinha}><Text style={estilos.horarioLista}>{item.horario}</Text><View style={estilos.rotinaConteudo}><Text style={estilos.nome}>{item.medicamentoNome}</Text><Text style={estilos.statusTexto}>{estadoIcone(estado)} {estadoEmTexto(estado)}</Text></View></View>
        <View testID={`acoes-${item.id}`} style={estilos.rotinaAcoes}><Botao texto="Tomei" variante="suave" onPress={() => marcarAcao(item, 'taken')} desativado={Boolean(finalizado)} /><Botao texto="Adiar" variante="suave" onPress={() => marcarAcao(item, 'snoozed')} desativado={Boolean(finalizado)} /><Botao texto="Esqueci" variante="texto" onPress={() => marcarAcao(item, 'missed')} desativado={Boolean(finalizado)} /></View>
      </View>;
    })}

    <Text style={estilos.secaoTitulo}>Próximos compromissos</Text>
    {consultas.length === 0 ? <Text style={estilos.secundario}>Nenhuma consulta ou exame cadastrado.</Text> : consultas.slice(0, 2).map((consulta) => <View key={consulta.id} style={estilos.compromisso}><Text style={estilos.nome}>{consulta.titulo}</Text><Text style={estilos.secundario}>{formatarDataHoraBrasileira(consulta.marcadoPara)} · {consulta.tipo === 'exame' ? 'Exame' : 'Consulta'}</Text></View>)}
  </View>;
}
