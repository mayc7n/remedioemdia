import { Consulta, EstadoApp } from '../dominio/agenda';
import { Botao } from '../componentes/Botao';
import { estilos } from '../componentes/tema';
import { formatarDataHoraBrasileira } from '../componentes/DataHoraPicker';
import { resumoCompartilhamento } from '../cuidador';
import { Alert, Text, View } from 'react-native';

type Props = { consultas: Consulta[]; cuidador?: EstadoApp['cuidador']; abrirConsulta: () => void; abrirCuidador: () => void; concluirConsulta?: (id: string) => void; excluirConsulta?: (id: string) => void; mostrarDetalhesNotificacao: boolean; alternarDetalhesNotificacao: () => void; };

export function Mais({ consultas, cuidador, abrirConsulta, abrirCuidador, concluirConsulta, excluirConsulta, mostrarDetalhesNotificacao, alternarDetalhesNotificacao }: Props) {
  const confirmarExclusao = (id: string) => {
    if (!excluirConsulta) return;
    Alert.alert('Remover compromisso?', 'Essa consulta ou exame será removido.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => excluirConsulta(id) },
    ]);
  };

  return <View><Text style={estilos.secundario}>Mais opções</Text><Text style={estilos.titulo}>Cuidados da rotina</Text><Botao texto="Cadastrar consulta ou exame" onPress={abrirConsulta} /><Botao texto="Adicionar cuidador autorizado" variante="suave" onPress={abrirCuidador} />
    <View style={estilos.cartao}><Text style={estilos.nome}>Cuidador</Text><Text style={estilos.secundario}>{resumoCompartilhamento(cuidador)}</Text></View>
    <View style={estilos.cartao}><Text style={estilos.nome}>Consultas e exames</Text>{consultas.length === 0 ? <Text style={estilos.secundario}>Nenhuma consulta ou exame cadastrado.</Text> : consultas.map((consulta) => <View key={consulta.id}><Text style={estilos.secundario}>{consulta.titulo} · {formatarDataHoraBrasileira(consulta.marcadoPara)}</Text>{concluirConsulta && <Botao texto="Marcar como concluído" variante="suave" onPress={() => concluirConsulta(consulta.id)} accessibilityLabel={`Concluir ${consulta.titulo}`} />}{excluirConsulta && <Botao texto="Remover compromisso" variante="texto" onPress={() => confirmarExclusao(consulta.id)} accessibilityLabel={`Remover ${consulta.titulo}`} />}</View>)}</View>
    <View style={estilos.cartao}><Text style={estilos.nome}>Privacidade</Text><Text style={estilos.secundario}>Seus dados ficam neste aparelho.</Text><Text style={[estilos.secundario, { marginTop: 10 }]}>Por padrão, a notificação não mostra o nome do medicamento nem o título da consulta.</Text><Botao texto="Mostrar detalhes nas notificações" variante={mostrarDetalhesNotificacao ? 'primario' : 'suave'} onPress={alternarDetalhesNotificacao} accessibilityLabel="Mostrar detalhes nas notificações" accessibilityHint="Permite exibir o conteúdo completo dos lembretes na tela bloqueada" accessibilityState={{ selected: mostrarDetalhesNotificacao }} /></View>
    <View style={estilos.cartao}><Text style={estilos.nome}>Sobre o app</Text><Text style={estilos.secundario}>O app não prescreve medicamentos, não altera doses e não oferece diagnóstico.</Text><Text style={[estilos.secundario, { marginTop: 10 }]}>Siga sempre a orientação do seu médico.</Text></View>
  </View>;
}
