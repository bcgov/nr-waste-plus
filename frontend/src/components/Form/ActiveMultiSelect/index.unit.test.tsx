import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
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

const openDropdown = async () => {
  const button = (await screen.findAllByTitle('Open'))[0] as HTMLButtonElement;
  await act(async () => button.click());
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
  testItemToString = itemToString as (item: CodeItem | null) => string,
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
    expect(screen.getByText('A - Alpha')).toBeDefined();
    expect(screen.getByText('B - Beta')).toBeDefined();
    expect(screen.getByText('C - Gamma')).toBeDefined();
  });

  it('calls onChange when an item is selected', async () => {
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
    await openDropdown();
    await act(async () => fireEvent.click(screen.getByText('A - Alpha')));
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
    expect(screen.getByText('B - Beta')).toBeDefined();
  });

  it('updates placeholder to show selected code values', async () => {
    render(<ControlledMultiSelect placeholder="Select..." />);
    await openDropdown();
    await act(async () => fireEvent.click(screen.getByText('A - Alpha')));

    expect(getPlaceholderInput()).toHaveProperty('placeholder', 'A');
  });

  it('updates placeholder with multiple selected codes joined by comma', async () => {
    render(<ControlledMultiSelect placeholder="Select..." />);
    await openDropdown();

    await act(async () => fireEvent.click(screen.getByText('A - Alpha')));
    // Wait for deferred onChange microtask to propagate state to wrapper
    await act(async () => {});

    await act(async () => fireEvent.click(screen.getByText('B - Beta')));

    await waitFor(() => {
      expect(getPlaceholderInput()).toHaveProperty('placeholder', 'A, B');
    });
  });

  it('restores original placeholder when all items are deselected', async () => {
    render(<ControlledMultiSelect placeholder="My Placeholder" />);
    await openDropdown();

    // Select
    await act(async () => fireEvent.click(screen.getByText('A - Alpha')));
    await act(async () => {});
    expect(getPlaceholderInput()).toHaveProperty('placeholder', 'A');

    // Deselect by clicking the same item again
    await act(async () => fireEvent.click(screen.getByText('A - Alpha')));

    await waitFor(() => {
      expect(getPlaceholderInput()).toHaveProperty('placeholder', 'My Placeholder');
    });
  });

  it('restores placeholder when selection is cleared via clear button', async () => {
    render(<ControlledMultiSelect placeholder="Original" />);
    await openDropdown();

    // Select an item
    await act(async () => fireEvent.click(screen.getByText('A - Alpha')));
    await act(async () => {});
    expect(getPlaceholderInput()).toHaveProperty('placeholder', 'A');

    // Click the clear selection button rendered by Carbon
    const clearButton = await screen.findByTitle('Clear all selected items');
    await act(async () => fireEvent.click(clearButton));

    await waitFor(() => {
      expect(getPlaceholderInput()).toHaveProperty('placeholder', 'Original');
    });
  });

  it('uses value property when code is not present', async () => {
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
    await openDropdown();
    await act(async () => fireEvent.click(screen.getByText('X - X-ray')));

    await waitFor(() => {
      expect(getPlaceholderInput()).toHaveProperty('placeholder', 'X');
    });
  });

  it('shows skeleton when showSkeleton is true', () => {
    const { container } = render(
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
    expect(container.querySelector('.cds--skeleton')).toBeDefined();
    expect(container.querySelector('.cds--multi-select')).toBeNull();
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
      render(
        <ExternalControlMultiSelect
          placeholder="Pick something"
          onClear={(setSelected) => setSelected([])}
        />,
      );
      await openDropdown();

      // Select an item
      await act(async () => fireEvent.click(screen.getByText('A - Alpha')));
      await act(async () => {});
      expect(getPlaceholderInput()).toHaveProperty('placeholder', 'A');

      // Externally set selectedItems to []
      await act(async () => fireEvent.click(screen.getByTestId('external-clear')));

      await waitFor(() => {
        expect(getPlaceholderInput()).toHaveProperty('placeholder', 'Pick something');
      });
    });

    it('restores placeholder when parent splices the selectedItems array (delete)', async () => {
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
      await openDropdown();

      await act(async () => fireEvent.click(screen.getByText('B - Beta')));
      await act(async () => {});
      expect(getPlaceholderInput()).toHaveProperty('placeholder', 'B');

      // Externally splice/delete all entries
      await act(async () => fireEvent.click(screen.getByTestId('external-clear')));

      await waitFor(() => {
        expect(getPlaceholderInput()).toHaveProperty('placeholder', 'Pick something');
      });
    });

    it('restores placeholder when parent sets selectedItems to undefined', async () => {
      render(
        <ExternalControlMultiSelect
          placeholder="Pick something"
          onClear={(setSelected) => setSelected(undefined as unknown as CodeItem[])}
        />,
      );
      await openDropdown();

      await act(async () => fireEvent.click(screen.getByText('C - Gamma')));
      await act(async () => {});
      expect(getPlaceholderInput()).toHaveProperty('placeholder', 'C');

      // Externally set selectedItems to undefined
      await act(async () => fireEvent.click(screen.getByTestId('external-clear')));

      await waitFor(() => {
        expect(getPlaceholderInput()).toHaveProperty('placeholder', 'Pick something');
      });
    });

    it('restores placeholder when parent sets selectedItems to null', async () => {
      render(
        <ExternalControlMultiSelect
          placeholder="Pick something"
          onClear={(setSelected) => setSelected(null as unknown as CodeItem[])}
        />,
      );
      await openDropdown();

      await act(async () => fireEvent.click(screen.getByText('A - Alpha')));
      await act(async () => {});
      expect(getPlaceholderInput()).toHaveProperty('placeholder', 'A');

      // Externally set selectedItems to null
      await act(async () => fireEvent.click(screen.getByTestId('external-clear')));

      await waitFor(() => {
        expect(getPlaceholderInput()).toHaveProperty('placeholder', 'Pick something');
      });
    });
  });
});
