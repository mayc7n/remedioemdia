import { criarRegistro, normalizarEstado, ocorrenciasDoDia, proximaOcorrencia, atualizarRegistro, type EstadoApp, type Medicamento } from './agenda';

describe('agenda de medicamentos', () => {
  it('gera ocorrências diárias em ordem de horário', () => {
    const ocorrencias = ocorrenciasDoDia(
      [
        {
          id: 'm2',
          nome: 'Vitamina',
          horarios: ['20:00', '08:00'],
          frequencia: { tipo: 'diaria' },
          situacao: 'ativo',
          criadoEm: '2026-09-18T00:00:00.000Z',
          atualizadoEm: '2026-09-18T00:00:00.000Z',
        },
      ],
      new Date(2026, 8, 18),
    );

    expect(ocorrencias.map((item) => item.horario)).toEqual(['08:00', '20:00']);
  });

  it('atualiza o mesmo registro sem duplicar histórico', () => {
    const registro = criarRegistro({
      id: 'm1',
      nome: 'Remédio',
      horarios: ['08:00'],
      frequencia: { tipo: 'diaria' },
      situacao: 'ativo',
      criadoEm: '2026-09-18T00:00:00.000Z',
      atualizadoEm: '2026-09-18T00:00:00.000Z',
    }, '2026-09-18', '08:00');

    const marcado = atualizarRegistro(registro, 'taken', 'app');
    const repetido = atualizarRegistro(marcado, 'missed', 'widget');

    expect(repetido.estado).toBe('taken');
    expect(repetido.origem).toBe('app');
    expect(repetido.medicamentoNome).toBe('Remédio');
  });

  it('migra o estado atual sem remover registros', () => {
    const salvo = {
      concluiuBoasVindas: true,
      medicamentos: [{ id: 'm1', nome: 'A', horarios: ['08:00'], frequencia: { tipo: 'diaria' }, ativo: true, criadoEm: '2026-09-18T00:00:00.000Z' }],
      registros: [{ id: 'r1', medicamentoId: 'm1', medicamentoNome: 'A', horario: '08:00', previstoPara: '2026-09-18T08:00:00', estado: 'taken', origem: 'app' }],
      consultas: [],
    };

    const estado = normalizarEstado(salvo);
    expect(estado.versao).toBe(2);
    expect(estado.medicamentos[0].situacao).toBe('ativo');
    expect(estado.registros).toHaveLength(1);
  });

  it('gera vários horários, dias selecionados e intervalo sem duplicidade', () => {
    const medicamentos = [
      { id: 'm1', nome: 'A', horarios: ['08:00', '08:00', '20:00'], frequencia: { tipo: 'diasDaSemana', dias: [5] }, situacao: 'ativo', criadoEm: '2026-09-18T00:00:00.000Z', atualizadoEm: '2026-09-18T00:00:00.000Z' },
    ] as Medicamento[];
    expect(ocorrenciasDoDia(medicamentos, new Date(2026, 8, 18)).map(item => item.horario)).toEqual(['08:00', '20:00']);
  });

  it('calcula intervalo ancorado na data de criação', () => {
    const medicamento: Medicamento = {
      id: 'm1',
      nome: 'A',
      horarios: ['08:00'],
      frequencia: { tipo: 'intervalo', aCadaDias: 2 },
      situacao: 'ativo',
      criadoEm: '2026-09-18T00:00:00.000Z',
      atualizadoEm: '2026-09-18T00:00:00.000Z',
    };

    expect(ocorrenciasDoDia([medicamento], new Date(2026, 8, 19))).toHaveLength(0);
    expect(ocorrenciasDoDia([medicamento], new Date(2026, 8, 20))).toHaveLength(1);
  });

  it('ignora medicamentos pausados e excluídos', () => {
    const medicamentos: Medicamento[] = ['pausado', 'excluido'].map((situacao, index) => ({
      id: `m${index}`,
      nome: 'A',
      horarios: ['08:00'],
      frequencia: { tipo: 'diaria' },
      situacao: situacao as Medicamento['situacao'],
      criadoEm: '2026-09-18T00:00:00.000Z',
      atualizadoEm: '2026-09-18T00:00:00.000Z',
    }));

    expect(ocorrenciasDoDia(medicamentos, new Date(2026, 8, 18))).toEqual([]);
  });

  it('encontra a próxima ocorrência futura', () => {
    const medicamento: Medicamento = {
      id: 'm1',
      nome: 'A',
      horarios: ['08:00', '20:00'],
      frequencia: { tipo: 'diaria' },
      situacao: 'ativo',
      criadoEm: '2026-09-18T00:00:00.000Z',
      atualizadoEm: '2026-09-18T00:00:00.000Z',
    };

    expect(proximaOcorrencia([medicamento], new Date(2026, 8, 18, 9, 0))).toMatchObject({ horario: '20:00' });
  });
});
