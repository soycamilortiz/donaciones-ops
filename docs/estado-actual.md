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
| Visión | `packages/vision` (`@soschoco/vision`): adapters de IA para leer envases |
| Cola de jobs | BullMQ sobre Redis 7 |
| Worker | `apps/worker`: Tesseract (binario nativo) + sharp |
| Almacenamiento de imágenes | Cloudflare R2 (S3). Health: `/api/health/storage` |
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
| http://localhost/api/health/storage | Cloudflare R2 (HeadBucket) |
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
| Registro | `POST /api/v1/auth/register` — nombre, usuario, correo, contraseña, captcha. **No** emite JWT: queda pendiente de verificar el correo |
| Verificar correo | `POST /api/v1/auth/verificar-correo` — token del enlace **o** correo + código de 6 dígitos. Emite JWT |
| Reenviar código | `POST /api/v1/auth/verificar-correo/reenviar` — cooldown 60 s. No revela si el correo existe |
| Login | `POST /api/v1/auth/login` — usuario **o** correo, contraseña y captcha. 403 si el correo no está verificado |
| Google | `POST /api/v1/auth/google` — ID token del botón. Emite JWT o pide completar perfil |
| Completar Google | `POST /api/v1/auth/google/completar` — usuario (y nombre opcional) tras el primer Google |
| Captcha | `GET /api/v1/auth/captcha` — SVG, 5 minutos, un solo uso. La respuesta se guarda como SHA-256 |
| Contraseña | bcrypt, 12 rounds. Nunca se persiste ni se devuelve en texto plano |
| Sesión | `Authorization: Bearer <jwt>`. Default 8h (`JWT_EXPIRES_IN`) |
| Rutas públicas | health, metadatos, Swagger, `/api/v1/auth/*` |

`EMAIL_VERIFICATION=false` (default local): el API **no** llama a Resend e imprime `codigo=` y `url=` en los logs del contenedor `api`. `EMAIL_VERIFICATION=true` envía un HTML por Resend (`RESEND_API_KEY`, `MAIL_FROM`, `PUBLIC_WEB_URL`). Cuentas ya existentes se marcan verificadas en la migración.

Flujo de producto: registrarse → elegir crear organización **o** esperar invitación (no es obligatorio tener org) → si crea org, los acopios (recibir / enviar donaciones) se cargan en `/app/acopios`.

Invitar personas: quien se suma **ya tiene que estar registrada** con ese correo; no hay magic link.

## Dominio (Prisma)

`User` (usuario + correo únicos, `password_hash`, `correoVerificadoAt`), `EmailVerification`, `CaptchaChallenge`, `Organization`, `Acopio`, `Role`, `Permission`, `RolePermission`, `Membership`, `Producto` (catálogo global con SKU), `DonacionImagen`, `Recepcion`, `UnidadLogistica`, `Lote`, `RecepcionItem`, `OrgCounter`, `Ubicacion`, `InventoryBalance`, `InventoryMovimiento`, `Putaway`, `PutawayLinea`.

Roles semilla: administrador de acopio, auxiliar administrativo, líder de zona, finanzas, transportador, voluntario. Quien crea la org queda como administrador de acopio. El alta por defecto es voluntario. La matriz se edita en `/app/roles` (permiso `roles:write`). Los permisos nuevos de código aparecen como filas; no se pisan los tildes ya guardados.

Permisos: `org:read/update`, `members:read/invite/role/remove`, `acopios:read/write`, `roles:read/write`, `inventory:read/write`, `donaciones:read/write`.

Inventario: por centro de acopio. Dashboard en `/app/inventario`. El alta de stock desde campo pasa por una **recepción**: confirmar una foto identifica el producto (unidad de medida y vencimiento en el ingreso); **validar** incrementa `inventory_items` (solo `cantidad_aprobada`) y deja esa cantidad en el **muelle**. Ubicar es otro paso (`/app/inventario/ubicar`): el sistema sugiere destinos; el operador confirma el código de la ubicación. Trasladar entre zonas ya ubicadas es **reubicación** (`/app/inventario/mover`): también confirma el código de destino. Saldos en `inventory_balances`. Nada de dominio se borra: `isActive` en usuario, organización, acopio, membresía, rol, producto, recepción, ubicación e ítem. Dar de baja no bloquea un alta nueva (el producto de inventario siempre nace activo; una membresía inactiva se reactiva al volver a invitar).

## API NestJS

Prefijo global `api`. Versionado URI, default `v1`. Health usa `VERSION_NEUTRAL`.

