import { fireEvent, render } from '@testing-library/react-native';
import { AvisoNotificacoes } from './AvisoNotificacoes';

describe('aviso de notificações', () => {
  it('oferece abrir as configurações quando a permissão foi desativada', async () => {
    const abrirConfiguracoes = jest.fn();
    const tela = await render(<AvisoNotificacoes status="desativadas" mensagem="Seus dados foram preservados, mas os lembretes estão desativados." abrirConfiguracoes={abrirConfiguracoes} />);

    expect(tela.getByText(/lembretes estão desativados/)).toBeTruthy();
    await fireEvent.press(tela.getByRole('button', { name: 'Abrir configurações de notificações' }));

    expect(abrirConfiguracoes).toHaveBeenCalledTimes(1);
  });

  it('não oferece configurações para falha técnica ou serviço indisponível', async () => {
    const tela = await render(<AvisoNotificacoes status="falha" mensagem="Não foi possível atualizar os lembretes." abrirConfiguracoes={jest.fn()} />);

    expect(tela.getByText(/Não foi possível atualizar/)).toBeTruthy();
    expect(tela.queryByRole('button', { name: 'Abrir configurações de notificações' })).toBeNull();
  });

  it('não renderiza aviso quando as notificações estão ativas', async () => {
    const tela = await render(<AvisoNotificacoes status="ativas" mensagem={null} abrirConfiguracoes={jest.fn()} />);

    expect(tela.queryByRole('alert')).toBeNull();
  });
});
