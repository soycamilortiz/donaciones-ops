import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useOrg } from '../components/OrgGate';

export default function Dashboard() {
  const { membership, me } = useOrg();
  const { t } = useTranslation();
  const org = membership.organization;

  /* Module cards. Kept as data so adding one is a single entry, and so the
     copy lives in the catalogue rather than inline in the markup. */
  const modules = [
    { to: '/app/usuarios', title: t('nav.users'), hint: t('dashboard.usersHint') },
    { to: '/app/roles', title: t('nav.roles'), hint: t('dashboard.rolesHint') },
    { to: '/app/acopios', title: t('nav.acopios'), hint: t('dashboard.acopiosHint') },
    { to: '/app/inventario', title: t('nav.inventory'), hint: t('dashboard.inventoryHint') },
  ];

  return (
    <section className="panel">
      <h1>{org.nombre}</h1>
      <p className="muted">
        {t('dashboard.roleLine', { tipo: org.tipo, rol: membership.role.nombre })}
      </p>
      <p>{t('dashboard.switchOrg', { nombre: me.nombre, correo: me.correo })}</p>
      <ul className="modules">
        {modules.map((module) => (
          <li key={module.to}>
            <h2>{module.title}</h2>
            <p>{module.hint}</p>
            <Link to={module.to}>{t('dashboard.open')}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
