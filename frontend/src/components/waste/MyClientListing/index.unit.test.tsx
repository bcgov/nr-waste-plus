import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import APIs from '@/services/APIs';

import MyClientListing from './index';

vi.mock('@/services/APIs', () => ({
  default: {
    forestclient: {
      searchMyForestClients: vi.fn().mockResolvedValue({
        content: [
          {
            client: { code: '123', description: 'Test Client' },
            submissionsCount: 5,
            blocksCount: 10,
            lastUpdate: '2023-01-01',
          },
        ],
        page: { number: 0, size: 10, totalElements: 1, totalPages: 1 },
      }),
    },
  },
}));

const renderWithProviders = async (props = {}) => {
  const qc = new QueryClient();
  await act(async () =>
    render(
      <QueryClientProvider client={qc}>
        <PreferenceProvider>
          <MyClientListing {...props} />
        </PreferenceProvider>
      </QueryClientProvider>,
    ),
  );
};

describe('MyClientListing', () => {
  it('renders search input and table', async () => {
    await renderWithProviders();
    expect(screen.getByRole('searchbox', { name: 'Search by name' })).toBeDefined();
    expect(screen.getByTestId('search-button-other')).toBeDefined();
    await waitFor(() => {
      expect(APIs.forestclient.searchMyForestClients).toHaveBeenCalled();
    });
    expect(screen.getByText('Test Client')).toBeDefined();
    expect(screen.getByRole('searchbox', { name: 'Search by name' })).toBeDefined();
    expect(screen.getByTestId('search-button-other')).toBeDefined();
    await waitFor(() => {
      expect(APIs.forestclient.searchMyForestClients).toHaveBeenCalled();
    });
    expect(screen.getByText('Test Client')).toBeDefined();
  });
});
