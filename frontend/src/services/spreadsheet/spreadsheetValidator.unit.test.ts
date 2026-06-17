import ExcelJS from 'exceljs';
import { describe, it, expect, beforeEach } from 'vitest';

import { SpreadsheetValidator } from './spreadsheetValidator';

import type { MatrixConfig } from './types';

function buildWorksheet(rows: unknown[][], mergeCells?: string[]): ExcelJS.Worksheet {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Interior');
  for (const row of rows) {
    ws.addRow(row);
  }
  if (mergeCells) {
    for (const range of mergeCells) {
      ws.mergeCells(range);
    }
  }
  return ws;
}

const interiorConfig: MatrixConfig = {
  sheetName: 'Interior',
  headerRows: 2,
  groupHeaderRow: 1,
  columnHeaderRow: 2,
  dataStartRow: 3,
  districtCol: 1,
  districtKey: 'district',
  groupOutputKey: 'zone',
  groups: [
    {
      label: 'Dry belt',
      colStart: 2,
      colEnd: 5,
      subColumns: [
        { header: 'Avoidable Sawlog', key: 'avoidableSawlog' },
        { header: 'Avoidable Grade Y/4', key: 'avoidableGradeY4' },
        { header: 'Unavoidable', key: 'unavoidable' },
        { header: 'Total', key: 'total' },
      ],
    },
  ],
};

describe('SpreadsheetValidator', () => {
  let validator: SpreadsheetValidator;

  beforeEach(() => {
    validator = new SpreadsheetValidator();
  });

  it('returns valid when worksheet matches config', () => {
    const ws = buildWorksheet(
      [
        ['District', 'Dry Belt', null, null, null],
        [null, 'Avoidable Sawlog', 'Avoidable Grade Y/4', 'Unavoidable', 'Total'],
        ['DCC', 1, 2, 3, 6],
      ],
      ['B1:E1'],
    );

    const result = validator.validateWorksheet(ws, interiorConfig);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns error when worksheet has no data rows', () => {
    const ws = buildWorksheet(
      [
        ['District', 'Dry Belt', null, null, null],
        [null, 'Avoidable Sawlog', 'Avoidable Grade Y/4', 'Unavoidable', 'Total'],
      ],
      ['B1:E1'],
    );

    const result = validator.validateWorksheet(ws, { ...interiorConfig, dataStartRow: 3 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('no data rows');
  });

  it('returns error when group header is missing', () => {
    const ws = buildWorksheet(
      [
        ['District', null, null, null, null],
        [null, 'Avoidable Sawlog', 'Avoidable Grade Y/4', 'Unavoidable', 'Total'],
        ['DCC', 1, 2, 3, 6],
      ],
      ['B1:E1'],
    );

    const result = validator.validateWorksheet(ws, interiorConfig);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Missing group header'))).toBe(true);
  });

  it('returns error when sub-column header is missing', () => {
    const ws = buildWorksheet(
      [
        ['District', 'Dry Belt', null, null, null],
        [null, null, 'Avoidable Grade Y/4', 'Unavoidable', 'Total'],
        ['DCC', 1, 2, 3, 6],
      ],
      ['B1:E1'],
    );

    const result = validator.validateWorksheet(ws, interiorConfig);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Missing column header'))).toBe(true);
  });

  it('collects multiple errors when multiple headers are missing', () => {
    const ws = buildWorksheet([
      ['District', null],
      [null, null],
      ['DCC', 1],
    ]);

    const result = validator.validateWorksheet(ws, interiorConfig);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  describe('validateStructure', () => {
    it('passes for a valid interior worksheet', () => {
      const ws = buildWorksheet(
        [
          ['District', 'Dry Belt', null, null, null],
          [null, 'Avoidable Sawlog', 'Avoidable Grade Y/4', 'Unavoidable', 'Total'],
          ['DCC', 2.04, 7.05, 0.08, 9.17],
        ],
        ['B1:E1'],
      );

      const result = validator.validateStructure(ws, interiorConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('reports missing numeric values', () => {
      const ws = buildWorksheet(
        [
          ['District', 'Dry Belt', null, null, null],
          [null, 'Avoidable Sawlog', 'Avoidable Grade Y/4', 'Unavoidable', 'Total'],
          ['DCC', 2.04, null, 0.08, 9.17],
        ],
        ['B1:E1'],
      );

      const result = validator.validateStructure(ws, interiorConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Missing value'))).toBe(true);
    });

    it('reports non-numeric values', () => {
      const ws = buildWorksheet(
        [
          ['District', 'Dry Belt', null, null, null],
          [null, 'Avoidable Sawlog', 'Avoidable Grade Y/4', 'Unavoidable', 'Total'],
          ['DCC', 'abc', 7.05, 0.08, 9.17],
        ],
        ['B1:E1'],
      );

      const result = validator.validateStructure(ws, interiorConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Non-numeric'))).toBe(true);
    });

    it('fails when worksheet has no data rows', () => {
      const ws = buildWorksheet(
        [
          ['District', 'Dry Belt', null, null, null],
          [null, 'Avoidable Sawlog', 'Avoidable Grade Y/4', 'Unavoidable', 'Total'],
        ],
        ['B1:E1'],
      );

      const result = validator.validateStructure(ws, interiorConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('no data rows'))).toBe(true);
    });

    it('skips rows with empty district code', () => {
      const ws = buildWorksheet(
        [
          ['District', 'Dry Belt', null, null, null],
          [null, 'Avoidable Sawlog', 'Avoidable Grade Y/4', 'Unavoidable', 'Total'],
          ['', 1.0, 2.0, 3.0, 6.0],
          ['DCC', 2.04, 7.05, 0.08, 9.17],
        ],
        ['B1:E1'],
      );

      const result = validator.validateStructure(ws, interiorConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
