import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { estilos } from './tema';

export function CaixaModal({ children, visivel, fechar, titulo }: { children: React.ReactNode; visivel: boolean; fechar: () => void; titulo: string }) {
  return <Modal visible={visivel} animationType="slide" transparent onRequestClose={fechar}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={estilos.modalBackdrop}>
      <View style={estilos.modalFolha}>
        <View style={estilos.linhaEntre}><Text allowFontScaling style={[estilos.titulo, estilos.modalTitulo]}>{titulo}</Text><Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={fechar} style={estilos.modalFechar}><Text allowFontScaling style={estilos.acaoSecundaria}>Fechar</Text></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
