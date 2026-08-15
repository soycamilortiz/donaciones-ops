import { useCallback } from 'react';
import { ApiError, apiRequest } from './api';
import { useSession } from './AuthProvider';

export function useApi() {
  const { token, logout } = useSession();

  return useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      try {
        return await apiRequest<T>(path, token, init);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          logout();
        }
        throw error;
      }
    },
    [token, logout],
  );
}
