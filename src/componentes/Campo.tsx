import { Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { estilos } from './tema';

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
};

export function Campo({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false }: Props) {
  return (
    <View style={estilos.campo}>
      <Text style={estilos.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#71807A"
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        allowFontScaling
        style={[estilos.input, multiline && { minHeight: 96, paddingTop: 14 }]}
      />
    </View>
  );
}

export function Rotulo({ children }: { children: React.ReactNode }) {
  return <Text style={estilos.label}>{children}</Text>;
}
