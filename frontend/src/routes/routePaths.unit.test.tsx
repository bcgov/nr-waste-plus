import { describe, it, expect } from 'vitest';

import * as routePaths from './routePaths';

import { Role } from '@/context/auth/types';

describe('routePaths', () => {
  it('shouldReturnArray_whenCalled', () => {
    expect(Array.isArray(routePaths.getMenuEntries(true, []))).toBe(true);
  });

  it('shouldIncludeClientsEntry_whenUserHasViewerRole', () => {
    const entries = routePaths.getMenuEntries(true, [{ role: Role.VIEWER, clients: ['100'] }]);
    expect(entries.some((e) => e.id === 'My clients')).toBe(true);
  });

  it('shouldIncludeClientsEntry_whenUserHasSubmitterRole', () => {
    const entries = routePaths.getMenuEntries(true, [{ role: Role.SUBMITTER, clients: ['100'] }]);
    expect(entries.some((e) => e.id === 'My clients')).toBe(true);
  });

  it('shouldExcludeClientsEntry_whenUserHasDistrictAreaOrAdminRole', () => {
    for (const role of [Role.DISTRICT, Role.AREA, Role.ADMIN]) {
      const entries = routePaths.getMenuEntries(true, [{ role, clients: [] }]);
      expect(entries.some((e) => e.id === 'My clients')).toBe(false);
    }
  });

  it('shouldExcludeOnlineOnlyRoutes_whenOffline', () => {
    // All current ROUTES have neither offlineReady nor offlineOnly → should be hidden when offline
    const entries = routePaths.getMenuEntries(false, [
      { role: Role.VIEWER, clients: ['100'] },
    ]);
    expect(entries).toHaveLength(0);
  });

  it('shouldIncludeAllSideMenuRoutes_whenOnline', () => {
    const onlineEntries = routePaths.getMenuEntries(true, [{ role: Role.VIEWER, clients: ['100'] }]);
    const offlineEntries = routePaths.getMenuEntries(false, [{ role: Role.VIEWER, clients: ['100'] }]);
    expect(onlineEntries.length).toBeGreaterThan(offlineEntries.length);
  });

});
