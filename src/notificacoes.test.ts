import * as Notifications from 'expo-notifications';
import { EstadoApp } from './dominio/agenda';
import {
  agendarAdiantamento,
  deveSincronizarAoRetomar,
  processarRespostaNotificacao,
  prepararNotificacoes,
  interpretarRespostaNotificacao,
  sincronizarNotificacoes,
  sincronizarNotificacoesComFuso,
  mensagemStatusNotificacoes,
} from './notificacoes';

describe('retomada do app', () => {
  it('sincroniza ao sair de segundo plano e voltar ao estado ativo', () => {
    expect(deveSincronizarAoRetomar('background', 'active')).toBe(true);
    expect(deveSincronizarAoRetomar('inactive', 'active')).toBe(true);
  });

  it('não repete a sincronização enquanto o app continua ativo', () => {
    expect(deveSincronizarAoRetomar('active', 'active')).toBe(false);
  });
});

describe('resposta inicial da notificação', () => {
  it('aplica uma ação pendente quando o app é aberto pela notificação', () => {
    const estado = { ...estadoBase, medicamentos: [medicamento()] };
    const resposta = { actionIdentifier: 'taken', notification: { request: { content: { data: { origem: 'remedio-em-dia', ocorrenciaId: 'm1-2026-09-19-08:00' } } } } };

    const resultado = processarRespostaNotificacao(estado, resposta);

    expect(resultado.registros).toEqual([expect.objectContaining({ id: 'm1-2026-09-19-08:00', estado: 'taken', origem: 'notification' })]);
  });

  it('ignora toque simples ou resposta de outro app', () => {
    const estado = { ...estadoBase, medicamentos: [medicamento()] };
    const resposta = { actionIdentifier: 'expo.notifications.DEFAULT', notification: { request: { content: { data: { origem: 'outro-app' } } } } };

    expect(processarRespostaNotificacao(estado, resposta)).toBe(estado);
  });
});

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: {
    DATE: 'date',
    DAILY: 'daily',
    WEEKLY: 'weekly',
  },
  IosAuthorizationStatus: {
    NOT_DETERMINED: 0,
    DENIED: 1,
    AUTHORIZED: 2,
    PROVISIONAL: 3,
    EPHEMERAL: 4,
  },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationCategoryAsync: jest.fn(),
  AndroidImportance: { HIGH: 4 },
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
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
  (Notifications.setNotificationCategoryAsync as jest.Mock).mockResolvedValue({});
});

