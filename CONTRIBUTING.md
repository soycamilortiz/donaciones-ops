# Cómo contribuir · Contributing

> Español abajo · [English below](#english)

¡Gracias por querer aportar a SOS Chocó! Este proyecto coordina donaciones, centros
de acopio y entregas. Toda ayuda suma.

## Antes de empezar

Leé [`docs/estado-actual.md`](docs/estado-actual.md): arquitectura, stack, modelo de
dominio, endpoints y qué falta. Es el punto de entrada de contexto.

## Entorno

Monorepo con **pnpm**. Requisitos: Node 24.x y pnpm.

```bash
pnpm install
cp .env.example .env   # y completá los valores (nunca los subas)
pnpm dev
```

## Reglas de lenguaje

| Qué | Idioma |
| --- | --- |
| Identificadores (variables, funciones, tipos, clases CSS) | Inglés |
| Comentarios de código | Inglés |
| Mensajes de commit | Inglés |
| Vocabulario de dominio (`acopio`, `donacion`, `producto`, `rol`) | Español |
| Textos de interfaz | Catálogos i18n (`apps/web/src/i18n/locales/`), nunca en duro |

## Commits y PRs

- Conventional commits: `feat|fix|refactor|docs|test|chore(scope): descripción`.
- Explicá **por qué**, no qué (el diff ya dice qué cambió).
- No commitees a `main` directamente; abrí un PR.
- No hagas `--force` push a ramas compartidas.

## Antes de dar algo por terminado

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test
```

Si algo queda sin verificar (builds de Docker, despliegues), decilo explícitamente.

## Seguridad

Nunca subas credenciales. Ver [`SECURITY.md`](SECURITY.md). Hay un escaneo de
secretos (gitleaks) en CI.

---

<a name="english"></a>

# Contributing

Thanks for helping SOS Chocó! This project coordinates donations, collection centers
and deliveries.

## Before you start

Read [`docs/estado-actual.md`](docs/estado-actual.md) — architecture, stack, domain
model, endpoints and what's missing.

## Environment

pnpm monorepo. Requires Node 24.x and pnpm.

```bash
pnpm install
cp .env.example .env   # fill in values (never commit them)
pnpm dev
```

## Language rules

Identifiers, code comments and commit messages in **English**. Domain vocabulary
(`acopio`, `donacion`, `producto`, `rol`) stays in **Spanish** to match the Prisma
models and DB columns. User-facing text lives in the i18n catalogues, never hardcoded.

## Commits & PRs

Conventional commits (`feat|fix|refactor|docs|test|chore(scope): description`).
Explain **why**, not what. No direct commits to `main` — open a PR. No `--force` push
to shared branches.

## Before calling something done

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test
```

## Security

Never commit credentials. See [`SECURITY.md`](SECURITY.md). A gitleaks secret scan
runs in CI.
