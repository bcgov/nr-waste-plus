import { describe, it, expect } from 'vitest';

import { removeEmpty } from './utils';

describe('removeEmpty', () => {
  it('removes keys with falsy values from an object', () => {
    const input = { a: 1, b: '', c: null, d: undefined, e: 0, f: false, g: 'valid' };
    const result = removeEmpty(input);
    expect(result).toEqual({ a: 1, g: 'valid' });
  });

  it('returns an empty object if all values are falsy', () => {
    const input = { a: '', b: null, c: undefined, d: 0, e: false };
    const result = removeEmpty(input);
    expect(result).toEqual({});
  });

  it('returns the same object if all values are truthy', () => {
    const input = { a: 1, b: 'test', c: true };
    const result = removeEmpty(input);
    expect(result).toEqual(input);
  });

  it('works with empty object', () => {
    const input = {};
    const result = removeEmpty(input);
    expect(result).toEqual({});
  });

  it('works with empty lists too, amazing', () => {
    const input = { a: [], b: [1, 2, 3], c: [null, undefined, '', 'valid'] };
    const result = removeEmpty(input);
    expect(result).toEqual({ b: [1, 2, 3], c: ['valid'] });
  });

  it('what about object props? we got you covered', () => {
    const input = { a: { b: null, c: 2 }, d: 3 };
    const result = removeEmpty(input);
    expect(result).toEqual({ a: { c: 2 }, d: 3 });
  });
});
