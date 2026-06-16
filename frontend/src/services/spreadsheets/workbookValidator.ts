import { ExcelReader } from '@/services/excelReader/excelReader';

import { identifySpreadsheet } from './spreadsheetIdentifier';
import type { SpreadsheetKind } from './types';

const EXPECTED_HEADERS: Record<SpreadsheetKind, string[]> = {
  interior: ['District', 'Dry Belt m3/ha', 'Transition Zone m3/ha', 'Wet Belt m3/ha'],
  coast: ['District', 'Mature', 'Immature', 'Heli Mulitplier'],
};

function headerMatches(actual: string, expected: string): boolean {
  if (actual === expected || actual.startsWith(expected)) return true;
  // Accept known spelling variants (e.g. "Heli Mulitplier" vs "Heli Multiplier").
  const normalizedExpected = expected.replace('Heli Mulitplier', 'Heli Multiplier');
  const normalizedActual = actual.replace('Heli Mulitplier', 'Heli Multiplier');
  return normalizedActual === normalizedExpected || normalizedActual.startsWith(normalizedExpected);
}

export function createSpreadsheetValidator(): (file: File) => Promise<string[]> {
  return async (file: File): Promise<string[]> => {
    const errors: string[] = [];

    let kind: SpreadsheetKind;
    try {
      kind = await identifySpreadsheet(file);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`"${file.name}" could not be validated: ${message}`);
      return errors;
    }

    try {
      const reader = new ExcelReader();
      const sheetName = kind === 'interior' ? 'Interior' : 'Coast';
      const raw = await reader.readRaw(file, sheetName);

      if (raw.length < 1) {
        errors.push(`Sheet "${sheetName}" is empty.`);
        return errors;
      }

      const firstRow = raw[0]?.map((c) => String(c ?? '').trim()) ?? [];
      const expected = EXPECTED_HEADERS[kind];

      for (const expectedHeader of expected) {
        const found = firstRow.some(
          (h) => headerMatches(h, expectedHeader),
        );
        if (!found) {
          errors.push(
            `Expected column "${expectedHeader}" not found in sheet "${sheetName}".`,
          );
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`"${file.name}" could not be validated: ${message}`);
    }

    return errors;
  };
}
