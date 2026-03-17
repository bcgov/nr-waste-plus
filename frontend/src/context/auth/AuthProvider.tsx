import { fetchAuthSession, signInWithRedirect, signOut } from 'aws-amplify/auth';
import { isEqual } from 'lodash';
import { useEffect, useMemo, useState, useCallback, type ReactNode } from 'react';

import { AuthContext, type AuthContextType } from './AuthContext';
import { parseToken, getUserTokenFromCookie } from './authUtils';
import { type FamLoginUser, type IdpProviderType, type JWT } from './types';

import { env } from '@/env';

/**
 * Provides authenticated user state and auth actions to the application tree.
 *
 * @param props The provider props.
 * @param props.children The subtree that consumes auth state.
 * @returns The auth context provider.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FamLoginUser | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  const appEnv = Number.isNaN(Number(env.VITE_ZONE)) ? (env.VITE_ZONE ?? 'TEST') : 'TEST';
  const isMock = env.VITE_MOCK_AUTH === 'true';

  const loadUserToken = useCallback(async (): Promise<JWT | undefined> => {
    if (isMock) {
      // This is for test only
      const idToken = getUserTokenFromCookie();
      const payload = idToken ? JSON.parse(atob(idToken.split('.')[1])) : null;
      return payload ? { payload } : undefined;
    }

    const { idToken } = (await fetchAuthSession()).tokens ?? {};
    return idToken;
  }, [isMock]);

  /**
   * Refreshes the cached user state from the current authentication token.
   * When `silent` is true (periodic refresh), skips isLoading toggling and
   * only updates user state when the underlying data actually changed.
   */
  const refreshUserState = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const idToken = await loadUserToken();
        const newUser = idToken ? parseToken(idToken) : undefined;
        setUser((prev) => (isEqual(prev, newUser) ? prev : newUser));
      } catch {
        setUser(undefined);
        if (!silent) await signOut();
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [loadUserToken],
  );

  useEffect(() => {
    void refreshUserState().catch(() => {
      setUser(undefined);
      setIsLoading(false);
    });

    const interval = setInterval(
      () => {
        void refreshUserState(true);
      },
      3 * 60 * 1000,
    );
    return () => clearInterval(interval);
  }, [refreshUserState]);

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
      getClients: () =>
        user?.roles
          ?.flatMap((role) => role.clients ?? [])
          .filter((role, indexOfMap, self) => indexOfMap === self.indexOf(role)) ?? [],
    }),
    [user, isLoading, login, userToken],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
