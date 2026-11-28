import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'oidc-client-ts';

// The global test setup mocks '@/services/keycloak' (same module) to
// insulate other suites; unmock it for THIS file — the real implementation
// is under test, with 'oidc-client-ts' itself still mocked below.
vi.unmock('@/services/keycloak');

const importService = async () => await import('./keycloak');

/**
 * The mocked `UserManager` instance and the settings captured at construction
 * time. Settings are captured into a plain variable — the vite config's
 * `clearMocks` wipes mock call history between tests, but a plain object
 * survives, letting every test assert the singleton's construction contract.
 */
const oidcMocks = vi.hoisted(() => {
  const manager = {
    getUser: vi.fn<() => Promise<unknown>>(),
    signinRedirect: vi.fn<() => Promise<void>>(),
    signinCallback: vi.fn<() => Promise<unknown>>(),
    signinSilent: vi.fn<() => Promise<unknown>>(),
    signoutRedirect: vi.fn<() => Promise<void>>(),
    removeUser: vi.fn<() => Promise<void>>(),
  };
  return {
    manager,
    capturedSettings: undefined as Record<string, unknown> | undefined,
    capturedStoreArgs: undefined as Record<string, unknown> | undefined,
  };
});

vi.mock('oidc-client-ts', () => ({
  // `new UserManager(...)` requires a constructible function — an arrow
  // function would throw "is not a constructor". Returning an object from a
  // regular function replaces the `this` the service would otherwise receive.
  UserManager: function UserManager(settings?: Record<string, unknown>) {
    oidcMocks.capturedSettings = settings;
    return oidcMocks.manager;
  },
  WebStorageStateStore: function WebStorageStateStore(args?: Record<string, unknown>) {
    oidcMocks.capturedStoreArgs = args;
    return {};
  },
}));

/** Builds a minimal fake OIDC user for renewal-logic tests. */
const fakeUser = (overrides: Partial<User> = {}): User =>
  ({
    access_token: 'access-token',
    expires_at: Math.floor(Date.now() / 1000) + 600,
    expired: false,
    profile: {},
    ...overrides,
  }) as unknown as User;

