import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';

import { type FileProcessor, type ProcessorResult } from './fileProcessor';

import FileUploadInput from './index';

// ============================================================================
// Type-safe test utilities
// ============================================================================

interface TestCustomer {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

function createMockProcessor(
  implementation?: (file: File) => Promise<ProcessorResult<TestCustomer>>,
): FileProcessor<TestCustomer> {
  return {
    load: implementation || vi.fn().mockResolvedValue({ success: true, data: [] }),
  };
}

// ============================================================================
// Error handling and deletion tests
// ============================================================================

describe('FileUploadInput (error handling and deletion)', () => {
  it('records and tracks per-file errors from processor', async () => {
    const mockLoad = vi
      .fn<(file: File) => Promise<ProcessorResult<TestCustomer>>>()
      .mockResolvedValue({
        success: false,
        errors: ['Invalid email format', 'Name field is required'],
      });

    const processor = createMockProcessor();
    processor.load = mockLoad;
    const onProcessed = vi.fn<(results: TestCustomer[]) => void>();

    render(<FileUploadInput processor={processor} onProcessed={onProcessed} />);

    const file = new File(['invalid'], 'bad.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
    const user = userEvent.setup();

    await user.upload(input, file);

    // Verify file item is rendered with error state
    await waitFor(() => {
      const fileItems = screen.queryAllByTestId('file-upload-item');
      expect(fileItems.length).toBeGreaterThan(0);
    });

    // onProcessed should not be called when processor returns failure
    expect(onProcessed).not.toHaveBeenCalled();
  });

  it('processes multiple files and aggregates results', async () => {
    const mockLoad = vi
      .fn<(file: File) => Promise<ProcessorResult<TestCustomer>>>()
      .mockResolvedValueOnce({ success: true, data: [{ id: '1', name: 'A', email: 'a@a.com' }] })
      .mockResolvedValueOnce({ success: true, data: [{ id: '2', name: 'B', email: 'b@b.com' }] });

    const processor = createMockProcessor();
    processor.load = mockLoad;
    const onProcessed = vi.fn<(results: TestCustomer[]) => void>();

    render(<FileUploadInput processor={processor} onProcessed={onProcessed} maxFiles={2} />);

    const f1 = new File(['a'], 'a.csv', { type: 'text/csv' });
    const f2 = new File(['b'], 'b.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
    const user = userEvent.setup();

    // Upload 2 files at once
    await user.upload(input, [f1, f2]);
    await waitFor(() => expect(onProcessed).toHaveBeenCalledTimes(1));
    expect(onProcessed).toHaveBeenLastCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: '1' }),
        expect.objectContaining({ id: '2' }),
      ]),
    );

    // Verify 2 file items are rendered
    const fileItems = screen.queryAllByTestId('file-upload-item');
    expect(fileItems.length).toBe(2);
  });

  it('rejects additional files when at max capacity', async () => {
    const mockLoad = vi
      .fn<(file: File) => Promise<ProcessorResult<TestCustomer>>>()
      .mockResolvedValue({
        success: true,
        data: [{ id: '1', name: 'A', email: 'a@a.com' }],
      });

    const processor = createMockProcessor();
    processor.load = mockLoad;
    const onProcessed = vi.fn<(results: TestCustomer[]) => void>();

    render(<FileUploadInput processor={processor} onProcessed={onProcessed} maxFiles={1} />);

    // Try uploading 2 files when maxFiles is 1
    const f1 = new File(['a'], 'a.csv', { type: 'text/csv' });
    const f2 = new File(['b'], 'b.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
    const user = userEvent.setup();

    await user.upload(input, [f1, f2]);

    // Processor should only be called once (first file accepted)
    await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(1));
  });

  it('deletes file and clears its data and errors', async () => {
    const mockLoad = vi
      .fn<(file: File) => Promise<ProcessorResult<TestCustomer>>>()
      .mockResolvedValue({
        success: true,
        data: [{ id: '1', name: 'A', email: 'a@a.com' }],
      });

    const processor = createMockProcessor();
    processor.load = mockLoad;
    const onProcessed = vi.fn<(results: TestCustomer[]) => void>();

    render(<FileUploadInput processor={processor} onProcessed={onProcessed} />);

    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
    const user = userEvent.setup();

    // Upload file and wait for it to be processed
    await user.upload(input, file);
    await waitFor(() =>
      expect(onProcessed).toHaveBeenCalledWith([{ id: '1', name: 'A', email: 'a@a.com' }]),
    );

    // Carbon FileUploaderItem (status="edit") renders a close button with
    // aria-label="<iconDescription> - <filename>"
    const deleteButton = screen.getByRole('button', { name: /- test\.csv$/i });
    await user.click(deleteButton);

    // File row should be removed from the DOM
    expect(screen.queryAllByTestId('file-upload-item')).toHaveLength(0);

    // onProcessed should be called again with an empty array
    await waitFor(() => {
      const calls = onProcessed.mock.calls;
      expect(calls.at(-1)?.[0]).toEqual([]);
    });
  });

  it('rejects all files when capacity is zero', async () => {
    const mockLoad = vi
      .fn<(file: File) => Promise<ProcessorResult<TestCustomer>>>()
      .mockResolvedValue({
        success: true,
        data: [{ id: '1', name: 'A', email: 'a@a.com' }],
      });

    const processor = createMockProcessor();
    processor.load = mockLoad;
    const onProcessed = vi.fn<(results: TestCustomer[]) => void>();

    render(<FileUploadInput processor={processor} onProcessed={onProcessed} maxFiles={0} />);

    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
    const user = userEvent.setup();

    // Try uploading a file when maxFiles is 0
    await user.upload(input, file);

    // Processor should never be called
    expect(mockLoad).not.toHaveBeenCalled();
    // onProcessed should not be called
    expect(onProcessed).not.toHaveBeenCalled();
  });

  it('processes processor success results correctly', async () => {
    const mockLoad = vi
      .fn<(file: File) => Promise<ProcessorResult<TestCustomer>>>()
      .mockResolvedValue({
        success: true,
        data: [{ id: '1', name: 'Test', email: 'test@example.com' }],
      });

    const processor = createMockProcessor();
    processor.load = mockLoad;
    const onProcessed = vi.fn<(results: TestCustomer[]) => void>();

    render(<FileUploadInput processor={processor} onProcessed={onProcessed} />);

    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
    const user = userEvent.setup();

    // Upload file
    await user.upload(input, file);

    // Wait for processor call
    await waitFor(() => expect(mockLoad).toHaveBeenCalled());

    // onProcessed should be called with the processed data
    expect(onProcessed).toHaveBeenCalledWith([
      { id: '1', name: 'Test', email: 'test@example.com' },
    ]);
  });
});
