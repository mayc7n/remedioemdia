import * as SecureStore from 'expo-secure-store';
import { carregarEstado } from './armazenamento';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

const getItemAsync = SecureStore.getItemAsync as jest.MockedFunction<typeof SecureStore.getItemAsync>;

describe('armazenamento do estado', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normaliza estado legado quando carrega', async () => {
    getItemAsync.mockResolvedValue(JSON.stringify({
      concluiuBoasVindas: true,
      medicamentos: [{ id: 'm1', nome: 'A', horarios: ['08:00'], frequencia: { tipo: 'diaria' }, ativo: true, criadoEm: '2026-09-18T00:00:00.000Z' }],
      registros: [],
      consultas: [],
    }));

    const estado = await carregarEstado();

    expect(estado.versao).toBe(2);
    expect(estado.medicamentos[0].situacao).toBe('ativo');
  });

  it('retorna estado inicial quando o JSON está inválido', async () => {
    getItemAsync.mockResolvedValue('{invalido');

    const estado = await carregarEstado();

    expect(estado).toMatchObject({ versao: 2, medicamentos: [], registros: [], consultas: [] });
  });
});
