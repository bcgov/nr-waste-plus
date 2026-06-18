import ExcelJS from 'exceljs';
import { describe, it, expect, beforeEach } from 'vitest';

import { ExcelReader } from './excelReader';
import { ExcelReadError } from './types';

async function buildWorkbookBuffer(
  sheets: { name: string; rows: unknown[][] }[],
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name);
    for (const row of sheet.rows) {
      ws.addRow(row);
    }
  }
  const buffer = await wb.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

function bufferToFile(buffer: ArrayBuffer, name = 'test.xlsx'): File {
  return new File([buffer], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('ExcelReader', () => {
  let reader: ExcelReader;

  beforeEach(() => {
    reader = new ExcelReader();
  });

  describe('read', () => {
    it('returns first worksheet when no sheet name given', async () => {
      const buffer = await buildWorkbookBuffer([
        {
          name: 'Sheet1',
          rows: [
            [1, 2],
            [3, 4],
          ],
        },
      ]);
      const file = bufferToFile(buffer);
      const ws = await reader.read(file);
      expect(ws.name).toBe('Sheet1');
    });

    it('returns specified worksheet when sheet name given', async () => {
      const buffer = await buildWorkbookBuffer([
        { name: 'Alpha', rows: [['a']] },
        { name: 'Beta', rows: [['b']] },
      ]);
      const file = bufferToFile(buffer);
      const ws = await reader.read(file, 'Beta');
      expect(ws.name).toBe('Beta');
    });

    it('throws ExcelReadError when requested sheet does not exist', async () => {
      const buffer = await buildWorkbookBuffer([{ name: 'Sheet1', rows: [['x']] }]);
      const file = bufferToFile(buffer);
      await expect(reader.read(file, 'NonExistent')).rejects.toThrow(ExcelReadError);
    });

    it('throws ExcelReadError when workbook fails to load (corrupt data)', async () => {
      const corrupt = new ArrayBuffer(4);
      const file = new File([corrupt], 'bad.xlsx');
      await expect(reader.read(file)).rejects.toThrow(ExcelReadError);
    });

    it('throws ExcelReadError when file.arrayBuffer fails', async () => {
      const badFile = new File([], 'broken.xlsx');
      Object.defineProperty(badFile, 'arrayBuffer', {
        value: () => Promise.reject(new Error('read error')),
      });
      await expect(reader.read(badFile)).rejects.toThrow(ExcelReadError);
    });

    it('throws ExcelReadError when workbook has no worksheets', async () => {
      const emptyWb = new ExcelJS.Workbook();
      const buffer = (await emptyWb.xlsx.writeBuffer()) as ArrayBuffer;
      const file = new File([buffer], 'empty.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      await expect(reader.read(file)).rejects.toThrow(ExcelReadError);
      await expect(reader.read(file)).rejects.toThrow('No worksheets found');
    });
  });

  describe('listSheets', () => {
    it('returns all sheet names', async () => {
      const buffer = await buildWorkbookBuffer([
        { name: 'Alpha', rows: [] },
        { name: 'Beta', rows: [] },
      ]);
      const file = bufferToFile(buffer);
      const names = await reader.listSheets(file);
      expect(names).toEqual(['Alpha', 'Beta']);
    });
  });
});
