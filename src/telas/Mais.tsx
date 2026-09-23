import { Alert, Pressable, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Consulta, EstadoApp } from '../dominio/agenda';
import { Botao } from '../componentes/Botao';
import { cores, estilos } from '../componentes/tema';
import { formatarDataHoraBrasileira } from '../componentes/DataHoraPicker';
import { resumoCompartilhamento } from '../cuidador';

type ModoEscolhido = Exclude<EstadoApp['modoCuidador'], 'naoInformado'>;

type Props = {
  consultas: Consulta[];
  cuidador?: EstadoApp['cuidador'];
  modoCuidador: ModoEscolhido;
  alterarModoCuidador: (modo: ModoEscolhido, confirmacaoRevogacao: boolean) => void;
  abrirConsulta: () => void;
  abrirCuidador: () => void;
  concluirConsulta?: (id: string) => void;
  excluirConsulta?: (id: string) => void;
  mostrarDetalhesNotificacao: boolean;
  alternarDetalhesNotificacao: () => void;
};

export function Mais({ consultas, cuidador, modoCuidador, alterarModoCuidador, abrirConsulta, abrirCuidador, concluirConsulta, excluirConsulta, mostrarDetalhesNotificacao, alternarDetalhesNotificacao }: Props) {
  const confirmarExclusao = (id: string) => {
    if (!excluirConsulta) return;
    Alert.alert('Remover compromisso?', 'Essa consulta ou exame será removido.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => excluirConsulta(id) },
    ]);
  };

  const alternarModo = () => {
    if (modoCuidador === 'semCuidador') {
      alterarModoCuidador('comCuidador', false);
      return;
    }
    if (!cuidador?.consentimentoAtivo) {
      alterarModoCuidador('semCuidador', false);
      return;
    }
    Alert.alert('Mudar para uso individual?', 'A autorização do cuidador será revogada e os avisos dele serão desativados.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Revogar e continuar', style: 'destructive', onPress: () => alterarModoCuidador('semCuidador', true) },
    ]);
  };

  return <View>
    <Text allowFontScaling style={estilos.titulo}>Mais</Text>

    <Text allowFontScaling style={estilos.secaoTitulo}>Consultas e exames</Text>
    <Botao texto="Adicionar consulta ou exame" onPress={abrirConsulta} />
    {consultas.length === 0 ? <Text allowFontScaling style={estilos.secundario}>Nenhuma consulta ou exame cadastrado.</Text> : consultas.map((consulta) => <View key={consulta.id} style={estilos.compromisso}>
      <Ionicons name="calendar-outline" size={22} color={cores.destaque} accessible={false} />
      <View style={estilos.flexivel}>
        <Text allowFontScaling style={estilos.nome}>{consulta.titulo}</Text>
        <Text allowFontScaling style={estilos.secundario}>{consulta.tipo === 'exame' ? 'Exame' : 'Consulta'} · {formatarDataHoraBrasileira(consulta.marcadoPara)}</Text>
        {concluirConsulta && <Botao texto="Marcar como concluído" variante="suave" onPress={() => concluirConsulta(consulta.id)} accessibilityLabel={`Concluir ${consulta.titulo}`} />}
        {excluirConsulta && <Botao texto="Remover compromisso" variante="texto" onPress={() => confirmarExclusao(consulta.id)} accessibilityLabel={`Remover ${consulta.titulo}`} />}
      </View>
    </View>)}

    <Text allowFontScaling style={estilos.secaoTitulo}>Modo de cuidado</Text>
    <Pressable accessibilityRole="switch" accessibilityLabel="Tenho cuidador" accessibilityState={{ checked: modoCuidador === 'comCuidador' }} onPress={alternarModo} style={({ pressed }) => [estilos.linhaConfiguracao, pressed && estilos.pressionado]}>
      <View style={estilos.textoConfiguracao}>
        <Text allowFontScaling style={estilos.nome}>Tenho cuidador</Text>
        <Text allowFontScaling style={estilos.secundario}>{modoCuidador === 'comCuidador' ? 'Com cuidador' : 'Uso individual'}</Text>
      </View>
      <Switch pointerEvents="none" accessible={false} value={modoCuidador === 'comCuidador'} />
    </Pressable>
    <Text allowFontScaling style={estilos.secundario}>Essa escolha organiza as opções do app. Você pode mudá-la depois.</Text>

    {modoCuidador === 'comCuidador' && <View>
      <Text allowFontScaling style={estilos.secaoTitulo}>Cuidador</Text>
      <Text allowFontScaling style={estilos.secundario}>{resumoCompartilhamento(cuidador)}</Text>
      <Botao texto="Configurar cuidador" variante="suave" onPress={abrirCuidador} />
    </View>}

    <Text allowFontScaling style={estilos.secaoTitulo}>Notificações</Text>
    <Pressable accessibilityRole="switch" accessibilityLabel="Mostrar detalhes nas notificações" accessibilityHint="Controla os detalhes exibidos na tela bloqueada" accessibilityState={{ checked: mostrarDetalhesNotificacao }} onPress={alternarDetalhesNotificacao} style={({ pressed }) => [estilos.linhaConfiguracao, pressed && estilos.pressionado]}>
      <View style={estilos.textoConfiguracao}>
        <Text allowFontScaling style={estilos.nome}>Mostrar detalhes nas notificações</Text>
        <Text allowFontScaling style={estilos.secundario}>Por padrão, a notificação não mostra o nome do medicamento nem o título da consulta.</Text>
      </View>
      <Switch pointerEvents="none" accessible={false} value={mostrarDetalhesNotificacao} />
    </Pressable>

    <Text allowFontScaling style={estilos.secaoTitulo}>Privacidade e dados</Text>
    <Text allowFontScaling style={estilos.secundario}>Seus dados ficam neste aparelho. O app funciona sem Internet.</Text>

    <Text allowFontScaling style={estilos.secaoTitulo}>Aviso clínico</Text>
    <View style={estilos.avisoClinico}>
      <Text allowFontScaling style={estilos.nome}>Um lembrete, não uma prescrição.</Text>
      <Text allowFontScaling style={estilos.secundario}>Siga sempre a orientação do seu médico. O app não altera doses nem oferece diagnóstico.</Text>
    </View>
  </View>;
}
