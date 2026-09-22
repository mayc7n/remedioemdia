import { render } from '@testing-library/react-native';
import { EstadoRegistroVisual } from './EstadoRegistro';

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
});
