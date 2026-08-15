# Diseño — Frontend `apps/donaciones` (React puro + design system atómico)

- **Fecha:** 2026-08-15
- **Estado:** Aprobado (diseño) — pendiente de plan de implementación
- **Autor:** brainstorming colaborativo (soycamilortiz + Claude)
- **Repo:** SOS Chocó (monorepo, rama `staging/co`)

## Contexto

El monorepo SOS Chocó usa arquitectura **microfrontend por contenedor**: cada solución es su
propio contenedor Docker y Traefik rutea por path (`/` → `apps/web` shell, `/api` → NestJS,
y `/donaciones` · `/acopio` · `/envios` como contenedores futuros). Los fronts no se hablan
entre sí; el API es la fuente de verdad. `docs/estado-actual.md` deja el design system como
capa futura ("más adelante si hace falta").

Queremos adelantar esa capa montando el **primer front de dominio** en React puro (Vite),
con mayor control que un framework full-stack, bajo un **design system atómico**. La base del
design system ya fue diseñada previamente (Tailwind v4, ~18 componentes atoms→templates) y se
reutiliza portándola desde el commit `efdd581`.

## Objetivos

1. Nueva app `apps/donaciones/` (contenedor propio, hermano de `apps/web`) en Vite + React 19 + TS strict.
2. Design system atómico completo (atoms → templates) sobre Tailwind v4, portado y sin acoplamiento a Next.
3. Skeleton funcional del módulo donaciones: dashboard, listado, detalle, alta, y auth (login/register), con **data mock**.
4. `npm run dev` corriendo en `:5173`; `npm run build` limpio.

## No-objetivos (por ahora)

- **No** tocar `apps/web`, `apps/api`, `docker-compose.yml`, `infra/traefik/*` ni `docs/`.
- **No** wire a Docker/Traefik todavía (contenedor, `base: /donaciones/`, ruta Traefik → fase posterior).
- **No** consumir endpoints reales del API (el módulo donaciones aún no existe en NestJS); se usa mock + `api` client listo.
- **No** crear un `packages/ui` compartido ni configurar workspaces (se decidió mantener el design system dentro de la app).

## Decisiones cerradas (brainstorming)

| Decisión | Elección |
| --- | --- |
| Placement | Contenedor nuevo `apps/donaciones` (patrón microfrontend documentado) |
| Base de estilos | Tailwind v4 + **reutilizar** los componentes de `efdd581` |
| Integración | **Solo app Vite en dev (5173)**; Docker/Traefik después |
| Alcance funcional | Enfoque A: skeleton funcional del módulo con pantallas de dominio + auth (mock) |

## Stack

Vite 7 · React 19 · TypeScript strict · Tailwind v4 (`@tailwindcss/vite`) · `react-router-dom` v7 ·
`clsx` + `tailwind-merge` · `zod` (validación de forms) · `@fontsource-variable/geist` (fuentes
self-hosted que respetan los tokens; alternativa: system stack). Versiones alineadas con `apps/web`.

## Estructura

```
apps/donaciones/
  index.html
  vite.config.ts            # @vitejs/plugin-react + @tailwindcss/vite; proxy dev /api → http://localhost:3000
  tsconfig.json             # strict, paths "@/*" → src/*
  package.json              # scripts: dev, build (tsc --noEmit && vite build), preview
  src/
    main.tsx                # ReactDOM.createRoot + <RouterProvider>
    router.tsx              # definición de rutas con layout routes anidadas
    styles/globals.css      # @import "tailwindcss" + @theme (tokens portados) + capa base
    lib/
      utils.ts              # cn() (clsx + tailwind-merge) — copia sin cambios
      api.ts                # fetch client tipado → VITE_API_URL (/api)
    config/
      env.ts                # zod sobre import.meta.env (VITE_*)
    components/
      atoms/ molecules/ organisms/ templates/   # portados de efdd581 (de-Next-ificados)
    features/
      donaciones/           # pantallas del dominio + donaciones-service (mock)
      auth/                 # login/register (usan AuthLayout)
    types/                  # tipos globales
    hooks/                  # useMediaQuery, etc.
```

