import { carregarEstado, salvarEstado } from '../dados/armazenamento';
import { aplicarAcaoNaOcorrencia, EstadoApp, ocorrenciasDoDia } from '../dominio/agenda';

export type EstadoWidget = 'pendente' | 'taken' | 'snoozed' | 'missed' | 'nenhum';

export type WidgetSnapshot = {
  nome: string;
  horario: string;
  estado: EstadoWidget;
  ocorrenciaId?: string;
  atualizadoEm: string;
};

const proximaOcorrenciaPendente = (estado: EstadoApp, agora: Date) => {
  for (let deslocamento = 0; deslocamento <= 370; deslocamento += 1) {
    const dia = new Date(agora);
    dia.setHours(0, 0, 0, 0);
    dia.setDate(dia.getDate() + deslocamento);
    const ocorrencia = ocorrenciasDoDia(estado.medicamentos, dia).find((item) => {
      const registro = estado.registros.find((atual) => atual.id === item.id);
      const data = new Date(item.previstoPara);
      return data.getTime() >= agora.getTime() && (!registro || registro.estado === 'pendente');
    });
    if (ocorrencia) return ocorrencia;
  }
  return null;
};

export function criarSnapshotWidget(estado: EstadoApp, agora = new Date()): WidgetSnapshot {
  const ocorrencia = proximaOcorrenciaPendente(estado, agora);
  return ocorrencia
    ? { nome: ocorrencia.medicamentoNome, horario: ocorrencia.horario, estado: 'pendente', ocorrenciaId: ocorrencia.id, atualizadoEm: agora.toISOString() }
    : { nome: 'Nenhum lembrete', horario: '--:--', estado: 'nenhum', atualizadoEm: agora.toISOString() };
}

export async function processarAcaoWidgetPersistida(acao: 'taken' | 'snoozed', ocorrenciaId: string, agora = new Date()) {
  const estado = await carregarEstado();
  const atualizado = aplicarAcaoNaOcorrencia(estado, ocorrenciaId, acao, 'widget');
  if (atualizado !== estado) await salvarEstado(atualizado);
  return { estado: atualizado, snapshot: criarSnapshotWidget(atualizado, agora) };
}

export async function atualizarWidgetAndroid(estado: EstadoApp, agora = new Date()) {
  try {
    const { requestWidgetUpdate } = require('react-native-android-widget') as typeof import('react-native-android-widget');
    const { renderizarWidgetAndroid } = require('./RemedioWidget.android') as typeof import('./RemedioWidget.android');
    await requestWidgetUpdate({
      widgetName: 'RemedioEmDia',
      renderWidget: () => renderizarWidgetAndroid(criarSnapshotWidget(estado, agora)),
    });
  } catch {
    // Atualizações do widget só existem em um development build Android.
  }
}
