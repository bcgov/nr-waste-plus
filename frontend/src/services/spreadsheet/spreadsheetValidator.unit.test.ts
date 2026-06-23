import ExcelJS from 'exceljs';
import { describe, it, expect, beforeEach } from 'vitest';

import { SpreadsheetValidator } from './spreadsheetValidator';

import type { MatrixConfig } from './types';

import { coastMatrixConfig } from '@/services/districtvolumes/config/coastMatrixConfig';
import { interiorMatrixConfig } from '@/services/districtvolumes/config/interiorMatrixConfig';

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

    it('returns error when worksheet has fewer columns than required', () => {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Interior');
      // Interior config needs max col 13 (M). Create worksheet with only 8 columns.
      ws.addRow(['District', 'Dry Belt', null, null, null, null, null, null]);
      ws.addRow([
        null,
        'Avoidable Sawlog',
        'Avoidable Grade Y/4',
        'Unavoidable',
        'Total',
        'Avoidable Sawlog',
        'Avoidable Grade Y/4',
        'Unavoidable',
      ]);
      ws.addRow(['DCC', 2.04, 7.05, 0.08, 9.17, 7.96, 12.93, 0.13]);

      const result = validator.validateStructure(ws, interiorMatrixConfig);
      expect(result.errors.some((e) => e.includes('column'))).toBe(true);
    });

    it('returns error when heli multiplier is missing', () => {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Coast');
      // Coast config needs heliMultiplierCol: 12
      const row1 = [
        'District',
        'Mature',
        null,
        null,
        null,
        null,
        'Immature',
        null,
        null,
        null,
        null,
      ];
      const row2 = [
        null,
        'Avoidable Sawlog Full Rate',
        'Avoidable 0.25',
        'Avoidable Grade Y',
        'Unavoidable Grade Y',
        'Total',
        'Avoidable Sawlog Full Rate',
        'Avoidable 0.25',
        'Avoidable Grade Y',
        'Unavoidable Grade Y',
        'Total',
      ];
      const row3 = ['DCK', 16.19, 8.87, 5.24, 1.18, 31.48, 17.83, 9.77, 3.87, 1.3, 32.77];
      // Summary row without heli value in col L (column 12)
      const row4 = [
        'Weighted Coast District Average',
        42.03,
        20.64,
        13.32,
        6.3,
        82.28,
        27.23,
        13.37,
        3.25,
        3.77,
        47.62,
      ];
      ws.addRow(row1);
      ws.addRow(row2);
      ws.addRow(row3);
      ws.addRow(row4);

      const result = validator.validateStructure(ws, coastMatrixConfig);
      expect(result.errors.some((e) => e.includes('Heli Multiplier'))).toBe(true);
    });

    it('passes when heli multiplier is present', () => {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Coast');
      const row1 = [
        'District',
        'Mature',
        null,
        null,
        null,
        null,
        'Immature',
        null,
        null,
        null,
        null,
      ];
      const row2 = [
        null,
        'Avoidable Sawlog Full Rate',
        'Avoidable 0.25',
        'Avoidable Grade Y',
        'Unavoidable Grade Y',
        'Total',
        'Avoidable Sawlog Full Rate',
        'Avoidable 0.25',
        'Avoidable Grade Y',
        'Unavoidable Grade Y',
        'Total',
      ];
      const row3 = ['DCK', 16.19, 8.87, 5.24, 1.18, 31.48, 17.83, 9.77, 3.87, 1.3, 32.77];
      // Summary row WITH heli value in col L
      const row4 = [
        'Weighted Coast District Average',
        42.03,
        20.64,
        13.32,
        6.3,
        82.28,
        27.23,
        13.37,
        3.25,
        3.77,
        47.62,
        3.47,
      ];
      ws.addRow(row1);
      ws.addRow(row2);
      ws.addRow(row3);
      ws.addRow(row4);

      const result = validator.validateStructure(ws, coastMatrixConfig);
      expect(result.errors.filter((e) => e.includes('Heli'))).toHaveLength(0);
    });
  });
});
