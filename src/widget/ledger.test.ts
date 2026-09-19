import AsyncStorage from '@react-native-async-storage/async-storage';
import { gravarAcaoWidgetNoLedger, lerEAceitarAcoesDoLedger } from './ledger';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const getItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
const setItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;
const removeItem = AsyncStorage.removeItem as jest.MockedFunction<typeof AsyncStorage.removeItem>;

beforeEach(() => {
  jest.clearAllMocks();
  getItem.mockResolvedValue(null);
  setItem.mockResolvedValue();
  removeItem.mockResolvedValue();
});

describe('ledger de ações do widget', () => {
  it('ignora ação inválida e exige ocorrência', async () => {
    await expect(gravarAcaoWidgetNoLedger({ acao: 'taken', ocorrenciaId: '' })).resolves.toBe(false);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('não duplica a mesma ocorrência e aceita ações em ordem cronológica', async () => {
    let armazenamento: string | null = null;
    getItem.mockImplementation(async () => armazenamento);
    setItem.mockImplementation(async (_chave, valor) => { armazenamento = valor; });
    await gravarAcaoWidgetNoLedger({ acao: 'snoozed', ocorrenciaId: 'm1-2026-09-19-08:00', criadoEm: '2026-09-19T08:00:00.000Z' });
    await gravarAcaoWidgetNoLedger({ acao: 'taken', ocorrenciaId: 'm1-2026-09-19-08:00', criadoEm: '2026-09-19T08:01:00.000Z' });
    await gravarAcaoWidgetNoLedger({ acao: 'taken', ocorrenciaId: 'm1-2026-09-19-20:00', criadoEm: '2026-09-19T07:00:00.000Z' });

    const acoes = await lerEAceitarAcoesDoLedger();

    expect(acoes.map((acao) => acao.ocorrenciaId)).toEqual(['m1-2026-09-19-20:00', 'm1-2026-09-19-08:00']);
    expect(removeItem).toHaveBeenCalledTimes(1);
  });

  it('remove ações aceitas para não reaplicar depois', async () => {
    getItem.mockResolvedValue(JSON.stringify([{ acao: 'taken', ocorrenciaId: 'm1-1', criadoEm: '2026-09-19T08:00:00.000Z' }]));

    await expect(lerEAceitarAcoesDoLedger()).resolves.toEqual([{ acao: 'taken', ocorrenciaId: 'm1-1', criadoEm: '2026-09-19T08:00:00.000Z' }]);
    expect(removeItem).toHaveBeenCalledWith('remedio-em-dia-widget-ledger-v1');
  });
});
