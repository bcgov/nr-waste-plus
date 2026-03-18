import { CheckmarkFilled, Edit } from '@carbon/icons-react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TableResourceActions from './index';

import type { TableRowAction } from '../types';

type TestRow = {
  id: number;
  name: string;
  active: boolean;
};

const row: TestRow = {
  id: 101,
  name: 'Alice',
  active: true,
};

const renderInTableRow = (actions: TableRowAction<Omit<TestRow, 'id'>>[], maxInlineRowActions = 2) => {
  const onRowClick = vi.fn();

  render(
    <table>
      <tbody>
        <tr onClick={onRowClick}>
          <TableResourceActions
            row={row}
            actions={actions}
            maxInlineRowActions={maxInlineRowActions}
          />
        </tr>
      </tbody>
    </table>,
  );

  return { onRowClick };
};

describe('TableResourceActions', () => {
  it('renders inline actions using row-aware labels and icons', () => {
    renderInTableRow([
      {
        id: 'toggle',
        label: (currentRow) => (currentRow.active ? 'Deactivate' : 'Activate'),
        icon: <CheckmarkFilled size={16} />,
        onClick: vi.fn(),
      },
      {
        id: 'edit',
        label: 'Edit',
        icon: <Edit size={16} />,
        onClick: vi.fn(),
      },
    ]);

    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDefined();
  });

  it('moves remaining actions into the overflow menu', async () => {
    const overflowAction = vi.fn();

    renderInTableRow(
      [
        {
          id: 'edit',
          label: 'Edit',
          icon: <Edit size={16} />,
          onClick: vi.fn(),
        },
        {
          id: 'toggle',
          label: 'Deactivate',
          icon: <CheckmarkFilled size={16} />,
          onClick: vi.fn(),
        },
        {
          id: 'archive',
          label: 'Archive',
          icon: <Edit size={16} />,
          onClick: overflowAction,
        },
      ],
      2,
    );

    expect(screen.queryByRole('button', { name: 'Archive' })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Options' }));
    await userEvent.click(screen.getByText('Archive'));

    expect(overflowAction).toHaveBeenCalledWith(row);
  });

  it('applies disabled state from the row action definition', () => {
    renderInTableRow([
      {
        id: 'toggle',
        label: 'Deactivate',
        icon: <CheckmarkFilled size={16} />,
        isDisabled: true,
        onClick: vi.fn(),
      },
    ]);

    expect(screen.getByRole('button', { name: 'Deactivate' }).disabled).toBe(true);
  });

  it('disables actions while loading is true', () => {
    renderInTableRow([
      {
        id: 'toggle',
        label: 'Deactivate',
        icon: <CheckmarkFilled size={16} />,
        isLoading: true,
        onClick: vi.fn(),
      },
    ]);

    expect(screen.getByRole('button', { name: 'Deactivate' }).disabled).toBe(true);
  });

  it('stops row click propagation for inline actions', async () => {
    const actionClick = vi.fn();
    const { onRowClick } = renderInTableRow([
      {
        id: 'edit',
        label: 'Edit',
        icon: <Edit size={16} />,
        onClick: actionClick,
      },
    ]);

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(actionClick).toHaveBeenCalledWith(row);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('supports async action handlers', async () => {
    const asyncActionClick = vi.fn(async () => {});

    renderInTableRow([
      {
        id: 'edit',
        label: 'Edit',
        icon: <Edit size={16} />,
        onClick: asyncActionClick,
      },
    ]);

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(asyncActionClick).toHaveBeenCalledWith(row);
  });
});