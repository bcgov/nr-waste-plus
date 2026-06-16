import { Workbook } from 'exceljs';
import { describe, it, expect, vi } from 'vitest';

import { ExcelReader, ExcelReadError, type MergeRange, type RawSheet } from './excelReader';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createTestFile(workbook: Workbook, fileName = 'test.xlsx'): Promise<File> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  return new File([blob], fileName, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function createTestCsvFile(csvContent: string, fileName = 'test.csv'): File {
  const blob = new Blob([csvContent], { type: 'text/csv' });
  return new File([blob], fileName, { type: 'text/csv' });
}

async function workbookWithSheet(data: unknown[][], sheetName = 'Sheet1'): Promise<Workbook> {
  const wb = new Workbook();
  const ws = wb.addWorksheet(sheetName);
  data.forEach((row, r) => {
    row.forEach((cell, c) => {
      ws.getCell(r + 1, c + 1).value = cell as never;
    });
  });
  return wb;
}

function workbookWithMerges(
  sheetName: string,
  merges: { range: string; data: unknown[][] },
): Workbook {
  const wb = new Workbook();
  const ws = wb.addWorksheet(sheetName);
  merges.data.forEach((row, r) => {
    row.forEach((cell, c) => {
      ws.getCell(r + 1, c + 1).value = cell as never;
    });
  });
  for (const mergeStr of merges.range.split(';')) {
    const trimmed = mergeStr.trim();
    if (trimmed) {
      ws.mergeCells(trimmed);
    }
  }
  return wb;
}

// ---------------------------------------------------------------------------
// ExcelReadError
// ---------------------------------------------------------------------------

describe('ExcelReadError', () => {
  it('has the correct name', () => {
    expect(new ExcelReadError('msg').name).toBe('ExcelReadError');
  });

  it('is an instance of Error', () => {
    expect(new ExcelReadError('msg')).toBeInstanceOf(Error);
  });

  it('is an instance of ExcelReadError', () => {
    expect(new ExcelReadError('msg')).toBeInstanceOf(ExcelReadError);
  });

  it('preserves the message', () => {
    expect(new ExcelReadError('Custom message').message).toBe('Custom message');
  });

  it('supports empty message', () => {
    expect(new ExcelReadError('').message).toBe('');
  });

  it('has a stack trace', () => {
    expect(new ExcelReadError('msg').stack).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// ExcelReader — read()
// ---------------------------------------------------------------------------

describe('ExcelReader.read()', () => {
  const reader = new ExcelReader();

  it('returns one object per data row, keyed by header', async () => {
    const file = await createTestFile(
      await workbookWithSheet([
        ['District', 'Volume', 'Year'],
        ['Interior', '100', '2025'],
        ['Coast', '200', '2025'],
        ['North', '150', '2025'],
      ]),
    );

    const rows = await reader.read(file);

    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({ District: 'Interior', Volume: '100', Year: '2025' });
    expect(rows[2]).toEqual({ District: 'North', Volume: '150', Year: '2025' });
  });

  it('returns an empty array when the sheet has only a header row', async () => {
    const file = await createTestFile(await workbookWithSheet([['District', 'Volume', 'Year']]));
    await expect(reader.read(file)).resolves.toEqual([]);
  });

  it('reads the first sheet by default when no sheetName is given', async () => {
    const wb = new Workbook();
    const ws1 = wb.addWorksheet('First');
    ws1.getCell(1, 1).value = 'Name';
    ws1.getCell(1, 2).value = 'Age';
    ws1.getCell(2, 1).value = 'Alice';
    ws1.getCell(2, 2).value = 30;
    const ws2 = wb.addWorksheet('Second');
    ws2.getCell(1, 1).value = 'District';
    ws2.getCell(1, 2).value = 'Volume';
    ws2.getCell(2, 1).value = 'Interior';
    ws2.getCell(2, 2).value = 1000;
    const file = await createTestFile(wb);

    const rows = await reader.read(file);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ Name: 'Alice' });
  });

  it('reads a specific sheet when sheetName is provided', async () => {
    const wb = new Workbook();
    const ws1 = wb.addWorksheet('People');
    ws1.getCell(1, 1).value = 'Name';
    ws1.getCell(2, 1).value = 'Alice';
    const ws2 = wb.addWorksheet('Waste');
    ws2.getCell(1, 1).value = 'District';
    ws2.getCell(1, 2).value = 'Volume';
    ws2.getCell(2, 1).value = 'Interior';
    ws2.getCell(2, 2).value = 1000;
    ws2.getCell(3, 1).value = 'Coast';
    ws2.getCell(3, 2).value = 2000;
    const file = await createTestFile(wb);

    const rows = await reader.read(file, 'Waste');

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ District: 'Interior', Volume: 1000 });
    expect(rows[1]).toEqual({ District: 'Coast', Volume: 2000 });
  });

  it('throws ExcelReadError when the named sheet does not exist', async () => {
    const file = await createTestFile(
      await workbookWithSheet([['District'], ['Interior']], 'Data'),
    );

    await expect(reader.read(file, 'Missing')).rejects.toThrow(ExcelReadError);
    await expect(reader.read(file, 'Missing')).rejects.toMatchObject({
      name: 'ExcelReadError',
    });
  });

  it('includes the file name in the error message on sheet-not-found', async () => {
    const file = await createTestFile(await workbookWithSheet([['A']]), 'test.xlsx');

    await expect(reader.read(file, 'NoSuch')).rejects.toThrow(/test\.xlsx/);
  });

  it('includes available sheet names in the error message', async () => {
    const file = await createTestFile(await workbookWithSheet([['A']], 'MySheet'));

    await expect(reader.read(file, 'Wrong')).rejects.toThrow(/MySheet/);
  });

  it('reads CSV files, parsing numeric strings as numbers', async () => {
    const file = createTestCsvFile('District,Volume,Year\nInterior,100,2025\nCoast,200,2025');

    const rows = await reader.read(file);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ District: 'Interior', Volume: 100, Year: 2025 });
  });

  it('handles cells with empty string values without throwing', async () => {
    const file = await createTestFile(
      await workbookWithSheet([
        ['District', 'Volume', 'Notes'],
        ['Interior', '', null],
        ['Coast', '200', ''],
      ]),
    );

    const rows = await reader.read(file);

    expect(rows).toHaveLength(2);
    expect(rows[0].Volume).toBe('');
  });

  it('throws ExcelReadError when arrayBuffer() rejects', async () => {
    const blob = new Blob([''], { type: 'application/octet-stream' });
    const file = new File([blob], 'bad.xlsx');
    vi.spyOn(file, 'arrayBuffer').mockRejectedValue(new Error('disk read error'));

    await expect(reader.read(file)).rejects.toThrow(ExcelReadError);
    await expect(reader.read(file)).rejects.toMatchObject({ name: 'ExcelReadError' });
  });

  it('wraps a non-Error thrown by arrayBuffer() as ExcelReadError', async () => {
    const blob = new Blob([''], { type: 'application/octet-stream' });
    const file = new File([blob], 'bad.xlsx');
    vi.spyOn(file, 'arrayBuffer').mockRejectedValue('string-only error');

    await expect(reader.read(file)).rejects.toThrow(ExcelReadError);
  });

  it('re-throws an ExcelReadError from fileToArrayBuffer without double-wrapping', async () => {
    const blob = new Blob([''], { type: 'application/octet-stream' });
    const file = new File([blob], 'bad.xlsx');
    vi.spyOn(file, 'arrayBuffer').mockRejectedValue(new ExcelReadError('inner'));

    const caught = await reader.read(file).catch((e: unknown) => e);
    expect(caught).toBeInstanceOf(ExcelReadError);
    expect((caught as ExcelReadError).message).toBe('Failed to read file: inner');
  });

  it('wraps a non-Error thrown during workbook load as ExcelReadError', async () => {
    vi.spyOn(ExcelReader.prototype as any, 'loadWorkbook').mockRejectedValueOnce(
      'bare string from load',
    );

    const blob = new Blob([''], { type: 'application/octet-stream' });
    const file = new File([blob], 'bad.xlsx');
    vi.spyOn(file, 'arrayBuffer').mockResolvedValue(new ArrayBuffer(8));

    await expect(reader.read(file)).rejects.toThrow(ExcelReadError);
  });

  it('wraps a non-Error thrown during workbook load using String() conversion', async () => {
    vi.spyOn(ExcelReader.prototype as any, 'loadWorkbook').mockRejectedValueOnce(99);

    const blob = new Blob([''], { type: 'application/octet-stream' });
    const file = new File([blob], 'nonError.xlsx');
    vi.spyOn(file, 'arrayBuffer').mockResolvedValue(new ArrayBuffer(8));

    const caught = await reader.read(file).catch((e: unknown) => e);
    expect(caught).toBeInstanceOf(ExcelReadError);
    expect((caught as ExcelReadError).message).toContain('99');
  });

  it('throws ExcelReadError with "No sheets found" when workbook has no sheets', async () => {
    vi.spyOn(ExcelReader.prototype as any, 'loadWorkbook').mockResolvedValueOnce(new Workbook());

    const blob = new Blob([''], { type: 'application/octet-stream' });
    const file = new File([blob], 'empty.xlsx');
    vi.spyOn(file, 'arrayBuffer').mockResolvedValue(new ArrayBuffer(8));

    const caught = await reader.read(file).catch((e: unknown) => e);
    expect(caught).toBeInstanceOf(ExcelReadError);
    expect((caught as ExcelReadError).message).toMatch(/No sheets found/);
  });
});

