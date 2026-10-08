/**
 * Unit tests for {@link module:api/client}.
 *
 * Mocks the pipeline factory, env, auth utils, and the project
 * middlewares to verify the application client wiring without any
 * network activity.
 *
 * The factory call is captured at module load because the global
 * `clearMocks`/`restoreMocks` vitest settings wipe call records before
 * each test.
 *
 * @module api/client.unit.test
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────────

const { mockCreateApiClient } = vi.hoisted(() => ({
  mockCreateApiClient: vi.fn<(config: unknown) => string>(() => 'transport-sentinel'),
}));

vi.mock('@/http/api-client', () => ({
  createApiClient: mockCreateApiClient,
}));

vi.mock('@/env', () => ({
  env: { VITE_BACKEND_URL: 'http://backend.test' },
  featureFlags: {},
}));

vi.mock('@/context/auth/authUtils', () => ({
  getUserAccessTokenFromCookie: vi.fn(),
}));

vi.mock('./middlewares/failureNotification', () => ({
  failureNotificationMiddleware: vi.fn(() => 'failure-notification-mw'),
}));

vi.mock('./middlewares/problemDetails', () => ({
  problemDetailsMiddleware: vi.fn(() => 'problem-details-mw'),
}));

// ── Import after mocks ──────────────────────────────────────────────

import { getUserAccessTokenFromCookie } from '@/context/auth/authUtils';

import { client, cookieTokenProvider } from './client';

import type { ApiClientConfig } from '@/http/api-client';

/** Config captured at module load, before per-test mock clearing. */
const clientConfig = mockCreateApiClient.mock.calls[0]?.[0] as ApiClientConfig;

// ── Suite ───────────────────────────────────────────────────────────

describe('client', () => {
  it('is created at module load via createApiClient', () => {
    expect(clientConfig).toBeDefined();
    expect(client).toBe('transport-sentinel');
  });

  it('wires the project defaults into the pipeline factory', () => {
    expect(clientConfig.baseURL).toBe('http://backend.test');
    expect(clientConfig.timeout).toBe(60_000);
    expect(clientConfig.withCredentials).toBe(true);
    expect(clientConfig.withXSRFToken).toBe(true);
    expect(clientConfig.defaultHeaders).toEqual({ Accept: 'application/json' });
    expect(clientConfig.extractHeaders).toEqual(['location']);
    expect(clientConfig.tokenProvider).toBe(cookieTokenProvider);
  });

  it('orders custom middlewares with failureNotification outside problemDetails', () => {
    // Error path order: problemDetails (inner) normalises the body first,
    // then failureNotification (outer) composes the toast.
    expect(clientConfig.middlewares).toEqual(['failure-notification-mw', 'problem-details-mw']);
  });
});

describe('cookieTokenProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the Cognito access token from the session cookie', async () => {
    vi.mocked(getUserAccessTokenFromCookie).mockReturnValue('cookie-token');

    await expect(cookieTokenProvider()).resolves.toBe('cookie-token');
    expect(getUserAccessTokenFromCookie).toHaveBeenCalledTimes(1);
  });

  it('returns null when no session cookie exists (header omitted)', async () => {
    vi.mocked(getUserAccessTokenFromCookie).mockReturnValue(undefined);

    await expect(cookieTokenProvider()).resolves.toBeNull();
  });
});
