import { Loading } from '@carbon/react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useLayoutEffect, type ComponentType } from 'react';

import type { FamRole } from '@/context/auth/types';

import { useAuth } from '@/context/auth/useAuth';
import { getUserAccessStatus, UNAUTHORIZED_PATH } from '@/context/auth/userAccessValidation';
import { persistRedirectUrl } from '@/routes/redirectStorage';

/**
 * HOC guard: enforces authentication and optional role requirements.
 *
 * While the auth context is resolving (`isLoading`), renders a Carbon
 * {@link Loading} overlay. Once resolved:
 *
 * - Unauthenticated users are redirected to `/login`; the attempted URL is
 *   persisted via {@link persistRedirectUrl} so it can be restored after login.
 * - Users with `'no-role'` status are redirected to {@link getUserAccessStatus}
 *   `redirectTo`.
 * - Users failing the optional `roles` check are redirected to `/unauthorized`
 *   with a `reason` search param.
 *
 * @param Component - The route component to protect.
 * @param roles - Optional array of {@link FamRole} values; at least one must match
 *   a role in `user.roles` for access to be granted.
 * @returns A HOC that renders the component only when access is authorised.
 */
export function withProtected<P extends object>(
  Component: ComponentType<P>,
  roles?: readonly FamRole[],
): ComponentType<P> {
  function Protected(props: P) {
    const { user, isLoading } = useAuth();
    const navigate = useNavigate();
    const { pathname, searchStr } = useRouterState({ select: (s) => s.location });

    const redirectTo = (() => {
      if (isLoading || !user) return null;
      const status = getUserAccessStatus(user);
      if (status.kind === 'no-role') return status.redirectTo;
      if (status.kind === 'role-error' && pathname !== UNAUTHORIZED_PATH) return status.redirectTo;
      if (roles?.length && !roles.some((r) => user.roles?.map((u) => u.role).includes(r.role))) {
        return '/unauthorized';
      }
      return null;
    })();

    useLayoutEffect(() => {
      if (isLoading) return;
      if (!user) {
        persistRedirectUrl(`${pathname}${searchStr}`);
        // /login is handled by the external Cognito auth provider, not an in-tree route.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        void navigate({ to: '/login' as any, replace: true });
        return;
      }
      if (redirectTo) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        void navigate({ to: redirectTo as any, replace: true });
      }
    }, [isLoading, user, pathname, searchStr, navigate, redirectTo]);

    if (isLoading || !user || redirectTo) {
      return <Loading data-testid="loading" withOverlay />;
    }

    return <Component {...props} />;
  }

  Protected.displayName = `withProtected(${Component.displayName ?? Component.name ?? 'Component'})`;
  return Protected;
}
