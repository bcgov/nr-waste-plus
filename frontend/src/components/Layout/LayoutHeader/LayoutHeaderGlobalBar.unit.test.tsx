import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import LayoutHeaderGlobalBar from './LayoutHeaderGlobalBar';

import { AuthProvider } from '@/context/auth/AuthProvider';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';

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
  const qc = new QueryClient();
  await act(async () => {
    render(
      <AuthProvider>
        <QueryClientProvider client={qc}>
          <PreferenceProvider>
            <LayoutHeaderGlobalBar />
          </PreferenceProvider>
        </QueryClientProvider>
      </AuthProvider>,
    );
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
