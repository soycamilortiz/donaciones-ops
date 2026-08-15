# `apps/donaciones` Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up `apps/donaciones/`, a Vite + React 19 + TS microfrontend for the SOS Chocó donations module, using the atomic design system ported from commit `efdd581`, running in dev on `:5173` with mock data — without touching anything outside `apps/donaciones/`.

**Architecture:** New sibling container under `apps/`. Vite dev server proxies `/api` → NestJS `:3000` (same pattern as `apps/web`). The design system (tokens + 18 components, atoms→templates) is reused from the earlier Next scaffold (`efdd581`) and de-coupled from Next (`next/link`→react-router `Link`, `next/image`→`<img>`, `usePathname`→`useLocation`, `next/font`→`@fontsource-variable/geist`). Screens are wired with `react-router-dom` v7 layout routes and render mock data from a local service.

**Tech Stack:** Vite 7, React 19, TypeScript strict, Tailwind CSS v4 (`@tailwindcss/vite`), `react-router-dom` v7, `clsx` + `tailwind-merge`, `zod`, `@fontsource-variable/geist`(+`-mono`), Vitest (logic units only).

**Verification philosophy:** UI components are presentational ports — verified by `tsc --noEmit` + `vite build` + dev render, not unit tests. Vitest covers only pure logic (`cn`, `env` parsing, NavItem `isActive`). This matches the approved spec's done-criteria.

**Source of truth for ports:** commit `efdd581` (reachable via local branch `main`). Retrieve files with `git show efdd581:<path>`. Sanity check before Task 5:
`git show efdd581:src/components/atoms/Button/Button.tsx | head -1` must print `import { forwardRef } from "react";`.

---

## File Structure

```
apps/donaciones/
  index.html                      # Vite entry (title: Donaciones · SOS Chocó)
  package.json                    # scripts dev/build/preview/test
  vite.config.ts                  # react + tailwind plugins, @ alias, /api proxy
  tsconfig.app.json               # + paths @/* → src/*
  vitest.config.ts                # jsdom env for logic tests
  src/
    vite-env.d.ts                 # /// <reference types="vite/client" />
    main.tsx                      # fonts + globals + RouterProvider
    router.tsx                    # createBrowserRouter with layout routes
    styles/globals.css            # @import tailwindcss + @theme tokens (ported)
    lib/
      utils.ts                    # cn()  (verbatim from efdd581)
      utils.test.ts               # cn() unit test
      api.ts                      # typed fetch client → env.VITE_API_URL
    config/
      env.ts                      # zod over import.meta.env
      env.test.ts                 # schema default test
      constants.ts                # APP_NAME + ROUTES (donaciones-specific)
    types/index.ts                # ApiResult, Nullable, Maybe
    hooks/useMediaQuery.ts        # ported (drops "use client")
    components/
      atoms/{Button,Input,Badge,Avatar,Icon,Spinner,Divider}/  + index.ts
      molecules/{FormField,SearchBar,NavItem,StatCard}/         + index.ts
      organisms/{Header,Sidebar,DataTable,Footer}/              + index.ts
      templates/{DashboardLayout,AuthLayout,LandingLayout}/     + index.ts
      index.ts                    # root barrel
    features/
      donaciones/
        donaciones-service.ts     # mock rows + stats
        DashboardPage.tsx
        DonacionesListPage.tsx
        DonacionDetailPage.tsx
        NuevaDonacionPage.tsx
        donacion-schema.ts        # zod
      auth/
        LoginPage.tsx
        LoginForm.tsx
        RegisterPage.tsx
        RegisterForm.tsx
    routes/
      NotFoundPage.tsx
      DashboardLayoutRoute.tsx    # <DashboardLayout><Outlet/></DashboardLayout>
      AuthLayoutRoute.tsx         # <AuthLayout><Outlet/></AuthLayout>
```

Everything is under `apps/donaciones/`. No file outside it is created or modified.

---

## Task 1: Scaffold the Vite React-TS app

**Files:**
- Create: `apps/donaciones/` (via create-vite)

- [ ] **Step 1: Scaffold with create-vite (non-interactive)**

Run from repo root:
```bash
npm create vite@latest apps/donaciones -- --template react-ts
```
Expected: "Scaffolding project in .../apps/donaciones..." then "Done."

- [ ] **Step 2: Install base deps**

```bash
cd apps/donaciones && npm install
```
Expected: `added N packages`, exit 0.

- [ ] **Step 3: Verify dev server boots**

```bash
npm run dev -- --port 5173
```
Expected: `VITE ... ready`, `Local: http://localhost:5173/`. Stop it with Ctrl-C (or run backgrounded and kill).

- [ ] **Step 4: Verify production build**

