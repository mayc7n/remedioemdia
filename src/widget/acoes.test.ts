import { interpretarAcaoWidget, interpretarAlvoWidget } from './acoes';

describe('ações rápidas do widget', () => {
  it('aceita marcar como tomado e adiar', () => {
    expect(interpretarAcaoWidget('remedioemdia://widget/taken')).toBe('taken');
    expect(interpretarAcaoWidget('remedioemdia://widget/snoozed')).toBe('snoozed');
  });

  it('ignora links externos ou ações desconhecidas', () => {
    expect(interpretarAcaoWidget('https://example.com')).toBeNull();
    expect(interpretarAcaoWidget('remedioemdia://widget/missed')).toBeNull();
  });

  it('mantém a ocorrência exata nas ações do widget iOS', () => {
    expect(interpretarAlvoWidget('taken:m1-2026-09-19-08%3A00')).toEqual({ acao: 'taken', ocorrenciaId: 'm1-2026-09-19-08:00' });
    expect(interpretarAlvoWidget('snoozed:m1-2026-09-19-20:00')).toEqual({ acao: 'snoozed', ocorrenciaId: 'm1-2026-09-19-20:00' });
    expect(interpretarAlvoWidget('taken')).toBeNull();
  });
});
