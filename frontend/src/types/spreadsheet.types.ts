/**
 * Column-group and matrix-layout contracts shared by the spreadsheet
 * parsing pipeline (ExcelReader → MatrixParser → domain processors/
 * validators). Purely internal — nothing here crosses a network boundary.
 */
export interface SubColumnDef {
  header?: string;
  key: string;
}

export interface ColumnGroup {
  label: string;
  colStart: number;
  colEnd: number;
  subColumns: SubColumnDef[];
}

export interface MatrixConfig {
  sheetName: string;
  headerRows: number;
  groupHeaderRow: number;
  columnHeaderRow: number;
  dataStartRow: number;
  groups: ColumnGroup[];
  districtCol: number;
  districtKey: string;
  groupOutputKey: string;
  /** Optional column index for heli multiplier (e.g., 12 for Coast col L). */
  heliMultiplierCol?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ParseResult<T> {
  data: T[];
  errors: { row: number; message: string }[];
}

export interface SpreadsheetData {
  headers: string[];
  rows: Record<string, unknown>[];
}
