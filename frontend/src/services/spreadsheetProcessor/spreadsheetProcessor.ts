import { type ColumnMap } from './columnMap';
import { readHeaderRows, resolveHeaders } from './headerParser';
import { type ResultFormatter, toMatrixResult, toTableResult } from './rowBuilders';

import type { ZodType } from 'zod';

import {
  type FileProcessor,
  type ProcessorMatrixSuccess,
  type ProcessorResult,
  type ProcessorSuccess,
} from '@/components/Form/FileUploadInput/fileProcessor';
import { ExcelReader, ExcelReadError, type MergeRange } from '@/services/excelReader/excelReader';

/**
 * Configuration options for {@link SpreadsheetProcessor}.
 *
 * All properties are optional; sensible defaults are applied for each.
 */
export interface SpreadsheetConfig {
  /** Name of the worksheet to read. Defaults to the workbook's first sheet. */
  sheetName?: string;

  /**
   * Number of leading rows that make up the column headers.
   * Defaults to `1`. Use `2` (or more) for spreadsheets with stacked group headers.
   */
  headerRows?: number;

  /**
   * Controls how multi-row headers are resolved into output keys.
   *
   * - `true` (default) — columns that share the same outer segment are grouped
   *   into a single nested object.
   * - `false` — each column produces a flat joined key.
   */
  condensed?: boolean;

  /** Separator for joined keys when `condensed` is `false`. Defaults to `' - '`. */
  headerSeparator?: string;

  /**
   * When `true`, the first column is used as a row key and the result is
   * a keyed matrix (`Record<string, Record<string, unknown>[]>`) instead of
   * a flat array. Defaults to `false`.
   */
  matrix?: boolean;

  /** Drop rows where every data cell is empty or whitespace-only. Defaults to `true`. */
  skipEmptyRows?: boolean;

  /**
   * Optional remapping of natural spreadsheet keys to shorter, code-friendly
   * names and/or human-readable labels.
   */
  columnMap?: ColumnMap;
}

/**
 * Reads an Excel or CSV spreadsheet and converts it into either a flat array
 * of row objects or a keyed matrix, depending on the `matrix` option.
 *
 * Supports multi-row / merged headers via the `headerRows` and `condensed`
 * options, and allows verbose spreadsheet column names to be remapped to
 * code-friendly identifiers via `columnMap`.
 *
 * Optionally accepts a Zod schema for per-row validation and type inference.
 * When a schema is provided, every row is validated; all errors are collected
 * and returned together before any data is emitted.
 *
 * Implements {@link FileProcessor} so it can be passed directly to
 * `FileUploadInput`.
 *
 * @template T - The row object type. Inferred from the schema when provided;
 *   defaults to `Record<string, unknown>` (no validation).
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 * import { SpreadsheetProcessor } from '@/services/spreadsheetProcessor';
 *
 * const districtSchema = z.object({
 *   district: z.string().min(1),
 *   dryBelt: z.number().nonnegative(),
 * });
 *
 * const processor = new SpreadsheetProcessor(
 *   {
 *     sheetName: 'Interior',
 *     headerRows: 2,
 *     condensed: false,
 *     columnMap: {
 *       'District': { key: 'district' },
 *       'Dry Belt m3/ha': { key: 'dryBelt' },
 *     },
 *   },
 *   districtSchema,
 * );
 *
 * const result = await processor.load(file);
 * // result: ProcessorResult<{ district: string; dryBelt: number }>
 * ```
 */
export class SpreadsheetProcessor<
  T extends Record<string, unknown> = Record<string, unknown>,
> implements FileProcessor<T> {
  private readonly reader = new ExcelReader();
  private readonly options: Required<SpreadsheetConfig>;
  private readonly schema?: ZodType<T>;

  constructor(options: SpreadsheetConfig = {}, schema?: ZodType<T>) {
    this.options = {
      sheetName: options.sheetName ?? '',
      headerRows: options.headerRows ?? 1,
      condensed: options.condensed ?? true,
      headerSeparator: options.headerSeparator ?? ' - ',
      matrix: options.matrix ?? false,
      skipEmptyRows: options.skipEmptyRows ?? true,
      columnMap: options.columnMap ?? {},
    };
    this.schema = schema;
  }

  async load(file: File): Promise<ProcessorResult<T>> {
    try {
      const { rows, merges } = await this.readSheet(file, this.options.sheetName);
      const { headerRows } = this.options;

      if (rows.length <= headerRows) {
        return { success: false, errors: [`"${file.name}" contains no data rows.`] };
      }

      const columnSegments = readHeaderRows(rows.slice(0, headerRows), merges);
      const resolvedHeaders = resolveHeaders(
        columnSegments,
        this.options.condensed,
        this.options.headerSeparator,
      );
      const dataRows = rows.slice(headerRows);

      const formatter: ResultFormatter = this.options.matrix ? toMatrixResult : toTableResult;
      const result = formatter(
        dataRows,
        resolvedHeaders,
        this.options.columnMap,
        this.options.skipEmptyRows,
      ) as
        | ProcessorSuccess<Record<string, unknown>>
        | ProcessorMatrixSuccess<Record<string, unknown>>;

      if (this.schema) {
        return this.applyValidation(result);
      }

      return result as unknown as ProcessorResult<T>;
    } catch (error) {
      if (error instanceof ExcelReadError) {
        return { success: false, errors: [error.message] };
      }
      return {
        success: false,
        errors: [`"${file.name}" could not be processed. Please try again.`],
      };
    }
  }

  private applyValidation(
    result:
      | ProcessorSuccess<Record<string, unknown>>
      | ProcessorMatrixSuccess<Record<string, unknown>>,
  ): ProcessorResult<T> {
    if (Array.isArray(result.data)) {
      return this.validateFlat(result as ProcessorSuccess<Record<string, unknown>>);
    }
    return this.validateMatrix(result as ProcessorMatrixSuccess<Record<string, unknown>>);
  }

  private validateFlat(result: ProcessorSuccess<Record<string, unknown>>): ProcessorResult<T> {
    const { data, errors } = this.parseRows(result.data);
    if (errors.length > 0) return { success: false, errors };
    return { success: true, data, headers: result.headers };
  }

  private validateMatrix(
    result: ProcessorMatrixSuccess<Record<string, unknown>>,
  ): ProcessorResult<T> {
    const allErrors: string[] = [];
    const data: Record<string, T[]> = {};

    for (const [key, rows] of Object.entries(result.data)) {
      const { data: validated, errors } = this.parseRows(rows);
      if (errors.length > 0) {
        allErrors.push(...errors.map((e) => `[${key}] ${e}`));
      }
      data[key] = validated;
    }

    if (allErrors.length > 0) return { success: false, errors: allErrors };
    return { success: true, matrix: true, data, headers: result.headers };
  }

  private parseRows(rows: Record<string, unknown>[]): { data: T[]; errors: string[] } {
    const data: T[] = [];
    const errors: string[] = [];
    const schema = this.schema!;

    for (let i = 0; i < rows.length; i++) {
      const parsed = schema.safeParse(rows[i]);
      if (parsed.success) {
        data.push(parsed.data);
      } else {
        const messages = parsed.error.issues.map((issue: { message: string }) => issue.message);
        errors.push(`Row ${i + 1}: ${messages.join('; ')}`);
      }
    }

    return { data, errors };
  }

  private async readSheet(
    file: File,
    sheetName: string,
  ): Promise<{ rows: unknown[][]; merges: readonly MergeRange[] }> {
    return this.reader.readRawWithMerges(file, sheetName || undefined);
  }
}
