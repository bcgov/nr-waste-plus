import { Workbook, type Worksheet } from 'exceljs';

export interface MergeRange {
  readonly startRow: number;
  readonly endRow: number;
  readonly startCol: number;
  readonly endCol: number;
}

export interface RawSheet {
  readonly rows: unknown[][];
  readonly merges: readonly MergeRange[];
}

export class ExcelReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExcelReadError';
    Object.setPrototypeOf(this, ExcelReadError.prototype);
  }
}

export class ExcelReader {
  async read(file: File, sheetName?: string): Promise<Record<string, unknown>[]> {
    return this.withSheet(file, sheetName, (sheet) => {
      const headerRow = sheet.getRow(1);
      const headerValues = (headerRow.values as unknown[]).slice(1);
      const headers = headerValues.map((v) => String(v ?? ''));

      if (headers.length === 0 || headers.every((h) => h === '')) return [];

      const rows: Record<string, unknown>[] = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const values = (row.values as unknown[]).slice(1);
        const obj: Record<string, unknown> = {};
        headers.forEach((header, i) => {
          obj[header] = values[i] !== undefined ? values[i] : null;
        });
        rows.push(obj);
      });

      return rows;
    });
  }

  async readRaw(file: File, sheetName?: string): Promise<unknown[][]> {
    return this.withSheet(file, sheetName, (sheet) => {
      const columnCount = sheet.columnCount;
      const rows: unknown[][] = [];

      sheet.eachRow((row) => {
        const values: unknown[] = [];
        for (let c = 1; c <= columnCount; c++) {
          const cellValue = row.getCell(c).value;
          values.push(cellValue !== undefined ? cellValue : null);
        }
        if (values.some((v) => v !== null && v !== '')) {
          rows.push(values);
        }
      });

      return rows;
    });
  }

  async readRawWithMerges(file: File, sheetName?: string): Promise<RawSheet> {
    return this.withSheet(file, sheetName, (sheet) => {
      const columnCount = sheet.columnCount;
      const rows: unknown[][] = [];

      sheet.eachRow((row) => {
        const values: unknown[] = [];
        for (let c = 1; c <= columnCount; c++) {
          const cellValue = row.getCell(c).value;
          values.push(cellValue !== undefined ? cellValue : null);
        }
        if (values.some((v) => v !== null && v !== '')) {
          rows.push(values);
        }
      });

      const merges: MergeRange[] = this.getMergeRanges(sheet);

      return { rows, merges };
    });
  }

  async listSheets(file: File): Promise<string[]> {
    try {
      const workbook = await this.loadWorkbook(file);
      return workbook.worksheets.map((w) => w.name);
    } catch (error) {
      if (error instanceof ExcelReadError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new ExcelReadError(`Failed to read file "${file.name}": ${message}`);
    }
  }

  private getMergeRanges(sheet: Worksheet): MergeRange[] {
    if (!sheet.hasMerges) return [];

    const merges: MergeRange[] = [];
    const model = sheet.model;
    if (model?.merges) {
      for (const rangeStr of model.merges) {
        const parsed = this.parseRange(rangeStr);
        if (parsed) {
          merges.push({
            startRow: parsed.top - 1,
            endRow: parsed.bottom - 1,
            startCol: parsed.left - 1,
            endCol: parsed.right - 1,
          });
        }
      }
    }
    return merges;
  }

  private parseRange(
    rangeStr: string,
  ): { top: number; left: number; bottom: number; right: number } | null {
    const parts = rangeStr.split(':');
    if (parts.length !== 2) return null;

    const tl = this.parseCellRef(parts[0]);
    const br = this.parseCellRef(parts[1]);
    if (!tl || !br) return null;

    return {
      top: Math.min(tl.row, br.row),
      left: Math.min(tl.col, br.col),
      bottom: Math.max(tl.row, br.row),
      right: Math.max(tl.col, br.col),
    };
  }

  private parseCellRef(ref: string): { row: number; col: number } | null {
    const match = ref.match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;
    const col = match[1]
      .split('')
      .reduce((acc: number, ch: string) => acc * 26 + (ch.charCodeAt(0) - 64), 0);
    const row = parseInt(match[2], 10);
    return { row, col };
  }

  private async withSheet<T>(
    file: File,
    sheetName: string | undefined,
    convert: (sheet: Worksheet) => T,
  ): Promise<T> {
    try {
      const workbook = await this.loadWorkbook(file);

      let sheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0];

      if (!sheet && sheetName) {
        const trimmed = sheetName.trim();
        const match = workbook.worksheets.find((w) => w.name.trim() === trimmed);
        if (match) sheet = match;
      }

      if (!sheet) {
        const availableSheets = workbook.worksheets.map((w) => w.name).join(', ') || 'none';
        const targetSheet = sheetName
          ? `Sheet "${sheetName}" not found`
          : 'No sheets found in workbook';
        throw new Error(`${targetSheet}. Available: ${availableSheets}`);
      }

      return convert(sheet);
    } catch (error) {
      if (error instanceof ExcelReadError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new ExcelReadError(`Failed to read file "${file.name}": ${message}`);
    }
  }

  private async loadWorkbook(file: File): Promise<Workbook> {
    const workbook = new Workbook();

    if (this.isCsvFile(file)) {
      const text = await file.text();
      const data = this.parseCsv(text);
      const worksheet = workbook.addWorksheet('Sheet1');
      if (data.length > 0) {
        worksheet.addRows(data);
      }
    } else {
      const arrayBuffer = await this.fileToArrayBuffer(file);
      await (workbook.xlsx.load as (data: ArrayBuffer) => Promise<Workbook>)(arrayBuffer);
    }

    return workbook;
  }

  private parseCsv(text: string): unknown[][] {
    const rows: unknown[][] = [];
    const lines = text.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '' && rows.length === 0) continue;
      if (trimmed === '' && rows.length > 0) {
        rows.push([]);
        continue;
      }
      rows.push(this.parseCsvLine(line));
    }

    return rows;
  }

  private parseCsvLine(line: string): unknown[] {
    const result: unknown[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(this.coerceCsvValue(current));
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(this.coerceCsvValue(current));
    return result;
  }

  private coerceCsvValue(value: string): unknown {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const num = Number(trimmed);
    if (!Number.isNaN(num) && num !== Infinity) return num;
    return trimmed;
  }

  private isCsvFile(file: File): boolean {
    return file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv';
  }

  private async fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    try {
      return await file.arrayBuffer();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ExcelReadError(`Failed to read file: ${message}`);
    }
  }
}
