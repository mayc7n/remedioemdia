import { Pressable, Text, View } from 'react-native';
import { Medicamento } from '../dominio/agenda';
import { estilos } from './tema';

export function CartaoMedicamento({ medicamento, abrir }: { medicamento: Medicamento; abrir: () => void }) {
  const frequencia = medicamento.frequencia.tipo === 'diaria'
    ? 'todos os dias'
    : medicamento.frequencia.tipo === 'diasDaSemana'
      ? 'dias selecionados'
      : `a cada ${medicamento.frequencia.aCadaDias} dias`;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Abrir medicamento ${medicamento.nome}`} onPress={abrir} style={({ pressed }) => [estilos.cartao, pressed && estilos.pressionado]}>
      <View style={estilos.linhaEntre}>
        <View style={estilos.flexivel}>
          <Text style={estilos.nome}>{medicamento.nome}</Text>
          <Text style={estilos.secundario}>{medicamento.horarios.join(' · ')} · {frequencia}</Text>
        </View>
        <Text style={estilos.secundario}>{medicamento.situacao === 'ativo' ? 'Ativo' : medicamento.situacao === 'pausado' ? 'Pausado' : 'Excluído'}</Text>
      </View>
      {medicamento.observacao && <Text style={estilos.secundario}>{medicamento.observacao}</Text>}
    </Pressable>
  );
}
