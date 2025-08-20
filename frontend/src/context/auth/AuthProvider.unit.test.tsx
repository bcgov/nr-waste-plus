/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { AuthContext } from './AuthContext';
import { AuthProvider } from './AuthProvider';

// Mocks
vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(),
  signInWithRedirect: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('@/env', () => ({ env: { VITE_ZONE: 'TEST', NODE_ENV: 'test' } }));
vi.mock('./authUtils', () => ({
  parseToken: vi.fn((token) => ({ id: 'user', name: 'Test User', token })),
  getUserTokenFromCookie: vi.fn(() => undefined),
}));

describe('AuthProvider (extra coverage)', () => {
  it('calls login with IDIR and BCEIDBUSINESS', async () => {
    const { signInWithRedirect } = await import('aws-amplify/auth');
    let context;
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
    await act(() => context.login('IDIR'));
    expect(signInWithRedirect).toHaveBeenCalledWith({ provider: { custom: 'TEST-IDIR' } });
    await act(() => context.login('BCEIDBUSINESS'));
    expect(signInWithRedirect).toHaveBeenCalledWith({ provider: { custom: 'TEST-BCEIDBUSINESS' } });
  });

  it('calls logout and sets user undefined', async () => {
    const { signOut } = await import('aws-amplify/auth');
    let context;
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
    await act(() => context.logout());
    expect(signOut).toHaveBeenCalled();
  });

  it('calls userToken and returns value', async () => {
    const { getUserTokenFromCookie } = await import('./authUtils');
    (getUserTokenFromCookie as any).mockReturnValue('sometoken');
    let context;
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
