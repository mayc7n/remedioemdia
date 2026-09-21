import configuracao from '../app.json';

describe('configuração Android de notificações', () => {
  it('declara permissão para alarmes exatos no Expo', () => {
    expect(configuracao.expo.android.permissions).toContain('android.permission.SCHEDULE_EXACT_ALARM');
  });
});
