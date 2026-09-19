import { Pressable, Text, View } from 'react-native';
import { cores } from './tema';

export type AbaNavegacao = 'inicio' | 'medicamentos' | 'historico' | 'mais';
const abas: Array<[AbaNavegacao, string]> = [['inicio', 'Hoje'], ['medicamentos', 'Remédios'], ['historico', 'Histórico'], ['mais', 'Mais']];

export function Navegacao({ aba, onChange }: { aba: AbaNavegacao; onChange: (aba: AbaNavegacao) => void }) {
  return <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: cores.texto, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 }}>
    {abas.map(([chave, texto]) => <Pressable key={chave} accessibilityRole="tab" accessibilityLabel={texto} accessibilityState={{ selected: aba === chave }} onPress={() => onChange(chave)} style={{ alignItems: 'center', minWidth: 70, minHeight: 48, justifyContent: 'center' }}><Text allowFontScaling style={{ color: aba === chave ? cores.branco : '#A9B7B0', fontSize: 12, fontWeight: '700' }}>{texto}</Text></Pressable>)}
  </View>;
}
