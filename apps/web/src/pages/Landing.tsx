import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import logoFull from '@/assets/logo-full.png';
import logoMark from '@/assets/logo-mark.png';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Icon } from '@/components/atoms/Icon';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useSession } from '../lib/AuthProvider';
import { type ApiHealth, fetchApiHealth } from '../lib/health';

const MODULES = [
  {
    path: '/app/acopios',
    titleKey: 'landing.modules.acopios.title',
    bodyKey: 'landing.modules.acopios.body',
  },
  {
    path: '/app/usuarios',
    titleKey: 'landing.modules.usuarios.title',
    bodyKey: 'landing.modules.usuarios.body',
  },
  {
    path: ROUTES.donaciones,
    titleKey: 'landing.modules.donaciones.title',
    bodyKey: 'landing.modules.donaciones.body',
  },
] as const;

// Envíos no tiene ruta todavía: la tarjeta queda sin enlace ("próximamente"),
// igual que hacía /donaciones antes de que DonacionesPage existiera.
const UPCOMING_MODULE = {
  path: '/app/envios',
  titleKey: 'landing.modules.envios.title',
  bodyKey: 'landing.modules.envios.body',
} as const;

// Estas clases replican a mano `base` + `variants` de Button (pastilla, 44px,
// focus-visible): Link necesita renderizar un <a> real para navegación, y
// Button solo expone un <button>, así que no se puede reusar el componente.
const pillPrimaryClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-pill bg-accent px-5 text-sm font-semibold text-primary transition-colors hover:brightness-105 active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
const pillSecondaryClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-pill bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
const navLinkClass =
  'inline-flex min-h-11 items-center rounded-md px-2 text-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export default function Landing() {
  const { t } = useTranslation();
  const { isAuthenticated, logout } = useSession();
  const [health, setHealth] = useState<ApiHealth>({
    liveness: 'checking',
    readiness: 'checking',
  });

  useEffect(() => {
    void fetchApiHealth().then(setHealth);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8 lg:px-16">
        <Link
          to={ROUTES.home}
          aria-label={t('landing.homeAria', { appName: APP_NAME })}
          className="inline-flex min-h-11 items-center"
        >
          <img src={logoMark} alt={APP_NAME} className="h-11 w-auto" />
        </Link>
        <nav
          className="flex flex-wrap items-center gap-2 sm:gap-4"
          aria-label={t('landing.primaryNavAria')}
        >
          <a href="/api/docs" className={cn(navLinkClass, 'text-muted-foreground')}>
            {t('landing.apiLink')}
          </a>
          {isAuthenticated ? (
            <>
              <Link to={ROUTES.app} className={pillSecondaryClass}>
                {t('landing.goToPanel')}
                <Icon name="chevron-right" size={16} />
              </Link>
              <Button variant="ghost" size="sm" onClick={logout}>
                {t('common.signOut')}
              </Button>
            </>
          ) : (
            <>
              <Link to={ROUTES.signIn} className={navLinkClass}>
                {t('auth.signIn')}
              </Link>
              <Link to={ROUTES.signUp} className={pillPrimaryClass}>
                {t('auth.signUp')}
                <Icon name="chevron-right" size={16} />
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="flex flex-1 flex-col gap-10 px-4 pb-16 pt-2 sm:px-8 lg:px-16">
        <section className="flex flex-wrap items-end justify-between gap-10">
          <h1 className="m-0">
            <img
              src={logoFull}
              alt={t('landing.hero.logoAlt')}
              className="h-auto w-[min(320px,58vw)]"
            />
          </h1>
          <div className="flex max-w-xl flex-col gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {t('landing.hero.eyebrow')}
            </p>
            <p className="text-base font-medium leading-relaxed text-muted-foreground">
              {t('landing.hero.lede')}
            </p>
            {!isAuthenticated ? (
              <Link to={ROUTES.signUp} className={cn(pillPrimaryClass, 'self-start')}>
                {t('auth.createAccount')}
                <Icon name="chevron-right" size={16} />
              </Link>
            ) : null}
          </div>
        </section>

        <section
          className="flex flex-wrap items-center gap-8 rounded-xl bg-primary px-5 py-5 sm:px-6"
          aria-live="polite"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground/60">
              {t('landing.status.api')}
            </span>
            <span className="text-sm font-bold text-primary-foreground">
              {t(`landing.status.${health.liveness}`)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground/60">
              {t('landing.status.db')}
            </span>
            <span className="text-sm font-bold text-primary-foreground">
              {t(`landing.status.${health.readiness}`)}
            </span>
          </div>
          <a
            href="/api/docs"
            className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-pill bg-primary-panel px-4 text-sm font-bold text-accent transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Icon name="external-link" size={16} />
            {t('landing.status.docsLink')}
          </a>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t('landing.modules.title')}
          </h2>
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {MODULES.map((module) => (
              <Link
                key={module.path}
                to={module.path}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <p className="text-[11px] font-bold uppercase tracking-wide text-accent-foreground">
                  {module.path}
                </p>
                <h3 className="text-xl font-bold tracking-tight text-foreground">
                  {t(module.titleKey)}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{t(module.bodyKey)}</p>
              </Link>
            ))}
            <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-background p-6">
              <p className="text-[11px] font-bold uppercase tracking-wide text-accent-foreground">
                {UPCOMING_MODULE.path}
              </p>
              <h3 className="text-xl font-bold tracking-tight text-foreground">
                {t(UPCOMING_MODULE.titleKey)}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(UPCOMING_MODULE.bodyKey)}
              </p>
              <Badge variant="warning" className="mt-1 self-start">
                {t('landing.modules.soon')}
              </Badge>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
