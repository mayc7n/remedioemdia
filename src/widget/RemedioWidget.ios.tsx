import { Text, VStack } from '@expo/ui/swift-ui';
import { createWidget } from 'expo-widgets';

type Props = { nome: string; horario: string };

function RemedioWidget({ nome, horario }: Props) {
  'widget';
  return (
    <VStack>
      <Text>Remédio em Dia</Text>
      <Text>{nome}</Text>
      <Text>{horario}</Text>
    </VStack>
  );
}

export default createWidget('RemedioWidget', RemedioWidget);
