import { ExcelReader } from '@/services/spreadsheet/excelReader';
import { SpreadsheetValidator } from '@/services/spreadsheet/spreadsheetValidator';
import { interiorMatrixConfig } from '@/services/districtvolumes/config/interiorMatrixConfig';

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

  if (worksheet.name !== interiorMatrixConfig.sheetName) {
    errors.push(
      `Expected sheet name "${interiorMatrixConfig.sheetName}" but found "${worksheet.name}".`,
    );
  }

  const validator = new SpreadsheetValidator();
  const result = validator.validateWorksheet(worksheet, interiorMatrixConfig);
  errors.push(...result.errors);

  return errors;
}
