import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';

import { coastValidator } from './coastValidator';

async function buildXlsxFile(rows: unknown[][], mergeCells?: string[]): Promise<File> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Coast');
  for (const row of rows) {
    ws.addRow(row);
  }
  if (mergeCells) {
    for (const range of mergeCells) {
      ws.mergeCells(range);
    }
  }
  const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  return new File([buffer], 'coast.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

describe('coastValidator', () => {
  it('returns empty errors for a valid coast spreadsheet', async () => {
    const file = await buildXlsxFile(
      [
        ['District', 'Mature', null, null, null, null, 'Immature', null, null, null, null],
        [null, 'Avoidable Sawlog Full Rate (m3/ha)', 'Avoidable 0.25 (m3/ha)', 'Avoidable Grade Y (m3/ha)', 'Unavoidable Grade Y (m3/ha)', 'Total All Grades All Class (m3/ha)', 'Avoidable Sawlog Full Rate (m3/ha)', 'Avoidable 0.25 (m3/ha)', 'Avoidable Grade Y (m3/ha)', 'Unavoidable Grade Y (m3/ha)', 'Total All Grades All Class (m3/ha)'],
        ['DCK', 16.19, 8.87, 5.24, 1.18, 31.48, 17.83, 9.77, 3.87, 1.3, 32.77],
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
    const file = await buildXlsxFile(
      [['District'], [null], ['DCK', 1]],
    );

    const errors = await coastValidator(file);
    expect(errors.length).toBeGreaterThan(0);
  });
});
