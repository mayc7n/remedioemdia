import React from 'react';
import { registerWidgetTaskHandler, type WidgetTaskHandlerProps } from 'react-native-android-widget';
import { carregarEstado } from './src/dados/armazenamento';
import { criarSnapshotWidget, processarAcaoWidgetPersistida } from './src/widget/estado';
import { renderizarWidgetAndroid } from './src/widget/RemedioWidget.android';

export async function widgetTaskHandler({ renderWidget, widgetAction, clickActionData }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_CLICK') {
    const acao = clickActionData?.acao;
    const ocorrenciaId = clickActionData?.ocorrenciaId;
    if ((acao === 'taken' || acao === 'snoozed') && typeof ocorrenciaId === 'string' && ocorrenciaId) {
      const resultado = await processarAcaoWidgetPersistida(acao, ocorrenciaId);
      renderWidget(renderizarWidgetAndroid(resultado.snapshot));
      return;
    }
  }

  if (widgetAction === 'WIDGET_ADDED' || widgetAction === 'WIDGET_UPDATE' || widgetAction === 'WIDGET_RESIZED' || widgetAction === 'WIDGET_CLICK') {
    const estado = await carregarEstado();
    renderWidget(renderizarWidgetAndroid(criarSnapshotWidget(estado)));
  }
}

export { registerWidgetTaskHandler };
