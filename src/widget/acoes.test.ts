import { interpretarAcaoWidget } from './acoes';

describe('ações rápidas do widget', () => {
  it('aceita marcar como tomado e adiar', () => {
    expect(interpretarAcaoWidget('remedioemdia://widget/taken')).toBe('taken');
    expect(interpretarAcaoWidget('remedioemdia://widget/snoozed')).toBe('snoozed');
  });

  it('ignora links externos ou ações desconhecidas', () => {
    expect(interpretarAcaoWidget('https://example.com')).toBeNull();
    expect(interpretarAcaoWidget('remedioemdia://widget/missed')).toBeNull();
  });
});
