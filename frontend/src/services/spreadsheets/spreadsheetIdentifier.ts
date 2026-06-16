import type { SpreadsheetKind } from './types';

import { ExcelReader, ExcelReadError } from '@/services/excelReader/excelReader';

export async function identifySpreadsheet(file: File): Promise<SpreadsheetKind> {
  const reader = new ExcelReader();
  const sheets = await reader.listSheets(file);

  const sheetSet = new Set(sheets.map((s) => s.trim()));

  if (sheetSet.has('Interior')) return 'interior';
  if (sheetSet.has('Coast')) return 'coast';

  const raw = await reader.readRaw(file);
  if (raw.length === 0) {
    throw new ExcelReadError('Workbook appears to be empty.');
  }

  const firstRow = raw[0]?.map((c) => String(c ?? '').trim()) ?? [];

  if (firstRow.some((h) => h.includes('Dry Belt m3/ha'))) return 'interior';

  if (firstRow.includes('Mature') && firstRow.includes('Immature')) {
    return 'coast';
  }

  throw new ExcelReadError(
    'Unrecognized spreadsheet format. ' +
      'Expected an Interior or Coast district-averages workbook.',
  );
}
