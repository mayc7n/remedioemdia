import * as SecureStore from 'expo-secure-store';
import { EstadoApp, estadoInicial, normalizarEstado } from '../dominio/agenda';

const CHAVE = 'remedio-em-dia-estado-v1';

export async function carregarEstado(): Promise<EstadoApp> {
  try {
    const salvo = await SecureStore.getItemAsync(CHAVE);
    if (!salvo) return estadoInicial;
    const bruto: unknown = JSON.parse(salvo);
    const normalizado = normalizarEstado(bruto);
    if (!bruto || typeof bruto !== 'object' || (bruto as { versao?: unknown }).versao !== 2) {
      await salvarEstado(normalizado);
    }
    return normalizado;
  } catch {
    return estadoInicial;
  }
}

export async function salvarEstado(estado: EstadoApp) {
  await SecureStore.setItemAsync(CHAVE, JSON.stringify(estado));
}
