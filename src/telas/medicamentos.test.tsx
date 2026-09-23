import { Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fireEvent, render } from '@testing-library/react-native';
import { Medicamento, RegistroMedicamento } from '../dominio/agenda';
import { DetalheMedicamento } from './DetalheMedicamento';
import { Historico } from './Historico';
import { Medicamentos } from './Medicamentos';

let mockHora = 9;

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ onChange }: { onChange: (evento: { type: 'set' }, data: Date) => void }) => React.createElement(
      Pressable,
      { accessibilityRole: 'button', accessibilityLabel: 'Mock seletor de horário', onPress: () => onChange({ type: 'set' }, new Date(2026, 8, 19, mockHora, 0)) },
      React.createElement(Text, null, 'Mock seletor de horário'),
    ),
  };
});

const medicamento: Medicamento = {
  id: 'm1',
  nome: 'Remédio da manhã',
  horarios: ['08:00'],
  frequencia: { tipo: 'diaria' },
  observacao: 'Tomar conforme orientação médica.',
  situacao: 'ativo',
  criadoEm: '2026-09-18T00:00:00.000Z',
  atualizadoEm: '2026-09-18T00:00:00.000Z',
};

const registro: RegistroMedicamento = {
  id: 'm1-2026-09-18-08:00',
  medicamentoId: 'm1',
  medicamentoNome: 'Remédio da manhã',
  horario: '08:00',
  previstoPara: '2026-09-18T08:00:00',
  estado: 'taken',
  origem: 'app',
};

