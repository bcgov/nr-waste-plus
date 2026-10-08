import { interiorMatrixConfig } from '@/domain/districtvolumes/config/interiorMatrixConfig';
import { ExcelReader } from '@/domain/spreadsheet/excelReader';
import { SpreadsheetValidator } from '@/domain/spreadsheet/spreadsheetValidator';

import { validateDistrictCodes } from './districtCodeValidator';

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
