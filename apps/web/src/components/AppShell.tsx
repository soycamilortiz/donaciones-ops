import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import logoMarkCream from '@/assets/logo-mark-cream.png';
import { Avatar } from '@/components/atoms/Avatar';
import { Button } from '@/components/atoms/Button';
import { Icon } from '@/components/atoms/Icon';
import { NavItem } from '@/components/molecules/NavItem';
import { useToast } from '@/components/molecules/Toast';
import { APP_NAV_ITEMS, filterNavItems } from '@/lib/nav-items';
import { useSession } from '../lib/AuthProvider';
// LanguageSwitcher hidden while the UI is locked to Spanish (see i18n/index.ts).
// import { LanguageSwitcher } from './molecules/LanguageSwitcher';
import { useOrg } from './OrgGate';

export default function AppShell() {
  const { me, orgId, membership, setOrgId, can } = useOrg();
  const { logout } = useSession();
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { avisar } = useToast();
  const mainRef = useRef<HTMLElement>(null);

  // UX-009: on route change move focus into the content region and reset the
  // scroll position, so keyboard and screen-reader users land on the new page
  // instead of staying on the previous page's last focus.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is not read inside the effect; it is the explicit trigger that re-runs focus/scroll on navigation.
  useEffect(() => {
    mainRef.current?.focus();
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  const navItems = filterNavItems(APP_NAV_ITEMS, can).map((item) => ({
    href: item.href,
    label: t(item.labelKey),
    icon: item.icon,
    exact: item.exact,
  }));

  const initials =
    (me.nombre || me.usuario)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase() || me.usuario.charAt(0).toUpperCase();

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground min-[900px]:flex-row">
      {/* UX-009: first focusable element is a visible-on-focus skip link. */}
      <a
        href="#main"
        className="absolute left-4 top-3 z-50 inline-flex min-h-11 -translate-y-24 items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg transition-transform focus:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
      >
        {t('nav.skipToContent')}
      </a>

      {/* UX-028: below 900px the sidebar collapses into a sticky horizontal strip. */}
      <aside className="ds-safe-top sticky top-0 z-30 flex w-full items-center gap-3.5 overflow-x-auto bg-primary px-4 pb-3 text-primary-foreground min-[900px]:h-screen min-[900px]:w-64 min-[900px]:flex-col min-[900px]:items-stretch min-[900px]:gap-6 min-[900px]:overflow-x-visible min-[900px]:overflow-y-auto min-[900px]:px-4 min-[900px]:py-6">
        <Link
          to="/app"
          className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary min-[900px]:px-2"
        >
          <img
            src={logoMarkCream}
            alt="SOS Chocó"
            width={520}
            height={441}
            className="h-11 w-auto min-[900px]:h-13"
          />
        </Link>

        <div className="flex shrink-0 items-center gap-2 min-[900px]:flex-col min-[900px]:items-stretch min-[900px]:gap-1.5">
          <span
            aria-hidden="true"
            className="hidden px-2 text-[9px] font-bold uppercase tracking-[0.14em] text-primary-foreground/60 min-[900px]:block"
          >
            {t('common.organization')}
          </span>
          <select
            aria-label={t('common.organization')}
            value={orgId}
            onChange={(event) => {
              const elegida = me.memberships.find(
                (item) => item.organization.id === event.target.value,
              );
              setOrgId(event.target.value);
              // Sin volver al panel te quedabas en, por ejemplo, /app/inventario
              // mirando datos de la organización anterior.
              navigate('/app');
              if (elegida) {
                avisar(t('session.orgSwitched', { name: elegida.organization.nombre }));
              }
            }}
            className="min-h-11 w-auto max-w-[12rem] cursor-pointer rounded-md border-none bg-primary-panel px-3 py-2 text-sm font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary min-[900px]:w-full min-[900px]:max-w-none"
          >
            {me.memberships.map((item) => (
              <option
                key={item.organization.id}
                value={item.organization.id}
                className="text-foreground"
              >
                {item.organization.nombre}
              </option>
            ))}
          </select>
          <p className="whitespace-nowrap text-xs font-bold uppercase tracking-wider text-accent min-[900px]:mt-0.5 min-[900px]:px-2">
            {membership.role.nombre}
          </p>
        </div>

        <nav
          aria-label={t('nav.primary')}
          className="flex items-center gap-1 min-[900px]:mt-2 min-[900px]:flex-col min-[900px]:items-stretch"
        >
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={item.exact ? pathname === item.href : undefined}
              className="shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
            />
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* UX-018: the topbar wraps, the email truncates, and Sign out stays reachable. */}
        <header className="z-20 flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border bg-card px-4 py-3 min-[900px]:sticky min-[900px]:top-0 min-[900px]:h-[72px] min-[900px]:flex-nowrap min-[900px]:px-10 min-[900px]:py-0">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar alt={me.usuario} fallback={initials} size="sm" />
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[13px] font-bold text-foreground">{me.usuario}</span>
              <span className="truncate text-[11px] font-medium text-muted-foreground">
                {me.correo}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {/* Language switcher hidden: UI locked to Spanish for now (see i18n/index.ts). */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={logout}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <Icon name="logout" size={16} />
              {t('common.signOut')}
            </Button>
          </div>
        </header>

        <main
          id="main"
          ref={mainRef}
          tabIndex={-1}
          className="flex flex-1 flex-col gap-5 px-5 pb-14 pt-6 outline-none min-[900px]:gap-[22px] min-[900px]:px-10 min-[900px]:pb-16 min-[900px]:pt-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
