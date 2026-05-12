import { Loading } from '@carbon/react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useLayoutEffect, type ComponentType } from 'react';

import type { FamRole, FamLoginUser } from '@/context/auth/types';

import { useAuth } from '@/context/auth/useAuth';
import { getUserAccessStatus, UNAUTHORIZED_PATH } from '@/context/auth/userAccessValidation';
import { navigateInTree, type InTreePath } from '@/routes/inTreePaths';
import { persistRedirectUrl } from '@/routes/redirectStorage';

/**
 * Decide where to redirect a user based on auth state and optional role requirements.
 * Extracted to top-level to avoid deep function nesting inside `withProtected`.
 */
function computeRedirectTo(
  user: FamLoginUser | undefined,
  isLoading: boolean,
  pathname: string,
  roles?: readonly FamRole[],
): string | null {
  if (isLoading || !user) return null;

  const status = getUserAccessStatus(user);
  if (status.kind === 'no-role') return status.redirectTo;
  if (status.kind === 'role-error' && pathname !== UNAUTHORIZED_PATH) return status.redirectTo;

  if (roles?.length) {
    const userRoleSet = new Set((user.roles ?? []).map((u) => u.role));
    const requiredRoles = roles.map((r) => r.role);
    const hasMatch = requiredRoles.some((r) => userRoleSet.has(r));
    if (!hasMatch) return '/unauthorized';
  }

  return null;
}

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
 *   (no `reason` param; {@link RoleErrorPage} displays the generic permissions message).
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

    const redirectTo = computeRedirectTo(user, isLoading, pathname, roles);

    useLayoutEffect(() => {
      if (isLoading) return;
      if (!user) {
        // Guard against persisting '/login' itself: after navigate('/login') fires, TanStack
        // Router updates its state to pathname='/login' before this component unmounts, which
        // re-triggers this effect. Skip the persist on that second pass so we don't overwrite
        // the real intended URL that was already saved on the first pass.
        if (pathname !== '/login') {
          persistRedirectUrl(`${pathname}${searchStr}`);
        }
        // /login is an external Cognito URL, not an in-tree route — cast is intentional.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        void navigate({ to: '/login' as any, replace: true });
        return;
      }
      if (redirectTo) {
        navigateInTree(navigate, redirectTo as InTreePath, { replace: true });
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
