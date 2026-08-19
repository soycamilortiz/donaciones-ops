# Mobile-First UX Audit — New Views (Recepciones Flow + New Auth)

## 1. EXECUTIVE SUMMARY

The app's atomic foundation is genuinely mobile-first: `Button` and `Input` enforce 44px targets with an explicit gloves/rain rationale (`Button.tsx:6-9`), and the `text-base md:text-sm` pattern prevents iOS zoom nearly everywhere. But the new views are two half-migrated worlds stitched together, and the seams are where field usability breaks. The single biggest risk is the collision between the **reskinned old flow (InventoryPage direct CRUD) and the new recepcion→validar intake path**: both write `InventoryItem`, but manual inventory rows carry `productoId=null` and can never merge with recepcion-validated stock, producing duplicate rows, inflated stats, and stock that silently skips cuarentena and Producto reglas (`InventoryPage.tsx:257-305` vs `inventory.service.ts:70-127`). Compounding this, the **catálogo reglas are completely invisible**: there is no CatalogoController, so `requiereLote`/`requiereVencimiento`/`esPerecedero` (`catalogo.service.ts:153-166`) can neither be viewed nor edited, and at validar the backend silently diverts approved units to cuarentena with zero on-screen explanation even though the DTO already ships those flags to the client (`recepciones.service.ts:635-637`). The highest-traffic mobile surface — the RecepcionDetailPage line editor where quantities are split and stock is committed — is a 7-column raw table with three number inputs per row that never collapses to cards, forcing >640px of horizontal scroll on a 375px phone. On the auth side the gaps are behavioral, not layout: the expired-Google-token dead end and the missing resend cooldown timer strand a one-handed user on spotty signal with no recovery CTA. Two fully-implemented backend contracts (`anularRecepcion`, resend cooldown) sit unwired in the UI. Net: the plumbing largely exists — the work is surfacing state and finishing the collapse-to-card migration, not new backend.

## 2. FINDINGS (most-severe first)

### [UX-001] Two parallel stock-entry paths cause double-entry (Critical) — Flow integrity
**Location:** `apps/web/src/pages/InventoryPage.tsx:257-305`; `apps/api/src/inventory/inventory.service.ts:180-209` (create, `productoId=null`) vs `:70-127` (aplicarStockValidado merges by productoId+loteId).
**Current:** InventoryPage POSTs directly to `/acopios/:id/inventory` writing an item with `productoId=null`/`loteId=null`; the recepcion path merges by `productoId+loteId`. A manual row can never merge with a validated row for the same physical product → duplicate rows, inflated `stats.activos`/`stats.cantidad`, and manual stock bypasses cuarentena gating and Producto reglas. Copy ("Nuevo producto") presents manual add as the normal intake.
**Expected:** One canonical intake path — field stock via Recepciones→validar; Inventory read/adjust-only, and any manual add must resolve/create a Producto so it dedupes and honors the reglas.
**Fix:** Gate `openCreate`/`onSave` behind an `inventory:adjust` permission, relabel to "Ajuste de inventario" with a required reason; OR make the POST resolve/create a Producto and pass `productoId`. Minimum: banner that field intake goes through Recepciones and hide "Nuevo producto" for recepcion operators.

### [UX-002] Catálogo reglas are invisible and uneditable — no HTTP surface exists (Critical) — Blocked feature
**Location:** `apps/api/src/catalogo/catalogo.module.ts` (no controller registered); `catalogo.service.ts:133-151` (inferirCategoria), `:153-166` (reglasDe).
**Current:** CatalogoModule registers only providers/exports CatalogoService — there is **no** `catalogo.controller`, so no HTTP surface and no `/app/catalogo` route. `requiereLote`/`requiereVencimiento`/`esPerecedero` are set at product creation and never surfaced; `inferirCategoria` silently defaults unmatched names to `OTRO` (no gating), so a mis-categorized food product won't gate and a correctly-categorized one WILL divert to cuarentena at validar with no operator inspection or override.
**Expected:** Operators can view/edit the three reglas + categoria per Producto.
**Fix (ordered):** (a) add `CatalogoController` (GET/PATCH Producto incl. the three flags + categoria) and register it in CatalogoModule; (b) build the `/app/catalogo` screen; (c) meanwhile surface reglas read-only on the recepcion line.

