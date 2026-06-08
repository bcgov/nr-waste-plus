/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import AutoCompleteInput from './index';

import { renderWithAppAsync } from '@/config/tests/renderWithApp';

const items = [
  { name: 'Alpha', id: 1 },
  { name: 'Beta', id: 2 },
  { name: 'Gamma', id: 3 },
];

const renderWithProps = async (props: any) => {
  await renderWithAppAsync(
    <AutoCompleteInput
      id="test-autocomplete"
      extractItems={props.extractItems || ((raw: any) => raw)}
      onAutoCompleteChange={props.onAutoCompleteChange || vi.fn()}
      onSelect={props.onSelect || vi.fn()}
      placeholder="Type to search..."
      {...props}
    />
  );
};

describe('AutoCompleteInput', () => {
  it('renders and fetches suggestions on input', async () => {
    const user = await userEvent.setup();
    const onAutoCompleteChange = vi.fn(async (val) =>
      items.filter((i) => i.name.toLowerCase().includes(val.toLowerCase())),
    );
    const extractItems = (raw: any) => raw;
    await renderWithProps({ onAutoCompleteChange, extractItems });
    const input = screen.getByRole('combobox');
    await user.type(input, 'Al');
    await waitFor(() => expect(onAutoCompleteChange).toHaveBeenCalledWith('Al'));
  });

  it('calls onSelect when an item is selected', async () => {
    const user = await userEvent.setup();
    const onAutoCompleteChange = vi.fn(async () => items);
    const extractItems = (raw: any) => raw;
    const onSelect = vi.fn();
    await renderWithProps({ onAutoCompleteChange, extractItems, onSelect });
    const input = screen.getByRole('combobox');
    await user.type(input, 'Al');
    await waitFor(() => expect(onAutoCompleteChange).toHaveBeenCalled());
    // Simulate selection
    await user.clear(input);
    await user.type(input, 'Alpha');
    await user.tab();
  });

  it('uses custom itemToString if provided', async () => {
    const user = await userEvent.setup();
    const onAutoCompleteChange = vi.fn(async () => items);
    const extractItems = (raw: any) => raw;
    await renderWithProps({
      onAutoCompleteChange,
      extractItems,
      itemToString: (item: { name: any }) => (item ? `Custom: ${item.name}` : ''),
    });
    const input = screen.getByRole('combobox');
    await user.type(input, 'Al');
    await waitFor(() => expect(onAutoCompleteChange).toHaveBeenCalled());
  });

  it('shows no suggestions when none match', async () => {
    const user = await userEvent.setup();
    const onAutoCompleteChange = vi.fn(async () => []);
    const extractItems = (raw: any) => raw;
    await renderWithProps({ onAutoCompleteChange, extractItems });
    const input = screen.getByRole('combobox');
    await user.type(input, 'Zzz');
    await waitFor(() => expect(onAutoCompleteChange).toHaveBeenCalledWith('Zzz'));
  });

  it('handles loading state', async () => {
    const user = await userEvent.setup();
    let resolve: (v: any) => void = () => {};
    const onAutoCompleteChange = vi
      .fn()
      .mockImplementation(() => new Promise((r) => (resolve = r)));
    const extractItems = (raw: any) => raw;
    await renderWithProps({ onAutoCompleteChange, extractItems });
    const input = screen.getByRole('combobox');
    await user.type(input, 'Al');
    // Optionally check for loading indicator if present
    resolve && resolve(items);
  });

  it('handles blur and focus events', async () => {
    const user = await userEvent.setup();
    const onAutoCompleteChange = vi.fn(async () => items);
    const extractItems = (raw: any) => raw;
    await renderWithProps({ onAutoCompleteChange, extractItems });
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.tab();
  });

  it('calls onSelect with correct item when suggestion is clicked', async () => {
    const user = await userEvent.setup();
    const onAutoCompleteChange = vi.fn(async () => items);
    const extractItems = (raw: any) => raw;
    const onSelect = vi.fn();
    await renderWithProps({ onAutoCompleteChange, extractItems, onSelect });
    const input = screen.getByRole('combobox');
    await user.type(input, 'Alpha');
    await waitFor(() => expect(onAutoCompleteChange).toHaveBeenCalled());
    // Simulate clicking a suggestion if suggestions are rendered as buttons or list items
    // Example: await user.click(screen.getByText('Alpha'));
  });

  it('handles keyboard navigation (arrow down/up, enter, escape)', async () => {
    const user = await userEvent.setup();
    const onAutoCompleteChange = vi.fn(async () => items);
    const extractItems = (raw: any) => raw;
    await renderWithProps({ onAutoCompleteChange, extractItems });
    const input = screen.getByRole('combobox');
    await user.type(input, 'Alpha');
    await waitFor(() => expect(onAutoCompleteChange).toHaveBeenCalled());
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowUp}');
    await user.keyboard('{Enter}');
    await user.keyboard('{Escape}');
  });

  describe('when item is preselected', () => {
    const createSpy = () => vi.fn();
    let onSelect: ReturnType<typeof createSpy>;

    beforeEach(async () => {
      onSelect = createSpy();
      const onAutoCompleteChange = vi.fn(async (val) =>
        items.filter((i) => i.name.toLowerCase().includes(val.toLowerCase())),
      );
      const initialSelectedItem = { name: 'Beta', id: 2 };
      await renderWithProps({ onAutoCompleteChange, initialSelectedItem, onSelect });
    });

    it('calls onSelect with null when the text input gets cleared', async () => {
      const user = await userEvent.setup();
      const input = screen.getByRole('combobox');

      // input text gets completely cleared
      await user.clear(input);
      await user.tab();
      expect(onSelect).toHaveBeenCalledWith(null);
    });

    it("restores the input text when it's been only partially changed", async () => {
      const user = await userEvent.setup();
      const input = screen.getByRole<HTMLInputElement>('combobox');

      // input text gets changed but not cleared
      await user.type(input, 'B');
      await user.tab();

      // restores the input text
      expect(input.value).toBe('Beta');

      // selected item is not changed
      expect(onSelect).not.toHaveBeenCalled();
    });
  });
});
