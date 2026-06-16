import * as XLSX from 'xlsx';

/**
 * A merged cell range within a worksheet, using 0-based, inclusive row/column indices.
 */
export interface MergeRange {
  /** 0-based index of the first row spanned by the merge. */
  readonly startRow: number;
  /** 0-based index of the last row spanned by the merge (inclusive). */
  readonly endRow: number;
  /** 0-based index of the first column spanned by the merge. */
  readonly startCol: number;
  /** 0-based index of the last column spanned by the merge (inclusive). */
  readonly endCol: number;
}

/**
 * Raw worksheet contents: cell values plus the worksheet's merged cell ranges.
 *
 * Returned by {@link ExcelReader.readRawWithMerges} for callers that need to
 * resolve multi-row or merged headers themselves.
 */
export interface RawSheet {
  /**
   * Cell values, padded to the sheet's column range; `null` for empty cells.
   * Only the top-left cell of a merged range carries a value — every other
   * cell in the range is `null`.
   */
  readonly rows: unknown[][];

  /** Merged cell ranges defined on the worksheet, if any. */
  readonly merges: readonly MergeRange[];
}

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
 * Reads Excel (.xlsx) and CSV (.csv) files and converts rows to plain JavaScript objects
 * or raw cell arrays.
 *
 * This layer is responsible only for loading the workbook, selecting the worksheet,
 * and converting rows into plain objects (or raw arrays) keyed by column header. It is
 * completely decoupled from validation, mapping, or any UI concerns — a pure
 * file-reading service.
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
   * This service provides a low-level interface for reading spreadsheet files
   * (XLSX, CSV) from a browser File object. It handles the conversion of
   * the file into an ArrayBuffer and utilizes the SheetJS library to parse
   * the workbook content.
   *
   * @param file - The browser File object representing the uploaded spreadsheet.
   * @param sheetName - [Optional] The specific worksheet name to read. Defaults to the first sheet.
   * @returns A Promise resolving to an array of objects, where each object represents a row
   *           with keys derived from the spreadsheet's header row.
   * @throws {ExcelReadError} If the file is malformed, inaccessible, or contains no valid sheets.
   *
   * @remarks
   * - **Data Integrity**: This service does not perform any schema validation or data mapping.
   *   The returned objects contain raw values as they appear in the spreadsheet.
   * - **Performance**: Large files may cause significant memory usage during the `arrayBuffer()`
   *   conversion and SheetJS parsing.
   * - **Compatibility**: Supports standard `.xlsx`, `.xls`, and `.csv` formats.
   * - **Header assumption**: Uses SheetJS's default behavior of treating row 1 as the
   *   header row. For sheets with multi-row or merged headers, use {@link readRaw} instead.
   *
   * @example
   * ```typescript
   * const reader = new ExcelReader();
   * const file = new File([buffer], 'data.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
   *
   * try {
   *   const rows = await reader.read(file);
   *   // Example output: [{ "District": "Interior", "Volume": "123" }, ...]
   *   console.log(rows);
   * } catch (error) {
   *   if (error instanceof ExcelReadError) {
   *     console.error('File read failed:', error.message);
   *   }
   * }
   * ```
   */
  async read(file: File, sheetName?: string): Promise<Record<string, unknown>[]> {
    return this.withSheet(file, sheetName, (sheet) =>
      XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null }),
    );
  }

  /**
   * Reads an Excel or CSV file and returns raw rows as arrays of cell values,
   * with no header interpretation applied.
   *
   * This is the right entry point for sheets whose headers don't fit SheetJS's
   * "row 1 = header" assumption — e.g. multi-row headers, merged header cells,
   * or sheets where the data doesn't start on row 1. Callers are responsible for
   * interpreting the leading rows themselves (see e.g. `ExcelDataProcessor`,
   * which composes multi-row headers from the result).
   *
   * @param file - The browser File object representing the uploaded spreadsheet.
   * @param sheetName - [Optional] The specific worksheet name to read. Defaults to the first sheet.
   * @returns A Promise resolving to an array of rows, each row being an array of cell
   *           values (`null` for empty cells, padded to the sheet's column range).
   * @throws {ExcelReadError} If the file is malformed, inaccessible, or contains no valid sheets.
   *
   * @example
   * ```typescript
   * const reader = new ExcelReader();
   * const rows = await reader.readRaw(file);
   * // Example output: [
   * //   ['District', 'Dry Belt m3/ha', null, ...],
   * //   [null, 'Avoidable Sawlog', 'Avoidable Grade 4', ...],
   * //   ['DCC', 2.04, 7.05, ...],
   * // ]
   * ```
   */
  async readRaw(file: File, sheetName?: string): Promise<unknown[][]> {
    return this.withSheet(file, sheetName, (sheet) =>
      XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: null,
        blankrows: false,
      }),
    );
  }

  /**
   * Reads an Excel or CSV file and returns raw rows together with the worksheet's
   * merged cell ranges.
   *
   * This is the merge-aware counterpart to {@link readRaw}. Sheets with multi-row
   * headers often use horizontal merges to express "group" titles that visually
   * span several columns (e.g. "Dry Belt m3/ha" spanning four sub-columns like
   * "Avoidable Sawlog", "Avoidable Grade 4", "Unavoidable", "Total"). SheetJS only
   * stores the value in the merge's top-left cell — the `merges` returned here let
   * a caller (see `ExcelDataProcessor`) correctly propagate that value across the
   * columns the merge spans, rather than guessing based on adjacent empty cells.
   *
   * @param file - The browser File object representing the uploaded spreadsheet.
   * @param sheetName - [Optional] The specific worksheet name to read. Defaults to the first sheet.
   * @returns A Promise resolving to the sheet's raw rows and merged cell ranges.
   * @throws {ExcelReadError} If the file is malformed, inaccessible, or contains no valid sheets.
   */
  async readRawWithMerges(file: File, sheetName?: string): Promise<RawSheet> {
    return this.withSheet(file, sheetName, (sheet) => ({
      rows: XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: null,
        blankrows: false,
      }),
      merges: (sheet['!merges'] ?? []).map((range) => ({
        startRow: range.s.r,
        endRow: range.e.r,
        startCol: range.s.c,
        endCol: range.e.c,
      })),
    }));
  }

  /**
   * Returns the names of all worksheets in the workbook.
   *
   * Useful for callers that need to inspect workbook structure (e.g. which sheets
   * exist) before deciding how to process the file.
   *
   * @param file - The browser File object representing the uploaded spreadsheet.
   * @returns A Promise resolving to an array of worksheet name strings.
   * @throws {ExcelReadError} If the file is malformed or inaccessible.
   */
  async listSheets(file: File): Promise<string[]> {
    try {
      const arrayBuffer = await this.fileToArrayBuffer(file);
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      return workbook.SheetNames;
    } catch (error) {
      if (error instanceof ExcelReadError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new ExcelReadError(`Failed to read file "${file.name}": ${message}`);
    }
  }

  /**
   * Loads a file, resolves the target worksheet, and applies a SheetJS conversion
   * to it — sharing the file-reading and error-handling logic between {@link read}
   * and {@link readRaw}.
   *
   * @param file - The browser File object representing the uploaded spreadsheet.
   * @param sheetName - [Optional] The specific worksheet name to read. Defaults to the first sheet.
   * @param convert - Converts the resolved worksheet into the desired return shape.
   * @returns The result of `convert` applied to the resolved worksheet.
   * @throws {ExcelReadError} If the file is malformed, inaccessible, or contains no valid sheets.
   */
  private async withSheet<T>(
    file: File,
    sheetName: string | undefined,
    convert: (sheet: XLSX.WorkSheet) => T,
  ): Promise<T> {
    try {
      // Convert File to ArrayBuffer for SheetJS.
      const arrayBuffer = await this.fileToArrayBuffer(file);

      // Read workbook with SheetJS.
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Determine which sheet to read: explicit name or first sheet.
      let sheet = sheetName
        ? workbook.Sheets[sheetName]
        : workbook.Sheets[workbook.SheetNames[0]];

      // Fallback: try trimmed name match (aligns with identifySpreadsheet).
      if (!sheet && sheetName) {
        const trimmed = sheetName.trim();
        const match = workbook.SheetNames.find((n) => n.trim() === trimmed);
        if (match) sheet = workbook.Sheets[match];
      }

      if (!sheet) {
        const availableSheets = workbook.SheetNames.join(', ') || 'none';
        const targetSheet = sheetName
          ? `Sheet "${sheetName}" not found`
          : 'No sheets found in workbook';
        throw new Error(`${targetSheet}. Available: ${availableSheets}`);
      }

      return convert(sheet);
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

      throw new ExcelReadError(`Failed to read file "${file.name}": ${message}`);
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
    try {
      return await file.arrayBuffer();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ExcelReadError(`Failed to read file: ${message}`);
    }
  }
}
