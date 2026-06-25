import ExcelJS from 'exceljs';
import { describe, it, expect } from 'vitest';

import { coastValidator } from './coastValidator';
import { buildXlsxFile } from './testHelper';

describe('coastValidator', () => {
  it('returns empty errors for a valid coast spreadsheet', async () => {
    const file = await buildXlsxFile('Coast', 
      [
        ['District', 'Mature', null, null, null, null, 'Immature', null, null, null, null],
        [
          null,
          'Avoidable Sawlog Full Rate (m3/ha)',
          'Avoidable 0.25 (m3/ha)',
          'Avoidable Grade Y (m3/ha)',
          'Unavoidable Grade Y (m3/ha)',
          'Total All Grades All Class (m3/ha)',
          'Avoidable Sawlog Full Rate (m3/ha)',
          'Avoidable 0.25 (m3/ha)',
          'Avoidable Grade Y (m3/ha)',
          'Unavoidable Grade Y (m3/ha)',
          'Total All Grades All Class (m3/ha)',
        ],
        ['DCK', 16.19, 8.87, 5.24, 1.18, 31.48, 17.83, 9.77, 3.87, 1.3, 32.77, 3.47],
      ],
      ['B1:F1', 'G1:K1'],
    );

    const errors = await coastValidator(file);
    expect(errors).toHaveLength(0);
  });

  it('returns error for wrong sheet name', async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('WrongCoast').addRow(['x']);
    const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
    const file = new File([buffer], 'bad.xlsx');

    const errors = await coastValidator(file);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('does not contain a sheet named "Coast"');
  });

  it('returns errors for missing headers', async () => {
    const file = await buildXlsxFile('Coast', [['District'], [null], ['DCK', 1]]);

    const errors = await coastValidator(file);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('returns error for invalid district code format', async () => {
    const file = await buildXlsxFile('Coast', 
      [
        ['District', 'Mature', null, null, null, null, 'Immature', null, null, null, null, null],
        [
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
        ],
        ['DCKK', 16.19, 8.87, 5.24, 1.18, 31.48, 17.83, 9.77, 3.87, 1.3, 32.77],
        [
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
        ],
      ],
      ['B1:F1', 'G1:K1'],
    );

    const errors = await coastValidator(file);
    expect(errors.some((e) => e.includes('Invalid district code'))).toBe(true);
  });

  it('returns error for duplicate district codes', async () => {
    const file = await buildXlsxFile('Coast', 
      [
        ['District', 'Mature', null, null, null, null, 'Immature', null, null, null, null, null],
        [
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
        ],
        ['DCK', 16.19, 8.87, 5.24, 1.18, 31.48, 17.83, 9.77, 3.87, 1.3, 32.77],
        ['DCK', 38.12, 22.54, 15.01, 6.24, 81.91, 24.29, 14.36, 2.75, 1.92, 43.32],
        [
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
        ],
      ],
      ['B1:F1', 'G1:K1'],
    );

    const errors = await coastValidator(file);
    expect(errors.some((e) => e.includes('Duplicate district code "DCK"'))).toBe(true);
  });

  it('returns error when heli multiplier is missing', async () => {
    const file = await buildXlsxFile('Coast', 
      [
        ['District', 'Mature', null, null, null, null, 'Immature', null, null, null, null],
        [
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
        ],
        ['DCK', 16.19, 8.87, 5.24, 1.18, 31.48, 17.83, 9.77, 3.87, 1.3, 32.77],
        [
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
        ],
      ],
      ['B1:F1', 'G1:K1'],
    );

    const errors = await coastValidator(file);
    expect(errors.some((e) => e.includes('Heli Multiplier'))).toBe(true);
  });

  it('does not flag summary row as invalid district code', async () => {
    const file = await buildXlsxFile('Coast', 
      [
        ['District', 'Mature', null, null, null, null, 'Immature', null, null, null, null, null],
        [
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
        ],
        ['DCK', 16.19, 8.87, 5.24, 1.18, 31.48, 17.83, 9.77, 3.87, 1.3, 32.77],
        [
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
        ],
      ],
      ['B1:F1', 'G1:K1'],
    );

    const errors = await coastValidator(file);
    expect(errors.some((e) => e.includes('Invalid district code'))).toBe(false);
  });

  it('returns error when column count is insufficient', async () => {
    const file = await buildXlsxFile('Coast', 
      [
        ['District', 'Mature', null, null, null, null],
        [
          null,
          'Avoidable Sawlog Full Rate',
          'Avoidable 0.25',
          'Avoidable Grade Y',
          'Unavoidable Grade Y',
          'Total',
        ],
        ['DCK', 16.19, 8.87, 5.24, 1.18, 31.48],
        ['Weighted Coast District Average', 42.03, 20.64, 13.32, 6.3, 82.28, 3.47],
      ],
      ['B1:F1'],
    );

    const errors = await coastValidator(file);
    expect(errors.some((e) => e.includes('column'))).toBe(true);
  });
});
