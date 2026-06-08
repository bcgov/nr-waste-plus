import { FileUploaderDropContainer, FileUploaderItem, FormItem } from '@carbon/react';
import prettyBytes from 'pretty-bytes';
import { type SyntheticEvent, useEffect, useId, useState } from 'react';

import { type FileProcessor } from './fileProcessor';

import './index.scss';

/**
 * Props for the generic `FileUploadInput<T>` component.
 *
 * @template T - The domain object type produced by the processor.
 */
interface FileUploadInputProps<T> {
  /** Accept attribute string, e.g. ".csv,.xlsx". Default: ".csv,.xlsx" */
  accept?: string;
  /** Max file size in bytes. Default: 500 KB */
  maxFileSizeBytes?: number;
  /** Maximum number of files selectable. Default: 1 */
  maxFiles?: number;
  /**
   * Pluggable file processor. Owns all file-specific logic: type validation,
   * schema/header validation, parsing, row validation, and transformation into
   * domain objects. The component never inspects file contents directly.
   */
  processor: FileProcessor<T>;
  /** Called with the flat list of all parsed domain objects across all accepted files. */
  onProcessed: (results: T[]) => void;
  /**
   * Externally-injected errors, e.g. from a Zod parse after form submit.
   * Rendered at component level, not attached to individual file rows.
   * The parent is responsible for clearing these when the user corrects the input.
   */
  externalErrors?: string[];
  /** Whether the component is disabled. */
  disabled?: boolean;
}

interface TrackedFile {
  uuid: string;
  file: File;
}

/**
 * Generic file upload component wrapping Carbon's `FileUploaderDropContainer`.
 *
 * Responsibilities:
 * - File selection, display, and lifecycle (add / delete)
 * - Slot limit enforcement
 * - Per-file size guard (before processor is invoked)
 * - Loading state per file while the processor runs
 * - Surfacing per-file processor errors on the corresponding row
 *
 * The component is intentionally ignorant of file structure or business rules —
 * all domain logic lives in the provided {@link FileProcessor}.
 *
 * @template T - The domain object type produced by the processor.
 *
 * @example <caption>Basic: single CSV upload (happy path)</caption>
 * // Instantiate the processor outside the component so the reference is stable.
 * const processor = new CustomerCsvProcessor();
 *
 * <FileUploadInput
 *   accept=".csv"
 *   processor={processor}
 *   onProcessed={(customers) => setState(customers)}
 * />
 *
 * @example <caption>TanStack Form integration with submit-time validation errors</caption>
 * const processor = new CustomerCsvProcessor();
 *
 * <form.Field
 *   name="customers"
 *   validators={{
 *     onSubmit: ({ value }) =>
 *       value.length === 0 ? 'Upload at least one customer file.' : undefined,
 *   }}
 * >
 *   {(field) => (
 *     <FileUploadInput<Customer>
 *       accept=".csv"
 *       processor={processor}
 *       onProcessed={(customers) => field.handleChange(customers)}
 *       externalErrors={
 *         field.state.meta.errors.length > 0
 *           ? field.state.meta.errors.map(String)
 *           : undefined
 *       }
 *     />
 *   )}
 * </form.Field>
 *
 * @example <caption>Edge case: enforce a strict size cap</caption>
 * // Files larger than 100 KB are rejected before the processor runs.
 * <FileUploadInput
 *   processor={processor}
 *   onProcessed={setItems}
 *   maxFileSizeBytes={100 * 1024}
 * />
 *
 * @example <caption>Edge case: multi-file batch with slot overflow warning</caption>
 * // Uploading 4 files when maxFiles={2} shows:
 * // "2 files were not added — maximum of 2 files allowed."
 * <FileUploadInput
 *   accept=".csv"
 *   maxFiles={2}
 *   processor={processor}
 *   onProcessed={setItems}
 * />
 */
