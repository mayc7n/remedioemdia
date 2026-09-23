import { Alert, StyleSheet } from 'react-native';
import { fireEvent, render, within } from '@testing-library/react-native';
import { Inicio } from './Inicio';

const ocorrencia = {
  id: 'm1-2026-09-18-08:00',
  medicamentoId: 'm1',
  medicamentoNome: 'Remédio',
  horario: '08:00',
  previstoPara: '2026-09-18T08:00:00',
};

function contraste(corA: string, corB: string) {
  const luminancia = (cor: string) => {
    const [vermelho, verde, azul] = cor.match(/[\da-f]{2}/gi)!.map((canal) => parseInt(canal, 16) / 255)
      .map((canal) => canal <= 0.04045 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4);
    return 0.2126 * vermelho + 0.7152 * verde + 0.0722 * azul;
  };
  const [maisClara, maisEscura] = [luminancia(corA), luminancia(corB)].sort((a, b) => b - a);
  return (maisClara + 0.05) / (maisEscura + 0.05);
}

describe('tela inicial', () => {
  it('mantém contraste de texto normal no destaque e na ação Esqueci', async () => {
    const tela = await render(<Inicio ocorrencias={[ocorrencia]} registros={[]} consultas={[]} marcar={jest.fn()} abrirMedicamento={jest.fn()} desfazer={jest.fn()} />);
    const legenda = tela.getByText('Próximo lembrete');
    const esqueci = tela.getByText('Esqueci');
    const corLegenda = StyleSheet.flatten(legenda.props.style).color as string;
    const corEsqueci = StyleSheet.flatten(esqueci.props.style).color as string;

    expect(contraste(corLegenda, '#F4E4D8')).toBeGreaterThanOrEqual(4.5);
    expect(contraste(corEsqueci, '#F6F4EF')).toBeGreaterThanOrEqual(4.5);
  });

  it('mantém todas as ocorrências em ordem cronológica e ações na linha pendente', async () => {
    const ocorrencias = [
      { ...ocorrencia, id: 'cedo', medicamentoNome: 'Cedinho', horario: '08:00' },
      { ...ocorrencia, id: 'meio', medicamentoNome: 'Meio-dia', horario: '12:00' },
      { ...ocorrencia, id: 'tarde', medicamentoNome: 'Tarde', horario: '18:00' },
    ];
    const registros = [{ ...ocorrencias[0], estado: 'taken' as const, origem: 'app' as const, registradoEm: '2026-09-18T08:00:00.000Z' }];
    const marcar = jest.fn();
    const tela = await render(<Inicio ocorrencias={ocorrencias} registros={registros} consultas={[]} marcar={marcar} abrirMedicamento={jest.fn()} desfazer={jest.fn()} />);

    expect(tela.getAllByTestId(/^ocorrencia-/).map((linha) => linha.props.testID)).toEqual(['ocorrencia-cedo', 'ocorrencia-meio', 'ocorrencia-tarde']);
    expect(within(tela.getByTestId('ocorrencia-meio')).getByRole('button', { name: 'Registrar como tomado' })).toBeTruthy();
    expect(within(tela.getByTestId('proximo-lembrete')).queryByRole('button')).toBeNull();
    await fireEvent.press(within(tela.getByTestId('ocorrencia-meio')).getByRole('button', { name: 'Registrar como tomado' }));
    expect(marcar).toHaveBeenCalledWith(ocorrencias[1], 'taken');
  });

  it('mantém o único lembrete pendente na lista com suas ações', async () => {
    const tela = await render(<Inicio ocorrencias={[ocorrencia]} registros={[]} consultas={[]} marcar={jest.fn()} abrirMedicamento={jest.fn()} desfazer={jest.fn()} />);

    expect(tela.getAllByTestId(/^ocorrencia-/)).toHaveLength(1);
    expect(within(tela.getByTestId(`ocorrencia-${ocorrencia.id}`)).getByRole('button', { name: 'Adiar lembrete' })).toBeTruthy();
    expect(within(tela.getByTestId('proximo-lembrete')).queryByRole('button')).toBeNull();
  });

  it('mantém as ações concluídas visíveis e desabilitadas', async () => {
    const registro = { ...ocorrencia, estado: 'taken' as const, origem: 'app' as const, registradoEm: '2026-09-18T08:00:00.000Z' };
    const tela = await render(<Inicio ocorrencias={[ocorrencia]} registros={[registro]} consultas={[]} marcar={jest.fn()} abrirMedicamento={jest.fn()} desfazer={jest.fn()} />);
    const linha = within(tela.getByTestId(`ocorrencia-${ocorrencia.id}`));

    for (const nome of ['Registrar como tomado', 'Adiar lembrete', 'Registrar como esquecido']) {
      expect(linha.getByRole('button', { name: nome }).props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    }
  });

  it('oferece desfazer para a última marcação', async () => {
    const desfazer = jest.fn();
    const registro = { ...ocorrencia, estado: 'taken' as const, origem: 'app' as const, registradoEm: '2026-09-18T08:00:00.000Z' };
    const tela = await render(<Inicio ocorrencias={[ocorrencia]} registros={[registro]} consultas={[]} marcar={jest.fn()} abrirMedicamento={jest.fn()} desfazerOcorrenciaId={ocorrencia.id} desfazer={desfazer} />);

    await fireEvent.press(tela.getByRole('button', { name: 'Desfazer marcação' }));

    expect(desfazer).toHaveBeenCalledTimes(1);
  });

  it('mostra Desfazer junto à última dose registrada no fim da lista', async () => {
    const doseFinal = { ...ocorrencia, id: 'dose-final', horario: '22:00', previstoPara: '2026-09-18T22:00:00' };
    const registroFinal = { ...doseFinal, estado: 'taken' as const, origem: 'app' as const, registradoEm: '2026-09-18T22:00:00.000Z' };
    const desfazer = jest.fn();
    const tela = await render(<Inicio ocorrencias={[ocorrencia, doseFinal]} registros={[registroFinal]} consultas={[]} marcar={jest.fn()} abrirMedicamento={jest.fn()} desfazerOcorrenciaId="dose-final" desfazer={desfazer} />);

    const linhaInicial = within(tela.getByTestId(`ocorrencia-${ocorrencia.id}`));
    const linhaFinal = within(tela.getByTestId('ocorrencia-dose-final'));
    expect(linhaInicial.queryByRole('button', { name: 'Desfazer marcação' })).toBeNull();
    expect(linhaFinal.getByRole('button', { name: 'Desfazer marcação' })).toBeTruthy();
    expect(tela.getAllByRole('button', { name: 'Desfazer marcação' })).toHaveLength(1);
    await fireEvent.press(linhaFinal.getByRole('button', { name: 'Desfazer marcação' }));
    expect(desfazer).toHaveBeenCalledTimes(1);
  });

  it('mantém Desfazer acessível para uma ação do widget fora da lista de hoje', async () => {
    const desfazer = jest.fn();
    const tela = await render(<Inicio ocorrencias={[ocorrencia]} registros={[]} consultas={[]} marcar={jest.fn()} abrirMedicamento={jest.fn()} desfazerOcorrenciaId="dose-de-outro-dia" desfazer={desfazer} />);

    expect(tela.getByRole('button', { name: 'Desfazer marcação' })).toBeTruthy();
    await fireEvent.press(tela.getByRole('button', { name: 'Desfazer marcação' }));
    expect(desfazer).toHaveBeenCalledTimes(1);
  });

  it('apresenta uma lista simples sem hero ou métricas decorativas', async () => {
    const tela = await render(<Inicio ocorrencias={[ocorrencia]} registros={[]} consultas={[]} marcar={jest.fn()} abrirMedicamento={jest.fn()} desfazer={jest.fn()} dataAtual={new Date(2026, 8, 18, 9)} />);

    expect(tela.getByText('sexta-feira, 18 de setembro')).toBeTruthy();
    expect(tela.getByText('Próximo lembrete')).toBeTruthy();
    expect(tela.getByText('Horários de hoje')).toBeTruthy();
    expect(tela.getByRole('button', { name: 'Registrar como tomado' })).toBeTruthy();
    expect(tela.getByRole('button', { name: 'Adiar lembrete' })).toBeTruthy();
    expect(tela.getByRole('button', { name: 'Registrar como esquecido' })).toBeTruthy();
    expect(tela.queryByText('✓ Tomado')).toBeNull();
    expect(tela.queryByText('Sua rotina, no seu ritmo.')).toBeNull();
    expect(tela.queryByText('pendentes hoje')).toBeNull();
  });

  it('diferencia os estados por ícone e texto e permite quebrar as ações', async () => {
    const ocorrencias = [
      ocorrencia,
      { ...ocorrencia, id: 'm1-2026-09-18-12:00', horario: '12:00' },
      { ...ocorrencia, id: 'm1-2026-09-18-20:00', horario: '20:00' },
      { ...ocorrencia, id: 'm1-2026-09-18-22:00', horario: '22:00' },
    ];
    const registros = [
      { ...ocorrencia, estado: 'taken' as const, origem: 'app' as const, registradoEm: '2026-09-18T08:00:00.000Z' },
      { ...ocorrencias[1], estado: 'snoozed' as const, origem: 'app' as const, registradoEm: '2026-09-18T12:00:00.000Z' },
      { ...ocorrencias[2], estado: 'missed' as const, origem: 'app' as const, registradoEm: '2026-09-18T20:00:00.000Z' },
    ];
    const tela = await render(<Inicio ocorrencias={ocorrencias} registros={registros} consultas={[]} marcar={jest.fn()} abrirMedicamento={jest.fn()} desfazer={jest.fn()} />);

    expect(tela.getByTestId('estado-taken')).toBeTruthy();
    expect(tela.getByTestId('estado-snoozed')).toBeTruthy();
    expect(tela.getByTestId('estado-missed')).toBeTruthy();
    expect(tela.getByText('Tomado')).toBeTruthy();
    expect(tela.getByText('Adiado')).toBeTruthy();
    expect(tela.getByText('Esquecido')).toBeTruthy();
    expect(tela.getByTestId('acoes-m1-2026-09-18-22:00')).toHaveStyle({ flexWrap: 'wrap' });
  });

  it('pede confirmação antes de marcar como esquecido', async () => {
    const marcar = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_titulo, _mensagem, botoes) => {
      expect(marcar).not.toHaveBeenCalled();
      botoes?.find((botao) => botao.text === 'Esqueci')?.onPress?.();
    });
    const tela = await render(<Inicio ocorrencias={[ocorrencia]} registros={[]} consultas={[]} marcar={marcar} abrirMedicamento={jest.fn()} desfazer={jest.fn()} />);

    await fireEvent.press(tela.getByRole('button', { name: 'Registrar como esquecido' }));

    expect(alertSpy).toHaveBeenCalledWith('Marcar como esquecido?', 'Isso ficará registrado no histórico.', expect.any(Array));
    expect(marcar).toHaveBeenCalledWith(ocorrencia, 'missed');
    alertSpy.mockRestore();
  });
});
