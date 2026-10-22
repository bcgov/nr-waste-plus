/**
 * Validates and sanitises a persisted redirect target before navigating to it.
 *
 * Ported verbatim from the legacy `withPersistentRedirect` guard. Returns
 * `null` (do not redirect) when the value is:
 *
 * - empty / falsy
 * - not a path-only URL (must start with `/` but not `//`)
 * - an absolute URL whose origin differs from the current origin
 *   (open-redirect protection)
 * - the `/dashboard` path (loop guard — the redirect logic is mounted on
 *   `/dashboard` itself)
 *
 * @param value - The raw persisted redirect URL string (may be `null`).
 * @returns The safe, sanitised path string, or `null` if the redirect should
 *   be suppressed.
 */
export const getSafeRedirectTarget = (value: string | null): string | null => {
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
 * Returns `true` when the URL search string contains both OAuth `code` and
 * `state` parameters, indicating the browser has just returned from the
 * Cognito auth flow.
 *
 * @param searchStr - The raw URL search string (e.g. `?code=abc&state=xyz`).
 * @returns `true` if the params look like an OAuth callback.
 */
export const isOAuthCallback = (searchStr: string): boolean => {
  const params = new URLSearchParams(searchStr);
  return params.has('code') && params.has('state');
};
