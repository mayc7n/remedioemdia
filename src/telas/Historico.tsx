import { Text, View } from 'react-native';
import { RegistroMedicamento } from '../dominio/agenda';
import { estilos } from '../componentes/tema';
import { formatarDataHoraBrasileira } from '../componentes/DataHoraPicker';

const estadoEmTexto = (estado: RegistroMedicamento['estado']) => estado === 'taken' ? 'Tomado' : estado === 'snoozed' ? 'Adiado' : estado === 'missed' ? 'Esquecido' : 'Pendente';

export function Historico({ registros }: { registros: RegistroMedicamento[] }) {
  const ordenados = [...registros].sort((a, b) => b.previstoPara.localeCompare(a.previstoPara));
  return <View><Text style={estilos.secundario}>Acompanhe sem culpa</Text><Text style={estilos.titulo}>Histórico</Text><Text style={estilos.lead}>Um registro simples do que aconteceu com seus lembretes.</Text>{ordenados.length === 0 ? <View style={estilos.vazio}><Text style={estilos.nome}>Ainda não há registros</Text><Text style={estilos.secundario}>As marcações de hoje aparecerão aqui.</Text></View> : ordenados.map((registro) => <View style={estilos.historicoItem} key={registro.id}><View style={estilos.historicoMarcador} /><View style={estilos.flexivel}><Text style={estilos.nome}>{registro.medicamentoNome}</Text><Text style={estilos.secundario}>{formatarDataHoraBrasileira(registro.previstoPara.slice(0, 16))} · {registro.horario}</Text></View><Text style={estilos.statusTexto}>{estadoEmTexto(registro.estado)}</Text></View>)}</View>;
}
