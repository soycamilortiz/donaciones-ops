import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { IconName } from '@/components/atoms/Icon';
import { Icon } from '@/components/atoms/Icon';
import { useOrg } from '@/components/OrgGate';

export default function Dashboard() {
  const { membership, me } = useOrg();
  const { t } = useTranslation();
  const org = membership.organization;

  /* Module cards. Kept as data so adding one is a single entry, and so the
     copy lives in the catalogue rather than inline in the markup. Donaciones
     is intentionally left out of this grid — it already lives in the main nav. */
  const modules: Array<{ to: string; title: string; hint: string; icon: IconName }> = [
    { to: '/app/usuarios', title: t('nav.users'), hint: t('dashboard.usersHint'), icon: 'user' },
    { to: '/app/roles', title: t('nav.roles'), hint: t('dashboard.rolesHint'), icon: 'settings' },
    { to: '/app/acopios', title: t('nav.acopios'), hint: t('dashboard.acopiosHint'), icon: 'home' },
    {
      to: '/app/inventario',
      title: t('nav.inventory'),
      hint: t('dashboard.inventoryHint'),
      icon: 'menu',
    },
  ];

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
    </section>
  );
}
