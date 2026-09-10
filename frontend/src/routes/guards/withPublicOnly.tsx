import { Loading } from '@carbon/react';
import { useNavigate } from '@tanstack/react-router';
import { useLayoutEffect, type ComponentType } from 'react';

import { useAuth } from '@/context/auth/useAuth';
import { navigateInTree } from '@/routes/inTreePaths';

/**
 * HOC guard: redirects authenticated users away from public-only pages.
 *
 * While the auth context is resolving (`isLoading`), renders a labelled
 * {@link Loading} indicator (matching the pattern used by the root route's
 * pending/not-found components) instead of `null`, so the page always has
 * accessible, auditable content rather than a blank paint. Once resolved,
 * authenticated users are immediately redirected to `/dashboard` via a
 * `useLayoutEffect`.
 *
 * Typical usage: wrap the landing page and login page components so that
 * returning authenticated users are not shown the public entry screens.
 *
 * @param Component - The public-only route component to protect.
 * @returns A HOC that renders the component only when the user is not logged in.
 */
export function withPublicOnly<P extends object>(Component: ComponentType<P>): ComponentType<P> {
  function PublicOnly(props: P) {
    const { isLoggedIn, isLoading } = useAuth();
    const navigate = useNavigate();

    useLayoutEffect(() => {
      if (!isLoading && isLoggedIn) {
        navigateInTree(navigate, '/dashboard', { replace: true });
      }
    }, [isLoading, isLoggedIn, navigate]);

    if (isLoading) return <Loading data-testid="loading" withOverlay />;
    if (isLoggedIn) return null;
    return <Component {...props} />;
  }

  PublicOnly.displayName = `withPublicOnly(${Component.displayName ?? Component.name ?? 'Component'})`;
  return PublicOnly;
}
