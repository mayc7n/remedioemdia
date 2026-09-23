import { act, fireEvent, render } from '@testing-library/react-native';
import { BoasVindas } from './BoasVindas';

describe('boas-vindas e modo de cuidado', () => {
  it('explica limites e privacidade e só começa após a escolha', async () => {
    const onConcluir = jest.fn();
    const tela = await render(<BoasVindas onConcluir={onConcluir} />);

    expect(tela.getByText('Um lembrete, não uma prescrição.')).toBeTruthy();
    expect(tela.getByText('Siga sempre a orientação do seu médico. O app não altera doses nem oferece diagnóstico.')).toBeTruthy();
    expect(tela.getByText(/dados ficam neste aparelho/i)).toBeTruthy();
    expect(tela.getByText(/funciona sem Internet/i)).toBeTruthy();
    expect(tela.getByRole('button', { name: 'Começar' })).toBeDisabled();

    await fireEvent.press(tela.getByRole('radio', { name: /Não tenho cuidador.*A área de cuidador ficará oculta/ }));
    expect(tela.getByRole('radio', { name: /Não tenho cuidador.*A área de cuidador ficará oculta/ }).props.accessibilityState).toEqual(expect.objectContaining({ checked: true }));
    await fireEvent.press(tela.getByRole('button', { name: 'Começar' }));
    expect(onConcluir).toHaveBeenCalledWith('semCuidador');
  });

  it('pergunta somente o modo para uma pessoa migrada', async () => {
    const onConcluir = jest.fn();
    const tela = await render(<BoasVindas somenteModo onConcluir={onConcluir} />);

    expect(tela.getByText('Você conta com a ajuda de um cuidador?')).toBeTruthy();
    expect(tela.queryByText('Um lembrete, não uma prescrição.')).toBeNull();
    expect(tela.getByRole('button', { name: 'Continuar' })).toBeDisabled();
    await fireEvent.press(tela.getByRole('radio', { name: /Sim, tenho cuidador.*Você poderá autorizar uma pessoa/ }));
    await fireEvent.press(tela.getByRole('button', { name: 'Continuar' }));
    expect(onConcluir).toHaveBeenCalledWith('comCuidador');
  });

  it('impede troca de modo e reenvio enquanto a escolha é salva', async () => {
    let liberar: () => void = () => undefined;
    const onConcluir = jest.fn(() => new Promise<void>((resolve) => { liberar = resolve; }));
    const tela = await render(<BoasVindas onConcluir={onConcluir} />);

    await fireEvent.press(tela.getByRole('radio', { name: /Não tenho cuidador/ }));
    await fireEvent.press(tela.getByRole('button', { name: 'Começar' }));
    expect(tela.getByRole('button', { name: 'Começar' })).toBeDisabled();
    expect(tela.getByRole('radio', { name: /Sim, tenho cuidador/ })).toBeDisabled();
    await fireEvent.press(tela.getByRole('radio', { name: /Sim, tenho cuidador/ }));
    await fireEvent.press(tela.getByRole('button', { name: 'Começar' }));
    expect(onConcluir).toHaveBeenCalledTimes(1);
    expect(onConcluir).toHaveBeenCalledWith('semCuidador');
    await act(async () => { liberar(); });
    expect(tela.getByRole('button', { name: 'Começar' })).not.toBeDisabled();
  });
});
