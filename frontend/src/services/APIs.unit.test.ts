import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('BackendApiConfig.TOKEN', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns access token from cookie helper', async () => {
    const getUserAccessTokenFromCookie = vi.fn(() => 'access-token');
    vi.doMock('@/context/auth/authUtils', () => ({
      getUserAccessTokenFromCookie,
    }));

    const { BackendApiConfig } = await vi.importActual<typeof import('./APIs')>('./APIs');
    const tokenResolver = BackendApiConfig.TOKEN as (() => Promise<string>) | undefined;

    expect(tokenResolver).toBeTypeOf('function');
    await expect(tokenResolver?.()).resolves.toBe('access-token');
    expect(getUserAccessTokenFromCookie).toHaveBeenCalledTimes(1);
  });

  it('returns empty string when access token cookie is unavailable', async () => {
    const getUserAccessTokenFromCookie = vi.fn(() => undefined);
    vi.doMock('@/context/auth/authUtils', () => ({
      getUserAccessTokenFromCookie,
    }));

    const { BackendApiConfig } = await vi.importActual<typeof import('./APIs')>('./APIs');
    const tokenResolver = BackendApiConfig.TOKEN as (() => Promise<string>) | undefined;

    expect(tokenResolver).toBeTypeOf('function');
    await expect(tokenResolver?.()).resolves.toBe('');
    expect(getUserAccessTokenFromCookie).toHaveBeenCalledTimes(1);
  });
});
