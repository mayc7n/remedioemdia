# Remédio em Dia — melhorias de medicamentos, lembretes e widgets

## Objetivo

Evoluir o MVP offline-first do Remédio em Dia para permitir o ciclo completo de um medicamento — cadastrar, consultar, editar, pausar, retomar e excluir — sem perder o histórico, com lembretes locais recorrentes, consultas/exames, widgets nativos atualizados e um fluxo de cuidador explicitamente consentido.

O app continua sendo um auxiliar de memória. Ele não prescreve, interpreta exames, altera doses ou substitui orientação médica.

## Contexto confirmado

- O projeto usa Expo SDK 57, React Native 0.86.3, TypeScript, `expo-notifications`, `expo-secure-store`, `expo-widgets` e `react-native-android-widget`.
- O estado atual está concentrado em `App.tsx`; a persistência usa uma chave única no SecureStore.
- `Medicamento.frequencia` já possui os formatos `diaria`, `diasDaSemana` e `intervalo`, mas a interface só cadastra um horário e não expõe os dois últimos formatos.
- A implementação atual agenda somente a próxima ocorrência como notificação avulsa.
- O widget Android renderiza texto fixo e abre uma URI; o widget iOS recebe snapshot enquanto o processo do app está ativo.
- O histórico já guarda `medicamentoNome`, o que permite preservar o nome exibido mesmo quando o cadastro é editado ou excluído.
- O teste físico de Android e iOS não está disponível como evidência no repositório e continuará sendo uma etapa explícita de validação.

## Limites de segurança e privacidade

- Dados de medicamentos, registros, consultas e cuidador permanecem locais; esta entrega não adiciona backend, login ou sincronização em nuvem.
- O cuidador é opt-in, revogável e não recebe mensagens externas nesta versão. A UI deve dizer claramente “Nenhum aviso externo foi enviado”.
- Nenhum compartilhamento é ativado por preencher campos: a ativação exige uma confirmação explícita.
- Exclusão de medicamento remove o cadastro da agenda, cancela seus lembretes e preserva todos os `RegistroMedicamento`.
- Alterar nome, horários ou frequência não reescreve registros antigos.
- O campo de observação é texto fornecido pelo médico; não será interpretado nem convertido em dose ou recomendação.
- A tela de medicamento continua exibindo a orientação para seguir o médico.

## Abordagem escolhida

Será feita uma evolução incremental sobre o app nativo existente, preservando a persistência local, os alvos Android/iOS e as bibliotecas já instaladas. O trabalho será dividido em fatias verticais: modelo/migração, medicamentos, reconciliador de notificações, widgets, cuidador/acessibilidade e validação física.

Não haverá reescrita para Expo Router ou banco local nesta entrega. A navegação atual por abas será mantida enquanto `App.tsx` é dividido em telas, componentes e serviços com contratos claros. Uma mudança de armazenamento só será introduzida se for necessária para tornar o estado compartilhado do widget comprovadamente consistente.

## Modelo de dados e migração

O estado persistido receberá uma versão explícita. A leitura aceitará o formato atual e produzirá o novo formato em memória antes de salvar; dados desconhecidos serão preservados somente quando fizerem parte de estruturas conhecidas.

```ts
type Frequencia =
  | { tipo: 'diaria' }
  | { tipo: 'diasDaSemana'; dias: number[] } // 0 domingo ... 6 sábado
  | { tipo: 'intervalo'; aCadaDias: number };

type Medicamento = {
  id: string;
  nome: string;
  horarios: string[]; // HH:mm, sem duplicidades
  frequencia: Frequencia;
  observacao?: string;
  situacao: 'ativo' | 'pausado' | 'excluido';
  criadoEm: string;
  atualizadoEm: string;
};

type RegistroMedicamento = {
  id: string;
  medicamentoId: string;
  medicamentoNome: string;
  horario: string;
  previstoPara: string;
  estado: 'pendente' | 'taken' | 'snoozed' | 'missed';
  registradoEm?: string;
  origem: 'app' | 'notification' | 'widget';
};

type EstadoApp = {
  versao: 2;
  concluiuBoasVindas: boolean;
  medicamentos: Medicamento[];
  registros: RegistroMedicamento[];
  consultas: Consulta[];
  cuidador?: Cuidador;
  fusoHorarioObservado?: string;
};
```

Na migração, `ativo: true` vira `situacao: 'ativo'`, `ativo: false` vira `situacao: 'pausado'`, `observacao` e `atualizadoEm` recebem valores seguros e `versao` vira `2`. Registros existentes não serão recalculados.

Medicamentos excluídos podem permanecer na coleção interna com `situacao: 'excluido'`, mas nunca aparecem na agenda nem no widget. Isso mantém a identidade disponível para auditoria local e permite que o reconciliador cancele lembretes antigos sem tocar em registros históricos.

## Fluxos de medicamentos

