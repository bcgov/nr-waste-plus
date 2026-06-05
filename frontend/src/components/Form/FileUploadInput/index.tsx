import { FileUploaderDropContainer, FileUploaderItem, FormItem } from '@carbon/react';
import prettyBytes from 'pretty-bytes';
import { type FC, useState, useId } from 'react';

import './index.scss';

/**
 * Props for the `FileUploadInput` component.
 */
interface FileUploadInputProps {
  /** Accept attribute string, e.g. ".csv,.xlsx". Default: ".csv,.xlsx" */
  accept?: string;
  /** Max file size in bytes. Default: 500 KB */
  maxFileSizeBytes?: number;
  /** Maximum number of files selectable. Default: 1 */
  maxFiles?: number;
  /** Called with the current list of valid files on every change. */
  onChange: (files: File[]) => void;
  /**
   * Optional array of per-file validators. Each validator receives a single
   * newly-added file and returns an array of error strings (or a Promise of one)
   * — empty means valid. Validators run only for newly added files; already-
   * validated files are not re-checked.
   */
  validators?: Array<(file: File) => string[] | Promise<string[]>>;
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
 * Reusable file upload component wrapping Carbon's `FileUploaderDropContainer`.
 * Supports configurable slot limits, per-file size validation with accurate error
 * messages, optional cross-file validation, and externally-injected errors.
 */
const FileUploadInput: FC<FileUploadInputProps> = ({
  accept = '.csv,.xlsx',
  maxFileSizeBytes = 500 * 1024,
  maxFiles = 1,
  onChange,
  validators,
  externalErrors = [],
  disabled = false,
}) => {
  const dropId = useId();
  const [trackedFiles, setTrackedFiles] = useState<TrackedFile[]>([]);
  // Per-file errors: uuid → string[]. Only set when errors exist for that file.
  const [fileErrors, setFileErrors] = useState<Map<string, string[]>>(new Map());
  // Component-level messages: slot overflow warnings + validate() results.
  const [componentErrors, setComponentErrors] = useState<string[]>([]);

  const fmt = (bytes: number) => prettyBytes(bytes, { maximumFractionDigits: 1 });

  /** Files that have no entry in fileErrors — these are passed to onChange and validate. */
  const getValidFiles = (tracked: TrackedFile[], errors: Map<string, string[]>): File[] =>
    tracked.filter((t) => !errors.has(t.uuid)).map((t) => t.file);

  const handleAddFiles = async (
    _evt: React.SyntheticEvent<HTMLElement>,
    { addedFiles }: { addedFiles: File[] },
  ): Promise<void> => {
    const slots = maxFiles - trackedFiles.length;

    // Already at capacity — inform the user and bail early.
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
    const newFileErrors = new Map(fileErrors);

    // Per-file size + validator checks — run only for newly added files.
    for (const entry of newEntries) {
      const errors: string[] = [];
      if (entry.file.size > maxFileSizeBytes) {
        errors.push(
          `"${entry.file.name}" exceeds the maximum file size of ${fmt(maxFileSizeBytes)}.`,
        );
      }
      if (validators) {
        for (const validator of validators) {
          errors.push(...(await validator(entry.file)));
        }
      }
      if (errors.length) {
        newFileErrors.set(entry.uuid, errors);
      }
    }

    const newComponentErrors: string[] = [];
    if (skippedCount > 0) {
      newComponentErrors.push(
        `${skippedCount} file${skippedCount === 1 ? ' was' : 's were'} not added — ` +
          `maximum of ${maxFiles} file${maxFiles === 1 ? '' : 's'} allowed.`,
      );
    }

    const validFiles = getValidFiles(allTracked, newFileErrors);
    setTrackedFiles(allTracked);
    setFileErrors(newFileErrors);
    setComponentErrors(newComponentErrors);
    onChange(validFiles);
  };

  const handleDelete = (_evt: React.SyntheticEvent, { uuid }: { uuid: string }) => {
    const remaining = trackedFiles.filter((t) => t.uuid !== uuid);
    const newFileErrors = new Map(fileErrors);
    newFileErrors.delete(uuid);

    const validFiles = getValidFiles(remaining, newFileErrors);
    setTrackedFiles(remaining);
    setFileErrors(newFileErrors);
    setComponentErrors([]);
    onChange(validFiles);
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
        const isInvalid = !!errors?.length;
        return (
          <FileUploaderItem
            className={`file-upload-item ${isInvalid ? 'file-upload-item--invalid' : ''}`}
            key={uuid}
            uuid={uuid}
            name={file.name}
            status="edit"
            invalid={isInvalid}
            errorSubject={errors?.join('; ')}
            onDelete={handleDelete}
          />
        );
      })}
      {allComponentErrors.length > 0 && (
        <div className="file-upload-errors" role="alert">
          {allComponentErrors.map((msg, i) => (
            <p key={i} className="file-upload-error-message">
              {msg}
            </p>
          ))}
        </div>
      )}
    </FormItem>
  );
};

export default FileUploadInput;
