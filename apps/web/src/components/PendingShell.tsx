import { Link, Outlet, useOutletContext } from 'react-router-dom';
import { useSession } from '../lib/AuthProvider';
import type { Me } from '../lib/api';

type PendingContext = { me: Me; refresh: () => Promise<void> };

export default function PendingShell() {
  const { logout } = useSession();
  const context = useOutletContext<PendingContext>();

  return (
    <div className="page">
      <header className="topbar">
        <Link to="/" className="brand">
          SOS Chocó
        </Link>
        <button type="button" className="linkish" onClick={logout}>
          Salir
        </button>
      </header>
      <Outlet context={context} />
    </div>
  );
}
