import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';

import { toCodeFriendlyKey, applyColumnMap, buildProcessorHeaders } from './columnMap';
import { readHeaderRows, resolveHeaders, toCellText } from './headerParser';
import { toTableResult, toMatrixResult, isEmptyRow } from './rowBuilders';
import { SpreadsheetProcessor } from './spreadsheetProcessor';

import { ExcelReadError } from '@/services/excelReader/excelReader';

// ---------------------------------------------------------------------------
// toCellText
// ---------------------------------------------------------------------------
describe('toCellText', () => {
  it('converts a string value', () => {
    expect(toCellText(' hello ')).toBe('hello');
  });
  it('returns empty for null', () => {
    expect(toCellText(null)).toBe('');
  });
  it('returns empty for undefined', () => {
    expect(toCellText(undefined)).toBe('');
  });
  it('coerces numbers to strings', () => {
    expect(toCellText(42)).toBe('42');
  });
});

// ---------------------------------------------------------------------------
// toCodeFriendlyKey
// ---------------------------------------------------------------------------
describe('toCodeFriendlyKey', () => {
  it('lowercases the first word', () => {
    expect(toCodeFriendlyKey('District')).toBe('district');
  });
  it('camelCases multi-word keys', () => {
    expect(toCodeFriendlyKey('Dry Belt m3/ha')).toBe('dryBeltM3Ha');
  });
  it('handles CRLF sequences', () => {
    expect(toCodeFriendlyKey('Total Avoidable \r\nSawlog Waste')).toBe('totalAvoidableSawlogWaste');
  });
  it('strips special characters', () => {
    expect(toCodeFriendlyKey('Value (m³/ha)')).toBe('valueMHa');
  });
  it('falls back to column for empty input', () => {
    expect(toCodeFriendlyKey('')).toBe('column');
  });
  it('handles only special characters', () => {
    expect(toCodeFriendlyKey('!!! @@@ ###')).toBe('column');
  });
});

// ---------------------------------------------------------------------------
// applyColumnMap
// ---------------------------------------------------------------------------
describe('applyColumnMap', () => {
  it('returns the original row when the map is empty', () => {
    const row = { District: 'DCC' };
    expect(applyColumnMap(row, {})).toBe(row);
  });
  it('renames keys according to the map', () => {
    const row = { 'District': 'DCC', 'Dry Belt': 2.04 };
    const map = { 'District': { key: 'district' }, 'Dry Belt': { key: 'dryBelt' } };
    expect(applyColumnMap(row, map)).toEqual({ district: 'DCC', dryBelt: 2.04 });
  });
  it('keeps unmapped keys unchanged', () => {
    const row = { District: 'DCC', Extra: 'keep' };
    const map = { District: { key: 'district' } };
    expect(applyColumnMap(row, map)).toEqual({ district: 'DCC', Extra: 'keep' });
  });
});

// ---------------------------------------------------------------------------
// buildProcessorHeaders
// ---------------------------------------------------------------------------
describe('buildProcessorHeaders', () => {
  it('produces headers from resolved headers with no map', () => {
    const resolved = [
      { index: 0, path: 'District', keys: ['District'], sourceColumns: [0] },
      { index: 1, path: 'Dry Belt', keys: ['Dry Belt'], sourceColumns: [1] },
    ];
    expect(buildProcessorHeaders(resolved, {})).toEqual([
      { key: 'District', header: 'District' },
      { key: 'Dry Belt', header: 'Dry Belt' },
    ]);
  });
  it('applies column map overrides', () => {
    const resolved = [{ index: 0, path: 'District', keys: ['District'], sourceColumns: [0] }];
    const map = { District: { key: 'district', header: 'District Code' } };
    expect(buildProcessorHeaders(resolved, map)).toEqual([
      { key: 'district', header: 'District Code' },
    ]);
  });
});

