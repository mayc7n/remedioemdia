# Remédio em Dia — melhorias Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar medicamentos editáveis e pausáveis, notificações locais recorrentes sem duplicidade, widgets com o próximo medicamento real, cuidador opt-in e uma estrutura de telas acessível, mantendo o histórico e o funcionamento offline.

**Architecture:** Evoluir o domínio atual em TypeScript com migração explícita do estado v1 para v2. Um reconciliador único calcula ocorrências e sincroniza somente notificações pertencentes ao app; telas, notificações e widgets chamam os mesmos comandos idempotentes de registro. Android usa o handler headless já instalado; iOS usa timeline WidgetKit e um ledger mínimo no App Group para ações feitas com o app fechado.

**Tech Stack:** Expo SDK 57, React Native 0.86.3, TypeScript, `expo-notifications` `~57.0.20`, `expo-secure-store` `~57.0.4`, `expo-widgets` `~57.0.20`, `react-native-android-widget` `^0.22.1`, Jest, `@testing-library/react-native`, Android App Widget e iOS WidgetKit.

**Spec:** `docs/superpowers/specs/2026-09-19-remedio-em-dia-melhorias-design.md`

## Global Constraints

- Manter Expo SDK 57, React Native 0.86.3 e as versões compatíveis já registradas no `package.json`.
- Dados de medicamentos, histórico, consultas e cuidador permanecem locais; não adicionar backend, login, telemetria ou compartilhamento remoto.
- Migrar o estado persistido para `versao: 2` sem apagar registros existentes e sem incluir `melhorias.txt` em commits.
- Usar PT-BR na interface, camelCase nos nomes internos e áreas de toque de pelo menos 48 dp/pt.
- Nunca prescrever, calcular dose, diagnosticar ou interpretar a observação médica.
- Toda mutação de registro deve ser idempotente por `registroId`; ações repetidas não podem criar histórico duplicado.
- O reconciliador deve cancelar somente notificações com `content.data.origem === 'remedio-em-dia'`.
- Ações de cuidador exigem confirmação explícita e nunca enviam aviso externo nesta entrega.
- Widgets só podem publicar o snapshot mínimo necessário: nome, horário, estado e ID da ocorrência.
- Testes automatizados e exports não serão apresentados como substitutos de QA em aparelho físico.
- Não restaurar, limpar ou formatar a alteração local pré-existente em `melhorias.txt`.

## Review Focus

- Estado persistido v1 com `ativo` e registros antigos: a migração deve ser segura, repetível e preservar o histórico; cobrir no Task 1.
- Dois horários iguais ou duas ações concorrentes para a mesma ocorrência: a agenda deve deduplicar e manter o primeiro estado terminal; cobrir nos Tasks 1 e 2.
- Reagendamento após edição, pausa, exclusão e mudança de fuso: somente lembretes do app devem ser cancelados e recriados; cobrir no Task 2.
- Widget acionado com o processo encerrado: a ação deve persistir o registro e redesenhar o snapshot antes de terminar; cobrir nos Tasks 5 e 6.
- Fonte ampliada, texto longo e foco de leitor de tela: controles e cartões não podem depender de tamanho fixo ou cor isolada; cobrir nos Tasks 3 e 7.

## File Map

- Modify: `src/dominio/agenda.ts` — tipos v2, migração, cálculo de ocorrências e comandos idempotentes.
- Create: `src/dominio/agenda.test.ts` additions — migração, frequência, exclusão e idempotência.
- Modify: `src/dados/armazenamento.ts` — normalização na leitura e persistência do estado v2.
- Modify: `src/notificacoes.ts` — autorização, reconciliador, metadados e ações de adiamento.
- Create: `src/notificacoes.test.ts` — testes de chamadas ao módulo Expo e ausência de duplicidades.
- Create: `src/componentes/` — botões, campos, cartões, seletores e modais acessíveis.
- Create: `src/telas/` — início, medicamentos, detalhe, histórico, mais e formulários.
- Modify: `App.tsx` — composição das telas e estado global mínimo.
- Create: `src/widget/estado.ts` — snapshot, seleção da próxima ocorrência e comandos compartilhados.
- Modify: `widget-task-handler.tsx` — leitura persistida, ações headless e renderização dinâmica Android.
- Modify: `src/widget/RemedioWidget.android.tsx` — nome, horário, estado e IDs das ações.
- Modify: `src/widget/RemedioWidget.ios.tsx` — timeline/props e ações interativas.
- Create/modify: `ios/ExpoWidgetsTarget/` — ledger App Group e reconciliação da extensão WidgetKit.
- Create: `src/cuidador.ts` — confirmação, seleção e revogação sem transporte externo.
- Create: `src/acessibilidade.test.tsx` — papéis, labels e áreas de ação dos fluxos críticos.
- Create: `docs/qa/2026-09-19-remedio-em-dia-dispositivos.md` — roteiro de validação física e registro de evidências.

