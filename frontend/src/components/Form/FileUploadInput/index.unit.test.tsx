import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import FileUploadInput from './index';

const makeFile = (name: string, sizeBytes: number, type = 'text/csv'): File =>
  new File(['a'.repeat(sizeBytes)], name, { type });

const uploadFile = (container: HTMLElement, file: File) => {
  const input = container.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  Object.defineProperty(input, 'files', {
    value: [file],
    writable: false,
    configurable: true,
  });
  fireEvent.change(input);
};

const renderComponent = (
  props: Partial<React.ComponentProps<typeof FileUploadInput>> = {},
) => {
  const onChange = props.onChange ?? vi.fn();
  const result = render(
    <FileUploadInput label="Upload File" onChange={onChange} {...props} />,
  );
  return { ...result, onChange: onChange as ReturnType<typeof vi.fn> };
};

describe('FileUploadInput', () => {
  it('renders drop zone and label', async () => {
    await act(async () => {
      renderComponent();
    });
    expect(screen.getByText('Upload File')).toBeDefined();
    expect(screen.getAllByText('Drag and drop files here or upload').length).toBeGreaterThan(0);
  });

  it('shows accepted file types description', async () => {
    await act(async () => {
      renderComponent();
    });
    expect(screen.getByText('.csv or .xls, max size 500KB')).toBeDefined();
  });

  it('calls onChange with File[] on file selection', async () => {
    const onChange = vi.fn();
    const { container } = renderComponent({ onChange });
    const file = makeFile('report.csv', 100);

    await act(async () => {
      uploadFile(container, file);
    });

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith([file]);
  });

  it('shows file name after selection', async () => {
    const { container } = renderComponent();
    const file = makeFile('data.csv', 100);

    await act(async () => {
      uploadFile(container, file);
    });

    expect(screen.getByText('data.csv')).toBeDefined();
  });

  it('shows error when file exceeds maxFileSizeBytes', async () => {
    const { container } = renderComponent({ maxFileSizeBytes: 500 });
    const file = makeFile('large.csv', 600);

    await act(async () => {
      uploadFile(container, file);
    });

    const errorEl = container.querySelector('p.cds--form-requirement');
    expect(errorEl).toBeDefined();
    expect(errorEl?.textContent).toBe('File format does not match');
  });

  it('shows error message when validate returns errors', async () => {
    const validate = vi.fn().mockReturnValue(['File format does not match']);
    const { container } = renderComponent({ validate });
    const file = makeFile('bad.txt', 100);

    await act(async () => {
      uploadFile(container, file);
    });

    const errorEl = container.querySelector('p.cds--form-requirement');
    expect(errorEl).toBeDefined();
    expect(errorEl?.textContent).toBe('File format does not match');
  });

  it('shows external errors passed via externalErrors prop', async () => {
    let container: HTMLElement;
    await act(async () => {
      ({ container } = renderComponent({
        externalErrors: ['File format does not match'],
      }));
    });

    const errorEl = container!.querySelector('p.cds--form-requirement');
    expect(errorEl).toBeDefined();
    expect(errorEl?.textContent).toBe('File format does not match');
  });

  it('disables file input when disabled prop is true', async () => {
    let container: HTMLElement;
    await act(async () => {
      ({ container } = renderComponent({ disabled: true }));
    });

    const input = container!.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});
