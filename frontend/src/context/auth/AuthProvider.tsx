import { fetchAuthSession, signInWithRedirect, signOut } from 'aws-amplify/auth';
import { useEffect, useMemo, useState, useCallback, type ReactNode } from 'react';

import { env } from '@/env';

import { AuthContext, type AuthContextType } from './AuthContext';
import { parseToken, getUserTokenFromCookie } from './authUtils';
import { type FamLoginUser, type IdpProviderType, type JWT } from './types';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FamLoginUser | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  const appEnv = Number.isNaN(Number(env.VITE_ZONE)) ? (env.VITE_ZONE ?? 'TEST') : 'TEST';

  const refreshUserState = async () => {
    setIsLoading(true);
    try {
      const idToken = await loadUserToken();
      if (idToken) {
        setUser(parseToken(idToken));
      } else {
        setUser(undefined);
      }
    } catch {
      setUser(undefined);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUserState();
    const interval = setInterval(loadUserToken, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const login = useCallback(
    async (provider: IdpProviderType) => {
      const envProvider =
        provider === 'IDIR'
          ? `${appEnv.toLocaleUpperCase()}-IDIR`
          : `${appEnv.toLocaleUpperCase()}-BCEIDBUSINESS`;

      signInWithRedirect({
        provider: { custom: envProvider.toUpperCase() },
      });
    },
    [appEnv],
  );

  const logout = async () => {
    await signOut();
    setUser(undefined);
  };

  // Memoized function to get the current user's idToken from localStorage (via getUserTokenFromCookie)
  const userToken = useCallback(() => {
    return getUserTokenFromCookie();
  }, []);

  const contextValue: AuthContextType = useMemo(
    () => ({
      user,
      isLoggedIn: !!user,
      isLoading,
      login,
      logout,
      userToken,
      getClients: () => user?.roles?.flatMap((role) => role.clients ?? []) ?? [],
    }),
    [user, isLoading, login, userToken],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

const loadUserToken = async (): Promise<JWT | undefined> => {
  if (env.NODE_ENV === 'test') {
    // This is for test only
    const token = getUserTokenFromCookie();
    if (token) {
      const splittedToken = token.split('.')[1];
      if (splittedToken) {
        const jwtBody = JSON.parse(atob(splittedToken));
        return { payload: jwtBody };
      }
      throw new Error('Error parsing token');
    }
    throw new Error('No token found');
  } else {
    const { idToken } = (await fetchAuthSession()).tokens ?? {};
    return idToken;
  }
};