### [UX-003] Silent cuarentena diversion at validar is invisible — the client already has the data (Critical) — Feedback
**Location:** `apps/web/src/pages/RecepcionDetailPage.tsx:364-456` (Linea); `apps/api/src/.../recepciones.service.ts:232-236` (validar diverts aprobada→cuarentena), `:541-544` (obligatory-data check), DTO flags at `:635-637`.
**Current:** The DTO ships `producto.requiereLote/requiereVencimiento/esPerecedero` per line, but Linea only renders nombre/sku/lote. When lote/vencimiento is missing, `validar()` silently moves approved qty to cuarentena — operator types aprobada=10, taps "Validar", 10 units land in cuarentena, no stock created, zero explanation on screen.
**Expected:** Each line warns pre-validar when it will be diverted ("Falta lote/vencimiento → irá a cuarentena"), plus a summary warning above the Validar button.
**Fix:** In Linea compute `divertira = (producto.requiereLote && !item.lote?.codigoOrigen) || (producto.requiereVencimiento && !item.lote?.vencimiento)`; render a warning Badge + inline text, flag the aprobada input, and annotate Validar with the count of lines going to cuarentena. Add es/en `receptions.willQuarantineHint`. No backend change needed for surfacing.

### [UX-004] Expired Google profile token (15m) is a dead end — no retry CTA, stale token never cleared (Critical) [MOBILE] — Recovery
**Location:** `apps/web/src/pages/CompleteGoogleProfilePage.tsx:36-57` (onSubmit catch); `GoogleSignInButton.tsx:10-20` (clearGoogleProfileToken); `apps/api/src/auth/auth.service.ts:225-237` (throws 422 on 15m JWT expiry).
**Current:** The catch block only does `setError(err.message)`. It never calls `clearGoogleProfileToken()`, and the only navigation is the brand logo. sessionStorage keeps the dead token, so reload re-passes the `if (!profileToken)` guard and re-lands on the same failing form. A 15-min window is easily blown by one-handed form entry on intermittent signal.
**Expected:** On token-expiry error, a one-tap way back into Google OAuth instead of a stranded form.
**Fix:** In the catch, detect expiry (`err instanceof ApiError && err.status === 422`), call `clearGoogleProfileToken()`, and render `<GoogleSignInButton>` (or a Button to `ROUTES.signUp`) under the error instead of the stale form.

### [UX-005] Item/inspection table never collapses to cards — forces horizontal scroll on the densest, most-used screen (Critical/High) [MOBILE] — Layout
**Location:** `apps/web/src/pages/RecepcionDetailPage.tsx:227-255` (table), `364-456` (Linea row), `384-455` (aprobada/cuarentena/rechazada Inputs).
**Current:** A raw `<table className="w-full min-w-[40rem] text-left text-sm">` in `overflow-x-auto`, 7 columns with 3 live number inputs per row. On a 375px phone this needs >640px of scroll to reach quarantine/rejected inputs and Inspeccionar — the exact one-handed controls a field worker needs. This is the culmination of the whole flow (highest-traffic mobile surface). The codebase already has the proven pattern: `.ds-datatable`/`data-label` stacks rows to labeled cards under 900px (`DataTable.tsx` + `design-system.css:96-139`), used by RecepcionesPage; InventoryPage independently stacks below 721px via ROW_GRID. Only this table bypasses both.
**Expected:** Below ~721px each line becomes a stacked card — product/lote header, labeled Recibida/Aprobada/Cuarentena/Rechazada rows at ≥44px, full-width Inspeccionar at the bottom.
**Fix:** Route the list through `DataTable` (add `data-label={col.header}` per cell + `ds-datatable` class) OR build a `sm:hidden` card `<ul>` with `hidden sm:block` on the table, reusing InventoryPage's ROW_GRID + `cellLabelClass` + `inputMode="numeric"`.

### [UX-006] No live sum/clamp for Aprobada + Cuarentena + Rechazada vs. Recibida (High) [MOBILE] — Feedback
**Location:** `apps/web/src/pages/RecepcionDetailPage.tsx:395-433` (Linea inputs).
**Current:** The three number inputs are fully independent — no `max`, no running total, no inline hint. Overshoot/undershoot is only discoverable after tapping Inspeccionar and getting a server error that renders far away (see UX-008).
**Expected:** A live "Asignado: X / Recibida: Y" hint that turns warning-colored when sum ≠ recibida, plus `max` derived from remaining balance.
**Fix:** Compute `const suma = (Number(aprobada)||0)+(Number(cuarentena)||0)+(Number(rechazada)||0)`; render `<p className={suma===item.cantidadRecibida ? 'text-success' : 'text-warning'}>{suma}/{item.cantidadRecibida}</p>`; consider disabling Inspeccionar while `suma !== item.cantidadRecibida`.

