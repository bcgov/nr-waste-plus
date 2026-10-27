import { Loading } from '@carbon/react';
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { useLayoutEffect } from 'react';

import { useAuth } from '@/context/auth/useAuth';
import { hasAnyRole } from '@/routing/auth';
import { Role } from '@/types/auth.types';

/**
 * Admin tier: any-of ADMIN.
 *
 * Mirrors the reference role layout (`_admin.tsx`): one `REQUIRED_ROLES`
 * const, synchronous role read, `useLayoutEffect` redirect (legacy no-flash
 * timing), `Loading` while pending/denied, then `<Outlet/>`.
 * `staticData.roles` is nav metadata only — this component is the gate.
 */
const REQUIRED_ROLES: readonly Role[] = [Role.ADMIN];

function AdminLayout() {
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

export const Route = createFileRoute('/_authenticated/_admin')({
  component: AdminLayout,
  staticData: { roles: REQUIRED_ROLES },
});