### Task 1: Estado v2, migração e domínio de ocorrências

**Files:**
- Modify: `src/dominio/agenda.ts`
- Modify: `src/dados/armazenamento.ts`
- Test: `src/dominio/agenda.test.ts`
- Create: `src/dados/armazenamento.test.ts`

**Interfaces:**
- Produces `Frequencia`, `Medicamento`, `RegistroMedicamento`, `Consulta`, `Cuidador`, `EstadoApp`, `normalizarEstado`, `ocorrenciasDoDia`, `proximaOcorrencia`, `criarRegistro` e `atualizarRegistro`.
- `normalizarEstado(entrada: unknown): EstadoApp` deve aceitar tanto o estado atual quanto o estado v2.
- `ocorrenciasDoDia(medicamentos: Medicamento[], data: Date)` deve ignorar `pausado`/`excluido`, ordenar por horário e deduplicar horários.

- [ ] **Step 1: Escrever os testes de migração e frequência**

```ts
it('migra o estado atual sem remover registros', () => {
  const salvo = {
    concluiuBoasVindas: true,
    medicamentos: [{ id: 'm1', nome: 'A', horarios: ['08:00'], frequencia: { tipo: 'diaria' }, ativo: true, criadoEm: '2026-09-18T00:00:00.000Z' }],
    registros: [{ id: 'r1', medicamentoId: 'm1', medicamentoNome: 'A', horario: '08:00', previstoPara: '2026-09-18T08:00:00', estado: 'taken', origem: 'app' }],
    consultas: [],
  };

  const estado = normalizarEstado(salvo);
  expect(estado.versao).toBe(2);
  expect(estado.medicamentos[0].situacao).toBe('ativo');
  expect(estado.registros).toHaveLength(1);
});

it('gera vários horários, dias selecionados e intervalo sem duplicidade', () => {
  const medicamentos = [
    { id: 'm1', nome: 'A', horarios: ['08:00', '08:00', '20:00'], frequencia: { tipo: 'diasDaSemana', dias: [5] }, situacao: 'ativo', criadoEm: '2026-09-18T00:00:00.000Z', atualizadoEm: '2026-09-18T00:00:00.000Z' },
  ] as Medicamento[];
  expect(ocorrenciasDoDia(medicamentos, new Date(2026, 8, 18)).map(item => item.horario)).toEqual(['08:00', '20:00']);
});
```

- [ ] **Step 2: Rodar os testes para confirmar a falha inicial**

Run: `npm test -- --runInBand src/dominio/agenda.test.ts src/dados/armazenamento.test.ts`

Expected: FAIL porque o domínio ainda não possui `normalizarEstado`, `situacao` e as regras v2.

- [ ] **Step 3: Implementar os tipos v2 e a migração pura**

Adicionar `versao: 2`, `observacao?`, `situacao` e `atualizadoEm`. Converter `ativo` legado para `situacao`, preencher campos ausentes com valores determinísticos e retornar `estadoInicial` somente para entradas inválidas ou inexistentes. Não chamar APIs de data aleatórias durante a normalização.

- [ ] **Step 4: Implementar cálculo de ocorrências e próxima ocorrência**

Normalizar horários com `Set`, validar `HH:mm`, aplicar `diasDaSemana` com `Date.getDay()` e aplicar `intervalo` ancorado em `criadoEm`. `proximaOcorrencia` deve procurar a partir de uma data de referência por no máximo 370 dias e retornar `null` se nenhuma regra produzir ocorrência válida.

- [ ] **Step 5: Tornar os comandos de registro idempotentes**

`atualizarRegistro` deve ignorar uma segunda ação quando o estado não for `pendente`. `criarRegistro` deve manter o mesmo ID para a combinação medicamento/data/horário e guardar o nome do medicamento no momento da criação.

- [ ] **Step 6: Normalizar na leitura e persistir a versão**

