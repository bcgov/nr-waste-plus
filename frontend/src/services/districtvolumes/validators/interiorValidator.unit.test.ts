import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';

import { interiorValidator } from './interiorValidator';

async function buildXlsxFile(rows: unknown[][], mergeCells?: string[]): Promise<File> {
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
  const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  return new File([buffer], 'interior.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

describe('interiorValidator', () => {
  it('returns empty errors for a valid interior spreadsheet', async () => {
    const file = await buildXlsxFile(
      [
        ['District', 'Dry Belt m3/ha', null, null, null, 'Transition Zone m3/ha', null, null, null, 'Wet Belt m3/ha', null, null, null],
        [null, 'Avoidable Sawlog   Waste m3/Ha', 'Avoidable Grade Y/4 Waste m3/Ha', ' Unavoidable  m3/ha', 'Total Avoidable \nSawlog, Grade 4 \n+ Unavoidable \nWaste m3/Ha', 'Avoidable Sawlog   Waste m3/Ha', 'Avoidable Grade Y/4 Waste m3/Ha', ' Unavoidable  m3/ha', 'Total Avoidable \nSawlog, Grade 4 \n+ Unavoidable \nWaste m3/Ha', 'Avoidable Sawlog   Waste m3/Ha', 'Avoidable Grade Y/4 Waste m3/Ha', ' Unavoidable  m3/ha', 'Total Avoidable \nSawlog, Grade 4 \n+ Unavoidable \nWaste m3/Ha'],
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
    const file = await buildXlsxFile(
      [
        ['District'],
        [null],
        ['DCC', 1],
      ],
    );

    const errors = await interiorValidator(file);
    expect(errors.length).toBeGreaterThan(0);
  });
});
