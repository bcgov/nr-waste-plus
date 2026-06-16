import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ExcelReader } from '@/services/excelReader/excelReader';

import { createSpreadsheetValidator } from './workbookValidator';

const mockFile = new File(['dummy'], 'test.xlsx', {
  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
});

describe('createSpreadsheetValidator', () => {
  const validator = createSpreadsheetValidator();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ---- happy paths ----

  it('passes valid interior workbook', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockResolvedValue(['Interior']);
    vi.spyOn(ExcelReader.prototype, 'readRaw').mockResolvedValue([
      ['District', 'Dry Belt m3/ha', 'Transition Zone m3/ha', 'Wet Belt m3/ha'],
    ]);
    const errors = await validator(mockFile);
    expect(errors).toHaveLength(0);
  });

  it('passes valid coast workbook', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockResolvedValue(['Coast']);
    vi.spyOn(ExcelReader.prototype, 'readRaw').mockResolvedValue([
      ['District', 'Mature', 'Immature', 'Heli Mulitplier'],
    ]);
    const errors = await validator(mockFile);
    expect(errors).toHaveLength(0);
  });

  it('passes when header starts with expected text', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockResolvedValue(['Interior']);
    vi.spyOn(ExcelReader.prototype, 'readRaw').mockResolvedValue([
      [
        'District',
        'Dry Belt m3/ha - with suffix',
        'Transition Zone m3/ha - also ok',
        'Wet Belt m3/ha - trailing',
      ],
    ]);
    const errors = await validator(mockFile);
    expect(errors).toHaveLength(0);
  });

  // ---- identification failures ----

  it('fails for unrecognized workbook', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockResolvedValue(['Random']);
    vi.spyOn(ExcelReader.prototype, 'readRaw').mockResolvedValue([['A', 'B']]);
    const errors = await validator(mockFile);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when identifySpreadsheet throws a non-Error', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockRejectedValue('string error');
    const errors = await validator(mockFile);
    expect(errors.some((e) => e.includes('string error'))).toBe(true);
  });

  // ---- sheet structure failures ----

  it('reports missing column in interior sheet', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockResolvedValue(['Interior']);
    vi.spyOn(ExcelReader.prototype, 'readRaw').mockResolvedValue([
      ['District', 'Something Else'],
    ]);
    const errors = await validator(mockFile);
    expect(errors.some((e) => e.includes('Dry Belt m3/ha'))).toBe(true);
  });

  it('reports missing column in coast sheet', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockResolvedValue(['Coast']);
    vi.spyOn(ExcelReader.prototype, 'readRaw').mockResolvedValue([
      ['District', 'Something Else'],
    ]);
    const errors = await validator(mockFile);
    expect(errors.some((e) => e.includes('Mature'))).toBe(true);
  });

  it('reports empty sheet', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockResolvedValue(['Interior']);
    vi.spyOn(ExcelReader.prototype, 'readRaw').mockResolvedValue([]);
    const errors = await validator(mockFile);
    expect(errors.some((e) => e.includes('empty'))).toBe(true);
  });

  it('reports error when readRaw fails for the target sheet', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockResolvedValue(['Interior']);
    vi.spyOn(ExcelReader.prototype, 'readRaw').mockRejectedValue(
      new Error('read failed'),
    );
    const errors = await validator(mockFile);
    expect(errors.some((e) => e.includes('read failed'))).toBe(true);
  });

  it('handles non-Error thrown by readRaw', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockResolvedValue(['Interior']);
    vi.spyOn(ExcelReader.prototype, 'readRaw').mockRejectedValue(
      'string error from readRaw',
    );
    const errors = await validator(mockFile);
    expect(errors.some((e) => e.includes('string error from readRaw'))).toBe(true);
  });

  it('fails for unreadable file at top level', async () => {
    vi.spyOn(ExcelReader.prototype, 'listSheets').mockRejectedValue(
      new Error('Corrupt'),
    );
    const errors = await validator(mockFile);
    expect(errors.length).toBeGreaterThan(0);
  });
});
