import { Alert } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { Inicio } from './Inicio';

const ocorrencia = {
  id: 'm1-2026-09-18-08:00',
  medicamentoId: 'm1',
  medicamentoNome: 'Remédio',
  horario: '08:00',
  previstoPara: '2026-09-18T08:00:00',
};

describe('tela inicial', () => {
  it('oferece desfazer para a última marcação', async () => {
    const desfazer = jest.fn();
    const tela = await render(<Inicio ocorrencias={[ocorrencia]} registros={[]} consultas={[]} marcar={jest.fn()} abrirMedicamento={jest.fn()} desfazerDisponivel desfazer={desfazer} />);

    await fireEvent.press(tela.getByRole('button', { name: 'Desfazer marcação' }));

    expect(desfazer).toHaveBeenCalledTimes(1);
  });

  it('apresenta uma lista simples sem hero ou métricas decorativas', async () => {
    const tela = await render(<Inicio ocorrencias={[ocorrencia]} registros={[]} consultas={[]} marcar={jest.fn()} abrirMedicamento={jest.fn()} desfazerDisponivel={false} desfazer={jest.fn()} />);

    expect(tela.getByText('Horários de hoje')).toBeTruthy();
    expect(tela.queryByText('Sua rotina, no seu ritmo.')).toBeNull();
    expect(tela.queryByText('pendentes hoje')).toBeNull();
  });

  it('diferencia os estados por ícone e texto e empilha as ações', async () => {
    const ocorrencias = [
      ocorrencia,
      { ...ocorrencia, id: 'm1-2026-09-18-12:00', horario: '12:00' },
      { ...ocorrencia, id: 'm1-2026-09-18-20:00', horario: '20:00' },
    ];
    const registros = [
      { ...ocorrencia, estado: 'taken' as const, origem: 'app' as const, registradoEm: '2026-09-18T08:00:00.000Z' },
      { ...ocorrencias[1], estado: 'snoozed' as const, origem: 'app' as const, registradoEm: '2026-09-18T12:00:00.000Z' },
      { ...ocorrencias[2], estado: 'missed' as const, origem: 'app' as const, registradoEm: '2026-09-18T20:00:00.000Z' },
    ];
    const tela = await render(<Inicio ocorrencias={ocorrencias} registros={registros} consultas={[]} marcar={jest.fn()} abrirMedicamento={jest.fn()} desfazerDisponivel={false} desfazer={jest.fn()} />);

    expect(tela.getByText('✓ Tomado')).toBeTruthy();
    expect(tela.getByText('↻ Adiado')).toBeTruthy();
    expect(tela.getByText('! Esquecido')).toBeTruthy();
    expect(tela.getByTestId(`acoes-${ocorrencia.id}`).props.style).toEqual(expect.objectContaining({ flexDirection: 'column' }));
  });

  it('pede confirmação antes de marcar como esquecido', async () => {
    const marcar = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_titulo, _mensagem, botoes) => {
      expect(marcar).not.toHaveBeenCalled();
      botoes?.find((botao) => botao.text === 'Esqueci')?.onPress?.();
    });
    const tela = await render(<Inicio ocorrencias={[ocorrencia]} registros={[]} consultas={[]} marcar={marcar} abrirMedicamento={jest.fn()} desfazerDisponivel={false} desfazer={jest.fn()} />);

    await fireEvent.press(tela.getByRole('button', { name: 'Esqueci' }));

    expect(alertSpy).toHaveBeenCalledWith('Marcar como esquecido?', 'Isso ficará registrado no histórico.', expect.any(Array));
    expect(marcar).toHaveBeenCalledWith(ocorrencia, 'missed');
    alertSpy.mockRestore();
  });
});
