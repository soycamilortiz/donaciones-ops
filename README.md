# SOS Chocó

Logística de donaciones, centros de acopio y envíos. Un dominio, varios contenedores.

Documentación de lo que hay hoy: [docs/estado-actual.md](docs/estado-actual.md).

Los cambios de producto se registran con **Changesets** ([guía](docs/changesets.md)). En la raíz: `npm install` una vez, después `npm run changeset`.

## Arranque

```bash
docker compose up --build
```

Abre [http://localhost](http://localhost). En Windows, `soschoco.localhost` no siempre resuelve; `localhost` sí.

| URL | Servicio |
| --- | --- |
| http://localhost | Shell (front) |
| http://localhost/sign-up | Registro |
| http://localhost/sign-in | Login |
| http://localhost/app | Panel (JWT) |
| http://localhost/api | Metadatos API |
| http://localhost/api/health | Liveness |
| http://localhost/api/health/ready | PostgreSQL |
| http://localhost/api/docs | Swagger UI |
| http://localhost/api/docs/openapi.json | OpenAPI 3 (JSON) |
| http://localhost:8080 | Dashboard Traefik |

Auth propia: usuario/contraseña, captcha y JWT (`JWT_SECRET` en `.env`). Las rutas viven en `infra/traefik/dynamic/routes.yml`.

## Desarrollo local (sin rebuild de imagen)

Opción A — API y front en el host (más rápido en Windows):

```bash
docker compose up postgres traefik -d
pnpm install
pnpm dev
```

`pnpm dev` levanta API y front en paralelo vía Turborepo. Para uno solo:

```bash
pnpm --filter api dev
pnpm --filter web dev
```

- API: `http://localhost:3000/api`
- Front Vite: `http://localhost:5173` (proxy `/api` → Nest)
- Postgres: `localhost:5432`

Opción B — recarga dentro de Docker (polling; en Windows puede ir más lento):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

`docker compose up --build` **sin** el archivo `.dev` arma imágenes de producción: no recargan al editar código.

## Estructura

```
apps/api            NestJS + Prisma + PostgreSQL + JWT
apps/web            Shell React (Vite): login, onboarding, panel
packages/shared     Contratos de dominio (@soschoco/shared)
```

Los siguientes fronts se enganchan en Traefik con `PathPrefix` (`/donaciones`, `/acopio`, `/envios`).

## Monorepo

Gestor de paquetes: **pnpm** (workspaces). Orquestador: **Turborepo**. Lint y formato: **Biome**.

Requisitos: Node >= 22 y pnpm. Si tienes Node moderno, `corepack enable` te deja la versión correcta de pnpm según el campo `packageManager`.

| Comando | Qué hace |
| --- | --- |
| `pnpm install` | Instala todo el workspace (genera el cliente Prisma) |
| `pnpm dev` | API y front en paralelo |
| `pnpm build` | Compila ambas apps (con caché de Turbo) |
| `pnpm lint` | Biome sobre todo el repo |
| `pnpm check:fix` | Biome con arreglos automáticos |
| `pnpm format` | Solo formato |
| `pnpm typecheck` | `tsc --noEmit` en ambas apps |
| `pnpm test` | Tests unitarios |
| `pnpm test:e2e` | Tests e2e de la API |
| `pnpm db:migrate` | `prisma migrate dev` |
| `pnpm db:deploy` | `prisma migrate deploy` |
| `pnpm db:studio` | Prisma Studio |

Para apuntar a una sola app: `pnpm --filter api <script>` o `pnpm --filter web <script>`.

Biome reemplaza a ESLint + Prettier; la configuración única está en `biome.json` y el TypeScript compartido en `tsconfig.base.json`.

### `packages/shared`

Lo que el API y los fronts tienen en común vive en `@soschoco/shared`: enums del dominio, el catálogo de roles y permisos, y la forma de las respuestas del API. No depende de NestJS, Prisma ni React, así que lo puede importar cualquiera.

| Módulo | Contenido |
| --- | --- |
| `enums.ts` | `AcopioFlujo`, `OrganizationTipo` y sus opciones con etiqueta |
| `rbac.ts` | `PermissionSlug`, `RoleSlug`, `PERMISSION_CATALOG`, `ROLE_CATALOG` |
| `contracts.ts` | `Me`, `Membership`, `Member`, `Role`, `Acopio`, `Organization`, … |

Dos costuras lo mantienen honesto, ambas en tiempo de compilación:

- Los DTO de NestJS declaran `implements` contra los contratos, así que un cambio en la respuesta del API rompe el build si no se actualiza el contrato.
- `apps/api/src/rbac/prisma-sync.ts` falla si los enums de `schema.prisma` y los de `@soschoco/shared` divergen.

Se compila a CommonJS y ESM a la vez (`dist/cjs` y `dist/esm`) porque Nest consume CJS y Vite consume ESM. Turborepo lo construye antes que las apps; no hace falta invocarlo a mano.

Para añadir otro paquete compartido basta crear `packages/<nombre>` con su `package.json`: `pnpm-workspace.yaml` ya incluye `packages/*`.
