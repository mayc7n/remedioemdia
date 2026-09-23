import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import type { ModoCuidador } from '../dominio/agenda';
import { cores, estilos } from './tema';

export type ModoCuidadorEscolhido = Exclude<ModoCuidador, 'naoInformado'>;

type Props = {
  valor: ModoCuidadorEscolhido | null;
  onChange: (modo: ModoCuidadorEscolhido) => void;
  desativado?: boolean;
};

const opcoes: Array<{ valor: ModoCuidadorEscolhido; titulo: string; descricao: string }> = [
  { valor: 'semCuidador', titulo: 'Não tenho cuidador', descricao: 'A área de cuidador ficará oculta. Você pode mudar isso depois.' },
  { valor: 'comCuidador', titulo: 'Sim, tenho cuidador', descricao: 'Você poderá autorizar uma pessoa e escolher quais avisos ela recebe.' },
];

export function EscolhaModoCuidador({ valor, onChange, desativado = false }: Props) {
  return <View accessibilityRole="radiogroup">
    {opcoes.map((opcao) => {
      const selecionada = valor === opcao.valor;
      return <Pressable
        key={opcao.valor}
        accessibilityRole="radio"
        accessibilityLabel={`${opcao.titulo}. ${opcao.descricao}`}
        accessibilityState={{ checked: selecionada, disabled: desativado }}
        disabled={desativado}
        onPress={() => onChange(opcao.valor)}
        style={({ pressed }) => [estilos.escolhaModoLinha, selecionada && estilos.escolhaModoSelecionada, pressed && estilos.pressionado]}
      >
        <View style={estilos.flexivel}>
          <Text allowFontScaling style={estilos.nome}>{opcao.titulo}</Text>
          <Text allowFontScaling style={estilos.secundario}>{opcao.descricao}</Text>
        </View>
        <Ionicons name={selecionada ? 'radio-button-on' : 'radio-button-off'} size={24} color={selecionada ? cores.verde : cores.mutado} accessible={false} />
      </Pressable>;
    })}
  </View>;
}
