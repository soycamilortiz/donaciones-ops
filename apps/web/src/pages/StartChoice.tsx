import { useTranslation } from 'react-i18next';
import { Link, useOutletContext } from 'react-router-dom';
import { Icon } from '@/components/atoms/Icon';
import type { Me } from '../lib/api';

type OutletCtx = { me: Me; refresh: () => Promise<void> };

// Local pill-button classes mirror the Button atom (`min-h-11`, `rounded-pill`,
// focus ring) so these navigation links keep the same 44px tap target and
// keyboard affordance as a real <button>, without borrowing Button's
// internal (unexported) style constants.
const ctaBase =
  'inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-pill px-6 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export default function StartChoice() {
  const { t } = useTranslation();
  const { me } = useOutletContext<OutletCtx>();

  return (
    // PendingShell ya aporta el landmark <main>; aca va un contenedor simple
    // para no anidar dos <main> en la ruta /empezar.
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t('onboarding.greeting', { nombre: me.nombre })}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {t('onboarding.chooseTitle')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('onboarding.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-lg bg-primary p-6 text-primary-foreground">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-primary-panel text-accent">
            <Icon name="home" size={20} />
          </span>
          <h2 className="text-lg font-bold">{t('onboarding.createOrg')}</h2>
          <p className="text-sm text-primary-foreground/80">
            {t('onboarding.createOrgDescription')}
          </p>
          <Link
            className={`${ctaBase} mt-auto bg-accent text-primary hover:brightness-105 active:brightness-95`}
            to="/empezar/organizacion"
          >
            {t('onboarding.createOrg')}
            <Icon name="chevron-right" size={16} />
          </Link>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-secondary text-primary">
            <Icon name="mail" size={20} />
          </span>
          <h2 className="text-lg font-bold text-foreground">{t('onboarding.waitInvite')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('onboarding.waitInviteDescription', { correo: me.correo })}
          </p>
          <Link
            className={`${ctaBase} mt-auto border border-border text-foreground hover:bg-background`}
            to="/pendiente"
          >
            {t('onboarding.waitInvite')}
            <Icon name="chevron-right" size={16} />
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
        <Icon name="info" className="shrink-0 text-primary" />
        <p className="text-sm text-foreground">{t('onboarding.roleNote')}</p>
      </div>
    </div>
  );
}
