import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Medicamento } from '../dominio/agenda';
import { cores, estilos } from './tema';

export function CartaoMedicamento({ medicamento, abrir }: { medicamento: Medicamento; abrir: () => void }) {
  const frequencia = medicamento.frequencia.tipo === 'diaria'
    ? 'todos os dias'
    : medicamento.frequencia.tipo === 'diasDaSemana'
      ? 'dias selecionados'
      : `a cada ${medicamento.frequencia.aCadaDias} dias`;
  const ativo = medicamento.situacao === 'ativo';
  const situacao = ativo ? 'Ativo' : medicamento.situacao === 'pausado' ? 'Pausado' : 'Excluído';
  const resumoAcessivel = `Abrir medicamento ${medicamento.nome}, ${situacao}. Horários ${medicamento.horarios.join(', ')}. Frequência ${frequencia}.${medicamento.observacao ? ` ${medicamento.observacao}` : ''}`;

  return <Pressable accessibilityRole="button" accessibilityLabel={resumoAcessivel} accessibilityHint="Abre os detalhes e os horários" onPress={abrir} style={({ pressed }) => [estilos.medicamentoItem, pressed && estilos.pressionado]}>
    <View style={estilos.flexivel}>
      <Text allowFontScaling style={estilos.nome}>{medicamento.nome}</Text>
      <Text allowFontScaling style={estilos.horariosLista}>{medicamento.horarios.join('  ·  ')} · {frequencia}</Text>
      <View testID={`medicamento-${medicamento.situacao}`} style={estilos.medicamentoSituacao}>
        <Ionicons name={ativo ? 'checkmark-circle-outline' : 'pause-circle-outline'} size={16} color={ativo ? cores.verde : cores.ambar} accessible={false} />
        <Text allowFontScaling style={[estilos.medicamentoSituacaoTexto, { color: ativo ? cores.verde : cores.ambar }]}>{situacao}</Text>
      </View>
      {medicamento.observacao && <Text allowFontScaling style={estilos.observacaoLista}>{medicamento.observacao}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={20} color={cores.mutado} accessible={false} />
  </Pressable>;
}