### [UX-007] `anularRecepcion` implemented in service layer but never wired to any button (High) — Wiring gap
**Location:** `apps/web/src/features/recepciones/recepciones-service.ts:94-96` (defined, hits `POST .../anular`); `RecepcionDetailPage.tsx:11-17` (imports omit it).
**Current:** `grep -rn "anularRecepcion"` shows only the definition — no Anular/Cancelar button anywhere in the recepciones UI. A worker who registered in error (wrong acopio, duplicate scan, wrong donor) has no way to void while ABIERTA.
**Expected:** A confirmed Anular action on the detail screen while the recepción is still ABIERTA.
**Fix:** Add an outline/destructive `Button` next to Validar (only when `writable`) calling `run(() => anularRecepcion(request, orgId, recepcion.id))`, gated behind a confirm step (irreversible).

### [UX-008] Action error alert renders at page top, far from the bottom buttons that trigger it (High) [MOBILE] — Feedback
**Location:** `apps/web/src/pages/RecepcionDetailPage.tsx:126-130` (error paragraph) vs `191-204`, `321-344`, `348-354` (Generar unidades / Agregar línea / Validar).
**Current:** A single top-of-page `role="alert"` shared by all write actions living far below. Tap Validar/Agregar línea at the bottom, get a validation error → nothing visibly changes; the alert is off-screen above the fold with no scroll-into-view or focus move.
**Expected:** Error visible at/near the point of interaction.
**Fix:** Duplicate the error per section (an `error` prop near Validar / the Add-manual form), or on `setError` call `errorRef.current?.scrollIntoView({behavior:'smooth', block:'center'})` and move focus.

### [UX-009] Resend-code flow has no 60s cooldown UI and no busy/disabled state during the request (High) [MOBILE] — Recovery
**Location:** `apps/web/src/pages/VerifyEmailPage.tsx:51-67` (onResend), `:111-113` (button); `apps/api/src/auth/email-verification.service.ts:15,46-48` (`RESEND_COOLDOWN_MS=60_000`, 422 "Esperá un minuto...").
**Current:** `onResend` sets no busy flag (only `complete()` toggles `ocupado`), so the button stays tappable through the async call — double/triple-tap possible. No client timer: after a successful resend it's immediately tappable, so the next tap just round-trips to earn the backend 422.
**Expected:** After success, a visible 60s countdown ("Reenviar en 0:47"), disabled for that window, and disabled with a loading label while in flight.
**Fix:** Add `resendCooldown`/`resending` state; set `resending=true` in try/finally, on success start a `setInterval` counting down from 60; `disabled={ocupado || resending || resendCooldown > 0}` with label `t('verifyEmail.resendIn', { s: resendCooldown })`.

### [UX-010] Sign-in/sign-up submit buttons have no loading/disabled state during the API call (High) [MOBILE] — Feedback
**Location:** `apps/web/src/pages/SignInPage.tsx:21-46,72-74`; `SignUpPage.tsx:19-47,115-117`.
**Current:** Neither page tracks a submitting boolean; `<Button type="submit" size="lg">` never gets `isLoading`/`disabled`, though `Button` already ships a `Spinner` for it (`Button.tsx:39,54`). On flaky mobile, zero feedback between tap and response → repeat taps, duplicate `POST /login`/`/register`.
**Expected:** Tapping submit immediately disables the button and shows the spinner until the request settles.
**Fix:** Add `submitting` state set in `onSubmit` try/finally; pass `isLoading={submitting}` to the submit Button in both pages.

