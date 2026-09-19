import { render } from '@testing-library/react-native';
import { Mais } from './Mais';

describe('tela Mais', () => {
  it('informa quando não há aviso externo enviado', async () => {
    const tela = await render(<Mais consultas={[]} abrirConsulta={jest.fn()} abrirCuidador={jest.fn()} />);
    expect(tela.getByText(/Nenhum aviso externo foi enviado/)).toBeTruthy();
  });
});
