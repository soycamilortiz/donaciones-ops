import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/atoms/Icon';
import { useOrg } from '@/components/OrgGate';
import {
  APP_NAV_ITEMS,
  APP_NAV_SECONDARY,
  filterNavItems,
} from '@/lib/nav-items';

export default function Dashboard() {
  const { membership, me, can } = useOrg();
  const { t } = useTranslation();
  const org = membership.organization;

  const modules = filterNavItems([...APP_NAV_ITEMS, ...APP_NAV_SECONDARY], can)
    .filter((item) => item.href !== '/app' && item.dashboardHintKey)
    .map((item) => ({
      to: item.href,
      title: t(item.labelKey),
      hint: t(item.dashboardHintKey!),
      icon: item.icon,
    }));

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t('nav.dashboard')}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{org.nombre}</h1>
        <p className="text-sm text-muted-foreground">
          {t('dashboard.roleLine', { tipo: org.tipo, rol: membership.role.nombre })}
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
        <Icon name="info" className="shrink-0 text-primary" />
        <p className="text-sm text-foreground">
          {t('dashboard.switchOrg', { nombre: me.nombre, correo: me.correo })}
        </p>
      </div>

      {modules.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((module) => (
            <Link
              key={module.to}
              to={module.to}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="grid h-9 w-9 place-items-center rounded-md bg-secondary text-primary">
                <Icon name={module.icon} size={18} />
              </span>
              <h2 className="text-base font-bold text-foreground">{module.title}</h2>
              <p className="text-sm text-muted-foreground">{module.hint}</p>
              <span className="mt-auto flex items-center gap-1 text-sm font-semibold text-primary">
                {t('dashboard.open')}
                <Icon name="chevron-right" size={16} />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('dashboard.noModules')}</p>
      )}
    </section>
  );
}