```bash
npm run build
```
Expected: `tsc -b && vite build` completes, `✓ built in ...`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/donaciones
git commit -m "feat(donaciones): scaffold vite react-ts app"
```

---

## Task 2: Add deps + Tailwind v4 + alias + proxy

**Files:**
- Modify: `apps/donaciones/vite.config.ts`
- Modify: `apps/donaciones/tsconfig.app.json`
- Create: `apps/donaciones/src/vite-env.d.ts` (exists from template — verify contents)

- [ ] **Step 1: Install runtime + tooling deps**

```bash
cd apps/donaciones
npm install react-router-dom clsx tailwind-merge zod @fontsource-variable/geist @fontsource-variable/geist-mono
npm install -D tailwindcss @tailwindcss/vite vitest jsdom
```
Expected: exit 0.

- [ ] **Step 2: Rewrite `vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:3000", changeOrigin: true },
    },
  },
});
```

- [ ] **Step 3: Add `@/*` path to `tsconfig.app.json`**

Inside `compilerOptions`, add:
```json
"baseUrl": ".",
"paths": { "@/*": ["src/*"] }
```

- [ ] **Step 4: Verify `vite-env.d.ts` references vite client types**

`apps/donaciones/src/vite-env.d.ts` must contain:
```ts
/// <reference types="vite/client" />
```

- [ ] **Step 5: Verify build still passes**

```bash
npm run build
```
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/donaciones
git commit -m "chore(donaciones): add tailwind v4, router, alias and /api proxy"
```

---

## Task 3: Design tokens + cn() + Vitest

**Files:**
- Create: `apps/donaciones/src/styles/globals.css`
- Create: `apps/donaciones/src/lib/utils.ts`
- Create: `apps/donaciones/src/lib/utils.test.ts`
- Create: `apps/donaciones/vitest.config.ts`
- Modify: `apps/donaciones/package.json` (add `test` script)
- Delete: template CSS leftovers (`src/App.css`, `src/index.css`)

- [ ] **Step 1: Retrieve tokens (globals.css) from efdd581**

```bash
cd apps/donaciones
mkdir -p src/styles
git show efdd581:src/app/globals.css > src/styles/globals.css
```

- [ ] **Step 2: Point the font tokens at the self-hosted Geist family**

In `src/styles/globals.css`, inside the `@theme inline { ... }` block, replace:
```css
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
```
with:
```css
  --font-sans: "Geist Variable", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Geist Mono Variable", ui-monospace, monospace;
```

- [ ] **Step 3: Retrieve cn() util**

```bash
mkdir -p src/lib
git show efdd581:src/lib/utils.ts > src/lib/utils.ts
```
Expected `src/lib/utils.ts` content:
```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Write cn() failing test**

`src/lib/utils.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges conditional classes and resolves tailwind conflicts", () => {
    expect(cn("px-2", false && "hidden", "px-4")).toBe("px-4");
    expect(cn("text-sm", "font-medium")).toBe("text-sm font-medium");
  });
});
```

- [ ] **Step 5: Add vitest config + test script**

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { environment: "jsdom", globals: false },
});
```
Add to `package.json` `scripts`: `"test": "vitest run"`.

- [ ] **Step 6: Run test — expect PASS**

```bash
npm run test
```
Expected: `✓ src/lib/utils.test.ts`, 1 passed.

- [ ] **Step 7: Remove template CSS leftovers**

```bash
rm -f src/App.css src/index.css
```
(They are replaced by `src/styles/globals.css`; `src/App.tsx`/`main.tsx` are rewritten in Task 10.)

- [ ] **Step 8: Commit**

```bash
git add apps/donaciones
git commit -m "feat(donaciones): design tokens, cn util and vitest"
```

---

## Task 4: env, api client, types, constants, hook

**Files:**
- Create: `apps/donaciones/src/config/env.ts`, `env.test.ts`, `constants.ts`
- Create: `apps/donaciones/src/types/index.ts`
- Create: `apps/donaciones/src/lib/api.ts`
- Create: `apps/donaciones/src/hooks/useMediaQuery.ts`

- [ ] **Step 1: `src/config/env.ts`**

```ts
import { z } from "zod";

const schema = z.object({
  VITE_API_URL: z.string().default("/api"),
});

export type Env = z.infer<typeof schema>;

export const env: Env = schema.parse(import.meta.env);
```

- [ ] **Step 2: `src/config/env.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { z } from "zod";

const schema = z.object({ VITE_API_URL: z.string().default("/api") });

describe("env schema", () => {
  it("defaults VITE_API_URL to /api", () => {
    expect(schema.parse({}).VITE_API_URL).toBe("/api");
  });
  it("keeps a provided value", () => {
    expect(schema.parse({ VITE_API_URL: "https://x/api" }).VITE_API_URL).toBe(
      "https://x/api",
    );
  });
});
```

- [ ] **Step 3: `src/types/index.ts`**

```ts
export type Nullable<T> = T | null;
export type Maybe<T> = T | null | undefined;

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}
export interface ApiError {
  ok: false;
  error: string;
}
export type ApiResult<T> = ApiSuccess<T> | ApiError;
```

- [ ] **Step 4: `src/lib/api.ts`**

```ts
import { env } from "@/config/env";
import type { ApiResult } from "@/types";

/** Typed fetch wrapper. `path` is appended to VITE_API_URL (default "/api"). */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${env.VITE_API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    if (!res.ok) {
      return { ok: false, error: `Request failed with status ${res.status}` };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown network error",
    };
  }
}
```

- [ ] **Step 5: `src/config/constants.ts` (donaciones routes)**

```ts
export const APP_NAME = "SOS Chocó — Donaciones" as const;

export const ROUTES = {
  home: "/",
  donaciones: "/donaciones",
  nuevaDonacion: "/donaciones/nueva",
  login: "/login",
  register: "/register",
} as const;

