import ExcelJS from 'exceljs';

import {
  DISTRICT_COL,
  SPECIES_START_COL,
} from '@/services/speciescomposition/config/speciesCompositionConfig';

export async function buildSpeciesCompositionFile(
  rows: unknown[][],
  sheetName = 'Species Composition',
): Promise<File> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  for (const row of rows) {
    ws.addRow(row);
  }
  const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  return new File([buffer], 'species-composition.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/** The 19 abbreviated species header codes in spreadsheet column order. */
export const SPECIES_HEADERS = [
  'AL',
  'AR',
  'AS',
  'BA',
  'BI',
  'CE',
  'CO',
  'CY',
  'FI',
  'HE',
  'LA',
  'LO',
  'MA',
  'SP',
  'UU',
  'WB',
  'WH',
  'WI',
  'YE',
];

/**
 * Builds a minimal spreadsheet matching the actual layout:
 * - Row 1: empty
 * - Row 2: title row (empty placeholder)
 * - Row 3: header row — 'District/ Species' in col B, species codes in cols C–U
 * - Row 4+: data rows — district code in col B, values in cols C–U
 */
export function headerRow(): unknown[] {
  // Row 3: place headers to match actual spreadsheet layout
  // Initialize all cells up to the last column to avoid ExcelJS sparse-array shifting
  const lastCol = SPECIES_START_COL - 1 + SPECIES_HEADERS.length;
  const row: unknown[] = new Array(lastCol).fill(undefined);
  row[DISTRICT_COL - 1] = 'District/ Species';
  for (let i = 0; i < SPECIES_HEADERS.length; i++) {
    row[SPECIES_START_COL - 1 + i] = SPECIES_HEADERS[i];
  }
  return row;
}

/** Build a data row matching actual layout: empty col A, district in col B, values in C–U. */
export function dataRow(code: string, values: number[]): unknown[] {
  const lastCol = SPECIES_START_COL - 1 + values.length;
  const row: unknown[] = new Array(lastCol).fill(undefined);
  row[DISTRICT_COL - 1] = code;
  for (let i = 0; i < values.length; i++) {
    row[SPECIES_START_COL - 1 + i] = values[i];
  }
  return row;
}

/**
 * Wraps header and data rows in the actual spreadsheet layout
 * (empty row 1, title row 2, header row 3, data rows 4+).
 */
export function wrapInSpreadsheetLayout(header: unknown[], dataRows: unknown[][]): unknown[][] {
  return [
    [], // Row 1: empty
    ['District Level Volume-Weighted Species Composition'], // Row 2: title
    header, // Row 3: headers
    ...dataRows, // Row 4+: data
  ];
}

/** Sample valid values (all between 0 and 1). */
export function sampleValues(seed: number): number[] {
  return Array.from({ length: 19 }, (_, i) => {
    const v = ((seed + i * 0.01) % 100) / 100;
    return Math.round(v * 1000) / 1000;
  });
}
