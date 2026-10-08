import { coastMatrixConfig } from '@/domain/districtvolumes/config/coastMatrixConfig';
import { ExcelReader } from '@/domain/spreadsheet/excelReader';
import { SpreadsheetValidator } from '@/domain/spreadsheet/spreadsheetValidator';

import { validateDistrictCodes } from './districtCodeValidator';

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
  validateDistrictCodes(worksheet, coastMatrixConfig, errors);

  return errors;
}
