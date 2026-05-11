import { useNavigate } from '@tanstack/react-router';
import { useLayoutEffect, type ComponentType } from 'react';

import { useAuth } from '@/context/auth/useAuth';

/**
 * HOC guard: redirects authenticated users away from public-only pages.
 *
 * While the auth context is resolving (`isLoading`), renders `null` to avoid
 * a flash of public content. Once resolved, authenticated users are immediately
 * redirected to `/dashboard` via a `useLayoutEffect`.
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        void navigate({ to: '/dashboard' as any, replace: true });
      }
    }, [isLoading, isLoggedIn, navigate]);

    if (isLoading || isLoggedIn) return null;
    return <Component {...props} />;
  }

  PublicOnly.displayName = `withPublicOnly(${Component.displayName ?? Component.name ?? 'Component'})`;
  return PublicOnly;
}
