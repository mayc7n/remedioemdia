import { Button, Text, VStack } from '@expo/ui/swift-ui';
import { createWidget } from 'expo-widgets';
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

function RemedioWidget(snapshot: WidgetSnapshot) {
  'widget';
  const proximoEstado = (estado: 'taken' | 'snoozed'): WidgetSnapshot => ({ ...snapshot, estado, atualizadoEm: new Date().toISOString() });
  return (
    <VStack>
      <Text>Remédio em Dia</Text>
      <Text>{snapshot.nome}</Text>
      <Text>{snapshot.horario} · {textoEstado(snapshot.estado)}</Text>
      {snapshot.ocorrenciaId && <>
        <Button label="Tomei" target="taken" onPress={() => proximoEstado('taken')} />
        <Button label="Adiar 15 min" target="snoozed" onPress={() => proximoEstado('snoozed')} />
      </>}
    </VStack>
  );
}

export default createWidget('RemedioWidget', RemedioWidget);
