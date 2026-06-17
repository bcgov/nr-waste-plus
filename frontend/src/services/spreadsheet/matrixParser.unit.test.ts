import ExcelJS from 'exceljs';
import { describe, it, expect } from 'vitest';

import { MatrixParser } from './matrixParser';

import type { MatrixConfig } from './types';

function buildWorksheet(rows: unknown[][], mergeCells?: string[]): ExcelJS.Worksheet {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Test');
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

const interiorMatrixConfig: MatrixConfig = {
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
    {
      label: 'Transition zone',
      colStart: 6,
      colEnd: 9,
      subColumns: [
        { header: 'Avoidable Sawlog', key: 'avoidableSawlog' },
        { header: 'Avoidable Grade Y/4', key: 'avoidableGradeY4' },
        { header: 'Unavoidable', key: 'unavoidable' },
        { header: 'Total', key: 'total' },
      ],
    },
    {
      label: 'Wet belt',
      colStart: 10,
      colEnd: 13,
      subColumns: [
        { header: 'Avoidable Sawlog', key: 'avoidableSawlog' },
        { header: 'Avoidable Grade Y/4', key: 'avoidableGradeY4' },
        { header: 'Unavoidable', key: 'unavoidable' },
        { header: 'Total', key: 'total' },
      ],
    },
  ],
};

