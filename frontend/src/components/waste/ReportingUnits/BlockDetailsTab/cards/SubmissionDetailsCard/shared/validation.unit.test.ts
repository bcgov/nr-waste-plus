import { describe, expect, it } from 'vitest';

import {
  validateDispersedRetentionExplanation,
  validateDispersedRetentionPct,
  validatePrimaryLoggingCompleteDate,
  validatePrimaryLoggingCompleteDateNotFuture,
  validatePrimaryLoggingCompleteDateRequired,
} from './validation';

const isoDateOffset = (days: number): string => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

describe('submission details validators (BR-1, D30, D32)', () => {
  it('requires the primary logging complete date', () => {
    expect(validatePrimaryLoggingCompleteDateRequired('')).toMatch(/required/i);
    expect(validatePrimaryLoggingCompleteDateRequired('   ')).toMatch(/required/i);
    expect(validatePrimaryLoggingCompleteDateRequired('2026-01-01')).toBeUndefined();
  });

  it('rejects a future primary logging complete date on both variants (D30)', () => {
    expect(validatePrimaryLoggingCompleteDateNotFuture(isoDateOffset(1))).toMatch(/future/i);
    expect(validatePrimaryLoggingCompleteDateNotFuture(isoDateOffset(0))).toBeUndefined();
    expect(validatePrimaryLoggingCompleteDateNotFuture(isoDateOffset(-1))).toBeUndefined();
    expect(validatePrimaryLoggingCompleteDate('')).toMatch(/required/i);
  });

  it('validates dispersed retention percentage as a whole number 50-100 (D32)', () => {
    expect(validateDispersedRetentionPct('', true)).toMatch(/required/i);
    expect(validateDispersedRetentionPct('49', true)).toMatch(/50 and 100/);
    expect(validateDispersedRetentionPct('101', true)).toMatch(/50 and 100/);
    expect(validateDispersedRetentionPct('50.5', true)).toMatch(/whole number/i);
    expect(validateDispersedRetentionPct('abc', true)).toMatch(/whole number/i);
    expect(validateDispersedRetentionPct('50', true)).toBeUndefined();
    expect(validateDispersedRetentionPct('100', true)).toBeUndefined();
    expect(validateDispersedRetentionPct('75', true)).toBeUndefined();
    expect(validateDispersedRetentionPct('49', false)).toBeUndefined();
  });

  it('requires the dispersed retention explanation when retention is on', () => {
    expect(validateDispersedRetentionExplanation('', true)).toMatch(/explain/i);
    expect(validateDispersedRetentionExplanation('  ', true)).toMatch(/explain/i);
    expect(validateDispersedRetentionExplanation('Calculated from survey', true)).toBeUndefined();
    expect(validateDispersedRetentionExplanation('', false)).toBeUndefined();
  });
});