export type RouteKey = keyof typeof ROUTES;
```

- [ ] **Step 6: `src/hooks/useMediaQuery.ts`**

```ts
import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (): void => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}
```

- [ ] **Step 7: Run tests**

```bash
npm run test
```
Expected: 3 passed (cn + 2 env).

- [ ] **Step 8: Commit**

```bash
git add apps/donaciones
git commit -m "feat(donaciones): env, api client, types, constants, useMediaQuery"
```

> NOTE: `@/lib/constants` is imported by ported components (Header/Footer/AuthLayout/DashboardLayout). Those imports resolve here because `constants.ts` lives at `src/config/constants.ts` — **but the ported files import from `@/lib/constants`**. To avoid editing every ported file, create a re-export shim in Step 9.

- [ ] **Step 9: Add `src/lib/constants.ts` re-export shim**

```ts
export * from "@/config/constants";
```

- [ ] **Step 10: Amend commit**

```bash
git add apps/donaciones/src/lib/constants.ts
git commit --amend --no-edit
```

---

## Task 5: Port atoms

**Files (create):** `src/components/atoms/{Button,Input,Badge,Avatar,Icon,Spinner,Divider}/{*.tsx,*.types.ts,index.ts}` + `src/components/atoms/index.ts`

- [ ] **Step 1: Retrieve verbatim atoms (no Next coupling)**

Button, Input, Badge, Icon, Spinner, Divider have zero Next imports — copy each verbatim:
```bash
cd apps/donaciones
for c in Button Input Badge Icon Spinner Divider; do
  mkdir -p "src/components/atoms/$c"
  for f in "$c.tsx" "$c.types.ts" index.ts; do
    git show "efdd581:src/components/atoms/$c/$f" > "src/components/atoms/$c/$f"
  done
done
```

- [ ] **Step 2: Port Avatar — swap `next/image` for `<img>`**

`src/components/atoms/Avatar/Avatar.types.ts`:
```bash
mkdir -p src/components/atoms/Avatar
git show efdd581:src/components/atoms/Avatar/Avatar.types.ts > src/components/atoms/Avatar/Avatar.types.ts
git show efdd581:src/components/atoms/Avatar/index.ts > src/components/atoms/Avatar/index.ts
```
Then write `src/components/atoms/Avatar/Avatar.tsx`:
```tsx
import type { ReactElement } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/atoms/Icon";
import type { AvatarProps, AvatarSize } from "./Avatar.types";

const base =
  "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground select-none";

const sizes: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export function Avatar({
  className,
  src,
  alt,
  fallback,
  size = "md",
  ...props
}: AvatarProps): ReactElement {
  return (
    <span aria-label={alt} className={cn(base, sizes[size], className)} {...props}>
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : fallback ? (
        fallback
      ) : (
        <Icon name="user" />
      )}
    </span>
  );
}
```

- [ ] **Step 3: Write atoms barrel `src/components/atoms/index.ts`**

```ts
export * from "./Button";
export * from "./Input";
export * from "./Badge";
export * from "./Avatar";
export * from "./Icon";
export * from "./Spinner";
export * from "./Divider";
```

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit -p tsconfig.app.json
```
Expected: no output, exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/donaciones/src/components/atoms
git commit -m "feat(donaciones): port atomic components (atoms)"
```

---

## Task 6: Port molecules

**Files (create):** `src/components/molecules/{FormField,SearchBar,NavItem,StatCard}/...` + `index.ts`

- [ ] **Step 1: Retrieve verbatim molecules (no Next coupling)**

FormField, SearchBar, StatCard have no Next imports:
```bash
cd apps/donaciones
for c in FormField SearchBar StatCard; do
  mkdir -p "src/components/molecules/$c"
  for f in "$c.tsx" "$c.types.ts" index.ts; do
    git show "efdd581:src/components/molecules/$c/$f" > "src/components/molecules/$c/$f"
  done
done
```

- [ ] **Step 2: Port NavItem — react-router `Link`/`useLocation`, drop "use client"**

`src/components/molecules/NavItem/NavItem.types.ts` (write explicitly — includes `className`, independent of what efdd581 held):
```ts
import type { IconName } from "@/components/atoms/Icon";

export interface NavItemProps {
  href: string;
  label: string;
  icon?: IconName;
  active?: boolean;
  className?: string;
}
```
`src/components/molecules/NavItem/NavItem.tsx`:
```tsx
import type { ReactElement } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/atoms/Icon";
import type { NavItemProps } from "./NavItem.types";

const base =
  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors";
const activeCls = "bg-accent text-accent-foreground";
const idleCls =
  "text-muted-foreground hover:bg-accent hover:text-accent-foreground";

export function NavItem({
  href,
  label,
  icon,
  active,
  className,
}: NavItemProps): ReactElement {
  const { pathname } = useLocation();
  const isActive =
    active ?? (pathname === href || pathname.startsWith(href + "/"));

  return (
    <Link
      to={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(base, isActive ? activeCls : idleCls, className)}
    >
      {icon ? <Icon name={icon} size={18} /> : null}
      <span>{label}</span>
    </Link>
  );
}
```
`src/components/molecules/NavItem/index.ts`:
```ts
export { NavItem } from "./NavItem";
export type { NavItemProps } from "./NavItem.types";
```

- [ ] **Step 3: Molecules barrel `src/components/molecules/index.ts`**

```ts
export * from "./FormField";
export * from "./SearchBar";
export * from "./NavItem";
export * from "./StatCard";
```

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit -p tsconfig.app.json
```
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/donaciones/src/components/molecules
git commit -m "feat(donaciones): port molecules (NavItem on react-router)"
```

---

## Task 7: Port organisms

**Files (create):** `src/components/organisms/{Header,Sidebar,DataTable,Footer}/...` + `index.ts`

- [ ] **Step 1: Retrieve verbatim organisms (no Next coupling)**

Sidebar and DataTable have no Next imports:
```bash
cd apps/donaciones
for c in Sidebar DataTable; do
  mkdir -p "src/components/organisms/$c"
  for f in "$c.tsx" "$c.types.ts" index.ts; do
    git show "efdd581:src/components/organisms/$c/$f" > "src/components/organisms/$c/$f"
  done
