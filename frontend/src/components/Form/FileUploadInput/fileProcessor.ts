/**
 * Represents a successful file processing result.
 *
 * @template T - The domain object type produced by the processor.
 */
export interface ProcessorSuccess<T> {
  success: true;
  /** Parsed domain objects extracted from the file. */
  data: T[];
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
 */
export type ProcessorResult<T> = ProcessorSuccess<T> | ProcessorFailure;

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
 * @example
 * class CustomerCsvProcessor implements FileProcessor<Customer> {
 *   async load(file: File): Promise<ProcessorResult<Customer>> { ... }
 * }
 */
export interface FileProcessor<T> {
  load(file: File): Promise<ProcessorResult<T>>;
}
