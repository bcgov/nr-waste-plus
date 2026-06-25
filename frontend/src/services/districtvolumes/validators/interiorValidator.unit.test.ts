import ExcelJS from 'exceljs';
import { describe, it, expect } from 'vitest';

import { interiorValidator } from './interiorValidator';
import { buildXlsxFile } from './testHelper';

describe('interiorValidator', () => {
  it('returns empty errors for a valid interior spreadsheet', async () => {
    const file = await buildXlsxFile('Interior', 
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
          'Avoidable Sawlog   Waste m3/Ha',
          'Avoidable Grade Y/4 Waste m3/Ha',
          ' Unavoidable  m3/ha',
          'Total Avoidable \nSawlog, Grade 4 \n+ Unavoidable \nWaste m3/Ha',
          'Avoidable Sawlog   Waste m3/Ha',
          'Avoidable Grade Y/4 Waste m3/Ha',
          ' Unavoidable  m3/ha',
          'Total Avoidable \nSawlog, Grade 4 \n+ Unavoidable \nWaste m3/Ha',
          'Avoidable Sawlog   Waste m3/Ha',
          'Avoidable Grade Y/4 Waste m3/Ha',
          ' Unavoidable  m3/ha',
          'Total Avoidable \nSawlog, Grade 4 \n+ Unavoidable \nWaste m3/Ha',
        ],
        ['DCC', 2.04, 7.05, 0.08, 9.17, 7.96, 12.93, 0.13, 21.02, 13.5, 15.85, 0.1, 29.45],
      ],
      ['B1:E1', 'F1:I1', 'J1:M1'],
    );

    const errors = await interiorValidator(file);
    expect(errors).toHaveLength(0);
  });

  it('returns error for wrong sheet name', async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('WrongSheet').addRow(['x']);
    const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
    const file = new File([buffer], 'bad.xlsx');

    const errors = await interiorValidator(file);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('does not contain a sheet named "Interior"');
  });

  it('returns errors for missing headers', async () => {
    const file = await buildXlsxFile('Interior', [['District'], [null], ['DCC', 1]]);

    const errors = await interiorValidator(file);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('returns error for invalid district code format', async () => {
    const file = await buildXlsxFile('Interior', 
      [
        [
          'District',
          'Dry Belt',
          null,
          null,
          null,
          'Transition Zone',
          null,
          null,
          null,
          'Wet Belt',
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
        ['DCCC', 2.04, 7.05, 0.08, 9.17, 7.96, 12.93, 0.13, 21.02, 13.5, 15.85, 0.1, 29.45],
      ],
      ['B1:E1', 'F1:I1', 'J1:M1'],
    );

    const errors = await interiorValidator(file);
    expect(errors.some((e) => e.includes('Invalid district code'))).toBe(true);
  });

  it('returns error for duplicate district codes', async () => {
    const file = await buildXlsxFile('Interior', 
      [
        [
          'District',
          'Dry Belt',
          null,
          null,
          null,
          'Transition Zone',
          null,
          null,
          null,
          'Wet Belt',
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
        ['DCC', 9.08, 12.34, 0.43, 21.84, 16.58, 19.71, 1.15, 37.44, 18.68, 16.49, 1.96, 37.13],
      ],
      ['B1:E1', 'F1:I1', 'J1:M1'],
    );

    const errors = await interiorValidator(file);
    expect(errors.some((e) => e.includes('Duplicate district code "DCC"'))).toBe(true);
  });

  it('does not flag summary row as invalid district code', async () => {
    const file = await buildXlsxFile('Interior', 
      [
        [
          'District',
          'Dry Belt',
          null,
          null,
          null,
          'Transition Zone',
          null,
          null,
          null,
          'Wet Belt',
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
        [
          ' Weighted Average (TOTAL)',
          5.56,
          8.1,
          0.17,
          13.83,
          12.22,
          17.27,
          0.35,
          29.84,
          16.06,
          18.79,
          0.65,
          35.51,
        ],
      ],
      ['B1:E1', 'F1:I1', 'J1:M1'],
    );

    const errors = await interiorValidator(file);
    expect(errors.some((e) => e.includes('Invalid district code'))).toBe(false);
    expect(errors.some((e) => e.includes('Weighted'))).toBe(false);
  });

  it('returns error when column count is insufficient', async () => {
    const file = await buildXlsxFile('Interior', 
      [
        ['District', 'Dry Belt', null, null, null],
        [null, 'Avoidable Sawlog', 'Avoidable Grade Y/4', 'Unavoidable', 'Total'],
        ['DCC', 2.04, 7.05, 0.08, 9.17],
      ],
      ['B1:E1'],
    );

    const errors = await interiorValidator(file);
    expect(errors.some((e) => e.includes('column'))).toBe(true);
  });
});
