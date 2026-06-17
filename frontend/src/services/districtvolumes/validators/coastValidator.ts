import { ExcelReader } from '@/services/spreadsheet/excelReader';
import { SpreadsheetValidator } from '@/services/spreadsheet/spreadsheetValidator';
import { coastMatrixConfig } from '@/services/districtvolumes/config/coastMatrixConfig';

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

  if (worksheet.name !== coastMatrixConfig.sheetName) {
    errors.push(
      `Expected sheet name "${coastMatrixConfig.sheetName}" but found "${worksheet.name}".`,
    );
  }

  const validator = new SpreadsheetValidator();
  const result = validator.validateWorksheet(worksheet, coastMatrixConfig);
  errors.push(...result.errors);

  return errors;
}
