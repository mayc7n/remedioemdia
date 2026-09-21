import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { WidgetSnapshot } from './estado';

export type AcaoLedger = { acao: 'taken' | 'snoozed'; ocorrenciaId: string; criadoEm: string };
const CHAVE_LEDGER = 'remedio-em-dia-widget-ledger-v1';
let fila: Promise<unknown> = Promise.resolve();

export const estaNoExpoGo = () => Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';

const serializar = <T,>(operacao: () => Promise<T>) => {
  const proxima = fila.then(operacao, operacao);
  fila = proxima.then(() => undefined, () => undefined);
  return proxima;
};

const nativa = () => {
  try {
    return (require('react-native').NativeModules as { RemedioWidgetLedger?: { gravar?: (payload: string) => Promise<boolean>; lerEAceitar?: () => Promise<AcaoLedger[]> } }).RemedioWidgetLedger;
  } catch {
    return undefined;
  }
};

const valida = (acao: Partial<AcaoLedger>): acao is AcaoLedger => (acao.acao === 'taken' || acao.acao === 'snoozed') && typeof acao.ocorrenciaId === 'string' && acao.ocorrenciaId.length > 0;

export async function gravarAcaoWidgetNoLedger(entrada: Partial<AcaoLedger>) {
  if (!valida(entrada)) return false;
  const acao = { ...entrada, criadoEm: entrada.criadoEm ?? new Date().toISOString() };
  const moduloNativo = nativa();
  if (moduloNativo?.gravar) return moduloNativo.gravar(JSON.stringify(acao));
  return serializar(async () => {
    const atual = JSON.parse((await AsyncStorage.getItem(CHAVE_LEDGER)) ?? '[]') as AcaoLedger[];
    if (atual.some((item) => item.ocorrenciaId === acao.ocorrenciaId)) return false;
    await AsyncStorage.setItem(CHAVE_LEDGER, JSON.stringify([...atual, acao]));
    return true;
  });
}

export async function lerEAceitarAcoesDoLedger() {
  const moduloNativo = nativa();
  if (moduloNativo?.lerEAceitar) return moduloNativo.lerEAceitar();
  return serializar(async () => {
    const bruto = JSON.parse((await AsyncStorage.getItem(CHAVE_LEDGER)) ?? '[]') as unknown;
    const acoes = Array.isArray(bruto) ? bruto.filter(valida).sort((a, b) => a.criadoEm.localeCompare(b.criadoEm)) : [];
    await AsyncStorage.removeItem(CHAVE_LEDGER);
    return acoes;
  });
}

export function atualizarTimelineWidget(snapshot: WidgetSnapshot, ocorrenciasFuturas: Array<{ date: Date; snapshot: WidgetSnapshot }>) {
  if (Platform.OS === 'web' || estaNoExpoGo()) return;
  try {
    const Widget = require('./RemedioWidget.ios').default as { updateTimeline: (entradas: Array<{ date: Date; props: WidgetSnapshot }>) => void };
    Widget.updateTimeline([{ date: new Date(snapshot.atualizadoEm), props: snapshot }, ...ocorrenciasFuturas.map((item) => ({ date: item.date, props: item.snapshot }))]);
  } catch {
    // WidgetKit só está disponível no development build iOS.
  }
}
