# Diseño — Piel `html-base` → `apps/web`

> Fecha: 2026-08-16 · Rama: `feat/web-design-system` · Estado: aprobado

## Contexto

`apps/web` (React 19 + Vite + Tailwind v4) ya está **cableado de punta a punta** con
el API NestJS: las 14 pantallas usan datos reales, ninguna es mock. Login con
captcha, organizaciones, acopios, inventario, roles/RBAC y el flujo completo de
donaciones/OCR (subida a R2 → `interpretar` → `confirmar`) funcionan hoy.

`html-base/` es un sistema visual estático nuevo (14 vistas, `app.css` de 549
líneas, JS de módulos) mapeado 1:1 contra estas pantallas. Su capa de dominio
(`data.js`) coincide 1:1 con `packages/shared` (cero drift). Su capa **visual sí
diverge**: es otra generación de marca.

**La tarea no es conectar el backend (ya está). Es aplicar la piel de `html-base`
a la app que ya funciona, sin tocar la lógica.** El HTML se adapta a la lógica,
no al revés.

## Principio rector

`apps/web` sigue siendo el front desplegado. `html-base` pasa a ser **referencia
visual, no se despliega**. La piel lee `OrgContext` y los enums de
`@soschoco/shared`; **nunca** lee `html-base/data.js` (era mock).

### Lógica intocable (la piel se adapta a esto)

| Activo | Ubicación | Regla |
| --- | --- | --- |
| `apiRequest<T>`, `ApiError`, 204/401 handling | `apps/web/src/lib/api.ts` | Sin cambios |
| `useApi()` + 401→`logout()` global | `apps/web/src/lib/useApi.ts` | Sin cambios |
| `AuthProvider`/`useSession()` | `apps/web/src/lib/AuthProvider.tsx` | Sin cambios |
| Guards `RequireAuth→GuestOnly→OrgGate→AppShell/PendingShell` | `apps/web/src/App.tsx`, `components/*` | Sin cambios de comportamiento |
| `OrgGate`: `GET /me`, org activa, `can(permission)` | `apps/web/src/components/OrgGate.tsx` | La piel lee este contexto |
| Servicio de donaciones + subida R2 de 3 pasos | `apps/web/src/features/donaciones/donaciones-service.ts` | Sin cambios (el PUT a R2 no lleva Bearer, se preserva) |
| Máquina `Fase` del OCR, auto-select score ≥ 0.82 | `apps/web/src/pages/NuevaDonacionPage.tsx` | La piel `.steps`/`.resultado` la reviste |
| Lectura EAN (BarcodeDetector→ZXing) | `apps/web/src/features/donaciones/leer-ean.ts` | Sin cambios |
| Filtro de cola de revisión (`PROCESADA && !producto \|\| FALLIDA`) | `apps/web/src/pages/RevisionDonacionesPage.tsx` | Sin cambios |
| Claves de `localStorage` (`soschoco.token/orgId/ultimoAcopio.*/inventoryAcopio/language`) | varias | Sin cambios |
| Contratos de `@soschoco/shared` (enums, RBAC, DTOs) | `packages/shared/src` | Fuente de verdad |

**YAGNI:** no se adopta el hook `useReconocimiento` (hoy sin uso); se mantiene el
`interpretar` sincrónico actual.

## Fundación — puente de tokens

Se reescribe la capa de tokens; **no se importa `app.css`** (choca con el Tailwind
sin Preflight de este repo y duplicaría el sistema de clases).

- Tokens en `apps/web/src/styles/design-system.css` (bloque `@theme`) y
  `apps/web/src/styles.css` (`:root`) → valores de html-base:
  - Verde: `--green #12331A`, `--green-deep #0C2412`, `--green-panel #1A4224`.
  - Dorado (acento nuevo): `--gold #F2C230`, `--gold-deep #9C7208`.
  - Fondo: `--sage #E9EDE2`; `--ink-200 #DFE3D6` (html lo usa pero nunca lo define).
  - Pares de status *soft* (ok/warn/danger/info + `-soft`).
  - Radios píldora/16px; tipografía **Archivo** self-hosted (sin CDN en runtime,
    compatible PWA).
- Restyle de los componentes tipados existentes (`atoms/molecules/organisms/
  templates`) para que rendericen como la piel de html-base.
- Patrones nuevos que trae html-base y hay que construir como componentes:
  cápsula CTA dorada, icono-en-círculo, stepper `.steps` (OCR), `chip-row`
  (selector de acopio), checkbox custom de la matriz de roles.
- Mapa de variantes de badge: reusar `DONACION_ESTADOS[*].variant` →
  `.badge-*` (ya existe como `ESTADO_VARIANTE` en `DonacionesPage.tsx`).

## Tiers de pantallas

- **Tier A — ya sobre el design-system Tailwind** (restyle liviano): Donaciones,
  NuevaDonación, Revisión, SignIn, SignUp, Dashboard, Landing.
- **Tier B — CSS legacy + strings hardcodeados** (reconstruir markup sobre los
  componentes del DS, retirar clases de página de `styles.css`, mover strings a
  i18n): Usuarios, Roles, Acopios, Inventario, y el onboarding
  (StartChoice, Onboarding, WaitingRoom).

## Secuencia de entrega (slice vertical primero)

