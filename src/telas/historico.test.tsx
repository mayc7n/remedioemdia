import { fireEvent, render } from '@testing-library/react-native';
import { cores } from '../componentes/tema';
import { RegistroMedicamento } from '../dominio/agenda';
import { Historico } from './Historico';

const registroBase: RegistroMedicamento = {
  id: 'm1-2026-09-18-08:00',
  medicamentoId: 'm1',
  medicamentoNome: 'Remédio da manhã',
  horario: '08:00',
  previstoPara: '2026-09-18T08:00:00',
  estado: 'taken',
  origem: 'app',
};

describe('tela de histórico', () => {
  it('diferencia cada estado por cor, símbolo e texto', async () => {
    const registros = [
      registroBase,
      { ...registroBase, id: 'm1-2026-09-18-12:00', horario: '12:00', estado: 'snoozed' as const },
      { ...registroBase, id: 'm1-2026-09-18-20:00', horario: '20:00', estado: 'missed' as const },
    ];
    const tela = await render(<Historico registros={registros} />);

    expect(tela.getByText('✓ Tomado')).toHaveStyle({ color: cores.verde });
    expect(tela.getByText('↻ Adiado')).toHaveStyle({ color: cores.ambar });
    expect(tela.getByText('! Esquecido')).toHaveStyle({ color: cores.vermelho });
    expect(tela.getByTestId('marcador-missed')).toHaveStyle({ backgroundColor: cores.vermelho });
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
