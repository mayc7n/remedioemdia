import { Text, TextInput, type KeyboardTypeOptions } from 'react-native';
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
      style={[estilos.input, estilos.campo, multiline && { minHeight: 96, paddingTop: 14 }]}
    />
  );
}

export function Rotulo({ children }: { children: React.ReactNode }) {
  return <Text style={estilos.label}>{children}</Text>;
}