function FileUploadInput<T>({
  accept = '.csv,.xlsx',
  maxFileSizeBytes = 500 * 1024,
  maxFiles = 1,
  processor,
  onProcessed,
  externalErrors = [],
  disabled = false,
}: Readonly<FileUploadInputProps<T>>) {
  const dropId = useId();
  const [trackedFiles, setTrackedFiles] = useState<TrackedFile[]>([]);
  // Per-file errors: uuid → string[]. Only populated on failure.
  const [fileErrors, setFileErrors] = useState<Map<string, string[]>>(new Map());
  // UUIDs currently being processed — drives the Carbon "uploading" spinner.
  const [processingUuids, setProcessingUuids] = useState<Set<string>>(new Set());
  // Successfully parsed results per file: uuid → T[].
  const [processedData, setProcessedData] = useState<Map<string, T[]>>(new Map());
  // Component-level messages: slot overflow warnings.
  const [componentErrors, setComponentErrors] = useState<string[]>([]);

  const fmt = (bytes: number) => prettyBytes(bytes, { maximumFractionDigits: 1 });

  // Emit whenever processedData changes. Decoupled from the async handler to
  // avoid stale-closure race conditions when batches are added concurrently.
  // The size===0 guard prevents a spurious empty emission on the initial render.
  // NOTE: onProcessed must be stable (useCallback) in the parent, otherwise
  // this effect fires on every render.
  useEffect(() => {
    if (processedData.size === 0) return;
    onProcessed(Array.from(processedData.values()).flat());
  }, [processedData, onProcessed]);

  const handleAddFiles = async (
    _evt: SyntheticEvent<HTMLElement>,
    { addedFiles }: { addedFiles: File[] },
  ): Promise<void> => {
    const slots = maxFiles - trackedFiles.length;

    if (slots <= 0) {
      setComponentErrors([
        `Maximum of ${maxFiles} file${maxFiles === 1 ? '' : 's'} already selected.`,
      ]);
      return;
    }

    const toAdd = addedFiles.slice(0, slots);
    const skippedCount = addedFiles.length - toAdd.length;

    const newEntries: TrackedFile[] = toAdd.map((file) => ({
      uuid: crypto.randomUUID(),
      file,
    }));

    const allTracked = [...trackedFiles, ...newEntries];

    // Show all new files immediately; mark them as processing.
    setTrackedFiles(allTracked);
    setProcessingUuids((prev) => new Set([...prev, ...newEntries.map((e) => e.uuid)]));

    const componentMessages: string[] = [];
    if (skippedCount > 0) {
      componentMessages.push(
        `${skippedCount} file${skippedCount === 1 ? ' was' : 's were'} not added — ` +
          `maximum of ${maxFiles} file${maxFiles === 1 ? '' : 's'} allowed.`,
      );
    }
    setComponentErrors(componentMessages);

    // Process each new file; size guard runs before the processor is invoked.
    type EntryResult = { uuid: string; errors: string[]; data: T[] | null };

    const entryResults: EntryResult[] = await Promise.all(
      newEntries.map(async (entry): Promise<EntryResult> => {
        if (entry.file.size > maxFileSizeBytes) {
          return {
            uuid: entry.uuid,
            errors: [
              `"${entry.file.name}" exceeds the maximum file size of ${fmt(maxFileSizeBytes)}.`,
            ],
            data: null,
          };
        }

        try {
          const result = await processor.load(entry.file);
          if (result.success) {
            return { uuid: entry.uuid, errors: [], data: result.data };
          }
          return { uuid: entry.uuid, errors: result.errors, data: null };
        } catch {
          return {
            uuid: entry.uuid,
            errors: [`"${entry.file.name}" could not be processed. Please try again.`],
            data: null,
          };
        }
      }),
    );

    // Commit results using functional setState so concurrent add operations
    // compose correctly — each updater always receives the latest state.
    setFileErrors((prev) => {
      const next = new Map(prev);
      for (const { uuid, errors } of entryResults) {
        if (errors.length) next.set(uuid, errors);
      }
      return next;
    });

    setProcessedData((prev) => {
      const next = new Map(prev);
      for (const { uuid, data } of entryResults) {
        if (data !== null) next.set(uuid, data);
      }
      return next;
    });

    setProcessingUuids((prev) => {
      const next = new Set(prev);
      for (const { uuid } of entryResults) next.delete(uuid);
      return next;
    });
    // Emission handled by the useEffect above.
  };

  const handleDelete = (_evt: SyntheticEvent, { uuid }: { uuid: string }) => {
    setTrackedFiles((prev) => prev.filter((t) => t.uuid !== uuid));

    const nextFileErrors = new Map(fileErrors);
    nextFileErrors.delete(uuid);
    setFileErrors(nextFileErrors);

    setProcessedData((prev) => {
      const next = new Map(prev);
      next.delete(uuid);
      return next;
    });

    setComponentErrors([]);
    // Delete is a synchronous, non-concurrent operation; emit directly so an
    // empty result is reported even when processedData reaches size 0 (the
    // useEffect guard skips size===0 to avoid a spurious initial-render emit).
    const nextData = new Map(processedData);
    nextData.delete(uuid);
    onProcessed(Array.from(nextData.values()).flat());
  };

  const allComponentErrors = [...componentErrors, ...externalErrors];

  return (
    <FormItem>
      <p className="cds--file--label">Upload file{maxFiles > 1 ? 's' : ''}</p>
      <p className="cds--label-description">
        Max file size is {fmt(maxFileSizeBytes)}. Supported file types are {accept}.
      </p>
      <FileUploaderDropContainer
        className={`file-upload-dropzone ${disabled ? 'file-upload-dropzone--disabled' : ''}`}
        id={dropId}
        accept={accept.split(',').map((s) => s.trim())}
        labelText="Drag and drop files here or click to upload"
        multiple={maxFiles > 1}
        onAddFiles={handleAddFiles}
        disabled={disabled}
        maxFileSize={maxFileSizeBytes}
      />
      {trackedFiles.map(({ uuid, file }) => {
        const errors = fileErrors.get(uuid);
        const isProcessing = processingUuids.has(uuid);
        const isInvalid = !!errors?.length;
        return (
          <FileUploaderItem
            className={`file-upload-item ${isInvalid ? 'file-upload-item--invalid' : ''}`}
            key={uuid}
            uuid={uuid}
            name={file.name}
            status={isProcessing ? 'uploading' : 'edit'}
            invalid={isInvalid}
            errorSubject={errors?.join('; ')}
            onDelete={handleDelete}
          />
        );
      })}
      {allComponentErrors.length > 0 && (
        <div className="file-upload-errors" role="alert">
          {allComponentErrors.map((msg) => (
            <p key={msg} className="file-upload-error-message">
              {msg}
            </p>
          ))}
        </div>
      )}
    </FormItem>
  );
}

export default FileUploadInput;
