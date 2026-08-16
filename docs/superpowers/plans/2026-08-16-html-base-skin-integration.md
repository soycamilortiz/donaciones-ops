# html-base Skin Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the `html-base` visual system as the skin of the already-wired `apps/web` React app without changing any business logic.

**Architecture:** Re-token both token sources in one bridge (`design-system.css` `@theme` + `styles.css` `:root`) so the whole app shifts to the html-base palette at once; then restyle DS-based screens in place and rebuild the 4 legacy pages' markup onto the existing typed components. The React logic (API client, hooks, auth/org guards, OCR flow, RBAC) is the source of truth and is not touched.

**Tech Stack:** React 19, Vite 7, Tailwind v4 (no Preflight), TypeScript strict, `@soschoco/shared`, i18next, Biome.

---

## Preconditions (read before Task 1)

- Spec: `docs/superpowers/specs/2026-08-16-html-base-skin-integration-design.md`.
- Token source (target values): `html-base/assets/app.css:6-38`.
- Token sinks (to rewrite): `apps/web/src/styles/design-system.css:16-59` (`@theme`) and `apps/web/src/styles.css:1-16` (`:root`).
- **Never touch** (logic): `apps/web/src/lib/{api,useApi,AuthProvider,health,constants,utils}.ts`, `apps/web/src/components/OrgGate.tsx`, `apps/web/src/features/donaciones/*`, route guards in `App.tsx`, `@soschoco/shared`.
- Project gate every task ends on: `pnpm lint && pnpm typecheck && pnpm build && pnpm test` (run from repo root).
- Commits: Conventional Commits, **no** `Co-Authored-By` line. Each PR adds a changeset (`npm run changeset` at root) before its final commit.
- Do not stage `env.txt`. Do not read `.env` values.

## File Structure

| File | Responsibility | PR |
| --- | --- | --- |
| `apps/web/package.json` | add `@fontsource-variable/archivo` dep | PR0 |
| `apps/web/src/main.tsx` | import Archivo font | PR0 |
| `apps/web/src/styles/design-system.css` | `@theme` tokens → html-base palette/geometry/font | PR0 |
| `apps/web/src/styles.css` | `:root` vars → html-base values; legacy-page classes restyle | PR0 (`:root`), PR3 (page classes) |
| `apps/web/src/components/atoms/**` | Button/Badge/Input/etc. geometry + gold CTA | PR0 |
| `apps/web/src/components/organisms/{Sidebar,Header,Footer,DataTable}/**` | shell chrome to html-base look | PR0 |
| `apps/web/src/components/molecules/{StatCard,SearchBar,NavItem,ConfirmDialog,FormField}/**` | restyle | PR0 |
| `apps/web/src/pages/SignInPage.tsx` | slice screen | PR1 |
| `apps/web/src/pages/Dashboard.tsx` | slice screen | PR1 |
| `apps/web/src/pages/DonacionesPage.tsx` | slice screen | PR1 |
| `apps/web/src/pages/NuevaDonacionPage.tsx` | slice screen (`.steps` stepper) | PR1 |
| `apps/web/src/pages/RevisionDonacionesPage.tsx` | slice screen | PR1 |
| `apps/web/src/pages/{Landing,SignUpPage,StartChoice,Onboarding,WaitingRoom}.tsx` | Tier A rest | PR2 |
| `apps/web/src/pages/{UsersPage,RolesPage,AcopiosPage,InventoryPage}.tsx` | Tier B legacy rebuild | PR3 |
| `apps/web/src/i18n/locales/{es,en}.json` | move hardcoded strings; finish 21 EN values | PR2, PR3 |
| `docs/estado-actual.md` | note design-system change if stack-relevant | PR0 |

---

## PR0 — Token bridge (foundation)

**Goal:** One reconciliation that repaints the whole app in the html-base palette + geometry + Archivo, and adjusts shared components. No page markup changes yet.

