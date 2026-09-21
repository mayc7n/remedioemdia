import { Alert } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { CuidadorForm } from './CuidadorForm';

describe('formulário do cuidador', () => {
  it('confirma antes de revogar a autorização', async () => {
    const revogar = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_titulo, _mensagem, botoes) => {
      expect(revogar).not.toHaveBeenCalled();
      botoes?.find((botao) => botao.text === 'Revogar')?.onPress?.();
    });
    const tela = await render(<CuidadorForm nome="Ana" setNome={jest.fn()} contato="ana@example.com" setContato={jest.fn()} avisos={{ esquecido: true, adiado: true, consulta: true }} setAvisos={jest.fn()} salvar={jest.fn()} revogar={revogar} />);

    await fireEvent.press(tela.getByRole('button', { name: 'Revogar autorização' }));

    expect(alertSpy).toHaveBeenCalledWith('Revogar autorização?', 'O cuidador deixará de receber avisos.', expect.any(Array));
    expect(revogar).toHaveBeenCalledTimes(1);
    alertSpy.mockRestore();
  });
});
