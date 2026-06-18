import { describe, expect, it } from 'vitest';

import {
  EIGHT_SECONDS,
  FIVE_SECONDS,
  ONE_HOUR,
  ONE_MINUTE,
  ONE_SECOND,
  TEN_SECONDS,
  THIRTY_SECONDS,
  THREE_HALF_HOURS,
  THREE_HOURS,
  THREE_SECONDS,
  TWO_MINUTE,
} from './TimeUnits';

describe('TimeUnits', () => {
  it('ONE_SECOND should be 1000', () => {
    expect(ONE_SECOND).toBe(1000);
  });

  it('THREE_SECONDS should be 3000', () => {
    expect(THREE_SECONDS).toBe(3000);
  });

  it('FIVE_SECONDS should be 5000', () => {
    expect(FIVE_SECONDS).toBe(5000);
  });

  it('EIGHT_SECONDS should be 8000', () => {
    expect(EIGHT_SECONDS).toBe(8000);
  });

  it('TEN_SECONDS should be 10000', () => {
    expect(TEN_SECONDS).toBe(10000);
  });

  it('THIRTY_SECONDS should be 30000', () => {
    expect(THIRTY_SECONDS).toBe(30000);
  });

  it('ONE_MINUTE should be 60000', () => {
    expect(ONE_MINUTE).toBe(60000);
  });

  it('TWO_MINUTE should be 120000', () => {
    expect(TWO_MINUTE).toBe(120000);
  });

  it('ONE_HOUR should be 3600000', () => {
    expect(ONE_HOUR).toBe(3600000);
  });

  it('THREE_HOURS should be 10800000', () => {
    expect(THREE_HOURS).toBe(10800000);
  });

  it('THREE_HALF_HOURS should be 12600000', () => {
    expect(THREE_HALF_HOURS).toBe(12600000);
  });
});