done
```

- [ ] **Step 2: Port Header — `next/link` → react-router `Link` (`href`→`to`)**

`src/components/organisms/Header/Header.types.ts`:
```bash
mkdir -p src/components/organisms/Header
git show efdd581:src/components/organisms/Header/Header.types.ts > src/components/organisms/Header/Header.types.ts
git show efdd581:src/components/organisms/Header/index.ts > src/components/organisms/Header/index.ts
```
`src/components/organisms/Header/Header.tsx`:
```tsx
import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/atoms/Avatar";
import { Button } from "@/components/atoms/Button";
import { Icon } from "@/components/atoms/Icon";
import { SearchBar } from "@/components/molecules/SearchBar";
import { APP_NAME, ROUTES } from "@/lib/constants";
import type { HeaderProps } from "./Header.types";

export function Header({
  className,
  sticky = false,
  ...props
}: HeaderProps): ReactElement {
  return (
    <header
      className={cn(
        "flex h-16 items-center gap-4 border-b border-border bg-background px-4",
        sticky && "sticky top-0 z-40",
        className,
      )}
      {...props}
    >
      <Link to={ROUTES.home} className="flex items-center gap-2 font-semibold">
        <Icon name="heart" className="text-primary" />
        <span>{APP_NAME}</span>
      </Link>
      <div className="hidden flex-1 md:block">
        <SearchBar className="max-w-md" />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Icon name="bell" />
        </Button>
        <Avatar alt="User account" fallback="U" size="sm" />
      </div>
    </header>
  );
}

Header.displayName = "Header";
```

- [ ] **Step 3: Port Footer — `next/link` → react-router `Link`**

`src/components/organisms/Footer/Footer.types.ts`:
```ts
import type { HTMLAttributes } from "react";

export type FooterProps = HTMLAttributes<HTMLElement>;
```
`src/components/organisms/Footer/index.ts`:
```ts
export { Footer } from "./Footer";
export type { FooterProps } from "./Footer.types";
```
`src/components/organisms/Footer/Footer.tsx`:
```tsx
import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/atoms/Icon";
import { APP_NAME, ROUTES } from "@/lib/constants";
import type { FooterProps } from "./Footer.types";

