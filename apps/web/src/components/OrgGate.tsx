import type { PermissionSlug } from '@soschoco/shared';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
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

/** Centred box for the three states the gate can get stuck on. */
function Estado({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      {children}
    </div>
  );
}

const RUTAS_SIN_ORG = ['/empezar', '/empezar/organizacion', '/pendiente'];

export function useOrg(): OrgContextValue {
  const value = useContext(OrgContext);
  if (!value) {
    throw new Error('useOrg debe usarse dentro de OrgGate');
  }
  return value;
}

export default function OrgGate() {
  const { t } = useTranslation();
  const request = useApi();
  const location = useLocation();
  const navigate = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [orgId, setOrgIdState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [reintentando, setReintentando] = useState(false);

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

  // UX-019: the raw message is for the console, not the screen — it arrives in
  // English ("Failed to fetch") and says nothing the user can act on.
  const cargar = useCallback(async () => {
    try {
      await refresh();
      setError(null);
    } catch (err) {
      console.error('GET /api/v1/me', err);
      setError(t('session.profileError'));
    }
  }, [refresh, t]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const reintentar = useCallback(async () => {
    setReintentando(true);
    try {
      await cargar();
    } finally {
      setReintentando(false);
    }
  }, [cargar]);

  const setOrgId = useCallback((id: string) => {
    storeOrgId(id);
    setOrgIdState(id);
  }, []);

  const membership = useMemo(
    () => me?.memberships.find((item) => item.organization.id === orgId),
    [me, orgId],
  );

  if (error) {
    return (
      <Estado>
        <p role="alert" className="text-sm font-medium text-error">
          {error}
        </p>
        <Button type="button" onClick={() => void reintentar()} disabled={reintentando}>
          {reintentando ? t('common.loading') : t('common.retry')}
        </Button>
      </Estado>
    );
  }

  if (!me) {
    return (
      <Estado>
        <p
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Spinner aria-hidden="true" className="h-4 w-4" />
          {t('session.loading')}
        </p>
      </Estado>
    );
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
    // A dead end otherwise: the person is in, has memberships, and none of them
    // resolves — /empezar is the only screen that can get them out of here.
    return (
      <Estado>
        <p role="alert" className="text-sm text-muted-foreground">
          {t('session.noActiveOrg')}
        </p>
        <Button type="button" onClick={() => navigate('/empezar')}>
          {t('session.noActiveOrgAction')}
        </Button>
      </Estado>
    );
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
