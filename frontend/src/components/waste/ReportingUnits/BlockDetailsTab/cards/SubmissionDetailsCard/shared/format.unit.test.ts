import { describe, expect, it } from 'vitest';

import {
  codeDescriptionToString,
  normalizeTimberMark,
  toDateValue,
  toIsoDate,
  toSelectedItem,
  toSelectedItems,
  toYesNo,
} from './format';

describe('submission details format helpers', () => {
  it('finds a selected item by code', () => {
    const options = [{ code: 'A', description: 'Alpha' }];
    expect(toSelectedItem(options, 'A')?.description).toBe('Alpha');
    expect(toSelectedItem(options, 'B')).toBeNull();
    expect(toSelectedItem(options, '')).toBeNull();
  });

  it('resolves multiple selected codes in order', () => {
    const options = [
      { code: '1', description: 'One' },
      { code: '2', description: 'Two' },
    ];
    expect(toSelectedItems(options, ['2', '1', '9']).map((i) => i.code)).toEqual(['2', '1']);
  });

  it('formats booleans and dates', () => {
    expect(toYesNo(true)).toBe('Yes');
    expect(toYesNo(false)).toBe('No');
    expect(toDateValue('')).toEqual([]);
    expect(toDateValue('2026-05-09')[0]).toBeInstanceOf(Date);
    expect(toIsoDate(new Date(2026, 4, 9))).toBe('2026-05-09');
  });

  it('normalizes timber marks to alphanumerics and uppercase (BR-2 readiness)', () => {
    expect(normalizeTimberMark('ab-12 /c')).toBe('AB12C');
    expect(normalizeTimberMark('')).toBe('');
  });

  it('formats code-description items for ComboBox labels', () => {
    expect(codeDescriptionToString({ description: 'Alpha' })).toBe('Alpha');
    expect(codeDescriptionToString(null)).toBe('');
  });
});
