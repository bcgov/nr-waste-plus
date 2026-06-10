import * as XLSX from 'xlsx';

/**
 * Custom error thrown when Excel/CSV file reading fails.
 * Distinguishes file-reading errors from downstream validation errors.
 */
export class ExcelReadError extends Error {
  /**
   * Creates a new ExcelReadError.
   * @param message - Human-readable description of the read failure.
   */
  constructor(message: string) {
    super(message);
    this.name = 'ExcelReadError';
    // Ensure proper prototype chain for instanceof checks and stack traces.
    Object.setPrototypeOf(this, ExcelReadError.prototype);
  }
}

/**
 * Reads Excel (.xlsx) and CSV (.csv) files and converts rows to plain JavaScript objects.
 *
 * This layer is responsible only for loading the workbook, selecting the worksheet,
 * and converting rows into plain objects keyed by column header. It is completely
 * decoupled from validation, mapping, or any UI concerns — a pure file-reading service.
 *
 * @example
 * ```typescript
 * const reader = new ExcelReader();
 * const file = new File([buffer], 'data.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
 *
 * try {
 *   const rows = await reader.read(file);
 *   console.log(rows); // [{ District: 'Interior', Volume: '123' }, ...]
 * } catch (error) {
 *   if (error instanceof ExcelReadError) {
 *     console.error('File read failed:', error.message);
 *   }
 * }
 * ```
 */
export class ExcelReader {
  /**
   * Reads an Excel or CSV file and returns raw row data as plain objects.
   *
   * @param file - Browser File object from an input element.
   * @param sheetName - Optional worksheet name to read. If not provided, reads the first sheet.
   * @returns Promise resolving to an array of plain objects with column headers as keys.
   * @throws {ExcelReadError} If the file cannot be read or parsed.
   *
   * @remarks
   * - Returns `Record<string, unknown>[]` (no typing, no parsing).
   * - Column names are taken verbatim from the spreadsheet headers.
   * - Empty cells are represented as `undefined` or empty strings depending on XLSX behavior.
   * - No validation is performed — all values are raw strings or primitives from the cell.
   */
  async read(file: File, sheetName?: string): Promise<Record<string, unknown>[]> {
    try {
      // Convert File to ArrayBuffer for SheetJS.
      const arrayBuffer = await this.fileToArrayBuffer(file);

      // Read workbook with SheetJS.
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Determine which sheet to read: explicit name or first sheet.
      const sheet = sheetName
        ? workbook.Sheets[sheetName]
        : workbook.Sheets[workbook.SheetNames[0]];

      if (!sheet) {
        const availableSheets = workbook.SheetNames.join(', ') || 'none';
        const targetSheet = sheetName
          ? `Sheet "${sheetName}" not found`
          : 'No sheets found in workbook';
        throw new Error(`${targetSheet}. Available: ${availableSheets}`);
      }

      // Convert sheet to plain objects: Record<string, unknown>[].
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      return rows;
    } catch (error) {
      // Re-throw ExcelReadError as-is; wrap other errors.
      if (error instanceof ExcelReadError) {
        throw error;
      }

      // Provide context-aware error messages.
      let message: string;
      if (error instanceof Error) {
        message = error.message;
      } else {
        message = String(error);
      }

      throw new ExcelReadError(
        `Failed to read file "${file.name}": ${message}`
      );
    }
  }

  /**
   * Converts a browser File object to an ArrayBuffer.
   *
   * @param file - The File to convert.
   * @returns Promise resolving to the file contents as an ArrayBuffer.
   * @throws {ExcelReadError} If the file cannot be read.
   */
  private async fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event: ProgressEvent<FileReader>) => {
        const buffer = event.target?.result;
        if (buffer instanceof ArrayBuffer) {
          resolve(buffer);
        } else {
          reject(new ExcelReadError('FileReader did not return an ArrayBuffer'));
        }
      };

      reader.onerror = () => {
        reject(
          new ExcelReadError(
            `FileReader error: ${reader.error?.message || 'Unknown'}`
          )
        );
      };

      reader.onabort = () => {
        reject(new ExcelReadError('FileReader aborted'));
      };

      // Begin reading the file.
      reader.readAsArrayBuffer(file);
    });
  }
}
