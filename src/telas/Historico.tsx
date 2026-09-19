import { Text, View } from 'react-native';
import { RegistroMedicamento } from '../dominio/agenda';
import { estilos } from '../componentes/tema';

export function Historico({ registros }: { registros: RegistroMedicamento[] }) {
  const ordenados = [...registros].sort((a, b) => b.previstoPara.localeCompare(a.previstoPara));
  return <View><Text style={estilos.secundario}>Acompanhe sem culpa</Text><Text style={estilos.titulo}>Histórico</Text><Text style={estilos.lead}>Um registro simples do que aconteceu com seus lembretes.</Text>{ordenados.length === 0 ? <View style={estilos.cartao}><Text style={estilos.nome}>Ainda não há registros</Text><Text style={estilos.secundario}>As marcações de hoje aparecerão aqui.</Text></View> : ordenados.map((registro) => <View style={estilos.cartao} key={registro.id}><Text style={estilos.nome}>{registro.medicamentoNome}</Text><Text style={estilos.secundario}>{new Date(registro.previstoPara).toLocaleString('pt-BR')} · {registro.estado}</Text></View>)}</View>;
}
