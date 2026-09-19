export type AcaoWidget = 'taken' | 'snoozed';
export type AlvoWidget = { acao: AcaoWidget; ocorrenciaId: string };

export function interpretarAcaoWidget(url: string): AcaoWidget | null {
  const resultado = /^remedioemdia:\/\/widget\/(taken|snoozed)$/.exec(url);
  return resultado?.[1] === 'taken' || resultado?.[1] === 'snoozed' ? resultado[1] : null;
}

export function interpretarAlvoWidget(target: string): AlvoWidget | null {
  const resultado = /^(taken|snoozed):(.+)$/.exec(target);
  if (!resultado || (resultado[1] !== 'taken' && resultado[1] !== 'snoozed')) return null;
  try {
    const ocorrenciaId = decodeURIComponent(resultado[2]);
    return ocorrenciaId ? { acao: resultado[1], ocorrenciaId } : null;
  } catch {
    return null;
  }
}
