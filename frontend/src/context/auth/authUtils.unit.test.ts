import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { getCookie, getUserTokenFromCookie, parseToken } from './authUtils';

// Mock env
vi.mock('@/env', () => ({
  env: {
    VITE_USER_POOLS_WEB_CLIENT_ID: 'test-client-id',
    NODE_ENV: 'test',
  },
}));

describe('authUtils', () => {
  describe('getCookie', () => {
    let originalCookie: string;
    beforeEach(() => {
      originalCookie = globalThis.document?.cookie;
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value:
          'foo=bar; CognitoIdentityServiceProvider.test-client-id.LastAuthUser=theuser; CognitoIdentityServiceProvider.test-client-id.theuser.idToken=thetoken',
      });
    });
    afterEach(() => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
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

  describe('getUserTokenFromCookie', () => {
    beforeEach(() => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value:
          'CognitoIdentityServiceProvider.test-client-id.LastAuthUser=theuser; CognitoIdentityServiceProvider.test-client-id.theuser.idToken=thetoken',
      });
    });
    it('returns the idToken from cookies', () => {
      expect(getUserTokenFromCookie()).toBe('thetoken');
    });
    it('returns undefined if no userId', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: '',
      });
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
          'cognito:groups': ['Approver_1', 'Viewer'],
        },
      };
      const user = parseToken(jwt);
      expect(user).toMatchObject({
        userName: 'jdoe',
        displayName: 'Doe, John',
        email: 'john@example.com',
        idpProvider: 'IDIR',
        privileges: { Approver: ['1'], Viewer: null },
        firstName: 'John',
        lastName: 'Doe',
        providerUsername: 'IDIR\\jdoe',
      });
    });
  });
});
