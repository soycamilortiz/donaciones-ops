# SOS Chocó — estado actual

Logística humanitaria para donaciones, centros de acopio y envíos a zonas remotas. Un dominio, varios contenedores, un API NestJS y un shell React.

## Changesets

Desde ahora **todo cambio de producto** (API, web, Prisma, Traefik, env) lleva un changeset. Guía: [docs/changesets.md](changesets.md). Comando: `npm run changeset` en la raíz (paquete `soschoco`). No hay workspaces npm: cada app conserva su `package-lock` para Docker. El agente tiene la misma regla en `AGENTS.md` y `.cursor/rules/changesets.mdc`.

## Decisión de arquitectura

Cada solución (pantalla o app) es un **contenedor Docker propio**. El usuario entra a un solo origen (`http://localhost` en local). **Traefik** mira el path y reenvía:

| Path | Destino hoy |
| --- | --- |
| `/` | Shell React (`web`) |
| `/api` | NestJS (`api`) |
| `/donaciones`, `/acopio`, `/envios` | Pendientes: futuros contenedores |

No usamos Module Federation ni single-spa. Los fronts **no se hablan entre sí**. El API es el punto de verdad.

## Stack

| Pieza | Tecnología |
| --- | --- |
| Gateway | Traefik 3.4 (rutas en archivo) |
| Front | React 19 + Vite 7 + TypeScript, nginx |
| API | NestJS 11, TypeScript strict |
| ORM | Prisma 6 |
| Base de datos | PostgreSQL 16 |
| Auth | JWT propio, bcrypt (12 rounds), captcha SVG |
| Orquestación local | Docker Compose |
| Monorepo | pnpm workspaces + Turborepo |
| Lint y formato | Biome 2 (reemplaza ESLint + Prettier) |
| Código común | `packages/shared` (`@soschoco/shared`): enums, RBAC y contratos del API |
| Cola de jobs | BullMQ sobre Redis 7 |
| Worker | `apps/worker`: Tesseract (binario nativo) + sharp |
| Almacenamiento de imágenes | Vercel Blob (subida directa desde la PWA) |
| PWA | vite-plugin-pwa (manifest + service worker con Workbox) |
| Observabilidad de la cola | `apps/jobs`: Bull Board tras basic auth |
| CI | GitHub Actions: lint, tipos, build, tests, migraciones e imágenes |

Traefik usa **provider de archivo** (`infra/traefik/dynamic/routes.yml`), no labels sobre el socket de Docker.

## Cómo arrancar

```bash
docker compose up --build
```