Alterar `carregarEstado` para executar `normalizarEstado(JSON.parse(salvo))`. Depois de uma migração bem-sucedida, salvar a versão v2 uma vez. Um JSON inválido deve retornar `estadoInicial` sem lançar para a UI.

- [ ] **Step 7: Rodar os testes e o verificador de tipos**

Run: `npm test -- --runInBand src/dominio/agenda.test.ts src/dados/armazenamento.test.ts`

Expected: PASS com cobertura das três frequências, situação, migração e idempotência.

- [ ] **Step 8: Commitar o domínio**

```bash
git add src/dominio/agenda.ts src/dominio/agenda.test.ts src/dados/armazenamento.ts src/dados/armazenamento.test.ts
git commit -m "feat: versionar agenda de medicamentos"
```

### Task 2: Reconciliador de notificações e consultas

**Files:**
- Modify: `src/notificacoes.ts`
- Modify: `src/dominio/agenda.ts`
- Test: `src/notificacoes.test.ts`
- Test: `src/dominio/agenda.test.ts`

**Interfaces:**
- Consumes `EstadoApp`, `ocorrenciasDoDia`, `proximaOcorrencia` e o módulo `expo-notifications`.
- Produces `sincronizarNotificacoes(estado, agora)`, `prepararNotificacoes()`, `agendarAdiantamento(nome, ocorrenciaId)` e `processarAcaoNotificacao(estado, ocorrenciaId, acao)`.
- Toda chamada de `scheduleNotificationAsync` deve incluir `content.data.origem = 'remedio-em-dia'` e finalidade identificável.

- [ ] **Step 1: Escrever testes com mocks do Expo Notifications**

```ts
it('sincroniza duas vezes sem duplicar lembretes próprios', async () => {
  Notifications.getAllScheduledNotificationsAsync.mockResolvedValueOnce([
    { identifier: 'old', content: { data: { origem: 'remedio-em-dia' } } },
  ]);
  await sincronizarNotificacoes(estadoComMedicamento, new Date(2026, 8, 19, 7, 0));
  await sincronizarNotificacoes(estadoComMedicamento, new Date(2026, 8, 19, 7, 0));
  expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('old');
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
});

it('agenda consulta em 24 horas e 1 hora antes', async () => {
  await sincronizarNotificacoes(estadoComConsulta, new Date('2026-09-19T10:00:00'));
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
    content: expect.objectContaining({ data: expect.objectContaining({ finalidade: 'lembrete-24h' }) }),
  }));
});
```

- [ ] **Step 2: Rodar o teste para confirmar a falha**

Run: `npm test -- --runInBand src/notificacoes.test.ts`

Expected: FAIL porque o reconciliador ainda só agenda uma data avulsa.

- [ ] **Step 3: Criar metadados e filtros de propriedade**

Implementar `ehNotificacaoDoApp(request)` verificando `content.data.origem`. Buscar todas as agendadas, cancelar somente as pertencentes ao app e ignorar notificações de outras origens.

- [ ] **Step 4: Implementar gatilhos recorrentes por frequência**

Usar gatilho diário para frequência diária, gatilho semanal por dia selecionado no Android e gatilho calendário no iOS quando a API exigir essa diferença. Para intervalo de dias, gerar datas concretas dos próximos 60 dias. A função deve receber `agora` para ser determinística nos testes.

- [ ] **Step 5: Implementar lembretes de consulta e adiamento**

Para cada consulta não concluída e com lembretes ativos, agendar somente datas futuras de `marcadoPara - 24h` e `marcadoPara - 1h`. O adiamento deve criar uma notificação única 15 minutos após a ação e nunca modificar a ocorrência recorrente.

- [ ] **Step 6: Reconciliar em mudanças de estado e fuso**

Persistir `fusoHorarioObservado`, comparar com `Intl.DateTimeFormat().resolvedOptions().timeZone` e chamar o reconciliador quando mudar. Expor uma função de sincronização que `App.tsx` possa chamar no carregamento e no retorno ao primeiro plano.

- [ ] **Step 7: Testar respostas fora de ordem e permissões**

Cobrir permissão negada sem perder o cadastro, horários já passados, consulta com um lembrete passado e chamadas repetidas ao reconciliador. O estado de permissão deve ser retornado à UI para uma mensagem acionável.

- [ ] **Step 8: Rodar os testes e commitar**

Run: `npm test -- --runInBand src/notificacoes.test.ts src/dominio/agenda.test.ts`

