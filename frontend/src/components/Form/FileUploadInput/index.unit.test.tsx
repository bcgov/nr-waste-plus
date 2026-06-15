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

    render(<FileUploadInput processor={processor} onProcessed={onProcessed} />);

    const file = new File(['id,name,email\n1,Alice,alice@example.com'], 'customers.csv', {
      type: 'text/csv',
    });
    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
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

    render(<FileUploadInput processor={processor} onProcessed={onProcessed} />);

    const file = new File(['id,name\n1,Alice'], 'customers.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
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

    render(
      <FileUploadInput processor={processor} onProcessed={onProcessed} maxFileSizeBytes={10} />,
    );

    const bigFile = new File(['x'.repeat(20)], 'big.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
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

    render(
      <FileUploadInput processor={processor} onProcessed={onProcessed} maxFileSizeBytes={5} />,
    );

    const bigFile = new File(['x'.repeat(20)], 'big.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
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

    render(<FileUploadInput processor={processor} onProcessed={onProcessed} maxFiles={1} />);

    const f1 = new File(['1'], 'a.csv', { type: 'text/csv' });
    const f2 = new File(['2'], 'b.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
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

    render(<FileUploadInput processor={processor} onProcessed={onProcessed} maxFiles={2} />);

    const f1 = new File(['1'], 'a.csv', { type: 'text/csv' });
    const f2 = new File(['2'], 'b.csv', { type: 'text/csv' });
    const f3 = new File(['3'], 'c.csv', { type: 'text/csv' });
    const f4 = new File(['4'], 'd.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
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

    render(<FileUploadInput processor={processor} onProcessed={onProcessed} maxFiles={3} />);

    const f1 = new File(['a'], 'a.csv', { type: 'text/csv' });
    const f2 = new File(['b'], 'b.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
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

    render(<FileUploadInput processor={processor} onProcessed={onProcessed} />);

    const f = new File(['x'], 'pending.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
    const user = userEvent.setup();

    const uploadPromise = user.upload(input, f);
    await waitFor(() => expect(mockLoad).toHaveBeenCalled());

    // File should be visible as "uploading"
    const fileItems = screen.queryAllByTestId('file-upload-item');
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

    render(<FileUploadInput processor={processor} onProcessed={onProcessed} maxFiles={2} />);

    const f1 = new File(['a'], 'a.csv', { type: 'text/csv' });
    const f2 = new File(['b'], 'b.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
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

    render(<FileUploadInput processor={processor} onProcessed={onProcessed} maxFiles={2} />);

    const f1 = new File(['a'], 'a.csv', { type: 'text/csv' });
    const f2 = new File(['b'], 'b.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
    const user = userEvent.setup();

    const uploadPromise = user.upload(input, [f1, f2]);
    await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(2));

    // Resolve in reverse order
    d2.resolve({ success: true, data: [{ id: '2', name: 'B', email: 'b@b.com' }] });
    // Still waiting for first file to resolve — onProcessed should NOT be called yet
    expect(onProcessed).not.toHaveBeenCalled();

    d1.resolve({ success: true, data: [{ id: '1', name: 'A', email: 'a@a.com' }] });
    await uploadPromise;

    await waitFor(() => expect(onProcessed).toHaveBeenCalled());
  });

  // --------------------------------------------------------------------------
  // Race condition: concurrent batch uploads
  // --------------------------------------------------------------------------
  it('emits complete accumulated data when two batches are added concurrently', async () => {
    // Two deferred processors: batch A and batch B start before either resolves.
    const dA = deferred<ProcessorResult<TestCustomer>>();
    const dB = deferred<ProcessorResult<TestCustomer>>();

    let callCount = 0;
    const mockLoad = vi
      .fn<(file: File) => Promise<ProcessorResult<TestCustomer>>>()
      .mockImplementation(() => {
        callCount++;
        return callCount === 1 ? dA.promise : dB.promise;
      });

    const processor = createMockProcessor();
    processor.load = mockLoad;
    const onProcessed = vi.fn<(results: TestCustomer[]) => void>();

    render(<FileUploadInput processor={processor} onProcessed={onProcessed} maxFiles={2} />);

    const fA = new File(['a'], 'a.csv', { type: 'text/csv' });
    const fB = new File(['b'], 'b.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
    const user = userEvent.setup();

    // Upload both files in the same batch so both processors run concurrently.
    const uploadPromise = user.upload(input, [fA, fB]);
    await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(2));

    // Neither has resolved yet — no emission expected.
    expect(onProcessed).not.toHaveBeenCalled();

    // Resolve B first (simulates B finishing before A).
    dB.resolve({ success: true, data: [{ id: 'B', name: 'B-user', email: 'b@b.com' }] });
    // A still pending — no emission yet (Promise.all waits for both).
    expect(onProcessed).not.toHaveBeenCalled();

    // Resolve A.
    dA.resolve({ success: true, data: [{ id: 'A', name: 'A-user', email: 'a@a.com' }] });
    await uploadPromise;

    // The useEffect-based emission must include BOTH batches — not just B's data.
    await waitFor(() => expect(onProcessed).toHaveBeenCalled());
    const lastEmit = onProcessed.mock.calls.at(-1)?.[0] ?? [];
    expect(lastEmit).toHaveLength(2);
    expect(lastEmit.map((c) => c.id).sort()).toEqual(['A', 'B']);
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

    render(
      <FileUploadInput
        processor={processor}
        onProcessed={onProcessed}
        externalErrors={['External error']}
        maxFiles={1}
      />,
    );

    const file = new File(['x'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
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

    render(<FileUploadInput processor={processor} onProcessed={onProcessed} accept=".csv,.txt" />);

    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
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

    render(<FileUploadInput processor={processor} onProcessed={onProcessed} maxFiles={1} />);

    const input1 = screen.getAllByLabelText(
      'Drag and drop files here or click to upload',
    )[0] as HTMLInputElement;
    expect(input1.hasAttribute('multiple')).toBe(false);

    render(<FileUploadInput processor={processor} onProcessed={onProcessed} maxFiles={3} />);

    const input2 = screen.getAllByLabelText(
      'Drag and drop files here or click to upload',
    )[1] as HTMLInputElement;
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

    render(<FileUploadInput processor={processor} onProcessed={onProcessed} disabled={true} />);

    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
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

    render(<FileUploadInput processor={processor} onProcessed={onProcessed} />);

    const file = new File(['invalid'], 'bad.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
    const user = userEvent.setup();

    // Upload file that will fail processing
    await user.upload(input, file);

    // Wait for processor to complete
    await waitFor(() => expect(mockLoad).toHaveBeenCalled());

    // onProcessed should not be called when all files fail
    expect(onProcessed).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Validator prop tests
// ============================================================================

describe('FileUploadInput (validator prop)', () => {
  it('blocks processing when validator returns errors', async () => {
    const validator = vi.fn().mockResolvedValue(['Invalid file format']);
    const processor = createMockProcessor();
    const onProcessed = vi.fn();

    render(
      <FileUploadInput
        processor={processor}
        validator={validator}
        onProcessed={onProcessed}
      />,
    );

    const file = new File(['dummy'], 'bad.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
    const user = userEvent.setup();
    await user.upload(input, file);

    await waitFor(() => {
      expect(validator).toHaveBeenCalled();
    });
    expect(processor.load).not.toHaveBeenCalled();
    const errorText = await screen.findByText('Invalid file format');
    expect(errorText).toBeDefined();
  });

  it('calls processor when validator returns empty', async () => {
    const validator = vi.fn().mockResolvedValue([]);
    const processor = createMockProcessor();
    const onProcessed = vi.fn();

    render(
      <FileUploadInput
        processor={processor}
        validator={validator}
        onProcessed={onProcessed}
      />,
    );

    const file = new File(['id,name,email\n1,Alice,alice@example.com'], 'customers.csv', {
      type: 'text/csv',
    });
    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
    const user = userEvent.setup();
    await user.upload(input, file);

    await waitFor(() => {
      expect(processor.load).toHaveBeenCalled();
    });
  });

  it('skips validator for oversized files (size guard first)', async () => {
    const validator = vi.fn().mockResolvedValue(['Should not be called']);
    const processor = createMockProcessor();
    const onProcessed = vi.fn();

    render(
      <FileUploadInput
        processor={processor}
        validator={validator}
        onProcessed={onProcessed}
        maxFileSizeBytes={10}
      />,
    );

    const file = new File(['x'.repeat(20)], 'big.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
    const user = userEvent.setup();
    await user.upload(input, file);

    await screen.findByText(/exceeds the maximum file size/);
    expect(validator).not.toHaveBeenCalled();
    expect(processor.load).not.toHaveBeenCalled();
  });

  it('handles mixed batch: validator blocks one, passes another', async () => {
    const validator = vi
      .fn<(file: File) => Promise<string[]>>()
      .mockImplementation(async (file: File) => {
        if (file.name === 'bad.xlsx') return ['Invalid format'];
        return [];
      });
    const processor = createMockProcessor();
    const onProcessed = vi.fn();

    render(
      <FileUploadInput
        processor={processor}
        validator={validator}
        onProcessed={onProcessed}
        maxFiles={3}
      />,
    );

    const goodFile = new File(['data'], 'good.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const badFile = new File(['data'], 'bad.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
    const user = userEvent.setup();
    await user.upload(input, [goodFile, badFile]);

    await waitFor(() => {
      expect(validator).toHaveBeenCalledTimes(2);
    });
    expect(processor.load).toHaveBeenCalledTimes(1);
    await screen.findByText('Invalid format');
  });

  it('shows validator error and skips processing for that file', async () => {
    const validator = vi.fn().mockResolvedValue(['Header column missing']);
    const badProcessor = createMockProcessor(
      vi.fn().mockResolvedValue({ success: true, data: [] }),
    );
    const onProcessed = vi.fn();

    render(
      <FileUploadInput
        processor={badProcessor}
        validator={validator}
        onProcessed={onProcessed}
      />,
    );

    const file = new File(['data'], 'bad.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
    const user = userEvent.setup();
    await user.upload(input, file);

    await screen.findByText('Header column missing');
    expect(badProcessor.load).not.toHaveBeenCalled();
  });

  it('calls onProcessed when validator passes and processor succeeds', async () => {
    const validator = vi.fn().mockResolvedValue([]);
    const processor = createMockProcessor(
      vi.fn().mockResolvedValue({
        success: true,
        data: [{ id: '1', name: 'A', email: 'a@a.com' }],
      }),
    );
    const onProcessed = vi.fn();

    render(
      <FileUploadInput
        processor={processor}
        validator={validator}
        onProcessed={onProcessed}
      />,
    );

    const file = new File(['data'], 'valid.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
    const user = userEvent.setup();
    await user.upload(input, file);

    await waitFor(() => expect(onProcessed).toHaveBeenCalled());
  });

  it('does not call onProcessed when validator blocks all files', async () => {
    const validator = vi.fn().mockResolvedValue(['Blocked']);
    const processor = createMockProcessor();
    const onProcessed = vi.fn();

    render(
      <FileUploadInput
        processor={processor}
        validator={validator}
        onProcessed={onProcessed}
      />,
    );

    const file = new File(['data'], 'blocked.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const input = screen.getByLabelText(
      'Drag and drop files here or click to upload',
    ) as HTMLInputElement;
    const user = userEvent.setup();
    await user.upload(input, file);

    await waitFor(() => expect(validator).toHaveBeenCalled());
    expect(onProcessed).not.toHaveBeenCalled();
  });

  it('works without validator prop (backward compat)', () => {
    const processor = createMockProcessor();
    expect(() =>
      render(<FileUploadInput processor={processor} onProcessed={vi.fn()} />),
    ).not.toThrow();
  });
});