### [UX-011] NuevaDonacion confirm form has no sticky primary action above the keyboard (High) [MOBILE] — Layout
**Location:** `apps/web/src/pages/NuevaDonacionPage.tsx:459-563` (Resultado), confirm Button at `:560`; top actions at `363-370`.
**Current:** "Confirmar e identificar" sits at the bottom of a long card (merge radios + Producto + Marca + Cantidad). Editing Cantidad opens the numeric keyboard, which covers the confirm button; the user must dismiss the keyboard and scroll.
**Expected:** The confirm action stays pinned above the keyboard / at viewport bottom on mobile.
**Fix:** On `<721px` wrap the Button in a sticky bar (`sticky bottom-0 -mx-5 mt-2 border-t border-border bg-card px-5 py-3`) or a fixed bottom bar with `pb-[env(safe-area-inset-bottom)]`.

### [UX-012] Manual line-add is blind free text — doesn't reuse the existing catálogo/coincidencias picker (Medium) — Wiring gap
**Location:** `apps/web/src/pages/RecepcionDetailPage.tsx:258-346` (Agregar línea) vs `NuevaDonacionPage.tsx:504-532` (coincidencias radio list); `recepciones-service.ts:51-70` (payload accepts optional `productoId`).
**Current:** The manual-add form offers only free-text `nombre`/`marca` with no typeahead against existing products — `productoId` is never sent, so every hand-added line risks a near-duplicate SKU. The photo flow already has a working "merge with existing product" picker driven by `lectura.coincidencias`, unused here.
**Expected:** Typing a product name surfaces existing catalog matches (same UX as photo flow) so workers merge into the right SKU.
**Fix:** Extract the match logic into a reusable `useProductoMatches(nombre)` hook/component hitting the same endpoint; wire the picked id into `agregarItemManual`'s `productoId`.

### [UX-013] confirmar→recepcion loop bounces to detail every item; in-screen success state is dead code (Medium) [MOBILE] — Flow
**Location:** `apps/web/src/pages/NuevaDonacionPage.tsx:448-451` (onConfirmar), `410-417` (unreachable confirmada card).
**Current:** `onConfirmar` calls `setConfirmada(true)` then `navigate(recepcionDetalle)` in the same tick; `recepcionId` is always set (guard at `:207`), so the "Identificado en la recepción" success card never renders. Photographing 30 items = photo→detail→(tap Foto)→photo per item, an extra navigation/tap each with no in-context confirmation.
**Expected:** For high-volume capture, stay on the photo screen, show brief success, auto-reset to camera; explicit "Ver recepción" to exit.
**Fix:** Remove the unconditional navigate; render the confirmada card, then auto-call `reiniciar` after a success toast or expose "Identificar otro" (reiniciar) + "Ver recepción" side by side. Copy already exists (`registerAnother`, `viewReceptions`).

### [UX-014] Verify-email screen loses the user's address on the two likeliest recovery paths (Medium) [MOBILE] — Friction
**Location:** `apps/api/src/auth/email-verification.service.ts:141-142` (verifyUrl has only `?token=`, no correo); `SignInPage.tsx:37-41` (403 redirect appends `?correo=` only when identifier contains `@`).
**Current:** The email link omits `correo`, so a consumed/expired token drops the user to the manual code form with `correo` empty. Separately, username-login 403→verify redirects also leave `correo` blank. Retyping a full email on a phone keyboard is the biggest friction on this screen.
**Expected:** Email prefilled on every path to VerifyEmailPage.
**Fix:** Append `&correo=${encodeURIComponent(user.correo)}` to `verifyUrl`. For the username case, have the 403 response include the account's (optionally masked) correo and extend `ApiError`/`apiRequest` to surface extra body fields so SignInPage can forward it.

### [UX-015] Two raw `<select>` in RecepcionDetail + one in NuevaDonacion use 14px → iOS Safari auto-zoom on focus (Medium) [MOBILE] — Layout
**Location:** `RecepcionDetailPage.tsx:180` (ulTipo), `:291` (manualUl); `NuevaDonacionPage.tsx:28-29` (selectClassName, used by UnidadSelect `:64`). Correct pattern at `Input.tsx:6-8` and `NuevaRecepcionPage.tsx:21-22`.
**Current:** These selects hardcode `text-sm` (14px); any control under 16px force-zooms the viewport on tap, breaking layout mid-task one-handed. InventoryPage got this right (`fieldControlClass = 'text-base md:text-sm'`).
**Expected:** All focusable controls ≥16px on mobile.
**Fix:** Replace with `text-base md:text-sm`; extract the shared `selectClassName` constant into a common location so this can't recur.

