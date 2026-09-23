import { Alert, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Consulta, EstadoApp, RegistroMedicamento, ocorrenciasDoDia } from '../dominio/agenda';
import { Botao } from '../componentes/Botao';
import { EstadoRegistroVisual } from '../componentes/EstadoRegistro';
import { cores, estilos } from '../componentes/tema';
import { formatarDataHoraBrasileira } from '../componentes/DataHoraPicker';

type Props = {
  ocorrencias: ReturnType<typeof ocorrenciasDoDia>;
  registros: EstadoApp['registros'];
  consultas: Consulta[];
  marcar: (item: ReturnType<typeof ocorrenciasDoDia>[number], acao: 'taken' | 'snoozed' | 'missed') => void;
  abrirMedicamento: () => void;
  desfazerOcorrenciaId?: string;
  desfazer: () => void;
  dataAtual?: Date;
};

export function Inicio({ ocorrencias, registros, consultas, marcar, abrirMedicamento, desfazerOcorrenciaId, desfazer, dataAtual }: Props) {
  const pendentes = ocorrencias.filter((item) => !registros.some((registro) => registro.id === item.id && registro.estado !== 'pendente'));
  const proximo = pendentes[0];
  const dataFormatada = (dataAtual ?? new Date()).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
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
  const acoesDoRegistro = (item: ReturnType<typeof ocorrenciasDoDia>[number], finalizado = false) => <View testID={`acoes-${item.id}`} style={estilos.rotinaAcoes}>
    <Botao texto="Tomei" onPress={() => marcarAcao(item, 'taken')} accessibilityLabel="Registrar como tomado" desativado={finalizado} />
    <Botao texto="Adiar" variante="suave" onPress={() => marcarAcao(item, 'snoozed')} accessibilityLabel="Adiar lembrete" desativado={finalizado} />
    <Botao texto="Esqueci" variante="texto" onPress={() => marcarAcao(item, 'missed')} accessibilityLabel="Registrar como esquecido" desativado={finalizado} />
  </View>;
  const avisoDesfazer = <View style={estilos.avisoDesfazer}><Text allowFontScaling style={estilos.secundario}>Ação registrada. Você pode desfazer por alguns segundos.</Text><Botao texto="Desfazer" variante="texto" onPress={desfazer} accessibilityLabel="Desfazer marcação" accessibilityHint="Reverte a última marcação do histórico" /></View>;
  const desfazerNaLista = ocorrencias.some((item) => item.id === desfazerOcorrenciaId && registros.some((registro) => registro.id === item.id && registro.estado !== 'pendente'));

  return <View>
    <Text allowFontScaling style={estilos.titulo}>Hoje</Text>
    <Text allowFontScaling style={estilos.dataHoje}>{dataFormatada}</Text>
    {desfazerOcorrenciaId && !desfazerNaLista && avisoDesfazer}
    {ocorrencias.length === 0 ? <>
      <View style={estilos.vazio}>
        <Text allowFontScaling style={estilos.nome}>Nenhum lembrete para hoje</Text>
        <Text allowFontScaling style={estilos.secundario}>Quando você cadastrar um medicamento, os horários de hoje aparecem aqui.</Text>
        <Botao texto="Adicionar medicamento" onPress={abrirMedicamento} />
      </View>
    </> : <>
      {proximo && <View testID="proximo-lembrete" style={estilos.proximaDose}>
        <View style={estilos.proximaDoseCabecalho}>
          <Text allowFontScaling style={estilos.proximaDoseLegenda}>Próximo lembrete</Text>
          <EstadoRegistroVisual estado="pendente" compacto />
        </View>
        <View style={estilos.proximaDoseIdentificacao}>
          <Text allowFontScaling style={estilos.proximaDoseHorario}>{proximo.horario}</Text>
          <View style={estilos.flexivel}>
            <Text allowFontScaling style={estilos.proximaDoseNome}>{proximo.medicamentoNome}</Text>
            <Text allowFontScaling style={estilos.proximaDoseTexto}>{pendentes.length > 1 ? `Mais ${pendentes.length - 1} ${pendentes.length - 1 === 1 ? 'lembrete' : 'lembretes'} depois deste` : 'Último lembrete de hoje'}</Text>
          </View>
        </View>
      </View>}

      <Text allowFontScaling style={estilos.secaoTitulo}>Horários de hoje</Text>
      {ocorrencias.map((item) => {
        const registro = registros.find((atual) => atual.id === item.id);
        const finalizado = Boolean(registro?.estado && registro.estado !== 'pendente');
        const estado: RegistroMedicamento['estado'] = finalizado ? registro!.estado : 'pendente';
        return <View key={item.id} testID={`ocorrencia-${item.id}`} style={estilos.rotinaItem}>
          <View style={estilos.rotinaLinha}><Text allowFontScaling style={estilos.horarioLista}>{item.horario}</Text><View style={estilos.rotinaConteudo}><Text allowFontScaling style={estilos.nome}>{item.medicamentoNome}</Text><EstadoRegistroVisual estado={estado} compacto /></View></View>
          {acoesDoRegistro(item, finalizado)}
          {finalizado && desfazerOcorrenciaId === item.id && avisoDesfazer}
        </View>;
      })}
    </>}

    <Text allowFontScaling style={estilos.secaoTitulo}>Próximos compromissos</Text>
    {consultas.length === 0 ? <Text allowFontScaling style={estilos.secundario}>Nenhuma consulta ou exame cadastrado.</Text> : consultas.slice(0, 2).map((consulta) => <View key={consulta.id} style={estilos.compromisso}>
      <Ionicons name="calendar-outline" size={22} color={cores.destaque} accessible={false} />
      <View style={estilos.flexivel}><Text allowFontScaling style={estilos.nome}>{consulta.titulo}</Text><Text allowFontScaling style={estilos.secundario}>{formatarDataHoraBrasileira(consulta.marcadoPara)} · {consulta.tipo === 'exame' ? 'Exame' : 'Consulta'}</Text></View>
    </View>)}
  </View>;
}
