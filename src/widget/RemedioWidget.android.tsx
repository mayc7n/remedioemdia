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
      <FlexWidget style={{ flexDirection: 'row', flexGap: 8, marginTop: 8 }}>
        <TextWidget text="Tomei" style={{ color: '#2F6B58', fontSize: 14, fontWeight: 'bold', padding: 8, backgroundColor: '#E4EFE8', borderRadius: 9 }} clickAction="OPEN_URI" clickActionData={{ uri: 'remedioemdia://widget/taken' }} accessibilityLabel="Marcar como tomado" />
        <TextWidget text="Adiar 15 min" style={{ color: '#B26A27', fontSize: 14, fontWeight: 'bold', padding: 8, backgroundColor: '#F6EBDD', borderRadius: 9 }} clickAction="OPEN_URI" clickActionData={{ uri: 'remedioemdia://widget/snoozed' }} accessibilityLabel="Adiar por 15 minutos" />
      </FlexWidget>
    </FlexWidget>
  );
}
