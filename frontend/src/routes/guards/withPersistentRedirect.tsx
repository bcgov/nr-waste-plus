import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, type ComponentType } from 'react';

import { navigateInTree, type InTreePath } from '@/routes/inTreePaths';
import { clearPersistedRedirect, readPersistedRedirect } from '@/routes/redirectStorage';

/**
 * Returns `true` when the URL search string contains both OAuth `code` and `state`
 * parameters, indicating the browser has just returned from the Cognito auth flow.
 *
 * @param searchStr - The raw URL search string (e.g. `?code=abc&state=xyz`).
 * @returns `true` if the params look like an OAuth callback.
 */
const isOAuthCallback = (searchStr: string): boolean => {
  const params = new URLSearchParams(searchStr);
  return params.has('code') && params.has('state');
};

/**
 * Validates and sanitises a persisted redirect target before navigating to it.
 *
 * Returns `null` (do not redirect) when the value is:
 * - empty / falsy
 * - not a path-only URL (must start with `/` but not `//`)
 * - an absolute URL whose origin differs from the current origin (open-redirect protection)
 * - the `/dashboard` path (prevents an infinite loop — the guard is mounted on `/dashboard`)
 *
 * @param value - The raw persisted redirect URL string (may be `null`).
 * @returns The safe, sanitised path string, or `null` if the redirect should be suppressed.
 */
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
 * HOC guard: resolves the post-login redirect destination for the `/dashboard` entry point.
 *
 * On mount (guarded by a `useRef` so it runs exactly once per lifecycle), reads
 * the persisted pre-login URL from {@link readPersistedRedirect}, clears it via
 * {@link clearPersistedRedirect}, and navigates:
 *
 * 1. To the persisted URL (safe-checked by {@link getSafeRedirectTarget}) if one exists.
 * 2. To `/search` if the current URL looks like an OAuth callback
 *    ({@link isOAuthCallback}).
 * 3. To `/search` (preserving non-OAuth query params) as a fallback.
 *
 * @param Component - The route component to wrap (rendered as the `/dashboard` page body).
 * @returns A HOC that performs the post-login redirect before the first render.
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
        navigateInTree(navigate, target as InTreePath, { replace: true });
        return;
      }

      if (isOAuthCallback(searchStr)) {
        navigateInTree(navigate, '/search', { replace: true });
        return;
      }

      const passthrough = Object.fromEntries(new URLSearchParams(searchStr));
      navigateInTree(navigate, '/search', { replace: true, search: passthrough });
    }, [navigate, searchStr]);

    return <Component {...props} />;
  }

  PersistentRedirect.displayName = `withPersistentRedirect(${Component.displayName ?? Component.name ?? 'Component'})`;
  return PersistentRedirect;
}
