import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  readStoredOrgId,
  storeOrgId,
  type Me,
  type Membership,
} from '../lib/api';
import { useApi } from '../lib/useApi';

type OrgContextValue = {
  me: Me;
  orgId: string;
  membership: Membership;
  setOrgId: (id: string) => void;
  refresh: () => Promise<void>;
  can: (permission: string) => boolean;
};

const OrgContext = createContext<OrgContextValue | null>(null);

export function useOrg(): OrgContextValue {
  const value = useContext(OrgContext);
  if (!value) {
    throw new Error('useOrg debe usarse dentro de OrgGate');
  }
  return value;
}

export default function OrgGate() {
  const request = useApi();
  const location = useLocation();
  const [me, setMe] = useState<Me | null>(null);
  const [orgId, setOrgIdState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await request<Me>('/api/v1/me');
    setMe(data);
    const stored = readStoredOrgId();
    const match =
      data.memberships.find((item) => item.organization.id === stored) ??
      data.memberships.find((item) => item.isPrimary) ??
      data.memberships[0];
    setOrgIdState(match?.organization.id ?? null);
  }, [request]);

  useEffect(() => {
    void refresh().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el perfil');
    });
  }, [refresh]);

  const setOrgId = useCallback((id: string) => {
    storeOrgId(id);
    setOrgIdState(id);
  }, []);

  const membership = useMemo(
    () => me?.memberships.find((item) => item.organization.id === orgId),
    [me, orgId],
  );

  if (error) {
    return <p className="page">{error}</p>;
  }

  if (!me) {
    return <p className="page">Cargando organización…</p>;
  }

  if (me.memberships.length === 0) {
    if (location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />;
    }
    return <Outlet context={{ me, refresh }} />;
  }

  if (location.pathname === '/onboarding') {
    return <Navigate to="/app" replace />;
  }

  if (!orgId || !membership) {
    return <p className="page">No hay organización activa.</p>;
  }

  const value: OrgContextValue = {
    me,
    orgId,
    membership,
    setOrgId,
    refresh,
    can: (permission) => membership.permissions.includes(permission),
  };

  return (
    <OrgContext.Provider value={value}>
      <Outlet />
    </OrgContext.Provider>
  );
}
