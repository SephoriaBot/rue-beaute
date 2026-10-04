import { useCallback } from 'react';
import { useAuth } from '@clerk/react-router';

// fetch() that attaches the signed-in user's Clerk session token.
// The server works out who you are from this token, so pages never send a userId.
export function useApi() {
  const { getToken } = useAuth();

  const apiFetch = useCallback(
    async (input: string, init: RequestInit = {}) => {
      const token = await getToken();
      const headers = new Headers(init.headers);
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return fetch(input, { ...init, headers });
    },
    [getToken]
  );

  return { apiFetch, getToken };
}
