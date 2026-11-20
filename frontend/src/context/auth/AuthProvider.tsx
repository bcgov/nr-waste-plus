import isEqual from 'lodash/isEqual';
import { type User } from 'oidc-client-ts';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { isUserActive, resetActivityTracking, startActivityTracking } from '@/services/activity';
import {
  ensureFreshUser,
  getStoredUser,
  needsRenewal,
  removeUserLocally,
  signIn,
  signOut,
} from '@/services/keycloak';
import { type FamLoginUser, type IdpProviderType } from '@/types/auth.types';
import { navigateTo } from '@/utils/navigation';

import { AuthContext, type AuthContextType } from './AuthContext';
import { parseToken } from './authUtils';

/** Renewal is scheduled this many seconds before the access token expires. */
const RENEWAL_LEAD_SECONDS = 65; // 60 s margin + 5 s buffer

/** Guards against duplicate evaluations from the expiry timer and fallback tick. */
const MIN_EVALUATION_INTERVAL_MS = 30_000;

/** Retry cadence and budget for an active user whose renewal failed. */
const RENEWAL_RETRY_MS = 60_000;
const MAX_RENEWAL_RETRIES = 2;

/** Fallback health check, retained from the original cadence. */
const FALLBACK_INTERVAL_MS = 3 * 60 * 1000;

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
 * Renewal is activity-gated: a visible tab with interaction inside the idle
 * window keeps its session alive; an idle or hidden tab lets the token lapse.
 *
 * @param props The provider props.
 * @param props.children The subtree that consumes auth state.
 * @returns The auth context provider.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FamLoginUser | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [renewalError, setRenewalError] = useState<string | undefined>(undefined);

  const renewalTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const lastEvaluationRef = useRef(0);
  const renewalRetriesRef = useRef(0);
  const evaluateRef = useRef<(silent: boolean) => Promise<void>>(async () => undefined);

  const clearRenewalTimer = useCallback(() => {
    if (renewalTimerRef.current) {
      clearTimeout(renewalTimerRef.current);
      renewalTimerRef.current = undefined;
    }
  }, []);

  /**
   * Schedules the next evaluation from a token expiry, or from a fixed retry
   * delay. Re-arming after every success is essential — otherwise renewal
   * regresses to the unaligned fallback tick.
   */
  const scheduleEvaluation = useCallback(
    (expiresAt?: number, retryDelayMs?: number) => {
      clearRenewalTimer();
      const nowMs = Date.now();
      const targetMs = expiresAt ? expiresAt * 1000 : nowMs + 5 * 60 * 1000;
      const delayMs =
        retryDelayMs ??
        Math.max(MIN_EVALUATION_INTERVAL_MS, targetMs - nowMs - RENEWAL_LEAD_SECONDS * 1000);
      renewalTimerRef.current = setTimeout(() => {
        void evaluateRef.current(true);
      }, delayMs);
    },
    [clearRenewalTimer],
  );

  const clearSessionLocally = useCallback(async () => {
    await removeUserLocally();
    setUser(undefined);
    clearRenewalTimer();
  }, [clearRenewalTimer]);

  const handleRenewalFailure = useCallback(async () => {
    renewalRetriesRef.current += 1;
    setRenewalError('renewal-failed');
    // Stable, test-visible failure signal required by the renewal plan.
    // eslint-disable-next-line no-console
    console.error('auth.renewal_failed');
    if (renewalRetriesRef.current >= MAX_RENEWAL_RETRIES) {
      await clearSessionLocally();
    } else {
      scheduleEvaluation(undefined, RENEWAL_RETRY_MS);
    }
  }, [clearSessionLocally, scheduleEvaluation]);

  /**
   * Evaluates the stored session. Active users inside the renewal window are
   * renewed; idle users with an expired token are cleared locally so the route
   * guard lands them on the public login buttons.
   *
   * @param silent Skip the loading flag and de-duplicate fallback ticks.
   */
  const refreshUserState = useCallback(
    async (silent = false) => {
      if (silent && Date.now() - lastEvaluationRef.current < MIN_EVALUATION_INTERVAL_MS) return;
      lastEvaluationRef.current = Date.now();

      try {
        const stored = await getStoredUser();
        if (!stored) {
          setUser(undefined);
          setRenewalError(undefined);
          clearRenewalTimer();
          return;
        }

        if (needsRenewal(stored) && !isUserActive()) {
          await clearSessionLocally();
          setRenewalError(undefined);
          return;
        }

        const current = await ensureFreshUser();
        if (!current) {
          await handleRenewalFailure();
          return;
        }

        renewalRetriesRef.current = 0;
        setRenewalError(undefined);
        const appUser = toAppUser(current);
        setUser((prev) => (isEqual(prev, appUser) ? prev : preserveRolesReference(prev, appUser)));
        scheduleEvaluation(current.expires_at);
      } catch {
        await handleRenewalFailure();
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [clearRenewalTimer, clearSessionLocally, handleRenewalFailure, scheduleEvaluation],
  );
  useEffect(() => {
    evaluateRef.current = refreshUserState;
    const stopTracking = startActivityTracking();

    // Keep the initialize function out of the effect body so the state update
    // happens after the mount commit, not synchronously during the effect.
    const initializeAuth = async (): Promise<void> => {
      await refreshUserState();
    };
    void initializeAuth();

    fallbackTimerRef.current = setInterval(() => {
      void refreshUserState(true);
    }, FALLBACK_INTERVAL_MS);

    return () => {
      stopTracking();
      if (fallbackTimerRef.current) clearInterval(fallbackTimerRef.current);
      clearRenewalTimer();
    };
  }, [refreshUserState, clearRenewalTimer]);

  const login = useCallback(async (provider: IdpProviderType) => {
    await signIn(provider);
  }, []);

  /**
   * Signs the user out through the realm's end-session endpoint. The stored
   * user is intentionally left in place for the redirect (the realm needs its
   * `id_token_hint`); local cleanup only happens as the failure fallback.
   */
  const logout = useCallback(async () => {
    resetActivityTracking();
    try {
      await signOut();
    } catch {
      await clearSessionLocally();
      navigateTo('/');
    }
  }, [clearSessionLocally]);

  // Memoized accessor for the current access token, kept in sync with state.
  const userToken = useCallback(() => {
    return user?.authToken;
  }, [user]);

  const contextValue: AuthContextType = useMemo(
    () => ({
      user,
      isLoggedIn: !!user,
      isLoading,
      renewalError,
      login,
      logout,
      userToken,
      getClients: () =>
        user?.roles
          ?.flatMap((role) => role.clients ?? [])
          .filter((role, indexOfMap, self) => indexOfMap === self.indexOf(role)) ?? [],
    }),
    [user, isLoading, renewalError, login, logout, userToken],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
