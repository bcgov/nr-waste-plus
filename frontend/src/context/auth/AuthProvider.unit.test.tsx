/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';

import { AuthContext } from './AuthContext';
import { AuthProvider, preserveRolesReference } from './AuthProvider';
import { Role, type FamLoginUser, type FamRole } from './types';

import { jwtfy } from '@/config/tests/auth.helper';
import { navigateTo } from '@/utils/navigation';

// Mocks
vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(),
  signInWithRedirect: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('./authUtils', () => ({
  parseToken: vi.fn((token) => ({ id: 'user', name: 'Test User', token })),
  getUserAccessTokenFromCookie: vi.fn(() => undefined),
  getUserIdTokenFromCookie: vi.fn(() => undefined),
}));

vi.mock('@/utils/navigation', () => ({
  navigateTo: vi.fn(),
}));

describe('AuthProvider (extra coverage)', () => {
  describe('when VITE_MOCK_AUTH is false', () => {
    beforeAll(async () => {
      const { env } = await import('@/env');
      env.VITE_MOCK_AUTH = 'false';
    });

    it('calls fetchAuthSession', async () => {
      const { fetchAuthSession } = await import('aws-amplify/auth');
      let context: any;
      render(
        <AuthProvider>
          <AuthContext.Consumer>
            {(value) => {
              context = value;
              return null;
            }}
          </AuthContext.Consumer>
        </AuthProvider>,
      );
      await waitFor(() => expect(context).toBeDefined());
      expect(fetchAuthSession).toHaveBeenCalledWith();
    });

    it('calls login with IDIR and BCEIDBUSINESS', async () => {
      const { signInWithRedirect } = await import('aws-amplify/auth');
      let context: any;
      render(
        <AuthProvider>
          <AuthContext.Consumer>
            {(value) => {
              context = value;
              return null;
            }}
          </AuthContext.Consumer>
        </AuthProvider>,
      );
      await waitFor(() => expect(context).toBeDefined());
      await act(async () => {
        context.login('IDIR');
      });
      expect(signInWithRedirect).toHaveBeenCalledWith({ provider: { custom: 'TEST-IDIR' } });
      await act(async () => {
        context.login('BCEIDBUSINESS');
      });
      expect(signInWithRedirect).toHaveBeenCalledWith({
        provider: { custom: 'TEST-BCEIDBUSINESS' },
      });
    });

    it('calls logout and sets user undefined', async () => {
      const { signOut } = await import('aws-amplify/auth');
      const { signOutUrl } = await import('@/config/fam/config');
      let context: any;
      render(
        <AuthProvider>
          <AuthContext.Consumer>
            {(value) => {
              context = value;
              return null;
            }}
          </AuthContext.Consumer>
        </AuthProvider>,
      );
      await waitFor(() => expect(context).toBeDefined());
      await act(async () => {
        context.logout();
      });
      expect(signOut).toHaveBeenCalled();
      expect(navigateTo).toHaveBeenCalledWith(signOutUrl);
    });

    it('calls userToken and returns value', async () => {
      const { getUserAccessTokenFromCookie } = await import('./authUtils');
      (getUserAccessTokenFromCookie as any).mockReturnValue('sometoken');
      let context: any;
      render(
        <AuthProvider>
          <AuthContext.Consumer>
            {(value) => {
              context = value;
              return null;
            }}
          </AuthContext.Consumer>
        </AuthProvider>,
      );
      await waitFor(() => expect(context).toBeDefined());
      expect(context.userToken()).toBe('sometoken');
    });

  });

  describe('when VITE_MOCK_AUTH is true', () => {
    beforeAll(async () => {
      const { env } = await import('@/env');
      env.VITE_MOCK_AUTH = 'true';
    });

    it("doesn't call fetchAuthSession", async () => {
      const { fetchAuthSession } = await import('aws-amplify/auth');
      let context: any;
      render(
        <AuthProvider>
          <AuthContext.Consumer>
            {(value) => {
              context = value;
              return null;
            }}
          </AuthContext.Consumer>
        </AuthProvider>,
      );
      await waitFor(() => expect(context).toBeDefined());
      expect(fetchAuthSession).not.toHaveBeenCalled();
    });

    it("calls getUserIdTokenFromCookie and sets the user token payload to the cookie's decoded value", async () => {
      const { getUserIdTokenFromCookie } = await import('./authUtils');

      const payload = {
        testKey: 'testValue',
      };

      const jwt = jwtfy(payload);

      (getUserIdTokenFromCookie as any).mockReturnValue(jwt);
      let context: any;
      render(
        <AuthProvider>
          <AuthContext.Consumer>
            {(value) => {
              context = value;
              return null;
            }}
          </AuthContext.Consumer>
        </AuthProvider>,
      );
      await waitFor(() => expect(context).toBeDefined());
      expect(getUserIdTokenFromCookie).toHaveBeenCalled();
      expect(context.user.token.payload).toEqual(payload);
    });
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
    const previousUser = { ...mockUser, roles: sharedRoles };
    const nextUser = { ...mockUser, roles: sharedRoles };

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
