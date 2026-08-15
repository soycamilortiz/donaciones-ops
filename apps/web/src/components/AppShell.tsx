import { NavLink, Outlet } from 'react-router-dom';
import { useSession } from '../lib/AuthProvider';
import { useOrg } from './OrgGate';

export default function AppShell() {
  const { me, orgId, membership, setOrgId } = useOrg();
  const { logout } = useSession();

  return (
    <div className="app-shell">
      <aside>
        <p className="brand">SOS Chocó</p>
        <label className="field">
          Organización
          <select
            value={orgId}
            onChange={(event) => setOrgId(event.target.value)}
          >
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
            Resumen
          </NavLink>
          <NavLink to="/app/usuarios">Usuarios</NavLink>
          <NavLink to="/app/roles">Roles</NavLink>
          <NavLink to="/app/acopios">Acopios</NavLink>
        </nav>
      </aside>
      <div className="app-main">
        <header className="app-header">
          <span>
            {me.usuario} · {me.correo}
          </span>
          <button type="button" className="linkish" onClick={logout}>
            Salir
          </button>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
