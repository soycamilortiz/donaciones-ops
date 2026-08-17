# SOS Chocó — Mobile-First UX Audit (FINAL)

## 1. EXECUTIVE SUMMARY

The app is a two-shell hybrid mid-reskin: the auth/donaciones surfaces use a polished Tailwind design system while the entire authenticated shell (`AppShell`) and the Users/Roles/Acopios/Inventory/onboarding/Landing screens still run on legacy `styles.css`. Touch-target discipline is genuinely good (a 44px minimum is enforced across `.button`/`.linkish`/inputs/selects), and reduced-motion, focus-visible, and `ConfirmDialog` are exemplary — so the foundations are not the problem. The problem is the **feedback loop on writes and the collapse behavior of dense screens on a phone**: mutations across Inventory, Donaciones, and CRUD succeed silently with no toast/optimistic update, save errors literally render *behind* the open modal (`InventoryPage.tsx:369-373`), a mis-scroll on the review `<select>` silently corrupts inventory with no undo (`RevisionDonacionesPage.tsx:173-187`), and the two heaviest field tables (Inventory, Users) never stack to cards so their primary actions sit off-screen one-handed. The biggest risks are therefore **data-integrity risks in the field** (silent/invisible save results and un-undoable mis-assignment) and **stranded users** (the WaitingRoom reload gives zero feedback; Inventory shows a misleading "create an acopio" screen while still loading). Mobile-specific regressions from the new DS compound this: DS `Input` is 14px, so iOS zooms on every field focus, and the DS `DashboardLayout` has no mobile nav at all. Accessibility on the live shell is a flat regression — no `<main>`, no skip link, and no route-change focus on any `/app/*` screen. The single highest-leverage fix is to **introduce one shared feedback primitive — loading state + success toast + optimistic update + in-context error surfacing — and wire it into every mutation**, which neutralizes a whole cluster of Critical/High findings (UX-001, UX-004, UX-005, UX-007, UX-008); the cheapest global win alongside it is the one-line `Input` `text-sm`→`text-base md:text-sm` change that kills iOS zoom on every form.

---

## 2. FINDINGS

### [UX-001] Inventory save/PATCH errors render behind the open modal — a failed save looks like success (Impact: Critical) [MOBILE]
- **Location:** `apps/web/src/pages/InventoryPage.tsx:244-246, 369-373`
- **Flow affected:** Create/edit product → Guardar.
- **Current behavior:** `onSave` catch calls `setError`, but the only `role=alert` node is in the page `<section>` under the `z-index:20` backdrop; `closeForm()` is not called, so the modal covers the error. Submit button is never disabled and shows no spinner during the await.
- **Expected behavior:** Error appears inside the open dialog next to Guardar with `role=alert`; button shows pending state and is disabled while awaiting.
- **User impact:** On flaky field data a failed save is completely silent; the worker assumes it saved, leaves, and the SKU is lost.
- **Fix:** Add `formError`/`saving` state; render `{formError && <p role="alert" className="error">}` above the `.inline-form` buttons *inside* the `<form>`; `disabled={saving}` with "Guardando…" label; clear on `openCreate/openEdit`.

### [UX-002] Inventory 6-column table never collapses to cards; row actions sit off-screen (Impact: Critical) [MOBILE]
- **Location:** `apps/web/src/pages/InventoryPage.tsx:375-444`; `apps/web/src/styles.css:432-434, 649-651`
- **Flow affected:** Browse/act on inventory rows (the heaviest screen).
- **Current behavior:** Native 6-col `<table>` with only `.table-wrap{overflow-x:auto}`; Editar/Dar de baja live in the last column, reachable only by two-finger horizontal scroll, and the product name scrolls out of view while doing so.
- **Expected behavior:** Below ~720px each row becomes a card (name as title, columns as label/value pairs, actions full-width at the bottom), no horizontal scroll.
- **User impact:** The core action of the core screen is impractical one-handed.
- **Fix:** Add a `@media (max-width:720px)` card-stacking block on `.dash-table` (`display:block` rows, `thead` visually hidden, `td::before{content:attr(data-label)}`, `.row-actions{flex-direction:column}` full-width) and add `data-label` to each `<td>`; or migrate to `DataTable`.

### [UX-003] DS Input font-size is 14px → iOS Safari zooms the viewport on every field focus (Impact: Critical) [MOBILE]
- **Location:** `apps/web/src/components/atoms/Input/Input.tsx:8` (`text-sm`)
- **Flow affected:** Every DS form field — SignIn, SignUp, Users create, SearchBar.
- **Current behavior:** Base uses `text-sm` (14px); iOS force-zooms focused inputs under 16px. Legacy bare inputs (`font: inherit` = 16px) are safe, so the DS component is a regression.
- **Expected behavior:** ≥16px on mobile; may drop to 14px only at `md+`.
- **User impact:** Every field tap yanks the page to a zoomed state the user must pinch back out of, repeated per field.
- **Fix:** Swap `text-sm` → `text-base md:text-sm`; verify Textarea/Select paths and any sub-16px bare inputs.

### [UX-004] Waiting-room reload button fails silently on error and looks identical to a dead tap on success (Impact: Critical) [MOBILE]
- **Location:** `apps/web/src/pages/WaitingRoom.tsx:18-23` → `apps/web/src/components/OrgGate.tsx:37-46`
- **Flow affected:** Post-signup with no org → `/pendiente` → "Ya me invitaron, recargar".
- **Current behavior:** `onClick={() => void refresh()}` — no try/catch, no pending/disabled state; a rejection is swallowed by `void`; a success with still-empty membership re-renders the identical screen. Success and failure both look like nothing happened.
- **Expected behavior:** Every tap produces a perceivable change — loading state, `role=alert` on failure, and an explicit "todavía no hay invitación" acknowledgement on a no-op success (matches `pendiente.html`).
- **User impact:** The one screen a stalled new user sits on over a bad connection; with zero feedback they mash the button, assume it is broken, or re-register.
- **Fix:** Add `status: 'idle'|'loading'|'error'`; `handleReload` awaits `refresh()` in try/catch; disable while loading; render `role=alert` on error and an inline idle-after-check message.

### [UX-005] Inventory has no loading state — a misleading "create an acopio first" screen flashes while data loads (Impact: Critical) [MOBILE]
- **Location:** `apps/web/src/pages/InventoryPage.tsx:44-46, 265-275, 388-394`
- **Flow affected:** Load inventory dashboard / switch acopio.
- **Current behavior:** `acopios`/`items` init to `[]`, no loading flag. On first render `activeAcopios.length===0` is true, so the full-page "Primero creá un acopio" CTA (with a navigate-away button) renders until the fetch resolves; table shows "No hay productos" while items are in flight.
- **Expected behavior:** Distinguish loading from empty; show skeletons for chips/stats/rows; only show the CTA after acopios actually loaded and are empty.
- **User impact:** On a slow connection the worker is told they have no warehouses (and pushed off-task) even when acopios exist.
- **Fix:** Add `loading` state, init acopios `null`, guard the early return with `if (!loading && …)`, render skeleton blocks with `aria-busy` and a `prefers-reduced-motion` guard.

### [UX-006] DataTable mobile card-stacking strips column headers from the a11y tree (Impact: Critical) [MOBILE]
- **Location:** `apps/web/src/styles/design-system.css:104-139`; `apps/web/src/components/organisms/DataTable/DataTable.tsx:55-68`
- **Flow affected:** DonacionesPage table (live) and any DataTable under 900px.
- **Current behavior:** `thead{display:none}` removes `<th scope=col>` from the a11y tree; labels come from `td::before{content:attr(data-label)}`, which VoiceOver/TalkBack often do not announce and which is never tied to the value.
- **Expected behavior:** Each stacked cell announces column name + value on a screen reader.
- **User impact:** Blind/low-vision phone users hear bare values ("Camisetas", "40", "Pendiente") with no column context — the table is unusable where the app is meant to be used.
- **Fix:** Emit a real DOM label (`<span className="ds-cell-label sr-only md:hidden">{col.header}: </span>`) instead of `::before`; visually-hide `thead` rather than `display:none`.

---

