import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { cores, estilos } from './tema';

export function CaixaModal({ children, visivel, fechar, titulo }: { children: React.ReactNode; visivel: boolean; fechar: () => void; titulo: string }) {
  return <Modal visible={visivel} animationType="slide" transparent onRequestClose={fechar}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(36,49,46,0.3)' }}>
      <View style={{ maxHeight: '88%', backgroundColor: cores.fundo, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22 }}>
        <View style={estilos.linhaEntre}><Text style={estilos.titulo}>{titulo}</Text><Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={fechar}><Text style={{ color: cores.verde, fontSize: 15, fontWeight: '800', padding: 8 }}>Fechar</Text></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </View>
    </View>
  </Modal>;
}