### [UX-016] Single global `guardando` flag freezes every button with no per-action loading indicator (Medium) [MOBILE] — Feedback
**Location:** `RecepcionDetailPage.tsx:67-77` (`run`), consumed at `:191-204,:246,:321-344,:348-354`.
**Current:** One shared `guardando` boolean disables Generar-unidades, every per-row Inspeccionar, Agregar-línea, and Validar at once; none receive `Button`'s `isLoading`. On a slow field connection the whole page dims with no label change and no spinner — indistinguishable from a hung app.
**Expected:** The tapped button shows a spinner/"Guardando…"; others may stay disabled.
**Fix:** Track `guardando: string | null` (item id / 'validar' / 'generar') and pass `isLoading={guardando === thisId}` to the matching Button.

### [UX-017] Inventory activate/deactivate has no optimistic update or per-button loading (Medium) [MOBILE] — Feedback
**Location:** `InventoryPage.tsx:307-321` (setActive), `617-649` (row buttons).
**Current:** `setActive` awaits a PATCH then reloads the entire list; the tapped Dar de baja/Reactivar shows no spinner/disabled and no optimistic toggle. On slow field connection the button looks frozen → double-tap.
**Expected:** Immediate optimistic `isActive` flip with per-row pending indicator, rollback + `role=alert` on error.
**Fix:** Track a `pendingId`; disable + `isLoading` that Button, optimistically flip `isActive`, revert in catch. Skip the full `loadItems` refetch for a single toggle.

### [UX-018] Validar/Generar unidades fire immediately with no confirmation; Validar not sticky/thumb-anchored (Medium) [MOBILE] — Safety
**Location:** `RecepcionDetailPage.tsx:348-354` (Validar), `191-205` (Generar unidades).
**Current:** Validar is an irreversible transition (recepción leaves ABIERTA, all Linea inputs become read-only) via one direct tap at the end of a long page, with no confirm and no wired Anular fallback (UX-007). Generar unidades also fires immediately and can be re-tapped to append duplicate units.
**Expected:** An irreversible page-ending action needs a deliberate second tap and/or visual distinction, ideally pinned.
**Fix:** Add a confirm step (Button toggles to "Confirmar validación", reverts after a few seconds, or a confirm modal) before `validarRecepcion`; make the Validar bar `sticky bottom-0` with safe-area padding.

### [UX-019] VerifyEmailPage & CompleteGoogleProfilePage still run on legacy CSS, not the design system (Medium) — Consistency
**Location:** `VerifyEmailPage.tsx:70,74`; `CompleteGoogleProfilePage.tsx:60,64` (`.auth-page`/`.auth-form`) vs `SignInPage.tsx`/`SignUpPage.tsx` (AuthLayout/Input/FormField/Button).
**Current:** SignIn/SignUp were migrated to `AuthLayout` + atoms (loading spinner, 44px targets, 16px→14px text, focus rings, logo mark). The very next two screens in the same journey still use plain `.field`/`.button` classes with a text-only brand link.
**Expected:** A continuous flow looks/behaves identically screen to screen.
**Fix:** Port both to `AuthLayout` + `Input` + `FormField` + `Button` — this also nets the `isLoading` fixes (UX-009/UX-010) essentially for free.

### [UX-020] Contact/plate fields miss mobile-semantic input attributes; no enterKeyHint across auth or recepción forms (Low) [MOBILE] — Friction
**Location:** `NuevaRecepcionPage.tsx:142-169` (donante/contacto/placa/notas); auth inputs at `VerifyEmailPage.tsx:80-101`, `CompleteGoogleProfilePage.tsx:74-95`, `SignInPage.tsx:54-64`, `SignUpPage.tsx:59-107`.
**Current:** `donanteContacto` has no `inputMode`/`type="tel"`/`autoComplete="tel"`; `vehiculoPlaca` no `autoCapitalize`; no input anywhere sets `enterKeyHint`. The 6-digit code field is structurally correct (single input, `inputMode="numeric"`, `autoComplete="one-time-code"`) but doesn't auto-submit at 6 digits.
**Expected:** Phone keypad + autofill for contact, auto-uppercase plate, contextual return key, auto-submit on 6th digit.
**Fix:** Add `inputMode="tel" autoComplete="tel"` to `recepcion-contacto`, `autoCapitalize="characters"` to `recepcion-placa`, `enterKeyHint="next"`/`"done"` across forms; in VerifyEmailPage call `complete({ correo, codigo })` from the code input's `onChange` when `value.length === 6`.

