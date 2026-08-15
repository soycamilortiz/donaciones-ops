import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { clearToken, readStoredToken, storeToken } from './api';

type AuthContextValue = {
  token: string | null;
  isAuthenticated: boolean;
  setSession: (accessToken: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readStoredToken());

  const setSession = useCallback((accessToken: string) => {
    storeToken(accessToken);
    setToken(accessToken);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setToken(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      setSession,
      logout,
    }),
    [token, setSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSession(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useSession debe usarse dentro de AuthProvider');
  }
  return value;
}
