import { describe, expect, it } from 'vitest';

import { Role, type FamLoginUser } from './types';
import {
  getAccessViolationMessage,
  getAssignedRoles,
  getUserAccessStatus,
} from './userAccessValidation';

const createUser = (overrides: Partial<FamLoginUser> = {}): FamLoginUser => ({
  userName: 'test.user',
  displayName: 'Test User',
  privileges: {},
  idpProvider: 'IDIR',
  roles: [{ role: Role.IDIR, clients: [] }],
  ...overrides,
});

describe('userAccessValidation', () => {
  it('ignores provider marker roles when determining assigned roles', () => {
    const assignedRoles = getAssignedRoles(
      createUser({
        roles: [
          { role: Role.IDIR, clients: [] },
          { role: Role.VIEWER, clients: ['100'] },
        ],
      }),
    );

    expect(assignedRoles).toEqual([{ role: Role.VIEWER, clients: ['100'] }]);
  });

  it('returns no-role when the user only has the provider marker role', () => {
    expect(getUserAccessStatus(createUser())).toEqual({
      kind: 'no-role',
      redirectTo: '/no-role',
    });
  });

  it('returns an IDIR multi-role violation when IDIR has more than one assigned role', () => {
    const status = getUserAccessStatus(
      createUser({
        roles: [
          { role: Role.IDIR, clients: [] },
          { role: Role.ADMIN, clients: [] },
          { role: Role.AREA, clients: [] },
        ],
      }),
    );

    expect(status).toMatchObject({
      kind: 'role-error',
      code: 'IDIR_MULTIPLE_ROLES',
      redirectTo: '/unauthorized?reason=IDIR_MULTIPLE_ROLES',
    });
  });

  it('returns a BCeID assigned-role violation when BCeID has an admin-style role', () => {
    const status = getUserAccessStatus(
      createUser({
        idpProvider: 'BCEIDBUSINESS',
        roles: [
          { role: Role.BCeID, clients: [] },
          { role: Role.DISTRICT, clients: [] },
        ],
      }),
    );

    expect(status).toMatchObject({
      kind: 'role-error',
      code: 'BCEID_ASSIGNED_ROLES',
      redirectTo: '/unauthorized?reason=BCEID_ASSIGNED_ROLES',
    });
  });

  it('returns a conflicting-client violation when submitter and viewer share a client', () => {
    const status = getUserAccessStatus(
      createUser({
        idpProvider: 'BCEIDBUSINESS',
        roles: [
          { role: Role.BCeID, clients: [] },
          { role: Role.SUBMITTER, clients: ['100', '200'] },
          { role: Role.VIEWER, clients: ['100'] },
        ],
      }),
    );

    expect(status).toMatchObject({
      kind: 'role-error',
      code: 'CONFLICTING_CLIENT_ACCESS_ROLES',
      redirectTo: '/unauthorized?reason=CONFLICTING_CLIENT_ACCESS_ROLES',
    });
  });

  it('returns a missing-client violation when client-access roles have no clients', () => {
    const status = getUserAccessStatus(
      createUser({
        roles: [
          { role: Role.IDIR, clients: [] },
          { role: Role.SUBMITTER, clients: [] },
        ],
      }),
    );

    expect(status).toMatchObject({
      kind: 'role-error',
      code: 'CLIENT_ACCESS_REQUIRES_CLIENT',
      redirectTo: '/unauthorized?reason=CLIENT_ACCESS_REQUIRES_CLIENT',
    });
  });

  it('returns a missing-client violation when any abstract role has no clients', () => {
    const status = getUserAccessStatus(
      createUser({
        idpProvider: 'BCEIDBUSINESS',
        roles: [
          { role: Role.BCeID, clients: [] },
          { role: Role.SUBMITTER, clients: ['100'] },
          { role: Role.VIEWER, clients: [] },
        ],
      }),
    );

    expect(status).toMatchObject({
      kind: 'role-error',
      code: 'CLIENT_ACCESS_REQUIRES_CLIENT',
      redirectTo: '/unauthorized?reason=CLIENT_ACCESS_REQUIRES_CLIENT',
    });
  });

  it('returns allowed for a valid client-access user', () => {
    expect(
      getUserAccessStatus(
        createUser({
          roles: [
            { role: Role.IDIR, clients: [] },
            { role: Role.VIEWER, clients: ['100'] },
          ],
        }),
      ),
    ).toEqual({ kind: 'allowed' });
  });

  it('returns undefined for an unknown violation code', () => {
    expect(getAccessViolationMessage('NOT_A_REAL_REASON')).toBeUndefined();
  });

  it('returns undefined for Object.prototype keys like toString', () => {
    expect(getAccessViolationMessage('toString')).toBeUndefined();
  });
});