### [UX-021] Resend-success confirmation has no aria-live region; success not announced (Low) [MOBILE] — A11y
**Location:** `VerifyEmailPage.tsx:107` (`{info ? <p className="muted">{info}</p> : null}`).
**Current:** Only the error path uses `role="alert"` (`:102-106`); the "code resent" confirmation is a plain `<p>` — screen-reader/voice users get no announcement.
**Expected:** Success announced non-assertively.
**Fix:** Add `role="status"` (or `aria-live="polite"`) to the info `<p>`.

### [UX-022] Dashboard/Inventory copy frames Recepciones and Inventario as peers, not intake vs. resulting stock (Low) — Copy
**Location:** `Dashboard.tsx:14-30`; `es.json` `inventory.subtitle:492`, `inventory.newSubtitle:506`, `dashboard.inventoryHint:417`, `dashboard.receptionsHint:418`.
**Current:** Dashboard correctly points to `/app/recepciones` with no stale "Donaciones" card, but Inventario/Recepciones read as equal peers and the inventory subtitles invite free manual entry with no mention of the recepcion→validar path — reinforcing UX-001.
**Expected:** Copy framing Recepciones as canonical intake, Inventario as resulting stock + adjustments.
**Fix:** Reword `inventory.subtitle`/`newSubtitle` and `dashboard.inventoryHint`; optionally order the Recepciones card before Inventario.

### [UX-023] No prefers-reduced-motion handling anywhere (Low) [MOBILE] — A11y
**Location:** Cross-cutting — `transition-colors`/`transform` utilities across cards and toggles.
**Current:** Many motion utilities, no `motion-reduce:` variants.
**Fix:** Add `motion-reduce:transition-none` to toggle and card transitions.

## 3. WHAT TO WIRE NEXT (backend ↔ frontend, ordered by value)

| Gap | Endpoint | FE state to add | Build | Effort |
| --- | --- | --- | --- | --- |
| Anular button (UX-007) | `POST /recepciones/:id/anular` (exists, `recepciones-service.ts:94-96`) | confirm-toggle flag; gate on `writable` | Import + destructive Button next to Validar with confirm step | S |
| Silent cuarentena → per-line + summary warning (UX-003) | none (DTO already ships flags `recepciones.service.ts:635-637`) | derive `divertira` per line; count above Validar | Consume existing `producto.requiere*` in Linea; add i18n `willQuarantineHint` | S |
| Inspection live-sum hint (UX-006) | none (pure client) | `suma` derived per Linea | Warning-colored `X/Y` under inputs; `max` per field; optional disable Validar | S |
| Resend cooldown timer (UX-009) | `POST` resend (backend enforces `RESEND_COOLDOWN_MS=60_000`, `email-verification.service.ts:15`) | `resendCooldown`, `resending` + `setInterval` | Countdown label + disabled window mirroring backend | S |
| Google-token-expiry recovery (UX-004) | 422 on expiry (`auth.service.ts:225-237`; contract fine) | detect 422; `clearGoogleProfileToken()` | Render `<GoogleSignInButton>` under error in catch | S |
| confirmar→recepcion loop (UX-013) | `confirmarDonacion` (exists) | render `confirmada` card; `reiniciar` | Remove unconditional navigate; success toast + auto-reset; explicit "Ver recepción" | M |
| Catálogo coincidencias on manual add (UX-012) | same match endpoint the photo flow uses; `agregarItemManual` accepts optional `productoId` (`recepciones-service.ts:51-70`) | `useProductoMatches(nombre)` hook | Extract picker from NuevaDonacionPage into shared component; wire `productoId` | M |
| Catalogo screen — reglas view/edit (UX-002) | **BLOCKED**: no `CatalogoController`; CatalogoModule exports only the service | route + form state for 3 flags + categoria | (a) add GET/PATCH Producto controller + register in module, (b) `/app/catalogo` screen, (c) read-only reglas on recepcion line meanwhile | L |

## 4. MOBILE-FIRST SCORECARD