describe('fluxo de medicamentos', () => {
  it('lista ativos antes de pausados, identifica situação por ícone e texto e oculta excluídos', async () => {
    const pausado = { ...medicamento, id: 'm2', nome: 'Remédio pausado', situacao: 'pausado' as const };
    const excluido = { ...medicamento, id: 'm3', nome: 'Medicamento excluído', situacao: 'excluido' as const };
    const tela = await render(<Medicamentos medicamentos={[pausado, excluido, medicamento]} abrirDetalhe={jest.fn()} abrirNovo={jest.fn()} />);

    expect(tela.getAllByRole('button', { name: /Abrir medicamento/ }).map((linha) => linha.props.accessibilityLabel)).toEqual([
      'Abrir medicamento Remédio da manhã, Ativo. Horários 08:00. Frequência todos os dias. Tomar conforme orientação médica.',
      'Abrir medicamento Remédio pausado, Pausado. Horários 08:00. Frequência todos os dias. Tomar conforme orientação médica.',
    ]);
    expect(tela.getByTestId('medicamento-ativo')).toBeTruthy();
    expect(tela.getByTestId('medicamento-pausado')).toBeTruthy();
    expect(tela.getByText('Ativo')).toBeTruthy();
    expect(tela.getByText('Pausado')).toBeTruthy();
    expect(tela.getAllByText(String.fromCodePoint(Number(Ionicons.glyphMap['chevron-forward'])))).toHaveLength(2);
    expect(tela.queryByText('›')).toBeNull();
    expect(tela.queryByText('Medicamento excluído')).toBeNull();
  });

  it('traduz o estado dos registros recentes no detalhe', async () => {
    const tela = await render(<DetalheMedicamento medicamento={medicamento} registros={[registro]} onSalvar={jest.fn()} onPausar={jest.fn()} onExcluir={jest.fn()} />);

    expect(tela.getByText('Frequência')).toBeTruthy();
    expect(tela.getByRole('button', { name: 'Frequência todos os dias' }).props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
    expect(tela.getByRole('button', { name: 'Usar apenas alguns dias' }).props.accessibilityState).toEqual(expect.objectContaining({ selected: false }));
    expect(tela.getByText('Registros recentes')).toBeTruthy();
    expect(tela.getByText('Tomado')).toBeTruthy();
    expect(tela.queryByText('taken')).toBeNull();
  });

  it('mostra os cinco registros mais recentes com data e hora distintas', async () => {
    const registros = [13, 14, 15, 16, 17, 18].map((dia) => ({
      ...registro,
      id: `m1-2026-09-${dia}-08:00`,
      previstoPara: `2026-09-${dia}T08:00:00`,
    }));
    const tela = await render(<DetalheMedicamento medicamento={medicamento} registros={registros} onSalvar={jest.fn()} onPausar={jest.fn()} onExcluir={jest.fn()} />);

    expect(tela.getAllByText(/\/09\/2026 às 08:00/).map((texto) => texto.props.children)).toEqual([
      '18/09/2026 às 08:00',
      '17/09/2026 às 08:00',
      '16/09/2026 às 08:00',
      '15/09/2026 às 08:00',
      '14/09/2026 às 08:00',
    ]);
    expect(tela.queryByText('13/09/2026 às 08:00')).toBeNull();
  });

  it('oferece um seletor nativo para cada horário', async () => {
    const tela = await render(
      <DetalheMedicamento
        medicamento={{ ...medicamento, horarios: ['08:00'] }}
        registros={[]}
        onSalvar={jest.fn()}
        onPausar={jest.fn()}
        onExcluir={jest.fn()}
      />,
    );

    expect(tela.getByRole('button', { name: 'Escolher horário 1' })).toBeTruthy();
  });

  it('abre o detalhe pelo cartão com label acessível', async () => {
    const abrirDetalhe = jest.fn();
    const tela = await render(<Medicamentos medicamentos={[medicamento]} abrirDetalhe={abrirDetalhe} abrirNovo={jest.fn()} />);

    await fireEvent.press(tela.getByRole('button', { name: 'Abrir medicamento Remédio da manhã, Ativo. Horários 08:00. Frequência todos os dias. Tomar conforme orientação médica.' }));

    expect(abrirDetalhe).toHaveBeenCalledWith('m1');
  });

  it('edita horários, pausa e exclui mantendo o aviso de histórico', async () => {
    const salvar = jest.fn();
    const pausar = jest.fn();
    const excluir = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_titulo, _mensagem, botoes) => {
      botoes?.find((botao) => botao.text === 'Excluir')?.onPress?.();
    });

    const detalhe = await render(
      <DetalheMedicamento
        medicamento={medicamento}
        registros={[registro]}
        onSalvar={salvar}
        onPausar={pausar}
        onExcluir={excluir}
      />,
    );

    mockHora = 9;
    await fireEvent.press(detalhe.getByRole('button', { name: 'Escolher horário 1' }));
    await fireEvent.press(detalhe.getByRole('button', { name: 'Mock seletor de horário' }));
    const confirmarPrimeiro = detalhe.queryByRole('button', { name: 'Usar este horário' });
    if (confirmarPrimeiro) await fireEvent.press(confirmarPrimeiro);
    await fireEvent.press(detalhe.getByRole('button', { name: 'Adicionar horário' }));
    mockHora = 20;
    await fireEvent.press(detalhe.getByRole('button', { name: 'Escolher horário 2' }));
    await fireEvent.press(detalhe.getByRole('button', { name: 'Mock seletor de horário' }));
    const confirmarSegundo = detalhe.queryByRole('button', { name: 'Usar este horário' });
    if (confirmarSegundo) await fireEvent.press(confirmarSegundo);
    await fireEvent.press(detalhe.getByRole('button', { name: 'Salvar medicamento' }));
    await fireEvent.press(detalhe.getByRole('button', { name: 'Pausar lembretes' }));
    await fireEvent.press(detalhe.getByRole('button', { name: 'Excluir medicamento' }));

    expect(salvar).toHaveBeenCalledWith(expect.objectContaining({ horarios: ['09:00', '20:00'] }));
    expect(pausar).toHaveBeenCalledWith('pausado');
    expect(excluir).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith('Excluir medicamento?', 'O histórico será preservado.', expect.any(Array));
    alertSpy.mockRestore();

    const historico = await render(<Historico registros={[registro]} />);
    expect(historico.getByText('Remédio da manhã')).toBeTruthy();
  });
});
