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

function deferred<T>() {
  let resolve: (val: T) => void = () => {};
  let reject: (reason?: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createMockProcessor(
  implementation?: (file: File) => Promise<ProcessorResult<TestCustomer>>,
): FileProcessor<TestCustomer> {
  return {
    load: implementation || vi.fn().mockResolvedValue({ success: true, data: [] }),
  };
}

// ============================================================================
// Core processor pipeline tests
// ============================================================================

describe('FileUploadInput (processor pipeline)', () => {
  it('calls processor.load and emits onProcessed on success', async () => {
    const mockLoad = vi
      .fn<(file: File) => Promise<ProcessorResult<TestCustomer>>>()
      .mockResolvedValue({
        success: true,
        data: [{ id: '1', name: 'Alice', email: 'alice@example.com' }],
      });
    const processor = createMockProcessor();
    processor.load = mockLoad;
    const onProcessed = vi.fn<(results: TestCustomer[]) => void>();

    const { container } = render(
      <FileUploadInput processor={processor} onProcessed={onProcessed} />,
    );

    const file = new File(['id,name,email\n1,Alice,alice@example.com'], 'customers.csv', {
      type: 'text/csv',
    });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const user = userEvent.setup();
    await user.upload(input, file);

    await waitFor(() => expect(mockLoad).toHaveBeenCalled());
    await waitFor(() => expect(onProcessed).toHaveBeenCalled());
    expect(onProcessed).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: '1', name: 'Alice', email: 'alice@example.com' }),
      ]),
    );
  });

  it('shows file errors when processor returns failure', async () => {
    const mockLoad = vi
      .fn<(file: File) => Promise<ProcessorResult<TestCustomer>>>()
      .mockResolvedValue({
        success: false,
        errors: ['Bad header: missing email column'],
      });
    const processor = createMockProcessor();
    processor.load = mockLoad;
    const onProcessed = vi.fn<(results: TestCustomer[]) => void>();

    const { container } = render(
      <FileUploadInput processor={processor} onProcessed={onProcessed} />,
    );

    const file = new File(['id,name\n1,Alice'], 'customers.csv', { type: 'text/csv' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const user = userEvent.setup();
    await user.upload(input, file);

    await waitFor(() => expect(mockLoad).toHaveBeenCalled());
    // Error should appear in DOM
    await screen.findByText('Bad header: missing email column');
  });

  it('does not call onProcessed when all files fail size check', async () => {
    const mockLoad = vi
      .fn<(file: File) => Promise<ProcessorResult<TestCustomer>>>()
      .mockResolvedValue({
        success: true,
        data: [],
      });
    const processor = createMockProcessor();
    processor.load = mockLoad;
    const onProcessed = vi.fn<(results: TestCustomer[]) => void>();

    const { container } = render(
      <FileUploadInput processor={processor} onProcessed={onProcessed} maxFileSizeBytes={10} />,
    );

    const bigFile = new File(['x'.repeat(20)], 'big.csv', { type: 'text/csv' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const user = userEvent.setup();

    await user.upload(input, bigFile);
    await screen.findByText(/exceeds the maximum file size/);

    // processor should not be called for oversized files
    expect(mockLoad).not.toHaveBeenCalled();
    // onProcessed should not be called when no files were successfully processed
    expect(onProcessed).not.toHaveBeenCalled();
  });

  it('skips processor for oversized individual files', async () => {
    const mockLoad = vi
      .fn<(file: File) => Promise<ProcessorResult<TestCustomer>>>()
      .mockResolvedValue({
        success: true,
        data: [{ id: '1', name: 'Bob', email: 'bob@example.com' }],
      });
    const processor = createMockProcessor();
    processor.load = mockLoad;
    const onProcessed = vi.fn<(results: TestCustomer[]) => void>();

    const { container } = render(
      <FileUploadInput processor={processor} onProcessed={onProcessed} maxFileSizeBytes={5} />,
    );

    const bigFile = new File(['x'.repeat(20)], 'big.csv', { type: 'text/csv' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const user = userEvent.setup();

    // Upload oversized file
    await user.upload(input, bigFile);

    // processor should NOT be called for oversized files
    expect(mockLoad).not.toHaveBeenCalled();
    // onProcessed should NOT be called when no files were successfully processed
    expect(onProcessed).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Capacity and file count tests
// ============================================================================

describe('FileUploadInput (capacity management)', () => {
  it('rejects files when at max capacity', async () => {
    const mockLoad = vi
      .fn<(file: File) => Promise<ProcessorResult<TestCustomer>>>()
      .mockResolvedValue({
        success: true,
        data: [{ id: '1', name: 'Alice', email: 'alice@example.com' }],
      });
    const processor = createMockProcessor();
    processor.load = mockLoad;
    const onProcessed = vi.fn<(results: TestCustomer[]) => void>();

    const { container } = render(
      <FileUploadInput processor={processor} onProcessed={onProcessed} maxFiles={1} />,
    );

    const f1 = new File(['1'], 'a.csv', { type: 'text/csv' });
    const f2 = new File(['2'], 'b.csv', { type: 'text/csv' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const user = userEvent.setup();

    // Upload first file (accepted)
    await user.upload(input, f1);
    await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(1));

    // Upload second file (should hit capacity early-bail)
    await user.upload(input, f2);

    // Expect component-level message about max already selected
    await screen.findByText(/Maximum of 1 file/);
    // Processor should still only have been called once
    expect(mockLoad).toHaveBeenCalledTimes(1);
  });

  it('shows skipped files message when exceeding capacity in batch', async () => {
    const mockLoad = vi
      .fn<(file: File) => Promise<ProcessorResult<TestCustomer>>>()
      .mockResolvedValue({
        success: true,
        data: [{ id: '1', name: 'Alice', email: 'alice@example.com' }],
      });
    const processor = createMockProcessor();
    processor.load = mockLoad;
    const onProcessed = vi.fn<(results: TestCustomer[]) => void>();

    const { container } = render(
      <FileUploadInput processor={processor} onProcessed={onProcessed} maxFiles={2} />,
    );

    const f1 = new File(['1'], 'a.csv', { type: 'text/csv' });
    const f2 = new File(['2'], 'b.csv', { type: 'text/csv' });
    const f3 = new File(['3'], 'c.csv', { type: 'text/csv' });
    const f4 = new File(['4'], 'd.csv', { type: 'text/csv' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const user = userEvent.setup();

    // Upload 4 files but max is 2
    await user.upload(input, [f1, f2, f3, f4]);

    await screen.findByText(/2 files were not added/);
    expect(mockLoad).toHaveBeenCalledTimes(2);
  });

  it('aggregates processed results across multiple files', async () => {
    const mockLoad = vi
      .fn<(file: File) => Promise<ProcessorResult<TestCustomer>>>()
      .mockResolvedValueOnce({
        success: true,
        data: [{ id: '1', name: 'Alice', email: 'a@a.com' }],
      })
      .mockResolvedValueOnce({
        success: true,
        data: [
          { id: '2', name: 'Bob', email: 'b@b.com' },
          { id: '3', name: 'Charlie', email: 'c@c.com' },
        ],
      });

    const processor = createMockProcessor();
    processor.load = mockLoad;
    const onProcessed = vi.fn<(results: TestCustomer[]) => void>();

    const { container } = render(
      <FileUploadInput processor={processor} onProcessed={onProcessed} maxFiles={3} />,
    );

    const f1 = new File(['a'], 'a.csv', { type: 'text/csv' });
    const f2 = new File(['b'], 'b.csv', { type: 'text/csv' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const user = userEvent.setup();

    await user.upload(input, f1);
    await waitFor(() => expect(onProcessed).toHaveBeenCalledTimes(1));

    await user.upload(input, f2);
    await waitFor(() => expect(onProcessed).toHaveBeenCalledTimes(2));

    // Last call should have all 3 records
    const lastCall = onProcessed.mock.calls.at(-1)?.[0] ?? [];
    expect(lastCall).toHaveLength(3);
    expect(lastCall.map((c) => c.id)).toEqual(['1', '2', '3']);
  });
});

// ============================================================================
// Async processor lifecycle tests
// ============================================================================

describe('FileUploadInput (async processor lifecycle)', () => {
  it('shows uploading status while processor promise is pending', async () => {
    const d = deferred<ProcessorResult<TestCustomer>>();
    const mockLoad = vi
      .fn<(file: File) => Promise<ProcessorResult<TestCustomer>>>()
      .mockImplementation(() => d.promise);

    const processor = createMockProcessor();
    processor.load = mockLoad;
    const onProcessed = vi.fn<(results: TestCustomer[]) => void>();

    const { container } = render(
      <FileUploadInput processor={processor} onProcessed={onProcessed} />,
    );

    const f = new File(['x'], 'pending.csv', { type: 'text/csv' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const user = userEvent.setup();

    const uploadPromise = user.upload(input, f);
    await waitFor(() => expect(mockLoad).toHaveBeenCalled());

    // File should be visible as "uploading"
    const fileItems = container.querySelectorAll('.file-upload-item');
    expect(fileItems.length).toBeGreaterThan(0);

    // onProcessed should not be called while pending
    expect(onProcessed).not.toHaveBeenCalled();

    // Resolve the pending processor
    d.resolve({ success: true, data: [{ id: '1', name: 'Test', email: 'test@test.com' }] });
    await uploadPromise;

    await waitFor(() => expect(onProcessed).toHaveBeenCalled());
  });

  it('handles multiple files with different completion times', async () => {
    const d1 = deferred<ProcessorResult<TestCustomer>>();
    const d2 = deferred<ProcessorResult<TestCustomer>>();

    let callCount = 0;
    const mockLoad = vi
      .fn<(file: File) => Promise<ProcessorResult<TestCustomer>>>()
      .mockImplementation(() => {
        callCount++;
        return callCount === 1 ? d1.promise : d2.promise;
      });

    const processor = createMockProcessor();
    processor.load = mockLoad;
    const onProcessed = vi.fn<(results: TestCustomer[]) => void>();

    const { container } = render(
      <FileUploadInput processor={processor} onProcessed={onProcessed} maxFiles={2} />,
    );

    const f1 = new File(['a'], 'a.csv', { type: 'text/csv' });
    const f2 = new File(['b'], 'b.csv', { type: 'text/csv' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const user = userEvent.setup();

    const uploadPromise = user.upload(input, [f1, f2]);

    // Both should be in processing
    await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(2));
    expect(onProcessed).not.toHaveBeenCalled();

    // Resolve first one
    d1.resolve({ success: true, data: [{ id: '1', name: 'A', email: 'a@a.com' }] });
    // Second one should still be pending
    expect(onProcessed).not.toHaveBeenCalled();

    // Resolve second one
    d2.resolve({ success: true, data: [{ id: '2', name: 'B', email: 'b@b.com' }] });
    await uploadPromise;

    await waitFor(() => expect(onProcessed).toHaveBeenCalled());
    const finalData = onProcessed.mock.calls.at(0)?.[0];
    expect(finalData).toHaveLength(2);
  });

  it('emits results only after all pending processors complete', async () => {
    const d1 = deferred<ProcessorResult<TestCustomer>>();
    const d2 = deferred<ProcessorResult<TestCustomer>>();

    let callCount = 0;
    const mockLoad = vi
      .fn<(file: File) => Promise<ProcessorResult<TestCustomer>>>()
      .mockImplementation(() => {
        callCount++;
        return callCount === 1 ? d1.promise : d2.promise;
      });

    const processor = createMockProcessor();
    processor.load = mockLoad;
    const onProcessed = vi.fn<(results: TestCustomer[]) => void>();

    const { container } = render(
      <FileUploadInput processor={processor} onProcessed={onProcessed} maxFiles={2} />,
    );

    const f1 = new File(['a'], 'a.csv', { type: 'text/csv' });
    const f2 = new File(['b'], 'b.csv', { type: 'text/csv' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const user = userEvent.setup();

    const uploadPromise = user.upload(input, [f1, f2]);
    await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(2));

    // Resolve in reverse order
    d2.resolve({ success: true, data: [{ id: '2', name: 'B', email: 'b@b.com' }] });
    await new Promise((res) => setTimeout(res, 10)); // brief pause
    expect(onProcessed).not.toHaveBeenCalled(); // Still waiting for first

    d1.resolve({ success: true, data: [{ id: '1', name: 'A', email: 'a@a.com' }] });
    await uploadPromise;

    await waitFor(() => expect(onProcessed).toHaveBeenCalled());
  });
});

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

    const { container } = render(
      <FileUploadInput processor={processor} onProcessed={onProcessed} />,
    );

    const file = new File(['invalid'], 'bad.csv', { type: 'text/csv' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const user = userEvent.setup();

    await user.upload(input, file);

    // Verify file item is rendered with error state
    await waitFor(() => {
      const fileItems = container.querySelectorAll('.file-upload-item--invalid');
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

    const { container } = render(
      <FileUploadInput processor={processor} onProcessed={onProcessed} maxFiles={2} />,
    );

    const f1 = new File(['a'], 'a.csv', { type: 'text/csv' });
    const f2 = new File(['b'], 'b.csv', { type: 'text/csv' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
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
    const fileItems = container.querySelectorAll('.file-upload-item');
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

    const { container } = render(
      <FileUploadInput processor={processor} onProcessed={onProcessed} maxFiles={1} />,
    );

    // Try uploading 2 files when maxFiles is 1
    const f1 = new File(['a'], 'a.csv', { type: 'text/csv' });
    const f2 = new File(['b'], 'b.csv', { type: 'text/csv' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
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

    const { container } = render(
      <FileUploadInput processor={processor} onProcessed={onProcessed} />,
    );

    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
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
    expect(container.querySelectorAll('.file-upload-item')).toHaveLength(0);

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

    const { container } = render(
      <FileUploadInput processor={processor} onProcessed={onProcessed} maxFiles={0} />,
    );

    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
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

    const { container } = render(
      <FileUploadInput processor={processor} onProcessed={onProcessed} />,
    );

    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
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

// ============================================================================
// External errors and UI rendering tests
// ============================================================================

describe('FileUploadInput (external errors and UI)', () => {
  it('renders external errors at component level', async () => {
    const mockLoad = vi
      .fn<(file: File) => Promise<ProcessorResult<TestCustomer>>>()
      .mockResolvedValue({
        success: true,
        data: [],
      });

    const processor = createMockProcessor();
    processor.load = mockLoad;
    const onProcessed = vi.fn<(results: TestCustomer[]) => void>();

    render(
      <FileUploadInput
        processor={processor}
        onProcessed={onProcessed}
        externalErrors={['Server validation failed', 'Please retry']}
      />,
    );

    await screen.findByText('Server validation failed');
    await screen.findByText('Please retry');
  });

  it('renders both component and external errors together', async () => {
    const mockLoad = vi
      .fn<(file: File) => Promise<ProcessorResult<TestCustomer>>>()
      .mockResolvedValue({
        success: false,
        errors: ['Row error'],
      });

    const processor = createMockProcessor();
    processor.load = mockLoad;
    const onProcessed = vi.fn<(results: TestCustomer[]) => void>();

    const { container } = render(
      <FileUploadInput
        processor={processor}
        onProcessed={onProcessed}
        externalErrors={['External error']}
        maxFiles={1}
      />,
    );

    const file = new File(['x'], 'test.csv', { type: 'text/csv' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const user = userEvent.setup();

    await user.upload(input, file);
    await screen.findByText('Row error');
    await screen.findByText('External error');
  });

  it('respects accept attribute', async () => {
    const mockLoad = vi
      .fn<(file: File) => Promise<ProcessorResult<TestCustomer>>>()
      .mockResolvedValue({
        success: true,
        data: [],
      });

    const processor = createMockProcessor();
    processor.load = mockLoad;
    const onProcessed = vi.fn<(results: TestCustomer[]) => void>();

    const { container } = render(
      <FileUploadInput processor={processor} onProcessed={onProcessed} accept=".csv,.txt" />,
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.getAttribute('accept')).toContain('.csv');
    expect(input.getAttribute('accept')).toContain('.txt');
  });

  it('sets multiple attribute based on maxFiles', async () => {
    const mockLoad = vi
      .fn<(file: File) => Promise<ProcessorResult<TestCustomer>>>()
      .mockResolvedValue({
        success: true,
        data: [],
      });

    const processor = createMockProcessor();
    processor.load = mockLoad;
    const onProcessed = vi.fn<(results: TestCustomer[]) => void>();

    const { container: container1 } = render(
      <FileUploadInput processor={processor} onProcessed={onProcessed} maxFiles={1} />,
    );

    const input1 = container1.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input1.hasAttribute('multiple')).toBe(false);

    const { container: container2 } = render(
      <FileUploadInput processor={processor} onProcessed={onProcessed} maxFiles={3} />,
    );

    const input2 = container2.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input2.hasAttribute('multiple')).toBe(true);
  });

  it('renders disabled state', async () => {
    const mockLoad = vi
      .fn<(file: File) => Promise<ProcessorResult<TestCustomer>>>()
      .mockResolvedValue({
        success: true,
        data: [],
      });

    const processor = createMockProcessor();
    processor.load = mockLoad;
    const onProcessed = vi.fn<(results: TestCustomer[]) => void>();

    const { container } = render(
      <FileUploadInput processor={processor} onProcessed={onProcessed} disabled={true} />,
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('handles processor failure without calling onProcessed', async () => {
    const mockLoad = vi
      .fn<(file: File) => Promise<ProcessorResult<TestCustomer>>>()
      .mockResolvedValue({
        success: false,
        errors: ['Invalid data format', 'Missing required columns'],
      });

    const processor = createMockProcessor();
    processor.load = mockLoad;
    const onProcessed = vi.fn<(results: TestCustomer[]) => void>();

    const { container } = render(
      <FileUploadInput processor={processor} onProcessed={onProcessed} />,
    );

    const file = new File(['invalid'], 'bad.csv', { type: 'text/csv' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const user = userEvent.setup();

    // Upload file that will fail processing
    await user.upload(input, file);

    // Wait for processor to complete
    await waitFor(() => expect(mockLoad).toHaveBeenCalled());

    // onProcessed should not be called when all files fail
    expect(onProcessed).not.toHaveBeenCalled();
  });
});
