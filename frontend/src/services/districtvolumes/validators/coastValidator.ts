import { coastMatrixConfig } from '@/services/districtvolumes/config/coastMatrixConfig';
import { ExcelReader } from '@/services/spreadsheet/excelReader';
import { SpreadsheetValidator } from '@/services/spreadsheet/spreadsheetValidator';

const DISTRICT_CODE_REGEX = /^[A-Z]{3}$/;

export async function coastValidator(file: File): Promise<string[]> {
  const errors: string[] = [];
  const reader = new ExcelReader();

  let worksheet;
  try {
    worksheet = await reader.read(file, coastMatrixConfig.sheetName);
  } catch {
    errors.push(`File does not contain a sheet named "${coastMatrixConfig.sheetName}".`);
    return errors;
  }

  const validator = new SpreadsheetValidator();
  const result = validator.validateStructure(worksheet, coastMatrixConfig);
  errors.push(...result.errors);

  // District code format + uniqueness
  const seenDistricts = new Map<string, number>();
  for (let r = coastMatrixConfig.dataStartRow; r <= worksheet.rowCount; r++) {
    const raw = worksheet.getCell(r, coastMatrixConfig.districtCol).value;
    const districtVal = String(raw ?? '').trim();
    if (!districtVal) continue;

    // Skip summary rows (e.g., "Weighted Coast District Average")
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

  return errors;
}
