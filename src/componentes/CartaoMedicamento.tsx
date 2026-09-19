import { Pressable, Text, View } from 'react-native';
import { Medicamento } from '../dominio/agenda';
import { estilos } from './tema';

export function CartaoMedicamento({ medicamento, abrir }: { medicamento: Medicamento; abrir: () => void }) {
  const frequencia = medicamento.frequencia.tipo === 'diaria'
    ? 'todos os dias'
    : medicamento.frequencia.tipo === 'diasDaSemana'
      ? 'dias selecionados'
      : `a cada ${medicamento.frequencia.aCadaDias} dias`;
  const situacao = medicamento.situacao === 'ativo' ? 'Ativo' : medicamento.situacao === 'pausado' ? 'Pausado' : 'Excluído';

  return <Pressable accessibilityRole="button" accessibilityLabel={`Abrir medicamento ${medicamento.nome}`} accessibilityHint="Abre os detalhes e os horários" onPress={abrir} style={({ pressed }) => [estilos.medicamentoItem, pressed && estilos.pressionado]}>
    <View style={[estilos.statusMarcador, medicamento.situacao !== 'ativo' && estilos.statusMarcadorPausado]} />
    <View style={estilos.flexivel}>
      <View style={estilos.linhaEntre}><Text style={estilos.nome}>{medicamento.nome}</Text><Text style={estilos.seta}>›</Text></View>
      <Text style={estilos.horariosLista}>{medicamento.horarios.join('  ·  ')}</Text>
      <Text style={estilos.secundario}>{frequencia} · {situacao}</Text>
      {medicamento.observacao && <Text style={estilos.observacaoLista}>{medicamento.observacao}</Text>}
    </View>
  </Pressable>;
}
