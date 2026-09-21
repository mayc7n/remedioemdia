import { render } from '@testing-library/react-native';
import { Mais } from './Mais';

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
});
