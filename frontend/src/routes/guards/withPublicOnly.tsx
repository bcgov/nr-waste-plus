import { useNavigate } from '@tanstack/react-router';
import { useLayoutEffect, type ComponentType } from 'react';

import { useAuth } from '@/context/auth/useAuth';

/**
 * HOC guard: redirects authenticated users away from public-only pages
 * (e.g. the landing page) to /dashboard.
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