### Task 0.1: Add and load the Archivo font

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/main.tsx:1` (top imports)

- [ ] **Step 1: Add the dependency**

Run (from repo root, targeting the web workspace):
```bash
pnpm --filter web add @fontsource-variable/archivo
```
Expected: `@fontsource-variable/archivo` appears under `dependencies` in `apps/web/package.json`; `pnpm-lock.yaml` updates.

- [ ] **Step 2: Import the font before the app styles**

At the very top of `apps/web/src/main.tsx`, add as the first import line:
```ts
import "@fontsource-variable/archivo";
```
(Keep it above the existing `./styles/design-system.css` / CSS import so the font face is registered before first paint.)

- [ ] **Step 3: Verify build resolves the font**

Run: `pnpm --filter web build`
Expected: build succeeds; no "cannot resolve @fontsource-variable/archivo".

- [ ] **Step 4: Commit**
```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/src/main.tsx
git commit -m "feat(web): load Archivo variable font for the new skin"
```

### Task 0.2: Rewrite the Tailwind `@theme` tokens

**Files:**
- Modify: `apps/web/src/styles/design-system.css:16-59`

- [ ] **Step 1: Replace the `@theme` block**

Replace the current `@theme { ... }` (lines 16-59) with:
```css
@theme {
  --color-background: #E9EDE2;          /* sage */
  --color-foreground: #1B241C;          /* ink */
  --color-card: #FFFDF8;                /* white */
  --color-card-foreground: #1B241C;
  --color-popover: #FFFDF8;
  --color-popover-foreground: #1B241C;
  --color-muted: #E6E9DE;               /* ink-150 */
  --color-muted-foreground: #5E6B5E;    /* muted */

  --color-primary: #12331A;             /* green */
  --color-primary-foreground: #F4F1E8;  /* cream */
  --color-primary-deep: #0C2412;        /* green-deep */
  --color-primary-panel: #1A4224;       /* green-panel */
  --color-secondary: #E6E9DE;
  --color-secondary-foreground: #1B241C;
  --color-accent: #F2C230;              /* gold */
  --color-accent-foreground: #9C7208;   /* gold-deep */

  --color-success: #1D7A46;             /* ok */
  --color-success-foreground: #FFFDF8;
  --color-success-soft: #DDEBE3;
  --color-warning: #B7791F;             /* warn */
  --color-warning-foreground: #FFFDF8;
  --color-warning-soft: #F4EBDD;
  --color-error: #B3261E;               /* danger */
  --color-error-foreground: #FFFDF8;
  --color-error-soft: #F4DEDD;
  --color-info: #35688F;                /* info */
  --color-info-foreground: #FFFDF8;
  --color-info-soft: #E1E8EE;
  --color-accent-soft: #FDF3D6;         /* gold-soft */

  --color-border: #DFE3D6;              /* line */
  --color-input: #DFE3D6;
  --color-ring: #12331A;

  --font-sans: "Archivo Variable", "Archivo", "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, Consolas, monospace;

  --radius-sm: 0.5rem;                  /* 8px */
  --radius-md: 0.75rem;                 /* 12px — inputs */
  --radius-lg: 1rem;                    /* 16px — cards */
  --radius-xl: 1.25rem;                 /* 20px */
  --radius-pill: 999px;

  --shadow-xs: 0 1px 2px 0 rgb(18 51 26 / 0.05);
  --shadow-sm: 0 1px 3px 0 rgb(18 51 26 / 0.08), 0 1px 2px -1px rgb(18 51 26 / 0.08);
  --shadow-md: 0 4px 6px -1px rgb(18 51 26 / 0.08), 0 2px 4px -2px rgb(18 51 26 / 0.08);
  --shadow-lg: 0 10px 15px -3px rgb(18 51 26 / 0.08), 0 4px 6px -4px rgb(18 51 26 / 0.08);
  --shadow-xl: 0 20px 25px -5px rgb(18 51 26 / 0.1);
}
```

- [ ] **Step 2: Verify build + typecheck**

Run: `pnpm --filter web build`
Expected: success. (New `--color-*-soft` and `--radius-pill` tokens generate `bg-success-soft`, `rounded-pill` utilities.)

- [ ] **Step 3: Commit**
```bash
git add apps/web/src/styles/design-system.css
git commit -m "feat(web): retoken design-system @theme to html-base palette and geometry"
```

### Task 0.3: Rewrite the legacy `:root` variables

**Files:**
- Modify: `apps/web/src/styles.css:1-16`

- [ ] **Step 1: Replace the `:root` block**

Replace lines 1-16 with:
```css
:root {
  color-scheme: light;
  --bg: #E9EDE2;          /* sage */
  --ink: #1B241C;
  --muted: #5E6B5E;
  --line: #DFE3D6;
  --panel: #FFFDF8;       /* white */
  --accent: #12331A;      /* green */
  --gold: #F2C230;
  --gold-deep: #9C7208;
  --ok: #1D7A46;
  --down: #B3261E;
  --wait: #B7791F;
  font-family: "Archivo Variable", "Archivo", "Helvetica Neue", Arial, sans-serif;
  line-height: 1.5;
  color: var(--ink);
  background: var(--bg);
}
```

- [ ] **Step 2: Verify no regression on legacy pages**

Run: `pnpm --filter web build`
Expected: success. Every legacy page (`--bg/--ink/--accent/...`) now paints in the new palette without markup changes.

- [ ] **Step 3: Commit**
```bash
git add apps/web/src/styles.css
git commit -m "feat(web): retoken legacy :root variables to html-base palette"
```

### Task 0.4: Restyle shared components to the html-base skin

**Files (each its own commit-sized step):**
- `apps/web/src/components/atoms/Button/Button.tsx` — pill radius, gold primary CTA (`bg-accent text-accent-foreground`), optional `.btn-cap` gold-icon-in-circle affordance; keep all props/types in `Button.types.ts`.
- `apps/web/src/components/atoms/Badge/Badge.tsx` — soft status pairs (`bg-*-soft` + colored text), pill radius; keep the 4 `DonacionImagenEstado` variants + OCR result variants intact.
- `apps/web/src/components/atoms/Input/Input.tsx` — 12px radius, `--color-border`, 44px min height preserved.
- `apps/web/src/components/atoms/{Avatar,Divider,Icon,Skeleton,Spinner}/*` — geometry/color only.
- `apps/web/src/components/molecules/{StatCard,SearchBar,NavItem,FormField,ConfirmDialog}/*` — card radius 16px, gold accents where html-base uses them.
- `apps/web/src/components/organisms/{Sidebar,Header,Footer,DataTable}/*` — Sidebar to `--color-primary` (deep green) bg with cream logo + active-state; DataTable header/rows to html-base geometry; Footer/Header chrome.
- `apps/web/src/components/templates/{AuthLayout,DashboardLayout,LandingLayout}/*` — background sage, spacing.

**Constraint:** change className/token usage and structure only. Do **not** change component prop signatures (`*.types.ts` stays source of truth), event handlers, or exported names — pages depend on them.

- [ ] **Step 1:** For each component above, read the current file, then adjust Tailwind classes / tokens to match `html-base/assets/app.css` for that element (buttons `app.css:89-135`, badges/status, sidebar `.sb-*`, table `.td-*`, cards `.stat`/`.card`). Keep the accessibility rules from the spec (44px targets, focus-visible, `role="alert"`, reduced-motion).
- [ ] **Step 2:** After each cluster (atoms, then molecules, then organisms, then templates), run `pnpm --filter web build && pnpm --filter web lint`. Expected: pass.
- [ ] **Step 3:** Commit per cluster:
```bash
git add apps/web/src/components/atoms
git commit -m "feat(web): restyle atoms to html-base skin"
# repeat for molecules / organisms / templates
```

### Task 0.5: Docs + changeset + PR0 close

- [ ] **Step 1:** If the palette/font change is stack-relevant, add a one-line note to `docs/estado-actual.md` under "Shell (apps/web)" describing the new token palette + Archivo. Commit with the code that motivates it.
- [ ] **Step 2:** `npm run changeset` (patch, package `soschoco` / web) describing "retoken web to html-base skin". Commit.
- [ ] **Step 3: Full gate**

Run: `pnpm lint && pnpm typecheck && pnpm build && pnpm test`
Expected: all green.

- [ ] **Step 4: Live check (foundation)**

Run: `docker compose up postgres redis -d` then `pnpm dev`. Open the app; confirm background is sage, primary is deep green, buttons are gold pills, Archivo renders. No console errors.

---

## PR1 — Vertical slice (login → dashboard → donaciones → nueva → revisión)

**Goal:** Prove the skin end-to-end on the real flow. These screens are already on the DS, so work is markup/geometry + the new `.steps` stepper; logic stays.

For **every** PR1 task: read the current page, apply the html-base structure for that screen (from `html-base/<screen>.html`), keep all API calls / hooks / state machines exactly, replace ad-hoc classes with DS components + tokens, and move any hardcoded string to i18n.

### Task 1.1: SignInPage
**Files:** Modify `apps/web/src/pages/SignInPage.tsx`; target `html-base/sign-in.html`.
- [ ] Read page + target. Keep `GET /auth/captcha` (server SVG) and `POST /auth/login`→`setSession`→`/app`. Only restyle to `.auth-card` (≤460px, `AuthLayout`), gold "Ingresar" CTA, "Otro" captcha refresh, 8h/5min `.note`. **Do not** replace the server captcha with html-base's client `captchaSvg()`.
- [ ] `pnpm --filter web build && pnpm --filter web lint` → pass.
- [ ] Commit: `feat(web): restyle sign-in to html-base skin`.

### Task 1.2: Dashboard
**Files:** Modify `apps/web/src/pages/Dashboard.tsx`; target `html-base/app.html`.
- [ ] Keep OrgGate context (org name, `roleName`, org `<select>` persisting `soschoco.orgId`). Restyle to `.page-head` + `.module-grid` (4 cards, Donaciones intentionally omitted). Strings via `dashboard.*` keys.
- [ ] Build + lint → pass. Commit: `feat(web): restyle dashboard to html-base skin`.

### Task 1.3: DonacionesPage
**Files:** Modify `apps/web/src/pages/DonacionesPage.tsx`; target `html-base/donaciones.html`.
- [ ] Keep `listarImagenes` cursor pagination, 4s poll while `enCola>0`, `ESTADO_VARIANTE` badge map, "Cargar más". Restyle stats to `.stat`, thumbs, warn banner → link to `/app/donaciones/revision`. Drop html-base's fake `avanzarCola()`.
- [ ] Build + lint → pass. Commit: `feat(web): restyle donaciones list to html-base skin`.

### Task 1.4: NuevaDonacionPage (+ `.steps` stepper)
**Files:** Modify `apps/web/src/pages/NuevaDonacionPage.tsx`; target `html-base/donaciones-nueva.html`.
- [ ] Keep the `Fase` machine (`inicio→subiendo→reconociendo→listo|error`), `subirFoto` (R2 3-step), `interpretarImagen`, `Resultado` (score≥0.82 auto-select, merge radios, qty/acopio validation), `leerEanDeFoto`, `confirmarDonacion` requiring `acopioId`.
- [ ] Add a presentational `.steps` stepper component driven by the real `Fase` value (no new logic). Restyle `.capture-zone`, `.resultado` ok/warn/err, `.conf` meter. Do **not** randomize outcomes.
- [ ] Build + lint → pass. Commit: `feat(web): restyle nueva-donacion with real-fase stepper`.

### Task 1.5: RevisionDonacionesPage
**Files:** Modify `apps/web/src/pages/RevisionDonacionesPage.tsx`; target `html-base/donaciones-revision.html`.
- [ ] Keep filter `PROCESADA && !producto || FALLIDA`, `listarProductos`, `corregirProducto`/`reprocesar` (row removal), per-row `guardando` lock. Restyle to `.review-card`/`.thumb-lg`/product `<select>`.
- [ ] Build + lint → pass. Commit: `feat(web): restyle revision queue to html-base skin`.

### Task 1.6: PR1 close — changeset + full gate + live slice verification
- [ ] `npm run changeset` (web, "restyle donaciones vertical slice"). Commit.
- [ ] `pnpm lint && pnpm typecheck && pnpm build && pnpm test` → green.
- [ ] **Live end-to-end:** with backend running (Postgres+Redis+API; R2_*/VISION_API_KEY if available, else noop manual form), perform: real login (captcha) → land `/app` → open `/app/donaciones` → `/app/donaciones/nueva` → upload a photo → interpret → confirm with an acopio → confirm it appears in the donaciones list/queue. Record result in the PR description. If R2/VISION absent, verify the manual (noop) path and note the OCR-vision gap explicitly.

