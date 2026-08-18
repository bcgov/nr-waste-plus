import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import { isFutureDated } from './businessDate';

const today = DateTime.fromISO('2026-08-17');

describe('isFutureDated', () => {
  it('should return true when the start date is tomorrow', () => {
    expect(isFutureDated('2026-08-18', today)).toBe(true);
  });

  it('should return true when the start date is further in the future', () => {
    expect(isFutureDated('2026-12-01', today)).toBe(true);
  });

  it('should return false when the start date is today', () => {
    expect(isFutureDated('2026-08-17', today)).toBe(false);
  });

  it('should return false when the start date is in the past', () => {
    expect(isFutureDated('2026-01-01', today)).toBe(false);
  });

  it('should return false for invalid dates', () => {
    expect(isFutureDated('not-a-date', today)).toBe(false);
  });

  it('should compare date-only even when the start date carries a time', () => {
    expect(isFutureDated('2026-08-17T23:59:59', today)).toBe(false);
    expect(isFutureDated('2026-08-18T00:00:01', today)).toBe(true);
  });

  it('should default the reference date to the local current date', () => {
    const tomorrow = DateTime.local().plus({ days: 1 }).toISODate();
    const yesterday = DateTime.local().minus({ days: 1 }).toISODate();

    expect(isFutureDated(tomorrow as string)).toBe(true);
    expect(isFutureDated(yesterday as string)).toBe(false);
  });
});
