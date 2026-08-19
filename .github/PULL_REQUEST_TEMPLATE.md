## Qué cambia · What changes

<!-- Explicá el porqué, no solo el qué. El diff ya dice qué cambió. -->

## Checklist

- [ ] `pnpm lint && pnpm typecheck && pnpm build && pnpm test` pasa en local
- [ ] Sin secretos ni credenciales en el diff
- [ ] Textos de interfaz en i18n (`apps/web/src/i18n/locales/`), nunca en duro
- [ ] Actualicé `docs/estado-actual.md` si cambié arquitectura, endpoints o variables de entorno
- [ ] Commits siguen conventional commits (`feat|fix|refactor|docs|test|chore(scope): …`)
