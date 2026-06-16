import { describe, it, expect, vi } from 'vitest';
import * as XLSX from 'xlsx';

import { ExcelReader, ExcelReadError, type MergeRange, type RawSheet } from './excelReader';

// Wrap xlsx.read in a vi.fn so we can override it in edge-case tests while
// keeping the real implementation for all other tests.
vi.mock('xlsx', async () => {
  const actual = await vi.importActual<typeof import('xlsx')>('xlsx');
  return { ...actual, read: vi.fn(actual.read) };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestFile(workbook: XLSX.WorkBook, fileName = 'test.xlsx'): File {
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
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

function workbookWithSheet(data: unknown[][], sheetName = 'Sheet1'): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), sheetName);
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
    const file = createTestFile(
      workbookWithSheet([
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
    const file = createTestFile(workbookWithSheet([['District', 'Volume', 'Year']]));
    await expect(reader.read(file)).resolves.toEqual([]);
  });

  it('reads the first sheet by default when no sheetName is given', async () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['Name', 'Age'],
        ['Alice', 30],
      ]),
      'First',
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['District', 'Volume'],
        ['Interior', 1000],
      ]),
      'Second',
    );
    const file = createTestFile(wb);

    const rows = await reader.read(file);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ Name: 'Alice' });
  });

  it('reads a specific sheet when sheetName is provided', async () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([['Name'], ['Alice']]),
      'People',
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['District', 'Volume'],
        ['Interior', 1000],
        ['Coast', 2000],
      ]),
      'Waste',
    );
    const file = createTestFile(wb);

    const rows = await reader.read(file, 'Waste');

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ District: 'Interior', Volume: 1000 });
    expect(rows[1]).toEqual({ District: 'Coast', Volume: 2000 });
  });

  it('throws ExcelReadError when the named sheet does not exist', async () => {
    const file = createTestFile(
      workbookWithSheet([['District'], ['Interior']], 'Data'),
    );

    await expect(reader.read(file, 'Missing')).rejects.toThrow(ExcelReadError);
    await expect(reader.read(file, 'Missing')).rejects.toMatchObject({
      name: 'ExcelReadError',
    });
  });

  it('includes the file name in the error message on sheet-not-found', async () => {
    const file = createTestFile(workbookWithSheet([['A']]), 'test.xlsx');

    await expect(reader.read(file, 'NoSuch')).rejects.toThrow(/test\.xlsx/);
  });

  it('includes available sheet names in the error message', async () => {
    const file = createTestFile(workbookWithSheet([['A']], 'MySheet'));

    await expect(reader.read(file, 'Wrong')).rejects.toThrow(/MySheet/);
  });

  it('reads CSV files, parsing numeric strings as numbers', async () => {
    const file = createTestCsvFile('District,Volume,Year\nInterior,100,2025\nCoast,200,2025');

    const rows = await reader.read(file);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ District: 'Interior', Volume: 100, Year: 2025 });
  });

  it('handles cells with empty string values without throwing', async () => {
    const file = createTestFile(
      workbookWithSheet([
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
    // fileToArrayBuffer wraps any thrown value into a new ExcelReadError('Failed to read file: <msg>').
    // withSheet then re-throws that ExcelReadError as-is — no second wrapping.
    const blob = new Blob([''], { type: 'application/octet-stream' });
    const file = new File([blob], 'bad.xlsx');
    vi.spyOn(file, 'arrayBuffer').mockRejectedValue(new ExcelReadError('inner'));

    const caught = await reader.read(file).catch((e: unknown) => e);
    expect(caught).toBeInstanceOf(ExcelReadError);
    // The message comes from fileToArrayBuffer's wrapper, NOT a second withSheet wrapping.
    expect((caught as ExcelReadError).message).toBe('Failed to read file: inner');
  });

  it('wraps a non-Error thrown by XLSX.read as ExcelReadError (non-Error branch)', async () => {
    const blob = new Blob([''], { type: 'application/octet-stream' });
    const file = new File([blob], 'bad.xlsx');
    vi.spyOn(file, 'arrayBuffer').mockResolvedValue(new ArrayBuffer(8));
    vi.mocked(XLSX.read).mockImplementationOnce(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw 'bare string from xlsx';
    });

    await expect(reader.read(file)).rejects.toThrow(ExcelReadError);
  });

  it('wraps a non-Error thrown by XLSX.read using String() conversion', async () => {
    const blob = new Blob([''], { type: 'application/octet-stream' });
    const file = new File([blob], 'nonError.xlsx');
    vi.spyOn(file, 'arrayBuffer').mockResolvedValue(new ArrayBuffer(8));
    vi.mocked(XLSX.read).mockImplementationOnce(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw 99;
    });

    const caught = await reader.read(file).catch((e: unknown) => e);
    expect(caught).toBeInstanceOf(ExcelReadError);
    expect((caught as ExcelReadError).message).toContain('99');
  });

  it('throws ExcelReadError with "No sheets found" when workbook has no sheets', async () => {
    const blob = new Blob([''], { type: 'application/octet-stream' });
    const file = new File([blob], 'empty.xlsx');
    vi.spyOn(file, 'arrayBuffer').mockResolvedValue(new ArrayBuffer(8));
    vi.mocked(XLSX.read).mockReturnValueOnce({ SheetNames: [], Sheets: {} });

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
    const file = createTestFile(
      workbookWithSheet([
        ['District', 'Dry Belt m3/ha', null],
        [null, 'Avoidable Sawlog', 'Avoidable Grade 4'],
        ['DCC', 2.04, 7.05],
      ]),
    );

    const rows = await reader.readRaw(file);

    expect(rows[0][0]).toBe('District');
    expect(rows[0][1]).toBe('Dry Belt m3/ha');
    // null in the source becomes null in the output (defval: null)
    expect(rows[0][2]).toBeNull();
    expect(rows[2]).toEqual(['DCC', 2.04, 7.05]);
  });

  it('includes the header row as the first element', async () => {
    const file = createTestFile(
      workbookWithSheet([
        ['A', 'B'],
        ['x', 'y'],
      ]),
    );

    const rows = await reader.readRaw(file);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(['A', 'B']);
    expect(rows[1]).toEqual(['x', 'y']);
  });

  it('skips entirely blank rows (blankrows: false)', async () => {
    const wb = XLSX.utils.book_new();
    // Build a sheet that has an empty row in the middle via raw cell assignment
    const ws = XLSX.utils.aoa_to_sheet([['A'], ['x'], ['y']]);
    // Remove row 2 cells to simulate a blank row
    delete ws['A2'];
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const file = createTestFile(wb);

    const rows = await reader.readRaw(file);

    // The blank row should be skipped
    expect(rows.every((r) => r.some((v) => v !== null))).toBe(true);
  });

  it('reads the first sheet by default', async () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([['First'], ['data']]),
      'First',
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([['Second'], ['data']]),
      'Second',
    );
    const file = createTestFile(wb);

    const rows = await reader.readRaw(file);

    expect(rows[0][0]).toBe('First');
  });

  it('reads a specific sheet when sheetName is given', async () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([['First']]),
      'First',
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([['Target', 'Col2'], [1, 2]]),
      'Target',
    );
    const file = createTestFile(wb);

    const rows = await reader.readRaw(file, 'Target');

    expect(rows[0]).toEqual(['Target', 'Col2']);
    expect(rows[1]).toEqual([1, 2]);
  });

  it('throws ExcelReadError when the named sheet does not exist', async () => {
    const file = createTestFile(workbookWithSheet([['A']], 'Real'));

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
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, {}, 'Empty');
    const file = createTestFile(wb);

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
    const file = createTestFile(
      workbookWithSheet([
        ['A', 'B', 'C'],
        [1, 2, 3],
      ]),
    );

    const result: RawSheet = await reader.readRawWithMerges(file);

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual(['A', 'B', 'C']);
    expect(result.merges).toEqual([]);
  });

  it('maps !merges to MergeRange objects with correct indices', async () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Header A', null, null, 'Header B'],
      ['Sub1', 'Sub2', 'Sub3', 'Sub4'],
      [1, 2, 3, 4],
    ]);
    // Manually add a merge: A1:C1 (row 0, cols 0–2)
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const file = createTestFile(wb);

    const result = await reader.readRawWithMerges(file);

    expect(result.merges).toHaveLength(1);
    const merge: MergeRange = result.merges[0];
    expect(merge.startRow).toBe(0);
    expect(merge.endRow).toBe(0);
    expect(merge.startCol).toBe(0);
    expect(merge.endCol).toBe(2);
  });

  it('maps multiple merge ranges correctly', async () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['GroupA', null, 'GroupB', null],
      ['S1', 'S2', 'S3', 'S4'],
    ]);
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, // A1:B1
      { s: { r: 0, c: 2 }, e: { r: 0, c: 3 } }, // C1:D1
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const file = createTestFile(wb);

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
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Title', null],
      [null, null],
      ['A', 'B'],
    ]);
    // A1:B2 merge (rows 0–1, cols 0–1)
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 1, c: 1 } }];
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const file = createTestFile(wb);

    const result = await reader.readRawWithMerges(file);

    expect(result.merges[0]).toMatchObject<MergeRange>({
      startRow: 0,
      endRow: 1,
      startCol: 0,
      endCol: 1,
    });
  });

  it('returns null for merged cells beyond the top-left cell', async () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Merged', null, null],
      ['A', 'B', 'C'],
    ]);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const file = createTestFile(wb);

    const result = await reader.readRawWithMerges(file);

    // Top-left cell has the value; others are null
    expect(result.rows[0][0]).toBe('Merged');
    expect(result.rows[0][1]).toBeNull();
    expect(result.rows[0][2]).toBeNull();
  });

  it('reads the first sheet by default', async () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([['First']]),
      'First',
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([['Second']]),
      'Second',
    );
    const file = createTestFile(wb);

    const result = await reader.readRawWithMerges(file);

    expect(result.rows[0][0]).toBe('First');
  });

  it('reads a specific sheet when sheetName is given', async () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([['First']]),
      'First',
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([['Target']]),
      'Target',
    );
    const file = createTestFile(wb);

    const result = await reader.readRawWithMerges(file, 'Target');

    expect(result.rows[0][0]).toBe('Target');
  });

  it('throws ExcelReadError when the named sheet does not exist', async () => {
    const file = createTestFile(workbookWithSheet([['A']], 'Real'));

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

  it('returns rows with defval null for empty cells', async () => {
    const file = createTestFile(
      workbookWithSheet([
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
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['A']]), 'Alpha');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['B']]), 'Beta');
    const file = createTestFile(wb);

    const names = await reader.listSheets(file);

    expect(names).toEqual(['Alpha', 'Beta']);
  });

  it('returns a single-element array for a one-sheet workbook', async () => {
    const file = createTestFile(workbookWithSheet([['X']], 'Only'));

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

  it('throws ExcelReadError when XLSX.read throws an Error', async () => {
    const blob = new Blob([''], { type: 'application/octet-stream' });
    const file = new File([blob], 'bad.xlsx');
    vi.spyOn(file, 'arrayBuffer').mockResolvedValue(new ArrayBuffer(8));
    vi.mocked(XLSX.read).mockImplementationOnce(() => {
      throw new Error('corrupt file');
    });

    await expect(reader.listSheets(file)).rejects.toThrow(ExcelReadError);
  });

  it('wraps a non-Error thrown by XLSX.read as ExcelReadError', async () => {
    const blob = new Blob([''], { type: 'application/octet-stream' });
    const file = new File([blob], 'bad.xlsx');
    vi.spyOn(file, 'arrayBuffer').mockResolvedValue(new ArrayBuffer(8));
    vi.mocked(XLSX.read).mockImplementationOnce(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw 'parse error string';
    });

    await expect(reader.listSheets(file)).rejects.toThrow(ExcelReadError);
  });

  it('wraps a number thrown by XLSX.read with String() conversion', async () => {
    const blob = new Blob([''], { type: 'application/octet-stream' });
    const file = new File([blob], 'bad.xlsx');
    vi.spyOn(file, 'arrayBuffer').mockResolvedValue(new ArrayBuffer(8));
    vi.mocked(XLSX.read).mockImplementationOnce(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw 42;
    });

    const caught = await reader.listSheets(file).catch((e: unknown) => e);
    expect(caught).toBeInstanceOf(ExcelReadError);
    expect((caught as ExcelReadError).message).toContain('42');
  });
});