**STOP after PR1: review the slice live before expanding PR2/PR3 to step level.**

---

## PR2 — Tier A rest (Landing, SignUp, StartChoice, Onboarding, WaitingRoom)

**Goal:** Finish the DS-adjacent screens + clear their i18n debt + fix the landing dead link. Expand each task to step level after PR1 is verified.

Task outline (one screen per task, same pattern as PR1: read → restyle to `html-base/<screen>.html` → preserve logic → i18n → build+lint → commit):
- **2.1 Landing** (`Landing.tsx` / `index.html`): keep `fetchApiHealth()` live status; `.public-bar`+`.hero`+`.status-strip[aria-live]`+`.module-grid` (one `.module-soon` for Envíos); once-per-session PWA toast. **Fix the dead `/donaciones` link** (point to real route or remove). Move all landing strings to a new `landing.*` i18n namespace.
- **2.2 SignUp** (`SignUpPage.tsx` / `sign-up.html`): keep `POST /auth/register`, username `pattern [a-zA-Z0-9._]+`, password-match, 409 duplicate → alert. Move hardcoded strings to i18n.
- **2.3 StartChoice** (`StartChoice.tsx` / `empezar.html`): `.choice-grid` 2 cards, `#mi-correo` from context. Fold inline `.pending` styles into a shared onboarding layout.
- **2.4 Onboarding** (`Onboarding.tsx` / `empezar-organizacion.html`): keep `POST /organizations`→`storeOrgId`→`refresh()`→`/app/acopios`; conditional `tipoDetalle` when `tipo=OTRO` (`.cond` gold panel). i18n the field labels.
- **2.5 WaitingRoom** (`WaitingRoom.tsx` / `pendiente.html`): `.wait-art`+`.mail-box`+"recargar" calling `refresh()` once. Do **not** port html-base's fake 2-attempt poll.
- **2.6 i18n EN pass:** translate the 21 remaining Spanish EN values in `en.json`.
- **2.7 close:** changeset + full gate + live verification of each anchor (health, register→409, org create→acopios).

