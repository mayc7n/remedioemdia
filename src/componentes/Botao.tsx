import { Pressable, Text, type AccessibilityState } from 'react-native';
import { estilos } from './tema';

export type VarianteBotao = 'primario' | 'suave' | 'perigo' | 'texto';

type Props = {
  texto: string;
  onPress: () => void;
  variante?: VarianteBotao;
  desativado?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: Omit<AccessibilityState, 'disabled'>;
};

export function Botao({ texto, onPress, variante = 'primario', desativado = false, accessibilityLabel = texto, accessibilityHint, accessibilityState }: Props) {
  const estiloVariante = variante === 'primario'
    ? estilos.botaoPrimario
    : variante === 'suave'
      ? estilos.botaoSuave
      : variante === 'perigo'
        ? estilos.botaoPerigo
        : estilos.botaoTexto;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: desativado, ...accessibilityState }}
      disabled={desativado}
      onPress={onPress}
      style={({ pressed }) => [estilos.botao, estiloVariante, pressed && estilos.pressionado, desativado && estilos.desativado]}
    >
      <Text allowFontScaling style={[estilos.textoBotao, variante === 'suave' && estilos.textoBotaoSuave, variante === 'texto' && estilos.textoBotaoTexto]}>{texto}</Text>
    </Pressable>
  );
}
