import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  EstadoApp,
  atualizarRegistro,
  criarRegistro,
  ocorrenciasDoDia,
  type Ocorrencia,
} from './dominio/agenda';

export type FinalidadeNotificacao = 'recorrente' | 'lembrete-24h' | 'lembrete-1h' | 'adiamento' | 'avulso';

export type MetadadosNotificacao = {
  origem: 'remedio-em-dia';
  tipo: 'medicamento' | 'consulta';
  entidadeId: string;
  ocorrenciaId?: string;
  finalidade: FinalidadeNotificacao;
};

const ORIGEM = 'remedio-em-dia';
const JANELA_INTERVALO_DIAS = 60;

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

const dataDaOcorrencia = (dia: Date, horario: string) => {
  const [hora, minuto] = horario.split(':').map(Number);
  const data = new Date(dia);
  data.setHours(hora, minuto, 0, 0);
  return data;
};

const horarioPartes = (horario: string) => horario.split(':').map(Number) as [number, number];
const horarioId = (horario: string) => horario.replace(':', '-');

const corpoMedicamento = (nome: string) => `Está na hora de ${nome}. Siga a orientação do seu médico.`;

const metadados = (
  tipo: MetadadosNotificacao['tipo'],
  entidadeId: string,
  finalidade: FinalidadeNotificacao,
  ocorrenciaId?: string,
): MetadadosNotificacao => ({ origem: ORIGEM, tipo, entidadeId, finalidade, ...(ocorrenciaId ? { ocorrenciaId } : {}) });

const requestMedicamento = (
  medicamentoId: string,
  nome: string,
  identifier: string,
  trigger: Notifications.NotificationTriggerInput,
  finalidade: FinalidadeNotificacao = 'recorrente',
  ocorrenciaId?: string,
) => ({
  identifier,
  content: {
    title: 'Remédio em Dia',
    body: corpoMedicamento(nome),
    data: metadados('medicamento', medicamentoId, finalidade, ocorrenciaId),
  },
  trigger,
});

const requestConsulta = (
  consultaId: string,
  titulo: string,
  identifier: string,
  data: Date,
  finalidade: 'lembrete-24h' | 'lembrete-1h',
) => ({
  identifier,
  content: {
    title: 'Remédio em Dia',
    body: `${titulo} está marcado para ${data.toLocaleString('pt-BR')}.`,
    data: metadados('consulta', consultaId, finalidade),
  },
  trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE as const, date: data },
});

const ehNotificacaoDoApp = (request: Notifications.NotificationRequest) => {
  const data = request.content.data;
  return typeof data === 'object' && data !== null && 'origem' in data && data.origem === ORIGEM;
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
      umDiaAntes.getTime() > agora.getTime() ? requestConsulta(consulta.id, consulta.titulo, `consulta-${consulta.id}-24h`, umDiaAntes, 'lembrete-24h') : null,
      umaHoraAntes.getTime() > agora.getTime() ? requestConsulta(consulta.id, consulta.titulo, `consulta-${consulta.id}-1h`, umaHoraAntes, 'lembrete-1h') : null,
    ].filter((request): request is NonNullable<typeof request> => request !== null);
  });

export async function prepararNotificacoes() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('medicamentos', {
      name: 'Lembretes de medicamentos',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const permissao = await Notifications.getPermissionsAsync();
  if (!permissao.granted) {
    const solicitada = await Notifications.requestPermissionsAsync();
    return solicitada.granted;
  }
  return true;
}

export async function sincronizarNotificacoes(estado: EstadoApp, agora = new Date()) {
  const agendadas = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(agendadas.filter(ehNotificacaoDoApp).map(({ identifier }) => Notifications.cancelScheduledNotificationAsync(identifier)));

  const requests = [...requestsMedicamentos(estado, agora), ...requestsConsultas(estado, agora)];
  await Promise.all(requests.map(agendar));
  return requests.length;
}

export async function sincronizarNotificacoesComFuso(estado: EstadoApp, agora = new Date()) {
  const fusoHorario = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const estadoAtualizado = estado.fusoHorarioObservado === fusoHorario
    ? estado
    : { ...estado, fusoHorarioObservado: fusoHorario };
  const quantidade = await sincronizarNotificacoes(estadoAtualizado, agora);
  return {
    estado: estadoAtualizado,
    quantidade,
    fusoMudou: estadoAtualizado !== estado,
  };
}

export async function agendarAdiantamento(nome: string, ocorrenciaId?: string) {
  const data = new Date(Date.now() + 15 * 60 * 1000);
  const identifier = `adiamento-${ocorrenciaId ?? 'avulso'}-${Date.now()}`;
  await agendar(requestMedicamento(
    ocorrenciaId?.split('-')[0] ?? 'avulso',
    nome,
    identifier,
    { type: Notifications.SchedulableTriggerInputTypes.DATE, date: data },
    'adiamento',
    ocorrenciaId,
  ));
  return identifier;
}

export async function agendarLembrete(nome: string, data: Date) {
  if (data.getTime() <= Date.now()) return null;
  const identifier = `avulso-${Date.now()}`;
  await agendar(requestMedicamento(
    'avulso',
    nome,
    identifier,
    { type: Notifications.SchedulableTriggerInputTypes.DATE, date: data },
    'avulso',
  ));
  return identifier;
}

export async function adiarLembrete(nome: string) {
  return agendarAdiantamento(nome);
}

const encontrarOcorrencia = (estado: EstadoApp, ocorrenciaId: string): { medicamentoId: string; ocorrencia: Ocorrencia } | null => {
  for (const medicamento of estado.medicamentos) {
    for (let deslocamento = -1; deslocamento <= 370; deslocamento += 1) {
      const dia = new Date();
      dia.setHours(0, 0, 0, 0);
      dia.setDate(dia.getDate() + deslocamento);
      const ocorrencia = ocorrenciasDoDia([medicamento], dia).find((item) => item.id === ocorrenciaId);
      if (ocorrencia) return { medicamentoId: medicamento.id, ocorrencia };
    }
  }
  return null;
};

export function processarAcaoNotificacao(estado: EstadoApp, ocorrenciaId: string, acao: 'taken' | 'snoozed' | 'missed') {
  const encontrada = encontrarOcorrencia(estado, ocorrenciaId);
  if (!encontrada) return estado;
  const medicamento = estado.medicamentos.find((item) => item.id === encontrada.medicamentoId);
  if (!medicamento) return estado;
  const atual = estado.registros.find((registro) => registro.id === ocorrenciaId) ?? criarRegistro(medicamento, encontrada.ocorrencia.previstoPara.slice(0, 10), encontrada.ocorrencia.horario);
  const atualizado = atualizarRegistro(atual, acao, 'notification');
  if (atualizado === atual) return estado;
  const registros = estado.registros.some((registro) => registro.id === atual.id)
    ? estado.registros.map((registro) => registro.id === atual.id ? atualizado : registro)
    : [...estado.registros, atualizado];
  return { ...estado, registros };
}
