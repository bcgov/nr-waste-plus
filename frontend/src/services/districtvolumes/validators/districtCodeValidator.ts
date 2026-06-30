import type { MatrixConfig } from '@/services/spreadsheet/types';
import type ExcelJS from 'exceljs';

const DISTRICT_CODE_REGEX = /^[A-Z]{3}$/;

export function validateDistrictCodes(
  worksheet: ExcelJS.Worksheet,
  config: MatrixConfig,
  errors: string[],
): void {
  const seenDistricts = new Map<string, number>();

  for (let r = config.dataStartRow; r <= worksheet.rowCount; r++) {
    const raw = worksheet.getCell(r, config.districtCol).value;
    const districtVal =
      typeof raw === 'string' ? raw.trim() : typeof raw === 'number' ? String(raw) : '';
    if (!districtVal) continue;

    // Skip summary rows
    if (/weighted|average|total/i.test(districtVal)) continue;

    if (!DISTRICT_CODE_REGEX.test(districtVal)) {
      errors.push(
        `Invalid district code at row ${r}: "${districtVal}". District codes must be 3 uppercase letters.`,
      );
      continue;
    }

    const prevRow = seenDistricts.get(districtVal);
    if (prevRow) {
      errors.push(`Duplicate district code "${districtVal}" found at rows ${prevRow} and ${r}.`);
    } else {
      seenDistricts.set(districtVal, r);
    }
  }
}