// ---------------------------------------------------------------------------
// readHeaderRows
// ---------------------------------------------------------------------------
describe('readHeaderRows', () => {
  it('parses simple single-row headers', () => {
    const rows = [['District', 'Volume']];
    expect(readHeaderRows(rows, [])).toEqual([
      { index: 0, segments: ['District'] },
      { index: 1, segments: ['Volume'] },
    ]);
  });
  it('propagates horizontal merged cells', () => {
    const rows = [
      ['Group A', null, null],
      ['Col A', 'Col B', 'Col C'],
    ];
    const merges = [{ startRow: 0, endRow: 0, startCol: 0, endCol: 2 }];
    const result = readHeaderRows(rows, merges);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ index: 0, segments: ['Group A', 'Col A'] });
    expect(result[1]).toEqual({ index: 1, segments: ['Group A', 'Col B'] });
    expect(result[2]).toEqual({ index: 2, segments: ['Group A', 'Col C'] });
  });
  it('drops spacer columns (all empty)', () => {
    const rows = [['District', null, 'Volume']];
    expect(readHeaderRows(rows, [])).toHaveLength(2);
  });
  it('skips vertical-only merges', () => {
    const rows = [['District'], [null]];
    const merges = [{ startRow: 0, endRow: 1, startCol: 0, endCol: 0 }];
    const result = readHeaderRows(rows, merges);
    expect(result).toEqual([{ index: 0, segments: ['District'] }]);
  });
  it('skips vertical-only merges (startCol === endCol)', () => {
    const rows = [
      ['Group A', null],
      [null, 'Col B'],
    ];
    const merges = [{ startRow: 0, endRow: 1, startCol: 0, endCol: 0 }];
    const result = readHeaderRows(rows, merges);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ index: 0, segments: ['Group A'] });
    expect(result[1]).toEqual({ index: 1, segments: ['Col B'] });
  });
  it('handles merge extending beyond header rows', () => {
    const rows = [
      ['Group A', null],
      ['Col A', 'Col B'],
    ];
    const merges = [{ startRow: 0, endRow: 5, startCol: 0, endCol: 0 }];
    const result = readHeaderRows(rows, merges);
    expect(result[0]).toEqual({ index: 0, segments: ['Group A', 'Col A'] });
  });
  it('handles merge with empty source value', () => {
    const rows = [
      [null, 'Col B'],
      ['Col A', 'Col C'],
    ];
    const merges = [{ startRow: 0, endRow: 0, startCol: 0, endCol: 1 }];
    const result = readHeaderRows(rows, merges);
    expect(result[0]).toEqual({ index: 0, segments: ['Col A'] });
    expect(result[1]).toEqual({ index: 1, segments: ['Col B', 'Col C'] });
  });
  it('handles multiple non-overlapping horizontal merges', () => {
    const rows = [
      ['A', null, 'X', null],
      ['B', 'C', 'D', 'E'],
    ];
    const merges = [
      { startRow: 0, endRow: 0, startCol: 0, endCol: 1 },
      { startRow: 0, endRow: 0, startCol: 2, endCol: 3 },
    ];
    const result = readHeaderRows(rows, merges);
    expect(result).toHaveLength(4);
    expect(result[0].segments).toEqual(['A', 'B']);
    expect(result[1].segments).toEqual(['A', 'C']);
    expect(result[2].segments).toEqual(['X', 'D']);
    expect(result[3].segments).toEqual(['X', 'E']);
  });
});

// ---------------------------------------------------------------------------
// resolveHeaders
// ---------------------------------------------------------------------------
describe('resolveHeaders', () => {
  it('produces flat joined keys when condensed is false', () => {
    const columns = [
      { index: 0, segments: ['District'] },
      { index: 1, segments: ['Group', 'Sub A'] },
    ];
    const result = resolveHeaders(columns, false, ' - ');
    expect(result).toEqual([
      { index: 0, path: 'District', keys: ['District'], sourceColumns: [0] },
      { index: 1, path: 'Group - Sub A', keys: ['Group - Sub A'], sourceColumns: [1] },
    ]);
  });
  it('groups by outer segment when condensed is true', () => {
    const columns = [
      { index: 0, segments: ['District'] },
      { index: 1, segments: ['Group', 'Sub A'] },
      { index: 2, segments: ['Group', 'Sub B'] },
    ];
    const result = resolveHeaders(columns, true, ' - ');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      index: 0,
      path: 'District',
      keys: ['District'],
      sourceColumns: [0],
    });
    expect(result[1]).toEqual({
      index: 1,
      path: 'Group',
      keys: ['Sub A', 'Sub B'],
      sourceColumns: [1, 2],
    });
  });
  it('uses leaf segment as key for multi-segment condensed groups', () => {
    const columns = [{ index: 0, segments: ['A', 'B'] }];
    const result = resolveHeaders(columns, true, ' - ');
    expect(result[0].keys).toEqual(['B']);
  });
  it('handles single-segment group (uses groupKey as leaf)', () => {
    const columns = [{ index: 0, segments: ['Solo'] }];
    const result = resolveHeaders(columns, true, ' - ');
    expect(result[0].keys).toEqual(['Solo']);
  });
  it('handles empty groupKey gracefully', () => {
    const columns = [{ index: 0, segments: [''] }];
    const result = resolveHeaders(columns, true, ' - ');
    expect(result[0].path).toBe('');
    expect(result[0].keys).toEqual(['']);
  });
});