### [UX-007] Mutations are silent — no optimistic update, no success feedback, and errors land off-screen (Impact: High) [MOBILE]
- **Location:** `UsersPage.tsx:58-101` / `RolesPage.tsx:47-149` / `AcopiosPage.tsx:38-102`; `InventoryPage.tsx:242-263`; `RevisionDonacionesPage.tsx:65-90`; matrix checkbox `RolesPage.tsx:47-67, 258-266`
- **Flow affected:** Invite, role change, permission toggle, acopio/product save, dar-de-baja, review assign/retry.
- **Current behavior:** Every mutation succeeds with no toast/inline confirmation (html-base toasted all of them). The permission checkbox and inventory rows don't flip until the round-trip returns; the error `role=alert` is pinned at panel top, off-screen below a 14-row matrix or a long list; review rows just vanish.
- **Expected behavior:** Optimistic state flip with rollback on error, a transient success toast/live-region, and errors surfaced next to the acted-on control (scrolled into view).
- **User impact:** Over flaky field data the worker can't tell if the write took, so they re-tap (firing duplicate/conflicting requests) or assume failure. Biggest trust gap across the app.
- **Fix:** Add a shared toast + `aria-live` primitive; optimistically update before the request and revert on catch (capture `prev`); call the toast in each success path; on error `alertRef.current?.scrollIntoView({block:'nearest'})`.

### [UX-008] Review-queue product `<select>` writes to inventory the instant the picker commits — no confirm, no undo (Impact: High) [MOBILE]
- **Location:** `apps/web/src/pages/RevisionDonacionesPage.tsx:173-187, 65-78`
- **Flow affected:** Reviewer assigns a product to an unidentified photo on a phone.
- **Current behavior:** `onChange={(e)=>void asignar(imagen.id, e.target.value)}` fires the inventory-mutating PATCH the moment the native wheel picker commits on scroll-end, then removes the row. No confirmation, no undo.
- **Expected behavior:** Separate selection from commit (explicit "Asignar" button), or an undo toast that re-inserts the row and reverts.
- **User impact:** A mis-scroll silently assigns the wrong producto and the row disappears irreversibly — corrupts inventory data in the field.
- **Fix:** Keep the chosen value in state; add a `min-h-11` "Asignar" Button; call `asignar` only on that tap. Alternatively keep auto-commit but show a several-second "Deshacer" toast.

### [UX-009] AppShell has no `<main>` landmark, no skip link, and no route-change focus/scroll management (Impact: High)
- **Location:** `apps/web/src/components/AppShell.tsx:38-49`; route swap at `:48`; `App.tsx:37-46`
- **Flow affected:** Every `/app/*` screen for keyboard/screen-reader users, on every SPA navigation.
- **Current behavior:** Content is a plain `<div className="app-main">` (no `<main>`), no skip link; on navigation focus stays on the tapped NavLink or drops to `<body>`, nothing scrolls to top, nothing is announced. The only real `<main>` (DashboardLayout) is dead code.
- **Expected behavior:** One `<main id="main" tabIndex={-1}>`, a visible-on-focus skip link as first focusable element, and a `useEffect([pathname])` that focuses main and resets scroll.
- **User impact:** SR/switch users re-traverse the whole nav strip every navigation and get no feedback the page changed — costly with gloves/one hand.
- **Fix:** Wrap `<Outlet/>` in `<main id="main" tabIndex={-1} ref={mainRef}>`; add the skip link; `useEffect(()=>{mainRef.current?.focus(); window.scrollTo(0,0)},[pathname])`; add `common.skipToContent` i18n key.

### [UX-010] Recognition is a single blocking await with no timeout/offline handling; the resilient `useReconocimiento` hook is dead code (Impact: High) [MOBILE]
- **Location:** `apps/web/src/pages/NuevaDonacionPage.tsx:77-110, 217-227`; `apps/web/src/features/donaciones/useReconocimiento.ts` (never imported)
- **Flow affected:** Field capture in rain/weak signal; upload succeeds but `/interpretar` stalls or drops.
- **Current behavior:** `onArchivo` does one `await interpretarImagen(...)`; any failure sets a generic error `fase`. No timeout, no retry, and no reassurance that the photo is already saved. The purpose-built polling hook (`limiteMs`, `expirado`, reconnect-friendly) is imported nowhere.
- **Expected behavior:** Tolerate flaky connectivity via the existing hook; on timeout show a non-error "sigue procesando en segundo plano" state; tell the user the photo is already stored.
- **User impact:** A dropped connection shows a scary error even though the upload succeeded; users re-take, creating duplicate donations.
- **Fix:** Wire `useReconocimiento(request, orgId, imagenId)` after `subirFoto`; drive `fase` off `imagen.estado`/`expirado`; add "La foto ya quedó guardada, puedes salir de esta pantalla." to the recognizing block.

### [UX-011] Donaciones auto-poll every 4s reloads only page 1 — wipes loaded pages and resets scroll (Impact: High)
- **Location:** `apps/web/src/pages/DonacionesPage.tsx:39-50, 72-84`
- **Flow affected:** After a capture batch, list open with items still PENDIENTE/PROCESANDO, user has tapped "Cargar más".
- **Current behavior:** The 4s poll calls `cargar()`, which does `setImagenes(pagina.items)` (page 1 only) and resets `cursor`, discarding extra loaded pages and snapping scroll to top.
- **Expected behavior:** Refresh in place without destroying loaded pages/scroll; ideally patch only changed rows by id.
- **User impact:** Exactly when items are in queue, the list churns every 4s so the user can never scroll to older rows.
- **Fix:** Merge by id (`setImagenes(prev=>prev.map(r=>byId.get(r.id) ?? r))`) or re-request `loadedPages*pageSize`; guard against re-fetch while `cargandoMas`.

### [UX-012] Wide ~16-field product modal has no sticky Save, no X close, and no body scroll-lock (Impact: High) [MOBILE]
- **Location:** `apps/web/src/pages/InventoryPage.tsx:446-616`; `apps/web/src/styles.css:667-688`; open effect `:156-200`
- **Flow affected:** Create/edit product on a phone.
- **Current behavior:** ~16 fields in one column; Crear/Cancelar only at the very bottom; no X button (close only via Escape/backdrop-tap/scroll-to-bottom); background `<section>` not scroll-locked.
- **Expected behavior:** Internal-scrolling body with a pinned Save/Cancel footer, a top-right X (≥44px), and body scroll locked while open.
- **User impact:** To save one SKU the worker scrolls ~16 fields then scrolls all the way down again; no obvious way out. High friction on the most frequent write.
- **Fix:** `.modal{display:flex;flex-direction:column;max-height:calc(100dvh - 32px)}`, `.modal-body{overflow:auto;flex:1}`, `.modal-foot{position:sticky;bottom:0}`; add an X `<button aria-label>`; lock `document.body.style.overflow='hidden'` in the open effect; use `100dvh`.

### [UX-013] Roles permission matrix is a ~1160px two-axis scroll grid with inline editing; header row doesn't stick; no mobile pattern (Impact: High) [MOBILE]
- **Location:** `apps/web/src/pages/RolesPage.tsx:167`; `apps/web/src/styles.css:519-531`
- **Flow affected:** Admin grants/revokes a permission from a phone.
- **Current behavior:** 200px sticky permission col + up to 6×160px role cols ≈ 1160px horizontal scroll; `thead` is not `position:sticky`, so after scrolling down 14 rows the role labels are gone while still scrolled sideways; role rename is two tiny live inputs in a 160px header.
- **Expected behavior:** Under ~600px, a role picker (chips/tabs) selecting ONE role then a vertical list of the 14 permissions with a full-width toggle each; at minimum make `thead th` sticky.
- **User impact:** Toggling requires simultaneous horizontal+vertical scrolling with labels gone — the single most punishing screen on a phone.
- **Fix:** Add a `<600px` per-role branch with `role="switch"` toggles; `.matrix thead th{position:sticky;top:0;z-index:2;background:var(--panel)}` (corner cell `z-index:3`); move rename behind an edit affordance.

