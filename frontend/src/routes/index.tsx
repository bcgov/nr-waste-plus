import { Loading } from '@carbon/react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useLayoutEffect } from 'react';

import { useAuth } from '@/context/auth/useAuth';
import LandingPage from '@/pages/Landing';

/**
 * Public-only landing page (port of the legacy `withPublicOnly` guard).
 *
 * - `isLoading` → labelled Carbon `Loading` (accessible content, not blank).
 * - Authenticated → `/dashboard` immediately (no landing flash).
 * - Unauthenticated → `LandingPage`.
 */
function PublicOnlyLanding() {
  const { isLoggedIn, isLoading } = useAuth();
  const navigate = useNavigate();

  useLayoutEffect(() => {
    if (!isLoading && isLoggedIn) {
      void navigate({ href: '/dashboard', replace: true });
    }
  }, [isLoading, isLoggedIn, navigate]);

  if (isLoading) return <Loading data-testid="loading" withOverlay />;
  if (isLoggedIn) return null; // redirect pending
  return <LandingPage />;
}

export const Route = createFileRoute('/')({
  component: PublicOnlyLanding,
});
