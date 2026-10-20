import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  getCookie,
  getUserAccessTokenFromCookie,
  getUserIdTokenFromCookie,
  getUserTokenFromCookie,
  parseToken,
} from './authUtils';

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
    it('handles malformed cookie when split equals nothing', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        configurable: true,
        value: 'broken',
      });
      expect(getCookie('broken')).toBe('');
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

    it('returns undefined if userId cookie exists but token cookie missing', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        configurable: true,
        value: 'CognitoIdentityServiceProvider.test-client-id.LastAuthUser=anotheruser',
      });
      expect(getUserAccessTokenFromCookie()).toBe('');
      expect(getUserIdTokenFromCookie()).toBe('');
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

    it('handles no comma in displayName (reverses names)', () => {
      const jwt = {
        payload: {
          'custom:idp_display_name': 'John Doe',
          'custom:idp_name': 'idir',
          'custom:idp_username': 'jdoe',
          'email': 'john@example.com',
          'cognito:groups': [],
        },
      };
      const user = parseToken(jwt);
      expect(user?.firstName).toBe('John');
      expect(user?.lastName).toBe('Doe');
      expect(user?.idpProvider).toBe('IDIR');
    });

    it('handles missing displayName components', () => {
      const jwt = {
        payload: {
          'custom:idp_display_name': 'John',
          'custom:idp_name': 'idir',
          'custom:idp_username': 'jdoe',
          'email': 'john@example.com',
          'cognito:groups': [],
        },
      };
      const user = parseToken(jwt);
      expect(user).toBeDefined();
    });

    it('defaults when fields missing', () => {
      const jwt = {
        payload: {
          'custom:idp_display_name': '',
          'custom:idp_name': 'unknown',
          'custom:idp_username': '',
          'email': '',
          'cognito:groups': [],
        },
      };
      const user = parseToken(jwt);
      expect(user?.idpProvider).toBeUndefined();
      expect(user?.userName).toBe('');
      expect(user?.email).toBe('');
      expect(user?.providerUsername).toBe('undefined\\');
    });

    it('handles BCEID provider', () => {
      const jwt = {
        payload: {
          'custom:idp_display_name': 'Smith, Jane',
          'custom:idp_name': 'bceidbusiness',
          'custom:idp_username': 'jsmith',
          'email': 'jane@example.com',
          'cognito:groups': [],
        },
      };
      const user = parseToken(jwt);
      expect(user?.idpProvider).toBe('BCEIDBUSINESS');
      expect(user?.providerUsername).toBe('BCEIDBUSINESS\\jsmith');
    });

    it('parses privileges with numeric suffix and without prefix', () => {
      const jwt = {
        payload: {
          'custom:idp_display_name': 'X, Y',
          'custom:idp_name': 'idir',
          'custom:idp_username': 'xy',
          'email': 'xy@example.com',
          'cognito:groups': ['VIEWER_10', 'WASTE_PLUS_ADMIN_5', 'WASTE_PLUS_SUBMITTER'],
        },
      };
      const user = parseToken(jwt);
      expect(user?.privileges.VIEWER).toEqual(['10']);
      expect(user?.privileges.ADMIN).toEqual(['5']);
      expect(user?.privileges.SUBMITTER).toBeNull();
    });

    it('handles groups without cognito:groups key', () => {
      const jwt = {
        payload: {
          'custom:idp_display_name': 'A, B',
          'custom:idp_name': 'idir',
          'custom:idp_username': 'ab',
          'email': 'ab@example.com',
        },
      };
      const user = parseToken(jwt);
      expect(user?.privileges).toEqual({});
    });

    it('handles extractRoles with mixed cases and unknown roles', () => {
      const jwt = {
        payload: {
          'custom:idp_display_name': 'A, B',
          'custom:idp_name': 'idir',
          'custom:idp_username': 'ab',
          'email': 'ab@example.com',
          'cognito:groups': [
            'WASTE_PLUS_VIEWER_123',
            'viewer_456',
            'unknown_role',
            'WASTE_PLUS_ADMIN',
            'SUBMITTER_ABC',
          ],
        },
      };
      const user = parseToken(jwt);
      expect(user?.privileges.VIEWER).toEqual(['123', '456']);
      expect(user?.roles).toBeDefined();
    });

    it('handles empty parts in split', () => {
      const jwt = {
        payload: {
          'custom:idp_display_name': 'T, E',
          'custom:idp_name': 'idir',
          'custom:idp_username': 'te',
          'email': 'te@example.com',
          'cognito:groups': ['WASTE_PLUS_VIEWER_', 'WASTE_PLUS__TEST'],
        },
      };
      const user = parseToken(jwt);
      expect(user).toBeDefined();
    });
  });
});