### Lista e detalhe

Cada item da lista de medicamentos abre uma tela de detalhe, sem modal de altura limitada. O detalhe mostra nome, observação, horários, frequência, situação, próximos lembretes e registros recentes.

As ações são textuais e acessíveis:

- `Editar medicamento`: abre o mesmo formulário com dados atuais.
- `Pausar lembretes` ou `Retomar lembretes`: altera apenas a situação e reconcilia notificações/widget.
- `Excluir medicamento`: exige confirmação explícita, informa que o histórico será preservado e marca o cadastro como excluído.

### Formulário

O formulário aceitará:

- nome obrigatório;
- zero ou mais observações, com limite de texto definido pela UI;
- um ou mais horários `HH:mm`, ordenados e sem repetição;
- todos os dias;
- dias específicos da semana, com pelo menos um dia selecionado;
- intervalo de dias `aCadaDias >= 1`, ancorado em `criadoEm`;
- observação opcional fornecida pelo médico.

O formulário exibirá validações próximas ao campo, manterá áreas de toque de no mínimo 48 dp/pt e não dependerá apenas de cor para indicar seleção.

## Motor de ocorrências e registros

O domínio terá funções puras para:

- calcular as ocorrências de uma data considerando situação, horários e frequência;
- encontrar a próxima ocorrência futura;
- criar um registro pendente com ID determinístico `medicamentoId-data-horario`;
- aplicar `taken`, `snoozed` ou `missed` de forma idempotente;
- atualizar o nome do próximo cartão sem alterar o nome guardado em registros anteriores.

O registro será a unidade de concorrência. Uma ação repetida para o mesmo ID não cria outro registro nem substitui um estado terminal já gravado.

## Notificações locais recorrentes

Será criado um reconciliador único, chamado depois de qualquer mutação de medicamento/consulta, na abertura do app, no retorno ao primeiro plano e quando o fuso horário observado mudar.

Cada notificação será identificada por metadados próprios do app:

```ts
type MetadadosNotificacao = {
  origem: 'remedio-em-dia';
  tipo: 'medicamento' | 'consulta';
  entidadeId: string;
  ocorrenciaId?: string;
  finalidade: 'recorrente' | 'lembrete-24h' | 'lembrete-1h' | 'adiamento';
};
```

O reconciliador localizará e cancelará somente notificações com `origem: 'remedio-em-dia'`; não usará cancelamento global. Em seguida, agendará o conjunto correto e persistirá os identificadores retornados pela biblioteca para cancelamento preciso.

Regras:

- frequência diária: gatilho diário por horário;
- dias da semana: um gatilho semanal por combinação de dia e horário;
- intervalo de dias: datas concretas em uma janela móvel de 60 dias, recalculadas ao abrir o app, voltar ao primeiro plano ou mudar o fuso;
- consultas/exames: uma notificação em `marcadoPara - 24h` e outra em `marcadoPara - 1h`, ignorando horários já passados;
- “Adiar 15 min”: notificação única com finalidade `adiamento`, sem alterar a regra recorrente;
- medicamento pausado/excluído: nenhuma notificação recorrente;
- consulta concluída: nenhum lembrete futuro.

O fuso usado será o fuso atual do aparelho. A mudança será detectada comparando `Intl.DateTimeFormat().resolvedOptions().timeZone` com `fusoHorarioObservado`; ao detectar diferença, o estado será atualizado e a reconciliação executada.

## Widgets

### Contrato comum

O domínio produzirá um snapshot mínimo:

```ts
type WidgetSnapshot = {
  nome: string;
  horario: string;
  estado: 'pendente' | 'taken' | 'snoozed' | 'missed' | 'nenhum';
  ocorrenciaId?: string;
  atualizadoEm: string;
};
```

O snapshot será atualizado após hidratação, qualquer marcação, alteração de agenda, pausa/retomada/exclusão e reconciliação de fuso.

### Android

O handler headless do `react-native-android-widget` lerá o estado persistido, calculará o próximo item real e renderizará nome, horário e estado. As áreas “Tomei” e “Adiar 15 min” usarão ações customizadas com o `ocorrenciaId`, não URI que apenas abre o app.

O mesmo comando idempotente usado pela tela será executado pelo handler headless, persistindo o histórico e redesenhando o widget. A atualização periódica continuará sendo solicitada pelo App Widget, e a atualização imediata será solicitada depois de alterações feitas pelo app.

### iOS

O WidgetKit receberá timeline com o próximo item e datas futuras suficientes para trocar o conteúdo sem o processo do app. Os botões interativos retornarão props novas para atualizar imediatamente a apresentação.

Como `expo-widgets` executa o componente em runtime isolado, a sincronização do histórico fechado usará um pequeno ledger no App Group: a extensão grava a ação (`ocorrenciaId`, ação, data) e o app reconcilia esse ledger na abertura/retorno ao primeiro plano antes de publicar novo snapshot. O ledger não conterá nome completo, observação ou qualquer dado além do necessário à ação.

