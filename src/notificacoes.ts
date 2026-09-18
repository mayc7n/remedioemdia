import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function prepararNotificacoes() {
  const permissao = await Notifications.getPermissionsAsync();
  if (!permissao.granted) {
    const solicitada = await Notifications.requestPermissionsAsync();
    return solicitada.granted;
  }
  return true;
}

export async function agendarLembrete(nome: string, data: Date) {
  if (data.getTime() <= Date.now()) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Remédio em Dia',
      body: `Está na hora de ${nome}. Siga a orientação do seu médico.`,
      data: { tipo: 'medicamento' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: data },
  });
}

export async function adiarLembrete(nome: string) {
  const data = new Date(Date.now() + 15 * 60 * 1000);
  return agendarLembrete(nome, data);
}