### [UX-014] Users table never stacks to cards and has no horizontal-scroll container — it overflows the viewport (Impact: High) [MOBILE]
- **Location:** `apps/web/src/pages/UsersPage.tsx:149`
- **Flow affected:** Admin changes a rol or dar de baja on a phone.
- **Current behavior:** Raw 5-col `<table>` with no `.table-wrap` and no card-stacking; the auto-layout table can't shrink below its min-content (email + 44px `<select>`), so the whole page gets horizontal scroll and the rol select is off-screen at rest.
- **Expected behavior:** Below ~600px each row collapses into a stacked card with full-width rol select and dar-de-baja; no page-level horizontal scroll.
- **User impact:** The admin must pan the page sideways to reach the exact controls the screen exists for.
- **Fix:** Adopt `DataTable`, or add `.ds-datatable`/`data-label` hooks, or a `.table-wrap` + a `<600px` `.stacked` block; make the row `<select>` `w-full` in card mode.

### [UX-015] Primary field CTAs sit top-right, out of the one-handed thumb zone; no bottom/sticky capture bar or FAB (Impact: High) [MOBILE]
- **Location:** `DonacionesPage.tsx:154-162`; `NuevaDonacionPage.tsx:132-215`; `InventoryPage.tsx:279-337` (Nuevo producto at `:287-291`)
- **Flow affected:** Start registering a donation / take the photo / create a product.
- **Current behavior:** "Registrar producto"/"Nuevo producto" sit in a top `justify-between`/`justify-end` header (top-right). On NuevaDonacion the capture drop-zone is preceded by header + acopio `<select>` + EAN input, so it starts below the fold on ~360px; Inventory pushes the list below chips + 5 stat tiles + toolbar. Nothing is pinned to the bottom.
- **Expected behavior:** Big capture/create action anchored to the bottom thumb zone (sticky footer / FAB); collapse stats and compact chips to bring the list up.
- **User impact:** The most-used action is in the hardest reach; field users must re-grip or use a second (gloved/occupied) hand.
- **Fix:** Sticky bottom capture bar on NuevaDonacion (`sticky bottom-0 … md:static`); render "Registrar"/"Nuevo producto" as a `fixed bottom-right` FAB under 900px (respect `env(safe-area-inset-bottom)`); make stats a collapsible/scroll strip.

### [UX-016] Confirm button not sticky; the numeric keyboard hides it after editing quantity (Impact: High) [MOBILE]
- **Location:** `apps/web/src/pages/NuevaDonacionPage.tsx:394-421`
- **Flow affected:** After recognition, edit Nombre/Marca/Cantidad → Confirmar.
- **Current behavior:** Confirm is at the very bottom of a long card; editing Cantidad (`type=number`) raises the numeric keyboard which overlaps Confirm, forcing a dismiss+scroll.
- **Expected behavior:** Confirm stays visible above the keyboard via a sticky action bar.
- **User impact:** Extra taps per donation; at field volume this compounds and invites skipping the confirm step.
- **Fix:** Put Confirm in a `sticky bottom-0` footer on small screens; add `enterKeyHint="done"` to quantity; consider optimistic confirm.

### [UX-017] Sign-in/sign-up submit buttons have no loading state — double submission burns the one-time captcha (Impact: High) [MOBILE]
- **Location:** `SignInPage.tsx:20-39, 63-65`; `SignUpPage.tsx:20-48, 107-109`; `lib/api.ts:78-100` (no timeout/AbortController)
- **Flow affected:** Login/registration, first round-trip over rural connectivity.
- **Current behavior:** `Button` supports `isLoading` but neither handler tracks a submitting state, so submit is never disabled/spinning; `apiRequest` has no timeout so a stalled request hangs with the button still tappable.
- **Expected behavior:** Tap disables + spins until settled; a dead connection surfaces a retryable error instead of hanging.
- **User impact:** No visible change after tapping "Entrar" → re-tap fires a second request that consumes the captcha answer, producing a confusing "captcha incorrecto".
- **Fix:** Add `isSubmitting` state, set in try/finally, pass `isLoading`/`disabled` to the Button; add an 8-10s `AbortController` timeout to `apiRequest`.

### [UX-018] Mobile header row doesn't wrap: long email clips Sign out, and Sign out logs out with no confirm in the top mis-tap zone (Impact: High) [MOBILE]
- **Location:** `apps/web/src/components/AppShell.tsx:39-47`; `apps/web/src/styles.css:402-408`; logout at `:44`
- **Flow affected:** Every `/app` top bar on phones.
- **Current behavior:** `.app-header` is `flex; justify-content:flex-end; gap:12px` with no `flex-wrap` and no truncation on the `usuario · correo` span; at 360px the identity + language select + Sign out can't fit, squeezing Sign out toward/off the edge. Sign out calls `logout` immediately (no confirm), and re-auth requires solving a captcha.
- **Expected behavior:** Header wraps; email truncates; Sign out stays reachable and confirms (or is demoted from the corner).
- **User impact:** One-handed users can lose Sign out off-screen or trigger an unconfirmed logout that costs a captcha re-login mid-task.
- **Fix:** `flex-wrap:wrap` on `.app-header`; `min-w-0 truncate` on the identity span; wrap logout in a confirm/Dialog; longer term move identity/lang into the sidebar footer.

### [UX-019] OrgGate loading/error are bare paragraphs — not announced, not recoverable, and leak raw error text (Impact: High)
- **Location:** `apps/web/src/components/OrgGate.tsx:64-70, 83-85`
- **Flow affected:** App boot / `/api/v1/me` on every session.
- **Current behavior:** Loading = `<p>{t('session.loading')}</p>` (no `role=status`, no skeleton, whole app blank). Error = `<p>{error}</p>` with no `role=alert`, no retry, rendering the RAW `err.message` ("Failed to fetch", often English) instead of `session.profileError`; `noActiveOrg` is a dead-end paragraph.
- **Expected behavior:** Loading skeleton or `role=status` region; error `role=alert` with a localized message and a Reintentar button; `noActiveOrg` links to `/empezar`.
- **User impact:** On a dropped connection the user stares at blank text; a fetch failure is a permanent dead-end with an untranslated technical string; SR users hear nothing.
- **Fix:** Add `role=status` loading, `role=alert` error + Reintentar calling `refresh()`, stop rendering `err.message` (log it), add `common.retry`.

### [UX-020] Required fields lack visible markers, aria-required, and inline validation across all forms (Impact: High) [MOBILE]
- **Location:** `InventoryPage.tsx:476-484, 532-543`; `NuevaDonacionPage.tsx:394-417, 302-311`; `Onboarding.tsx:54-85`; `UsersPage.tsx:113-124`; `RolesPage.tsx:284-291`; `AcopiosPage.tsx:158-166`
- **Flow affected:** Every create/edit form (product, donation confirm, org, invite, role, acopio).
- **Current behavior:** Required inputs rely solely on native validation on submit; no `*`/"Obligatorio" marker, no `aria-required`, no inline field-level errors. minLength surfaces only as an unreliable native bubble. The invite email has only an `sr-only` label + a placeholder that vanishes on input. NuevaDonacion's `needAcopio` can only appear AFTER the entire capture+recognition.
- **Expected behavior:** Required fields visibly marked, expose `aria-required`, show inline per-field errors on blur/submit; enforce the acopio precondition before capture.
- **User impact:** Users discover a mandatory field only via a rejected submit after filling the rest; the missing-acopio case forces full rework.
- **Fix:** Route these through `FormField` (renders the required `*`), add `aria-required`, tie errors via `aria-describedby`; gate capture on `acopioId` earlier; keep a visible invite-email label.

