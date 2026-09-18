export type AcaoWidget = 'taken' | 'snoozed';

export function interpretarAcaoWidget(url: string): AcaoWidget | null {
  const resultado = /^remedioemdia:\/\/widget\/(taken|snoozed)$/.exec(url);
  return resultado?.[1] === 'taken' || resultado?.[1] === 'snoozed' ? resultado[1] : null;
}