describe('MatrixParser', () => {
  let parser: MatrixParser;

  beforeEach(() => {
    parser = new MatrixParser();
  });

  describe('parse with interior config', () => {
    it('parses a single district into one record per zone', () => {
      const ws = buildWorksheet(
        [
          [
            'District',
            'Dry Belt m3/ha',
            null,
            null,
            null,
            'Transition Zone m3/ha',
            null,
            null,
            null,
            'Wet Belt m3/ha',
            null,
            null,
            null,
          ],
          [
            null,
            'Avoidable Sawlog',
            'Avoidable Grade Y/4',
            'Unavoidable',
            'Total',
            'Avoidable Sawlog',
            'Avoidable Grade Y/4',
            'Unavoidable',
            'Total',
            'Avoidable Sawlog',
            'Avoidable Grade Y/4',
            'Unavoidable',
            'Total',
          ],
          ['DCC', 2.04, 7.05, 0.08, 9.17, 7.96, 12.93, 0.13, 21.02, 13.5, 15.85, 0.1, 29.45],
        ],
        ['B1:E1', 'F1:I1', 'J1:M1'],
      );

      const result = parser.parse(ws, interiorMatrixConfig);

      expect(result.errors).toHaveLength(0);
      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toMatchObject({
        district: 'DCC',
        zone: 'Dry belt',
        avoidableSawlog: 2.04,
        avoidableGradeY4: 7.05,
        unavoidable: 0.08,
        total: 9.17,
      });
      expect(result.data[1]).toMatchObject({
        district: 'DCC',
        zone: 'Transition zone',
        avoidableSawlog: 7.96,
      });
      expect(result.data[2]).toMatchObject({
        district: 'DCC',
        zone: 'Wet belt',
        avoidableSawlog: 13.5,
      });
    });

    it('parses multiple districts', () => {
      const ws = buildWorksheet(
        [
          [
            'District',
            'Dry Belt m3/ha',
            null,
            null,
            null,
            'Transition Zone m3/ha',
            null,
            null,
            null,
            'Wet Belt m3/ha',
            null,
            null,
            null,
          ],
          [
            null,
            'Avoidable Sawlog',
            'Avoidable Grade Y/4',
            'Unavoidable',
            'Total',
            'Avoidable Sawlog',
            'Avoidable Grade Y/4',
            'Unavoidable',
            'Total',
            'Avoidable Sawlog',
            'Avoidable Grade Y/4',
            'Unavoidable',
            'Total',
          ],
          ['DCC', 2.0, 7.0, 0.1, 9.1, 8.0, 13.0, 0.1, 21.1, 13.5, 15.9, 0.1, 29.5],
          ['DCS', 9.1, 12.3, 0.4, 21.8, 16.6, 19.7, 1.2, 37.4, 18.7, 16.5, 2.0, 37.1],
        ],
        ['B1:E1', 'F1:I1', 'J1:M1'],
      );

      const result = parser.parse(ws, interiorMatrixConfig);

      expect(result.errors).toHaveLength(0);
      expect(result.data).toHaveLength(6); // 2 districts × 3 zones
    });

    it('skips rows with empty district code', () => {
      const ws = buildWorksheet(
        [
          ['District', 'Dry Belt', null, null, null],
          [null, 'Avoidable Sawlog', 'Avoidable Grade Y/4', 'Unavoidable', 'Total'],
          ['', 1.0, 2.0, 3.0, 6.0],
          ['DCC', 4.0, 5.0, 6.0, 15.0],
        ],
        ['B1:E1'],
      );

      const localConfig: MatrixConfig = {
        ...interiorMatrixConfig,
        groups: [interiorMatrixConfig.groups[0]],
      };

      const result = parser.parse(ws, localConfig);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].district).toBe('DCC');
    });

    it('handles null cell values gracefully', () => {
      const ws = buildWorksheet(
        [
          ['District', 'Dry Belt', null, null, null],
          [null, 'Avoidable Sawlog', 'Avoidable Grade Y/4', 'Unavoidable', 'Total'],
          ['DCC', null, 5.0, null, 5.0],
        ],
        ['B1:E1'],
      );

      const localConfig: MatrixConfig = {
        ...interiorMatrixConfig,
        groups: [interiorMatrixConfig.groups[0]],
      };

      const result = parser.parse(ws, localConfig);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].avoidableSawlog).toBeNull();
      expect(result.data[0].avoidableGradeY4).toBe(5.0);
    });

    it('returns empty data when sheet has only headers', () => {
      const ws = buildWorksheet(
        [
          ['District', 'Dry Belt', null, null, null],
          [null, 'Avoidable Sawlog', 'Avoidable Grade Y/4', 'Unavoidable', 'Total'],
        ],
        ['B1:E1'],
      );

      const localConfig: MatrixConfig = {
        ...interiorMatrixConfig,
        groups: [interiorMatrixConfig.groups[0]],
      };

      const result = parser.parse(ws, localConfig);

      expect(result.data).toHaveLength(0);
    });
  });

  describe('parse with coast config', () => {
    const coastConfig: MatrixConfig = {
      sheetName: 'Coast',
      headerRows: 2,
      groupHeaderRow: 1,
      columnHeaderRow: 2,
      dataStartRow: 3,
      districtCol: 1,
      districtKey: 'district',
      groupOutputKey: 'section',
      groups: [
        {
          label: 'Mature',
          colStart: 2,
          colEnd: 6,
          subColumns: [
            { header: 'Avoidable Sawlog Full Rate', key: 'avoidableSawlog' },
            { header: 'Avoidable 0.25', key: 'avoidable25' },
            { header: 'Avoidable Grade Y', key: 'avoidableGradeY' },
            { header: 'Unavoidable Grade Y', key: 'unavoidable' },
            { header: 'Total All Grades', key: 'total' },
          ],
        },
        {
          label: 'Immature',
          colStart: 7,
          colEnd: 11,
          subColumns: [
            { header: 'Avoidable Sawlog Full Rate', key: 'avoidableSawlog' },
            { header: 'Avoidable 0.25', key: 'avoidable25' },
            { header: 'Avoidable Grade Y', key: 'avoidableGradeY' },
            { header: 'Unavoidable Grade Y', key: 'unavoidable' },
            { header: 'Total All Grades', key: 'total' },
          ],
        },
      ],
    };

    it('parses coast format with mature and immature sections', () => {
      const ws = buildWorksheet(
        [
          ['District', 'Mature', null, null, null, null, 'Immature', null, null, null, null],
          [
            null,
            'Avoidable Sawlog Full Rate',
            'Avoidable 0.25',
            'Avoidable Grade Y',
            'Unavoidable Grade Y',
            'Total All Grades',
            'Avoidable Sawlog Full Rate',
            'Avoidable 0.25',
            'Avoidable Grade Y',
            'Unavoidable Grade Y',
            'Total All Grades',
          ],
          ['DCK', 16.19, 8.87, 5.24, 1.18, 31.48, 17.83, 9.77, 3.87, 1.3, 32.77],
        ],
        ['B1:F1', 'G1:K1'],
      );

      const result = parser.parse(ws, coastConfig);

      expect(result.errors).toHaveLength(0);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toMatchObject({
        district: 'DCK',
        section: 'Mature',
        avoidableSawlog: 16.19,
        total: 31.48,
      });
      expect(result.data[1]).toMatchObject({
        district: 'DCK',
        section: 'Immature',
        avoidableSawlog: 17.83,
        total: 32.77,
      });
    });
  });
});
