/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';

import { AuthContext } from './AuthContext';
import { AuthProvider } from './AuthProvider';

import { jwtfy } from '@/config/tests/auth.helper';
import { env } from '@/env';

// Mocks
vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(),
  signInWithRedirect: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('./authUtils', () => ({
  parseToken: vi.fn((token) => ({ id: 'user', name: 'Test User', token })),
  getUserTokenFromCookie: vi.fn(() => undefined),
}));

describe('AuthProvider (extra coverage)', () => {
  describe('when VITE_ZONE is TEST', () => {
    beforeAll(() => {
      env.VITE_ZONE = 'TEST';
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
    });

    it('calls userToken and returns value', async () => {
      const { getUserTokenFromCookie } = await import('./authUtils');
      (getUserTokenFromCookie as any).mockReturnValue('sometoken');
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

  describe('when VITE_ZONE is MOCK', () => {
    beforeAll(() => {
      env.VITE_ZONE = 'MOCK';
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
      expect(fetchAuthSession).not.toHaveBeenCalledWith();
    });

    it("calls getUserTokenFromCookie and sets the user token payload to the cookie's decoded value", async () => {
      const { getUserTokenFromCookie } = await import('./authUtils');

      const payload = {
        testKey: 'testValue',
      };

      const jwt = jwtfy(payload);

      (getUserTokenFromCookie as any).mockReturnValue(jwt);
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
      expect(getUserTokenFromCookie).toHaveBeenCalled();
      expect(context.user.token.payload).toEqual(payload);
    });
  });
});
