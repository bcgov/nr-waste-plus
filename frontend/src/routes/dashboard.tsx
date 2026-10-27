import { createFileRoute, useNavigate, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/context/auth/useAuth';
import { clearPersistedRedirect, readPersistedRedirect } from '@/routing/redirectStorage';
import { getSafeRedirectTarget, isOAuthCallback } from '@/routing/safeRedirect';

/**
 * Post-login redirect resolver for the `/dashboard` entry point.
 *
 * Port of the legacy `withPersistentRedirect` HOC (guard order unchanged).
 * Renders `null` while redirecting — the legacy route mounted a `() => null`
 * component behind this guard, so the user never sees dashboard content.
 *
 * On mount (guarded by a `useRef` so it runs exactly once per lifecycle),
 * after auth resolves:
 *
 * 1. Stored safe target → navigate to it (`replace`) and clear storage.
 * 2. OAuth callback (`code` + `state` in the query) → `/search`.
 * 3. Fallback → `/search`, preserving non-OAuth query params as `search`.
 */
function DashboardRedirect() {
  const navigate = useNavigate();
  const { isLoading } = useAuth();
  const { searchStr } = useRouterState({ select: (s) => s.location });
  const hasNavigated = useRef(false);

  useEffect(() => {
    // Wait for auth to resolve before redirecting — mirrors the legacy timing
    // that gave SiteMinder time to commit Set-Cookie headers.
    if (isLoading || hasNavigated.current) return;
    hasNavigated.current = true;

    const target = getSafeRedirectTarget(readPersistedRedirect());
    clearPersistedRedirect();

    if (target) {
      void navigate({ href: target, replace: true });
      return;
    }

    if (isOAuthCallback(searchStr)) {
      void navigate({ to: '/search', replace: true });
      return;
    }

    const passthrough = Object.fromEntries(new URLSearchParams(searchStr));
    void navigate({ to: '/search', search: passthrough, replace: true });
  }, [navigate, searchStr, isLoading]);

  return null;
}

/**
 * Top-level dashboard entry — outside `_authenticated` so it never renders
 * the shell or re-triggers the auth gate (legacy parity).
 */
export const Route = createFileRoute('/dashboard')({
  component: DashboardRedirect,
  staticData: {
    // Legacy route id 'Dashboard' — title parity if the redirect is slow.
    title: 'Dashboard',
  },
});
