import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { AppStateStatus } from 'react-native';
import {
  EstadoApp,
  aplicarAcaoNaOcorrencia,
  ocorrenciasDoDia,
} from './dominio/agenda';

export type FinalidadeNotificacao = 'recorrente' | 'lembrete-24h' | 'lembrete-1h' | 'adiamento' | 'avulso';

export type MetadadosNotificacao = {
  origem: 'remedio-em-dia';
  tipo: 'medicamento' | 'consulta';
  entidadeId: string;
  ocorrenciaId?: string;
  horario?: string;
  finalidade: FinalidadeNotificacao;
};

const ORIGEM = 'remedio-em-dia';
const JANELA_INTERVALO_DIAS = 60;
export const CATEGORIA_MEDICAMENTO = 'medicamento_acoes';
export const CANAL_MEDICAMENTOS = 'medicamentos';

export type StatusNotificacoes = 'ativas' | 'desativadas' | 'indisponiveis' | 'falha';

export const mensagemStatusNotificacoes = (status: StatusNotificacoes) => {
  if (status === 'desativadas') return 'Seus dados foram preservados, mas os lembretes estão desativados. Permita notificações nas configurações do sistema.';
  if (status === 'indisponiveis') return 'Seus dados foram preservados, mas as notificações nativas não estão disponíveis neste ambiente.';
  if (status === 'falha') return 'Seus dados foram preservados, mas não foi possível atualizar os lembretes. Tente abrir o app novamente.';
  return null;
};

const notificacoesAutorizadas = (permissao: Notifications.NotificationPermissionsStatus) =>
  permissao.granted
  || permissao.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED
  || permissao.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  || permissao.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL;

export const deveSincronizarAoRetomar = (anterior: AppStateStatus | null, atual: AppStateStatus) =>
  atual === 'active' && anterior !== 'active';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const dataLocal = (data: Date) => {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

const ehHorario = (valor: unknown): valor is string => typeof valor === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);

const dataDaOcorrencia = (dia: Date, horario: string) => {
  const [hora, minuto] = horario.split(':').map(Number);
  const data = new Date(dia);
  data.setHours(hora, minuto, 0, 0);
  return data;
};

const horarioPartes = (horario: string) => horario.split(':').map(Number) as [number, number];
const horarioId = (horario: string) => horario.replace(':', '-');

const medicamentoIdDaOcorrencia = (ocorrenciaId?: string) => {
  if (!ocorrenciaId) return 'avulso';
  const medicamentoId = ocorrenciaId.replace(/-\d{4}-\d{2}-\d{2}-(?:[01]\d|2[0-3]):[0-5]\d$/, '');
  return medicamentoId === ocorrenciaId ? 'avulso' : medicamentoId;
};

const corpoMedicamento = (nome: string, mostrarDetalhes: boolean) => mostrarDetalhes
  ? `Está na hora de ${nome}. Siga a orientação do seu médico.`
  : 'Você tem um lembrete de medicamento.';

const corpoConsulta = (titulo: string, data: Date, finalidade: 'lembrete-24h' | 'lembrete-1h', mostrarDetalhes: boolean) => mostrarDetalhes
  ? `${titulo} está marcado para ${data.toLocaleString('pt-BR')}.`
  : finalidade === 'lembrete-24h'
    ? 'Você tem um compromisso de saúde amanhã.'
    : 'Você tem um compromisso de saúde em breve.';

const metadados = (
  tipo: MetadadosNotificacao['tipo'],
  entidadeId: string,
  finalidade: FinalidadeNotificacao,
  ocorrenciaId?: string,
  horario?: string,
): MetadadosNotificacao => ({ origem: ORIGEM, tipo, entidadeId, finalidade, ...(ocorrenciaId ? { ocorrenciaId } : {}), ...(horario ? { horario } : {}) });

const requestMedicamento = (
  medicamentoId: string,
  nome: string,
  identifier: string,
  trigger: Notifications.NotificationTriggerInput,
  finalidade: FinalidadeNotificacao = 'recorrente',
  ocorrenciaId?: string,
  mostrarDetalhes = false,
  horario?: string,
) => ({
  identifier,
  content: {
    title: mostrarDetalhes ? 'Remédio em Dia' : 'Lembrete de medicamento',
    body: corpoMedicamento(nome, mostrarDetalhes),
    categoryIdentifier: CATEGORIA_MEDICAMENTO,
    data: metadados('medicamento', medicamentoId, finalidade, ocorrenciaId, horario),
  },
  trigger: { ...trigger, channelId: CANAL_MEDICAMENTOS },
});

const requestConsulta = (
  consultaId: string,
  titulo: string,
  identifier: string,
  data: Date,
  finalidade: 'lembrete-24h' | 'lembrete-1h',
  mostrarDetalhes: boolean,
) => ({
  identifier,
  content: {
    title: mostrarDetalhes ? 'Remédio em Dia' : 'Lembrete de saúde',
    body: corpoConsulta(titulo, data, finalidade, mostrarDetalhes),
    data: metadados('consulta', consultaId, finalidade),
  },
  trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE as const, date: data },
});