| PR | Contenido | Prueba end-to-end |
| --- | --- | --- |
| **PR0 — Puente** | Tokens + Archivo + dorado + geometría; restyle de atoms/molecules/organisms/templates (Sidebar, Header, Footer, DataTable, StatCard, Badge, layouts) | `build` verde + revisión visual de 1 pantalla ya-DS |
| **PR1 — Slice vertical** | SignIn(captcha) → Dashboard → Donaciones(cola 4s) → NuevaDonación(**R2→interpretar→confirmar**) → Revisión | login real → org → foto real sube a R2, se interpreta, aparece en la cola |
| **PR2 — Resto Tier A** | Landing (+fix link muerto `/donaciones`), SignUp, StartChoice, Onboarding, Pendiente | health en vivo, registro→409, `POST /organizations`→`/app/acopios` |
| **PR3 — Tier B legacy** | Usuarios, Roles (matriz), Acopios (+fix default `flujo`), Inventario | RBAC real, PUT permisos, CRUD acopios/inventario round-trip |

Cada PR cierra con `pnpm lint && pnpm typecheck && pnpm build && pnpm test`,
verificación en vivo y **changeset** (regla del repo). Commits sin
`Co-Authored-By`.

## i18n (limpiar todo en este pase)

- Mover a catálogos los strings hardcodeados (signup, onboarding, inventario,
  acopios, landing).
- Terminar las **21 claves EN** sin traducir.
- Claves en inglés; vocabulario de dominio en español; `es.json` es la fuente de
  tipos (una clave faltante rompe el `typecheck` — se usa como guardrail).

## Bugs corregidos dentro del reskin (changeset propio)

1. Default de `flujo` en Acopios (`RECIBIR` vs `AMBOS`): reconciliar contra el
   enum de `shared`/el API.
2. Link muerto a `/donaciones` en la landing: corregir la ruta o quitarlo.

## Criterios de aceptación (verificación en vivo, por pantalla)

| Pantalla | Ancla de verificación |
| --- | --- |
| Landing | `fetchApiHealth()` mueve ambos ítems live→ok; toast PWA una vez por sesión; links sin 404 |
| SignIn | `GET /auth/captcha` renderiza SVG del server; `POST /auth/login`→`setSession`→`/app`; captcha malo refresca |
| SignUp | `POST /auth/register`→`/empezar`; duplicado→409 en el alert |
| StartChoice/Pendiente | `refresh()`=`GET /me` con membresías → OrgGate redirige `/app`; 0 membresías queda pendiente |
| Onboarding | `POST /organizations`→`storeOrgId`→`refresh()`→`/app/acopios`; `OTRO` revela `tipoDetalle` |
| Dashboard | contexto de OrgGate: nombre de org + `roleName`; `<select>` de org persiste `soschoco.orgId` |
| Usuarios | `GET members`+`GET /roles`; invitar correo no registrado→server rechaza; PATCH rol; DELETE→baja+reactivar; `can('members:*')` oculta controles |
| Roles | toggle de permiso→`PUT` persiste al recargar; `administrador_acopio` bloqueado; borrar bloqueado con miembros asignados |
| Acopios | `GET acopios`; POST crea; PATCH edita; baja→reactivar; default de `flujo` correcto |
| Inventario | chip de acopio persiste (`soschoco.inventoryAcopio`); `GET .../inventory`; stats/alertas computan; `#sin-acopio` sin acopio activo; POST/PATCH round-trip |
| Donaciones | `listarImagenes` (cursor); poll 4s mientras `enCola>0`; stats+banner; "Cargar más" |
| NuevaDonación | cadena completa: `subirFoto`(POST ruta→PUT R2→POST registro)→`interpretarImagen`→`Resultado`(auto-select ≥0.82 / radios de merge)→`confirmarDonacion` requiere `acopioId`; EAN vía `leerEanDeFoto` o manual 8–14 díg.; `.steps` refleja la fase real |
| Revisión | cola filtrada; `corregirProducto` saca la fila; `reprocesar` saca la fila; spinner por fila |

**Gates transversales:** `pnpm lint && pnpm typecheck && pnpm build && pnpm test`;
cualquier clave i18n removida/renombrada rompe el `typecheck`; 401 en cualquier
llamada desloguea (`useApi.ts`).

## Verificación en vivo — logística

Levantar `docker compose up postgres redis -d` + `pnpm dev` (API + web). Para el
OCR **completo** el `.env` necesita `R2_*` y `VISION_API_KEY`; sin ellos el flujo
cae a *noop* (formulario manual) y se verifica igual salvo la visión real. No se
leen valores de `.env`.

## Fuera de alcance

- Módulo de Envíos (contenedor `/envios` pendiente en el backend): la landing lo
  muestra como "próximamente", se preserva ese estado.
- Migración a arquitectura multi-contenedor de fronts: se mantiene una sola SPA.
- Cookie httpOnly / rate-limit de login: no forman parte del reskin.
- Cambios de esquema Prisma, worker u OCR de servidor.

## Riesgos y mitigación

- **Regresión en donaciones (ya funciona):** el slice va temprano, con
  restyle-en-sitio (mínimo cambio de markup), verificado en vivo antes de seguir.
- **i18n:** renombrar claves rompe `typecheck` → red de seguridad, no obstáculo.
- **Archivo/PWA:** self-host para no depender de red en runtime.
- **Preflight:** no se importa `app.css` para no reintroducir el reset que el
  repo omite a propósito.

## Documentación

Si el cambio de design-system altera stack/arquitectura documentada, se actualiza
`docs/estado-actual.md` **en el mismo commit** (regla del repo).
