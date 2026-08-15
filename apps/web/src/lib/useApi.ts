import { useCallback } from 'react';
import { useSession } from './AuthProvider';
import { ApiError, apiRequest } from './api';

export function useApi() {
  const { token, logout } = useSession();

  return useCallback(
    async <T>(path: string, init?: RequestInit): Promise<T> => {
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
