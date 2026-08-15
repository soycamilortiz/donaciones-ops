import type { PermissionSlug } from '@soschoco/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { type Me, type Membership, readStoredOrgId, storeOrgId } from '../lib/api';
import { useApi } from '../lib/useApi';

type OrgContextValue = {
  me: Me;
  orgId: string;
  membership: Membership;
  setOrgId: (id: string) => void;
  refresh: () => Promise<void>;
  can: (permission: PermissionSlug) => boolean;
};

const OrgContext = createContext<OrgContextValue | null>(null);

const RUTAS_SIN_ORG = ['/empezar', '/empezar/organizacion', '/pendiente'];

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
    return <p className="page">Cargando sesión…</p>;
  }

  if (me.memberships.length === 0) {
    if (!RUTAS_SIN_ORG.includes(location.pathname)) {
      return <Navigate to="/empezar" replace />;
    }
    return <Outlet context={{ me, refresh }} />;
  }

  if (RUTAS_SIN_ORG.includes(location.pathname)) {
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