| Dimension | Score | Justification |
| --- | --- | --- |
| Touch targets | **5/5** | Button/Input enforce 44px (`min-h-11`/`min-w-11`) with explicit gloves/rain rationale; legacy CSS also sets `min-height:44px`. |
| Thumb reach | **2/5** | No sticky primary action anywhere — Validar (`RecepcionDetailPage`) and Confirmar (`NuevaDonacionPage`) are buried at the bottom of long scrolls; confirm button hides under the keyboard. |
| Table → card collapse | **2/5** | RecepcionesPage (DataTable) and InventoryPage (ROW_GRID) collapse correctly, but the highest-traffic RecepcionDetail line editor never collapses — 7-col table with 3 inputs/row (UX-005). |
| Input keyboards | **3/5** | EAN/Cantidad use numeric input; but two+one raw selects are 14px (iOS zoom, UX-015) and contact/plate lack `inputMode`/`autoComplete`/`autoCapitalize` and no `enterKeyHint` anywhere (UX-020). |
| Dense form on phone | **3/5** | NuevaRecepcion is a clean single-column stack and InventoryPage's 20-field modal is workable, but the RecepcionDetail split-quantity editor is impractical one-handed until it collapses. |
| Feedback / optimistic | **2/5** | Single global `guardando` freezes the page with no per-button spinner; auth submits/resend show no in-flight state; inventory toggle has no optimistic update; error banner renders off-screen from its trigger. |

## 5. RISKS / CONFLICTS (reskin vs. new flow)

- **Direct CRUD vs. recepcion→validar (UX-001):** InventoryPage's manual POST writes `productoId=null` rows that can never merge with validated stock — the reskinned old screen actively undermines the new canonical intake path, inflating stats and bypassing cuarentena + reglas. This is the load-bearing contradiction.
- **"Stock updated" / "Nuevo producto" copy:** NuevaDonacion and Inventory copy ("Nuevo producto", "Existencias del centro seleccionado", `inventory.newSubtitle`) present manual/immediate add as normal, contradicting the recepcion→validar model where stock is only committed at validar. Operators are told two different mental models.
- **Dashboard/nav framing (UX-022):** Dashboard has shed the stale "Donaciones" card and points to `/app/recepciones`, but still frames Inventario and Recepciones as peers rather than intake→result — the copy hasn't caught up with the flow, quietly re-legitimizing the double-entry path.
- **Invisible reglas as a silent-failure amplifier (UX-002/UX-003):** With no Catalogo screen, `inferirCategoria` defaulting to `OTRO`, and no on-line warning, a correctly-categorized food product diverts to cuarentena at validar with zero operator visibility or override — the new gating logic exists but is unaccountable to the user.
- **Half-migrated auth (UX-019):** SignIn/SignUp are on the design system; VerifyEmail/CompleteGoogleProfile — the immediate next screens — are still legacy CSS, so the same journey shifts visual system and loses the spinner-button mid-flow.

## 6. QUICK WINS (<30 min each)

1. **Fix the three 14px selects** → `text-base md:text-sm` at `RecepcionDetailPage.tsx:180,:291` and `NuevaDonacionPage.tsx:28-29` — kills iOS auto-zoom instantly (UX-015).
2. **Wire the Anular button** — import `anularRecepcion` and add a `writable`-gated destructive Button next to Validar (UX-007); backend already exists.
3. **Add `role="status"`** to the resend-success `<p>` at `VerifyEmailPage.tsx:107` (UX-021).
4. **Pass `isLoading={submitting}`** to the submit Buttons in SignInPage/SignUpPage with a `submitting` try/finally flag (UX-010) — spinner already ships in `Button`.
5. **Add the live-sum hint** in Linea: one derived `suma` + a `text-success`/`text-warning` `X/Y` line under the three inputs (UX-006), no backend.
6. **Prefill correo in the verify link** — append `&correo=${encodeURIComponent(user.correo)}` at `email-verification.service.ts:141-142` (UX-014, the email half).
7. **Add semantic input attrs** — `inputMode="tel" autoComplete="tel"` on contact, `autoCapitalize="characters"` on plate, `enterKeyHint` across auth + recepción forms (UX-020).
8. **Add `motion-reduce:transition-none`** to card/toggle transitions (UX-023).
9. **Reword inventory/dashboard copy** to name Recepciones as the intake path (`es.json` `inventory.subtitle:492`, `newSubtitle:506`, `dashboard.inventoryHint:417`) (UX-022).

Note: findings synthesized from the provided dossiers; line numbers are as cited there and were not re-verified against the working tree in this pass.
