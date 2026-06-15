/**
 * Column descriptor produced by a processor alongside its parsed data.
 *
 * Similar to the `TableHeaderType` contract used by `TableResource` so that
 * consumers can map/cast `headers` into a table header configuration with minimal effort.
 *
 * `renderAs` returns `unknown` here to keep this contract framework-agnostic;
 * cast to `(value: unknown) => ReactNode` at the call site.
 */
export interface ProcessorColumnHeader {
  /** Data-access key matching the key used in each parsed row object. */
  key: string;
  /** Human-readable column label for display. */
  header: string;
  /** Optional cell renderer — cast to `(value: unknown) => ReactNode` at the call site. */
  renderAs?: (value: unknown) => unknown;
}

/**
 * Represents a successful file processing result.
 *
 * @template T - The domain object type produced by the processor.
 */
export interface ProcessorSuccess<T> {
  success: true;
  /** Parsed domain objects extracted from the file. */
  data: T[];
  /**
   * Optional column descriptors derived from the file headers + any column map.
   * Present when the processor generates them; consumers may use them directly
   * as `TableHeaderType` entries.
   */
  headers?: ProcessorColumnHeader[];
}

/**
 * Represents a successful matrix processing result.
 *
 * The matrix is keyed by the first-column value. Each key maps to an array of
 * value objects to naturally handle duplicate row keys.
 *
 * @template V - The type of each value object stored under a matrix key.
 */
export interface ProcessorMatrixSuccess<V> {
  success: true;
  matrix: true;
  /** Keyed map: rowKey → array of value records (array handles duplicate keys). */
  data: Record<string, V[]>;
  /**
   * Optional column descriptors for the value columns (key column excluded).
   * Present when the processor generates them.
   */
  headers?: ProcessorColumnHeader[];
}

/**
 * Represents a failed file processing result.
 */
export interface ProcessorFailure {
  success: false;
  /** Human-readable error messages to display on the file row. */
  errors: string[];
}

/**
 * Union result type returned by {@link FileProcessor.load}.
 *
 * @template T - The domain object type produced by the processor.
 * @template V - The value object type for matrix results (defaults to `T`).
 */
export type ProcessorResult<T, V = T> =
  | ProcessorSuccess<T>
  | ProcessorMatrixSuccess<V>
  | ProcessorFailure;

/**
 * Contract for a pluggable file processor.
 *
 * The processor owns all file-specific logic:
 * - file type / extension validation
 * - schema / header validation
 * - parsing (CSV columns, XLSX sheets, JSON keys, XML nodes, …)
 * - per-row validation and transformation
 *
 * The `FileUploadInput` component only handles selection, display, size guards,
 * and slot limits. It knows nothing about file structure or business rules.
 *
 * @template T - The domain object type produced by this processor.
 *
 * @example <caption>Complete processor: extension check, header validation, Zod row parsing</caption>
 * import { z } from 'zod';
 * import { type FileProcessor, type ProcessorResult } from '@/components/Form/FileUploadInput/fileProcessor';
 *
 * const customerRowSchema = z.object({
 *   id:    z.string().min(1, 'id is required'),
 *   name:  z.string().min(1, 'name is required'),
 *   email: z.string().email('email must be a valid email address'),
 * });
 * export type Customer = z.infer<typeof customerRowSchema>;
 *
 * export class CustomerCsvProcessor implements FileProcessor<Customer> {
 *   async load(file: File): Promise<ProcessorResult<Customer>> {
 *     // 1. Extension guard — fail fast before reading any bytes.
 *     if (!file.name.toLowerCase().endsWith('.csv')) {
 *       return { success: false, errors: [`"${file.name}" must be a .csv file.`] };
 *     }
 *
 *     const lines = (await file.text()).trim().split(/\r?\n/);
 *     if (lines.length < 2) {
 *       return { success: false, errors: [`"${file.name}" contains no data rows.`] };
 *     }
 *
 *     // 2. Header validation — normalise to lowercase, trim whitespace.
 *     const [headerLine, ...dataLines] = lines;
 *     const headers = headerLine.split(',').map(h => h.trim().toLowerCase());
 *     const required = ['id', 'name', 'email'] as const;
 *     const missing  = required.filter(col => !headers.includes(col));
 *     if (missing.length > 0) {
 *       return { success: false, errors: [`Missing required columns: ${missing.join(', ')}.`] };
 *     }
 *
 *     // 3. Row-by-row Zod validation — collect ALL errors before returning.
 *     const customers: Customer[] = [];
 *     const rowErrors: string[] = [];
 *
 *     for (let i = 0; i < dataLines.length; i++) {
 *       const line = dataLines[i].trim();
 *       if (!line) continue; // skip blank lines
 *       const values = line.split(',').map(v => v.trim());
 *       const raw    = Object.fromEntries(headers.map((h, j) => [h, values[j] ?? '']));
 *       const result = customerRowSchema.safeParse(raw);
 *       if (result.success) {
 *         customers.push(result.data);
 *       } else {
 *         rowErrors.push(`Row ${i + 2}: ${result.error.issues.map(e => e.message).join('; ')}`);
 *       }
 *     }
 *
 *     if (rowErrors.length > 0) return { success: false, errors: rowErrors };
 *     if (customers.length === 0) return { success: false, errors: [`"${file.name}" contains no data rows.`] };
 *     return { success: true, data: customers };
 *   }
 * }
 *
 * @example <caption>Edge case: row-level errors are collected and returned all at once</caption>
 * // Upload: id,name,email / 1,Alice,not-an-email / 2,,bob@example.com
 * // Result: { success: false, errors: [
 * //   'Row 2: email must be a valid email address',
 * //   'Row 3: name is required',
 * // ]}
 * // The component surfaces every error on the file row — never throws.
 */
export interface FileProcessor<T> {
  load(file: File): Promise<ProcessorResult<T>>;
}
