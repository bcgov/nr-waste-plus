import type { MatrixConfig, ValidationResult } from './types';
import type ExcelJS from 'exceljs';

function getCellText(worksheet: ExcelJS.Worksheet, row: number, col: number): string {
  const cell = worksheet.getRow(row)?.getCell(col);
  return cell?.value != null ? String(cell.value).replace(/\s+/g, ' ').trim() : '';
}

export class SpreadsheetValidator {
  validateWorksheet(worksheet: ExcelJS.Worksheet, config: MatrixConfig): ValidationResult {
    const errors: string[] = [];

    if (worksheet.rowCount < config.dataStartRow) {
      errors.push(
        `Worksheet has no data rows (expected data starting at row ${config.dataStartRow}).`,
      );
      return { valid: false, errors };
    }

    for (const group of config.groups) {
      const expectedLabel = group.label;
      const actualLabel = getCellText(worksheet, config.groupHeaderRow, group.colStart);
      if (!actualLabel) {
        errors.push(
          `Missing group header at column ${group.colStart}, expected "${expectedLabel}".`,
        );
      }
    }

    for (const group of config.groups) {
      for (let si = 0; si < group.subColumns.length; si++) {
        const colIdx = group.colStart + si;
        const sub = group.subColumns[si];
        if (!sub.header) continue; // header validation is opt-in
        const expected = sub.header;
        const actual = getCellText(worksheet, config.columnHeaderRow, colIdx);
        if (!actual) {
          errors.push(
            `Missing column header at column ${colIdx} (row ${config.columnHeaderRow}), expected "${expected}".`,
          );
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  validateStructure(worksheet: ExcelJS.Worksheet, config: MatrixConfig): ValidationResult {
    const errors: string[] = [];
    const lastRow = worksheet.rowCount;

    if (lastRow < config.dataStartRow) {
      errors.push('Worksheet has no data rows.');
      return { valid: false, errors };
    }

    const dataRowCount = lastRow - config.dataStartRow + 1;
    if (dataRowCount < 1) {
      errors.push('Worksheet must contain at least one data row.');
    }

    const maxCol = Math.max(
      ...config.groups.map((g) => g.colEnd),
      ...(config.heliMultiplierCol ? [config.heliMultiplierCol] : []),
    );

    if (worksheet.columnCount < maxCol) {
      errors.push(
        `Spreadsheet has ${worksheet.columnCount} column${worksheet.columnCount === 1 ? '' : 's'}, expected at least ${maxCol}.`,
      );
    }

    for (let r = config.dataStartRow; r <= lastRow; r++) {
      const districtVal = String(worksheet.getCell(r, config.districtCol).value ?? '').trim();
      if (!districtVal) continue; // skip empty rows

      for (const group of config.groups) {
        for (let si = 0; si < group.subColumns.length; si++) {
          const colIdx = group.colStart + si;
          if (colIdx > maxCol) continue;
          const cell = worksheet.getCell(r, colIdx);
          if (cell.value == null || cell.value === '') {
            errors.push(
              `Missing value at row ${r}, column ${colIdx} (group "${group.label}", district "${districtVal}").`,
            );
          } else if (typeof cell.value !== 'number') {
            errors.push(
              `Non-numeric value at row ${r}, column ${colIdx}: "${String(cell.value)}" (group "${group.label}", district "${districtVal}").`,
            );
          }
        }
      }
    }

    if (config.heliMultiplierCol) {
      const lastRow = worksheet.rowCount;
      const heliCell = worksheet.getCell(lastRow, config.heliMultiplierCol);
      if (heliCell.value == null || typeof heliCell.value !== 'number') {
        errors.push('Coast spreadsheet must include a Heli Multiplier value.');
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
