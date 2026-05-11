import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, type ComponentType } from 'react';

import { clearPersistedRedirect, readPersistedRedirect } from '@/routes/redirectStorage';

const isOAuthCallback = (searchStr: string): boolean => {
  const params = new URLSearchParams(searchStr);
  return params.has('code') && params.has('state');
};

const getSafeRedirectTarget = (value: string | null): string | null => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  try {
    const parsed = new URL(value, globalThis.location.origin);
    if (parsed.origin !== globalThis.location.origin) return null;
    if (parsed.pathname === '/dashboard') return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
};

/**
 * HOC guard: reads the pre-login redirect target from session storage and sends
 * the user to the correct destination after the OAuth flow completes.
 *
 * Priority order:
 *   1. Persisted pre-login URL  →  navigate there directly
 *   2. OAuth callback params detected  →  strip params, go to /search
 *   3. Fallback  →  /search, preserving any non-OAuth query params
 */
export function withPersistentRedirect<P extends object>(
  Component: ComponentType<P>,
): ComponentType<P> {
  function PersistentRedirect(props: P) {
    const navigate = useNavigate();
    const { searchStr } = useRouterState({ select: (s) => s.location });
    const hasNavigated = useRef(false);

    useEffect(() => {
      if (hasNavigated.current) return;
      hasNavigated.current = true;

      const target = getSafeRedirectTarget(readPersistedRedirect());
      clearPersistedRedirect();

      if (target) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        void navigate({ to: target as any, replace: true });
        return;
      }

      if (isOAuthCallback(searchStr)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        void navigate({ to: '/search' as any, replace: true });
        return;
      }

      const passthrough = Object.fromEntries(new URLSearchParams(searchStr));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      void navigate({ to: '/search' as any, search: passthrough as any, replace: true });
    }, [navigate, searchStr]);

    return <Component {...props} />;
  }

  PersistentRedirect.displayName = `withPersistentRedirect(${Component.displayName ?? Component.name ?? 'Component'})`;
  return PersistentRedirect;
}
