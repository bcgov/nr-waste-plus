import { coastMatrixConfig } from '@/services/districtvolumes/config/coastMatrixConfig';
import { ExcelReader } from '@/services/spreadsheet/excelReader';
import { SpreadsheetValidator } from '@/services/spreadsheet/spreadsheetValidator';

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
  const result = validator.validateWorksheet(worksheet, coastMatrixConfig);
  errors.push(...result.errors);

  return errors;
}
