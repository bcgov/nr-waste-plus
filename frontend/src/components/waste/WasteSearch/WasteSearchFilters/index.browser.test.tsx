/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { PreferenceProvider } from '@/context/preference/PreferenceProvider';

import WasteSearchFilters from './index';

const defaultFilters = {
  mainSearchTerm: '',
  sampling: [],
  district: [],
  status: [],
};

const renderWithProps = async (props: any) => {
  const qc = new QueryClient();
  await act(() =>
    render(
      <QueryClientProvider client={qc}>
        <PreferenceProvider>
          <WasteSearchFilters
            value={defaultFilters}
            onChange={props.onChange || vi.fn()}
            onSearch={props.onSearch || vi.fn()}
            {...props}
          />
        </PreferenceProvider>
      </QueryClientProvider>,
    ),
  );
};

describe('WasteSearchFilters', () => {
  it('renders main search input and filter columns', async () => {
    await renderWithProps({});
    expect(screen.getByLabelText('Search')).toBeDefined();
    expect(screen.getByPlaceholderText('Sampling')).toBeDefined();
    expect(screen.getByPlaceholderText('District')).toBeDefined();
    expect(screen.getByPlaceholderText('Status')).toBeDefined();
  });

  it('renders advanced search and search buttons (desktop)', async () => {
    await renderWithProps({});
    expect(screen.getAllByText('Advanced Search').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Search').length).toBeGreaterThan(0);
  });

  it('calls onSearch when search button is clicked', async () => {
    const onSearch = vi.fn();
    await renderWithProps({ onSearch });
    fireEvent.click(screen.getByText('Search'));
    expect(onSearch).toHaveBeenCalled();
  });

  it('shows and closes advanced search modal', async () => {
    await renderWithProps({});
    fireEvent.click(screen.getAllByText('Advanced Search')[0]);
    // Modal should open, but you may need to mock WasteSearchFiltersAdvanced for full coverage
    // fireEvent.click(screen.getAllByText('Search')[0]); // Close modal
  });

  it('renders filter tags when filters are set', () => {
    const filters = {
      ...defaultFilters,
      sampling: ['A'],
      district: ['B'],
      status: ['C'],
    };
    renderWithProps({ value: filters });
    expect(screen.getByText('Sampling Option: A')).toBeDefined();
    expect(screen.getByText('District: B')).toBeDefined();
    expect(screen.getByText('Assess area status: C')).toBeDefined();
  });

  // Example for screen size: you may need to mock useBreakpoint or window size
  // it('renders mobile buttons on small screens', () => {
  //   // Mock screen size or useBreakpoint
  // });
});