Expected: PASS sem cancelamento global e sem IDs duplicados para o conjunto próprio.

```bash
git add src/notificacoes.ts src/notificacoes.test.ts src/dominio/agenda.ts src/dominio/agenda.test.ts
git commit -m "feat: reconciliar lembretes recorrentes"
```

### Task 3: Componentes acessíveis e telas de medicamentos

**Files:**
- Create: `src/componentes/Botao.tsx`
- Create: `src/componentes/Campo.tsx`
- Create: `src/componentes/SeletorFrequencia.tsx`
- Create: `src/componentes/CartaoMedicamento.tsx`
- Create: `src/componentes/CaixaModal.tsx`
- Create: `src/telas/Inicio.tsx`
- Create: `src/telas/Medicamentos.tsx`
- Create: `src/telas/DetalheMedicamento.tsx`
- Create: `src/telas/Historico.tsx`
- Modify: `App.tsx`
- Create: `src/telas/medicamentos.test.tsx`

**Interfaces:**
- `Medicamentos` recebe `medicamentos`, `abrirDetalhe(id)` e `abrirNovo()`.
- `DetalheMedicamento` recebe `medicamento`, `registros`, `onSalvar`, `onPausar`, `onExcluir`.
- `SeletorFrequencia` produz `Frequencia` validada e não manipula persistência.

- [ ] **Step 1: Escrever testes de jornada acessível**

Montar a lista com um medicamento, abrir o detalhe pelo label acessível, editar dois horários, pausar e confirmar exclusão. Verificar que o histórico continua renderizado depois da exclusão.

- [ ] **Step 2: Rodar os testes para confirmar a falha**

Run: `npm test -- --runInBand src/telas/medicamentos.test.tsx`

Expected: FAIL porque a tela ainda é composta por modais dentro de `App.tsx`.

- [ ] **Step 3: Extrair componentes sem alterar comportamento**

Mover `Botao`, `Campo`, `CaixaModal`, cartão e aviso médico para arquivos próprios. Preservar labels PT-BR, `accessibilityRole`, `accessibilityState`, `allowFontScaling` e estilos atuais como base.

- [ ] **Step 4: Implementar o formulário completo**

Usar uma lista editável de horários, chips/checkboxes para domingo a sábado, campo numérico para `aCadaDias` e campo de observação. Validar nome, pelo menos um horário, horários válidos, dias não vazios e intervalo inteiro maior que zero.

- [ ] **Step 5: Implementar lista e detalhe**

Substituir o cartão simples por navegação interna para detalhe. O detalhe deve mostrar situação, próxima ocorrência, observação e registros recentes; edição deve atualizar `atualizadoEm` sem modificar registros.

- [ ] **Step 6: Implementar pausa, retomada e exclusão**

Pausa e retomada exigem uma ação clara e chamam o reconciliador depois da persistência. Exclusão abre confirmação com a frase “O histórico será preservado”; depois marca `situacao: 'excluido'` e remove o item da lista.

- [ ] **Step 7: Reduzir `App.tsx` a composição**

Manter apenas hidratação, aba ativa, seleção de detalhe, persistência e integração com notificações/widget. O arquivo não deve conter definições de estilos de tela ou formulários completos.

- [ ] **Step 8: Rodar testes e verificar overflow de fonte**

Run: `npm test -- --runInBand src/telas/medicamentos.test.tsx`

Expected: PASS para cadastro, edição, pausa, retomada, exclusão e labels de leitor de tela. Testar manualmente com `fontScale` elevado no teste dos componentes.

- [ ] **Step 9: Commitar telas e componentes**

```bash
git add App.tsx src/componentes src/telas
git commit -m "feat: adicionar detalhe e edicao de medicamentos"
```

### Task 4: Consultas, cuidador e ações compartilhadas

**Files:**
- Create: `src/cuidador.ts`
- Create: `src/telas/Mais.tsx`
- Create: `src/telas/ConsultaForm.tsx`
- Create: `src/telas/CuidadorForm.tsx`
- Modify: `App.tsx`
- Create: `src/cuidador.test.ts`
- Create: `src/telas/mais.test.tsx`

**Interfaces:**
- `salvarCuidadorComConsentimento(estado, dados, confirmacao)` retorna novo estado somente quando `confirmacao === true`.
- `revogarCuidador(estado, confirmacao)` desativa autorização e todos os avisos quando confirmado.
- `resumoCompartilhamento(cuidador)` produz texto explícito sobre avisos selecionados e ausência de envio externo.

