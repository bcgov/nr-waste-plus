/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';

import { mapDisplayFilter } from './utils';

describe('mapDisplayFilter', () => {
  it('returns correct display name for known keys', () => {
    expect(mapDisplayFilter('district')).toBe('District');
    expect(mapDisplayFilter('sampling')).toBe('Sampling option');
    expect(mapDisplayFilter('status')).toBe('Assess area status');
    expect(mapDisplayFilter('requestByMe')).toBe('Created by me');
    expect(mapDisplayFilter('multiMark')).toBe('Multi-mark blocks');
    expect(mapDisplayFilter('requestUserId')).toBe('Submitter');
    expect(mapDisplayFilter('updateDateStart')).toBe('Update date start');
    expect(mapDisplayFilter('updateDateEnd')).toBe('Update date end');
    expect(mapDisplayFilter('licenseeId')).toBe('Licensee number');
    expect(mapDisplayFilter('cuttingPermitId')).toBe('Cutting permit');
    expect(mapDisplayFilter('timberMark')).toBe('Timber mark');
    expect(mapDisplayFilter('clientLocationCode')).toBe('Client location code');
    expect(mapDisplayFilter('clientNumbers')).toBe('Client');
  });

  it('returns key itself for unknown keys', () => {
    expect(mapDisplayFilter('unknownKey' as any)).toBe('unknownKey');
    expect(mapDisplayFilter('anotherKey' as any)).toBe('anotherKey');
  });
});
