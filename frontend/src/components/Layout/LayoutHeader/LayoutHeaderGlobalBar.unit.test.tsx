import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import LayoutHeaderGlobalBar from './LayoutHeaderGlobalBar';

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

const renderWithProviders = async () => {
  await act(async () => {
    render(<LayoutHeaderGlobalBar />);
  });
};

describe('LayoutHeaderGlobalBar', () => {
  it('renders ThemeToggle and user avatar', async () => {
    await renderWithProviders();
    expect(screen.getByTestId('theme-toggle')).toBeDefined();
    expect(screen.getByLabelText('User settings')).toBeDefined();
    expect(screen.getByLabelText('Theme')).toBeDefined();
  });

  it('calls toggleHeaderPanel when user settings is clicked', async () => {
    await renderWithProviders();
    fireEvent.click(screen.getByLabelText('User settings'));
    expect(mockToggleHeaderPanel).toHaveBeenCalled();
  });
});