- [ ] **Step 1: Escrever testes de consentimento**

Cobrir confirmação falsa sem alteração, confirmação verdadeira com avisos parciais, revogação e texto “Nenhum aviso externo foi enviado”.

- [ ] **Step 2: Rodar os testes para confirmar a falha**

Run: `npm test -- --runInBand src/cuidador.test.ts src/telas/mais.test.tsx`

Expected: FAIL porque o fluxo atual sempre ativa todos os avisos e não revoga.

- [ ] **Step 3: Implementar comandos puros de cuidador**

Não chamar rede, Linking ou APIs de mensagem. Gravar `autorizadoEm`, nome, contato, avisos e `consentimentoAtivo`; ao revogar, manter o histórico local do cadastro, mas zerar os avisos.

- [ ] **Step 4: Implementar consulta/exame com edição e conclusão**

Adicionar local opcional, observação opcional, conclusão e remoção. Após cada alteração, chamar `sincronizarNotificacoes` para atualizar os avisos de 24h/1h.

- [ ] **Step 5: Implementar UI de cuidador**

Exibir checkboxes com labels completos, confirmação antes de autorizar e confirmação antes de revogar. Mostrar o status de que não houve envio externo, tanto com cuidador ativo quanto sem cuidador.

- [ ] **Step 6: Rodar testes e commitar**

Run: `npm test -- --runInBand src/cuidador.test.ts src/telas/mais.test.tsx`

Expected: PASS sem qualquer chamada externa e com consultas reagendadas após edição.

```bash
git add App.tsx src/cuidador.ts src/cuidador.test.ts src/telas
git commit -m "feat: esclarecer cuidador e consultas"
```

### Task 5: Snapshot e widget Android real

**Files:**
- Create: `src/widget/estado.ts`
- Create: `src/widget/estado.test.ts`
- Modify: `src/widget/RemedioWidget.android.tsx`
- Modify: `widget-task-handler.tsx`
- Modify: `src/dados/armazenamento.ts`
- Modify: `src/widget/acoes.ts`
- Modify: `App.tsx`

**Interfaces:**
- `criarSnapshotWidget(estado, agora): WidgetSnapshot` retorna nome, horário, estado e `ocorrenciaId` do próximo item.
- `processarAcaoWidgetPersistida(acao, ocorrenciaId)` carrega estado, marca o registro com origem `widget`, salva e retorna novo snapshot.
- `renderizarWidgetAndroid(snapshot)` produz somente a árvore do widget, sem ler estado em tempo de renderização.

- [ ] **Step 1: Escrever testes do snapshot**

Verificar medicamento real, estado atual do registro, vazio sem lembrete e seleção da ocorrência correta quando há dois horários.

- [ ] **Step 2: Rodar os testes para confirmar a falha**

Run: `npm test -- --runInBand src/widget/estado.test.ts`

Expected: FAIL porque o widget atual exibe “Próximo lembrete” fixo e não carrega `EstadoApp`.

- [ ] **Step 3: Implementar o seletor de snapshot**

Usar `proximaOcorrencia` e o registro correspondente. Para estado pendente, publicar `pendente`; para registro terminal, publicar seu estado e selecionar a próxima ocorrência ainda pendente quando existir.

- [ ] **Step 4: Passar snapshot real ao componente Android**

Alterar `RemedioWidgetAndroid` para receber props e apresentar `snapshot.nome`, `snapshot.horario` e estado textual. As ações devem ser customizadas, com `clickActionData` contendo `acao` e `ocorrenciaId`; o toque no cartão continua abrindo o app.

- [ ] **Step 5: Implementar ação no handler headless**

No `WIDGET_CLICK`, validar `acao` e `ocorrenciaId`, chamar o comando persistido com `origem: 'widget'`, renderizar o snapshot retornado e solicitar atualização. Em `WIDGET_ADDED`, `WIDGET_UPDATE` e `WIDGET_RESIZED`, carregar estado e renderizar o snapshot atual.

- [ ] **Step 6: Atualizar o app depois de cada mutação**

Depois de salvar no app, publicar o snapshot pelo adaptador Android. O caminho de inicialização deve publicar uma vez após `carregarEstado`, mesmo sem medicamento.

- [ ] **Step 7: Rodar testes e build checks**

