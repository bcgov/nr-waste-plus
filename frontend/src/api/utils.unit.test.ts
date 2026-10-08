import { describe, it, expect } from 'vitest';

import {
  forestClientAutocompleteResult2CodeDescription,
  generateSortArray,
  getValueByPath,
  removeEmpty,
} from './utils';

import type { ForestClientAutocompleteResultDto, SortDirectionType } from './types';

type TestObject = {
  user: {
    name: string;
    address: {
      city: string;
      zip: number;
    };
  };
  age: number;
  active: boolean;
};

const mockData: TestObject = {
  user: {
    name: 'Alice',
    address: {
      city: 'Wonderland',
      zip: 12345,
    },
  },
  age: 22,
  active: true,
};

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

describe('getValueByPath', () => {
  it('should return top-level property', () => {
    expect(getValueByPath(mockData, 'active')).toBe(true);
  });

  it('should return nested property', () => {
    expect(getValueByPath(mockData, 'user.name')).toBe('Alice');
    expect(getValueByPath(mockData, 'user.address.city')).toBe('Wonderland');
    expect(getValueByPath(mockData, 'user.address.zip')).toBe(12345);
  });

  it('should return undefined for valid path with undefined value', () => {
    const data = { user: { name: undefined } };
    expect(getValueByPath(data, 'user.name')).toBeUndefined();
  });
});

describe('generateSortArray', () => {
  it('should return an empty array when all directions are NONE', () => {
    const sortState = {
      name: 'NONE' as SortDirectionType,
      age: 'NONE' as SortDirectionType,
    };
    const result = generateSortArray<typeof sortState>(sortState);
    expect(result).toEqual([]);
  });

  it('should return one entry when one field is sorted', () => {
    const sortState = {
      name: 'ASC' as SortDirectionType,
      age: 'NONE' as SortDirectionType,
    };
    const result = generateSortArray<typeof sortState>(sortState);
    expect(result).toEqual(['name,ASC']);
  });

  it('should return multiple entries when multiple fields are sorted', () => {
    const sortState = {
      name: 'DESC' as SortDirectionType,
      age: 'ASC' as SortDirectionType,
      createdAt: 'NONE' as SortDirectionType,
    };
    const result = generateSortArray<typeof sortState>(sortState);
    expect(result).toEqual(['name,DESC', 'age,ASC']);
  });

  it('should handle nested keys correctly', () => {
    const sortState = {
      'user.name': 'ASC' as SortDirectionType,
      'user.age': 'DESC' as SortDirectionType,
      'user.address.city': 'NONE' as SortDirectionType,
    };
    const result = generateSortArray<typeof sortState>(sortState);
    expect(result).toEqual(['user.name,ASC', 'user.age,DESC']);
  });
});

describe('forestClientAutocompleteResult2CodeDescription', () => {
  it('converts the data', () => {
    const data: ForestClientAutocompleteResultDto = {
      id: '1234',
      name: 'ACME Corporation',
    };
    const result = forestClientAutocompleteResult2CodeDescription(data);

    expect(result).toStrictEqual({
      code: '1234',
      description: '1234 ACME Corporation',
    });
  });

  it('adds the acronym in round brackets', () => {
    const data: ForestClientAutocompleteResultDto = {
      id: '1234',
      name: 'ACME Corporation',
      acronym: 'ACME',
    };
    const result = forestClientAutocompleteResult2CodeDescription(data);

    expect(result).toStrictEqual({
      code: '1234',
      description: '1234 ACME Corporation (ACME)',
    });
  });
});
