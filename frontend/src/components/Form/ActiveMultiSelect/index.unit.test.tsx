import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';

import ActiveMultiSelect from './index';

type CodeItem = { code: string; description: string };
type ValueItem = { value: string; label: string };

const items: CodeItem[] = [
  { code: 'A', description: 'Alpha' },
  { code: 'B', description: 'Beta' },
  { code: 'C', description: 'Gamma' },
];

const valueItems: ValueItem[] = [
  { value: 'X', label: 'X-ray' },
  { value: 'Y', label: 'Yankee' },
];

const itemToString = (item: CodeItem | null) => (item ? `${item.code} - ${item.description}` : '');

const valueItemToString = (item: ValueItem | null) => (item ? `${item.value} - ${item.label}` : '');

const getPlaceholderInput = () => screen.getByRole('combobox');

const openDropdown = async (user?: ReturnType<typeof userEvent.setup>) => {
  const button = (await screen.findAllByTitle('Open'))[0] as HTMLButtonElement;
  if (user) {
    await user.click(button);
  } else {
    button.click();
  }
};

/**
 * A controlled wrapper that manages selectedItems state,
 * mimicking how the parent component behaves in real usage.
 */
const ControlledMultiSelect = ({
  initialSelected = [],
  onChangeSpy,
  placeholder = 'Select...',
  testItems = items,
  testItemToString = itemToString,
  id = 'test-multiselect',
}: {
  initialSelected?: CodeItem[];
  onChangeSpy?: (changes: { selectedItems: CodeItem[] }) => void;
  placeholder?: string;
  testItems?: CodeItem[];
  testItemToString?: (item: CodeItem | null) => string;
  id?: string;
}) => {
  const [selected, setSelected] = useState<CodeItem[]>(initialSelected);
  return (
    <ActiveMultiSelect
      placeholder={placeholder}
      id={id}
      items={testItems}
      itemToString={testItemToString}
      selectedItems={selected}
      onChange={(changes) => {
        setSelected(changes.selectedItems);
        if (onChangeSpy) onChangeSpy(changes);
      }}
    />
  );
};

