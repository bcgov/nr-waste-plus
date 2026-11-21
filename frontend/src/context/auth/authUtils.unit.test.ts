import { describe, expect, it } from 'vitest';

import { parseToken } from './authUtils';
import { Role } from '@/types/auth.types';

const idirClaims = {
  identity_provider: 'azureidir',
  idir_username: 'JRYAN',
  display_name: 'Ryan, Jack Admin CIA:IN',
  email: 'jack.ryan@gov.bc.ca',
  client_roles: ['WASTE_PLUS_ADMIN'],
};

describe('parseToken', () => {
  it('returns undefined when claims are absent', () => {
    expect(parseToken(undefined)).toBeUndefined();
  });

  it('parses the Keycloak IDIR claim set', () => {
    const user = parseToken(idirClaims);

    expect(user).toMatchObject({
      userName: 'JRYAN',
      displayName: 'Ryan, Jack Admin CIA:IN',
      email: 'jack.ryan@gov.bc.ca',
      idpProvider: 'IDIR',
      firstName: 'Jack',
      providerUsername: 'IDIR\\JRYAN',
    });
    expect(user?.roles).toEqual([
      { role: Role.ADMIN, clients: [] },
      { role: Role.IDIR, clients: [] },
    ]);
    expect(user?.privileges).toEqual({ ADMIN: null });
  });

  it.each(['azureidir', 'AzureIDIR', 'idir', 'IDIR'])(
    'normalizes every IDIR alias (%s) to the IDIR provider label',
    (alias) => {
      const user = parseToken({ ...idirClaims, identity_provider: alias });
      expect(user?.idpProvider).toBe('IDIR');
      expect(user?.providerUsername).toBe('IDIR\\JRYAN');
    },
  );

  it('maps the bceidbusiness broker to the BCEIDBUSINESS provider label', () => {
    const user = parseToken({
      identity_provider: 'bceidbusiness',
      idir_username: 'uattest',
      display_name: 'Uat Test',
      email: 'uattest@gov.bc.ca',
      client_roles: ['WASTE_PLUS_SUBMITTER'],
    });

    expect(user?.idpProvider).toBe('BCEIDBUSINESS');
    expect(user?.roles).toEqual([
      { role: Role.SUBMITTER, clients: [] },
      { role: Role.BCeID, clients: [] },
    ]);
    expect(user?.providerUsername).toBe('BCEIDBUSINESS\\uattest');
  });

  it('drops FAM bookkeeping entries before parsing roles and privileges', () => {
    const user = parseToken({
      ...idirClaims,
      client_roles: [
        'WASTE_PLUS_ADMIN',
        'FAM:EXPIRES:2026-09-30:WASTE_PLUS_ADMIN',
        'FAM:EXPIRES:2027-01-01:WASTE_PLUS_VIEWER',
      ],
    });

    expect(user?.roles).toEqual([
      { role: Role.ADMIN, clients: [] },
      { role: Role.IDIR, clients: [] },
    ]);
    expect(user?.privileges).toEqual({ ADMIN: null });
  });

  it('splits scoped roles into client values', () => {
    const user = parseToken({
      ...idirClaims,
      client_roles: ['WASTE_PLUS_VIEWER_00147603', 'WASTE_PLUS_VIEWER_00010005'],
    });

    expect(user?.roles).toEqual([
      { role: Role.VIEWER, clients: ['00147603', '00010005'] },
      { role: Role.IDIR, clients: [] },
    ]);
    expect(user?.privileges).toEqual({ VIEWER: ['00147603', '00010005'] });
  });

  it('ignores entries that do not resolve to an application role', () => {
    const user = parseToken({
      ...idirClaims,
      client_roles: ['SOME_OTHER_APP_ROLE', 'WASTE_PLUS_ADMIN'],
    });

    expect(user?.roles).toEqual([
      { role: Role.ADMIN, clients: [] },
      { role: Role.IDIR, clients: [] },
    ]);
  });

  it('still assigns the provider pseudo-role when the token carries no role claim', () => {
    const user = parseToken({
      identity_provider: 'azureidir',
      idir_username: 'JRYAN',
      display_name: 'Ryan, Jack',
    });

    expect(user?.roles).toEqual([{ role: Role.IDIR, clients: [] }]);
    expect(user?.privileges).toEqual({});
  });

  it('handles a display name without a comma (space-separated)', () => {
    const user = parseToken({
      ...idirClaims,
      display_name: 'Jack Ryan',
    });

    expect(user?.firstName).toBe('Jack');
    expect(user?.lastName).toBe('Ryan');
  });

  it('defaults missing string claims to empty values', () => {
    const user = parseToken({
      identity_provider: 'azureidir',
    });

    expect(user).toMatchObject({
      userName: '',
      displayName: '',
      email: '',
      idpProvider: 'IDIR',
    });
  });
});
