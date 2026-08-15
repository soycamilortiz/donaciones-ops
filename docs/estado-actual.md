# SOS Chocó — estado actual

Logística humanitaria para donaciones, centros de acopio y envíos a zonas remotas. Este documento describe lo que ya está montado: un dominio, varios contenedores, un API NestJS y un shell de entrada.

No hay aún módulos de negocio (donaciones / acopio / envíos). Lo que hay es la base para publicarlos como microfrontends independientes.

## Decisión de arquitectura

Cada solución (pantalla o app) es un **contenedor Docker propio**. El usuario entra a un solo origen (`http://localhost` en local). **Traefik** mira el path y reenvía:

| Path | Destino hoy |
| --- | --- |
| `/` | Shell React (`web`) |
| `/api` | NestJS (`api`) |
| `/donaciones`, `/acopio`, `/envios` | Pendientes: futuros contenedores |

No usamos Module Federation ni single-spa. Esas herramientas sirven cuando dos apps conviven en la misma página. Aquí cada problema tiene su pantalla, puede usar otro framework, y se publica solo. El gateway por URL cubre eso con menos fricción.

Los fronts **no se hablan entre sí**. El API es el punto de verdad. La sesión, cuando exista, será cookie en el mismo origen (`path=/`).

## Stack

| Pieza | Tecnología |
| --- | --- |
| Gateway | Traefik 3.4 (rutas en archivo) |
| Front actual | React 19 + Vite 7 + TypeScript, servido con nginx |
| API | NestJS 11, TypeScript strict |
| ORM | Prisma 6 |
| Base de datos | PostgreSQL 16 |
| Orquestación local | Docker Compose |

Traefik usa **provider de archivo** (`infra/traefik/dynamic/routes.yml`), no labels sobre el socket de Docker. En Docker Desktop para Windows el provider Docker no habla bien con el daemon. El archivo de rutas es además más explícito: un front nuevo se declara ahí.

## Árbol

```
SOSChoco/
  docker-compose.yml          # traefik, postgres, api, web
  .env / .env.example
  apps/
    api/                      # NestJS + Prisma
      prisma/schema.prisma
      prisma/migrations/
      src/
        main.ts
        app.module.ts
        app.setup.ts          # pipes, prefix, swagger, helmet, cors
        config/env.schema.ts  # Zod
        prisma/               # PrismaService global
        health/               # liveness + readiness
    web/                      # Shell React
  infra/traefik/dynamic/
    routes.yml                # mapa URL → contenedor
```

## Cómo arrancar

Stack completo:

```bash
docker compose up --build
```