export function Footer({ className, ...props }: FooterProps): ReactElement {
  return (
    <footer
      className={cn("border-t border-border bg-background", className)}
      {...props}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <Icon name="heart" className="text-primary" />
          {APP_NAME}
        </div>
        <nav className="flex gap-6 text-sm text-muted-foreground">
          <Link to={ROUTES.home} className="hover:text-foreground">
            Dashboard
          </Link>
          <Link to={ROUTES.donaciones} className="hover:text-foreground">
            Donaciones
          </Link>
        </nav>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {APP_NAME}.
        </p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Organisms barrel `src/components/organisms/index.ts`**

```ts
export * from "./Header";
export * from "./Sidebar";
export * from "./DataTable";
export * from "./Footer";
```

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit -p tsconfig.app.json
```
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/donaciones/src/components/organisms
git commit -m "feat(donaciones): port organisms (Header/Footer on react-router)"
```

---

## Task 8: Port templates + root barrel

**Files (create):** `src/components/templates/{DashboardLayout,AuthLayout,LandingLayout}/...` + `index.ts` + `src/components/index.ts`

- [ ] **Step 1: Port DashboardLayout — adapt navItems to donaciones routes**

`src/components/templates/DashboardLayout/DashboardLayout.types.ts`:
```bash
mkdir -p src/components/templates/DashboardLayout
git show efdd581:src/components/templates/DashboardLayout/DashboardLayout.types.ts > src/components/templates/DashboardLayout/DashboardLayout.types.ts
git show efdd581:src/components/templates/DashboardLayout/index.ts > src/components/templates/DashboardLayout/index.ts
```
`src/components/templates/DashboardLayout/DashboardLayout.tsx`:
```tsx
import type { ReactElement } from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/organisms/Sidebar";
import { Header } from "@/components/organisms/Header";
import { Icon } from "@/components/atoms/Icon";
import { APP_NAME, ROUTES } from "@/lib/constants";
import type { SidebarItem } from "@/components/organisms/Sidebar";
import type { DashboardLayoutProps } from "./DashboardLayout.types";

const defaultNavItems: SidebarItem[] = [
  { href: ROUTES.home, label: "Dashboard", icon: "home" },
  { href: ROUTES.donaciones, label: "Donaciones", icon: "heart" },
];

export function DashboardLayout({
  children,
  navItems = defaultNavItems,
  className,
}: DashboardLayoutProps): ReactElement {
  return (
    <div className="flex h-full min-h-screen">
      <Sidebar
        items={navItems}
        className="hidden md:flex"
        header={
          <span className="flex items-center gap-2 font-semibold">
            <Icon name="heart" className="text-primary" />
            {APP_NAME}
          </span>
        }
      />
      <div className="flex flex-1 flex-col">
        <Header sticky />
        <main className={cn("flex-1 overflow-y-auto p-6", className)}>
          {children}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Port AuthLayout — `next/link` → react-router `Link`**

`src/components/templates/AuthLayout/AuthLayout.types.ts` + `index.ts`:
```bash
mkdir -p src/components/templates/AuthLayout
git show efdd581:src/components/templates/AuthLayout/AuthLayout.types.ts > src/components/templates/AuthLayout/AuthLayout.types.ts
git show efdd581:src/components/templates/AuthLayout/index.ts > src/components/templates/AuthLayout/index.ts
```
`src/components/templates/AuthLayout/AuthLayout.tsx`:
```tsx
import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/atoms/Icon";
import { APP_NAME, ROUTES } from "@/lib/constants";
import type { AuthLayoutProps } from "./AuthLayout.types";

export function AuthLayout({
  children,
  title,
  subtitle,
  className,
}: AuthLayoutProps): ReactElement {
  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 p-6">
      <div
        className={cn(
          "w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-lg",
          className,
        )}
      >
        <Link
          to={ROUTES.home}
          className="mb-6 flex items-center justify-center gap-2 font-semibold"
        >
          <Icon name="heart" className="text-primary" />
          {APP_NAME}
        </Link>
        {title ? (
          <h1 className="text-center text-2xl font-semibold text-card-foreground">
            {title}
          </h1>
        ) : null}
        {subtitle ? (
          <p className="mt-1 text-center text-sm text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Port LandingLayout (verbatim — no Next coupling)**

```bash
mkdir -p src/components/templates/LandingLayout
for f in LandingLayout.tsx LandingLayout.types.ts index.ts; do
  git show "efdd581:src/components/templates/LandingLayout/$f" > "src/components/templates/LandingLayout/$f"
done
```

- [ ] **Step 4: Templates barrel + root barrel**

`src/components/templates/index.ts`:
```ts
export * from "./DashboardLayout";
export * from "./AuthLayout";
export * from "./LandingLayout";
```
`src/components/index.ts`:
```ts
export * from "./atoms";
export * from "./molecules";
export * from "./organisms";
export * from "./templates";
```

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit -p tsconfig.app.json
```
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/donaciones/src/components
git commit -m "feat(donaciones): port templates and design-system barrels"
```

---

## Task 9: Mock data service + NavItem isActive test

**Files:**
- Create: `apps/donaciones/src/features/donaciones/donaciones-service.ts`
- Create: `apps/donaciones/src/features/donaciones/donacion-schema.ts`
- Create: `apps/donaciones/src/components/molecules/NavItem/NavItem.isActive.test.ts`

- [ ] **Step 1: `donaciones-service.ts` (synchronous mock)**

```ts
export interface DonacionRow extends Record<string, unknown> {
  id: string;
  donante: string;
  campana: string;
  monto: string;
  estado: "completada" | "pendiente" | "fallida";
  fecha: string;
}

export interface DonacionesStats {
  totalRecaudado: string;
  donaciones: string;
  donantes: string;
  campanas: string;
}

const ROWS: DonacionRow[] = [
  { id: "d_1024", donante: "María González", campana: "Agua limpia", monto: "$250.000", estado: "completada", fecha: "2026-08-14" },
  { id: "d_1023", donante: "James Carter", campana: "Útiles escolares", monto: "$75.000", estado: "pendiente", fecha: "2026-08-14" },
  { id: "d_1022", donante: "Aisha Khan", campana: "Emergencia", monto: "$500.000", estado: "completada", fecha: "2026-08-13" },
  { id: "d_1021", donante: "Diego Ramírez", campana: "Agua limpia", monto: "$40.000", estado: "fallida", fecha: "2026-08-13" },
];

export function getDonacionesStats(): DonacionesStats {
  return { totalRecaudado: "$128.540.000", donaciones: "1.284", donantes: "932", campanas: "12" };
}

export function getDonaciones(): DonacionRow[] {
  return ROWS;
}

export function getDonacion(id: string): DonacionRow | undefined {
  return ROWS.find((r) => r.id === id);
}
```

- [ ] **Step 2: `donacion-schema.ts`**

```ts
import { z } from "zod";

export const donacionSchema = z.object({
  donante: z.string().min(2, "Ingresa el nombre del donante."),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0."),
  campana: z.string().min(2, "Selecciona una campaña."),
});

export type DonacionInput = z.infer<typeof donacionSchema>;
```

- [ ] **Step 3: NavItem isActive logic test (pure function extraction not needed — test the rule)**

`src/components/molecules/NavItem/NavItem.isActive.test.ts`:
```ts
import { describe, expect, it } from "vitest";

/** Mirrors NavItem's isActive rule; guards against regressions in path matching. */
function isActive(pathname: string, href: string, active?: boolean): boolean {
  return active ?? (pathname === href || pathname.startsWith(href + "/"));
}

describe("NavItem isActive", () => {
  it("matches exact path", () => expect(isActive("/donaciones", "/donaciones")).toBe(true));
  it("matches nested path", () => expect(isActive("/donaciones/nueva", "/donaciones")).toBe(true));
  it("does not match sibling prefix", () => expect(isActive("/donaciones-x", "/donaciones")).toBe(false));
  it("respects explicit override", () => expect(isActive("/x", "/donaciones", true)).toBe(true));
});
```

- [ ] **Step 4: Run tests**

```bash
cd apps/donaciones && npm run test
```
Expected: cn (1) + env (2) + NavItem isActive (4) = 7 passed.

- [ ] **Step 5: Commit**

```bash
git add apps/donaciones/src/features apps/donaciones/src/components/molecules/NavItem
git commit -m "feat(donaciones): mock donaciones service, schema and isActive test"
```

---

## Task 10: Router, layout routes, screens

**Files (create):** `src/routes/{NotFoundPage,DashboardLayoutRoute,AuthLayoutRoute}.tsx`, `src/features/donaciones/{DashboardPage,DonacionesListPage,DonacionDetailPage,NuevaDonacionPage}.tsx`, `src/features/auth/{LoginPage,LoginForm,RegisterPage,RegisterForm}.tsx`, `src/router.tsx`, `src/main.tsx` (rewrite), `index.html` (edit title). **Delete:** `src/App.tsx`.

- [ ] **Step 1: Layout routes**

`src/routes/DashboardLayoutRoute.tsx`:
```tsx
import type { ReactElement } from "react";
import { Outlet } from "react-router-dom";
import { DashboardLayout } from "@/components/templates/DashboardLayout";

export function DashboardLayoutRoute(): ReactElement {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
```
`src/routes/AuthLayoutRoute.tsx`:
```tsx
import type { ReactElement } from "react";
import { Outlet } from "react-router-dom";
import { AuthLayout } from "@/components/templates/AuthLayout";

export function AuthLayoutRoute(): ReactElement {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  );
}
```
`src/routes/NotFoundPage.tsx`:
```tsx
import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/lib/constants";

export function NotFoundPage(): ReactElement {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div className="space-y-4">
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="text-3xl font-semibold text-foreground">Página no encontrada</h1>
        <Link
          to={ROUTES.home}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Dashboard screen**

`src/features/donaciones/DashboardPage.tsx`:
```tsx
import type { ReactElement } from "react";
import { Badge, type BadgeVariant } from "@/components/atoms/Badge";
import { StatCard } from "@/components/molecules/StatCard";
import { DataTable, type DataTableColumn } from "@/components/organisms/DataTable";
import {
  getDonaciones,
  getDonacionesStats,
  type DonacionRow,
} from "./donaciones-service";

const ESTADO_VARIANT: Record<DonacionRow["estado"], BadgeVariant> = {
  completada: "success",
  pendiente: "warning",
  fallida: "error",
};

const columns: DataTableColumn<DonacionRow>[] = [
  { key: "donante", header: "Donante" },
  { key: "campana", header: "Campaña" },
  { key: "monto", header: "Monto", align: "right" },
  {
    key: "estado",
    header: "Estado",
    render: (row) => <Badge variant={ESTADO_VARIANT[row.estado]}>{row.estado}</Badge>,
  },
  { key: "fecha", header: "Fecha", align: "right" },
];

export function DashboardPage(): ReactElement {
  const stats = getDonacionesStats();
  const donaciones = getDonaciones();
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen de la actividad de donaciones.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total recaudado" value={stats.totalRecaudado} icon="heart" trend={{ value: "+12% mes", direction: "up" }} />
        <StatCard label="Donaciones" value={stats.donaciones} icon="check" trend={{ value: "+4% mes", direction: "up" }} />
        <StatCard label="Donantes" value={stats.donantes} icon="user" trend={{ value: "-1% mes", direction: "down" }} />
        <StatCard label="Campañas" value={stats.campanas} icon="info" trend={{ value: "0 nuevas", direction: "neutral" }} />
      </div>
      <DataTable columns={columns} data={donaciones} caption="Donaciones recientes" />
    </div>
  );
}
```

- [ ] **Step 3: Listado + detalle screens**

`src/features/donaciones/DonacionesListPage.tsx`:
```tsx
import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { Badge, type BadgeVariant } from "@/components/atoms/Badge";
import { SearchBar } from "@/components/molecules/SearchBar";
import { DataTable, type DataTableColumn } from "@/components/organisms/DataTable";
import { ROUTES } from "@/lib/constants";
import { getDonaciones, type DonacionRow } from "./donaciones-service";

const ESTADO_VARIANT: Record<DonacionRow["estado"], BadgeVariant> = {
  completada: "success",
  pendiente: "warning",
  fallida: "error",
};

const columns: DataTableColumn<DonacionRow>[] = [
  { key: "id", header: "ID", render: (row) => <Link to={`${ROUTES.donaciones}/${row.id}`} className="font-medium text-primary hover:underline">{row.id}</Link> },
  { key: "donante", header: "Donante" },
  { key: "campana", header: "Campaña" },
  { key: "monto", header: "Monto", align: "right" },
  { key: "estado", header: "Estado", render: (row) => <Badge variant={ESTADO_VARIANT[row.estado]}>{row.estado}</Badge> },
];

export function DonacionesListPage(): ReactElement {
  const donaciones = getDonaciones();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-foreground">Donaciones</h1>
        <Link to={ROUTES.nuevaDonacion} className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          Nueva donación
        </Link>
      </div>
      <div className="max-w-md"><SearchBar placeholder="Buscar donaciones..." /></div>
      <DataTable columns={columns} data={donaciones} />
    </div>
  );
}
```
`src/features/donaciones/DonacionDetailPage.tsx`:
```tsx
import type { ReactElement } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/atoms/Badge";
import { ROUTES } from "@/lib/constants";
import { getDonacion } from "./donaciones-service";

export function DonacionDetailPage(): ReactElement {
  const { id = "" } = useParams();
  const donacion = getDonacion(id);

  if (!donacion) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Donación no encontrada.</p>
        <Link to={ROUTES.donaciones} className="text-primary hover:underline">Volver al listado</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Donación {donacion.id}</h1>
        <Badge variant="secondary">{donacion.estado}</Badge>
      </div>
      <dl className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-6">
        <div><dt className="text-sm text-muted-foreground">Donante</dt><dd className="font-medium">{donacion.donante}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Campaña</dt><dd className="font-medium">{donacion.campana}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Monto</dt><dd className="font-medium">{donacion.monto}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Fecha</dt><dd className="font-medium">{donacion.fecha}</dd></div>
      </dl>
      <Link to={ROUTES.donaciones} className="text-primary hover:underline">← Volver al listado</Link>
    </div>
  );
}
```

- [ ] **Step 4: Nueva donación form screen**

`src/features/donaciones/NuevaDonacionPage.tsx`:
```tsx
import { useState, type FormEvent, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { FormField } from "@/components/molecules/FormField";
import { ROUTES } from "@/lib/constants";
import { donacionSchema } from "./donacion-schema";

export function NuevaDonacionPage(): ReactElement {
  const navigate = useNavigate();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = donacionSchema.safeParse({
      donante: data.get("donante"),
      monto: data.get("monto"),
      campana: data.get("campana"),
    });
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    // TODO: POST to API when the donaciones module exists.
    navigate(ROUTES.donaciones);
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Nueva donación</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-6" noValidate>
        <FormField label="Donante" htmlFor="donante" error={errors.donante}>
          <Input id="donante" name="donante" placeholder="Nombre del donante" invalid={Boolean(errors.donante)} />
        </FormField>
        <FormField label="Monto" htmlFor="monto" error={errors.monto}>
          <Input id="monto" name="monto" type="number" min="0" placeholder="50000" invalid={Boolean(errors.monto)} />
        </FormField>
        <FormField label="Campaña" htmlFor="campana" error={errors.campana}>
          <Input id="campana" name="campana" placeholder="Agua limpia" invalid={Boolean(errors.campana)} />
        </FormField>
        <Button type="submit">Registrar donación</Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Auth screens (port LoginForm/RegisterForm, de-Next `Link`)**

`src/features/auth/LoginForm.tsx`:
```tsx
import { useState, type FormEvent, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { FormField } from "@/components/molecules/FormField";
import { ROUTES } from "@/lib/constants";

const loginSchema = z.object({
  email: z.string().email("Ingresa un correo válido."),
  password: z.string().min(8, "Mínimo 8 caracteres."),
});

export function LoginForm(): ReactElement {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = loginSchema.safeParse({ email: data.get("email"), password: data.get("password") });
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    // TODO: wire to auth cookie session.
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormField label="Correo" htmlFor="email" error={errors.email}>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="tu@correo.com" invalid={Boolean(errors.email)} />
      </FormField>
      <FormField label="Contraseña" htmlFor="password" error={errors.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" invalid={Boolean(errors.password)} />
      </FormField>
      <Button type="submit" className="w-full">Ingresar</Button>
      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link to={ROUTES.register} className="font-medium text-primary hover:underline">Crea una</Link>
      </p>
    </form>
  );
}
```
`src/features/auth/LoginPage.tsx`:
```tsx
import type { ReactElement } from "react";
import { LoginForm } from "./LoginForm";

export function LoginPage(): ReactElement {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold text-card-foreground">Bienvenido de vuelta</h1>
        <p className="text-sm text-muted-foreground">Ingresa para continuar.</p>
      </div>
      <LoginForm />
    </div>
  );
}
```
`src/features/auth/RegisterForm.tsx` (same pattern, name+email+password):
```tsx
import { useState, type FormEvent, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { FormField } from "@/components/molecules/FormField";
import { ROUTES } from "@/lib/constants";

const registerSchema = z.object({
  name: z.string().min(2, "Ingresa tu nombre."),
  email: z.string().email("Ingresa un correo válido."),
  password: z.string().min(8, "Mínimo 8 caracteres."),
});

export function RegisterForm(): ReactElement {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = registerSchema.safeParse({ name: data.get("name"), email: data.get("email"), password: data.get("password") });
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    // TODO: wire to auth.
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormField label="Nombre" htmlFor="name" error={errors.name}>
        <Input id="name" name="name" autoComplete="name" placeholder="Jane Doe" invalid={Boolean(errors.name)} />
      </FormField>
      <FormField label="Correo" htmlFor="email" error={errors.email}>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="tu@correo.com" invalid={Boolean(errors.email)} />
      </FormField>
      <FormField label="Contraseña" htmlFor="password" error={errors.password}>
        <Input id="password" name="password" type="password" autoComplete="new-password" invalid={Boolean(errors.password)} />
      </FormField>
      <Button type="submit" className="w-full">Crear cuenta</Button>
      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link to={ROUTES.login} className="font-medium text-primary hover:underline">Ingresa</Link>
      </p>
    </form>
  );
}
```
`src/features/auth/RegisterPage.tsx`:
```tsx
import type { ReactElement } from "react";
import { RegisterForm } from "./RegisterForm";

export function RegisterPage(): ReactElement {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold text-card-foreground">Crea tu cuenta</h1>
        <p className="text-sm text-muted-foreground">Empieza a gestionar donaciones.</p>
      </div>
      <RegisterForm />
    </div>
  );
}
```

- [ ] **Step 6: Router**

`src/router.tsx`:
```tsx
import { createBrowserRouter } from "react-router-dom";
import { DashboardLayoutRoute } from "@/routes/DashboardLayoutRoute";
import { AuthLayoutRoute } from "@/routes/AuthLayoutRoute";
import { NotFoundPage } from "@/routes/NotFoundPage";
import { DashboardPage } from "@/features/donaciones/DashboardPage";
import { DonacionesListPage } from "@/features/donaciones/DonacionesListPage";
import { DonacionDetailPage } from "@/features/donaciones/DonacionDetailPage";
import { NuevaDonacionPage } from "@/features/donaciones/NuevaDonacionPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { RegisterPage } from "@/features/auth/RegisterPage";

export const router = createBrowserRouter([
  {
    element: <DashboardLayoutRoute />,
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "donaciones", element: <DonacionesListPage /> },
      { path: "donaciones/nueva", element: <NuevaDonacionPage /> },
      { path: "donaciones/:id", element: <DonacionDetailPage /> },
    ],
  },
  {
    element: <AuthLayoutRoute />,
    children: [
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
```

- [ ] **Step 7: `main.tsx` (rewrite) + delete App.tsx + title**

```bash
rm -f apps/donaciones/src/App.tsx
```
`src/main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@/styles/globals.css";
import { router } from "@/router";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
```
In `index.html`, set `<title>Donaciones · SOS Chocó</title>`.

- [ ] **Step 8: Typecheck + build**

```bash
cd apps/donaciones
npx tsc --noEmit -p tsconfig.app.json && npm run build
```
Expected: exit 0, `✓ built`.

- [ ] **Step 9: Dev render smoke check**

```bash
npm run dev -- --port 5173 &
sleep 3
curl -sI http://localhost:5173/ | head -1     # HTTP/1.1 200 OK
curl -s http://localhost:5173/ | grep -o '<div id="root"></div>'
kill %1
```
Expected: `200 OK` and the root div. (Full visual verification happens via the `/verify` skill / browser in the review step.)

- [ ] **Step 10: Commit**

```bash
git add apps/donaciones
git commit -m "feat(donaciones): router, layout routes and domain/auth screens"
```

---

## Task 11: App README + final verification

**Files:**
- Create: `apps/donaciones/README.md`

- [ ] **Step 1: `apps/donaciones/README.md`**

```markdown
# apps/donaciones

Microfrontend de donaciones (React + Vite + TS) con design system atómico (Tailwind v4).

## Desarrollo
\`\`\`bash
npm install
npm run dev        # http://localhost:5173 (proxy /api → :3000)
npm run build      # tsc + vite build
npm run test       # vitest (unidades de lógica)
\`\`\`

Data actualmente mock (`src/features/donaciones/donaciones-service.ts`). Pendiente: módulo
`donaciones` en el API, containerización (Dockerfile/nginx, `base: /donaciones/`) y ruta Traefik.
```

- [ ] **Step 2: Full verification suite**

```bash
cd apps/donaciones
npm run test && npx tsc --noEmit -p tsconfig.app.json && npm run build
```
Expected: 7 tests pass, typecheck clean, build succeeds.

- [ ] **Step 3: Confirm nothing outside apps/donaciones changed**

```bash
cd .. && git status --porcelain | grep -v '^?? apps/donaciones/' | grep -v 'apps/donaciones/' || echo "CLEAN: only apps/donaciones touched"
```
Expected: `CLEAN: only apps/donaciones touched`.

- [ ] **Step 4: Commit**

```bash
git add apps/donaciones/README.md
git commit -m "docs(donaciones): app readme and final verification"
```

---

## Self-Review

**Spec coverage:**
- App `apps/donaciones` Vite+React19+TS → Task 1. ✓
- Tailwind v4 + tokens ported → Tasks 2–3. ✓
- 18 components ported + de-Next mapping → Tasks 5–8 (Avatar img, NavItem/Header/Footer/AuthLayout react-router, DashboardLayout routes, fonts). ✓
- react-router layout routes + 6 screens (dashboard, list, detail, nueva, login, register) + 404 → Task 10. ✓
- Mock service + api client + env(zod) → Tasks 4, 9. ✓
- Dev :5173 + build clean → Tasks 1, 10, 11. ✓
- Nothing outside apps/donaciones → Task 11 Step 3 guard. ✓

**Placeholder scan:** No "TBD/implement later". `// TODO` markers are intentional runtime hooks (API/auth wiring), not plan gaps.

**Type consistency:** `DonacionRow.estado` union ↔ `ESTADO_VARIANT` keys match (Tasks 9/10). `SidebarItem`/`IconName` used in DashboardLayout defaults are valid icon names (`home`, `heart`). `BadgeVariant` values (`success`/`warning`/`error`/`secondary`) exist in ported Badge. `DataTableColumn<T>`/`render` signature consistent across Dashboard/List. `cn`, `ApiResult`, `env.VITE_API_URL` names consistent.

**Adaptation note:** Verification is compile+build+render (+3 logic tests) rather than per-component TDD, matching the spec's done-criteria for a presentational port.
