import { Text, View } from 'react-native';
import { Botao } from './Botao';
import { estilos } from './tema';
import type { StatusNotificacoes } from '../notificacoes';

type Props = {
  status: StatusNotificacoes;
  mensagem: string | null;
  abrirConfiguracoes: () => void;
};

export function AvisoNotificacoes({ status, mensagem, abrirConfiguracoes }: Props) {
  if (!mensagem) return null;

  return <View accessibilityRole="alert" style={estilos.avisoNotificacoes}>
    <Text allowFontScaling style={estilos.secundario}>{mensagem}</Text>
    {status === 'desativadas' && <Botao
      texto="Abrir configurações"
      variante="texto"
      onPress={abrirConfiguracoes}
      accessibilityLabel="Abrir configurações de notificações"
      accessibilityHint="Abre as configurações do sistema para permitir os lembretes"
    />}
  </View>;
}
