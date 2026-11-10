/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { User } from 'oidc-client-ts';

import { Role, type FamLoginUser, type FamRole } from '@/types/auth.types';
import { navigateTo } from '@/utils/navigation';

import { AuthContext, type AuthContextType } from './AuthContext';
import { AuthProvider, preserveRolesReference } from './AuthProvider';

// The provider consumes the OIDC service exclusively; mock it at the module
// boundary and craft fake users with real Keycloak claim shapes.
const keycloakService = vi.hoisted(() => ({
  ensureFreshUser: vi.fn<() => Promise<User | null>>(),
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

/**
 * Renders the provider and returns a live ref to the latest context value —
 * NOT a snapshot. The provider re-renders the Consumer on every state change,
 * so `context.current` always reflects the current auth state.
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
  // Flush the mount effect so isLoading resolves before assertions.
  return waitFor(() => {
    if (!context.current) throw new Error('context not ready');
    expect(context.current.isLoading).toBe(false);
  }).then(() => context);
};

describe('AuthProvider', () => {
  it('initializes the session from the OIDC service and maps the user', async () => {
    keycloakService.ensureFreshUser.mockResolvedValue(fakeOidcUser());
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
    keycloakService.ensureFreshUser.mockResolvedValue(null);
    const context = await renderWithProvider();

    expect(context.current?.isLoggedIn).toBe(false);
    expect(context.current?.user).toBeUndefined();
  });

  it('clears the local session when initialization fails', async () => {
    keycloakService.ensureFreshUser.mockRejectedValue(new Error('unresolvable'));
    const context = await renderWithProvider();

    expect(keycloakService.removeUserLocally).toHaveBeenCalledTimes(1);
    expect(context.current?.user).toBeUndefined();
    expect(context.current?.isLoading).toBe(false);
  });

  it('starts the sign-in redirect for the chosen provider', async () => {
    keycloakService.ensureFreshUser.mockResolvedValue(null);
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
    keycloakService.ensureFreshUser.mockResolvedValue(fakeOidcUser());
    const context = await renderWithProvider();

    await act(async () => {
      await context.current?.logout();
    });

    expect(keycloakService.signOut).toHaveBeenCalledTimes(1);
    expect(keycloakService.removeUserLocally).not.toHaveBeenCalled();
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it('falls back to local cleanup and the landing page when the sign-out redirect fails', async () => {
    keycloakService.ensureFreshUser.mockResolvedValue(fakeOidcUser());
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
    keycloakService.ensureFreshUser.mockResolvedValue(
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
    const result = preserveRolesReference(undefined, nextUser);
    expect(result).toBe(nextUser);
  });

  it('returns nextUser when nextUser is undefined', () => {
    const result = preserveRolesReference(mockUser, undefined);
    expect(result).toBeUndefined();
  });

  it('returns nextUser when both are undefined', () => {
    const result = preserveRolesReference(undefined, undefined);
    expect(result).toBeUndefined();
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
    const previousUser = {
      ...mockUser,
      roles: sharedRoles,
    };
    const nextUser = {
      ...mockUser,
      roles: sharedRoles,
    };

    const result = preserveRolesReference(previousUser, nextUser);

    expect(result).toBe(nextUser);
  });

  it('preserves roles while updating other user fields', () => {
    const sharedRoles: FamRole[] = [{ role: Role.SUBMITTER, clients: ['300'] }];
    const previousUser = {
      ...mockUser,
      roles: sharedRoles,
      email: 'old@example.com',
    };
    const nextUser = {
      ...mockUser,
      roles: sharedRoles,
      email: 'new@example.com',
    };

    const result = preserveRolesReference(previousUser, nextUser);

    expect(result?.roles).toBe(sharedRoles);
    expect(result?.email).toBe('new@example.com');
  });
});
