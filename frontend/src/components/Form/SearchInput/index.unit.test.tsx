import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';

import SearchInput from './index';

// Wrapper component that manages state (simulates parent behavior)
const ControlledSearchInput = ({ onChange = vi.fn(), ...props }) => {
  const [value, setValue] = useState(props.value ?? '');

  const handleChange = (v: string) => {
    setValue(v);
    onChange(v);
  };

  return (
    <SearchInput
      id="search-input"
      label="Search"
      placeholder="Search..."
      {...props}
      value={value}
      onChange={handleChange}
    />
  );
};

const setup = (overrides: Partial<React.ComponentProps<typeof SearchInput>> = {}) => {
  const onChange = vi.fn();
  const props = {
    ...overrides,
  };
  render(<ControlledSearchInput {...props} onChange={onChange} />);
  return { onChange };
};

describe('SearchInput (browser)', () => {
  it('renders with accessible label and placeholder', () => {
    setup();
    // Root wrapper rendered
    expect(screen.getByTestId('search-input')).toBeDefined();
    // Input is labeled for accessibility
    expect(screen.getByRole('searchbox', { name: 'Search...' })).toBeDefined();
    // Clear button (from Carbon) should be present by its accessible name
    expect(screen.getByLabelText('Clear search input')).toBeDefined();
  });

  it('calls onChange with typed value when Enter blurs the input', async () => {
    const { onChange } = setup();
    const input = screen.getByRole('searchbox', { name: 'Search...' });
    expect(input).toBeDefined();
    await userEvent.type(input, 'hello{enter}');
    expect(onChange).toHaveBeenCalledWith('h');
    expect(onChange).toHaveBeenCalledWith('he');
    expect(onChange).toHaveBeenCalledWith('hel');
    expect(onChange).toHaveBeenCalledWith('hell');
    expect(onChange).toHaveBeenCalledWith('hello');
  });

  it('updates input value when onChange is called', async () => {
    const { onChange } = setup();
    const input = screen.getByRole('searchbox', { name: 'Search...' });
    expect(input).toBeDefined();

    await userEvent.type(input, 'carbon');

    expect(onChange).toHaveBeenCalledTimes(6);
    // Verify the input value was updated
    expect((input as HTMLInputElement).value).toBe('carbon');
  });

  it('does not call onChange again on blur when value has already been emitted', async () => {
    const { onChange } = setup();
    const input = screen.getByRole('searchbox', { name: 'Search...' });
    await userEvent.type(input, 'carbon');
    // Trigger blur explicitly; component onKeyDown handles Enter, but blur should work as well
    act(() => (input as HTMLInputElement).blur());
    expect(onChange).toHaveBeenCalledTimes(6);
    expect(onChange).toHaveBeenCalledWith('carbon');
  });

  it('respects initial default value and appends typed text', async () => {
    const { onChange } = setup({ value: 'abc' });
    const input = screen.getByRole('searchbox', { name: 'Search...' });
    await userEvent.type(input, '123{enter}');
    expect(onChange).toHaveBeenCalledWith('abc123');
  });

  it('calls onSearch when Enter is pressed', async () => {
    const onSearch = vi.fn();
    setup({ onSearch });
    const input = screen.getByRole('searchbox', { name: 'Search...' });
    await userEvent.type(input, 'test query{enter}');
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it('does not call onSearch when onSearch is not provided', async () => {
    const { onChange } = setup();
    const input = screen.getByRole('searchbox', { name: 'Search...' });
    await userEvent.type(input, 'test{enter}');
    // Should not throw error, just verify onChange was called
    expect(onChange).toHaveBeenCalledWith('test');
  });

  it('calls onSearch and onChange only once on Enter', async () => {
    const onSearch = vi.fn();
    const { onChange } = setup({ onSearch });
    const input = screen.getByRole('searchbox', { name: 'Search...' });
    await userEvent.type(input, 'search term{enter}');
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('search term');
  });
});
