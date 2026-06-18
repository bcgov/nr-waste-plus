export class ExcelReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExcelReadError';
  }
}

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
