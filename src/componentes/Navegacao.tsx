import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores, estilos } from './tema';

export type AbaNavegacao = 'inicio' | 'medicamentos' | 'historico' | 'mais';
const abas: Array<[AbaNavegacao, string]> = [['inicio', 'Hoje'], ['medicamentos', 'Remédios'], ['historico', 'Histórico'], ['mais', 'Mais']];
const icones: Record<AbaNavegacao, { ativo: keyof typeof Ionicons.glyphMap; inativo: keyof typeof Ionicons.glyphMap }> = {
  inicio: { ativo: 'home', inativo: 'home-outline' },
  medicamentos: { ativo: 'list', inativo: 'list-outline' },
  historico: { ativo: 'time', inativo: 'time-outline' },
  mais: { ativo: 'menu', inativo: 'menu-outline' },
};

export function Navegacao({ aba, onChange }: { aba: AbaNavegacao; onChange: (aba: AbaNavegacao) => void }) {
  const insets = useSafeAreaInsets();

  return <View testID="navegacao-inferior" style={[estilos.navegacao, { paddingBottom: insets.bottom }]}>
    {abas.map(([chave, texto]) => {
      const selecionada = aba === chave;
      return <Pressable
        key={chave}
        accessibilityRole="tab"
        accessibilityLabel={texto}
        accessibilityState={{ selected: selecionada }}
        onPress={() => onChange(chave)}
        style={({ pressed }) => [estilos.itemNavegacao, pressed && estilos.pressionado]}
      >
        <Ionicons name={selecionada ? icones[chave].ativo : icones[chave].inativo} size={22} color={selecionada ? cores.verde : cores.mutado} accessible={false} />
        <Text allowFontScaling style={[estilos.rotuloNavegacao, selecionada && estilos.rotuloNavegacaoSelecionado]}>{texto}</Text>
        <View style={[estilos.indicadorNavegacao, selecionada && estilos.indicadorNavegacaoSelecionado]} />
      </Pressable>;
    })}
  </View>;
}
