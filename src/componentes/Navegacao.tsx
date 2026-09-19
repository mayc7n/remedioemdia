import { Pressable, Text, View } from 'react-native';
import { cores } from './tema';

export type AbaNavegacao = 'inicio' | 'medicamentos' | 'historico' | 'mais';
const abas: Array<[AbaNavegacao, string]> = [['inicio', 'Hoje'], ['medicamentos', 'Remédios'], ['historico', 'Histórico'], ['mais', 'Mais']];
const simbolos: Record<AbaNavegacao, string> = { inicio: '⌂', medicamentos: '＋', historico: '✓', mais: '•••' };

export function Navegacao({ aba, onChange }: { aba: AbaNavegacao; onChange: (aba: AbaNavegacao) => void }) {
  return <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: cores.branco, borderTopWidth: 1, borderTopColor: cores.borda, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 7, paddingBottom: 8 }}>
    {abas.map(([chave, texto]) => <Pressable key={chave} accessibilityRole="tab" accessibilityLabel={texto} accessibilityState={{ selected: aba === chave }} onPress={() => onChange(chave)} style={{ alignItems: 'center', minWidth: 70, minHeight: 52, justifyContent: 'center', gap: 3 }}><Text allowFontScaling style={{ color: aba === chave ? cores.verde : cores.mutado, fontSize: 18, lineHeight: 20, fontWeight: '800' }}>{simbolos[chave]}</Text><Text allowFontScaling style={{ color: aba === chave ? cores.verde : cores.mutado, fontSize: 12, fontWeight: aba === chave ? '800' : '600' }}>{texto}</Text></Pressable>)}
  </View>;
}
