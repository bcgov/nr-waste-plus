import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  getCookie,
  getUserAccessTokenFromCookie,
  getUserIdTokenFromCookie,
  getUserTokenFromCookie,
  parseToken,
} from './authUtils';

// Mock env
vi.mock(import('@/env'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    env: {
      ...actual.env,
      VITE_USER_POOLS_WEB_CLIENT_ID: 'test-client-id',
      NODE_ENV: 'test',
    },
  };
});

describe('authUtils', () => {
  describe('getCookie', () => {
    let originalCookie: string;
    beforeEach(() => {
      originalCookie = globalThis.document?.cookie;
      Object.defineProperty(document, 'cookie', {
        writable: true,
        configurable: true,
        value:
          'foo=bar; CognitoIdentityServiceProvider.test-client-id.LastAuthUser=theuser; CognitoIdentityServiceProvider.test-client-id.theuser.idToken=idtoken; CognitoIdentityServiceProvider.test-client-id.theuser.accessToken=accesstoken',
      });
    });
    afterEach(() => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        configurable: true,
        value: originalCookie,
      });
    });
    it('returns the correct cookie value', () => {
      expect(getCookie('foo')).toBe('bar');
      expect(getCookie('CognitoIdentityServiceProvider.test-client-id.LastAuthUser')).toBe(
        'theuser',
      );
    });
    it('returns empty string if cookie not found', () => {
      expect(getCookie('notfound')).toBe('');
    });
  });

  describe('token getters', () => {
    beforeEach(() => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        configurable: true,
        value:
          'CognitoIdentityServiceProvider.test-client-id.LastAuthUser=theuser; CognitoIdentityServiceProvider.test-client-id.theuser.idToken=idtoken; CognitoIdentityServiceProvider.test-client-id.theuser.accessToken=accesstoken',
      });
    });
    afterEach(() => {
      vi.clearAllMocks();
    });
    it('returns the accessToken from cookies', () => {
      expect(getUserAccessTokenFromCookie()).toBe('accesstoken');
      expect(getUserTokenFromCookie()).toBe('accesstoken');
    });

    it('returns the idToken from cookies', () => {
      expect(getUserIdTokenFromCookie()).toBe('idtoken');
    });

    it('returns undefined if no userId', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        configurable: true,
        value: '',
      });
      expect(getUserAccessTokenFromCookie()).toBeUndefined();
      expect(getUserIdTokenFromCookie()).toBeUndefined();
      expect(getUserTokenFromCookie()).toBeUndefined();
    });
  });

  describe('parseToken', () => {
    it('returns undefined if no token', () => {
      expect(parseToken(undefined)).toBeUndefined();
    });
    it('parses a valid JWT payload', () => {
      const jwt = {
        payload: {
          'custom:idp_display_name': 'Doe, John',
          'custom:idp_name': 'idir',
          'custom:idp_username': 'jdoe',
          'email': 'john@example.com',
          'cognito:groups': ['WASTE_PLUS_VIEWER_1', 'WASTE_PLUS_ADMIN'],
        },
      };
      const user = parseToken(jwt);
      expect(user).toMatchObject({
        userName: 'jdoe',
        displayName: 'Doe, John',
        email: 'john@example.com',
        idpProvider: 'IDIR',
        privileges: { VIEWER: ['1'], ADMIN: null },
        firstName: 'John',
        lastName: 'Doe',
        providerUsername: 'IDIR\\jdoe',
      });
    });
  });
});
