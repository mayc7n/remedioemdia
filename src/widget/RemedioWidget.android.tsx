import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { WidgetSnapshot } from './estado';

const textoEstado = (estado: WidgetSnapshot['estado']) => estado === 'pendente'
  ? 'Pendente'
  : estado === 'taken'
    ? 'Tomado'
    : estado === 'snoozed'
      ? 'Adiado'
      : estado === 'missed'
        ? 'Esquecido'
        : 'Nenhum lembrete';

export function renderizarWidgetAndroid(snapshot: WidgetSnapshot) {
  const temAcao = Boolean(snapshot.ocorrenciaId);
  return (
    <FlexWidget
      style={{ backgroundColor: '#F7F5F0', borderRadius: 18, padding: 18, width: 'match_parent', height: 'match_parent' }}
      clickAction="OPEN_APP"
      accessibilityLabel="Abrir Remédio em Dia"
    >
      <TextWidget text="Remédio em Dia" style={{ color: '#2F6B58', fontSize: 15, fontWeight: 'bold' }} />
      <TextWidget text={snapshot.nome} style={{ color: '#24312E', fontSize: 18, fontWeight: 'bold', marginTop: 10 }} />
      <TextWidget text={`${snapshot.horario} · ${textoEstado(snapshot.estado)}`} style={{ color: '#71807A', fontSize: 15, marginTop: 6 }} />
      {temAcao && <FlexWidget style={{ flexDirection: 'row', flexGap: 8, marginTop: 8 }}>
        <TextWidget text="Tomei" style={{ color: '#2F6B58', fontSize: 14, fontWeight: 'bold', padding: 8, backgroundColor: '#E4EFE8', borderRadius: 9 }} clickAction="taken" clickActionData={{ acao: 'taken', ocorrenciaId: snapshot.ocorrenciaId }} accessibilityLabel="Marcar como tomado" />
        <TextWidget text="Adiar 15 min" style={{ color: '#B26A27', fontSize: 14, fontWeight: 'bold', padding: 8, backgroundColor: '#F6EBDD', borderRadius: 9 }} clickAction="snoozed" clickActionData={{ acao: 'snoozed', ocorrenciaId: snapshot.ocorrenciaId }} accessibilityLabel="Adiar por 15 minutos" />
      </FlexWidget>}
    </FlexWidget>
  );
}

export function RemedioWidgetAndroid({ snapshot }: { snapshot: WidgetSnapshot }) {
  return renderizarWidgetAndroid(snapshot);
}