describe('ActiveMultiSelect', () => {
  it('renders with placeholder and items', async () => {
    render(
      <ActiveMultiSelect
        placeholder="Select..."
        id="test-multiselect"
        items={items}
        itemToString={itemToString}
        onChange={vi.fn()}
        selectedItems={[]}
      />,
    );
    await openDropdown();
    expect(getPlaceholderInput()).toHaveProperty('placeholder', 'Select...');
    screen.getByText('A - Alpha');
    screen.getByText('B - Beta');
    screen.getByText('C - Gamma');
  });

  it('calls onChange when an item is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ActiveMultiSelect
        placeholder="Select..."
        id="test-multiselect"
        items={items}
        itemToString={itemToString}
        onChange={onChange}
        selectedItems={[]}
      />,
    );
    await openDropdown(user);
    await user.click(screen.getByText('A - Alpha'));
    expect(onChange).toHaveBeenCalled();
  });

  it('shows selected items', async () => {
    render(
      <ActiveMultiSelect
        placeholder="Select..."
        id="test-multiselect"
        items={items}
        itemToString={itemToString}
        onChange={vi.fn()}
        selectedItems={[items[1]]}
      />,
    );
    await openDropdown();
    screen.getByText('B - Beta');
  });

  it('updates placeholder to show selected code values', async () => {
    const user = userEvent.setup();
    render(<ControlledMultiSelect placeholder="Select..." />);
    await openDropdown(user);
    await user.click(screen.getByText('A - Alpha'));

    expect(getPlaceholderInput()).toHaveProperty('placeholder', 'A');
  });

  it('updates placeholder with multiple selected codes joined by comma', async () => {
    const user = userEvent.setup();
    render(<ControlledMultiSelect placeholder="Select..." />);
    await openDropdown(user);

    await user.click(screen.getByText('A - Alpha'));
    // Wait for placeholder to update to 'A' before selecting next item
    await waitFor(() => {
      expect(getPlaceholderInput()).toHaveProperty('placeholder', 'A');
    });

    await user.click(screen.getByText('B - Beta'));

    await waitFor(() => {
      expect(getPlaceholderInput()).toHaveProperty('placeholder', 'A, B');
    });
  });

  it('restores original placeholder when all items are deselected', async () => {
    const user = userEvent.setup();
    render(<ControlledMultiSelect placeholder="My Placeholder" />);
    await openDropdown(user);

    // Select
    await user.click(screen.getByText('A - Alpha'));
    await waitFor(() => {
      expect(getPlaceholderInput()).toHaveProperty('placeholder', 'A');
    });

    // Deselect by clicking the same item again
    await user.click(screen.getByText('A - Alpha'));

    await waitFor(() => {
      expect(getPlaceholderInput()).toHaveProperty('placeholder', 'My Placeholder');
    });
  });

  it('restores placeholder when selection is cleared via clear button', async () => {
    const user = userEvent.setup();
    render(<ControlledMultiSelect placeholder="Original" />);
    await openDropdown(user);

    // Select an item
    await user.click(screen.getByText('A - Alpha'));
    await waitFor(() => {
      expect(getPlaceholderInput()).toHaveProperty('placeholder', 'A');
    });

    // Click the clear selection button rendered by Carbon
    const clearButton = await screen.findByTitle('Clear selected item');
    await user.click(clearButton);

    await waitFor(() => {
      expect(getPlaceholderInput()).toHaveProperty('placeholder', 'Original');
    });
  });

  it('uses value property when code is not present', async () => {
    const user = userEvent.setup();
    const ControlledValueMultiSelect = () => {
      const [selected, setSelected] = useState<ValueItem[]>([]);
      return (
        <ActiveMultiSelect
          placeholder="Pick one"
          id="test-value-multiselect"
          items={valueItems}
          itemToString={valueItemToString}
          selectedItems={selected}
          onChange={(changes) => setSelected(changes.selectedItems)}
        />
      );
    };

    render(<ControlledValueMultiSelect />);
    await openDropdown(user);
    await user.click(screen.getByText('X - X-ray'));

    await waitFor(() => {
      expect(getPlaceholderInput()).toHaveProperty('placeholder', 'X');
    });
  });

  it('shows skeleton when showSkeleton is true', () => {
    render(
      <ActiveMultiSelect
        showSkeleton
        placeholder="Select..."
        id="test-skeleton"
        items={items}
        itemToString={itemToString}
        onChange={vi.fn()}
        selectedItems={[]}
      />,
    );
    // The skeleton should be rendered, not the multiselect
    screen.getByTestId('active-multiselect-skeleton');
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  describe('onBlur behavior', () => {
    it('calls onBlur when the input element loses focus via userEvent', async () => {
      const user = userEvent.setup();
      const onBlur = vi.fn<(event: FocusEvent) => void>();
      render(
        <ActiveMultiSelect
          placeholder="Select..."
          id="test-multiselect"
          items={items}
          itemToString={itemToString}
          onChange={vi.fn()}
          onBlur={onBlur}
          selectedItems={[]}
        />,
      );

      const input = getPlaceholderInput();
      await user.click(input);
      await user.tab();

      await waitFor(() => {
        expect(onBlur).toHaveBeenCalled();
      });
    });

    it('calls onBlur with FocusEvent when blur occurs', async () => {
      const user = userEvent.setup();
      const onBlur = vi.fn<(event: FocusEvent) => void>();
      render(
        <ActiveMultiSelect
          placeholder="Select..."
          id="test-multiselect"
          items={items}
          itemToString={itemToString}
          onChange={vi.fn()}
          onBlur={onBlur}
          selectedItems={[]}
        />,
      );

      const input = getPlaceholderInput();
      await user.click(input);
      await user.tab();

      await waitFor(() => {
        expect(onBlur).toHaveBeenCalledTimes(1);
      });

      const callArgs = onBlur.mock.calls[0];
      expect(callArgs[0]).toBeDefined();
      expect(callArgs[0].type).toBe('blur');
    });

    it('renders without errors when onBlur prop is not provided', async () => {
      const user = userEvent.setup();
      render(
        <ActiveMultiSelect
          placeholder="Select..."
          id="test-multiselect"
          items={items}
          itemToString={itemToString}
          onChange={vi.fn()}
          selectedItems={[]}
        />,
      );

      const input = getPlaceholderInput();
      expect(input).toBeDefined();

      await user.click(input);
      await user.tab();

      // Test should pass without errors; no onBlur callback to check
      screen.getByRole('combobox');
    });

    it('onBlur is passed through to the underlying FilterableMultiSelect component', async () => {
      const user = userEvent.setup();
      const onBlur = vi.fn<(event: FocusEvent) => void>();
      render(
        <ActiveMultiSelect
          placeholder="Select..."
          id="test-multiselect"
          items={items}
          itemToString={itemToString}
          onChange={vi.fn()}
          onBlur={onBlur}
          selectedItems={[]}
        />,
      );

      const input = getPlaceholderInput() as HTMLInputElement;
      expect(input).toBeDefined();

      // Verify the input is properly rendered
      await user.click(screen.getByRole('combobox'));
      const combobox = screen.getByRole('combobox');
      expect(combobox).toBeTruthy();

      await user.tab();

      // onBlur should be called after blur event
      await waitFor(() => {
        expect(onBlur.mock.calls.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('external selectedItems changes', () => {
    /**
     * Wrapper that allows external manipulation of selectedItems
     * via a button outside the component, simulating parent-driven state changes.
     */
    const ExternalControlMultiSelect = ({
      placeholder = 'Select...',
      onClear,
    }: {
      placeholder?: string;
      onClear: (setSelected: React.Dispatch<React.SetStateAction<CodeItem[]>>) => void;
    }) => {
      const [selected, setSelected] = useState<CodeItem[]>([]);
      return (
        <>
          <ActiveMultiSelect
            placeholder={placeholder}
            id="test-multiselect"
            items={items}
            itemToString={itemToString}
            selectedItems={selected}
            onChange={(changes) => setSelected(changes.selectedItems)}
          />
          <button type="button" data-testid="external-clear" onClick={() => onClear(setSelected)}>
            Clear
          </button>
        </>
      );
    };

    it('restores placeholder when parent sets selectedItems to empty array', async () => {
      const user = userEvent.setup();
      render(
        <ExternalControlMultiSelect
          placeholder="Pick something"
          onClear={(setSelected) => setSelected([])}
        />,
      );
      await openDropdown(user);

      // Select an item
      await user.click(screen.getByText('A - Alpha'));
      await waitFor(() => {
        expect(getPlaceholderInput()).toHaveProperty('placeholder', 'A');
      });

      // Externally set selectedItems to []
      await user.click(screen.getByTestId('external-clear'));

      await waitFor(() => {
        expect(getPlaceholderInput()).toHaveProperty('placeholder', 'Pick something');
      });
    });

    it('restores placeholder when parent splices the selectedItems array (delete)', async () => {
      const user = userEvent.setup();
      render(
        <ExternalControlMultiSelect
          placeholder="Pick something"
          onClear={(setSelected) =>
            setSelected((prev) => {
              // Simulate a "delete" by splicing all entries
              const copy = [...prev];
              copy.splice(0, copy.length);
              return copy;
            })
          }
        />,
      );
      await openDropdown(user);

      await user.click(screen.getByText('B - Beta'));
      await waitFor(() => {
        expect(getPlaceholderInput()).toHaveProperty('placeholder', 'B');
      });

      // Externally splice/delete all entries
      await user.click(screen.getByTestId('external-clear'));

      await waitFor(() => {
        expect(getPlaceholderInput()).toHaveProperty('placeholder', 'Pick something');
      });
    });

    it('restores placeholder when parent sets selectedItems to undefined', async () => {
      const user = userEvent.setup();
      render(
        <ExternalControlMultiSelect
          placeholder="Pick something"
          onClear={(setSelected) => setSelected(undefined as unknown as CodeItem[])}
        />,
      );
      await openDropdown(user);

      await user.click(screen.getByText('C - Gamma'));
      await waitFor(() => {
        expect(getPlaceholderInput()).toHaveProperty('placeholder', 'C');
      });

      // Externally set selectedItems to undefined
      await user.click(screen.getByTestId('external-clear'));

      await waitFor(() => {
        expect(getPlaceholderInput()).toHaveProperty('placeholder', 'Pick something');
      });
    });

    it('restores placeholder when parent sets selectedItems to null', async () => {
      const user = userEvent.setup();
      render(
        <ExternalControlMultiSelect
          placeholder="Pick something"
          onClear={(setSelected) => setSelected(null as unknown as CodeItem[])}
        />,
      );
      await openDropdown(user);

      await user.click(screen.getByText('A - Alpha'));
      await waitFor(() => {
        expect(getPlaceholderInput()).toHaveProperty('placeholder', 'A');
      });

      // Externally set selectedItems to null
      await user.click(screen.getByTestId('external-clear'));

      await waitFor(() => {
        expect(getPlaceholderInput()).toHaveProperty('placeholder', 'Pick something');
      });
    });
  });
});
