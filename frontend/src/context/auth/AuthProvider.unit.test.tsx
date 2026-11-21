import { render, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

import { Role, type FamLoginUser, type FamRole } from '@/types/auth.types';
import { navigateTo } from '@/utils/navigation';

import { AuthContext, type AuthContextType } from './AuthContext';
import { AuthProvider, preserveRolesReference } from './AuthProvider';

import type { User } from 'oidc-client-ts';

const activityService = vi.hoisted(() => ({
  isUserActive: vi.fn<() => boolean>(),
  startActivityTracking: vi.fn<() => () => void>(),
  resetActivityTracking: vi.fn<() => void>(),
}));

vi.mock('@/services/activity', () => activityService);

const keycloakService = vi.hoisted(() => ({
  ensureFreshUser: vi.fn<() => Promise<User | null>>(),
  getStoredUser: vi.fn<() => Promise<User | null>>(),
  needsRenewal: vi.fn<(user: User | null | undefined) => boolean>(),
  signIn: vi.fn<() => Promise<void>>(),
  signOut: vi.fn<() => Promise<void>>(),
  removeUserLocally: vi.fn<() => Promise<void>>(),
}));

vi.mock('@/services/keycloak', () => keycloakService);

vi.mock('@/utils/navigation', () => ({
  navigateTo: vi.fn(),
}));

const IDIR_CLAIMS = {
  identity_provider: 'azureidir',
  idir_username: 'JRYAN',
  display_name: 'Ryan, Jack Admin CIA:IN',
  email: 'jack.ryan@gov.bc.ca',
  client_roles: ['WASTE_PLUS_ADMIN'],
};

const fakeOidcUser = (overrides: Partial<Record<string, unknown>> = {}): User =>
  ({
    access_token: `header.${btoa(JSON.stringify(IDIR_CLAIMS))}.signature`,
    profile: { email: IDIR_CLAIMS.email },
    expired: false,
    expires_at: Math.floor(Date.now() / 1000) + 600,
    ...overrides,
  }) as unknown as User;

const mockSession = (user: User | null): void => {
  keycloakService.getStoredUser.mockResolvedValue(user);
  keycloakService.ensureFreshUser.mockResolvedValue(user);
};

/**
 * Renders the provider and returns a live ref to the latest context value.
 */
const renderWithProvider = () => {
  const context: { current: AuthContextType | undefined } = { current: undefined };
  render(
    <AuthProvider>
      <AuthContext.Consumer>
        {(value) => {
          context.current = value;
          return null;
        }}
      </AuthContext.Consumer>
    </AuthProvider>,
  );
  return waitFor(() => {
    if (!context.current) throw new Error('context not ready');
    expect(context.current.isLoading).toBe(false);
  }).then(() => context);
};

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activityService.isUserActive.mockReturnValue(true);
    activityService.startActivityTracking.mockReturnValue(() => undefined);
    keycloakService.getStoredUser.mockResolvedValue(null);
    keycloakService.ensureFreshUser.mockResolvedValue(null);
    keycloakService.removeUserLocally.mockResolvedValue(undefined);
    keycloakService.needsRenewal.mockImplementation(
      (user) =>
        !!user &&
        (user.expired || (user.expires_at ?? Number.MAX_SAFE_INTEGER) - Date.now() / 1000 < 60),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('initializes the session from the OIDC service and maps the user', async () => {
    mockSession(fakeOidcUser());
    const context = await renderWithProvider();

    expect(keycloakService.ensureFreshUser).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(context.current?.isLoggedIn).toBe(true));
    expect(context.current?.user?.userName).toBe('JRYAN');
    expect(context.current?.user?.displayName).toBe('Ryan, Jack Admin CIA:IN');
    expect(context.current?.user?.idpProvider).toBe('IDIR');
    expect(context.current?.user?.roles).toEqual([
      { role: Role.ADMIN, clients: [] },
      { role: Role.IDIR, clients: [] },
    ]);
    expect(context.current?.userToken()).toBe(fakeOidcUser().access_token);
  });

  it('stays signed out when no session exists', async () => {
    const context = await renderWithProvider();

    expect(context.current?.isLoggedIn).toBe(false);
    expect(context.current?.user).toBeUndefined();
    expect(keycloakService.ensureFreshUser).not.toHaveBeenCalled();
  });

  it('renews an active user inside the renewal window without clearing storage', async () => {
    mockSession(fakeOidcUser({ expires_at: Math.floor(Date.now() / 1000) + 10 }));
    const context = await renderWithProvider();

    expect(keycloakService.ensureFreshUser).toHaveBeenCalledTimes(1);
    expect(context.current?.isLoggedIn).toBe(true);
    expect(keycloakService.removeUserLocally).not.toHaveBeenCalled();
    expect(context.current?.renewalError).toBeUndefined();
  });

  it('lets an idle user expire locally without calling renew', async () => {
    activityService.isUserActive.mockReturnValue(false);
    mockSession(fakeOidcUser({ expired: true, expires_at: Math.floor(Date.now() / 1000) - 10 }));
    const context = await renderWithProvider();

    expect(keycloakService.ensureFreshUser).not.toHaveBeenCalled();
    expect(keycloakService.removeUserLocally).toHaveBeenCalledTimes(1);
    expect(context.current?.user).toBeUndefined();
  });

  it('schedules the next evaluation from the refreshed token expiry', async () => {
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    mockSession(fakeOidcUser({ expires_at: Math.floor(Date.now() / 1000) + 300 }));
    await renderWithProvider();

    const delays = timeoutSpy.mock.calls.map((call) => Number(call[1]));
    expect(delays.some((delay) => delay >= 230_000 && delay <= 240_000)).toBe(true);
  });

  it('reports a renewal failure and clears the stale session after two attempts', async () => {
    mockSession(fakeOidcUser({ expires_at: Math.floor(Date.now() / 1000) + 10 }));
    keycloakService.ensureFreshUser.mockRejectedValue(new Error('network down'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const context = await renderWithProvider();

    expect(context.current?.renewalError).toBe('renewal-failed');
    expect(errorSpy).toHaveBeenCalledWith('auth.renewal_failed');
    expect(keycloakService.removeUserLocally).not.toHaveBeenCalled();

    // Fire the retry timer deterministically instead of waiting 60 real seconds.
    const retry = timeoutSpy.mock.calls.find((call) => Number(call[1]) === 60_000);
    expect(retry).toBeDefined();
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 120_000);
    await act(async () => {
      await (retry?.[0] as () => void)();
    });
    await waitFor(() => expect(keycloakService.removeUserLocally).toHaveBeenCalledTimes(1));
    nowSpy.mockRestore();
    timeoutSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('starts the sign-in redirect for the chosen provider', async () => {
    const context = await renderWithProvider();

    await act(async () => {
      await context.current?.login('IDIR');
    });
    expect(keycloakService.signIn).toHaveBeenCalledWith('IDIR');

    await act(async () => {
      await context.current?.login('BCEIDBUSINESS');
    });
    expect(keycloakService.signIn).toHaveBeenCalledWith('BCEIDBUSINESS');
  });

  it('signs out through the realm without local pre-cleanup', async () => {
    mockSession(fakeOidcUser());
    const context = await renderWithProvider();

    await act(async () => {
      await context.current?.logout();
    });

    expect(keycloakService.signOut).toHaveBeenCalledTimes(1);
    expect(keycloakService.removeUserLocally).not.toHaveBeenCalled();
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it('falls back to local cleanup and the landing page when the sign-out redirect fails', async () => {
    mockSession(fakeOidcUser());
    keycloakService.signOut.mockRejectedValue(new Error('redirect failed'));
    const context = await renderWithProvider();

    await act(async () => {
      await context.current?.logout();
    });

    expect(keycloakService.signOut).toHaveBeenCalledTimes(1);
    expect(keycloakService.removeUserLocally).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(context.current?.user).toBeUndefined());
    expect(navigateTo).toHaveBeenCalledWith('/');
  });

  it('collects distinct client values across roles', async () => {
    mockSession(
      fakeOidcUser({
        access_token: `header.${btoa(
          JSON.stringify({
            ...IDIR_CLAIMS,
            client_roles: ['WASTE_PLUS_VIEWER_00147603', 'WASTE_PLUS_VIEWER_00147603'],
          }),
        )}.signature`,
      }),
    );
    const context = await renderWithProvider();

    expect(context.current?.getClients()).toEqual(['00147603']);
  });
});

describe('preserveRolesReference', () => {
  const mockRoles: FamRole[] = [{ role: Role.VIEWER, clients: ['100'] }];
  const mockRoles2: FamRole[] = [{ role: Role.ADMIN, clients: ['200'] }];
  const mockUser: FamLoginUser = {
    userName: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
    roles: mockRoles,
    privileges: {},
  };

  it('returns nextUser when previousUser is undefined', () => {
    const nextUser = { ...mockUser, roles: mockRoles };
    expect(preserveRolesReference(undefined, nextUser)).toBe(nextUser);
  });

  it('returns nextUser when nextUser is undefined', () => {
    expect(preserveRolesReference(mockUser, undefined)).toBeUndefined();
  });

  it('returns nextUser when both are undefined', () => {
    expect(preserveRolesReference(undefined, undefined)).toBeUndefined();
  });

  it('returns nextUser when role content differs', () => {
    const previousUser = { ...mockUser, roles: mockRoles };
    const nextUser = { ...mockUser, roles: mockRoles2 };
    const result = preserveRolesReference(previousUser, nextUser);
    expect(result).toBe(nextUser);
    expect(result?.roles).toBe(mockRoles2);
  });

  it('preserves previous roles reference when role content is equal but reference differs', () => {
    const previousRoles: FamRole[] = [{ role: Role.VIEWER, clients: ['100'] }];
    const nextRoles: FamRole[] = [{ role: Role.VIEWER, clients: ['100'] }];
    const previousUser = { ...mockUser, roles: previousRoles };
    const nextUser = { ...mockUser, roles: nextRoles };

    const result = preserveRolesReference(previousUser, nextUser);

    expect(result).toBeDefined();
    expect(result?.roles).toBe(previousRoles);
    expect(result?.roles).not.toBe(nextRoles);
    expect(result?.userName).toBe(nextUser.userName);
  });

  it('returns nextUser unchanged when roles reference is already the same', () => {
    const sharedRoles = mockRoles;
    const previousUser = { ...mockUser, roles: sharedRoles };
    const nextUser = { ...mockUser, roles: sharedRoles };

    expect(preserveRolesReference(previousUser, nextUser)).toBe(nextUser);
  });

  it('preserves roles while updating other user fields', () => {
    const sharedRoles: FamRole[] = [{ role: Role.SUBMITTER, clients: ['300'] }];
    const previousUser = { ...mockUser, roles: sharedRoles, email: 'old@example.com' };
    const nextUser = { ...mockUser, roles: sharedRoles, email: 'new@example.com' };

    const result = preserveRolesReference(previousUser, nextUser);

    expect(result?.roles).toBe(sharedRoles);
    expect(result?.email).toBe('new@example.com');
  });
});