Abre [http://localhost](http://localhost). En Windows, `soschoco.localhost` no siempre resuelve; `localhost` y `127.0.0.1` sí. Traefik acepta los tres hosts.

| URL | Qué es |
| --- | --- |
| http://localhost | Shell |
| http://localhost/api | Metadatos del servicio |
| http://localhost/api/health | Liveness (el proceso está en pie) |
| http://localhost/api/health/ready | Readiness (PostgreSQL responde) |
| http://localhost/api/docs | Swagger UI |
| http://localhost/api/docs/openapi.json | Spec OpenAPI 3 |
| http://localhost:8080 | Dashboard Traefik |
| localhost:5432 | Postgres (usuario/clave/db: `soschoco`) |

Desarrollo sin rebuild de imagen:

```bash
docker compose up postgres -d
cd apps/api && npm install && npm run start:dev   # http://localhost:3000/api
cd apps/web && npm install && npm run dev         # http://localhost:5173
```

Vite proxea `/api` a Nest en el puerto 3000.

## Gateway (Traefik)

Las reglas están en `infra/traefik/dynamic/routes.yml`.

- El router `api` tiene prioridad **100** y `PathPrefix('/api')`.
- El router `web` tiene prioridad **1** (catch-all del host).
- Nest ya sirve bajo `/api`. Traefik **no** recorta el prefijo (`StripPrefix`).

Para enganchar un front nuevo:

1. Añadir el servicio en `docker-compose.yml`.
2. Añadir un router con `PathPrefix` y prioridad mayor que 1, por ejemplo:

```yaml
donaciones:
  rule: (Host(`localhost`) || Host(`127.0.0.1`) || Host(`soschoco.localhost`)) && PathPrefix(`/donaciones`)
  entryPoints: [web]
  priority: 50
  service: donaciones
```

3. En esa app, configurar el `base path` igual a la URL pública (`base: '/donaciones/'` en Vite, `basePath` en Next). Si no, JS/CSS y el router piden `/` y dan 404.

## API NestJS

Arquitectura por **módulos de feature** (la recomendada por Nest). Hoy solo hay infraestructura: config, Prisma y health. Donaciones, acopio y envíos se agregan como carpetas hermanas:

```
src/<feature>/
  dto/
  <feature>.controller.ts
  <feature>.service.ts
  <feature>.module.ts
```

Convenciones ya aplicadas:

| Tema | Cómo está |
| --- | --- |
| Entorno | Zod en `config/env.schema.ts`. Si falta `DATABASE_URL`, la app no arranca. |
| Tipado | `strict: true`. `ConfigService<Env, true>` para `get(..., { infer: true })`. |
| HTTP | Prefijo global `api`. Versionado URI, default `v1`. Health usa `VERSION_NEUTRAL` (`/api/health`, no `/api/v1/health`). |
| DTOs | `ValidationPipe`: `whitelist`, `forbidNonWhitelisted`, `transform`. |
| Prisma | `PrismaModule` `@Global()`. `PrismaService` conecta al iniciar y desconecta al apagar. |
| Salud | `GET /api/health` = proceso vivo. `GET /api/health/ready` = `SELECT 1` a Postgres vía Terminus. |
| Docs | Swagger UI en `/api/docs`. Spec en `/api/docs/openapi.json`. DTOs con `@ApiProperty`. |
| Seguridad | Helmet + CORS (lista en `CORS_ORIGIN`, credenciales activas) + shutdown hooks. |
| Tests | Unitarios de health/app; e2e con Prisma mockeado. |

Variables del API (`apps/api/.env.example`):

| Variable | Uso |
| --- | --- |
| `NODE_ENV` | `development` \| `test` \| `production` |
| `PORT` | Default `3000` |
| `DATABASE_URL` | `postgresql://soschoco:soschoco@localhost:5432/soschoco` en el host |
| `CORS_ORIGIN` | Orígenes separados por coma |

En Docker, `DATABASE_URL` apunta al servicio `postgres`, no a `localhost`.

Scripts útiles en `apps/api`:

```bash
npm run start:dev      # watch
npm run test           # unitarios
npm run test:e2e
npm run prisma:migrate # nueva migración en desarrollo
npm run prisma:studio  # UI de la BD
```

En el contenedor, el arranque corre `prisma migrate deploy` y luego Nest.

## Prisma

Prisma es el ORM: el schema es el contrato de la BD, las migraciones versionan el SQL, y el cliente generado da consultas tipadas (`this.prisma...`).

Hoy `schema.prisma` no tiene modelos de dominio. La migración inicial solo crea la extensión `pgcrypto` (útil para UUIDs después).

Cuando se agregue un modelo (por ejemplo `Donacion`):

1. Declararlo en `apps/api/prisma/schema.prisma`.
2. `npm run prisma:migrate` (en local, con Postgres arriba).
3. Usar `PrismaService` inyectado en el service del módulo.

Los fronts no tocan la BD.

## Shell (`apps/web`)

Página de entrada: título, estado de API y Postgres (llama a `/api/health` y `/api/health/ready`), enlace a Swagger, y tarjetas de los módulos futuros (`/donaciones`, `/acopio`, `/envios`) marcadas como próximo contenedor.

Build de producción: Vite → estáticos en nginx (`try_files` para SPA).

## Qué falta (siguiente capa)

- Modelos Prisma y módulos Nest: donaciones, centros de acopio, envíos.
- Autenticación (cookie de sesión en el dominio único).
- Contenedores de front por módulo, con `base path` y ruta Traefik.
- Auth compartida y, más adelante si hace falta, un design system.

Module Federation queda como evolución solo si hay que incrustar un widget de un módulo dentro de otro.