// ---------------------------------------------------------------------------
// ExcelReader — readRaw()
// ---------------------------------------------------------------------------

describe('ExcelReader.readRaw()', () => {
  const reader = new ExcelReader();

  it('returns rows as arrays of cell values (no header keying)', async () => {
    const file = await createTestFile(
      await workbookWithSheet([
        ['District', 'Dry Belt m3/ha', null],
        [null, 'Avoidable Sawlog', 'Avoidable Grade 4'],
        ['DCC', 2.04, 7.05],
      ]),
    );

    const rows = await reader.readRaw(file);

    expect(rows[0][0]).toBe('District');
    expect(rows[0][1]).toBe('Dry Belt m3/ha');
    expect(rows[0][2]).toBeNull();
    expect(rows[2]).toEqual(['DCC', 2.04, 7.05]);
  });

  it('includes the header row as the first element', async () => {
    const file = await createTestFile(
      await workbookWithSheet([
        ['A', 'B'],
        ['x', 'y'],
      ]),
    );

    const rows = await reader.readRaw(file);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(['A', 'B']);
    expect(rows[1]).toEqual(['x', 'y']);
  });

  it('skips entirely blank rows', async () => {
    const wb = new Workbook();
    const ws = wb.addWorksheet('Sheet1');
    ws.getCell(1, 1).value = 'A';
    ws.getCell(3, 1).value = 'y';
    // Row 2 is skipped — no cell data set
    const file = await createTestFile(wb);

    const rows = await reader.readRaw(file);

    expect(rows.every((r) => r.some((v) => v !== null))).toBe(true);
  });

  it('reads the first sheet by default', async () => {
    const wb = new Workbook();
    const ws1 = wb.addWorksheet('First');
    ws1.getCell(1, 1).value = 'First';
    ws1.getCell(2, 1).value = 'data';
    const ws2 = wb.addWorksheet('Second');
    ws2.getCell(1, 1).value = 'Second';
    ws2.getCell(2, 1).value = 'data';
    const file = await createTestFile(wb);

    const rows = await reader.readRaw(file);

    expect(rows[0][0]).toBe('First');
  });

  it('reads a specific sheet when sheetName is given', async () => {
    const wb = new Workbook();
    const ws1 = wb.addWorksheet('First');
    ws1.getCell(1, 1).value = 'First';
    const ws2 = wb.addWorksheet('Target');
    ws2.getCell(1, 1).value = 'Target';
    ws2.getCell(1, 2).value = 'Col2';
    ws2.getCell(2, 1).value = 1;
    ws2.getCell(2, 2).value = 2;
    const file = await createTestFile(wb);

    const rows = await reader.readRaw(file, 'Target');

    expect(rows[0]).toEqual(['Target', 'Col2']);
    expect(rows[1]).toEqual([1, 2]);
  });

  it('throws ExcelReadError when the named sheet does not exist', async () => {
    const file = await createTestFile(await workbookWithSheet([['A']], 'Real'));

    await expect(reader.readRaw(file, 'Fake')).rejects.toThrow(ExcelReadError);
    await expect(reader.readRaw(file, 'Fake')).rejects.toMatchObject({
      name: 'ExcelReadError',
    });
  });

  it('throws ExcelReadError when arrayBuffer() rejects', async () => {
    const blob = new Blob([''], { type: 'application/octet-stream' });
    const file = new File([blob], 'bad.xlsx');
    vi.spyOn(file, 'arrayBuffer').mockRejectedValue(new Error('io error'));

    await expect(reader.readRaw(file)).rejects.toThrow(ExcelReadError);
  });

  it('wraps a non-Error thrown by arrayBuffer() as ExcelReadError', async () => {
    const blob = new Blob([''], { type: 'application/octet-stream' });
    const file = new File([blob], 'bad.xlsx');
    vi.spyOn(file, 'arrayBuffer').mockRejectedValue(42);

    await expect(reader.readRaw(file)).rejects.toThrow(ExcelReadError);
  });

  it('returns an empty array for a completely empty sheet', async () => {
    const wb = new Workbook();
    wb.addWorksheet('Empty'); // No data added
    const file = await createTestFile(wb);

    const rows = await reader.readRaw(file);

    expect(rows).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// ExcelReader — readRawWithMerges()
// ---------------------------------------------------------------------------

describe('ExcelReader.readRawWithMerges()', () => {
  const reader = new ExcelReader();

  it('returns rows and an empty merges array when the sheet has no merges', async () => {
    const file = await createTestFile(
      await workbookWithSheet([
        ['A', 'B', 'C'],
        [1, 2, 3],
      ]),
    );

    const result: RawSheet = await reader.readRawWithMerges(file);

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual(['A', 'B', 'C']);
    expect(result.merges).toEqual([]);
  });

  it('maps merge ranges to MergeRange objects with correct indices', async () => {
    const wb = workbookWithMerges('Sheet1', {
      range: 'A1:C1',
      data: [
        ['Header A', null, null, 'Header B'],
        ['Sub1', 'Sub2', 'Sub3', 'Sub4'],
        [1, 2, 3, 4],
      ],
    });
    const file = await createTestFile(wb);

    const result = await reader.readRawWithMerges(file);

    expect(result.merges).toHaveLength(1);
    const merge: MergeRange = result.merges[0];
    expect(merge.startRow).toBe(0);
    expect(merge.endRow).toBe(0);
    expect(merge.startCol).toBe(0);
    expect(merge.endCol).toBe(2);
  });

  it('maps multiple merge ranges correctly', async () => {
    const wb = workbookWithMerges('Sheet1', {
      range: 'A1:B1; C1:D1',
      data: [
        ['GroupA', null, 'GroupB', null],
        ['S1', 'S2', 'S3', 'S4'],
      ],
    });
    const file = await createTestFile(wb);

    const result = await reader.readRawWithMerges(file);

    expect(result.merges).toHaveLength(2);
    expect(result.merges[0]).toEqual<MergeRange>({
      startRow: 0,
      endRow: 0,
      startCol: 0,
      endCol: 1,
    });
    expect(result.merges[1]).toEqual<MergeRange>({
      startRow: 0,
      endRow: 0,
      startCol: 2,
      endCol: 3,
    });
  });

  it('handles multi-row merges', async () => {
    const wb = workbookWithMerges('Sheet1', {
      range: 'A1:B2',
      data: [
        ['Title', null],
        [null, null],
        ['A', 'B'],
      ],
    });
    const file = await createTestFile(wb);

    const result = await reader.readRawWithMerges(file);

    expect(result.merges[0]).toMatchObject<MergeRange>({
      startRow: 0,
      endRow: 1,
      startCol: 0,
      endCol: 1,
    });
  });

  it('iterates merged cells (value propagated by ExcelJS)', async () => {
    const wb = workbookWithMerges('Sheet1', {
      range: 'A1:C1',
      data: [
        ['Merged', null, null],
        ['A', 'B', 'C'],
      ],
    });
    const file = await createTestFile(wb);

    const result = await reader.readRawWithMerges(file);

    // ExcelJS propagates the merged value to all cells in the range
    expect(result.rows[0][0]).toBe('Merged');
    expect(result.rows[0][1]).toBe('Merged');
    expect(result.rows[0][2]).toBe('Merged');
  });

  it('reads the first sheet by default', async () => {
    const wb = new Workbook();
    const ws1 = wb.addWorksheet('First');
    ws1.getCell(1, 1).value = 'First';
    const ws2 = wb.addWorksheet('Second');
    ws2.getCell(1, 1).value = 'Second';
    const file = await createTestFile(wb);

    const result = await reader.readRawWithMerges(file);

    expect(result.rows[0][0]).toBe('First');
  });

  it('reads a specific sheet when sheetName is given', async () => {
    const wb = new Workbook();
    const ws1 = wb.addWorksheet('First');
    ws1.getCell(1, 1).value = 'First';
    const ws2 = wb.addWorksheet('Target');
    ws2.getCell(1, 1).value = 'Target';
    const file = await createTestFile(wb);

    const result = await reader.readRawWithMerges(file, 'Target');

    expect(result.rows[0][0]).toBe('Target');
  });

  it('throws ExcelReadError when the named sheet does not exist', async () => {
    const file = await createTestFile(await workbookWithSheet([['A']], 'Real'));

    await expect(reader.readRawWithMerges(file, 'Ghost')).rejects.toThrow(ExcelReadError);
    await expect(reader.readRawWithMerges(file, 'Ghost')).rejects.toMatchObject({
      name: 'ExcelReadError',
    });
  });

  it('throws ExcelReadError when arrayBuffer() rejects', async () => {
    const blob = new Blob([''], { type: 'application/octet-stream' });
    const file = new File([blob], 'fail.xlsx');
    vi.spyOn(file, 'arrayBuffer').mockRejectedValue(new Error('io error'));

    await expect(reader.readRawWithMerges(file)).rejects.toThrow(ExcelReadError);
  });

  it('wraps a non-Error thrown during parsing as ExcelReadError', async () => {
    const blob = new Blob([''], { type: 'application/octet-stream' });
    const file = new File([blob], 'fail.xlsx');
    vi.spyOn(file, 'arrayBuffer').mockRejectedValue('bare string');

    await expect(reader.readRawWithMerges(file)).rejects.toThrow(ExcelReadError);
  });

  it('returns rows with null for empty cells', async () => {
    const file = await createTestFile(
      await workbookWithSheet([
        ['A', null, 'C'],
        [1, null, 3],
      ]),
    );

    const result = await reader.readRawWithMerges(file);

    expect(result.rows[0][1]).toBeNull();
    expect(result.rows[1][1]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ExcelReader — listSheets()
// ---------------------------------------------------------------------------

describe('ExcelReader.listSheets()', () => {
  const reader = new ExcelReader();

  it('returns all sheet names for a valid workbook', async () => {
    const wb = new Workbook();
    wb.addWorksheet('Alpha');
    wb.addWorksheet('Beta');
    const file = await createTestFile(wb);

    const names = await reader.listSheets(file);

    expect(names).toEqual(['Alpha', 'Beta']);
  });

  it('returns a single-element array for a one-sheet workbook', async () => {
    const wb = new Workbook();
    wb.addWorksheet('Only');
    const file = await createTestFile(wb);

    const names = await reader.listSheets(file);

    expect(names).toEqual(['Only']);
  });

  it('throws ExcelReadError when arrayBuffer() rejects with an Error', async () => {
    const blob = new Blob([''], { type: 'application/octet-stream' });
    const file = new File([blob], 'bad.xlsx');
    vi.spyOn(file, 'arrayBuffer').mockRejectedValue(new Error('io error'));

    await expect(reader.listSheets(file)).rejects.toThrow(ExcelReadError);
  });

  it('wraps a non-Error from arrayBuffer() as ExcelReadError', async () => {
    const blob = new Blob([''], { type: 'application/octet-stream' });
    const file = new File([blob], 'bad.xlsx');
    vi.spyOn(file, 'arrayBuffer').mockRejectedValue('string error');

    await expect(reader.listSheets(file)).rejects.toThrow(ExcelReadError);
  });

  it('re-throws an ExcelReadError from fileToArrayBuffer without double-wrapping', async () => {
    const blob = new Blob([''], { type: 'application/octet-stream' });
    const file = new File([blob], 'bad.xlsx');
    vi.spyOn(file, 'arrayBuffer').mockRejectedValue(new ExcelReadError('inner list'));

    const caught = await reader.listSheets(file).catch((e: unknown) => e);
    expect(caught).toBeInstanceOf(ExcelReadError);
    expect((caught as ExcelReadError).message).toBe('Failed to read file: inner list');
  });

  it('throws ExcelReadError when workbook load throws an Error', async () => {
    vi.spyOn(ExcelReader.prototype as any, 'loadWorkbook').mockRejectedValueOnce(
      new Error('corrupt file'),
    );

    const blob = new Blob([''], { type: 'application/octet-stream' });
    const file = new File([blob], 'bad.xlsx');
    vi.spyOn(file, 'arrayBuffer').mockResolvedValue(new ArrayBuffer(8));

    await expect(reader.listSheets(file)).rejects.toThrow(ExcelReadError);
  });

  it('wraps a non-Error thrown during workbook load as ExcelReadError', async () => {
    vi.spyOn(ExcelReader.prototype as any, 'loadWorkbook').mockRejectedValueOnce(
      'parse error string',
    );

    const blob = new Blob([''], { type: 'application/octet-stream' });
    const file = new File([blob], 'bad.xlsx');
    vi.spyOn(file, 'arrayBuffer').mockResolvedValue(new ArrayBuffer(8));

    await expect(reader.listSheets(file)).rejects.toThrow(ExcelReadError);
  });

  it('wraps a number thrown during workbook load with String() conversion', async () => {
    vi.spyOn(ExcelReader.prototype as any, 'loadWorkbook').mockRejectedValueOnce(42);

    const blob = new Blob([''], { type: 'application/octet-stream' });
    const file = new File([blob], 'bad.xlsx');
    vi.spyOn(file, 'arrayBuffer').mockResolvedValue(new ArrayBuffer(8));

    const caught = await reader.listSheets(file).catch((e: unknown) => e);
    expect(caught).toBeInstanceOf(ExcelReadError);
    expect((caught as ExcelReadError).message).toContain('42');
  });
});
