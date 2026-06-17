import ExcelJS from 'exceljs';

import { ExcelReadError } from './types';

export class ExcelReader {
  async loadWorkbook(file: File): Promise<ExcelJS.Workbook> {
    let buffer: ArrayBuffer;
    try {
      buffer = await file.arrayBuffer();
    } catch {
      throw new ExcelReadError(`Could not read file: "${file.name}". The file may be corrupted.`);
    }

    try {
      return await new ExcelJS.Workbook().xlsx.load(buffer);
    } catch {
      throw new ExcelReadError(
        `Unsupported or corrupted file: "${file.name}". Accepted file types: .csv or .xlsx.`,
      );
    }
  }

  async read(file: File, sheetName?: string): Promise<ExcelJS.Worksheet> {
    const workbook = await this.loadWorkbook(file);

    if (sheetName) {
      const worksheet = workbook.getWorksheet(sheetName);
      if (!worksheet) {
        throw new ExcelReadError(`Sheet "${sheetName}" not found in "${file.name}".`);
      }
      return worksheet;
    }

    const firstSheet = workbook.worksheets[0];
    if (!firstSheet) {
      throw new ExcelReadError(`No worksheets found in "${file.name}".`);
    }
    return firstSheet;
  }

  async listSheets(file: File): Promise<string[]> {
    const workbook = await this.loadWorkbook(file);
    return workbook.worksheets.map((ws) => ws.name);
  }
}