Regla de aislamiento: cada componente conserva su carpeta con `Componente.tsx` + `Componente.types.ts`
+ `index.ts`, y barrels por nivel. Todo cambio queda contenido en `apps/donaciones/`.

## Port del design system (de-Next-ificación)

Se recuperan los 18 componentes de `efdd581` y se adapta lo acoplado a Next:

| Next (original) | → Vite / react puro |
| --- | --- |
| `next/link` `<Link href>` | `react-router` `<Link to>` |
| `next/image` `<Image>` | `<img>` (o átomo `Img` fino) |
| `next/font` (Geist) | `@fontsource-variable/geist`; tokens intactos |
| `usePathname()` (NavItem) | `useLocation().pathname` de react-router |
| Server/async pages, export `metadata` | componentes normales + hooks de datos; título vía efecto (o `react-helmet` opcional) |
| route groups `(auth)/(dashboard)` | rutas anidadas con *layout routes* |

Los tokens (`@theme` + CSS vars, light/dark) y `cn()` se copian **sin cambios**: Tailwind v4 es
idéntico entre Next y Vite. Inventario portado:

- **Atoms:** Button, Input, Badge, Avatar, Icon, Spinner, Divider
- **Molecules:** FormField, SearchBar, NavItem, StatCard
- **Organisms:** Header, Sidebar, DataTable, Footer
- **Templates:** DashboardLayout, AuthLayout, LandingLayout

## Pantallas y routing (mock data, base `/` en dev)

| Ruta | Pantalla | Template / componentes |
| --- | --- | --- |
| `/` | Dashboard | DashboardLayout + StatCard×4 + DataTable de donaciones |
| `/donaciones` | Listado | DashboardLayout + DataTable + SearchBar |
| `/donaciones/:id` | Detalle | DashboardLayout + card de detalle |
| `/donaciones/nueva` | Alta | DashboardLayout + FormField + Input + Button + zod |
| `/login` | Ingreso | AuthLayout + form |
| `/register` | Registro | AuthLayout + form |

`NavItem` usa `useLocation()` para estado activo. Rutas de dominio anidadas bajo un layout route
que envuelve con `DashboardLayout`; auth bajo un layout route con `AuthLayout`.

## Datos, env y API client

- `features/donaciones/donaciones-service.ts`: funciones que devuelven filas placeholder tipadas
  (patrón equivalente al `dashboard-service` previo). Fáciles de sustituir por llamadas reales.
- `lib/api.ts`: wrapper `fetch` tipado que retorna `ApiResult<T>`; apunta a `VITE_API_URL`
  (default `/api`, proxeado por Vite a `:3000` en dev, igual que `apps/web`).
- `config/env.ts`: valida `import.meta.env.VITE_API_URL` con zod; falla ruidosamente si es inválida.

## Seguridad / "sin dañar nada"

Cero cambios fuera de `apps/donaciones/`. `apps/web`, `apps/api`, `docker-compose.yml`,
`infra/traefik/*` y `docs/estado-actual.md` quedan intactos. Vite `base` permanece en `/` en dev;
se cambiará a `/donaciones/` cuando se containerice (fase posterior).

## Criterio de "hecho" / verificación

1. `cd apps/donaciones && npm install && npm run dev` levanta en `:5173`.
2. Las 6 pantallas renderizan con el design system portado (light/dark vía tokens).
3. `npm run build` (`tsc --noEmit && vite build`) termina sin errores ni warnings de TS.
4. El stack existente sigue corriendo sin cambios (`docker compose up` no afectado; `git status`
   solo muestra archivos nuevos bajo `apps/donaciones/` y este spec).

## Fases posteriores (fuera de este spec)

- Containerización: `Dockerfile` + `nginx.conf` + `base: /donaciones/` en Vite.
- Wire a Traefik (`routes.yml`, PathPrefix `/donaciones`, prioridad > 1) y servicio en `docker-compose.yml`.
- Módulo `donaciones` real en NestJS + Prisma; reemplazar mock por llamadas al API.
- Auth por cookie de sesión en el origen único.
