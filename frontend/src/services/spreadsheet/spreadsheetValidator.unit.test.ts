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

  describe('validateWorksheet', () => {
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

    it('skips sub-column header validation when header field is undefined', () => {
      const config: MatrixConfig = {
        ...interiorConfig,
        groups: [
          {
            label: 'Dry belt',
            colStart: 2,
            colEnd: 5,
            subColumns: [
              { key: 'avoidableSawlog' }, // no header → skip validation
              { key: 'avoidableGradeY4', header: 'Avoidable Grade Y/4' },
              { key: 'unavoidable', header: 'Unavoidable' },
              { key: 'total' }, // no header → skip validation
            ],
          },
        ],
      };
      const ws = buildWorksheet(
        [
          ['District', 'Dry Belt', null, null, null],
          [null, '', 'Avoidable Grade Y/4', 'Unavoidable', ''],
          ['DCC', 1, 2, 3, 6],
        ],
        ['B1:E1'],
      );

      const result = validator.validateWorksheet(ws, config);
      // Only 2 sub-columns have headers; the missing headers for columns 2 and 5 are skipped
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('trims whitespace from cell values when comparing headers', () => {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Interior');
      ws.addRow(['District', '  Dry Belt  ', null, null, null]);
      ws.addRow([null, 'Avoidable Sawlog', 'Avoidable Grade Y/4', 'Unavoidable', 'Total']);
      ws.addRow(['DCC', 1, 2, 3, 6]);
      ws.mergeCells('B1:E1');

      const result = validator.validateWorksheet(ws, interiorConfig);
      expect(result.valid).toBe(true);
    });
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

    it('walks up trailing empty rows to find heli multiplier (covers heliRow-- decrement)', () => {
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
      const row4 = [
        // Summary row WITH heli value in col 12 — this is the real data row
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
      // Row 5: trailing empty row (simulates template formatting leftovers)
      // No district value — forces the while loop to decrement heliRow
      const row5 = [null, null, null, null, null, null, null, null, null, null, null, null];
      ws.addRow(row1);
      ws.addRow(row2);
      ws.addRow(row3);
      ws.addRow(row4);
      ws.addRow(row5);

      const result = validator.validateStructure(ws, coastMatrixConfig);
      expect(result.errors.filter((e) => e.includes('Heli'))).toHaveLength(0);
      expect(result.valid).toBe(true);
    });

    it('reports error when heli multiplier row has empty district after walking up', () => {
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
      const row4 = [null, null, null, null, null, null, null, null, null, null, null, null];
      ws.addRow(row1);
      ws.addRow(row2);
      ws.addRow(row3);
      ws.addRow(row4);

      const result = validator.validateStructure(ws, coastMatrixConfig);
      expect(result.errors.some((e) => e.includes('Heli Multiplier'))).toBe(true);
    });

    it('handles integer zero values as valid numbers', () => {
      const ws = buildWorksheet(
        [
          ['District', 'Dry Belt', null, null, null],
          [null, 'Avoidable Sawlog', 'Avoidable Grade Y/4', 'Unavoidable', 'Total'],
          ['DCC', 0, 7.05, 0.08, 7.13],
        ],
        ['B1:E1'],
      );

      const result = validator.validateStructure(ws, interiorConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('reports missing value with correct district context in error message', () => {
      const ws = buildWorksheet(
        [
          ['District', 'Dry Belt', null, null, null],
          [null, 'Avoidable Sawlog', 'Avoidable Grade Y/4', 'Unavoidable', 'Total'],
          ['DCC', 2.04, null, 0.08, 9.17],
        ],
        ['B1:E1'],
      );

      const result = validator.validateStructure(ws, interiorConfig);
      expect(result.errors[0]).toContain('district "DCC"');
    });

    it('skips data columns that extend beyond maxCol (defensive guard at colIdx > maxCol)', () => {
      // maxCol = group.colEnd = 3. Third sub-column has colIdx=4 > maxCol → continue.
      // This is a defensive guard: if more sub-columns are defined than fit within colEnd,
      // the extra columns are skipped rather than raising an error.
      const narrowConfig: MatrixConfig = {
        sheetName: 'Test',
        headerRows: 1,
        groupHeaderRow: 1,
        columnHeaderRow: 1,
        dataStartRow: 2,
        districtCol: 1,
        districtKey: 'district',
        groupOutputKey: 'zone',
        groups: [
          {
            label: 'Narrow',
            colStart: 2,
            colEnd: 3,
            subColumns: [
              { key: 'col1', header: 'Col 1' },
              { key: 'col2', header: 'Col 2' },
              { key: 'col3', header: 'Col 3' }, // colIdx=4 > maxCol=3 → skipped
            ],
          },
        ],
      };
      const ws = buildWorksheet([
        ['District', 'Col 1', 'Col 2', 'Col 3'],
        ['DCC', 1, 2, 3],
      ]);

      const result = validator.validateStructure(ws, narrowConfig);
      // Only col1 and col2 are checked (col3 is skipped via continue)
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('reports non-numeric value with correct district and group context in error message', () => {
      const ws = buildWorksheet(
        [
          ['District', 'Dry Belt', null, null, null],
          [null, 'Avoidable Sawlog', 'Avoidable Grade Y/4', 'Unavoidable', 'Total'],
          ['DCC', 'N/A', 7.05, 0.08, 9.17],
        ],
        ['B1:E1'],
      );

      const result = validator.validateStructure(ws, interiorConfig);
      expect(result.errors[0]).toContain('district "DCC"');
      expect(result.errors[0]).toContain('Dry belt');
    });
  });
});