## PR3 — Tier B legacy rebuild (Usuarios, Roles, Acopios, Inventario)

**Goal:** Rebuild the 4 legacy pages' markup onto DS components, retire their `styles.css` page classes, clear i18n debt, fix the `flujo` default bug. Expand to step level after PR1.

Task outline (one screen per task):
- **3.1 UsersPage** (`usuarios.html`): keep `GET members`+`GET /roles`, invite (server enforces "email must pre-exist"), role PATCH, soft-delete/reactivate, `can('members:*')` gates. Rebuild to 5-col table + invite form + inline role `<select>` + baja `ConfirmDialog`. Retire `.field`/legacy table classes. i18n all labels.
- **3.2 RolesPage** (`roles.html`): keep `GET /roles`+`/permissions`, `PUT/PATCH/POST/DELETE`, optimistic `setRoles`, `administrador_acopio` locked, delete-blocked-while-members. Rebuild to `.matrix-grid` (`280px repeat(n,1fr)`) with `.mbox` custom checkbox. Highest care — most complex screen.
- **3.3 AcopiosPage** (`acopios.html`): keep `GET acopios`+CRUD, single-form create/edit remount via `key`, soft-delete/reactivate. Rebuild to `.cols` list+form. **Fix `flujo` default** (reconcile `RECIBIR` vs `AMBOS` against the `AcopioFlujo` enum in `@soschoco/shared` and the API DTO default). Add a test for the corrected default (see Task 3.5). i18n labels.
- **3.4 InventoryPage** (`inventario.html`): keep `GET acopios`+`GET .../inventory`, `localStorage['soschoco.inventoryAcopio']`, client stats/filters/`soon()`, `#sin-acopio` empty-state gate, POST/PATCH, custom focus-trap modal (or swap to `ConfirmDialog`/DS modal keeping focus-trap). Rebuild to `.chip-row` + 5 `.stat` + `.toolbar` + 6-col table + `.modal-wide`. i18n labels.
- **3.5 Acopios flujo-default test:** add/adjust a unit or component test asserting the create form's default `flujo` matches the shared enum/API default. Run it red → fix → green.
- **3.6 close:** changeset + full gate + live verification of each anchor (RBAC, PUT permissions persistence, CRUD round-trips, inventory chip persistence).

---

## Self-Review (author checklist — completed)

- **Spec coverage:** token bridge (PR0) ✓; vertical slice (PR1) ✓; Tier A rest + i18n + dead-link fix (PR2) ✓; Tier B rebuild + flujo bug + i18n (PR3) ✓; logic preservation map referenced in each task ✓; per-screen acceptance anchors carried into task verification ✓; changesets + no-`Co-Authored-By` + estado-actual update rule ✓.
- **Placeholders:** PR0 fully concrete with real CSS. PR2/PR3 are intentionally task-level outlines to be expanded to steps **after** PR1 live verification (incremental validation) — this is a scoping decision, not a missing detail; each still names files, target html, preserved logic, and verification.
- **Type consistency:** component prop signatures (`*.types.ts`) are explicitly frozen; only classes/tokens change. New CSS tokens (`--color-*-soft`, `--radius-pill`) are additive.
- **Naming:** `Fase`, `Resultado`, `ESTADO_VARIANTE`, `soschoco.inventoryAcopio`, `AcopioFlujo` used consistently and match the codebase per the mapping dossier.