describe('keycloak service', () => {
  beforeEach(() => {
    oidcMocks.manager.getUser.mockReset().mockResolvedValue(null);
    oidcMocks.manager.signinRedirect.mockReset().mockResolvedValue(undefined);
    oidcMocks.manager.signinCallback.mockReset().mockResolvedValue(undefined);
    oidcMocks.manager.signinSilent.mockReset().mockResolvedValue(null);
    oidcMocks.manager.signoutRedirect.mockReset().mockResolvedValue(undefined);
    oidcMocks.manager.removeUser.mockReset().mockResolvedValue(undefined);
  });

  const constructManager = async () => {
    const service = await importService();
    service.getUserManager();
    return service;
  };

  describe('UserManager settings', () => {
    it('requests exactly the realm-approved scopes — never `roles`', async () => {
      await constructManager();

      expect(oidcMocks.capturedSettings?.scope).toBe('openid profile email');
      expect(String(oidcMocks.capturedSettings?.scope)).not.toContain('roles');
    });

    it('configures code flow against the configured realm and client', async () => {
      const { env } = await import('@/env');
      await constructManager();

      expect(oidcMocks.capturedSettings?.authority).toBe(env.VITE_KEYCLOAK_URL);
      expect(oidcMocks.capturedSettings?.client_id).toBe(env.VITE_KEYCLOAK_CLIENT_ID);
      expect(oidcMocks.capturedSettings?.response_type).toBe('code');
    });

    it('stores tokens in sessionStorage and keeps silent renew manual', async () => {
      await constructManager();

      expect(oidcMocks.capturedSettings?.automaticSilentRenew).toBe(false);
      expect(oidcMocks.capturedStoreArgs).toEqual({ store: globalThis.sessionStorage });
    });
    it('derives the redirect URIs from the current origin', async () => {
      await constructManager();

      expect(oidcMocks.capturedSettings?.redirect_uri).toBe(
        new URL('/authCallback', globalThis.location.origin).toString(),
      );
      expect(oidcMocks.capturedSettings?.post_logout_redirect_uri).toBe(
        new URL('/', globalThis.location.origin).toString(),
      );
    });
  });

  describe('signIn', () => {
    it('passes the IDIR broker hint per call', async () => {
      const { signIn } = await importService();
      await signIn('IDIR');

      expect(oidcMocks.manager.signinRedirect).toHaveBeenCalledWith({
        extraQueryParams: { kc_idp_hint: 'azureidir' },
      });
    });

    it('passes the Business BCeID broker hint per call', async () => {
      const { signIn } = await importService();
      await signIn('BCEIDBUSINESS');

      expect(oidcMocks.manager.signinRedirect).toHaveBeenCalledWith({
        extraQueryParams: { kc_idp_hint: 'bceidbusiness' },
      });
    });
  });

  describe('needsRenewal', () => {
    it('is false when there is no user', async () => {
      const { needsRenewal } = await importService();
      expect(needsRenewal(null)).toBe(false);
      expect(needsRenewal(undefined)).toBe(false);
    });

    it('is true when the user is expired', async () => {
      const { needsRenewal } = await importService();
      expect(needsRenewal(fakeUser({ expired: true }))).toBe(true);
    });

    it('is true inside the renewal margin', async () => {
      const { needsRenewal } = await importService();
      const user = fakeUser({ expires_at: Math.floor(Date.now() / 1000) + 30 });
      expect(needsRenewal(user)).toBe(true);
    });

    it('is false with comfortable time left', async () => {
      const { needsRenewal } = await importService();
      const user = fakeUser({ expires_at: Math.floor(Date.now() / 1000) + 600 });
      expect(needsRenewal(user)).toBe(false);
    });
  });

  describe('ensureFreshUser', () => {
    it('returns null when no session exists', async () => {
      const { ensureFreshUser } = await importService();

      await expect(ensureFreshUser()).resolves.toBeNull();
      expect(oidcMocks.manager.signinSilent).not.toHaveBeenCalled();
    });

    it('returns the stored user without renewing when comfortably fresh', async () => {
      const user = fakeUser();
      oidcMocks.manager.getUser.mockResolvedValue(user);
      const { ensureFreshUser } = await importService();

      await expect(ensureFreshUser()).resolves.toBe(user);
      expect(oidcMocks.manager.signinSilent).not.toHaveBeenCalled();
    });

    it('renews silently when the token is inside the margin', async () => {
      const renewed = fakeUser({ expires_at: Math.floor(Date.now() / 1000) + 600 });
      oidcMocks.manager.getUser
        .mockReset()
        .mockResolvedValueOnce(fakeUser({ expires_at: Math.floor(Date.now() / 1000) + 30 }))
        .mockResolvedValueOnce(renewed);
      oidcMocks.manager.signinSilent.mockReset().mockResolvedValue(renewed);
      const { ensureFreshUser } = await importService();

      await expect(ensureFreshUser()).resolves.toBe(renewed);
      expect(oidcMocks.manager.signinSilent).toHaveBeenCalledTimes(1);
    });
  });

  describe('signOut', () => {
    it('redirects to end-session WITHOUT removing the stored user first', async () => {
      const { signOut } = await importService();
      await signOut();

      expect(oidcMocks.manager.signoutRedirect).toHaveBeenCalledTimes(1);
      // The realm needs the stored user's id_token_hint; clearing first would
      // send a logout it cannot attribute and leave the realm session alive.
      expect(oidcMocks.manager.removeUser).not.toHaveBeenCalled();
    });
  });

  describe('removeUserLocally', () => {
    it('removes the stored user locally', async () => {
      const { removeUserLocally } = await importService();
      await removeUserLocally();

      expect(oidcMocks.manager.removeUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUserAccessToken', () => {
    it('returns the stored access token', async () => {
      oidcMocks.manager.getUser.mockResolvedValue(fakeUser());
      const { getUserAccessToken } = await importService();

      await expect(getUserAccessToken()).resolves.toBe('access-token');
    });

    it('returns undefined when no session exists', async () => {
      const { getUserAccessToken } = await importService();

      await expect(getUserAccessToken()).resolves.toBeUndefined();
    });
  });
});
