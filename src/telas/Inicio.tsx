import { Text, View } from 'react-native';
import { Consulta, EstadoApp, ocorrenciasDoDia } from '../dominio/agenda';
import { Botao } from '../componentes/Botao';
import { estilos } from '../componentes/tema';
import { formatarDataHoraBrasileira } from '../componentes/DataHoraPicker';

const estadoEmTexto = (estado: string) => estado === 'taken' ? 'Tomado' : estado === 'snoozed' ? 'Adiado' : 'Esquecido';

export function Inicio({ ocorrencias, registros, consultas, marcar, abrirMedicamento }: { ocorrencias: ReturnType<typeof ocorrenciasDoDia>; registros: EstadoApp['registros']; consultas: Consulta[]; marcar: (item: ReturnType<typeof ocorrenciasDoDia>[number], acao: 'taken' | 'snoozed' | 'missed') => void; abrirMedicamento: () => void }) {
  const pendentes = ocorrencias.filter((item) => !registros.some((registro) => registro.id === item.id && registro.estado !== 'pendente'));
  const proximo = pendentes[0];

  return <View>
    <View style={estilos.hero}>
      <Text style={estilos.heroKicker}>REMÉDIO EM DIA</Text>
      <Text style={estilos.heroTitulo}>Sua rotina, no seu ritmo.</Text>
      <Text style={estilos.heroTexto}>{proximo ? `O próximo lembrete é às ${proximo.horario}.` : ocorrencias.length ? 'Tudo certo por aqui hoje.' : 'Cadastre um medicamento para começar.'}</Text>
      <View style={estilos.heroRodape}>
        <View><Text style={estilos.heroNumero}>{pendentes.length}</Text><Text style={estilos.heroLegenda}>pendentes hoje</Text></View>
        <View style={estilos.heroRegua} />
        <View><Text style={estilos.heroNumero}>{ocorrencias.length - pendentes.length}</Text><Text style={estilos.heroLegenda}>já registrados</Text></View>
      </View>
    </View>

    <Text style={estilos.secaoTitulo}>Próximos horários</Text>
    {ocorrencias.length === 0 ? <View style={estilos.vazio}><Text style={estilos.nome}>Nenhum lembrete para hoje</Text><Text style={estilos.secundario}>Quando cadastrar um medicamento, o próximo horário aparece aqui.</Text><Botao texto="Adicionar medicamento" onPress={abrirMedicamento} /></View> : ocorrencias.map((item) => {
      const registro = registros.find((atual) => atual.id === item.id);
      const finalizado = registro?.estado && registro.estado !== 'pendente';
      return <View key={item.id} style={estilos.rotinaItem}>
        <View style={estilos.horarioBadge}><Text style={estilos.horarioBadgeTexto}>{item.horario}</Text><Text style={estilos.horarioBadgeLegenda}>hoje</Text></View>
        <View style={estilos.rotinaConteudo}><Text style={estilos.nome}>{item.medicamentoNome}</Text><Text style={estilos.secundario}>{finalizado ? estadoEmTexto(registro.estado) : 'Lembrete pendente'}</Text></View>
        <View style={estilos.rotinaAcoes}><Botao texto="Tomei" variante="suave" onPress={() => marcar(item, 'taken')} desativado={Boolean(finalizado)} /><Botao texto="Adiar" variante="suave" onPress={() => marcar(item, 'snoozed')} desativado={Boolean(finalizado)} /><Botao texto="Esqueci" variante="texto" onPress={() => marcar(item, 'missed')} desativado={Boolean(finalizado)} /></View>
      </View>;
    })}

    <Text style={estilos.secaoTitulo}>Próximos compromissos</Text>
    {consultas.length === 0 ? <Text style={estilos.secundario}>Nenhuma consulta ou exame cadastrado.</Text> : consultas.slice(0, 2).map((consulta) => <View key={consulta.id} style={estilos.compromisso}><Text style={estilos.nome}>{consulta.titulo}</Text><Text style={estilos.secundario}>{formatarDataHoraBrasileira(consulta.marcadoPara)} · {consulta.tipo === 'exame' ? 'Exame' : 'Consulta'}</Text></View>)}
  </View>;
}
