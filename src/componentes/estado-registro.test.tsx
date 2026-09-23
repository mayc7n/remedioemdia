import { render } from '@testing-library/react-native';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { cores } from './tema';
import { EstadoRegistroVisual } from './EstadoRegistro';

function luminancia(cor: string) {
  const canais = cor.match(/[\da-f]{2}/gi)!.map((canal) => parseInt(canal, 16) / 255);
  const [vermelho, verde, azul] = canais.map((canal) => canal <= 0.04045 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4);
  return 0.2126 * vermelho + 0.7152 * verde + 0.0722 * azul;
}

function contraste(corA: string, corB: string) {
  const [maisClara, maisEscura] = [luminancia(corA), luminancia(corB)].sort((a, b) => b - a);
  return (maisClara + 0.05) / (maisEscura + 0.05);
}

describe('estado visual de um registro', () => {
  it.each([
    ['taken', 'Tomado'],
    ['snoozed', 'Adiado'],
    ['missed', 'Esquecido'],
    ['pendente', 'Pendente'],
  ] as const)('expõe texto e ícone para %s', async (estado, rotulo) => {
    const tela = await render(<EstadoRegistroVisual estado={estado} />);

    expect(tela.getByText(rotulo)).toBeTruthy();
    expect(tela.getByTestId(`estado-${estado}`)).toBeTruthy();
  });

  it.each([
    ['taken', 'checkmark-circle-outline'],
    ['snoozed', 'time-outline'],
    ['missed', 'alert-circle-outline'],
    ['pendente', 'ellipse-outline'],
  ] as const)('renderiza o ícone decorativo de %s na variante padrão e compacta', async (estado, nomeIcone) => {
    for (const compacto of [false, true]) {
      const tela = await render(<EstadoRegistroVisual estado={estado} compacto={compacto} />);
      const icone = tela.getByText(String.fromCodePoint(Number(Ionicons.glyphMap[nomeIcone])));
      expect(icone.props.accessible).toBe(false);
      expect(StyleSheet.flatten(icone.props.style).fontSize).toBe(compacto ? 16 : 18);
      expect(tela.getByText({ taken: 'Tomado', snoozed: 'Adiado', missed: 'Esquecido', pendente: 'Pendente' }[estado]).props.allowFontScaling).toBe(true);
    }
  });

  it.each(['snoozed', 'pendente'] as const)('mantém o texto %s legível no fundo e no destaque', async (estado) => {
    const tela = await render(<EstadoRegistroVisual estado={estado} />);
    const rotulo = estado === 'snoozed' ? 'Adiado' : 'Pendente';
    const cor = StyleSheet.flatten(tela.getByText(rotulo).props.style).color as string;

    expect(contraste(cor, cores.fundo)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(cor, cores.destaqueClaro)).toBeGreaterThanOrEqual(4.5);
  });
});
