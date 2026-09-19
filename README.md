# Remédio em Dia

Aplicativo mobile para ajudar pessoas e familiares autorizados a lembrarem de medicamentos, consultas e exames.

Funciona offline, oferece lembretes locais e permite marcar cada medicamento como tomado, adiado ou esquecido.

O app não prescreve medicamentos, não altera doses e não oferece diagnóstico. Siga sempre a orientação do seu médico.

Projeto em desenvolvimento com React Native e Expo para Android e iOS.

## Estado atual

O app já conta com cadastro e edição de medicamentos, múltiplos horários, frequências diária/semana/intervalo, histórico preservado, consultas e exames, cuidador com consentimento local, notificações recorrentes e widgets Android/iOS.

As ações interativas das notificações e do widget usam a ocorrência exata do lembrete e são idempotentes. Os dados permanecem no aparelho; esta versão não envia avisos externos ao cuidador.

## Validação

Os testes automatizados e o TypeScript são executados localmente com:

```bash
npm test -- --runInBand
npx tsc --noEmit
```

A validação em aparelho físico Android/iOS, incluindo notificações, widgets, TalkBack, VoiceOver, Dynamic Type e safe area, está documentada em [`docs/qa-fisico.md`](docs/qa-fisico.md) e deve ser feita antes de uma distribuição.
