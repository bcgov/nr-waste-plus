import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import LayoutHeaderGlobalBar from './LayoutHeaderGlobalBar';

import { renderWithAppAsync } from '@/config/tests/renderWithApp';

vi.mock('@/components/Layout/ThemeToggle', () => ({
  __esModule: true,
  default: () => <div data-testid="theme-toggle" />,
}));

const mockToggleHeaderPanel = vi.fn();

vi.mock('@/context/layout/useLayout', () => ({
  useLayout: () => ({
    toggleHeaderPanel: mockToggleHeaderPanel,
    isHeaderPanelOpen: false,
  }),
}));

const renderWithProviders = () => renderWithAppAsync(<LayoutHeaderGlobalBar />);

describe('LayoutHeaderGlobalBar', () => {
  it('renders ThemeToggle and user avatar', async () => {
    await renderWithProviders();
    screen.getByTestId('theme-toggle');
    screen.getByLabelText('Profile settings');
    screen.getByLabelText('Switch to dark mode');
  });

  it('calls toggleHeaderPanel when profile settings is clicked', async () => {
    await renderWithProviders();
    fireEvent.click(screen.getByLabelText('Profile settings'));
    expect(mockToggleHeaderPanel).toHaveBeenCalled();
  });
});