// ---------------------------------------------------------------------------
// isEmptyRow
// ---------------------------------------------------------------------------
describe('isEmptyRow', () => {
  it('returns true for all-null row', () => {
    expect(isEmptyRow([null, null])).toBe(true);
  });
  it('returns true for whitespace-only row', () => {
    expect(isEmptyRow(['', '  '])).toBe(true);
  });
  it('returns false when any cell has a value', () => {
    expect(isEmptyRow([null, 'DCC', null])).toBe(false);
  });
  it('returns false for a number value', () => {
    expect(isEmptyRow([2.04])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// toTableResult
// ---------------------------------------------------------------------------
describe('toTableResult', () => {
  const headers = [
    { index: 0, path: 'District', keys: ['District'], sourceColumns: [0] },
    { index: 1, path: 'Volume', keys: ['Volume'], sourceColumns: [1] },
  ];

  it('produces flat array of row objects', () => {
    const dataRows = [
      ['DCC', 2.04],
      ['DMH', 1.87],
    ];
    const result = toTableResult(dataRows, headers, {}, true);
    expect(result.success).toBe(true);
    if (result.success && !('matrix' in result)) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({ District: 'DCC', Volume: 2.04 });
    }
  });
  it('skips empty rows when skipEmptyRows is true', () => {
    const dataRows = [
      ['DCC', 2.04],
      [null, null],
      ['DMH', 1.87],
    ];
    const result = toTableResult(dataRows, headers, {}, true);
    if (result.success && !('matrix' in result)) {
      expect(result.data).toHaveLength(2);
    }
  });
  it('includes empty rows when skipEmptyRows is false', () => {
    const dataRows = [
      ['DCC', 2.04],
      [null, null],
    ];
    const result = toTableResult(dataRows, headers, {}, false);
    if (result.success && !('matrix' in result)) {
      expect(result.data).toHaveLength(2);
    }
  });
  it('returns processor headers', () => {
    const dataRows = [['DCC', 2.04]];
    const result = toTableResult(dataRows, headers, {}, true);
    if (result.success && !('matrix' in result)) {
      expect(result.headers).toBeDefined();
      expect(result.headers).toHaveLength(2);
      expect(result.headers![0]).toEqual({ key: 'District', header: 'District' });
    }
  });
});

// ---------------------------------------------------------------------------
// toMatrixResult
// ---------------------------------------------------------------------------
describe('toMatrixResult', () => {
  const headers = [
    { index: 0, path: 'District', keys: ['District'], sourceColumns: [0] },
    { index: 1, path: 'Volume', keys: ['Volume'], sourceColumns: [1] },
  ];

  it('keys by first header column', () => {
    const dataRows = [
      ['DCC', 2.04],
      ['DMH', 1.87],
    ];
    const result = toMatrixResult(dataRows, headers, {}, true);
    expect(result.success).toBe(true);
    if (result.success && 'matrix' in result && result.matrix) {
      expect(Object.keys(result.data)).toEqual(['DCC', 'DMH']);
      expect(result.data['DCC']).toHaveLength(1);
      expect(result.data['DCC'][0]).toEqual({ Volume: 2.04 });
    }
  });
  it('groups duplicate keys into arrays', () => {
    const dataRows = [
      ['DCC', 2.04],
      ['DCC', 1.5],
    ];
    const result = toMatrixResult(dataRows, headers, {}, true);
    if (result.success && 'matrix' in result && result.matrix) {
      expect(result.data['DCC']).toHaveLength(2);
    }
  });
  it('skips rows with empty key', () => {
    const dataRows = [
      [null, 2.04],
      ['DMH', 1.87],
    ];
    const result = toMatrixResult(dataRows, headers, {}, true);
    if (result.success && 'matrix' in result && result.matrix) {
      expect(Object.keys(result.data)).toEqual(['DMH']);
    }
  });
  it('excludes key column from value headers', () => {
    const dataRows = [['DCC', 2.04]];
    const result = toMatrixResult(dataRows, headers, {}, true);
    if (result.success && 'matrix' in result && result.matrix) {
      expect(result.headers).toHaveLength(1);
      expect(result.headers![0].key).toBe('Volume');
    }
  });
  it('returns empty matrix when no key header', () => {
    const result = toMatrixResult([['data']], [], {}, true);
    if (result.success && 'matrix' in result && result.matrix) {
      expect(result.data).toEqual({});
    }
  });
});

// ---------------------------------------------------------------------------
// buildRow — condensed groups
// ---------------------------------------------------------------------------
describe('buildRow (via toTableResult condensed)', () => {
  const headers = [
    { index: 0, path: 'Group', keys: ['Sub A', 'Sub B'], sourceColumns: [0, 1] },
    { index: 1, path: 'Flat', keys: ['Flat'], sourceColumns: [2] },
  ];

  it('nests sub-columns under group path', () => {
    const result = toTableResult([['A', 'B', 'C']], headers, {}, true);
    if (result.success && !('matrix' in result)) {
      expect(result.data[0]).toEqual({
        Group: { 'Sub A': 'A', 'Sub B': 'B' },
        Flat: 'C',
      });
    }
  });
});

// ---------------------------------------------------------------------------
// toMatrixResult — condensed groups
// ---------------------------------------------------------------------------
describe('toMatrixResult (condensed groups)', () => {
  const headers = [
    { index: 0, path: 'District', keys: ['District'], sourceColumns: [0] },
    { index: 1, path: 'Group', keys: ['Sub A', 'Sub B'], sourceColumns: [1, 2] },
  ];

  it('nests sub-columns under group path in matrix mode', () => {
    const dataRows = [['DCC', 'A', 'B']];
    const result = toMatrixResult(dataRows, headers, {}, true);
    expect(result.success).toBe(true);
    if (result.success && 'matrix' in result && result.matrix) {
      expect(result.data['DCC']).toHaveLength(1);
      expect(result.data['DCC'][0]).toEqual({
        Group: { 'Sub A': 'A', 'Sub B': 'B' },
      });
    }
  });

  it('excludes key column from value headers in condensed mode', () => {
    const dataRows = [['DCC', 'A', 'B']];
    const result = toMatrixResult(dataRows, headers, {}, true);
    if (result.success && 'matrix' in result && result.matrix) {
      expect(result.headers).toHaveLength(1);
      expect(result.headers![0].key).toBe('Group');
    }
  });
});

// ---------------------------------------------------------------------------
// SpreadsheetProcessor — with mocked ExcelReader
// ---------------------------------------------------------------------------
describe('SpreadsheetProcessor', () => {
  const mockFile = new File(['dummy'], 'test.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns failure when no data rows exist', async () => {
    const processor = new SpreadsheetProcessor({ headerRows: 2 });
    vi.spyOn(processor['reader'], 'readRawWithMerges').mockResolvedValue({
      rows: [['H1'], ['H2']],
      merges: [],
    });
    const result = await processor.load(mockFile);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0]).toContain('contains no data rows');
    }
  });

  it('returns failure on ExcelReadError', async () => {
    const processor = new SpreadsheetProcessor();
    vi.spyOn(processor['reader'], 'readRawWithMerges').mockRejectedValue(
      new ExcelReadError('Corrupt file'),
    );
    const result = await processor.load(mockFile);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0]).toBe('Corrupt file');
    }
  });

  it('returns failure on generic error', async () => {
    const processor = new SpreadsheetProcessor();
    vi.spyOn(processor['reader'], 'readRawWithMerges').mockRejectedValue(
      new Error('Something broke'),
    );
    const result = await processor.load(mockFile);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0]).toContain('could not be processed');
    }
  });

  it('processes flat rows without schema', async () => {
    const processor = new SpreadsheetProcessor({ headerRows: 1, condensed: false });
    vi.spyOn(processor['reader'], 'readRawWithMerges').mockResolvedValue({
      rows: [
        ['District', 'Vol'],
        ['DCC', 2.04],
      ],
      merges: [],
    });
    const result = await processor.load(mockFile);
    expect(result.success).toBe(true);
    if (result.success && !('matrix' in result)) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({ District: 'DCC', Vol: 2.04 });
    }
  });

  it('processes matrix rows without schema', async () => {
    const processor = new SpreadsheetProcessor({
      headerRows: 1,
      condensed: false,
      matrix: true,
    });
    vi.spyOn(processor['reader'], 'readRawWithMerges').mockResolvedValue({
      rows: [
        ['District', 'Vol'],
        ['DCC', 2.04],
        ['DMH', 1.87],
      ],
      merges: [],
    });
    const result = await processor.load(mockFile);
    expect(result.success).toBe(true);
    if (result.success && 'matrix' in result && result.matrix) {
      expect(result.data['DCC']).toHaveLength(1);
      expect(result.data['DCC'][0]).toEqual({ Vol: 2.04 });
      expect(result.data['DMH'][0]).toEqual({ Vol: 1.87 });
    }
  });

  it('validates rows against schema in flat mode', async () => {
    const schema = z.object({
      District: z.string().min(1),
      Vol: z.number(),
    });
    const processor = new SpreadsheetProcessor({ headerRows: 1, condensed: false }, schema);
    vi.spyOn(processor['reader'], 'readRawWithMerges').mockResolvedValue({
      rows: [
        ['District', 'Vol'],
        ['DCC', 2.04],
      ],
      merges: [],
    });
    const result = await processor.load(mockFile);
    expect(result.success).toBe(true);
    if (result.success && !('matrix' in result)) {
      expect(result.data[0].District).toBe('DCC');
      expect(result.data[0].Vol).toBe(2.04);
    }
  });

  it('returns failure when schema validation fails', async () => {
    const schema = z.object({
      District: z.string().min(1),
      Vol: z.number().positive(),
    });
    const processor = new SpreadsheetProcessor({ headerRows: 1, condensed: false }, schema);
    vi.spyOn(processor['reader'], 'readRawWithMerges').mockResolvedValue({
      rows: [
        ['District', 'Vol'],
        ['DCC', -1],
      ],
      merges: [],
    });
    const result = await processor.load(mockFile);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Row 2');
    }
  });

  // ---------------------------------------------------------------------------
  // SpreadsheetProcessor — matrix mode with schema validation
  // ---------------------------------------------------------------------------
  describe('SpreadsheetProcessor (matrix mode with schema)', () => {
    const mockFile = new File(['dummy'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('validates rows against schema in matrix mode', async () => {
      const schema = z.object({
        Vol: z.number(),
      });
      const processor = new SpreadsheetProcessor(
        { headerRows: 1, condensed: false, matrix: true },
        schema,
      );
      vi.spyOn(processor['reader'], 'readRawWithMerges').mockResolvedValue({
        rows: [
          ['District', 'Vol'],
          ['DCC', 2.04],
          ['DMH', 1.87],
        ],
        merges: [],
      });
      const result = await processor.load(mockFile);
      expect(result.success).toBe(true);
      if (result.success && 'matrix' in result && result.matrix) {
        expect(result.data['DCC']).toHaveLength(1);
        expect(result.data['DCC'][0]).toEqual({ Vol: 2.04 });
        expect(result.data['DMH'][0]).toEqual({ Vol: 1.87 });
      }
    });

    it('returns failure when schema validation fails in matrix mode', async () => {
      const schema = z.object({
        District: z.string().min(1),
        Vol: z.number().positive(),
      });
      const processor = new SpreadsheetProcessor(
        { headerRows: 1, condensed: false, matrix: true },
        schema,
      );
      vi.spyOn(processor['reader'], 'readRawWithMerges').mockResolvedValue({
        rows: [
          ['District', 'Vol'],
          ['DCC', -1],
          ['DMH', 1.87],
        ],
        merges: [],
      });
      const result = await processor.load(mockFile);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('[DCC]');
        expect(result.errors[0]).toContain('Row 2');
      }
    });

    it('collects errors from multiple matrix groups', async () => {
      const schema = z.object({
        District: z.string().min(1),
        Vol: z.number().positive(),
      });
      const processor = new SpreadsheetProcessor(
        { headerRows: 1, condensed: false, matrix: true },
        schema,
      );
      vi.spyOn(processor['reader'], 'readRawWithMerges').mockResolvedValue({
        rows: [
          ['District', 'Vol'],
          ['DCC', -1],
          ['DMH', -2],
        ],
        merges: [],
      });
      const result = await processor.load(mockFile);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBe(2);
        expect(result.errors[0]).toContain('[DCC]');
        expect(result.errors[1]).toContain('[DMH]');
      }
    });

    it('validates condensed matrix rows against schema', async () => {
      const schema = z.object({
        Group: z.object({
          SubA: z.string(),
          SubB: z.number(),
        }),
      });
      const processor = new SpreadsheetProcessor(
        {
          headerRows: 2,
          condensed: true,
          matrix: true,
          headerSeparator: ' - ',
        },
        schema,
      );
      vi.spyOn(processor['reader'], 'readRawWithMerges').mockResolvedValue({
        rows: [
          ['District', 'Group', 'Group'],
          ['', 'SubA', 'SubB'],
          ['DCC', 'val1', 42],
        ],
        merges: [{ startRow: 0, endRow: 0, startCol: 1, endCol: 2 }],
      });
      const result = await processor.load(mockFile);
      expect(result.success).toBe(true);
      if (result.success && 'matrix' in result && result.matrix) {
        expect(result.data['DCC']).toHaveLength(1);
        expect(result.data['DCC'][0]).toEqual({ Group: { SubA: 'val1', SubB: 42 } });
      }
    });
  });
});
