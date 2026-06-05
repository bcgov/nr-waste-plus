import { FileUploaderDropContainer, FileUploaderItem, FormItem } from '@carbon/react';
import prettyBytes from 'pretty-bytes';
import { useState, useId } from 'react';

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
 * @example
 * <FileUploadInput
 *   accept=".csv"
 *   processor={new CustomerCsvProcessor()}
 *   onProcessed={(customers) => form.setFieldValue('customers', customers)}
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

  /** Flat list of all parsed results from currently accepted files. */
  const emitResults = (dataMap: Map<string, T[]>) => {
    onProcessed(Array.from(dataMap.values()).flat());
  };

  const handleAddFiles = async (
    _evt: React.SyntheticEvent<HTMLElement>,
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

        const result = await processor.load(entry.file);
        if (result.success) {
          return { uuid: entry.uuid, errors: [], data: result.data };
        }
        return { uuid: entry.uuid, errors: result.errors, data: null };
      }),
    );

    // Commit results: update errors, processedData, and clear processing flags.
    const nextFileErrors = new Map(fileErrors);
    const nextProcessedData = new Map(processedData);

    for (const { uuid, errors, data } of entryResults) {
      if (errors.length) {
        nextFileErrors.set(uuid, errors);
      }
      if (data !== null) {
        nextProcessedData.set(uuid, data);
      }
    }

    setFileErrors(nextFileErrors);
    setProcessedData(nextProcessedData);
    setProcessingUuids((prev) => {
      const next = new Set(prev);
      for (const { uuid } of entryResults) next.delete(uuid);
      return next;
    });

    // Only emit results if at least one file in this batch was successfully processed
    const hasNewData = entryResults.some(({ data }) => data !== null);
    if (hasNewData) {
      emitResults(nextProcessedData);
    }
  };

  const handleDelete = (_evt: React.SyntheticEvent, { uuid }: { uuid: string }) => {
    setTrackedFiles((prev) => prev.filter((t) => t.uuid !== uuid));

    const nextFileErrors = new Map(fileErrors);
    nextFileErrors.delete(uuid);
    setFileErrors(nextFileErrors);

    const nextProcessedData = new Map(processedData);
    nextProcessedData.delete(uuid);
    setProcessedData(nextProcessedData);

    setComponentErrors([]);
    emitResults(nextProcessedData);
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