Run: `npm test -- --runInBand src/widget/estado.test.ts src/widget/acoes.test.ts`

Expected: PASS. Depois executar `npx expo export --platform android` apenas como verificação de empacotamento; não registrar isso como QA físico do widget.

- [ ] **Step 8: Commitar o widget Android**

```bash
git add src/widget widget-task-handler.tsx src/dados/armazenamento.ts App.tsx
git commit -m "feat: sincronizar widget android com agenda"
```

### Task 6: Widget iOS, timeline e ledger App Group

**Files:**
- Modify: `src/widget/RemedioWidget.ios.tsx`
- Modify: `ios/ExpoWidgetsTarget/RemedioWidget.swift`
- Modify: `ios/ExpoWidgetsTarget/index.swift`
- Modify: `ios/ExpoWidgetsTarget/Info.plist`
- Modify: `ios/RemdioemDia/RemdioemDia.entitlements`
- Modify: `app.json`
- Create/modify: `ios/RemdioemDia/WidgetLedgerModule.swift`
- Create: `src/widget/ledger.ts`
- Create: `src/widget/ledger.test.ts`

**Interfaces:**
- `gravarAcaoWidgetNoLedger(acao)` grava apenas `ocorrenciaId`, ação e data no App Group.
- `lerEAceitarAcoesDoLedger()` retorna ações ainda não aplicadas e as remove de forma atômica.
- `atualizarTimelineWidget(snapshot, ocorrenciasFuturas)` publica entradas futuras sem depender do processo React Native.

- [ ] **Step 1: Escrever testes do ledger em JavaScript**

Cobrir ação inválida, leitura sem duplicar a mesma ação, aceitação em lote e reconciliação em ordem cronológica.

- [ ] **Step 2: Rodar os testes para confirmar a falha**

Run: `npm test -- --runInBand src/widget/ledger.test.ts`

Expected: FAIL porque não existe contrato de ledger.

- [ ] **Step 3: Configurar o App Group**

Adicionar o identificador `group.com.mayc7n.remedioemdia` aos entitlements do app e da extensão e mantê-lo alinhado ao plugin `expo-widgets` em `app.json`. Não gravar o estado completo do app no grupo.

- [ ] **Step 4: Implementar o módulo nativo mínimo**

Usar `UserDefaults(suiteName:)` ou arquivo JSON protegido no App Group, com escrita serializada e limite de uma ação por ocorrência. Expor leitura/aceitação para o app e gravação para a extensão. Se o módulo exigir configuração adicional de Expo Modules, registrar o contrato nativo em vez de acessar `UserDefaults` diretamente de componentes React.

- [ ] **Step 5: Implementar timeline e props interativas**

Construir entradas para as próximas ocorrências e fazer os botões retornarem props com estado atualizado. O componente marcado com `'widget'` não usará hooks, `View`/`Text` de React Native, chamadas assíncronas ou imports proibidos pelo runtime isolado.

- [ ] **Step 6: Reconciliar ledger ao abrir/retomar o app**

Após hidratar o estado, consumir ações, aplicar `atualizarRegistro` idempotente e persistir antes de atualizar a timeline. A mesma ação não poderá ser aplicada duas vezes se o app for interrompido entre leitura e renderização.

- [ ] **Step 7: Rodar testes e export iOS**

Run: `npm test -- --runInBand src/widget/ledger.test.ts src/widget/estado.test.ts`

Expected: PASS. Depois executar `npx expo export --platform ios` para verificar o bundle; registrar QA WidgetKit apenas após teste em iPhone físico.

- [ ] **Step 8: Commitar o widget iOS**

```bash
git add app.json src/widget ios/ExpoWidgetsTarget ios/RemdioemDia/RemdioemDia.entitlements
git commit -m "feat: sincronizar widget ios com historico"
```

### Task 7: Acessibilidade, safe area e regressão visual

**Files:**
- Modify: `src/componentes/*.tsx`
- Modify: `src/telas/*.tsx`
- Modify: `App.tsx`
- Create: `src/acessibilidade.test.tsx`
- Modify: `package.json` only if `react-native-safe-area-context` is required by the existing native setup

**Interfaces:**
- Components expose visible labels and `accessibilityRole` without exigir conhecimento dos detalhes internos.
- The app root exposes safe-area insets to the content and bottom navigation.

- [ ] **Step 1: Escrever testes de acessibilidade**

