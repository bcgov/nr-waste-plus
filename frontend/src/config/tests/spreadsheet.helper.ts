import ExcelJS from 'exceljs';

// ─── Interior Config ────────────────────────────────────────────────────────
// 13 columns: A=District code, B-E=Dry belt (4), F-I=Transition (4), J-M=Wet belt (4)
// ─── Coast Config ───────────────────────────────────────────────────────────
// 12 columns: A=District code, B-F=Mature (5), G-K=Immature (5), L=Heli Multiplier

const INTERIOR_COL_COUNT = 13;
const COAST_COL_COUNT = 12;

function addInteriorRow(ws: ExcelJS.Worksheet, values: unknown[]): void {
  if (values.length !== INTERIOR_COL_COUNT) {
    throw new Error(`Interior row must have exactly ${INTERIOR_COL_COUNT} columns`);
  }
  ws.addRow(values);
}

function addCoastRow(ws: ExcelJS.Worksheet, values: unknown[]): void {
  if (values.length !== COAST_COL_COUNT) {
    throw new Error(`Coast row must have exactly ${COAST_COL_COUNT} columns`);
  }
  ws.addRow(values);
}

/**
 * Builds a valid Interior workbook buffer (.xlsx).
 *
 * Layout: rows 1-2 are empty (positional), row 3+ contains data.
 * - Sheet name: "Interior" (required by interiorValidator)
 * - Column count: 13 (A + 3 zones × 4 sub-columns)
 * - District codes: 3 uppercase letters
 * - All sub-column values: numeric
 *
 * @returns A Buffer of the .xlsx file ready for Playwright file upload.
 */
export async function buildValidInteriorBuffer(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Interior');

  // Row 1-2: empty (headers are optional — validateStructure only checks data rows)
  ws.addRow([]);
  ws.addRow([]);

  // Row 3: first data row with district code and 12 numeric values
  addInteriorRow(ws, [
    'DCC', // col A: district code
    1.234,
    0.567,
    0.123,
    1.924, // cols B-E: Dry belt
    1.345,
    0.678,
    0.234,
    2.257, // cols F-I: Transition zone
    1.456,
    0.789,
    0.345,
    2.59, // cols J-M: Wet belt
  ]);

  // Row 4: second district (tests multi-district and validates no-duplicate check)
  addInteriorRow(ws, ['DRY', 2.1, 1.2, 0.5, 3.8, 2.3, 1.4, 0.6, 4.3, 2.5, 1.6, 0.7, 4.8]);

  return (await wb.xlsx.writeBuffer()) as unknown as Buffer;
}

/**
 * Builds a valid Coast workbook buffer (.xlsx).
 *
 * Layout: rows 1-2 are empty, row 3+ contains data.
 * - Sheet name: "Coast" (required by coastValidator)
 * - Column count: 12 (A + 2 sections × 5 sub-columns + heli multiplier column)
 * - District codes: 3 uppercase letters
 * - Last row: summary row with text district + numeric heli multiplier in col 12
 *
 * @returns A Buffer of the .xlsx file ready for Playwright file upload.
 */
export async function buildValidCoastBuffer(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Coast');

  // Row 1-2: empty (positional headers not validated)
  ws.addRow([]);
  ws.addRow([]);

  // Row 3: data district
  addCoastRow(ws, [
    'DCK', // col A: district code
    16.19,
    8.87,
    5.24,
    1.18,
    31.48, // cols B-F: Mature
    17.83,
    9.77,
    3.87,
    1.3,
    32.77, // cols G-K: Immature
    '', // col L: heli multiplier (only populated in summary row)
  ]);

  // Row 4: summary row with heli multiplier in col 12
  addCoastRow(ws, [
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
    3.47, // col L: heli multiplier value
  ]);

  return (await wb.xlsx.writeBuffer()) as unknown as Buffer;
}

/**
 * Builds an Interior workbook with an invalid sheet name.
 * The validator expects a sheet named "Interior" — this creates "WrongSheet".
 *
 * @returns A Buffer of the .xlsx file ready for Playwright file upload.
 */
export async function buildWrongSheetNameBuffer(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('WrongSheet');

  ws.addRow([]);
  ws.addRow([]);
  addInteriorRow(ws, [
    'DCC',
    1.234,
    0.567,
    0.123,
    1.924,
    1.345,
    0.678,
    0.234,
    2.257,
    1.456,
    0.789,
    0.345,
    2.59,
  ]);

  return (await wb.xlsx.writeBuffer()) as unknown as Buffer;
}

/**
 * Builds an Interior workbook with non-numeric data in a value cell.
 * The validator checks all sub-column cells are numeric.
 *
 * @returns A Buffer of the .xlsx file ready for Playwright file upload.
 */
export async function buildNonNumericDataBuffer(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Interior');

  ws.addRow([]);
  ws.addRow([]);

  // Fourth value (col 5, Dry belt "Total") is a non-numeric string
  addInteriorRow(ws, [
    'DCC',
    1.234,
    0.567,
    0.123,
    'INVALID', // ← non-numeric
    1.345,
    0.678,
    0.234,
    2.257,
    1.456,
    0.789,
    0.345,
    2.59,
  ]);

  return (await wb.xlsx.writeBuffer()) as unknown as Buffer;
}

/**
 * Builds an Interior workbook with an invalid district code (not 3 uppercase letters).
 *
 * @returns A Buffer of the .xlsx file ready for Playwright file upload.
 */
export async function buildInvalidDistrictCodeBuffer(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Interior');

  ws.addRow([]);
  ws.addRow([]);

  addInteriorRow(ws, [
    'INVALID_CODE', // ← not 3 uppercase letters
    1.234,
    0.567,
    0.123,
    1.924,
    1.345,
    0.678,
    0.234,
    2.257,
    1.456,
    0.789,
    0.345,
    2.59,
  ]);

  return (await wb.xlsx.writeBuffer()) as unknown as Buffer;
}

/**
 * Builds a Coast workbook missing the heli multiplier in the last row.
 *
 * @returns A Buffer of the .xlsx file ready for Playwright file upload.
 */
export async function buildMissingHeliMultiplierBuffer(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Coast');

  ws.addRow([]);
  ws.addRow([]);

  addCoastRow(ws, ['DCK', 16.19, 8.87, 5.24, 1.18, 31.48, 17.83, 9.77, 3.87, 1.3, 32.77, '']);

  // Last row — missing heli multiplier in col 12
  addCoastRow(ws, [
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
    '', // ← must be numeric, but is empty
  ]);

  return (await wb.xlsx.writeBuffer()) as unknown as Buffer;
}
