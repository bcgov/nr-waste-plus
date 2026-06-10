/**
 * A single row-level validation failure.
 */
export interface RowError {
  /** 1-based row number in the source spreadsheet. */
  readonly row: number;

  /** Column header name as it appears in the spreadsheet. */
  readonly column: string;

  /** Human-readable error message. */
  readonly message: string;
}

/**
 * The output of the full parse → map → validate pipeline.
 * Represents successful records alongside row-level validation errors.
 *
 * @template T - The type of successfully parsed and validated records.
 *
 * @example
 * ```typescript
 * const result: ImportResult<WasteVolumeDTO> = {
 *   validRecords: [{ district: 'Interior', volume: 123 }],
 *   errors: [{ row: 2, column: 'volume', message: 'Must be a number' }]
 * };
 * ```
 */
export interface ImportResult<T> {
  /** Successfully parsed and validated records. */
  readonly validRecords: readonly T[];

  /** Row-level validation errors. */
  readonly errors: readonly RowError[];
}
