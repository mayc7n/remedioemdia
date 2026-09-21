import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores } from './tema';

export type AbaNavegacao = 'inicio' | 'medicamentos' | 'historico' | 'mais';
const abas: Array<[AbaNavegacao, string]> = [['inicio', 'Hoje'], ['medicamentos', 'Remédios'], ['historico', 'Histórico'], ['mais', 'Mais']];
const icones: Record<AbaNavegacao, { ativo: keyof typeof Ionicons.glyphMap; inativo: keyof typeof Ionicons.glyphMap }> = {
  inicio: { ativo: 'home', inativo: 'home-outline' },
  medicamentos: { ativo: 'list', inativo: 'list-outline' },
  historico: { ativo: 'time', inativo: 'time-outline' },
  mais: { ativo: 'menu', inativo: 'menu-outline' },
};

export function Navegacao({ aba, onChange }: { aba: AbaNavegacao; onChange: (aba: AbaNavegacao) => void }) {
  return <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: cores.branco, borderTopWidth: 1, borderTopColor: cores.borda, flexDirection: 'row' }}>
    {abas.map(([chave, texto]) => {
      const selecionada = aba === chave;
      return <Pressable
        key={chave}
        accessibilityRole="tab"
        accessibilityLabel={texto}
        accessibilityState={{ selected: selecionada }}
        onPress={() => onChange(chave)}
        style={{ flex: 1, alignItems: 'center', minHeight: 54, justifyContent: 'center', paddingTop: 8, paddingBottom: 9 }}
      >
        <Ionicons name={selecionada ? icones[chave].ativo : icones[chave].inativo} size={22} color={selecionada ? cores.verde : cores.mutado} accessible={false} />
        <Text allowFontScaling style={{ color: selecionada ? cores.verde : cores.mutado, fontSize: 13, fontWeight: selecionada ? '600' : '400', marginTop: 3 }}>{texto}</Text>
        <View style={{ width: 22, height: 2, borderRadius: 1, marginTop: 3, backgroundColor: selecionada ? cores.verde : 'transparent' }} />
      </Pressable>;
    })}
  </View>;
}
