import { describe, it, expect } from 'vitest';

import { parseLocationResourceId, parseResourceIdFromLocation } from './locationHeader';

describe('parseResourceIdFromLocation', () => {
  it('extracts the trailing numeric ID from a relative path', () => {
    expect(parseResourceIdFromLocation('/reporting-units/42')).toBe(42);
  });

  it('extracts the trailing numeric ID from an absolute URL', () => {
    expect(parseResourceIdFromLocation('http://example.com/api/reporting-units/777')).toBe(777);
  });

  it('ignores a trailing query string and resolves the path ID', () => {
    expect(parseResourceIdFromLocation('/reporting-units/777?v=1')).toBe(777);
  });

  it('ignores a trailing hash and resolves the path ID', () => {
    expect(parseResourceIdFromLocation('/reporting-units/123#frag')).toBe(123);
  });

  it('handles single-digit IDs', () => {
    expect(parseResourceIdFromLocation('/foo/1')).toBe(1);
  });

  it('handles large IDs', () => {
    expect(parseResourceIdFromLocation('/foo/999999999')).toBe(999999999);
  });

  it('throws when the path ends without a numeric segment', () => {
    expect(() => parseResourceIdFromLocation('/reporting-units/')).toThrow(
      'Invalid Location header: "/reporting-units/"',
    );
  });

  it('throws when the trailing segment is non-numeric', () => {
    expect(() => parseResourceIdFromLocation('/reporting-units/abc')).toThrow(
      'Invalid Location header: "/reporting-units/abc"',
    );
  });

  it('throws when the value is completely malformed', () => {
    expect(() => parseResourceIdFromLocation('not-a-valid-path')).toThrow(
      'Invalid Location header: "not-a-valid-path"',
    );
  });
});

describe('parseLocationResourceId', () => {
  it('uses the default trailing-numeric parser when none is supplied', () => {
    expect(parseLocationResourceId('/reporting-units/42')).toBe(42);
  });

  it('delegates to a custom parser when provided', () => {
    const custom = (location: string): string => location.split('/').pop()!;
    expect(parseLocationResourceId('/reporting-units/abc', custom)).toBe('abc');
  });

  it('propagates errors thrown by the custom parser', () => {
    const custom = (): number => {
      throw new Error('custom failure');
    };
    expect(() => parseLocationResourceId('/foo', custom)).toThrow('custom failure');
  });
});
