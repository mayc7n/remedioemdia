import * as SecureStore from 'expo-secure-store';
import { estadoInicial } from '../dominio/agenda';
import { carregarEstado, carregarEstadoComStatus, mensagemStatusArmazenamento, salvarEstado } from './armazenamento';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

const getItemAsync = SecureStore.getItemAsync as jest.MockedFunction<typeof SecureStore.getItemAsync>;
const setItemAsync = SecureStore.setItemAsync as jest.MockedFunction<typeof SecureStore.setItemAsync>;

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

    expect(estado.versao).toBe(3);
    expect(estado.medicamentos[0].situacao).toBe('ativo');
  });

  it('persiste a migração de um estado v2 como versão 3', async () => {
    getItemAsync.mockResolvedValue(JSON.stringify({
      versao: 2,
      concluiuBoasVindas: true,
      medicamentos: [],
      registros: [],
      consultas: [],
    }));

    await carregarEstado();

    expect(setItemAsync).toHaveBeenCalledWith(
      'remedio-em-dia-estado-v1',
      expect.stringContaining('"versao":3'),
    );
  });

  it('mantém os dados normalizados quando não consegue persistir a migração', async () => {
    getItemAsync.mockResolvedValue(JSON.stringify({
      versao: 2,
      concluiuBoasVindas: true,
      medicamentos: [{ id: 'm1', nome: 'A', horarios: ['08:00'], frequencia: { tipo: 'diaria' }, ativo: true, criadoEm: '2026-09-18T00:00:00.000Z' }],
      registros: [],
      consultas: [],
    }));
    setItemAsync.mockRejectedValue(new Error('armazenamento indisponível'));

    const estado = await carregarEstado();

    expect(estado).toMatchObject({ versao: 3, modoCuidador: 'naoInformado' });
    expect(estado.medicamentos).toHaveLength(1);
  });

  it('retorna estado inicial quando o JSON está inválido', async () => {
    getItemAsync.mockResolvedValue('{invalido');

    const estado = await carregarEstado();

    expect(estado).toMatchObject({ versao: 3, modoCuidador: 'naoInformado', medicamentos: [], registros: [], consultas: [] });
  });

  it('marca leitura indisponível e não grava o estado inicial de fallback', async () => {
    getItemAsync.mockRejectedValue(new Error('armazenamento indisponível'));

    const resultado = await carregarEstadoComStatus();

    expect(resultado.status).toBe('indisponivel');
    expect(resultado.estado).toEqual(expect.objectContaining({ medicamentos: [], registros: [], consultas: [] }));
    expect(setItemAsync).not.toHaveBeenCalled();
  });

  it('retorna falha de gravação sem lançar exceção', async () => {
    setItemAsync.mockRejectedValue(new Error('armazenamento indisponível'));

    await expect(salvarEstado(estadoInicial)).resolves.toBe(false);
  });

  it('explica que os dados locais devem ser preservados quando o armazenamento falha', () => {
    expect(mensagemStatusArmazenamento('indisponivel')).toContain('dados locais');
  });
});
