import type { MatrixConfig, ParseResult } from './types';
import type ExcelJS from 'exceljs';

function getCellValue(worksheet: ExcelJS.Worksheet, row: number, col: number): unknown {
  const cell = worksheet.getRow(row).getCell(col);
  return cell.value ?? null;
}

export class MatrixParser {
  parse(worksheet: ExcelJS.Worksheet, config: MatrixConfig): ParseResult<Record<string, unknown>> {
    const data: Record<string, unknown>[] = [];
    const errors: { row: number; message: string }[] = [];

    const lastRow = worksheet.rowCount;

    for (let r = config.dataStartRow; r <= lastRow; r++) {
      const districtCode = String(getCellValue(worksheet, r, config.districtCol) ?? '').trim();
      if (!districtCode) continue;

      for (const group of config.groups) {
        const values: Record<string, unknown> = {};

        for (let si = 0; si < group.subColumns.length; si++) {
          const colIdx = group.colStart + si;
          values[group.subColumns[si].key] = getCellValue(worksheet, r, colIdx);
        }

        const record: Record<string, unknown> = {
          [config.districtKey]: districtCode,
          [config.groupOutputKey]: group.label,
          ...values,
        };
        data.push(record);
      }
    }

    return { data, errors };
  }
}
