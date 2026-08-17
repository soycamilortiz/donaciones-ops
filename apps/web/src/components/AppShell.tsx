import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router-dom';
import { useSession } from '../lib/AuthProvider';
import { LanguageSwitcher } from './molecules/LanguageSwitcher';
import { useOrg } from './OrgGate';

export default function AppShell() {
  const { me, orgId, membership, setOrgId } = useOrg();
  const { logout } = useSession();
  const { t } = useTranslation();

  return (
    <div className="app-shell">
      <aside>
        <p className="brand">SOS Chocó</p>
        <label className="field">
          {t('common.organization')}
          <select value={orgId} onChange={(event) => setOrgId(event.target.value)}>
            {me.memberships.map((item) => (
              <option key={item.organization.id} value={item.organization.id}>
                {item.organization.nombre}
              </option>
            ))}
          </select>
        </label>
        <p className="muted">{membership.role.nombre}</p>
        <nav>
          <NavLink to="/app" end>
            {t('nav.dashboard')}
          </NavLink>
          <NavLink to="/app/usuarios">{t('nav.users')}</NavLink>
          <NavLink to="/app/roles">{t('nav.roles')}</NavLink>
          <NavLink to="/app/acopios">{t('nav.acopios')}</NavLink>
          <NavLink to="/app/inventario">{t('nav.inventory')}</NavLink>
          <NavLink to="/app/recepciones">{t('nav.receptions')}</NavLink>
          <NavLink to="/app/donaciones">{t('nav.donations')}</NavLink>
        </nav>
      </aside>
      <div className="app-main">
        <header className="app-header">
          <span>
            {me.usuario} · {me.correo}
          </span>
          <LanguageSwitcher />
          <button type="button" className="linkish" onClick={logout}>
            {t('common.signOut')}
          </button>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
