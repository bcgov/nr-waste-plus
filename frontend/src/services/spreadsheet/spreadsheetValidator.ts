import type ExcelJS from 'exceljs';

import type { MatrixConfig, ValidationResult } from './types';

function getCellText(worksheet: ExcelJS.Worksheet, row: number, col: number): string {
  const cell = worksheet.getRow(row)?.getCell(col);
  return cell?.value != null ? String(cell.value).replace(/\s+/g, ' ').trim() : '';
}

export class SpreadsheetValidator {
  validateWorksheet(worksheet: ExcelJS.Worksheet, config: MatrixConfig): ValidationResult {
    const errors: string[] = [];

    if (worksheet.rowCount < config.dataStartRow) {
      errors.push(`Worksheet has no data rows (expected data starting at row ${config.dataStartRow}).`);
      return { valid: false, errors };
    }

    for (const group of config.groups) {
      const expectedLabel = group.label;
      const actualLabel = getCellText(worksheet, config.groupHeaderRow, group.colStart);
      if (!actualLabel) {
        errors.push(`Missing group header at column ${group.colStart}, expected "${expectedLabel}".`);
      }
    }

    for (const group of config.groups) {
      for (let si = 0; si < group.subColumns.length; si++) {
        const colIdx = group.colStart + si;
        const expected = group.subColumns[si].header;
        const actual = getCellText(worksheet, config.columnHeaderRow, colIdx);
        if (!actual) {
          errors.push(`Missing column header at column ${colIdx} (row ${config.columnHeaderRow}), expected "${expected}".`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