const ehNotificacaoDoApp = (request: Notifications.NotificationRequest) => {
  const data = request.content.data;
  return typeof data === 'object' && data !== null && 'origem' in data && data.origem === ORIGEM;
};

const ehAdiamento = (request: Notifications.NotificationRequest) => {
  const data = request.content.data;
  return typeof data === 'object' && data !== null && 'finalidade' in data && data.finalidade === 'adiamento';
};

const agendar = async (request: Notifications.NotificationRequestInput) => {
  await Notifications.scheduleNotificationAsync(request);
};

const requestsMedicamentos = (estado: EstadoApp, agora: Date) => estado.medicamentos
  .filter((medicamento) => medicamento.situacao === 'ativo')
  .flatMap((medicamento) => {
    if (medicamento.frequencia.tipo === 'diaria') {
      return medicamento.horarios.map((horario) => {
        const [hour, minute] = horarioPartes(horario);
        return requestMedicamento(
          medicamento.id,
          medicamento.nome,
          `medicamento-${medicamento.id}-diaria-${horarioId(horario)}`,
          { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
          'recorrente',
          undefined,
          estado.mostrarDetalhesNotificacao,
          horario,
        );
      });
    }

    if (medicamento.frequencia.tipo === 'diasDaSemana') {
      return medicamento.frequencia.dias.flatMap((dia) => medicamento.horarios.map((horario) => {
        const [hour, minute] = horarioPartes(horario);
        return requestMedicamento(
          medicamento.id,
          medicamento.nome,
          `medicamento-${medicamento.id}-semana-${dia}-${horarioId(horario)}`,
          { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: dia + 1, hour, minute },
          'recorrente',
          undefined,
          estado.mostrarDetalhesNotificacao,
          horario,
        );
      }));
    }

    return Array.from({ length: JANELA_INTERVALO_DIAS }, (_, deslocamento) => {
      const dia = new Date(agora);
      dia.setHours(0, 0, 0, 0);
      dia.setDate(dia.getDate() + deslocamento);
      return ocorrenciasDoDia([medicamento], dia).map((ocorrencia) => ({ ocorrencia, data: dataDaOcorrencia(dia, ocorrencia.horario) }));
    })
      .flat()
      .filter(({ data }) => data.getTime() > agora.getTime())
      .map(({ ocorrencia, data }) => requestMedicamento(
        medicamento.id,
        medicamento.nome,
        `medicamento-${medicamento.id}-data-${dataLocal(data)}-${horarioId(ocorrencia.horario)}`,
        { type: Notifications.SchedulableTriggerInputTypes.DATE, date: data },
        'recorrente',
        ocorrencia.id,
        estado.mostrarDetalhesNotificacao,
        ocorrencia.horario,
      ));
  });

const requestsConsultas = (estado: EstadoApp, agora: Date) => estado.consultas
  .filter((consulta) => consulta.lembretes && !consulta.concluida)
  .flatMap((consulta) => {
    const marcadoPara = new Date(consulta.marcadoPara);
    if (!Number.isFinite(marcadoPara.getTime())) return [];
    const umDiaAntes = new Date(marcadoPara.getTime() - 24 * 60 * 60 * 1000);
    const umaHoraAntes = new Date(marcadoPara.getTime() - 60 * 60 * 1000);
    return [
      umDiaAntes.getTime() > agora.getTime() ? requestConsulta(consulta.id, consulta.titulo, `consulta-${consulta.id}-24h`, umDiaAntes, 'lembrete-24h', estado.mostrarDetalhesNotificacao) : null,
      umaHoraAntes.getTime() > agora.getTime() ? requestConsulta(consulta.id, consulta.titulo, `consulta-${consulta.id}-1h`, umaHoraAntes, 'lembrete-1h', estado.mostrarDetalhesNotificacao) : null,
    ].filter((request): request is NonNullable<typeof request> => request !== null);
  });

export async function configurarNotificacoesNativas() {
  try {
    await Notifications.setNotificationCategoryAsync(CATEGORIA_MEDICAMENTO, [
      { identifier: 'taken', buttonTitle: 'Tomei', options: { opensAppToForeground: true } },
      { identifier: 'snoozed', buttonTitle: 'Adiar 15 min', options: { opensAppToForeground: true } },
      { identifier: 'missed', buttonTitle: 'Pular', options: { opensAppToForeground: true, isDestructive: true } },
    ], { previewPlaceholder: 'Lembrete de medicamento' });
  } catch {
    // Categorias podem ficar indisponíveis em ambientes de teste ou sem módulo nativo.
  }
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(CANAL_MEDICAMENTOS, {
        name: 'Lembretes de medicamentos',
        importance: Notifications.AndroidImportance.HIGH,
      });
    } catch {
      // O estado será apresentado como indisponível quando a permissão for consultada.
    }
  }
}

export async function prepararNotificacoes() {
  try {
    await configurarNotificacoesNativas();
    const permissao = await Notifications.getPermissionsAsync();
    if (!notificacoesAutorizadas(permissao)) {
      const solicitada = await Notifications.requestPermissionsAsync();
      return notificacoesAutorizadas(solicitada);
    }
    return true;
  } catch {
    return false;
  }
}

