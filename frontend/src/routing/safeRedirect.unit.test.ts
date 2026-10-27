import { describe, it, expect } from 'vitest';

import { getSafeRedirectTarget, isOAuthCallback } from './safeRedirect';

describe('getSafeRedirectTarget (T-02)', () => {
  it('rejects empty and missing values', () => {
    expect(getSafeRedirectTarget(null)).toBeNull();
    expect(getSafeRedirectTarget('')).toBeNull();
  });

  it('rejects values without a leading slash', () => {
    expect(getSafeRedirectTarget('search')).toBeNull();
    expect(getSafeRedirectTarget('search?x=1')).toBeNull();
  });

  it('rejects protocol-relative URLs (open-redirect protection)', () => {
    expect(getSafeRedirectTarget('//evil.example.com')).toBeNull();
  });

  it('rejects cross-origin URLs', () => {
    expect(getSafeRedirectTarget('https://evil.example.com')).toBeNull();
    expect(getSafeRedirectTarget('https://evil.example.com/path')).toBeNull();
  });

  it('rejects /dashboard (loop guard — the redirect logic is mounted there)', () => {
    expect(getSafeRedirectTarget('/dashboard')).toBeNull();
    expect(getSafeRedirectTarget('/dashboard?x=1')).toBeNull();
  });

  it('accepts in-app paths, preserving query and hash', () => {
    expect(getSafeRedirectTarget('/search?x=1')).toBe('/search?x=1');
    expect(getSafeRedirectTarget('/clients')).toBe('/clients');
    expect(getSafeRedirectTarget('/search?district=DFN#results')).toBe(
      '/search?district=DFN#results',
    );
  });

  it('rejects absolute URLs even when same-origin (path-only contract, legacy parity)', () => {
    const sameOrigin = new URL('/search?x=1', globalThis.location.origin).toString();
    expect(getSafeRedirectTarget(sameOrigin)).toBeNull();
  });
});

describe('isOAuthCallback', () => {
  it('detects code + state query parameters', () => {
    expect(isOAuthCallback('?code=abc&state=xyz')).toBe(true);
  });

  it('ignores incomplete callbacks', () => {
    expect(isOAuthCallback('?code=abc')).toBe(false);
    expect(isOAuthCallback('?state=xyz')).toBe(false);
    expect(isOAuthCallback('')).toBe(false);
    expect(isOAuthCallback('?other=1')).toBe(false);
  });
});
