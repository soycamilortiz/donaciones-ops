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
| http://localhost/api/health/storage | Cloudflare R2 |
| http://localhost/api/docs | Swagger UI |
| http://localhost/api/docs/openapi.json | OpenAPI 3 (JSON) |
| http://localhost:8080 | Dashboard Traefik |
| localhost:5432 | Postgres |
| localhost:6379 | Redis (cola BullMQ) |

Auth propia: usuario/contraseña, captcha y JWT (`JWT_SECRET` en `.env`). Las rutas viven en `infra/traefik/dynamic/routes.yml`.

Las URL de conexión entre servicios no se escriben a mano: el compose las deriva de los nombres de servicio de la red `soschoco`. El detalle, y qué cambia al desplegar en Vercel, está en [docs/variables-de-entorno.md](docs/variables-de-entorno.md).

## Desarrollo local (sin rebuild de imagen)

Opción A — API y front en el host (más rápido en Windows):

```bash
docker compose up postgres redis traefik -d
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
apps/web            PWA React (Vite): login, onboarding, panel, captura de fotos
apps/worker         Procesa jobs de reconocimiento de imágenes (BullMQ + Tesseract)
apps/jobs           Panel de observación de la cola (Bull Board)
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

## Reconocimiento de productos donados

La PWA toma la foto de un producto (arroz, agua, crema dental), la sube y el sistema intenta reconocer de qué producto se trata para dejarlo registrado en la base.

El recorrido:

```
PWA ──1─► API: POST /donaciones/subidas/ruta (reserva el pathname)
PWA ──2─► Vercel Blob                        (upload() negocia el token contra
                                              /subidas y sube el archivo)
PWA ──3─► API: POST /donaciones              (registra la URL y encola el job)
                    │
                  Redis
                    │
             apps/worker ──► descarga ──► sharp ──► Tesseract ──► catálogo
                    │
                 PostgreSQL: donacion_imagenes.blob_url + producto_id
```

La imagen **no pasa por el API**: una foto de móvil son varios MB y hacerla viajar dos veces no aporta nada. El API solo firma el permiso de subida y encola.

| Pieza | Dónde |
| --- | --- |
| Autorización y encolado | `apps/api/src/donaciones` |
| Gestor de jobs | `apps/worker/src/manager.ts` |
| Jobs | `apps/worker/src/jobs` |
| OCR | `apps/worker/src/ocr` |
| Emparejamiento con el catálogo | `apps/worker/src/productos` |
| Pantallas | `apps/web/src/pages/{Donaciones,NuevaDonacion,RevisionDonaciones}Page.tsx` |
| Cliente del API | `apps/web/src/features/donaciones` |

Para añadir un job nuevo: crea el archivo en `apps/worker/src/jobs` exportando una `DefinicionJob` y súmalo a `registro.ts`. El manager levanta un Worker de BullMQ por cada entrada; no hay que tocar el arranque.

**Sobre la precisión.** Tesseract lee texto, no reconoce objetos. Sobre un envase real —curvo, con brillo y en ángulo— devuelve texto sucio y falla con frecuencia. Por eso hay dos filtros antes de escribir un producto en la base: la confianza que reporta el OCR (`OCR_CONFIANZA_MINIMA`) y el puntaje de emparejamiento contra el catálogo. Si cualquiera falla, la imagen queda `PROCESADA` **sin producto**, para revisión manual desde `PATCH /donaciones/:id/producto`. Preferimos un hueco a un dato inventado en el inventario.

El camino que de verdad resuelve el reconocimiento de productos empaquetados es el **código de barras (EAN-13)**, que da identidad exacta y se puede leer en el propio móvil. El modelo ya tiene el campo `ean` en `productos`, y `DefinicionJob` permite enchufar ese motor —o uno de visión— sin tocar la cola ni la persistencia.

El API comprueba R2 con `GET /api/health/storage` (`HeadBucket`). Las donaciones todavía suben con `BLOB_READ_WRITE_TOKEN` (Vercel Blob) hasta recablear PutObject. Guía: [docs/r2-storage.md](docs/r2-storage.md). Sin Blob, donaciones responde 503 y no tumba el arranque.

## PWA

`apps/web` es una PWA instalable. La captura usa `<input capture="environment">`, que abre la cámara trasera en móvil y degrada a selector de archivos en escritorio.

El service worker lo genera `vite-plugin-pwa` en `pnpm build` (`dist/sw.js` + `manifest.webmanifest`). Está activo también en `pnpm dev` para poder probar el comportamiento sin señal sin tener que compilar.

Qué se cachea y por qué:

| Recurso | Estrategia | Motivo |
| --- | --- | --- |
| Shell (JS, CSS, HTML) | Precache | La app tiene que abrir sin señal |
| Fotos del Blob | CacheFirst, 30 días | Son inmutables |
| Lecturas del API | NetworkFirst, 5 s de espera | Los estados cambian; la caché es respaldo |

La actualización es `prompt`, no automática: recargar sola mientras alguien sube una foto en campo perdería el trabajo en curso. El aviso vive en `apps/web/src/components/ActualizacionPWA.tsx`.

## Observar la cola

`apps/jobs` monta [Bull Board](https://github.com/felixmosh/bull-board) en `http://localhost/jobs`. Muestra jobs en espera, activos, completados y fallidos, con su traza de error, y permite reintentar o descartar.

Va detrás de basic auth (`JOBS_USER` / `JOBS_PASSWORD`) porque deja pausar colas y borrar jobs. La comparación de credenciales es de tiempo constante.

Al agregar un job nuevo en `apps/worker/src/jobs`, súmalo también a la lista de colas en `apps/jobs/src/main.ts` para poder observarlo.

## Integración continua

`.github/workflows/ci.yml` corre en cada push y PR:

| Job | Qué verifica |
| --- | --- |
| `verificar` | Lint, tipos, build y tests con caché de Turborepo |
| `migraciones` | Aplica las migraciones a un Postgres real y falla si `schema.prisma` cambió sin su migración |
| `imagenes` | Construye las cuatro imágenes Docker en paralelo |
