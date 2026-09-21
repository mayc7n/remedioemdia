import { Alert } from 'react-native';
import { render } from '@testing-library/react-native';
import { fireEvent } from '@testing-library/react-native';
import { Mais } from './Mais';

const consulta = {
  id: 'c1',
  tipo: 'consulta' as const,
  titulo: 'Consulta cardiológica',
  marcadoPara: '2026-09-20T10:00',
  lembretes: true,
  concluida: false,
};

describe('tela Mais', () => {
  it('informa quando não há aviso externo enviado', async () => {
    const tela = await render(<Mais consultas={[]} abrirConsulta={jest.fn()} abrirCuidador={jest.fn()} mostrarDetalhesNotificacao={false} alternarDetalhesNotificacao={jest.fn()} />);
    expect(tela.getByText(/Nenhum aviso externo foi enviado/)).toBeTruthy();
  });

  it('mantém detalhes de notificações desativados por padrão', async () => {
    const tela = await render(<Mais consultas={[]} abrirConsulta={jest.fn()} abrirCuidador={jest.fn()} mostrarDetalhesNotificacao={false} alternarDetalhesNotificacao={jest.fn()} />);

    expect(tela.getByRole('button', { name: 'Mostrar detalhes nas notificações' }).props.accessibilityState).toEqual(expect.objectContaining({ selected: false }));
    expect(tela.getByText('Por padrão, a notificação não mostra o nome do medicamento nem o título da consulta.')).toBeTruthy();
  });

  it('mostra o aviso de segurança sobre o papel do app', async () => {
    const tela = await render(<Mais consultas={[]} abrirConsulta={jest.fn()} abrirCuidador={jest.fn()} mostrarDetalhesNotificacao={false} alternarDetalhesNotificacao={jest.fn()} />);

    expect(tela.getByText('O app não prescreve medicamentos, não altera doses e não oferece diagnóstico.')).toBeTruthy();
  });

  it('confirma antes de remover uma consulta ou exame', async () => {
    const excluirConsulta = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_titulo, _mensagem, botoes) => {
      expect(excluirConsulta).not.toHaveBeenCalled();
      botoes?.find((botao) => botao.text === 'Remover')?.onPress?.();
    });
    const tela = await render(<Mais consultas={[consulta]} abrirConsulta={jest.fn()} abrirCuidador={jest.fn()} excluirConsulta={excluirConsulta} mostrarDetalhesNotificacao={false} alternarDetalhesNotificacao={jest.fn()} />);

    await fireEvent.press(tela.getByRole('button', { name: 'Remover Consulta cardiológica' }));

    expect(alertSpy).toHaveBeenCalledWith('Remover compromisso?', 'Essa consulta ou exame será removido.', expect.any(Array));
    expect(excluirConsulta).toHaveBeenCalledWith('c1');
    alertSpy.mockRestore();
  });
});
