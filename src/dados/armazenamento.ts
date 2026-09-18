import * as SecureStore from 'expo-secure-store';
import { EstadoApp, estadoInicial } from '../dominio/agenda';

const CHAVE = 'remedio-em-dia-estado-v1';

export async function carregarEstado(): Promise<EstadoApp> {
  try {
    const salvo = await SecureStore.getItemAsync(CHAVE);
    return salvo ? { ...estadoInicial, ...JSON.parse(salvo) } : estadoInicial;
  } catch {
    return estadoInicial;
  }
}

export async function salvarEstado(estado: EstadoApp) {
  await SecureStore.setItemAsync(CHAVE, JSON.stringify(estado));
}