export async function sincronizarNotificacoes(estado: EstadoApp, agora = new Date()) {
  const agendadas = await Notifications.getAllScheduledNotificationsAsync();
  const gerenciadas = agendadas
    .filter(ehNotificacaoDoApp)
    .filter((request) => !ehAdiamento(request));

  const requests = [...requestsMedicamentos(estado, agora), ...requestsConsultas(estado, agora)];
  const idsExistentes = new Set(gerenciadas.map(({ identifier }) => identifier));
  await Promise.all(requests
    .filter((request) => !idsExistentes.has(request.identifier ?? ''))
    .map(agendar));

  const idsDesejados = new Set(requests.map((request) => request.identifier));
  await Promise.all(gerenciadas
    .filter(({ identifier }) => !idsDesejados.has(identifier))
    .map(({ identifier }) => Notifications.cancelScheduledNotificationAsync(identifier)));
  return requests.length;
}

export async function sincronizarNotificacoesComFuso(estado: EstadoApp, agora = new Date()) {
  const fusoHorario = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const estadoAtualizado = estado.fusoHorarioObservado === fusoHorario
    ? estado
    : { ...estado, fusoHorarioObservado: fusoHorario };

  let permissao: Notifications.NotificationPermissionsStatus;
  try {
    permissao = await Notifications.getPermissionsAsync();
  } catch {
    return { estado: estadoAtualizado, fusoMudou: estadoAtualizado !== estado, quantidade: 0, status: 'indisponiveis' as const };
  }
  if (!notificacoesAutorizadas(permissao)) {
    return { estado: estadoAtualizado, fusoMudou: estadoAtualizado !== estado, quantidade: 0, status: 'desativadas' as const };
  }

  let quantidade = 0;
  try {
    quantidade = await sincronizarNotificacoes(estadoAtualizado, agora);
  } catch {
    return { estado: estadoAtualizado, fusoMudou: estadoAtualizado !== estado, quantidade: 0, status: 'falha' as const };
  }
  return {
    estado: estadoAtualizado,
    quantidade,
    fusoMudou: estadoAtualizado !== estado,
    status: 'ativas' as const,
  };
}

export async function agendarAdiantamento(nome: string, ocorrenciaId?: string, mostrarDetalhes = false) {
  const data = new Date(Date.now() + 15 * 60 * 1000);
  const identifier = `adiamento-${ocorrenciaId ?? 'avulso'}-${Date.now()}`;
  await agendar(requestMedicamento(
    medicamentoIdDaOcorrencia(ocorrenciaId),
    nome,
    identifier,
    { type: Notifications.SchedulableTriggerInputTypes.DATE, date: data },
    'adiamento',
    ocorrenciaId,
    mostrarDetalhes,
  ));
  return identifier;
}

export async function agendarLembrete(nome: string, data: Date, mostrarDetalhes = false) {
  if (data.getTime() <= Date.now()) return null;
  const identifier = `avulso-${Date.now()}`;
  await agendar(requestMedicamento(
    'avulso',
    nome,
    identifier,
    { type: Notifications.SchedulableTriggerInputTypes.DATE, date: data },
    'avulso',
    undefined,
    mostrarDetalhes,
  ));
  return identifier;
}

export async function adiarLembrete(nome: string, mostrarDetalhes = false) {
  return agendarAdiantamento(nome, undefined, mostrarDetalhes);
}

export function processarAcaoNotificacao(estado: EstadoApp, ocorrenciaId: string, acao: 'taken' | 'snoozed' | 'missed') {
  return aplicarAcaoNaOcorrencia(estado, ocorrenciaId, acao, 'notification');
}

export function interpretarRespostaNotificacao(
  resposta: RespostaNotificacao,
  agora = new Date(),
): { ocorrenciaId: string; acao: 'taken' | 'snoozed' | 'missed' } | null {
  if (!resposta) return null;
  const acao = resposta.actionIdentifier;
  if (acao !== 'taken' && acao !== 'snoozed' && acao !== 'missed') return null;
  const data = resposta.notification.request.content.data;
  if (typeof data !== 'object' || data === null || !('origem' in data) || data.origem !== ORIGEM) return null;
  if ('ocorrenciaId' in data) {
    return typeof data.ocorrenciaId === 'string' && data.ocorrenciaId
      ? { ocorrenciaId: data.ocorrenciaId, acao }
      : null;
  }
  if (!('tipo' in data) || data.tipo !== 'medicamento' || !('entidadeId' in data) || typeof data.entidadeId !== 'string' || !('horario' in data) || !ehHorario(data.horario)) return null;
  return { ocorrenciaId: `${data.entidadeId}-${dataLocal(agora)}-${data.horario}`, acao };
}

export type RespostaNotificacao = { actionIdentifier: string; notification: { request: { content: { data?: unknown } } } } | null | undefined;

export function processarRespostaNotificacao(estado: EstadoApp, resposta: RespostaNotificacao, agora = new Date()) {
  const acao = interpretarRespostaNotificacao(resposta, agora);
  return acao ? processarAcaoNotificacao(estado, acao.ocorrenciaId, acao.acao) : estado;
}