| Recurso | Ruta |
| --- | --- |
| Auth | `/api/v1/auth/captcha`, `/register`, `/login`, `/google`, `/google/completar`, `/verificar-correo`, `/verificar-correo/reenviar` |
| Yo | `/api/v1/me` |
| Organizaciones | `/api/v1/organizations` |
| Miembros | `/api/v1/organizations/:orgId/members` |
| Acopios | `/api/v1/organizations/:orgId/acopios` |
| Inventario | `/api/v1/organizations/:orgId/acopios/:acopioId/inventory` |
| Ubicaciones / putaway / movimientos | `/api/v1/organizations/:orgId/acopios/:acopioId/ubicaciones`, `.../putaway/pendientes`, `.../putaway/sugerencias/:itemId`, `POST .../putaway/:itemId`, `POST .../putaway/tareas/:id/confirmar`, `GET/POST .../movimientos` |
| Roles | `/api/v1/roles`, `/api/v1/permissions` |
| Editar roles | `POST/PATCH/DELETE /api/v1/organizations/:orgId/roles`, `PUT .../permissions` |
| Donaciones | `/api/v1/organizations/:orgId/donaciones` (+ `/subidas/ruta`, `/productos`, `/ean/:codigo`, `/:id/interpretar`, `/:id/confirmar`) |
| Recepciones | `/api/v1/organizations/:orgId/recepciones` (+ `/:id/unidades`, `/:id/items`, `/:id/items/:itemId/inspeccion`, `/:id/validar`, `/:id/anular`) |

`GET /donaciones` está **paginado por cursor**, no por offset: las fotos se insertan sin parar desde el campo y con `OFFSET` una fila nueva desplaza la ventana, haciendo que se repitan o se salten registros entre páginas. Devuelve `{ items, siguienteCursor }`; `siguienteCursor` es `null` cuando ya no hay más. Acepta `?estado=`, `?cursor=` y `?limite=` (1–200, default 50).

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
| `BLOB_READ_WRITE_TOKEN` | Obsoleto. Las donaciones suben a R2 |
| `R2_ACCOUNT_ID` | Account ID de Cloudflare |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Token S3 de R2. Solo API/worker |
| `R2_BUCKET` | Bucket. Default `sos-choco` |
| `R2_ENDPOINT` | `https://<accountid>.r2.cloudflarestorage.com` (sin el bucket) |
| `R2_PUBLIC_BASE_URL` | Dominio público de las fotos (custom domain o `*.r2.dev`) |
| `OPEN_FOOD_FACTS_ENABLED` | Default `true`. Apaga el lookup externo de EAN |
| `OPEN_FOOD_FACTS_BASE_URL` | Default `https://world.openfoodfacts.org`. Staging: `https://world.openfoodfacts.net` |
| `OPEN_FOOD_FACTS_USER_AGENT` | Obligatorio para OFF (`App/Version (contacto)`). No es API key |
| `OPEN_FOOD_FACTS_TIMEOUT_MS` | Default `8000` |
| `VISION_PROVIDER` | Adapter: `openai` (default) o `noop`. Paquete `@soschoco/vision` |
| `VISION_API_KEY` | Clave del proveedor. Sin ella cae a noop (formulario a mano) |
| `VISION_BASE_URL` | Default `https://api.openai.com/v1` |
| `VISION_MODEL` | Default `gpt-4.1-nano` (visión barata para etiquetas) |
| `VISION_TIMEOUT_MS` | Default `45000` |
| `EMAIL_VERIFICATION` | Default `false`. `true` envía con Resend; `false` deja código y link en logs del API |
| `RESEND_API_KEY` | Clave de Resend. Solo hace falta con `EMAIL_VERIFICATION=true` |
| `MAIL_FROM` | Default `SOS Chocó <beth.t@example.com>` (sandbox de Resend) |
| `PUBLIC_WEB_URL` | Origen del front para el link. Default `http://localhost` |
| `GOOGLE_CLIENT_ID` | OAuth Google (validar ID token). Mismo valor en `VITE_GOOGLE_CLIENT_ID` del front |
| `GOOGLE_CLIENT_SECRET` | Opcional hoy; reservado para flujos server-side |
| `RBAC_SYNC_ON_BOOT` | Default `true`. Ponelo en `false` en serverless |
| `SWAGGER_ENABLED` | Default `true`. Ponelo en `false` en serverless |
| `LOGS_TOKEN` | Opcional. Si está, `/logs` exige `?token=…` |

En Docker, `DATABASE_URL` apunta al servicio `postgres`. Cambiá `JWT_SECRET` antes de un entorno real.

Las URL de conexión **no se escriben a mano**: en Docker el compose las deriva de los nombres de servicio de la red `soschoco`. El detalle de las tres topologías (compose, apps en el host, serverless) está en [variables-de-entorno.md](variables-de-entorno.md).

### Dos formas de arrancar el API

