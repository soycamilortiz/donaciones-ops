import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import logoFull from '@/assets/logo-full.png';
import logoMark from '@/assets/logo-mark.png';
import { Button } from '@/components/atoms/Button';
import { Icon } from '@/components/atoms/Icon';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useSession } from '../lib/AuthProvider';

// El landing guía a quien arma la operación: crea la cuenta, crea la
// organización (queda como administrador) y desde ahí suma e instruye al resto.
const STEPS = [
  { icon: 'user', titleKey: 'landing.start.step1.title', bodyKey: 'landing.start.step1.body' },
  { icon: 'home', titleKey: 'landing.start.step2.title', bodyKey: 'landing.start.step2.body' },
  { icon: 'users', titleKey: 'landing.start.step3.title', bodyKey: 'landing.start.step3.body' },
] as const;

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
                {t('auth.createAccount')}
                <Icon name="chevron-right" size={16} />
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 pb-14 pt-8 text-center sm:pt-14">
          <img
            src={logoFull}
            alt={t('landing.hero.logoAlt')}
            className="h-auto w-[min(300px,64vw)]"
          />
          <h1 className="m-0 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
            {t('landing.hero.headline')}
          </h1>
          <p className="m-0 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('landing.hero.lede')}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
            {isAuthenticated ? (
              <Link to={ROUTES.app} className={pillPrimaryClass}>
                {t('landing.goToPanel')}
                <Icon name="chevron-right" size={16} />
              </Link>
            ) : (
              <>
                <Link to={ROUTES.signUp} className={pillPrimaryClass}>
                  {t('auth.createAccount')}
                  <Icon name="chevron-right" size={16} />
                </Link>
                <Link to={ROUTES.signIn} className={pillSecondaryClass}>
                  {t('auth.signIn')}
                </Link>
              </>
            )}
          </div>
          <a
            href="/guias/"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {t('landing.hero.guidesLink')}
            <Icon name="arrowRight" size={15} />
          </a>
        </section>

        <section className="mx-auto w-full max-w-5xl px-4 pb-14">
          <h2 className="mb-6 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t('landing.start.title')}
          </h2>
          <ol className="m-0 grid list-none gap-5 p-0 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            {STEPS.map((step, index) => (
              <li
                key={step.titleKey}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                  <Icon name={step.icon} size={22} className="text-primary" />
                </div>
                <h3 className="m-0 text-lg font-bold tracking-tight text-foreground">
                  {t(step.titleKey)}
                </h3>
                <p className="m-0 text-sm leading-relaxed text-muted-foreground">
                  {t(step.bodyKey)}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto mb-16 w-full max-w-3xl px-4">
          <div className="flex flex-col items-start gap-4 rounded-xl bg-primary px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <p className="m-0 text-lg font-bold text-primary-foreground">
                {t('landing.invited.title')}
              </p>
              <p className="m-0 text-sm leading-relaxed text-primary-foreground/80">
                {t('landing.invited.body')}
              </p>
            </div>
            <Link to={ROUTES.signIn} className={cn(pillPrimaryClass, 'shrink-0')}>
              {t('landing.invited.cta')}
              <Icon name="chevron-right" size={16} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-6 sm:px-8 lg:px-16">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <span className="text-sm font-semibold text-muted-foreground">
            {APP_NAME} · {t('landing.footer.tagline')}
          </span>
          <a
            href="/api/docs"
            className="text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            {t('landing.apiLink')}
          </a>
        </div>
      </footer>
    </div>
  );
}