### [UX-021] FormField error is not programmatically associated with its input (no id / aria-describedby / aria-invalid) (Impact: High)
- **Location:** `apps/web/src/components/molecules/FormField/FormField.tsx:16-32`
- **Flow affected:** All DS forms with validation (SignUp password/email, Users, etc.).
- **Current behavior:** The error `<p role='alert'>` has no `id`, and the wrapped Input gets no `aria-describedby`/`aria-invalid` (the Input's `invalid` prop is never wired). `role=alert` announces once; tabbing back to the field afterward reveals nothing.
- **Expected behavior:** The invalid control exposes `aria-invalid=true` and `aria-describedby` pointing at the error so it's heard whenever focused.
- **User impact:** SR users correcting fields in any order (common on mobile) can't tell which field is wrong after the initial announce.
- **Fix:** `const errId = useId()`; give the error `id={errId}`; `cloneElement` the child adding `aria-invalid` and `aria-describedby`; mark the `*` `aria-hidden`.

### [UX-022] DS DashboardLayout has no mobile navigation (sidebar `hidden md:flex`, no hamburger/drawer/bottom-nav) (Impact: High) [MOBILE]
- **Location:** `apps/web/src/components/templates/DashboardLayout/DashboardLayout.tsx:24`; `Header.tsx` (no menu toggle)
- **Flow affected:** Any route through the DS shell on a phone (<768px).
- **Current behavior:** The only nav (Sidebar) is `hidden md:flex` and removed entirely below md; Header has no menu button and there's no bottom bar. The live vanilla AppShell degrades to a scroll strip, so adopting DashboardLayout as-is is a hard regression.
- **Expected behavior:** A hamburger opening a focus-trapped slide-over Drawer, or a fixed bottom tab bar for top routes.
- **User impact:** If the DS shell replaces the vanilla one, phone users are stranded on whatever page they land on.
- **Fix:** Add a mobile Drawer (reuse ConfirmDialog's trap/restore, safe-area padding) toggled from Header, or a `fixed bottom-0 inset-x-0 md:hidden` nav with 44px targets + `env(safe-area-inset-bottom)`.

### [UX-023] ZXing barcode library is a static top-level import in the field capture bundle (Impact: High) [MOBILE]
- **Location:** `apps/web/src/features/donaciones/leer-ean.ts:1-2` (used by `NuevaDonacionPage.tsx:17`)
- **Flow affected:** Field phone on 3G/Edge loading the capture page.
- **Current behavior:** `@zxing/browser` + `@zxing/library` (hundreds of KB) ship in the critical path even though `BarcodeDetector` handles most modern phones and ZXing is only the fallback.
- **Expected behavior:** ZXing lazy-loaded only when native `BarcodeDetector` is unavailable/fails.
- **User impact:** Slower first load of the most time-critical field screen on exactly the low-bandwidth connections the team has.
- **Fix:** Dynamic-import ZXing inside `leerConZxing` (`await import('@zxing/browser')`) so it downloads only when `leerConBarcodeDetector` returns null.

### [UX-024] Key navigational links render below the 44px touch target the app's own CSS mandates (Impact: High) [MOBILE]
- **Location:** `Onboarding.tsx:45-47` (Volver); `WaitingRoom.tsx:22` (crear organización); `Landing.tsx:46, 58` (API, Entrar)
- **Flow affected:** Pre-login, thumb-only navigation.
- **Current behavior:** Bare `<Link>`/`<a>` with no `.button`/`.linkish` class; the Onboarding back link inherits `.eyebrow` (~12-16px tall, no padding), the others have no styling beyond `a{color}`. The 44px `.linkish` rule exists but these skip it.
- **Expected behavior:** Every tappable link ≥44×44px, per the in-code field-use comment.
- **User impact:** The "Volver" back-out (the only way out of org creation without losing progress) is the smallest target on screen — missed in gloves/rain.
- **Fix:** Add `className="linkish"` to these four links.

### [UX-025] Captcha image is squeezed by the "Otro captcha" text button on narrow phones (Impact: High) [MOBILE]
- **Location:** `apps/web/src/components/CaptchaFields.tsx:37-55`; `AuthLayout.tsx:16-19`
- **Flow affected:** Sign-in/sign-up on 320-375px phones.
- **Current behavior:** Row is `flex gap-3` with the captcha `flex-1` next to a `Button size="sm"` sized to its label text; combined with AuthLayout's non-responsive `p-8` card padding, the captcha SVG gets ~120-130px vs html-base's ~300px.
- **Expected behavior:** Captcha keeps a generous fixed width regardless of the refresh button label/locale.
- **User impact:** An intentionally-distorted captcha becomes far harder to transcribe when compressed to under half width — worse in sun/rain.
- **Fix:** Give the refresh control a fixed width (`w-[62px] shrink-0`, icon+short label); trim card padding to `p-5 sm:p-8`.

---

### [UX-026] Text/phone/search inputs miss mobile keyboard hints (type/inputMode/enterKeyHint/autocomplete) (Impact: Medium) [MOBILE]
- **Location:** `Onboarding.tsx:54-85` (telefono); `AcopiosPage.tsx:185-188` (telefono), `:177-184` (Municipio/Dirección); `InventoryPage.tsx:592-595` (contacto), `:342-346` (search); `NuevaDonacionPage.tsx:168-178` (EAN), `:402-411` (quantity)
- **Flow affected:** Filling phone/contact/address fields, searching, editing quantity across forms.
- **Current behavior:** Phone/contact fields are plain text (alphabetic keyboard); search has no `type=search`/`enterKeyHint`; quantity uses `type=number` (spinner/locale quirks); EAN lacks `autoComplete=off`/`enterKeyHint`; addresses lack autocomplete tokens.
- **Expected behavior:** `type=tel inputMode=tel autoComplete=tel` on phone; `type=search enterKeyHint=search`; `inputMode=numeric` for counts; address autocomplete tokens.
- **User impact:** Hunting for digits among letters one-handed with gloves; generic Enter key adds taps per item.
- **Fix:** Apply the correct `type`/`inputMode`/`enterKeyHint`/`autoComplete` per field (props already spread through Input).

### [UX-027] Unbounded lists — no virtualization or pagination anywhere (Impact: Medium) [MOBILE]
- **Location:** `RevisionDonacionesPage.tsx:36-52, 132-206` (limite 200, per-card full-catalog `<select>`); `InventoryPage.tsx:396-440`; `UsersPage.tsx:160`; `DataTable.tsx:50-71`
- **Flow affected:** Large inventory/member/review lists on low-end field phones.
- **Current behavior:** Every row/card renders unconditionally; the review queue mounts up to 200 image cards each cloning the full product `<select>` (tens of thousands of DOM nodes + 200 image decodes); Users mounts a full role `<select>` per row.
- **Expected behavior:** Windowing (`@tanstack/react-virtual`) or pagination/load-more; render heavy `<select>` options only on open.
- **User impact:** Jank/freezes on cheap Android exactly when the backlog is large.
- **Fix:** Virtualize/paginate; replace repeated native selects with an on-demand combobox; `decoding="async"` on thumbnails; render row selects lazily.

### [UX-028] Mobile nav strip is not sticky, org switcher/role not compressed, no scroll affordance — wastes the fold (Impact: Medium) [MOBILE]
- **Location:** `apps/web/src/styles.css:477-517`; `AppShell.tsx:14-37`
- **Flow affected:** Every `/app` screen <800px.
- **Current behavior:** At <800px nav becomes `row; overflow-x:auto`, but the brand, full-width org `<select>`, and role `<p>` stay stacked above it (~3 rows); the aside isn't `position:sticky`, so the whole strip scrolls off with a long list; 6 overflowing nav items have no fade/scroll hint.
- **Expected behavior:** Org+role collapse into the nav row (label `sr-only`), the strip is sticky, and there's a scroll affordance.
- **User impact:** Chrome eats the fold; to switch modules from the bottom of a long list the user must scroll all the way up.
- **Fix:** Make the aside `position:sticky; top:0; z-index:30` and `flex-direction:row`; `.field` inline with `sr-only` label; hide/shrink brand+role; add a right-edge mask.

### [UX-029] administrador_acopio permissions are editable and the "no editable" warning banner is missing (Impact: Medium)
- **Location:** `apps/web/src/pages/RolesPage.tsx:198` (only baja gated), missing banner near `:154`
- **Flow affected:** Admin taps a checkbox under the administrador_acopio column.
- **Current behavior:** Live editable checkboxes render for every role including administrador_acopio; only "Dar de baja" is hidden for it. html-base disables the inputs AND shows a warning banner — both dropped.
- **Expected behavior:** administrador_acopio checkboxes disabled/locked plus a persistent warning banner.
- **User impact:** A stray tap can strip the super-admin role's permissions; with silent-success gaps the state is ambiguous — a lockout footgun.
- **Fix:** `const locked = role.slug==='administrador_acopio'; <input disabled={locked}>`; add a `role="note"` alert banner above the table (i18n keys).

### [UX-030] Role delete never sets its busy flag (button stays tappable → double DELETE) and gives no member-still-holds warning (Impact: Medium)
- **Location:** `apps/web/src/pages/RolesPage.tsx:133-149`; `ConfirmDialog ocupado={eliminando}` at `:301`
- **Flow affected:** Admin taps "Dar de baja" on a role and confirms.
- **Current behavior:** `onDelete` only calls `setEliminando(false)` in finally — `setEliminando(true)` is never called, so `ocupado` stays false, the confirm never shows "Procesando…" and stays enabled; the confirm is generic and just relays the API error to the top-of-page alert.
- **Expected behavior:** Set busy before the request; warn/block when active memberships still reference the role, listing them.
- **User impact:** Field double-taps double-submit; the admin isn't told reassignment is a prerequisite, so it just "fails" with an off-screen error.
- **Fix:** Add `setEliminando(true)` at the top of `onDelete`; pass affected members into the dialog description or disable confirm when members still hold the role.

### [UX-031] Acopios "Editar" doesn't scroll to or focus the form, which is far below the list (Impact: Medium) [MOBILE]
- **Location:** `apps/web/src/pages/AcopiosPage.tsx:134` (Editar) → form at `:156`
- **Flow affected:** Admin taps Editar on an acopio near the top of the list on a phone.
- **Current behavior:** `setEditing(row)` repopulates the form but nothing scrolls/focuses; the form sits after the whole list, off-screen.
- **Expected behavior:** Bring the form into view and focus the Nombre input (ideally a bottom-sheet on mobile).
- **User impact:** From the user's viewport nothing happens; they think the button is broken.
- **Fix:** Ref the form/first input; effect keyed on `editing?.id` → `scrollIntoView` + `focus()`; on `<600px` consider a modal overlay.

### [UX-032] Inventory acopio picker wraps (eats vertical space) and uses an incomplete listbox ARIA pattern (Impact: Medium) [MOBILE]
- **Location:** `apps/web/src/pages/InventoryPage.tsx:294-313`; `apps/web/src/styles.css:567-597`
- **Flow affected:** Selecting an acopio.
- **Current behavior:** `flex-wrap:wrap` with 160px chips forms a tall multi-row block; `role=listbox`/`role=option` with no roving tabindex/`aria-activedescendant`; each chip separately tabbable; no `:focus-visible`.
- **Expected behavior:** A single horizontal scroll-snapping strip (or native `<select>`), and a correct listbox/radiogroup model or simple `aria-pressed` buttons.
- **User impact:** With several centres the picker pushes stats/toolbar/list below the fold; SR users are promised a listbox that arrow keys don't drive.
- **Fix:** `@media (max-width:720px){ .acopio-picker{flex-wrap:nowrap;overflow-x:auto;scroll-snap-type:x mandatory} }`; roving tabindex or `aria-pressed` buttons; add `:focus-visible`.

### [UX-033] Product modal doesn't return focus to the trigger on close (Impact: Medium)
- **Location:** `apps/web/src/pages/InventoryPage.tsx:148-151, 156-200`
- **Flow affected:** Create/edit product (keyboard/SR).
- **Current behavior:** Open focuses the first input and traps Tab (good), but on close (Escape/Cancelar/backdrop/save) focus drops to `<body>`; the opener button is never re-focused.
- **Expected behavior:** Store the opener and restore focus to it on close (WCAG 2.4.3).
- **User impact:** Keyboard/SR users are dumped at the top of the document after every add/edit and must re-navigate the list.
- **Fix:** `opener.current = document.activeElement` on open; `opener.current?.focus()` in cleanup; prefer focusing the dialog heading over the first input to avoid forcing the keyboard up.

### [UX-034] No PWA manifest and no service worker — the app is not installable and has zero offline capability (Impact: Medium) [MOBILE]
- **Location:** `apps/web/index.html:1-16`
- **Flow affected:** First visit / add-to-home-screen / poor-connectivity field use in remote Chocó.
- **Current behavior:** `theme-color`, `apple-touch-icon`, and 192/512 icons ship, but there's no `manifest.json`/`<link rel=manifest>` and no SW registration.
- **Expected behavior:** Installable standalone PWA with a manifest and an app-shell/offline fallback.
- **User impact:** On flaky/no signal users get a blank page instead of a cached shell and can't install for one-tap launch — undercuts the stated field use case.
- **Fix:** Add `public/manifest.webmanifest` (`display:standalone`, `start_url:/app`, maskable icons) + `<link rel=manifest>`; wire `vite-plugin-pwa` (generateSW) for an offline shell + runtime GET caching.

### [UX-035] No safe-area-inset handling; viewport lacks `viewport-fit=cover` — sticky chrome can sit under the notch (Impact: Medium) [MOBILE]
- **Location:** `apps/web/index.html:6`; `Header.tsx:16` (`sticky top-0`); shells/modal in `styles.css`
- **Flow affected:** Notched iPhones / cutout Android, sticky header, modals, any bottom nav.
- **Current behavior:** Viewport meta has no `viewport-fit=cover`, so `env(safe-area-inset-*)` resolve to 0 and nothing pads for the notch/home indicator.
- **Expected behavior:** Content and sticky/fixed chrome respect safe-area insets.
- **User impact:** Sticky header/status and bottom controls can be clipped or hard to reach one-handed on notched phones.
- **Fix:** `viewport-fit=cover`; `pt-[env(safe-area-inset-top)]` on the sticky header, `pb-[env(safe-area-inset-bottom)]` on main/bottom bars; insets on `.modal-backdrop`.

### [UX-036] Loading states use spinner+text, not skeletons; slow field connections show a bare line and layout shift (Impact: Medium) [MOBILE]
- **Location:** `DonacionesPage.tsx:207-210`; `RevisionDonacionesPage.tsx:109-112`
- **Flow affected:** First open of Donaciones/Revisión on a slow connection.
- **Current behavior:** Initial load renders `<Spinner/> Cargando…` as a single line; the list area is empty until data arrives, then pops in.
- **Expected behavior:** Skeleton rows/cards mirroring the final layout.
- **User impact:** The screen looks broken/empty for seconds and shifts when content arrives.
- **Fix:** Render N `animate-pulse` skeletons matching the row/card shape while `cargando`, with a reduced-motion static variant.

### [UX-037] Onboarding/auth flow drops out of the design system back into legacy CSS (Impact: Medium)
- **Location:** `StartChoice.tsx`, `Onboarding.tsx`, `WaitingRoom.tsx`, `Landing.tsx`
- **Flow affected:** Landing → Sign up → StartChoice → Onboarding/WaitingRoom.
- **Current behavior:** SignIn/SignUp/AuthLayout use the Tailwind DS (card, pill buttons, gold accent); StartChoice/Onboarding/WaitingRoom/Landing use legacy `.page/.topbar/.choice-grid/.field/.inline-form` with bare inputs — no card, no FormField semantics.
- **Expected behavior:** A new user's first five screens read as one continuous product (html-base targets exist).
- **User impact:** Immediately after a polished sign-up the UI resets to an older/flatter style, reading as broken and undermining trust.
- **Fix:** Port these routes onto the AuthLayout card + Button/Input/FormField atoms; retire the legacy classes for these routes.

### [UX-038] Double design system: DS DashboardLayout/DataTable/FormField ship as dead code while the legacy shell doesn't match the html-base skin (Impact: Medium)
- **Location:** `DashboardLayout/DashboardLayout.tsx` (unused); `Header.tsx:29,32` (hardcoded English `aria-label`/`alt`); `AppShell.tsx` (legacy chrome); `DataTable.tsx`, `FormField.tsx` (0 usages)
- **Flow affected:** The chrome on every `/app` screen and admin CRUD tables/forms.
- **Current behavior:** `design-system.css` imports `styles.css`, so both systems ship. AppShell renders legacy chrome while pages use DS utilities — a visible token/skin mismatch; the polished DS shell + DataTable/FormField are wired nowhere; DS Header carries hardcoded English strings and fake avatar/bell.
- **Expected behavior:** One shell; admin tables/forms route through DataTable/FormField; all chrome strings via i18n.
- **User impact:** The primary surface looks half-migrated; the abandoned DS Header would regress mobile UX (fake controls, English labels) if wired as-is.
- **Fix:** Adopt DashboardLayout (feed real nav/org/user/Sign out, i18n the labels) or delete the dead shell; adopt DataTable/FormField in admin pages.

### [UX-039] No `<main>` landmark on Landing, AuthLayout, or PendingShell-wrapped onboarding screens (Impact: Medium)
- **Location:** `Landing.tsx:42-109`; `AuthLayout.tsx:14-42`; `PendingShell.tsx:11-24`
- **Flow affected:** Landing, sign-in, sign-up, StartChoice, Onboarding, WaitingRoom.
- **Current behavior:** None wrap content in `<main>`; the only `<main>` (unused `LandingLayout.tsx:10`) isn't referenced by any route — a regression vs html-base.
- **Expected behavior:** Exactly one `<main>` per page.
- **User impact:** SR/switch users lose "skip to main content" on every pre-app screen.
- **Fix:** Wrap the card/hero/outlet in `<main>` in AuthLayout, PendingShell, and Landing.

---

### [UX-040] Org switch applies silently with no confirmation, feedback, or view reset (Impact: Low)
- **Location:** `apps/web/src/components/AppShell.tsx:18`
- **Flow affected:** Multi-org users switching organization from the sidebar select.
- **Current behavior:** `onChange={(e)=>setOrgId(e.target.value)}` applies immediately; no toast, route unchanged, so you stay on e.g. `/app/inventario` with a different org's (possibly empty/stale) data.
- **Expected behavior:** A brief confirmation/toast and ideally `navigate('/app')` to re-enter from a known state.
- **User impact:** A native select is easy to mis-hit one-handed; the silent swap shows empty/stale data with no signal.
- **Fix:** After storing, `navigate('/app')` + fire a toast or inline `aria-live` confirmation.

### [UX-041] Inventory "Dar de baja" fires on a single tap with no confirm and no undo (Impact: Low) [MOBILE]
- **Location:** `apps/web/src/pages/InventoryPage.tsx:428-434`
- **Flow affected:** Deactivate SKU.
- **Current behavior:** One tap PATCHes; reversible via "Reactivar" but no confirmation and no undo at the moment of action.
- **Expected behavior:** For a reversible destructive action, an undo toast is enough.
- **User impact:** A gloved mis-tap deactivates a SKU; recovery requires enabling "Ver dados de baja" and re-finding the row.
- **Fix:** After `setActive(false)` show a "Deshacer" toast calling `setActive(item,true)`; pairs with UX-007.

### [UX-042] Modals don't inert/aria-hide the background — SR swipe can reach content behind the modal (Impact: Low) [MOBILE]
- **Location:** `InventoryPage.tsx:156-200`; `ConfirmDialog.tsx:31-94`
- **Flow affected:** Any modal/confirm on a touch screen reader.
- **Current behavior:** `aria-modal=true` + Tab trap are set, but the app root behind is not `inert`/`aria-hidden`, so touch-SR swipe (which ignores the Tab trap) reaches background controls.
- **Expected behavior:** Everything outside the dialog is inert to both Tab and SR swipe.
- **User impact:** SR users can swipe into and operate visually-blocked controls behind the modal.
- **Fix:** Set `inert`/`aria-hidden` on the app root while open (render the dialog in a portal outside it); remove on close.

### [UX-043] Inventory table lacks an accessible name; actions header is empty; date not localized (Impact: Low)
- **Location:** `apps/web/src/pages/InventoryPage.tsx:376-385, 411`
- **Flow affected:** Browse inventory (screen reader).
- **Current behavior:** No `<caption>`/`aria-label`, empty actions `<th>`, and "Vence" shows the raw ISO slice (`2026-08-16`).
- **Expected behavior:** Table caption/aria-label, sr-only actions header, `es-CO` date formatting.
- **User impact:** SR users hear an unnamed table with a blank column header; date format is inconsistent with the es-CO stats.
- **Fix:** `aria-label="Inventario del acopio"`, sr-only "Acciones" header, `Intl.DateTimeFormat('es-CO')`.

### [UX-044] Acopios list rows don't wrap; content + two actions get cramped on narrow phones (Impact: Low) [MOBILE]
- **Location:** `apps/web/src/styles.css:442-454`; `AcopiosPage.tsx:117-153`
- **Flow affected:** Viewing the acopios list on ~360px.
- **Current behavior:** `.stack-list li{justify-content:space-between}` with no `flex-wrap` and `.row-actions{display:flex}` holding Editar + baja compete for width, squeezing the metadata.
- **Expected behavior:** Below ~480px actions wrap under the content (or column layout).
- **User impact:** Long names/municipios clip or push buttons into a cramped strip.
- **Fix:** `@media (max-width:480px){ .stack-list li{flex-direction:column;align-items:stretch} }` or `flex-wrap:wrap`.

### [UX-045] Acopios empty state is a single muted line vs. the guided target (Impact: Low)
- **Location:** `apps/web/src/pages/AcopiosPage.tsx:115`
- **Flow affected:** First run / org with zero acopios.
- **Current behavior:** Just muted text; html-base has an icon, title, and guidance pointing at the form.
- **Expected behavior:** A richer empty-state block (icon + title + one-line guidance) directing to the create form.
- **User impact:** A brand-new org sees a near-blank screen with no cue that the form creates the first acopio.
- **Fix:** Replace with a small empty-state block mirroring html-base (copy already exists).

### [UX-046] Recognition stepper is aria-hidden decorative bars with no text labels or SR progress (Impact: Low)
- **Location:** `apps/web/src/pages/NuevaDonacionPage.tsx:31-45, 199`
- **Flow affected:** During upload→recognize.
- **Current behavior:** Three `aria-hidden` colored bars with no step text; html-base had visible labels ("Foto tomada / Subida / Reconociendo").
- **Expected behavior:** Visible step labels and an accessible progress semantic.
- **User impact:** Sighted users can't tell what the bars mean; low-vision users get only "Subiendo/Reconociendo" with no sense of steps remaining.
- **Fix:** Add labels under the bars; `role="progressbar" aria-valuemin/max/now` on the container.

### [UX-047] Nested live regions and hardcoded English Spinner label (Impact: Low)
- **Location:** `NuevaDonacionPage.tsx:217-227`; `Spinner.tsx`
- **Flow affected:** Any loading/recognizing state announced to a screen reader.
- **Current behavior:** A `role=status` div wraps `<Spinner/>` (itself `role=status aria-label="Loading"`), producing nested status regions and an English label in a Spanish UI.
- **Expected behavior:** One live region per status with localized labels.
- **User impact:** Double announcements and an English "Loading" spoken to VoiceOver/TalkBack users.
- **Fix:** Route the Spinner label through i18n; `aria-hidden` the Spinner when a sibling text conveys status.

### [UX-048] Button `link` variant removes the 44px tactile minimum (Impact: Low) [MOBILE]
- **Location:** `apps/web/src/components/atoms/Button/Button.tsx:23` (`min-h-0 min-w-0`)
- **Flow affected:** Any standalone link-styled action.
- **Current behavior:** Base enforces `min-h-11 min-w-11`, but `link` overrides to `min-h-0 min-w-0`, so a standalone link-button can be line-height tall.
- **Expected behavior:** Standalone link-buttons still meet 44px; only truly inline links shrink.
- **User impact:** Standalone link actions become hard to hit with gloves/in rain.
- **Fix:** Give `link` `min-h-11 py-2`, or add a separate `linkInline` variant for in-text use.

### [UX-049] Landing renders two sibling `<header>` elements, producing duplicate banner landmarks (Impact: Low)
- **Location:** `apps/web/src/pages/Landing.tsx:43, 67`
- **Flow affected:** Landing (/) before login.
- **Current behavior:** `<header className="topbar">` and `<header className="hero">` are both direct children of a non-sectioning `<div>`, so both compute `role=banner`.
- **Expected behavior:** A single banner landmark; hero copy is content, not a banner.
- **User impact:** SR landmark navigation lists two indistinguishable "banner" regions.
- **Fix:** Change the hero wrapper to `<section className="hero">`.

### [UX-050] Fragmented breakpoints across the system (800 / 900 / 960 / md) (Impact: Low) [MOBILE]
- **Location:** `styles.css:477` (sidebar ≤800), `:690` (stat-grid ≤960); `design-system.css:104` (DataTable ≤900); DashboardLayout/Sidebar use `md=768`
- **Flow affected:** Tablets/large phones ~760-960px.
- **Current behavior:** Sidebar collapses at 800, DataTable stacks at 900, stat grid reflows at 960, DS shell at 768 — components cross their mobile threshold at different widths.
- **Expected behavior:** One documented breakpoint scale (e.g. 600/900) shared by vanilla CSS and Tailwind.
- **User impact:** Between ~760-960px the layout shifts piecemeal (table cards while the sidebar is still a full column), looking broken.
- **Fix:** Define breakpoint tokens once; align `styles.css` media queries and Tailwind `screens`.

### [UX-051] `accent-foreground` (gold-deep) on `accent` (gold) is a latent contrast footgun (~2.6:1) (Impact: Low)
- **Location:** `apps/web/src/styles/design-system.css:32-33`
- **Flow affected:** Any component pairing `text-accent-foreground` on `bg-accent`.
- **Current behavior:** Button primary opts out (uses `text-primary`, ~8.4:1), but the system still ships `--color-accent-foreground: #9C7208`, so the naming convention invites a future AA-failing gold-on-gold label.
- **Expected behavior:** The token named `accent-foreground` should actually pass on `accent`.
- **User impact:** No current impact; future gold-on-gold labels would be unreadable in glare/rain.
- **Fix:** Redefine `--color-accent-foreground` to ink green (`#12331A`) or delete it; add a contrast lint for foreground/bg token pairs.

### [UX-052] Ubiquitous 10-11px uppercase micro-labels hurt legibility in field/glare/rain (Impact: Low) [MOBILE]
- **Location:** `StatCard.tsx:20`, `Badge.tsx:7`, `DataTable.tsx:31`, `FormField.tsx:19`, mobile `::before` at `design-system.css:133`
- **Flow affected:** Dashboards, table headers/badges, every form label outdoors.
- **Current behavior:** Metadata, badges, table headers, and form labels are 10-11px bold uppercase — small under glare/motion/wet screens.
- **Expected behavior:** Critical labels ≥12px; reserve 10px for decorative eyebrows.
- **User impact:** Field users squint at status badges/labels in sunlight, slowing entry and raising errors.
- **Fix:** Bump FormField labels, stacked-cell labels, and status Badges to ~12px.

---

## 3. CRITICAL USER FLOWS

```
 ANON (Landing /)
   │  [legacy CSS island · dup banners UX-049 · no <main> UX-039 · nav links <44px UX-024]
   ▼
 SIGN UP  (DS card, 16px? NO → iOS zoom every field UX-003 · captcha squeezed UX-025)
   │  ✗ submit no loading → double-tap burns captcha (UX-017)
   ▼
 STARTCHOICE / ONBOARDING  (drops back to legacy CSS UX-037)
   │  ✗ phone field = QWERTY keyboard, no required markers (UX-026, UX-020)
   │  ✗ "Volver" back-out link is the smallest target on screen (UX-024)
   ▼
 PENDING / WAITINGROOM  ◀── BIGGEST STALL POINT
   │  ✗ "Ya me invitaron, recargar" = SILENT on error, no-op on success (UX-004)
   │     user mashes button → assumes broken → re-registers
   ▼
 APP SHELL  (OrgGate → AppShell)
   │  ✗ boot: blank <p>, raw "Failed to fetch", no retry (UX-019)
   │  ✗ no <main>/skip/route-focus on ANY /app screen (UX-009)
   │  ✗ mobile: nav+org+role stacked, NOT sticky, no scroll hint (UX-028)
   │  ✗ header no-wrap: long email clips Sign out; Sign out = instant logout→captcha (UX-018)
   ▼
 CAPTURE DONATION  (NuevaDonacion) ◀── CORE ONE-HANDED FLOW
   │  ✗ camera button below fold; CTA top-right, no bottom bar/FAB (UX-015)
   │  ✗ ZXing statically bundled → slow load on 3G (UX-023)
   │  ✗ recognition = blocking await, no timeout, "scary error" though photo saved (UX-010)
   │  ✗ Confirm button hidden behind numeric keyboard (UX-016)
   │  ✗ acopio-missing error only appears AFTER full capture (UX-020)
   ▼
 REVIEW QUEUE  (RevisionDonaciones)
   │  ✗ up to 200 cards, each cloning full catalog select → jank/freeze (UX-027)
   │  ✗✗ product <select> commits an INVENTORY WRITE on wheel-scroll,
   │       no confirm, no undo, row vanishes → SILENT DATA CORRUPTION (UX-008)
   │  ✗ assign/retry = row silently disappears, no toast (UX-007)
   ▼
 INVENTORY  (heaviest screen)
   │  ✗ loads → misleading "create an acopio" flash (UX-005)
   │  ✗ 6-col table never stacks → actions off-screen, pan sideways (UX-002)
   │  ✗ 16-field modal: no sticky Save, no X, no scroll-lock (UX-012)
   │  ✗✗ SAVE FAILS BEHIND THE MODAL → looks like success → SKU lost (UX-001)
   ▼
 ADMIN CRUD  (Users / Roles / Acopios)
      ✗ Users table overflows; Roles matrix = 1160px two-axis scroll (UX-014, UX-013)
      ✗ every mutation silent; errors off-screen at page top (UX-007)

  MOBILE FRICTION ON EVERY HOP: 44px targets mostly OK, but thumb-reach is top-heavy
  (CTAs top-right, nav at top), tables don't collapse, DS inputs zoom, no PWA/offline,
  no safe-area — the exact one-handed/gloves/rain scenario is the least-served path.
```

---

## 4. SUMMARY TABLE

| Impact | Count | IDs |
| --- | --- | --- |
| Critical | 6 | UX-001, UX-002, UX-003, UX-004, UX-005, UX-006 |
| High | 19 | UX-007, UX-008, UX-009, UX-010, UX-011, UX-012, UX-013, UX-014, UX-015, UX-016, UX-017, UX-018, UX-019, UX-020, UX-021, UX-022, UX-023, UX-024, UX-025 |
| Medium | 14 | UX-026, UX-027, UX-028, UX-029, UX-030, UX-031, UX-032, UX-033, UX-034, UX-035, UX-036, UX-037, UX-038, UX-039 |
| Low | 13 | UX-040, UX-041, UX-042, UX-043, UX-044, UX-045, UX-046, UX-047, UX-048, UX-049, UX-050, UX-051, UX-052 |
| **Total** | **52** | |

---

## 5. NIELSEN HEURISTIC SCORECARD

| # | Heuristic | Score | Justification |
| --- | --- | --- | --- |
| 1 | Visibility of system status | 2/5 | Silent mutations everywhere, no toasts, bare `<p>` loading, WaitingRoom/Inventory give no feedback (UX-004, UX-005, UX-007). |
| 2 | Match with the real world | 4/5 | Spanish domain vocab is consistent and correct; docked only for raw ISO dates and an English "Loading" spoken in a Spanish UI (UX-043, UX-047). |
| 3 | User control & freedom | 2/5 | No undo on the mis-assign select, no X on the 16-field modal, org switch/Sign out fire with no confirm (UX-008, UX-012, UX-018, UX-040). |
| 4 | Consistency & standards | 2/5 | Two live design systems, legacy islands mid-flow, and four different breakpoints (UX-037, UX-038, UX-050). |
| 5 | Error prevention | 2/5 | Wheel-picker inventory write, double-submit on submit/delete, editable super-admin role (UX-008, UX-017, UX-029, UX-030). |
| 6 | Recognition rather than recall | 3/5 | Labels/keyboards mostly present, but required markers missing and the invite label is sr-only-only (UX-020). |
| 7 | Flexibility & efficiency | 2/5 | No thumb FAB/sticky bars, wrong keyboards, no PWA/offline for the field scenario (UX-015, UX-016, UX-026, UX-034). |
| 8 | Aesthetic & minimalist design | 3/5 | DS surfaces are clean; legacy pages read flat/half-migrated and micro-labels are cramped (UX-037, UX-052). |
| 9 | Recognize & recover from errors | 2/5 | Errors render behind the modal or off-screen at page top, raw technical strings, no retry (UX-001, UX-007, UX-019). |
| 10 | Help & documentation | 3/5 | Revisión has good guided empty states, but Inventory/Acopios guidance was dropped and the stepper has no labels (UX-045, UX-046). |
| | **Overall** | **2.5/5** | Solid tokens/atoms undermined by a broken write-feedback loop, half-migrated consistency, and top-heavy mobile ergonomics. |

---

## 6. MOBILE-FIRST SCORECARD

| Dimension | Score | Justification |
| --- | --- | --- |
| Touch targets | 4/5 | 44px is well enforced on `.button`/`.linkish`/inputs/selects and matrix cells; docked for bare `<Link>`/`<a>` and the `link` Button variant (UX-024, UX-048). |
| Thumb reach | 2/5 | Primary CTAs and nav live top/top-right; no bottom nav, no capture FAB, confirm hidden behind keyboard (UX-015, UX-016, UX-018, UX-028). |
| Responsive collapse | 2/5 | DataTable stacks, but Inventory/Users tables and the Roles matrix don't; DS shell has no mobile nav; breakpoints mismatched (UX-002, UX-013, UX-014, UX-022, UX-050). |
| Input keyboards | 3/5 | Good `email`/`decimal`/`date` coverage, but DS inputs are 14px (iOS zoom) and phone/search/contact fields open the wrong keyboard (UX-003, UX-026). |
| Offline / PWA | 1/5 | No manifest, no service worker, no `viewport-fit=cover`/safe-area — zero offline and degraded install for remote field use (UX-034, UX-035). |
| List performance | 2/5 | No virtualization/pagination anywhere; the 200-card review queue clones the full catalog per card (UX-027). |

---

## 7. PRIORITY FIXES (by user-impact-to-effort ratio)

| Fix | Impact | Effort | Screens affected |
| --- | --- | --- | --- |
| Input `text-sm`→`text-base md:text-sm` (kill iOS zoom) — UX-003 | Critical | XS (1 line) | Every DS form (SignIn/SignUp/Users/Search) |
| `viewport-fit=cover` + safe-area padding on header/main/modal — UX-035 | Medium | XS | All notched phones, sticky chrome |
| Wrap AppShell `<Outlet>` in `<main>` + skip link + route-focus effect — UX-009 | High | S | Every `/app/*` screen |
| WaitingRoom reload: loading/error/idle feedback — UX-004 | Critical | S | Onboarding/pending |
| Render Inventory save error inside the modal + disable/spin submit — UX-001 | Critical | S | Inventory modal |
| Shared toast + optimistic + error-scroll primitive, wired into mutations — UX-007/UX-008 | High×2 | M | Inventory, Donaciones, Users/Roles/Acopios |
| Add loading flag + skeletons to Inventory (stop empty flash) — UX-005 | Critical | S | Inventory |
| Card-stacking `@media` block for Inventory + Users tables — UX-002/UX-014 | Critical/High | S–M | Inventory, Users |
| Split-then-commit ("Asignar" button) on review select + undo — UX-008 | High (data) | S | Review queue |
| Correct `type`/`inputMode`/`enterKeyHint` on phone/search fields — UX-026 | Medium | S | Onboarding, Acopios, Inventory, NuevaDonacion |
| Sticky modal footer + X + body scroll-lock (Inventory) — UX-012 | High | M | Inventory modal |
| Roles matrix: sticky `thead` + `<600px` per-role toggle view — UX-013 | High | M–L | Roles |
| Wire `useReconocimiento` (timeout/offline) + "foto ya guardada" copy — UX-010 | High | M | NuevaDonacion |
| Bottom capture bar / FAB for capture + create actions — UX-015 | High | M | NuevaDonacion, Donaciones, Inventory |
| Add PWA manifest + `vite-plugin-pwa` app-shell cache — UX-034 | Medium | M–L | App-wide |

---

## 8. QUICK WINS (< 30 min each, meaningful mobile gain)

- **UX-003:** `Input` base `text-sm` → `text-base md:text-sm` — kills iOS zoom on every form field. *(1 line)*
- **UX-035:** Add `viewport-fit=cover` to the viewport meta + `env(safe-area-inset-*)` on header/main.
- **UX-024:** Add `className="linkish"` to the four bare nav/back links (Onboarding, WaitingRoom, Landing).
- **UX-026:** Add `type="tel" inputMode="tel" autoComplete="tel"` to telefono/contact fields; `type="search" enterKeyHint="search"` to search boxes.
- **UX-016:** Add `enterKeyHint="done"` to the quantity input so the keyboard action key submits.
- **UX-049:** Change Landing hero `<header>` → `<section>` (removes duplicate banner).
- **UX-047:** Route the Spinner label through i18n (drop the hardcoded English "Loading").
- **UX-030:** Add `setEliminando(true)` at the top of Roles `onDelete` (stops double-DELETE).
- **UX-018:** Add `flex-wrap:wrap` to `.app-header` and `min-w-0 truncate` to the identity span.
- **UX-052 / UX-051:** Bump FormField/Badge/table micro-labels to ~12px; redefine `--color-accent-foreground` to ink green.
- **UX-043:** Add `aria-label` + es-CO date formatting to the Inventory table.

---

## 9. RESKIN SEQUENCING RECOMMENDATION

Two shared atoms gate everything, so land them **first, as a pre-PR** (they ship in components every later screen renders): fix **UX-003** (`Input` 16px), **UX-006** (DataTable real cell labels), **UX-021** (FormField aria wiring), **UX-048** (Button `link` 44px), **UX-050** (breakpoint tokens). One tiny PR, unblocks the rest.

Then convert screens in this order — chosen to maximize mobile UX gain per PR by starting with the surface every other screen sits inside, then the highest field-write traffic:

**PR 1 — AppShell (the /app chrome).** Highest leverage: it wraps all six routes, and adopting `DashboardLayout` without a mobile plan would regress nav entirely. Convert with a mobile Drawer/bottom-nav from day one.
→ Fix DURING: **UX-009** (main/skip/route-focus), **UX-018** (header wrap/confirm), **UX-022** (mobile nav), **UX-028** (sticky/compressed strip), **UX-035** (safe-area), **UX-040** (org-switch feedback), **UX-019** (OrgGate loading/error). Also stand up the **shared toast primitive** here so later PRs can consume it.

**PR 2 — Inventory (heaviest field write screen).** Biggest per-screen mobile payoff.
→ Fix DURING: **UX-001** (save-behind-modal), **UX-002** (table→cards), **UX-005** (loading skeleton), **UX-012** (sticky modal footer/X/scroll-lock), **UX-007** (optimistic + toast), **UX-020** (required markers), **UX-026** (keyboards), **UX-027** (virtualization), **UX-032** (acopio picker), **UX-033** (focus restore), **UX-041/UX-043** (undo, table a11y), **UX-015** (create FAB).

**PR 3 — Donaciones capture + review (core one-handed flow; Donaciones already uses DataTable).** Finish the reskin and harden the field path.
→ Fix DURING: **UX-008** (review mis-assign confirm/undo), **UX-010** (resilient recognition), **UX-011** (poll merge), **UX-015/UX-016** (bottom capture bar, sticky confirm), **UX-023** (lazy ZXing), **UX-036** (skeletons), **UX-046/UX-047** (stepper/live-region).

**PR 4 — Onboarding (StartChoice / Onboarding / WaitingRoom).** New-user entry, currently a legacy island; small screens, high trust payoff.
→ Fix DURING: **UX-004** (WaitingRoom feedback), **UX-024** (44px links), **UX-020/UX-026** (required + keyboards), **UX-037** (DS port), **UX-039** (main landmark), **UX-025** (captcha), **UX-017** (submit loading), **UX-034** (register the PWA manifest here since onboarding is the add-to-home moment).

**PR 5 — Admin CRUD (Users / Roles / Acopios).** Lower field frequency; adopt DataTable/FormField now that they're fixed.
→ Fix DURING: **UX-013** (Roles matrix mobile), **UX-014** (Users cards), **UX-007** (toasts/optimistic), **UX-029/UX-030** (admin_acopio lock, delete busy), **UX-031** (Editar scroll/focus), **UX-038** (retire double DS), **UX-044/UX-045** (row wrap, empty state), **UX-042** (inert background).

**PR 6 — Landing (last).** Lowest field use; marketing surface.
→ Fix DURING: **UX-039** (main), **UX-049** (banner), **UX-024** (links), **UX-052** (label legibility).

Cross-cutting **UX-051** (accent token) rides along with the pre-PR; **UX-042** (modal inert) can land with either PR 2 or PR 5 since it touches the shared ConfirmDialog.
