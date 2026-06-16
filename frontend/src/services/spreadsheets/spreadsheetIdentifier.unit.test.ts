import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ExcelReader } from '@/services/excelReader/excelReader';

import { identifySpreadsheet } from './spreadsheetIdentifier';

const mockFile = new File(['dummy'], 'test.xlsx', {
  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
});

describe('identifySpreadsheet', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('identifies interior by sheet name', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockResolvedValue(['Interior']);
    await expect(identifySpreadsheet(mockFile)).resolves.toBe('interior');
  });

  it('identifies coast by sheet name', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockResolvedValue(['Coast']);
    await expect(identifySpreadsheet(mockFile)).resolves.toBe('coast');
  });

  it('prefers interior when both sheets exist', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockResolvedValue([
      'Interior',
      'Coast',
    ]);
    await expect(identifySpreadsheet(mockFile)).resolves.toBe('interior');
  });

  it('trims whitespace from sheet names', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockResolvedValue([
      '  Interior  ',
    ]);
    await expect(identifySpreadsheet(mockFile)).resolves.toBe('interior');
  });

  it('falls back to header markers for interior', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockResolvedValue(['Sheet1']);
    vi.spyOn(ExcelReader.prototype, 'readRaw').mockResolvedValue([
      ['District', 'Dry Belt m3/ha', 'Transition Zone m3/ha', 'Wet Belt m3/ha'],
    ]);
    await expect(identifySpreadsheet(mockFile)).resolves.toBe('interior');
  });

  it('falls back to header markers for coast', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockResolvedValue(['Sheet1']);
    vi.spyOn(ExcelReader.prototype, 'readRaw').mockResolvedValue([
      ['District', 'Mature', 'Immature', 'Heli Mulitplier'],
    ]);
    await expect(identifySpreadsheet(mockFile)).resolves.toBe('coast');
  });

  it('rejects unknown spreadsheet format', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockResolvedValue(['Random']);
    vi.spyOn(ExcelReader.prototype, 'readRaw').mockResolvedValue([
      ['Name', 'Value'],
    ]);
    await expect(identifySpreadsheet(mockFile)).rejects.toThrow(
      'Unrecognized spreadsheet format',
    );
  });

  it('rejects empty workbook', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockResolvedValue(['Sheet1']);
    vi.spyOn(ExcelReader.prototype, 'readRaw').mockResolvedValue([]);
    await expect(identifySpreadsheet(mockFile)).rejects.toThrow(
      'appears to be empty',
    );
  });

  it('handles first-row null cell values gracefully', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockResolvedValue(['Sheet1']);
    vi.spyOn(ExcelReader.prototype, 'readRaw').mockResolvedValue([
      [null, 'Dry Belt m3/ha', null],
    ]);
    await expect(identifySpreadsheet(mockFile)).resolves.toBe('interior');
  });

  it('rejects unreadable file', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockRejectedValue(
      new Error('Corrupt file'),
    );
    await expect(identifySpreadsheet(mockFile)).rejects.toThrow('Corrupt file');
  });

  it('rejects when listSheets throws a non-Error', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockRejectedValue('string error');
    await expect(identifySpreadsheet(mockFile)).rejects.toThrow('string error');
  });
});
