import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import APIs from '@/services/APIs';

import MyClientListing from './index';

vi.mock('@/services/APIs', () => ({
  default: {
    forestclient: {
      searchForestClientsDistricts: vi.fn(),
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
  beforeEach(() => {
    (APIs.forestclient.searchForestClientsDistricts as Mock).mockClear();
  });

  it('renders search input and table', async () => {
    await renderWithProviders();
    expect(screen.getByRole('searchbox', { name: 'Search by RU No. or Block ID' })).toBeDefined();
    expect(screen.getByPlaceholderText('Search by RU No. or Block ID')).toBeDefined();
    expect(screen.getAllByRole('button', { name: /search/i })[0]).toBeDefined();
    expect(screen.getByRole('table')).toBeDefined();
  });

  it('calls API on search button click with filter', async () => {
    await renderWithProviders();
    const input = screen.getByPlaceholderText('Search by RU No. or Block ID');
    await userEvent.type(input, 'test');
    const searchBtn = screen.getAllByRole('button', { name: /search/i })[0];
    await userEvent.click(searchBtn);
    await waitFor(() => {
      expect(APIs.forestclient.searchForestClientsDistricts).toHaveBeenCalledWith('test', 0, 10);
    });
  });
});
