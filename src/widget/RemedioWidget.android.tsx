import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function RemedioWidgetAndroid() {
  return (
    <FlexWidget
      style={{ backgroundColor: '#F7F5F0', borderRadius: 18, padding: 18, width: 'match_parent', height: 'match_parent' }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'remedioemdia://widget' }}
      accessibilityLabel="Abrir Remédio em Dia"
    >
      <TextWidget text="Remédio em Dia" style={{ color: '#2F6B58', fontSize: 15, fontWeight: 'bold' }} />
      <TextWidget text="Próximo lembrete" style={{ color: '#24312E', fontSize: 18, fontWeight: 'bold', marginTop: 10 }} />
      <TextWidget text="Toque para marcar no app" style={{ color: '#71807A', fontSize: 14, marginTop: 6 }} />
    </FlexWidget>
  );
}
