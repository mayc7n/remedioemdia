import { Consulta, EstadoApp } from '../dominio/agenda';
import { Botao } from '../componentes/Botao';
import { estilos } from '../componentes/tema';
import { resumoCompartilhamento } from '../cuidador';
import { Text, View } from 'react-native';

type Props = { consultas: Consulta[]; cuidador?: EstadoApp['cuidador']; abrirConsulta: () => void; abrirCuidador: () => void; concluirConsulta?: (id: string) => void; excluirConsulta?: (id: string) => void; };

export function Mais({ consultas, cuidador, abrirConsulta, abrirCuidador, concluirConsulta, excluirConsulta }: Props) {
  return <View><Text style={estilos.secundario}>Mais opções</Text><Text style={estilos.titulo}>Cuidados da rotina</Text><Botao texto="Cadastrar consulta ou exame" onPress={abrirConsulta} /><Botao texto="Adicionar cuidador autorizado" variante="suave" onPress={abrirCuidador} />
    <View style={estilos.cartao}><Text style={estilos.nome}>Cuidador</Text><Text style={estilos.secundario}>{resumoCompartilhamento(cuidador)}</Text></View>
    <View style={estilos.cartao}><Text style={estilos.nome}>Consultas e exames</Text>{consultas.length === 0 ? <Text style={estilos.secundario}>Nenhuma consulta ou exame cadastrado.</Text> : consultas.map((consulta) => <View key={consulta.id}><Text style={estilos.secundario}>{consulta.titulo} · {new Date(consulta.marcadoPara).toLocaleString('pt-BR')}</Text>{concluirConsulta && <Botao texto="Marcar como concluído" variante="suave" onPress={() => concluirConsulta(consulta.id)} accessibilityLabel={`Concluir ${consulta.titulo}`} />}{excluirConsulta && <Botao texto="Remover compromisso" variante="texto" onPress={() => excluirConsulta(consulta.id)} accessibilityLabel={`Remover ${consulta.titulo}`} />}</View>)}</View>
    <View style={estilos.cartao}><Text style={estilos.nome}>Privacidade</Text><Text style={estilos.secundario}>Seus dados ficam neste aparelho.</Text></View>
  </View>;
}
