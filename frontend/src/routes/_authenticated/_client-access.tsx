import { Loading } from '@carbon/react';
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { useLayoutEffect } from 'react';

import { useAuth } from '@/context/auth/useAuth';
import { hasAnyRole } from '@/routing/auth';
import { Role } from '@/types/auth.types';

/**
 * Client-access tier: any-of VIEWER / SUBMITTER.
 *
 * Mirrors the reference role layout: one `REQUIRED_ROLES` const, roles read
 * synchronously from auth context, redirect in `useLayoutEffect` (legacy
 * no-flash timing), `Loading` while pending/denied, then `<Outlet/>`.
 * `staticData.roles` is nav metadata only — this component is the gate.
 */
const REQUIRED_ROLES: readonly Role[] = [Role.VIEWER, Role.SUBMITTER];

function ClientAccessLayout() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  const denied = !isLoading && !!user && !hasAnyRole(user?.roles, REQUIRED_ROLES);

  useLayoutEffect(() => {
    if (isLoading || !user || !denied) return;
    void navigate({ href: '/unauthorized', replace: true });
  }, [isLoading, user, denied, navigate]);

  if (isLoading || !user || denied) {
    return <Loading data-testid="loading" withOverlay />;
  }

  return <Outlet />;
}

export const Route = createFileRoute('/_authenticated/_client-access')({
  component: ClientAccessLayout,
  staticData: { roles: REQUIRED_ROLES },
});
