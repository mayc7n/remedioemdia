import * as Notifications from 'expo-notifications';
import { EstadoApp } from './dominio/agenda';
import {
  agendarAdiantamento,
  prepararNotificacoes,
  sincronizarNotificacoes,
  sincronizarNotificacoesComFuso,
} from './notificacoes';

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: {
    DATE: 'date',
    DAILY: 'daily',
    WEEKLY: 'weekly',
  },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
}));

const estadoBase: EstadoApp = {
  versao: 2,
  concluiuBoasVindas: true,
  medicamentos: [],
  registros: [],
  consultas: [],
};

const medicamento = (overrides: Partial<EstadoApp['medicamentos'][number]> = {}) => ({
  id: 'm1',
  nome: 'Remédio',
  horarios: ['08:00', '20:00'],
  frequencia: { tipo: 'diaria' as const },
  situacao: 'ativo' as const,
  criadoEm: '2026-09-18T00:00:00.000Z',
  atualizadoEm: '2026-09-18T00:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([
    { identifier: 'proprio-antigo', content: { data: { origem: 'remedio-em-dia' } } },
    { identifier: 'nao-tocar', content: { data: { origem: 'outro-app' } } },
  ]);
  (Notifications.scheduleNotificationAsync as jest.Mock).mockImplementation(async (request) => request.identifier ?? 'gerado');
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
  (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
});

describe('reconciliador de notificações', () => {
  it('cancela somente avisos do app e mantém IDs estáveis ao sincronizar', async () => {
    const estado = { ...estadoBase, medicamentos: [medicamento()] };

    await sincronizarNotificacoes(estado, new Date(2026, 8, 19, 7, 0));
    const primeiraRodada = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls.map(([request]) => request.identifier);

    await sincronizarNotificacoes(estado, new Date(2026, 8, 19, 7, 0));
    const segundaRodada = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls.slice(2).map(([request]) => request.identifier);

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('proprio-antigo');
    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('nao-tocar');
    expect(primeiraRodada).toEqual(['medicamento-m1-diaria-08-00', 'medicamento-m1-diaria-20-00']);
    expect(segundaRodada).toEqual(primeiraRodada);
  });

  it('agenda dias da semana e intervalo como recorrências locais', async () => {
    const estado = {
      ...estadoBase,
      medicamentos: [
        medicamento({ id: 'm2', frequencia: { tipo: 'diasDaSemana', dias: [1, 3] }, horarios: ['09:30'] }),
        medicamento({ id: 'm3', frequencia: { tipo: 'intervalo', aCadaDias: 2 }, horarios: ['10:00'] }),
      ],
    };

    await sincronizarNotificacoes(estado, new Date(2026, 8, 19, 7, 0));

    const requests = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls.map(([request]) => request);
    expect(requests).toEqual(expect.arrayContaining([
      expect.objectContaining({
        identifier: 'medicamento-m2-semana-1-09-30',
        trigger: expect.objectContaining({ type: 'weekly', weekday: 2, hour: 9, minute: 30 }),
      }),
      expect.objectContaining({
        identifier: 'medicamento-m2-semana-3-09-30',
        trigger: expect.objectContaining({ type: 'weekly', weekday: 4, hour: 9, minute: 30 }),
      }),
      expect.objectContaining({
        identifier: expect.stringMatching(/^medicamento-m3-data-/),
        trigger: expect.objectContaining({ type: 'date' }),
      }),
    ]));
  });

  it('agenda consulta em 24 horas e 1 hora antes', async () => {
    const estado = {
      ...estadoBase,
      consultas: [{
        id: 'c1',
        tipo: 'consulta' as const,
        titulo: 'Retorno',
        marcadoPara: '2026-09-20T10:00',
        lembretes: true,
        concluida: false,
      }],
    };

    await sincronizarNotificacoes(estado, new Date(2026, 8, 19, 9, 0));

    const finalidades = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls
      .map(([request]) => request.content.data.finalidade);
    expect(finalidades).toEqual(expect.arrayContaining(['lembrete-24h', 'lembrete-1h']));
  });

  it('cria um adiamento único sem alterar a recorrência', async () => {
    await agendarAdiantamento('Remédio', 'm1-2026-09-19-08:00');

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      identifier: expect.stringMatching(/^adiamento-/),
      content: expect.objectContaining({
        body: expect.stringContaining('Remédio'),
        data: expect.objectContaining({ finalidade: 'adiamento', ocorrenciaId: 'm1-2026-09-19-08:00' }),
      }),
      trigger: expect.objectContaining({ type: 'date' }),
    }));
  });

  it('registra o fuso atual antes de reconciliar', async () => {
    const estado = { ...estadoBase, medicamentos: [medicamento()] };

    const resultado = await sincronizarNotificacoesComFuso(estado, new Date(2026, 8, 19, 7, 0));

    expect(resultado.estado.fusoHorarioObservado).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(resultado.fusoMudou).toBe(true);
  });
});

describe('permissão de notificações', () => {
  it('retorna falso sem apagar o cadastro quando a permissão é negada', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
    expect(await prepararNotificacoes()).toBe(false);
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });
});
