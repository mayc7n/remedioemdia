import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { RegistroMedicamento } from '../dominio/agenda';
import { Historico, agruparRegistrosPorData } from './Historico';

const registroBase: RegistroMedicamento = {
  id: 'm1-2026-09-18-08:00',
  medicamentoId: 'm1',
  medicamentoNome: 'Remédio da manhã',
  horario: '08:00',
  previstoPara: '2026-09-18T08:00:00',
  estado: 'taken',
  origem: 'app',
};

const criarRegistroTeste = (alteracoes: Partial<RegistroMedicamento> = {}): RegistroMedicamento => ({ ...registroBase, ...alteracoes });

describe('tela de histórico', () => {
  it('agrupa pela data local ao atravessar a meia-noite', () => {
    const grupos = agruparRegistrosPorData([
      criarRegistroTeste({ id: 'antes', previstoPara: '2026-09-18T23:55:00', horario: '23:55' }),
      criarRegistroTeste({ id: 'depois', previstoPara: '2026-09-19T00:05:00', horario: '00:05' }),
    ]);

    expect(grupos.map((grupo) => grupo.chave)).toEqual(['2026-09-19', '2026-09-18']);
  });

  it('mostra Hoje e Ontem com horário único e estado por ícone e texto', async () => {
    const registros = [
      criarRegistroTeste({ id: 'ontem', previstoPara: '2026-09-18T08:00:00', horario: '08:00', estado: 'taken' }),
      criarRegistroTeste({ id: 'hoje', previstoPara: '2026-09-19T00:05:00', horario: '00:05', estado: 'pendente' }),
      criarRegistroTeste({ id: 'adiado', previstoPara: '2026-09-18T12:00:00', horario: '12:00', estado: 'snoozed' }),
      criarRegistroTeste({ id: 'esquecido', previstoPara: '2026-09-18T20:00:00', horario: '20:00', estado: 'missed' }),
    ];
    const tela = await render(<Historico registros={registros} agora={new Date(2026, 8, 19, 12)} />);

    expect(tela.getByText('Hoje')).toBeTruthy();
    expect(tela.getByText('Ontem')).toBeTruthy();
    expect(tela.getByText('Hoje').props.accessibilityRole).toBe('header');
    expect(tela.getByLabelText('19/09/2026 às 00:05, Remédio da manhã, Pendente')).toBeTruthy();
    for (const [estado, rotulo] of [['taken', 'Tomado'], ['snoozed', 'Adiado'], ['missed', 'Esquecido'], ['pendente', 'Pendente']] as const) {
      expect(tela.getByTestId(`estado-${estado}`)).toBeTruthy();
      expect(tela.getByText(rotulo)).toBeTruthy();
    }
    expect(tela.getAllByText('08:00')).toHaveLength(1);
    expect(tela.getAllByText('00:05')).toHaveLength(1);
    expect(tela.queryByText('✓ Tomado')).toBeNull();
  });

  it('atualiza grupos e filtro de sete dias ao virar a meia-noite', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 19, 23, 59, 55));
    try {
      const tela = await render(<Historico registros={[
        criarRegistroTeste({ id: 'hoje', previstoPara: '2026-09-19T08:00:00' }),
        criarRegistroTeste({ id: 'limite', medicamentoNome: 'Remédio do limite', previstoPara: '2026-09-13T08:00:00' }),
      ]} />);
      await fireEvent.press(tela.getByRole('button', { name: 'Últimos 7 dias' }));
      expect(tela.getByText('Hoje')).toBeTruthy();
      expect(tela.getByText('Remédio do limite')).toBeTruthy();

      await act(async () => { jest.advanceTimersByTime(6000); });

      expect(tela.getByText('Ontem')).toBeTruthy();
      expect(tela.queryByText('Hoje')).toBeNull();
      expect(tela.queryByText('Remédio do limite')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('atualiza o dia ao retomar o app após a meia-noite', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 19, 23, 59, 55));
    const assinatura = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
    try {
      const tela = await render(<Historico registros={[criarRegistroTeste({ previstoPara: '2026-09-19T08:00:00' })]} />);
      expect(tela.getByText('Hoje')).toBeTruthy();
      const aoMudarEstado = assinatura.mock.calls.filter(([evento]) => evento === 'change').at(-1)?.[1];
      expect(aoMudarEstado).toBeDefined();

      jest.setSystemTime(new Date(2026, 8, 20, 9));
      await act(async () => { aoMudarEstado?.('active'); });

      expect(tela.getByText('Ontem')).toBeTruthy();
    } finally {
      cleanup();
      assinatura.mockRestore();
      jest.useRealTimers();
    }
  });

  it('filtra o histórico por medicamento', async () => {
    const tela = await render(<Historico registros={[registroBase, { ...registroBase, id: 'm2-2026-09-18-12:00', medicamentoId: 'm2', medicamentoNome: 'Remédio da noite', horario: '12:00' }]} />);

    await fireEvent.changeText(tela.getByLabelText('Filtrar por medicamento'), 'noite');

    expect(tela.getByText('Remédio da noite')).toBeTruthy();
    expect(tela.queryByText('Remédio da manhã')).toBeNull();
  });

  it('filtra o histórico pelos últimos sete dias', async () => {
    const recente = new Date();
    recente.setDate(recente.getDate() - 2);
    const antigo = new Date();
    antigo.setDate(antigo.getDate() - 10);
    const tela = await render(<Historico registros={[
      { ...registroBase, previstoPara: recente.toISOString().slice(0, 19) },
      { ...registroBase, id: 'm1-antigo', previstoPara: antigo.toISOString().slice(0, 19), medicamentoNome: 'Remédio antigo' },
    ]} />);

    await fireEvent.press(tela.getByRole('button', { name: 'Últimos 7 dias' }));

    expect(tela.getByText('Remédio da manhã')).toBeTruthy();
    expect(tela.queryByText('Remédio antigo')).toBeNull();
  });
});
