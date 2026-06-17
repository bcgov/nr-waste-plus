import type ExcelJS from 'exceljs';

import type { MatrixConfig, ParseResult } from './types';

function columnLetterToIndex(letter: string): number {
  let index = 0;
  for (let i = 0; i < letter.length; i++) {
    index = index * 26 + (letter.charCodeAt(i) - 64);
  }
  return index;
}

function getCellValue(worksheet: ExcelJS.Worksheet, row: number, col: number): unknown {
  const cell = worksheet.getRow(row).getCell(col);
  return cell.value ?? null;
}

export class MatrixParser {
  parse(worksheet: ExcelJS.Worksheet, config: MatrixConfig): ParseResult<Record<string, unknown>> {
    const data: Record<string, unknown>[] = [];
    const errors: { row: number; message: string }[] = [];

    const mergedRanges = worksheet.model?.merges ?? [];
    const groupLabels = new Map<number, string>();

    for (const range of mergedRanges) {
      const match = range.match(/^([A-Z]+)(\d+):([A-Z]+)\d+$/);
      if (!match) continue;
      const startCol = columnLetterToIndex(match[1]);
      const endCol = columnLetterToIndex(match[3]);
      const rowNum = parseInt(match[2], 10);
      if (rowNum !== config.groupHeaderRow) continue;
      if (startCol === endCol) continue;

      const label = String(getCellValue(worksheet, config.groupHeaderRow, startCol) ?? '');
      for (let c = startCol; c <= endCol; c++) {
        groupLabels.set(c, label);
      }
    }

    for (const group of config.groups) {
      const label = group.label;
      for (let c = group.colStart; c <= group.colEnd; c++) {
        if (!groupLabels.has(c)) {
          groupLabels.set(c, label);
        }
      }
    }

    const headerLabels = new Map<number, string>();
    for (let c = 1; c <= (worksheet.columnCount || 1); c++) {
      const raw = String(getCellValue(worksheet, config.columnHeaderRow, c) ?? '');
      headerLabels.set(c, raw.replace(/\s+/g, ' ').trim());
    }

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
