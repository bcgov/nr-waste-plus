import { validateDistrictCodes } from './districtCodeValidator';

import { interiorMatrixConfig } from '@/services/districtvolumes/config/interiorMatrixConfig';
import { ExcelReader } from '@/services/spreadsheet/excelReader';
import { SpreadsheetValidator } from '@/services/spreadsheet/spreadsheetValidator';

export async function interiorValidator(file: File): Promise<string[]> {
  const errors: string[] = [];
  const reader = new ExcelReader();

  let worksheet;
  try {
    worksheet = await reader.read(file, interiorMatrixConfig.sheetName);
  } catch {
    errors.push(`File does not contain a sheet named "${interiorMatrixConfig.sheetName}".`);
    return errors;
  }

  const validator = new SpreadsheetValidator();
  const result = validator.validateStructure(worksheet, interiorMatrixConfig);
  errors.push(...result.errors);

  // District code format + uniqueness
  validateDistrictCodes(worksheet, interiorMatrixConfig, errors);

  return errors;
}
