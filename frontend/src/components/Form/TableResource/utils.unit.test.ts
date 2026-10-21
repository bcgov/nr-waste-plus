import { describe, expect, it } from 'vitest';

import { getHeaderId, renderCell, resolveTableRowActionValue } from './utils';

import type { TableHeaderType } from '@/types/tableResource.types';

type TestRow = {
  id: number;
  name: string;
  nested?: {
    value: string;
  };
};

/** Row shape that allows extra dynamic keys (data, etc.). */
type DynamicRow = TestRow & Record<string, unknown>;

type DataRow = TestRow & { data?: { a: number } };

describe('TableResource utils', () => {
  describe('getHeaderId', () => {
    it('returns id when provided', () => {
      const header: TableHeaderType<TestRow> = {
        key: 'name',
        header: 'Name',
        id: 'col-name',
      };
      expect(getHeaderId(header)).toBe('col-name');
    });

    it('returns key as string when id not provided', () => {
      const header: TableHeaderType<TestRow> = {
        key: 'name',
        header: 'Name',
      };
      expect(getHeaderId(header)).toBe('name');
    });

    it('converts numeric key to string', () => {
      const header: TableHeaderType<TestRow & { count: number }> = {
        key: 'count',
        header: 'Count',
      };
      expect(getHeaderId(header)).toBe('count');
    });
  });

  describe('renderCell', () => {
    it('returns dash for null value', () => {
      const row = { id: 1, name: null } as unknown as TestRow;
      const header: TableHeaderType<TestRow> = { key: 'name', header: 'Name' };
      expect(renderCell(row, header)).toBe('-');
    });

    it('returns dash for undefined value', () => {
      const row: TestRow = { id: 1, name: 'test' };
      const header = {
        key: 'missing',
        header: 'Missing',
      } as unknown as TableHeaderType<TestRow>;
      expect(renderCell(row, header)).toBe('-');
    });

    it('returns string value as-is', () => {
      const row: TestRow = { id: 1, name: 'Alice' };
      const header: TableHeaderType<TestRow> = { key: 'name', header: 'Name' };
      expect(renderCell(row, header)).toBe('Alice');
    });

    it('returns number value as-is', () => {
      const row: TestRow = { id: 42, name: 'test' };
      const header: TableHeaderType<TestRow> = { key: 'id', header: 'ID' };
      expect(renderCell(row, header)).toBe(42);
    });

    it('uses renderAs when provided', () => {
      const row: TestRow = { id: 1, name: 'Alice' };
      const header: TableHeaderType<TestRow> = {
        key: 'name',
        header: 'Name',
        renderAs: (val) => `Hi ${val}`,
      };
      expect(renderCell(row, header)).toBe('Hi Alice');
    });

    it('stringifies non-primitive non-null values', () => {
      const row: DataRow = { id: 1, name: 'test', data: { a: 1 } };
      const header: TableHeaderType<DataRow> = { key: 'data', header: 'Data' };
      expect(renderCell(row, header)).toBe(JSON.stringify({ a: 1 }));
    });

    it('renders a zero value instead of the dash fallback', () => {
      const row: TestRow = { id: 0, name: 'test' };
      const header: TableHeaderType<TestRow> = { key: 'id', header: 'ID' };
      expect(renderCell(row, header)).toBe(0);
    });

    it('renders an empty string as an empty cell', () => {
      const row: TestRow = { id: 1, name: '' };
      const header: TableHeaderType<TestRow> = { key: 'name', header: 'Name' };
      expect(renderCell(row, header)).toBe('');
    });

    it('stringifies a false value instead of the dash fallback', () => {
      const row = { id: 1, name: false } as unknown as TestRow;
      const header: TableHeaderType<TestRow> = { key: 'name', header: 'Name' };
      expect(renderCell(row, header)).toBe('false');
    });
  });

  describe('resolveTableRowActionValue', () => {
    it('returns value directly when not a function', () => {
      const row: DynamicRow = { id: 1, name: 'test' };
      expect(resolveTableRowActionValue('hello', row)).toBe('hello');
    });

    it('calls function with row when value is function', () => {
      const row: DynamicRow = { id: 1, name: 'test' };
      const fn = (r: DynamicRow) => r.name;
      expect(resolveTableRowActionValue(fn, row)).toBe('test');
    });

    it('returns function result', () => {
      const row: DynamicRow = { id: 5, name: 'alice' };
      expect(resolveTableRowActionValue((r: DynamicRow) => r.id * 2, row)).toBe(10);
    });
  });
});