| Entrada | Para qué |
| --- | --- |
| `src/main.ts` → `dist/main.js` | Proceso de larga vida (Docker, Traefik). `app.listen()` |
| `src/serverless.ts` → `api/index.js` | Función serverless (Vercel). `app.init()` y devuelve el handler |

`main.ts` no sirve en serverless: `app.listen()` nunca devuelve el control y la función termina en `FUNCTION_INVOCATION_FAILED`. El entry `api/index.js` es JavaScript a propósito, porque Vercel compila los entrypoints con esbuild y no emite metadata de decoradores, sin la cual falla la inyección de dependencias de Nest.

Cada app se despliega como un proyecto propio de Vercel apuntando al mismo repo, cambiando el Root Directory. `apps/worker` no puede: es un proceso residente.

## Visor de logs (`/logs`)

Los logs del despliegue en Vercel solo los ve quien tenga acceso al proyecto. Para que
cualquiera del equipo pueda diagnosticar, la función expone un visor propio:

| Ruta | Qué devuelve |
| --- | --- |
| `/logs` | Página con logs en vivo, chequeos de entorno y el error de arranque |
| `/logs/data?since=N` | JSON incremental desde el número de secuencia `N` |
| `/logs/stream` | SSE (la página cae a polling si el entorno no lo soporta) |
| `/logs/raw` | Texto plano, para `curl` o pegar en un issue |
| `/logs/reset` | Reintenta el arranque de Nest en la próxima petición |
| `/logs/all` | Logs de **las tres apps** (api, worker, jobs). Acepta `?app=worker` |

`/logs/all` lee un stream compartido en Redis. Las tres apps ya se conectan a
Redis para la cola, así que ver sus logs juntos no añade infraestructura nueva —
y sobrevive a una caída de Postgres, que es cuando más falta hacen.

El envío es *fire-and-forget* y nunca retrasa ni rompe una escritura real; tras
varios fallos seguidos se silencia un rato en vez de reintentar por cada línea.
Si Redis no responde, la lectura corta a los 3 s y el visor cae al buffer local
de la instancia, que es el comportamiento que había antes.

Vive en `apps/api/api/_lib/`, **fuera** del arranque de Nest y montado antes que él: si la app
no levanta, `/logs` sigue respondiendo y muestra el stack: sin eso, Vercel solo devuelve
`FUNCTION_INVOCATION_FAILED` sin causa. Por lo mismo `serverless.ts` usa `abortOnError: false`,
porque el default de Nest es `process.exit(1)` y mata la función antes de poder reportar nada.

Dos límites que conviene tener presentes:

- El buffer es **por instancia** (las últimas 1000 líneas en memoria). Vercel levanta una
  instancia por arranque en frío, así que los logs de ejecución son los de la instancia que
  te atendió. El error de arranque, en cambio, se reproduce en todas.
- La ruta es **pública**. Todo pasa por `_lib/redact.js` antes de entrar al buffer, que
  enmascara credenciales de URLs, JWT, hashes bcrypt, correos y los valores literales de las
  variables sensibles. Para cerrarla, definí `LOGS_TOKEN` en Vercel.

## Accesibilidad

Reglas que el front sostiene y conviene no romper al añadir pantallas:

| Regla | Por qué |
| --- | --- |
| Controles de 44px mínimo | Se usa con el móvil en la mano, en campo. A 24px se falla seguido |
| Errores con `role="alert"` | Si no, el lector de pantalla no los anuncia y el fallo pasa desapercibido |
| Acciones destructivas confirmadas | `ConfirmDialog` enfoca *Cancelar*, cierra con Escape y devuelve el foco |
| Foco visible siempre | Es la única pista de ubicación para quien navega con teclado |
| `prefers-reduced-motion` | Con excepción del spinner: es información, no decoración |
| Etiquetas visibles o `sr-only` | El placeholder desaparece al escribir, así que no es una etiqueta |
| Esqueleto al cargar listas | Una lista vacía no distingue «cargando» de «no hay nada», y al llegar los datos la página salta |
| Estados vacíos con siguiente paso | Decir que no hay nada sin decir qué hacer deja al usuario parado |

## Shell (`apps/web`)

Landing, login/registro con captcha, verificación de correo, onboarding y panel (`/app`). React Router. El token viaja en `Authorization: Bearer`. Inventario: dashboard por acopio, putaway (`/app/inventario/ubicar`) y reubicación entre zonas (`/app/inventario/mover`). Ubicaciones del acopio: `/app/ubicaciones` (también desde cada centro en Acopios). Recepciones: `/app/recepciones` (abrir evento, pallets, líneas, validar). La foto de identificación vive en `/app/recepciones/:id/foto`. No hay módulo de Donaciones en el panel.

