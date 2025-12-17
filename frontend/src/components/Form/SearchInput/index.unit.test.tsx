import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import SearchInput from './index';

const setup = (overrides: Partial<React.ComponentProps<typeof SearchInput>> = {}) => {
  const props = {
    id: 'search-input',
    label: 'Search',
    placeholder: 'Search...',
    value: '',
    onChange: vi.fn(),
    ...overrides,
  };
  render(<SearchInput {...props} />);
  const input = screen.getByRole('searchbox', { name: props.placeholder });

  return { props, input };
};

describe('SearchInput (browser)', () => {
  it('renders with accessible label and placeholder', () => {
    const { props } = setup();
    // Root wrapper rendered
    expect(screen.getByTestId(props.id)).toBeDefined();
    // Input is labeled for accessibility
    expect(screen.getByRole('searchbox', { name: props.placeholder })).toBeDefined();
    // Clear button (from Carbon) should be present by its accessible name
    expect(screen.getByLabelText('Clear search input')).toBeDefined();
  });

  it('calls onChange with typed value when Enter blurs the input', async () => {
    const { input, props } = setup({ value: '' });
    await userEvent.type(input, 'hello{enter}');
    expect(props.onChange).toHaveBeenCalledTimes(1);
    expect(props.onChange).toHaveBeenCalledWith('hello');
  });

  it('calls onChange on blur with the current value (without pressing Enter)', async () => {
    const { input, props } = setup({ value: '' });
    await userEvent.type(input, 'carbon');
    // Trigger blur explicitly; component onKeyDown handles Enter, but blur should work as well
    (input as HTMLInputElement).blur();
    expect(props.onChange).toHaveBeenCalledTimes(1);
    expect(props.onChange).toHaveBeenCalledWith('carbon');
  });

  it('respects initial default value and appends typed text', async () => {
    const { input, props } = setup({ value: 'abc' });
    await userEvent.type(input, '123{enter}');
    expect(props.onChange).toHaveBeenCalledWith('abc123');
  });

  it('calls onSearch when Enter is pressed', async () => {
    const onSearch = vi.fn();
    const { input } = setup({ value: '', onSearch });
    await userEvent.type(input, 'test query{enter}');
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it('does not call onSearch when onSearch is not provided', async () => {
    const { input, props } = setup({ value: '' });
    await userEvent.type(input, 'test{enter}');
    // Should not throw error, just verify onChange was called
    expect(props.onChange).toHaveBeenCalledWith('test');
  });

  it('calls onSearch without calling onChange multiple times on Enter', async () => {
    const onSearch = vi.fn();
    const { input, props } = setup({ value: '', onSearch });
    await userEvent.type(input, 'search term{enter}');
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(props.onChange).toHaveBeenCalledTimes(1);
  });
});
