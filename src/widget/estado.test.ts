import { EstadoApp } from '../dominio/agenda';
import { carregarEstado, salvarEstado } from '../dados/armazenamento';
import { criarSnapshotWidget, processarAcaoWidgetPersistida } from './estado';

jest.mock('../dados/armazenamento', () => ({
  carregarEstado: jest.fn(),
  salvarEstado: jest.fn(),
}));

const estadoBase: EstadoApp = {
  versao: 3,
  concluiuBoasVindas: true,
  modoCuidador: 'naoInformado',
  mostrarDetalhesNotificacao: false,
  medicamentos: [],
  registros: [],
  consultas: [],
};

const medicamento = {
  id: 'm1',
  nome: 'Remédio real',
  horarios: ['08:00', '20:00'],
  frequencia: { tipo: 'diaria' as const },
  situacao: 'ativo' as const,
  criadoEm: '2026-09-18T00:00:00.000Z',
  atualizadoEm: '2026-09-18T00:00:00.000Z',
};

describe('estado do widget', () => {
  it('publica o próximo medicamento real e seu estado', () => {
    const snapshot = criarSnapshotWidget({ ...estadoBase, medicamentos: [medicamento] }, new Date(2026, 8, 19, 7, 0));

    expect(snapshot).toMatchObject({ nome: 'Remédio real', horario: '08:00', estado: 'pendente', ocorrenciaId: 'm1-2026-09-19-08:00' });
  });

  it('pula ocorrência já tomada e escolhe o próximo horário pendente', () => {
    const snapshot = criarSnapshotWidget({
      ...estadoBase,
      medicamentos: [medicamento],
      registros: [{ id: 'm1-2026-09-19-08:00', medicamentoId: 'm1', medicamentoNome: 'Remédio real', horario: '08:00', previstoPara: '2026-09-19T08:00:00', estado: 'taken', origem: 'app' }],
    }, new Date(2026, 8, 19, 7, 0));

    expect(snapshot).toMatchObject({ horario: '20:00', estado: 'pendente', ocorrenciaId: 'm1-2026-09-19-20:00' });
  });

  it('informa ausência quando não há lembrete ativo', () => {
    expect(criarSnapshotWidget(estadoBase, new Date(2026, 8, 19, 7, 0))).toMatchObject({ nome: 'Nenhum lembrete', horario: '--:--', estado: 'nenhum' });
  });

  it('persiste ações do widget com origem própria e publica novo snapshot', async () => {
    (carregarEstado as jest.Mock).mockResolvedValue({ ...estadoBase, medicamentos: [medicamento] });

    const resultado = await processarAcaoWidgetPersistida('taken', 'm1-2026-09-19-08:00', new Date(2026, 8, 19, 7, 0));

    expect(salvarEstado).toHaveBeenCalledWith(expect.objectContaining({ registros: [expect.objectContaining({ estado: 'taken', origem: 'widget' })] }));
    expect(resultado.snapshot.horario).toBe('20:00');
  });
});
