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

const propsBase = {
  consultas: [],
  modoCuidador: 'comCuidador' as const,
  alterarModoCuidador: jest.fn(),
  abrirConsulta: jest.fn(),
  abrirCuidador: jest.fn(),
  mostrarDetalhesNotificacao: false,
  alternarDetalhesNotificacao: jest.fn(),
};

describe('tela Mais', () => {
  beforeEach(() => jest.clearAllMocks());

  it('oculta a seção Cuidador no uso individual e preserva as outras seções', async () => {
    const tela = await render(<Mais {...propsBase} modoCuidador="semCuidador" />);

    expect(tela.queryByText('Cuidador')).toBeNull();
    expect(tela.getByText('Uso individual')).toBeTruthy();
    expect(tela.getByText('Consultas e exames')).toBeTruthy();
    expect(tela.getByText('Notificações')).toBeTruthy();
    expect(tela.getByText('Privacidade e dados')).toBeTruthy();
    expect(tela.getByText('Aviso clínico')).toBeTruthy();
  });

  it('mostra a seção Cuidador apenas no modo correspondente', async () => {
    const tela = await render(<Mais {...propsBase} />);

    expect(tela.getByText('Cuidador')).toBeTruthy();
    expect(tela.getByText('Com cuidador')).toBeTruthy();
    expect(tela.getByRole('button', { name: 'Configurar cuidador' })).toBeTruthy();
  });

  it('exige confirmação antes de revogar cuidador ativo ao mudar para uso individual', async () => {
    const alterarModoCuidador = jest.fn();
    const cuidador = { nome: 'Ana', contato: '11999999999', consentimentoAtivo: true, avisos: { esquecido: true, adiado: false, consulta: false } };
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_titulo, _mensagem, botoes) => {
      botoes?.find((botao) => botao.text === 'Cancelar')?.onPress?.();
    });
    const tela = await render(<Mais {...propsBase} cuidador={cuidador} alterarModoCuidador={alterarModoCuidador} />);

    await fireEvent.press(tela.getByRole('switch', { name: 'Tenho cuidador' }));
    expect(alterarModoCuidador).not.toHaveBeenCalled();

    alertSpy.mockImplementation((_titulo, _mensagem, botoes) => { botoes?.find((botao) => botao.text === 'Revogar e continuar')?.onPress?.(); });
    await fireEvent.press(tela.getByRole('switch', { name: 'Tenho cuidador' }));
    expect(alterarModoCuidador).toHaveBeenCalledTimes(1);
    expect(alterarModoCuidador).toHaveBeenCalledWith('semCuidador', true);
    alertSpy.mockRestore();
  });

  it('informa quando não há aviso externo enviado', async () => {
    const tela = await render(<Mais {...propsBase} />);
    expect(tela.getByText(/Nenhum aviso externo foi enviado/)).toBeTruthy();
  });

  it('mantém detalhes de notificações desativados por padrão', async () => {
    const alternarDetalhesNotificacao = jest.fn();
    const tela = await render(<Mais {...propsBase} alternarDetalhesNotificacao={alternarDetalhesNotificacao} />);

    const preferencia = tela.getByRole('switch', { name: 'Mostrar detalhes nas notificações' });
    expect(preferencia.props.accessibilityState).toEqual({ checked: false });
    await fireEvent.press(preferencia);
    expect(alternarDetalhesNotificacao).toHaveBeenCalledTimes(1);
    expect(tela.getByText('Por padrão, a notificação não mostra o nome do medicamento nem o título da consulta.')).toBeTruthy();
  });

  it('mostra o aviso de segurança sobre o papel do app', async () => {
    const tela = await render(<Mais {...propsBase} />);

    expect(tela.getByText('Um lembrete, não uma prescrição.')).toBeTruthy();
    expect(tela.getByText('Siga sempre a orientação do seu médico. O app não altera doses nem oferece diagnóstico.')).toBeTruthy();
  });

  it('confirma antes de remover uma consulta ou exame', async () => {
    const excluirConsulta = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_titulo, _mensagem, botoes) => {
      expect(excluirConsulta).not.toHaveBeenCalled();
      botoes?.find((botao) => botao.text === 'Remover')?.onPress?.();
    });
    const tela = await render(<Mais {...propsBase} consultas={[consulta]} excluirConsulta={excluirConsulta} />);

    await fireEvent.press(tela.getByRole('button', { name: 'Remover Consulta cardiológica' }));

    expect(alertSpy).toHaveBeenCalledWith('Remover compromisso?', 'Essa consulta ou exame será removido.', expect.any(Array));
    expect(excluirConsulta).toHaveBeenCalledWith('c1');
    alertSpy.mockRestore();
  });
});
