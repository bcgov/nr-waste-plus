import { describe, it, expect } from 'vitest';

import { mapDisplayFilter } from './utils';

describe('mapDisplayFilter', () => {
  it('returns correct display name for known keys', () => {
    expect(mapDisplayFilter('district')).toBe('District');
    expect(mapDisplayFilter('sampling')).toBe('Sampling Option');
    expect(mapDisplayFilter('status')).toBe('Assess area status');
    expect(mapDisplayFilter('requestByMe')).toBe('Created By Me');
    expect(mapDisplayFilter('requestUserId')).toBe('Submitter');
    expect(mapDisplayFilter('updateDateStart')).toBe('Update Date Start');
    expect(mapDisplayFilter('updateDateEnd')).toBe('Update Date End');
    expect(mapDisplayFilter('licenseeId')).toBe('Licensee number');
    expect(mapDisplayFilter('cuttingPermitId')).toBe('Cutting Permit');
    expect(mapDisplayFilter('timberMark')).toBe('Timber Mark');
    expect(mapDisplayFilter('clientLocationCode')).toBe('Client Location Code');
    expect(mapDisplayFilter('clientNumber')).toBe('Client number');
  });

  it('returns key itself for unknown keys', () => {
    expect(mapDisplayFilter('unknownKey' as any)).toBe('unknownKey');
    expect(mapDisplayFilter('anotherKey' as any)).toBe('anotherKey');
  });
});
