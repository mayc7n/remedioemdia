import { Alert } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { Medicamento, RegistroMedicamento } from '../dominio/agenda';
import { DetalheMedicamento } from './DetalheMedicamento';
import { Historico } from './Historico';
import { Medicamentos } from './Medicamentos';

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
  it('abre o detalhe pelo cartão com label acessível', async () => {
    const abrirDetalhe = jest.fn();
    const tela = await render(<Medicamentos medicamentos={[medicamento]} abrirDetalhe={abrirDetalhe} abrirNovo={jest.fn()} />);

    await fireEvent.press(tela.getByRole('button', { name: 'Abrir medicamento Remédio da manhã' }));

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

    await fireEvent.changeText(detalhe.getByLabelText('Horário 1'), '09:00');
    await fireEvent.press(detalhe.getByRole('button', { name: 'Adicionar horário' }));
    await fireEvent.changeText(detalhe.getByLabelText('Horário 2'), '20:00');
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