Verificar role/label de “Tomei”, “Adiar 15 min”, “Pausar lembretes”, “Retomar lembretes”, “Excluir medicamento”, checkboxes do cuidador e aba selecionada.

- [ ] **Step 2: Rodar os testes para confirmar a falha**

Run: `npm test -- --runInBand src/acessibilidade.test.tsx`

Expected: FAIL para pelo menos os novos controles ainda não extraídos.

- [ ] **Step 3: Ajustar foco, Dynamic Type e safe area**

Garantir `allowFontScaling`, linhas que quebram texto, `maxFontSizeMultiplier` somente quando houver limite justificado, scroll no formulário, foco no título ao abrir detalhe e padding inferior suficiente para a navegação.

- [ ] **Step 4: Ajustar contraste e estados não cromáticos**

Manter texto junto de verde/âmbar/vermelho, aumentar áreas pequenas de ação e validar textos longos de nome, observação, cuidador e consultas.

- [ ] **Step 5: Rodar testes e revisar ausência de affordances mortas**

Run: `npm test -- --runInBand src/acessibilidade.test.tsx src/telas/medicamentos.test.tsx src/telas/mais.test.tsx`

Expected: PASS sem elementos clicáveis sem callback e sem regressão nas jornadas.

- [ ] **Step 6: Commitar a camada acessível**

```bash
git add App.tsx src/componentes src/telas src/acessibilidade.test.tsx package.json package-lock.json
git commit -m "refactor: separar telas e reforcar acessibilidade"
```

### Task 8: QA automatizado, checklist físico e gate final

**Files:**
- Create: `docs/qa/2026-09-19-remedio-em-dia-dispositivos.md`
- Modify: `README.md` only if a new development-build command is needed for the documented workflow
- Test: all `src/**/*.test.ts` and `src/**/*.test.tsx`

**Interfaces:**
- O checklist registra dispositivo, sistema, build, permissão, resultado, evidência e defeito; não transforma um export em resultado físico.

- [ ] **Step 1: Criar o checklist de Android físico**

Registrar passos para permissão, dois horários, edição, pausa, retomada, exclusão com histórico, tela bloqueada, reboot, widget real, ações headless, TalkBack, fonte ampliada e mudança de fuso.

- [ ] **Step 2: Criar o checklist de iPhone físico**

Registrar WidgetKit/timeline, ledger com app encerrado, permissões, Dynamic Type, safe area, VoiceOver, edição, pausa, histórico, notificações e mudança de fuso.

- [ ] **Step 3: Rodar a suíte completa**

Run: `npm test -- --runInBand`

Expected: PASS em todas as suítes.

- [ ] **Step 4: Rodar verificações de pacote**

Run: `npx expo export --platform android`

Expected: export Android concluído; isso prova empacotamento, não notificação/widget físico.

Run: `npx expo export --platform ios`

Expected: export iOS concluído quando o ambiente tiver as dependências necessárias; ausência de Xcode não será mascarada como QA concluído.

- [ ] **Step 5: Rodar `git diff --check` e revisar escopo**

Run: `git diff --check && git status --short --branch`

Expected: nenhum erro de whitespace, somente arquivos da entrega e a alteração pré-existente de `melhorias.txt` preservada.

- [ ] **Step 6: Commitar o checklist e documentação**

```bash
git add -f docs/qa/2026-09-19-remedio-em-dia-dispositivos.md
git commit -m "docs: registrar qa fisico do remedio em dia"
```

- [ ] **Step 7: Encerrar somente com evidência explícita**

Reportar separadamente testes automatizados, exports, Android físico e iPhone físico. Se um aparelho ou capacidade não tiver sido testado, registrar `pendente` com o motivo e não declarar a melhoria completa.

## Plano de commits

Os commits seguem a ordem dos Tasks 1 a 8 e não devem incluir `melhorias.txt`:

1. `feat: versionar agenda de medicamentos`
2. `feat: reconciliar lembretes recorrentes`
3. `feat: adicionar detalhe e edicao de medicamentos`
4. `feat: esclarecer cuidador e consultas`
5. `feat: sincronizar widget android com agenda`
6. `feat: sincronizar widget ios com historico`
7. `refactor: separar telas e reforcar acessibilidade`
8. `docs: registrar qa fisico do remedio em dia`

Cada commit deve passar o teste focalizado do próprio Task antes de avançar. A suíte completa e os exports só serão o gate final; eles não substituem validação física.
