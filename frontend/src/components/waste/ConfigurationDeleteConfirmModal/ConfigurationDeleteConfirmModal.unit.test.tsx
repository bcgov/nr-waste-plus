import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import ConfigurationDeleteConfirmModal from './index';

import { renderWithAppAsync } from '@/config/tests/renderWithApp';

const defaultProps = {
  open: true,
  configurationType: 'district volume',
  startDate: '2026-09-01',
  isDeleting: false,
  onConfirm: vi.fn(),
  onClose: vi.fn(),
};

describe('ConfigurationDeleteConfirmModal', () => {
  it('renders nothing when closed', async () => {
    await renderWithAppAsync(<ConfigurationDeleteConfirmModal {...defaultProps} open={false} />);

    expect(screen.queryByTestId('configuration-delete-modal')).toBeNull();
  });

  it('shows the configuration type in the title', async () => {
    await renderWithAppAsync(<ConfigurationDeleteConfirmModal {...defaultProps} />);

    expect(screen.getByText('Delete district volume?')).toBeTruthy();
  });

  it('shows the effective start date in the confirmation copy', async () => {
    await renderWithAppAsync(<ConfigurationDeleteConfirmModal {...defaultProps} />);

    expect(screen.getByText(/September 01, 2026/)).toBeTruthy();
  });

  it('calls onClose when Cancel is clicked', async () => {
    await renderWithAppAsync(<ConfigurationDeleteConfirmModal {...defaultProps} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm when Delete is clicked', async () => {
    await renderWithAppAsync(<ConfigurationDeleteConfirmModal {...defaultProps} />);

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('disables the Delete button while a deletion is pending', async () => {
    await renderWithAppAsync(
      <ConfigurationDeleteConfirmModal {...defaultProps} isDeleting={true} />,
    );

    expect((screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('re-enables the Delete button once the deletion settles', async () => {
    const { rerender } = await renderWithAppAsync(
      <ConfigurationDeleteConfirmModal {...defaultProps} isDeleting={true} />,
    );

    rerender(<ConfigurationDeleteConfirmModal {...defaultProps} isDeleting={false} />);

    expect((screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });
});
