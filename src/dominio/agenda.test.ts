import { criarRegistro, ocorrenciasDoDia, atualizarRegistro } from './agenda';

describe('agenda de medicamentos', () => {
  it('gera ocorrências diárias em ordem de horário', () => {
    const ocorrencias = ocorrenciasDoDia(
      [
        {
          id: 'm2',
          nome: 'Vitamina',
          horarios: ['20:00', '08:00'],
          frequencia: { tipo: 'diaria' },
          ativo: true,
          criadoEm: '2026-09-18T00:00:00.000Z',
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
      ativo: true,
      criadoEm: '2026-09-18T00:00:00.000Z',
    }, '2026-09-18', '08:00');

    const marcado = atualizarRegistro(registro, 'taken', 'app');
    const repetido = atualizarRegistro(marcado, 'missed', 'widget');

    expect(repetido.estado).toBe('taken');
    expect(repetido.origem).toBe('app');
    expect(repetido.medicamentoNome).toBe('Remédio');
  });
});
