# Reglas del proyecto · Project rules

> Español abajo · [English below](#english)

Este archivo lo lee Claude Code automáticamente al abrir el repo. Son reglas
vinculantes, no sugerencias.

## Antes de cambiar nada

Leé [`docs/estado-actual.md`](docs/estado-actual.md). Es el punto de entrada de
contexto: arquitectura, stack, modelo de dominio, endpoints y qué falta. Varias
personas empujan a `main` a la vez, así que el código se mueve entre sesiones.

Si un cambio altera arquitectura, stack, modelo de dominio, endpoints o
variables de entorno, actualizá ese documento **en el mismo commit**.

## Idioma

| Qué | Idioma |
| --- | --- |
| Identificadores (variables, funciones, tipos, props, clases CSS) | Inglés |
| Comentarios de código | Inglés |
| Mensajes de commit | Inglés |
| Vocabulario de dominio (`acopio`, `donacion`, `producto`, `rol`) | Español |
| Textos que ve el usuario | Catálogos de i18n, nunca en duro |
| Documentación (`README.md`, `docs/*.md`) | Español e inglés |

El vocabulario de negocio se queda en español porque coincide con los modelos de
Prisma y las columnas de la base: `matchProduct(text, productos)`, no
`emparejar(...)` ni `matchProduct(text, products)`.

Los nombres de variables de entorno (`OCR_CONCURRENCIA`, `RBAC_SYNC_ON_BOOT`) son
un contrato con el despliegue: los comparten Docker Compose, Vercel y los `.env`
locales del equipo. No se renombran sin coordinar.

## Textos de interfaz

Nada de cadenas en duro en componentes. Van a
[`apps/web/src/i18n/locales/`](apps/web/src/i18n/locales/), con la clave en
inglés y el texto en español e inglés. El catálogo español es la fuente de
verdad de los tipos: una clave inexistente falla al compilar.

## Commits

Sin `Co-Authored-By: Claude` ni la línea "Generated with Claude Code". El
historial refleja la autoría del equipo.

Explicá **por qué**, no qué. El diff ya dice qué cambió.

## Antes de dar algo por terminado

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test
```

Si algo queda sin verificar (builds de Docker, despliegues), decilo
explícitamente en vez de darlo por bueno.

---

<a name="english"></a>

# Project rules

Claude Code reads this file automatically. These are binding rules, not
suggestions.

## Before changing anything

Read [`docs/estado-actual.md`](docs/estado-actual.md). It is the entry point for
context: architecture, stack, domain model, endpoints and what is still missing.
Several people push to `main` concurrently, so the code moves between sessions.

If a change alters architecture, stack, domain model, endpoints or environment
variables, update that document **in the same commit**.

## Language

| What | Language |
| --- | --- |
| Identifiers (variables, functions, types, props, CSS classes) | English |
| Code comments | English |
| Commit messages | English |
| Domain vocabulary (`acopio`, `donacion`, `producto`, `rol`) | Spanish |
| User-facing text | i18n catalogues, never hardcoded |
| Documentation (`README.md`, `docs/*.md`) | Spanish and English |

Business vocabulary stays in Spanish because it matches the Prisma models and
database columns: `matchProduct(text, productos)`, not `emparejar(...)` and not
`matchProduct(text, products)`.

Environment variable *names* (`OCR_CONCURRENCIA`, `RBAC_SYNC_ON_BOOT`) are a
deployment contract shared by Docker Compose, Vercel and the team's local `.env`
files. Do not rename them without coordinating.

## Interface text

No hardcoded strings in components. They belong in
[`apps/web/src/i18n/locales/`](apps/web/src/i18n/locales/), keyed in English with
Spanish and English text. The Spanish catalogue is the source of truth for the
types: a missing key fails at compile time.

## Commits

No `Co-Authored-By: Claude` and no "Generated with Claude Code" line. The history
reflects the team's authorship.

Explain **why**, not what. The diff already says what changed.

## Before calling something done

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test
```

If something went unverified (Docker builds, deployments), say so explicitly
instead of assuming it works.
