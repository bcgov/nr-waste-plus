import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { LayoutHeaderPanel } from './index';

import { AuthProvider } from '@/context/auth/AuthProvider';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import ThemeProvider from '@/context/theme/ThemeProvider';

vi.mock('@/context/layout/useLayout', () => ({
  useLayout: () => ({
    isHeaderPanelOpen: true,
    closeHeaderPanel: vi.fn(),
  }),
}));

vi.mock('@/components/core/DistrictSelection/DistrictListing', () => ({
  default: () => <div data-testid="district-listing">District Listing</div>,
}));

vi.mock('@/components/core/DistrictSelection/ClientListing', () => ({
  default: () => <div data-testid="client-listing">Client Listing</div>,
}));

const renderWithProviders = async () => {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  await act(async () =>
    render(
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <PreferenceProvider>
            <ThemeProvider>
              <LayoutHeaderPanel />
            </ThemeProvider>
          </PreferenceProvider>
        </AuthProvider>
      </QueryClientProvider>,
    ),
  );
};

describe('LayoutHeaderPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', async () => {
    await renderWithProviders();
    expect(screen.getByTestId('header-panel')).toBeDefined();
  });
});