describe('reconciliador de notificações', () => {
  it('não cancela nem agenda quando as notificações estão desativadas', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });

    const resultado = await sincronizarNotificacoesComFuso(
      { ...estadoBase, medicamentos: [medicamento()] },
      new Date(2026, 8, 19, 7, 0),
    );

    expect(resultado.status).toBe('desativadas');
    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('reconcilia quando o iOS concede autorização provisional', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: false,
      ios: { status: Notifications.IosAuthorizationStatus.PROVISIONAL },
    });

    const resultado = await sincronizarNotificacoesComFuso(
      { ...estadoBase, medicamentos: [medicamento()] },
      new Date(2026, 8, 19, 7, 0),
    );

    expect(resultado.status).toBe('ativas');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
  });

  it('mantém os lembretes anteriores quando um novo agendamento falha', async () => {
    (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([
      { identifier: 'proprio-antigo', content: { data: { origem: 'remedio-em-dia' } } },
    ]);
    (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValueOnce(new Error('falha nativa'));

    const resultado = await sincronizarNotificacoesComFuso(
      { ...estadoBase, medicamentos: [medicamento()] },
      new Date(2026, 8, 19, 7, 0),
    );

    expect(resultado.status).toBe('falha');
    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('proprio-antigo');
  });

  it('não recria um lembrete que já existe e remove apenas o que ficou obsoleto', async () => {
    (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([
      { identifier: 'medicamento-m1-diaria-08-00', content: { data: { origem: 'remedio-em-dia' } } },
      { identifier: 'proprio-antigo', content: { data: { origem: 'remedio-em-dia' } } },
    ]);

    const resultado = await sincronizarNotificacoesComFuso(
      { ...estadoBase, medicamentos: [medicamento({ horarios: ['08:00'] })] },
      new Date(2026, 8, 19, 7, 0),
    );

    expect(resultado.status).toBe('ativas');
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('proprio-antigo');
  });

  it('oculta o nome do medicamento por padrão', async () => {
    await sincronizarNotificacoes({ ...estadoBase, medicamentos: [medicamento()] }, new Date(2026, 8, 19, 7, 0));

    const request = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(request.content.title).toBe('Lembrete de medicamento');
    expect(request.content.body).toBe('Você tem um lembrete de medicamento.');
    expect(request.content.body).not.toContain('Remédio');
  });

  it('exibe o conteúdo completo somente quando a preferência foi ativada', async () => {
    await sincronizarNotificacoes({ ...estadoBase, mostrarDetalhesNotificacao: true, medicamentos: [medicamento()] }, new Date(2026, 8, 19, 7, 0));

    const request = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(request.content.title).toBe('Remédio em Dia');
    expect(request.content.body).toContain('Remédio');
  });

  it('oculta o título da consulta por padrão', async () => {
    await sincronizarNotificacoes({
      ...estadoBase,
      consultas: [{ id: 'c1', tipo: 'consulta', titulo: 'Retorno com cardiologista', marcadoPara: '2026-09-20T10:00', lembretes: true, concluida: false }],
    }, new Date(2026, 8, 19, 9, 0));

    const request = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(request.content.body).toBe('Você tem um compromisso de saúde amanhã.');
    expect(request.content.body).not.toContain('cardiologista');
  });

  it('exibe o título da consulta somente quando a preferência foi ativada', async () => {
    await sincronizarNotificacoes({
      ...estadoBase,
      mostrarDetalhesNotificacao: true,
      consultas: [{ id: 'c1', tipo: 'consulta', titulo: 'Retorno com cardiologista', marcadoPara: '2026-09-20T10:00', lembretes: true, concluida: false }],
    }, new Date(2026, 8, 19, 9, 0));

    const request = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(request.content.body).toContain('Retorno com cardiologista');
  });

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

  it('preserva um adiamento próprio já agendado durante a reconciliação', async () => {
    (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([
      { identifier: 'adiamento-pendente', content: { data: { origem: 'remedio-em-dia', finalidade: 'adiamento' } } },
    ]);

    await sincronizarNotificacoes(estadoBase, new Date(2026, 8, 19, 7, 0));

    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('adiamento-pendente');
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
        title: 'Lembrete de medicamento',
        body: 'Você tem um lembrete de medicamento.',
        data: expect.objectContaining({ finalidade: 'adiamento', ocorrenciaId: 'm1-2026-09-19-08:00' }),
      }),
      trigger: expect.objectContaining({ type: 'date' }),
    }));
  });

  it('preserva o nome no adiamento quando os detalhes foram autorizados', async () => {
    await agendarAdiantamento('Remédio', 'm1-2026-09-19-08:00', true);

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.objectContaining({ title: 'Remédio em Dia', body: expect.stringContaining('Remédio') }),
    }));
  });

  it('associa ações e canal à notificação de medicamento', async () => {
    await sincronizarNotificacoes({ ...estadoBase, medicamentos: [medicamento()] }, new Date(2026, 8, 19, 7, 0));

    const request = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(request.content).toEqual(expect.objectContaining({ categoryIdentifier: 'medicamento_acoes' }));
    expect(request.trigger).toEqual(expect.objectContaining({ channelId: 'medicamentos' }));
  });

  it('interpreta somente ações conhecidas que tenham uma ocorrência', () => {
    const resposta = { actionIdentifier: 'taken', notification: { request: { content: { data: { origem: 'remedio-em-dia', ocorrenciaId: 'm1-2026-09-19-08:00' } } } } };

    expect(interpretarRespostaNotificacao(resposta)).toEqual({ ocorrenciaId: 'm1-2026-09-19-08:00', acao: 'taken' });
    expect(interpretarRespostaNotificacao({ ...resposta, actionIdentifier: 'desconhecida' })).toBeNull();
    expect(interpretarRespostaNotificacao({ ...resposta, notification: { request: { content: { data: { origem: 'outro-app', ocorrenciaId: 'm1-2026-09-19-08:00' } } } } })).toBeNull();
  });

  it('registra o fuso atual antes de reconciliar', async () => {
    const estado = { ...estadoBase, medicamentos: [medicamento()] };

    const resultado = await sincronizarNotificacoesComFuso(estado, new Date(2026, 8, 19, 7, 0));

    expect(resultado.estado.fusoHorarioObservado).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(resultado.fusoMudou).toBe(true);
  });
});

describe('permissão de notificações', () => {
  it('explica que os dados permanecem preservados quando o lembrete falha', () => {
    expect(mensagemStatusNotificacoes('falha')).toContain('Seus dados foram preservados');
    expect(mensagemStatusNotificacoes('desativadas')).toContain('configurações do sistema');
    expect(mensagemStatusNotificacoes('indisponiveis')).toContain('não estão disponíveis');
    expect(mensagemStatusNotificacoes('ativas')).toBeNull();
  });

  it('retorna falso sem apagar o cadastro quando a permissão é negada', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
    expect(await prepararNotificacoes()).toBe(false);
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('registra a categoria de ações antes da permissão', async () => {
    await prepararNotificacoes();

    expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledWith('medicamento_acoes', expect.arrayContaining([
      expect.objectContaining({ identifier: 'taken', buttonTitle: 'Tomei' }),
      expect.objectContaining({ identifier: 'snoozed', buttonTitle: 'Adiar 15 min' }),
      expect.objectContaining({ identifier: 'missed', buttonTitle: 'Pular' }),
    ]), expect.anything());
  });

  it('classifica falha ao consultar a permissão como indisponibilidade nativa', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockRejectedValueOnce(new Error('módulo ausente'));

    const resultado = await sincronizarNotificacoesComFuso(estadoBase, new Date(2026, 8, 19, 7, 0));

    expect(resultado.status).toBe('indisponiveis');
  });
});
