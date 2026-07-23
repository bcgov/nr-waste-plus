import ExcelJS from 'exceljs';

import { EXPECTED_DISTRICT_CODES } from '@/services/speciescomposition/config/speciesCompositionConfig';

// ─── Interior Config ────────────────────────────────────────────────────────
// 13 columns: A=District code, B-E=Dry belt (4), F-I=Transition (4), J-M=Wet belt (4)
// ─── Coast Config ───────────────────────────────────────────────────────────
// 12 columns: A=District code, B-F=Mature (5), G-K=Immature (5), L=Heli Multiplier
// ─── Species Composition Config ─────────────────────────────────────────────
// 20 columns: A=District code, B-T=19 species + Total (headers in row 1)

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

// ─── Species Composition Helpers ─────────────────────────────────────────────

/** The 19 species headers + Total that must appear in row 1 (columns B–T). */
const SPECIES_HEADERS = [
  'Balsam',
  'Cedar',
  'Cottonwood',
  'Cypress',
  'Fir',
  'Hemlock',
  'Larch',
  'Maple',
  'Pine',
  'Poplar',
  'Redcedar',
  'Redwood',
  'Spruce',
  'Whitebirch',
  'Whitepine',
  'Yew',
  'Other',
  'Unknown',
  'Total',
];

/**
 * Adds a header row (row 1) with district label in A1 and species headers in B1–T1.
 */
function addSpeciesHeaderRow(ws: ExcelJS.Worksheet): void {
  const headerRow = [undefined, ...SPECIES_HEADERS]; // A1 empty, B1–T1 headers
  ws.addRow(headerRow);
}

/**
 * Adds a data row with a district code and 19 numeric species values (0–1 range).
 */
function addSpeciesDataRow(ws: ExcelJS.Worksheet, districtCode: string, values: number[]): void {
  if (values.length !== SPECIES_HEADERS.length) {
    throw new Error(`Species row must have exactly ${SPECIES_HEADERS.length} values`);
  }
  ws.addRow([districtCode, ...values]);
}

/**
 * Generates a deterministic set of species values for a district.
 * Uses a seeded pseudo-random approach based on the district code's char codes.
 */
function generateSpeciesValues(districtCode: string): number[] {
  const seed = districtCode.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const raw = SPECIES_HEADERS.map((_, i) => {
    const x = Math.sin(seed + i) * 10000;
    return x - Math.floor(x); // 0–1 range
  });
  // Ensure Total = sum of first 18 species, capped at 1
  const sum = raw.slice(0, 18).reduce((a, b) => a + b, 0);
  raw[18] = Math.min(sum, 1);
  return raw;
}

/**
 * Builds a valid species composition workbook buffer (.xlsx).
 *
 * Layout:
 * - Row 1: headers (A1 empty, B1–T1 = 19 species headers including Total)
 * - Row 2+: one row per district with code in column A and 19 numeric values in B–T
 * - All values are in the 0–1 range
 * - Includes all 23 expected district codes
 *
 * @returns A Buffer of the .xlsx file ready for Playwright file upload.
 */
export async function buildValidSpeciesCompositionBuffer(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Species Composition');

  addSpeciesHeaderRow(ws);

  for (const code of EXPECTED_DISTRICT_CODES) {
    addSpeciesDataRow(ws, code, generateSpeciesValues(code));
  }

  return (await wb.xlsx.writeBuffer()) as unknown as Buffer;
}

/**
 * Builds a species composition workbook missing some expected district codes.
 * Only includes the first 5 districts from the expected list.
 *
 * @returns A Buffer of the .xlsx file ready for Playwright file upload.
 */
export async function buildMissingDistrictsBuffer(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Species Composition');

  addSpeciesHeaderRow(ws);

  // Only include first 5 districts — missing the other 18
  for (const code of EXPECTED_DISTRICT_CODES.slice(0, 5)) {
    addSpeciesDataRow(ws, code, generateSpeciesValues(code));
  }

  return (await wb.xlsx.writeBuffer()) as unknown as Buffer;
}

/**
 * Builds a species composition workbook with a non-numeric value in a species column.
 *
 * @returns A Buffer of the .xlsx file ready for Playwright file upload.
 */
export async function buildSpeciesNonNumericBuffer(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Species Composition');

  addSpeciesHeaderRow(ws);

  for (const code of EXPECTED_DISTRICT_CODES) {
    const values = generateSpeciesValues(code);
    // Inject a non-numeric value in the first species column (Balsam)
    values[0] = 'INVALID' as unknown as number;
    addSpeciesDataRow(ws, code, values);
  }

  return (await wb.xlsx.writeBuffer()) as unknown as Buffer;
}

/**
 * Builds a species composition workbook with a value out of range (>1).
 *
 * @returns A Buffer of the .xlsx file ready for Playwright file upload.
 */
export async function buildSpeciesOutOfRangeBuffer(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Species Composition');

  addSpeciesHeaderRow(ws);

  for (const code of EXPECTED_DISTRICT_CODES) {
    const values = generateSpeciesValues(code);
    // Inject an out-of-range value (1.5 > 1)
    values[0] = 1.5;
    addSpeciesDataRow(ws, code, values);
  }

  return (await wb.xlsx.writeBuffer()) as unknown as Buffer;
}
