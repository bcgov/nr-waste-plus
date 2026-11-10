import isEqual from 'lodash/isEqual';
import { useEffect, useMemo, useState, useCallback, type ReactNode } from 'react';
import { type User } from 'oidc-client-ts';

import { type FamLoginUser, type IdpProviderType } from '@/types/auth.types';
import { navigateTo } from '@/utils/navigation';

import { ensureFreshUser, removeUserLocally, signIn, signOut } from '@/services/keycloak';

import { AuthContext, type AuthContextType } from './AuthContext';
import { parseToken } from './authUtils';

/**
 * Decodes a JWT payload segment without signature verification. The payload
 * is already trusted at this point — `oidc-client-ts` verified the signature
 * against the realm JWKS before handing the token over.
 *
 * @param token The encoded JWT string.
 * @returns The decoded claims, or `undefined` when the token is malformed.
 */
const decodeJwtPayload = (token: string | undefined): Record<string, unknown> | undefined => {
  if (!token) return undefined;
  try {
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) return undefined;
    return JSON.parse(atob(payloadSegment.replace(/-/g, '+').replace(/_/g, '/'))) as Record<
      string,
      unknown
    >;
  } catch {
    return undefined;
  }
};

/**
 * Maps an OIDC user to the application user by merging the ID-token profile
 * with the decoded access-token payload. The access token wins: the CSS
 * integration mappers place `idir_username`, `display_name` and `client_roles`
 * on the access token.
 *
 * @param user The OIDC user returned by the user manager.
 * @returns The application user, or `undefined` when the user carries no tokens.
 */
const toAppUser = (user: User | null): FamLoginUser | undefined => {
  if (!user?.access_token && !user?.profile) return undefined;
  const claims = {
    ...(user.profile ?? {}),
    ...decodeJwtPayload(user.access_token),
  };
  const parsed = parseToken(claims);
  if (!parsed) return undefined;
  return { ...parsed, authToken: user.access_token };
};

/**
 * Preserves the existing roles array reference when the next auth user has the
 * same effective role assignments, avoiding unnecessary downstream recomputation.
 *
 * @param previousUser The previously cached authenticated user.
 * @param nextUser The next authenticated user produced from token refresh.
 * @returns The next user, reusing the previous roles reference when safe.
 */
export const preserveRolesReference = (
  previousUser: FamLoginUser | undefined,
  nextUser: FamLoginUser | undefined,
): FamLoginUser | undefined => {
  if (!previousUser || !nextUser) return nextUser;
  if (previousUser.roles === nextUser.roles) return nextUser;
  if (!isEqual(previousUser.roles, nextUser.roles)) return nextUser;

  return {
    ...nextUser,
    roles: previousUser.roles,
  };
};

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

  /**
   * Refreshes the cached user state from the OIDC user manager, silently
   * renewing the session first when the access token is expired or inside
   * the renewal margin.
   *
   * When `silent` is true (periodic refresh), skips the loading state and
   * only updates user state when the underlying data actually changed. The
   * non-silent path runs only on mount, where `isLoading` already starts
   * `true` — it just resolves back to `false`.
   */
  const refreshUserState = useCallback(async (silent = false) => {
    try {
      const oidcUser = await ensureFreshUser();
      const newUser = toAppUser(oidcUser);
      setUser((prev) => {
        if (isEqual(prev, newUser)) return prev;
        return preserveRolesReference(prev, newUser);
      });
    } catch {
      setUser(undefined);
      if (!silent) {
        // Initialization failed against a session that cannot be resolved —
        // drop any locally stored user so the app lands on the public routes.
        await removeUserLocally();
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      await refreshUserState();
    };

    void initializeAuth();

    const interval = setInterval(() => {
      void refreshUserState(true);
    }, 3 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshUserState]);

  const login = useCallback(async (provider: IdpProviderType) => {
    await signIn(provider);
  }, []);

  /**
   * Signs the user out through the realm's end-session endpoint. The stored
   * user is intentionally left in place for the redirect (the realm needs its
   * `id_token_hint`); local cleanup only happens as the failure fallback.
   */
  const logout = async () => {
    try {
      await signOut();
    } catch {
      await removeUserLocally();
      setUser(undefined);
      navigateTo('/');
    }
  };

  // Memoized accessor for the current access token, kept in sync with state.
  const userToken = useCallback(() => {
    return user?.authToken;
  }, [user]);

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
