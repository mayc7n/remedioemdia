import * as SecureStore from 'expo-secure-store';
import { EstadoApp, estadoInicial, normalizarEstado } from '../dominio/agenda';

const CHAVE = 'remedio-em-dia-estado-v1';

export type StatusArmazenamento = 'disponivel' | 'indisponivel';
export type ResultadoCarregamentoEstado = { estado: EstadoApp; status: StatusArmazenamento };

export const mensagemStatusArmazenamento = (status: StatusArmazenamento) => status === 'indisponivel'
  ? 'Não foi possível acessar os dados locais. O cadastro em memória não será sobrescrito; tente novamente antes de fechar o app.'
  : null;

export async function carregarEstadoComStatus(): Promise<ResultadoCarregamentoEstado> {
  try {
    const salvo = await SecureStore.getItemAsync(CHAVE);
    if (!salvo) return { estado: estadoInicial, status: 'disponivel' };
    const bruto: unknown = JSON.parse(salvo);
    const normalizado = normalizarEstado(bruto);
    if (!bruto || typeof bruto !== 'object' || (bruto as { versao?: unknown }).versao !== 3) {
      const migrado = await salvarEstado(normalizado);
      return { estado: normalizado, status: migrado ? 'disponivel' : 'indisponivel' };
    }
    return { estado: normalizado, status: 'disponivel' };
  } catch {
    return { estado: estadoInicial, status: 'indisponivel' };
  }
}

export async function carregarEstado(): Promise<EstadoApp> {
  return (await carregarEstadoComStatus()).estado;
}

export async function salvarEstado(estado: EstadoApp): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(CHAVE, JSON.stringify(estado));
    return true;
  } catch {
    return false;
  }
}
