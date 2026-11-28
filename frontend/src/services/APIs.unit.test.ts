import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('BackendApiConfig', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('HEADERS', () => {
    it('returns B3 tracing headers object', async () => {
      const mockHeaders = { 'X-B3-TraceId': 'abc123', 'X-B3-SpanId': 'def456' };
      const getB3Headers = vi.fn(() => mockHeaders);
      vi.doMock('@/services/utils', () => ({ getB3Headers }));

      const { BackendApiConfig } = await vi.importActual<typeof import('./APIs')>('./APIs');
      const headersResolver = BackendApiConfig.HEADERS as
        (() => Promise<Record<string, string>>) | undefined;

      expect(headersResolver).toBeTypeOf('function');
      await expect(headersResolver?.()).resolves.toEqual(mockHeaders);
      expect(getB3Headers).toHaveBeenCalledTimes(1);
    });
  });
});

describe('BackendApiConfig.TOKEN', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns access token from the OIDC session', async () => {
    const getUserAccessToken = vi.fn(async () => 'access-token');
    vi.doMock('@/services/keycloak', () => ({
      getUserAccessToken,
    }));

    const { BackendApiConfig } = await vi.importActual<typeof import('./APIs')>('./APIs');
    const tokenResolver = BackendApiConfig.TOKEN as (() => Promise<string>) | undefined;

    expect(tokenResolver).toBeTypeOf('function');
    await expect(tokenResolver?.()).resolves.toBe('access-token');
    expect(getUserAccessToken).toHaveBeenCalledTimes(1);
  });

  it('returns empty string when no OIDC session is present', async () => {
    const getUserAccessToken = vi.fn(async () => undefined);
    vi.doMock('@/services/keycloak', () => ({
      getUserAccessToken,
    }));

    const { BackendApiConfig } = await vi.importActual<typeof import('./APIs')>('./APIs');
    const tokenResolver = BackendApiConfig.TOKEN as (() => Promise<string>) | undefined;

    expect(tokenResolver).toBeTypeOf('function');
    await expect(tokenResolver?.()).resolves.toBe('');
    expect(getUserAccessToken).toHaveBeenCalledTimes(1);
  });
});