Abre [http://localhost](http://localhost). En Windows, `soschoco.localhost` no siempre resuelve; `localhost` y `127.0.0.1` sí.

| URL | Qué es |
| --- | --- |
| http://localhost | Shell (landing, login, panel) |
| http://localhost/sign-up | Registro (usuario, contraseña, captcha) |
| http://localhost/sign-in | Login |
| http://localhost/app | Panel (requiere JWT) |
| http://localhost/api | Metadatos del servicio |
| http://localhost/api/health | Liveness |
| http://localhost/api/health/ready | Readiness (PostgreSQL) |
| http://localhost/api/docs | Swagger UI |
| http://localhost/jobs | Panel de la cola de jobs (basic auth) |
| http://localhost:8080 | Dashboard Traefik |
| localhost:5432 | Postgres (`soschoco` / `soschoco`) |
| localhost:6379 | Redis (cola BullMQ) |

Desarrollo sin rebuild de imagen:

```bash
docker compose up postgres redis -d
pnpm install                # una vez, desde la raíz
pnpm dev                    # API en :3000/api y front en :5173
```

Vite proxea `/api` a Nest en el puerto 3000.

## Autenticación propia

No hay proveedor externo. El API emite un JWT y el front lo guarda en `localStorage` (`soschoco.token`).

| Pieza | Cómo está |
| --- | --- |
| Registro | `POST /api/v1/auth/register` — nombre, usuario (3–32, `[a-zA-Z0-9._]+`), correo, contraseña, captcha |
| Login | `POST /api/v1/auth/login` — usuario **o** correo, contraseña y captcha |
| Captcha | `GET /api/v1/auth/captcha` — SVG, 5 minutos, un solo uso. La respuesta se guarda como SHA-256 |
| Contraseña | bcrypt, 12 rounds. Nunca se persiste ni se devuelve en texto plano |
| Sesión | `Authorization: Bearer <jwt>`. Default 8h (`JWT_EXPIRES_IN`) |
| Rutas públicas | health, metadatos, Swagger, `/api/v1/auth/*` |

Flujo de producto: registrarse → elegir crear organización **o** esperar invitación (no es obligatorio tener org) → si crea org, los acopios (recibir / enviar donaciones) se cargan en `/app/acopios`.

Invitar personas: quien se suma **ya tiene que estar registrada** con ese correo; no hay magic link.

## Dominio (Prisma)

`User` (usuario + correo únicos, `password_hash`), `CaptchaChallenge`, `Organization`, `Acopio`, `Role`, `Permission`, `RolePermission`, `Membership`, `Producto`, `DonacionImagen`.

Roles semilla: administrador de acopio, auxiliar administrativo, líder de zona, finanzas, transportador, voluntario. Quien crea la org queda como administrador de acopio. El alta por defecto es voluntario. La matriz se edita en `/app/roles` (permiso `roles:write`). Los permisos nuevos de código aparecen como filas; no se pisan los tildes ya guardados.

Permisos: `org:read/update`, `members:read/invite/role/remove`, `acopios:read/write`, `roles:read/write`, `inventory:read/write`, `donaciones:read/write`.

Inventario: por centro de acopio. Dashboard en `/app/inventario`. Nada de dominio se borra: `isActive` en usuario, organización, acopio, membresía, rol e ítem. Dar de baja no bloquea un alta nueva (el producto siempre nace activo; una membresía inactiva se reactiva al volver a invitar).

## API NestJS

Prefijo global `api`. Versionado URI, default `v1`. Health usa `VERSION_NEUTRAL`.

| Recurso | Ruta |
| --- | --- |
| Auth | `/api/v1/auth/captcha`, `/register`, `/login` |
| Yo | `/api/v1/me` |
| Organizaciones | `/api/v1/organizations` |
| Miembros | `/api/v1/organizations/:orgId/members` |
| Acopios | `/api/v1/organizations/:orgId/acopios` |
| Inventario | `/api/v1/organizations/:orgId/acopios/:acopioId/inventory` |
| Roles | `/api/v1/roles`, `/api/v1/permissions` |
| Editar roles | `POST/PATCH/DELETE /api/v1/organizations/:orgId/roles`, `PUT .../permissions` |
| Donaciones | `/api/v1/organizations/:orgId/donaciones` (+ `/subidas`, `/productos`, `/:id/producto`, `/:id/reprocesar`) |

Guards: `JwtAuthGuard` global + `@RequirePermission` por membresía.

Variables del API:

| Variable | Uso |
| --- | --- |
| `NODE_ENV` | `development` \| `test` \| `production` |
| `PORT` | Default `3000` |
| `DATABASE_URL` | Postgres |
| `CORS_ORIGIN` | Orígenes separados por coma |
| `JWT_SECRET` | Firma del token (mínimo 16 caracteres) |
| `JWT_EXPIRES_IN` | Default `8h` |
| `REDIS_URL` | Cola de reconocimiento. Default `redis://localhost:6379` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob. Sin él, donaciones responde 503 |

En Docker, `DATABASE_URL` apunta al servicio `postgres`. Cambiá `JWT_SECRET` antes de un entorno real.

## Shell (`apps/web`)

Landing, login/registro con captcha, onboarding y panel (`/app`). React Router. El token viaja en `Authorization: Bearer`. Inventario: dashboard por acopio.

## Qué falta

- Módulo de envíos (contenedor + API).
- Lectura de código de barras en la PWA, que es lo que de verdad resuelve el reconocimiento de producto empaquetado.
- Cookie httpOnly en lugar de `localStorage` si se endurece XSS.
- Rate limit explícito en login (hoy el captcha cubre brute-force básico).
- Contenedores de front por módulo, con `base path` y ruta Traefik.

## Reconocimiento de productos donados

La PWA fotografía un producto donado y el sistema intenta identificarlo para dejarlo registrado. El detalle del flujo y de los comandos está en el [README](../README.md#reconocimiento-de-productos-donados).

| Pieza | Responsabilidad |
| --- | --- |
| `apps/api/src/donaciones` | Autoriza la subida al Blob y encola el job. La imagen no pasa por el API |
| `apps/worker` | Consume la cola: descarga, preprocesa, OCR y emparejamiento |
| `donacion_imagenes` | Guarda la URL del Blob y el FK al producto reconocido |
| `productos` | Catálogo contra el que se resuelve el texto del OCR |

Estados de una imagen: `PENDIENTE` → `PROCESANDO` → `PROCESADA` o `FALLIDA`.

**Limitación conocida.** Tesseract es OCR, no reconocimiento de objetos: sobre envases reales acierta poco. Cuando la confianza o el emparejamiento no alcanzan el umbral, la imagen queda `PROCESADA` sin producto para que alguien lo corrija a mano, en vez de escribir un producto equivocado en el inventario. El campo `productos.ean` está listo para migrar a lectura de código de barras, que es lo que resuelve bien este caso.

El job es idempotente por `imagenId` y BullMQ reintenta con backoff exponencial; solo al agotar los reintentos la imagen pasa a `FALLIDA`.

### Pendiente para que la característica quede usable

El catálogo `productos` está vacío y sin él nada se reconoce: `emparejar()` contra una tabla vacía siempre devuelve `null`. Cargar los productos que realmente se donan (arroz, agua, aceite, panela, jabón, crema dental) con sus alias es lo más barato y lo que más cambia el resultado.

Falta también aplicar la migración contra un Postgres real y configurar `BLOB_READ_WRITE_TOKEN`.
