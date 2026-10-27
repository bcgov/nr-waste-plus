import { describe, it, expect } from 'vitest';

import { Role } from '@/types/auth.types';

import { computeAuthRedirect, hasAnyRole } from './auth';

import type { FamLoginUser, FamRole } from '@/types/auth.types';

// ── Helpers ──────────────────────────────────────────────────────────────────

const role = (value: Role, clients: string[] = []): FamRole => ({ role: value, clients });

const user = (roles: FamRole[], idpProvider?: string): FamLoginUser =>
  ({ roles, idpProvider, privileges: [] }) as unknown as FamLoginUser;

describe('computeAuthRedirect (T-01)', () => {
  describe('loading state', () => {
    it('suppresses every decision while auth is resolving', () => {
      expect(computeAuthRedirect({ user: undefined, isLoading: true, pathname: '/search' })).toBe(
        null,
      );
      expect(
        computeAuthRedirect({
          user: user([role(Role.VIEWER, ['c1'])]),
          isLoading: true,
          pathname: '/clients',
        }),
      ).toBe(null);
    });
  });

  describe('unauthenticated', () => {
    it('sends the user to the login entry point', () => {
      expect(
        computeAuthRedirect({ user: undefined, isLoading: false, pathname: '/search' }),
      ).toEqual({
        href: '/login',
      });
    });

    it('skips the redirect when already on /login (loop guard)', () => {
      expect(computeAuthRedirect({ user: undefined, isLoading: false, pathname: '/login' })).toBe(
        null,
      );
    });
  });

  describe('no-role status', () => {
    it('redirects to /no-role', () => {
      expect(
        computeAuthRedirect({ user: user([]), isLoading: false, pathname: '/search' }),
      ).toEqual({ href: '/no-role' });
    });
  });

  describe('role-error statuses', () => {
    it('redirects IDIR multi-role violations with the reason code', () => {
      const idir = user([role(Role.VIEWER, ['c1']), role(Role.ADMIN)], 'IDIR');
      expect(computeAuthRedirect({ user: idir, isLoading: false, pathname: '/search' })).toEqual({
        href: '/unauthorized?reason=IDIR_MULTIPLE_ROLES',
      });
    });

    it('redirects BCEIDBUSINESS forbidden-role violations', () => {
      const bceid = user([role(Role.ADMIN)], 'BCEIDBUSINESS');
      expect(computeAuthRedirect({ user: bceid, isLoading: false, pathname: '/search' })).toEqual({
        href: '/unauthorized?reason=BCEID_ASSIGNED_ROLES',
      });
    });

    it('redirects abstract roles without clients', () => {
      const viewerNoClient = user([role(Role.VIEWER, [])]);
      expect(
        computeAuthRedirect({ user: viewerNoClient, isLoading: false, pathname: '/search' }),
      ).toEqual({ href: '/unauthorized?reason=CLIENT_ACCESS_REQUIRES_CLIENT' });
    });

    it('redirects conflicting viewer/submitter client access', () => {
      const conflicting = user([role(Role.VIEWER, ['c1']), role(Role.SUBMITTER, ['c1'])]);
      expect(
        computeAuthRedirect({ user: conflicting, isLoading: false, pathname: '/search' }),
      ).toEqual({ href: '/unauthorized?reason=CONFLICTING_CLIENT_ACCESS_ROLES' });
    });

    it('exempts /unauthorized from re-redirect (loop guard)', () => {
      const conflicting = user([role(Role.VIEWER, ['c1']), role(Role.SUBMITTER, ['c1'])]);
      expect(
        computeAuthRedirect({ user: conflicting, isLoading: false, pathname: '/unauthorized' }),
      ).toBe(null);
    });
  });

  describe('allowed users', () => {
    it('renders the outlet', () => {
      const viewer = user([role(Role.VIEWER, ['c1'])]);
      expect(computeAuthRedirect({ user: viewer, isLoading: false, pathname: '/search' })).toBe(
        null,
      );
    });
  });
});

describe('hasAnyRole', () => {
  it('allows everyone when no roles are required', () => {
    expect(hasAnyRole(undefined, [])).toBe(true);
    expect(hasAnyRole([role(Role.VIEWER)], [])).toBe(true);
  });

  it('denies anonymous users when roles are required', () => {
    expect(hasAnyRole(undefined, [Role.ADMIN])).toBe(false);
    expect(hasAnyRole([], [Role.ADMIN])).toBe(false);
  });

  it('allows any-of matches', () => {
    expect(hasAnyRole([role(Role.SUBMITTER, ['c'])], [Role.VIEWER, Role.SUBMITTER])).toBe(true);
    expect(hasAnyRole([role(Role.VIEWER, ['c'])], [Role.VIEWER, Role.SUBMITTER])).toBe(true);
  });

  it('denies non-matching roles', () => {
    expect(hasAnyRole([role(Role.ADMIN)], [Role.VIEWER, Role.SUBMITTER])).toBe(false);
  });
});
