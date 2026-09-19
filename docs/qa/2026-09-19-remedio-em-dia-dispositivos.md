# QA físico — Remédio em Dia

Este roteiro separa empacotamento de comportamento real em aparelho. Export, Jest e TypeScript não aprovam notificações, widgets, tela bloqueada, Dynamic Type, safe area, TalkBack ou VoiceOver.

## Registro da execução

| Plataforma | Dispositivo | Sistema | Build | Data | Responsável | Resultado | Evidência |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Android | Pendente | Pendente | Pendente | Pendente | Pendente | Pendente | Pendente |
| iPhone | Pendente | Pendente | Pendente | Pendente | Pendente | Pendente | Pendente |

## Android físico

Pré-condições: development/release build instalado, notificações habilitadas e TalkBack disponível.

- [ ] Cadastrar um medicamento com dois horários e confirmar a permissão de notificações.
- [ ] Fechar o app, aguardar os dois horários e confirmar que o nome real, horário e texto do aviso aparecem.
- [ ] Reabrir o app e confirmar que o mesmo cadastro não gerou avisos duplicados.
- [ ] Editar nome, horários, frequência e observação; confirmar cancelamento dos avisos antigos e criação apenas da agenda nova.
- [ ] Pausar e retomar; confirmar que a pausa cancela avisos e a retomada os recria.
- [ ] Excluir o medicamento; confirmar que ele desaparece da agenda e que o histórico continua acessível.
- [ ] Adicionar o widget Android; confirmar nome real, horário e estado atual.
- [ ] Acionar “Tomei” no widget com o app aberto e fechado; confirmar registro único no histórico.
- [ ] Acionar “Adiar 15 min”; confirmar aviso único sem alterar a recorrência original.
- [ ] Reiniciar o aparelho; confirmar que lembretes continuam disponíveis.
- [ ] Testar tela bloqueada e a política do sistema para conteúdo sensível.
- [ ] Ativar TalkBack; verificar ordem de foco, labels “Tomei”, “Adiar 15 min”, “Pausar lembretes”, “Retomar lembretes” e “Excluir medicamento”.
- [ ] Aumentar a fonte; confirmar quebra de linhas, rolagem e ausência de controles cortados.
- [ ] Alterar o fuso horário; confirmar que a agenda é recalculada sem duplicidades.

Resultado: `PENDENTE` até anexar vídeo/log/captura do aparelho e preencher a tabela acima.

## iPhone físico

Pré-condições: development/release build em macOS/Xcode, WidgetKit disponível e VoiceOver habilitado.

- [ ] Cadastrar medicamento com dois horários, permitir notificações e confirmar avisos em tela bloqueada.
- [ ] Confirmar timeline do WidgetKit com nome real, horário e estado.
- [ ] Testar “Tomei” e “Adiar 15 min” com o app aberto.
- [ ] Testar as mesmas ações com o app encerrado; confirmar que o ledger App Group é consumido uma única vez na próxima abertura.
- [ ] Reabrir o app e confirmar que a ação do widget aparece no histórico sem duplicar.
- [ ] Editar, pausar, retomar e excluir medicamento; confirmar preservação do histórico e atualização da timeline.
- [ ] Cadastrar consulta/exame e validar avisos de 24 horas e 1 hora antes.
- [ ] Testar Dynamic Type em tamanhos ampliados, incluindo nomes e observações longas.
- [ ] Verificar safe area, navegação inferior e ausência de conteúdo sob a área de gesto.
- [ ] Ativar VoiceOver; verificar ordem, foco, labels, estados selecionados e confirmação de exclusão.
- [ ] Alterar permissão de notificações nas configurações e confirmar mensagem acionável no app.
- [ ] Alterar o fuso horário; confirmar nova timeline sem lembretes duplicados.

Resultado: `PENDENTE` até anexar evidência de WidgetKit, VoiceOver, Dynamic Type, safe area e ledger em aparelho real.

## Limitações conhecidas desta execução

- O ambiente atual não fornece Android físico, iPhone físico, macOS ou Xcode.
- `npx expo export` prova somente que o bundle JavaScript foi empacotado; não prova o funcionamento nativo dos widgets ou notificações.
- A ponte Swift do ledger foi adicionada ao projeto, mas sua compilação, associação ao target principal/extensão e leitura real do App Group precisam ser confirmadas em development build iOS.
