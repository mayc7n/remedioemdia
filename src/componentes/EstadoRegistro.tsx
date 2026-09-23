import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { EstadoRegistro } from '../dominio/agenda';
import { cores, estilos } from './tema';

const apresentacaoPorEstado = {
  taken: { icone: 'checkmark-circle-outline', rotulo: 'Tomado', cor: cores.verde },
  snoozed: { icone: 'time-outline', rotulo: 'Adiado', cor: cores.ambar },
  missed: { icone: 'alert-circle-outline', rotulo: 'Esquecido', cor: cores.vermelho },
  pendente: { icone: 'ellipse-outline', rotulo: 'Pendente', cor: cores.mutado },
} satisfies Record<EstadoRegistro, { icone: keyof typeof Ionicons.glyphMap; rotulo: string; cor: string }>;

export const rotuloEstadoRegistro = (estado: EstadoRegistro) => apresentacaoPorEstado[estado].rotulo;

export function EstadoRegistroVisual({ estado, compacto = false }: { estado: EstadoRegistro; compacto?: boolean }) {
  const apresentacao = apresentacaoPorEstado[estado];

  return <View testID={`estado-${estado}`} style={[estilos.estadoRegistro, compacto && estilos.estadoRegistroCompacto]}>
    <Ionicons name={apresentacao.icone} size={compacto ? 16 : 18} color={apresentacao.cor} accessible={false} />
    <Text allowFontScaling style={[estilos.estadoRegistroTexto, compacto && estilos.estadoRegistroTextoCompacto, { color: apresentacao.cor }]}>{apresentacao.rotulo}</Text>
  </View>;
}
