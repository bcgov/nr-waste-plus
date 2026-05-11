import { describe, it, expect } from 'vitest';

import * as routePaths from './routePaths';

import { Role } from '@/context/auth/types';

describe('routePaths', () => {
  it('getMenuEntries returns menu items', () => {
    expect(Array.isArray(routePaths.getMenuEntries(true, []))).toBe(true);
  });

  it('getMenuEntries includes clients entry for Viewer role', () => {
    const entries = routePaths.getMenuEntries(true, [{ role: Role.VIEWER, clients: ['100'] }]);
    expect(entries.some((e) => e.id === 'My clients')).toBe(true);
  });

  it('getMenuEntries includes clients entry for Submitter role', () => {
    const entries = routePaths.getMenuEntries(true, [{ role: Role.SUBMITTER, clients: ['100'] }]);
    expect(entries.some((e) => e.id === 'My clients')).toBe(true);
  });

  it('getMenuEntries excludes clients entry for District/Area/Admin roles', () => {
    for (const role of [Role.DISTRICT, Role.AREA, Role.ADMIN]) {
      const entries = routePaths.getMenuEntries(true, [{ role, clients: [] }]);
      expect(entries.some((e) => e.id === 'My clients')).toBe(false);
    }
  });

});