Alta/edición de acopios: departamento y municipio (DIVIPOLA Colombia), autocomplete Photon, geolocalización del navegador, pin Leaflet arrastrable y mapa para `lat`/`lng`. Componente `AddressLocationPicker`.

Sistema visual «html-base»: paleta verde (`#12331A`) + acento dorado (`#F2C230`) sobre fondo sage, tipografía Archivo (self-hosted vía `@fontsource-variable/archivo`) y radios tipo píldora. Los tokens viven en `src/styles/design-system.css` (`@theme` de Tailwind) y `src/styles.css` (`:root` de las páginas legacy); cambiarlos repinta toda la app. El CTA primario usa tinta verde sobre el dorado para cumplir WCAG AA.

## Qué falta

- Recepción v1 **está**. Diseño: [recepcion.md](recepcion.md). Ubicaciones, putaway y reubicación entre zonas con confirmación de código **están** (v1: sin QR de cámara ni distancia/FEFO). Falta todavía: pallet de despacho, variantes (talla/gramaje), reserva/picking.
- Módulo de envíos (contenedor + API).
- Cookie httpOnly en lugar de `localStorage` si se endurece XSS.
- Rate limit explícito en login (hoy el captcha cubre brute-force básico).
- Contenedores de front por módulo, con `base path` y ruta Traefik.

## Reconocimiento de productos donados

Un solo camino: **subir una foto** (envase o código de barras).

0. La PWA lee el EAN sobre la foto original, **comprime** (lado largo ≤ 2048 px, JPEG ~600 KB objetivo, tope 1,5 MB) y sube a R2. HEIC se convierte a JPEG antes del PUT.
1. La PWA intenta leer un EAN con `BarcodeDetector`. Si hay código: catálogo `productos.ean` y, si no, Open Food Facts. Si nadie lo conoce, el operador completa a mano.
2. Si no hay EAN: el API baja la foto de R2 y llama a `@soschoco/vision` (adapter por `VISION_PROVIDER`). El operador confirma.
3. Al confirmar, la foto se cuelga de un `recepcion_item` (se abre una donación individual si no había recepción). El inventario **no** se toca hasta `POST .../recepciones/:id/validar`. Coincidencias son del catálogo `productos`, no del stock. El EAN, cuando existe, es la clave canónica.

Constantes compartidas en `@soschoco/shared`: `IMAGEN_LADO_MAX`, `IMAGEN_PESO_OBJETIVO`, `IMAGEN_PESO_MAX`, `MAX_IMAGEN_BYTES` (entrada cruda).

Tesseract sigue en el worker para `reprocesar` fotos viejas; las altas nuevas no encolan OCR.

| Pieza | Responsabilidad |
| --- | --- |
| `apps/web` (`comprimir-imagen.ts`) | EAN sobre original → comprimir → PUT a R2 |
| `apps/api/src/donaciones` | Firma el PUT, valida peso al registrar, visión al interpretar |
| `apps/worker` | Consume la cola: descarga, preprocesa, OCR y emparejamiento (solo reprocesar) |
| `donacion_imagenes` | Guarda la URL pública de R2 y el FK al producto reconocido |
| `productos` | Catálogo contra el que se resuelve el texto del OCR |

Estados de una imagen: `PENDIENTE` → `PROCESANDO` → `PROCESADA` o `FALLIDA`.

Cada foto se atribuye a un centro de acopio. La pantalla de captura recuerda el último elegido por organización: en campo se registran muchas fotos seguidas en el mismo sitio y volver a elegirlo cada vez es fricción pura.

**Limitación conocida.** Tesseract es OCR, no reconocimiento de objetos: sobre envases reales acierta poco. El camino de código de barras (catálogo + Open Food Facts) es el que resuelve bien el producto empaquetado. Cuando la confianza del OCR no alcanza el umbral, la imagen queda `PROCESADA` sin producto para revisión.

El job es idempotente por `imagenId` y BullMQ reintenta con backoff exponencial; solo al agotar los reintentos la imagen pasa a `FALLIDA`.

### Puesta en marcha

El catálogo `productos` no puede quedar vacío: `emparejar()` contra una tabla sin filas siempre devuelve `null` y toda foto termina en revisión manual. Hay una siembra inicial con 20 productos de la zona:

```bash
psql "$DATABASE_URL" -f apps/api/prisma/seed-productos.sql
```

Verificado contra un PostgreSQL real: las migraciones aplican, `rbac:sync` deja 12 permisos y 6 roles, y un job encolado recorre la cola hasta escribir su resultado en `donacion_imagenes`.

Falta configurar `R2_*` (incluido `R2_PUBLIC_BASE_URL`) y tener el worker corriendo: sin él las fotos se suben pero se quedan en `PENDIENTE`. Guía del bucket: [r2-storage.md](r2-storage.md).