Se o development build revelar que o alvo gerado não expõe a ponte necessária ao ledger, a alternativa aprovada é um módulo Expo nativo mínimo para leitura/escrita do App Group; não será aceito declarar a sincronização concluída apenas porque o widget mudou visualmente.

## Cuidador

O fluxo exibirá o estado atual da autorização:

- nenhum cuidador autorizado;
- autorização registrada neste aparelho, sem aviso externo enviado;
- autorização revogada.

O usuário poderá selecionar individualmente avisos de medicamento esquecido, medicamento adiado e consulta próxima. Salvar ou alterar o cuidador sempre abrirá uma confirmação explícita; revogar também exigirá confirmação e desativará todos os avisos selecionados. Como não existe transporte externo nesta entrega, nenhuma ação enviará SMS, e-mail, WhatsApp ou push remoto.

## Refatoração e acessibilidade

`App.tsx` será reduzido a composição e estado de alto nível. A separação mínima será:

- `src/dominio/`: modelos, migração, frequência e comandos;
- `src/dados/`: hidratação, persistência e repositório;
- `src/notificacoes/`: autorização, reconciliador e ações;
- `src/widget/`: snapshot, adaptadores Android/iOS e ações;
- `src/componentes/`: botões, campos, cartões, modais e mensagens;
- `src/telas/`: início, medicamentos, detalhe, histórico, mais, cuidador e emergência.

Critérios de UI:

- todos os textos respeitam escala de fonte do sistema;
- contraste de texto e estados atende leitura em tema claro;
- foco e ordem de leitura são coerentes em VoiceOver e TalkBack;
- botões e seletores possuem pelo menos 48 dp/pt de área de toque;
- estados selecionados têm texto, não apenas cor;
- safe area é aplicada à tela e à navegação inferior;
- nenhuma ação fica visualmente disponível sem comportamento implementado;
- animações novas respeitam a preferência de redução de movimento.

## Testes

### Automatizados

Serão adicionados testes para:

- migração do estado v1 para v2 e preservação de registros;
- horários múltiplos, dias da semana, intervalo e ordenação;
- pausa, retomada, exclusão lógica e histórico preservado;
- reconciliação idempotente sem duplicidade;
- lembretes de consulta/exame em 24h e 1h;
- mudança de fuso e datas passadas;
- ações de notificação e widget usando o mesmo comando idempotente;
- cuidador, revogação, seleção de avisos e ausência de envio externo;
- renderização acessível de detalhe, formulário e estados vazios.

### Aparelhos reais

O aceite final exigirá evidência separada, sem substituir por export:

- Android físico: permissão, recorrência, edição, pausa, tela bloqueada, reboot, widget com medicamento real, ações fechadas, TalkBack e escala de fonte;
- iPhone físico: permissões, WidgetKit/timeline, ações do widget, App Group ledger, Dynamic Type, safe area, VoiceOver e mudança de fuso;
- ambos: sem duplicidade após reabrir, alterar configuração ou mudar data.

O ambiente de desenvolvimento pode executar testes Jest e exports, mas não poderá declarar QA físico concluído sem registros dos aparelhos e passos acima.

## Critérios de aceitação

1. Um medicamento existente pode ser aberto em detalhe, editado, pausado, retomado e excluído sem apagar seus registros.
2. Um medicamento pode ter vários horários, dias específicos, intervalo de dias e observação opcional.
3. Todos os horários ativos geram lembretes recorrentes sem duplicidade.
4. Consultas e exames geram lembretes de 24h e 1h quando aplicável.
5. Alterações de agenda, data e fuso cancelam o conjunto antigo e criam somente o conjunto atual.
6. Android e iOS exibem o próximo medicamento real, horário e estado; as ações rápidas atualizam o histórico conforme o contrato de cada plataforma.
7. Cuidador só fica autorizado após confirmação, permite selecionar avisos e pode ser revogado.
8. A interface informa claramente quando nenhum aviso externo foi enviado.
9. App, notificações e widgets preservam VoiceOver/TalkBack, fonte ampliada, contraste, foco, safe area e áreas de toque.
10. Testes automatizados passam; QA físico permanece explicitamente reportado como aprovado ou pendente por plataforma.

## Fora do escopo

- servidor, login, conta compartilhada ou portal do cuidador;
- envio externo de SMS, e-mail, WhatsApp ou push remoto;
- interpretação de observação médica, receita, dose ou exame;
- HealthKit, Health Connect, farmácias e integrações clínicas;
- redesign visual completo independente dos fluxos desta entrega;
- suporte a recorrências de calendário mais complexas que diária, dias da semana e intervalo de dias.

## Referências técnicas

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- [Expo Notifications SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/)
- [Expo Widgets SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/widgets/)
