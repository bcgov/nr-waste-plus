/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, within, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import APIs from '@/services/APIs';

import WasteSearchFilters from './index';
import { AuthProvider } from '@/context/auth/AuthProvider';

vi.mock('@/services/APIs', () => ({
  default: {
    codes: {
      getSamplingOptions: vi.fn().mockResolvedValue([
        { code: 'A', description: 'Sampling Option: A' },
        { code: 'B', description: 'Sampling Option: B' },
      ]),
      getDistricts: vi.fn().mockResolvedValue([
        { code: 'A', description: 'District: A' },
        { code: 'B', description: 'District: B' },
      ]),
      getAssessAreaStatuses: vi.fn().mockResolvedValue([
        { code: 'A', description: 'Assess area status: A' },
        { code: 'B', description: 'Assess area status: B' },
      ]),
    },
  },
}));

const defaultFilters = {
  mainSearchTerm: '',
  sampling: [],
  district: [],
  status: [],
};

const renderWithProps = async (props: any) => {
  const qc = new QueryClient();
  await act(async () =>
    render(
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <PreferenceProvider>
            <WasteSearchFilters
              value={defaultFilters}
              onChange={props.onChange || vi.fn()}
              onSearch={props.onSearch || vi.fn()}
              {...props}
            />
          </PreferenceProvider>
        </AuthProvider>
      </QueryClientProvider>,
    ),
  );
};

describe('WasteSearchFilters', () => {
  it('renders main search input and filter columns', async () => {
    await renderWithProps({});
    expect(screen.getAllByPlaceholderText('Search by RU No. or Block ID')[0]).toBeDefined();
    expect(screen.getByPlaceholderText(/Sampling/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/District/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Status/i)).toBeDefined();
  });

  it('renders advanced search and search buttons (desktop)', async () => {
    await renderWithProps({});
    expect(screen.getAllByText('Advanced Search').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Search').length).toBeGreaterThan(0);
  });

  it('calls onSearch when search button is clicked', async () => {
    const onSearch = vi.fn();
    await renderWithProps({ onSearch });
    const searchButton = screen.getByTestId('search-button-most');
    expect(searchButton).toBeDefined();
    fireEvent.click(searchButton);
    expect(onSearch).toHaveBeenCalled();
  });

  it('shows and closes advanced search modal', async () => {
    await renderWithProps({});
    //Open modal
    userEvent.click(screen.getByTestId('advanced-search-button-most'));

    //Modal is present
    const modal = await screen.findByRole('dialog');
    expect(modal).toBeDefined();

    //Close modal
    const closeButton = within(modal).getByRole('button', { name: /Cancel/i });
    await userEvent.click(closeButton);

    //No more modal
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('renders filter tags when filters are set', async () => {
    await renderWithProps({});
    expect(APIs.codes.getAssessAreaStatuses).toHaveBeenCalled();

    const samplingBox = screen.getByPlaceholderText(/Sampling/i);
    const samplingButton = samplingBox.parentElement?.querySelector('button');
    expect(samplingBox).toBeDefined();
    expect(samplingButton).toBeDefined();

    const districtBox = screen.getByPlaceholderText(/District/i);
    const districtButton = districtBox.parentElement?.querySelector('button');
    expect(districtBox).toBeDefined();
    expect(districtButton).toBeDefined();

    const statusBox = screen.getByPlaceholderText(/Status/i);
    const statusButton = statusBox.parentElement?.querySelector('button');
    expect(statusBox).toBeDefined();
    expect(statusButton).toBeDefined();

    expect(samplingButton).toBeInstanceOf(HTMLButtonElement);
    await userEvent.click(samplingButton as HTMLButtonElement);
    expect(screen.getByText('A - Sampling Option: A')).toBeDefined();

    expect(districtButton).toBeInstanceOf(HTMLButtonElement);
    await userEvent.click(districtButton as HTMLButtonElement);
    expect(screen.getByText('B - District: B')).toBeDefined();

    expect(statusButton).toBeInstanceOf(HTMLButtonElement);
    await userEvent.click(statusButton as HTMLButtonElement);
    expect(screen.getByText('A - Assess area status: A')).toBeDefined();
  });

  it('calls onChange when search has new value', async () => {
    const onChange = vi.fn();
    await renderWithProps({ onChange });

    const searchBox = screen.getAllByPlaceholderText('Search by RU No. or Block ID')[0];
    expect(searchBox).toBeDefined();

    await userEvent.type(searchBox!, 'supertest');
    await waitFor(() => expect(onChange).toHaveBeenCalled());
  });

  it('calls onChange when dropdown selected a new value', async () => {
    const onChange = vi.fn();
    await renderWithProps({ onChange });

    const samplingBox = screen.getByPlaceholderText(/Sampling/i);
    const samplingButton = samplingBox.parentElement?.querySelector('button');
    expect(samplingBox).toBeDefined();
    expect(samplingButton).toBeDefined();
    expect(samplingButton).toBeInstanceOf(HTMLButtonElement);
    await userEvent.click(samplingButton as HTMLButtonElement);
    await userEvent.click(screen.getByText('A - Sampling Option: A'));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
  });
});
