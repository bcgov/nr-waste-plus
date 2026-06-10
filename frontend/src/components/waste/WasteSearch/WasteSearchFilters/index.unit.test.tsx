import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import WasteSearchFilters from './index';

import type { ComponentProps } from 'react';

import { renderWithAppAsync } from '@/config/tests/renderWithApp';
import APIs from '@/services/APIs';

vi.mock('@/hooks/useSyncFiltersToSearchParams', () => ({
  default: vi.fn(() => {
    // Mock implementation: does nothing, actual hook logic is tested separately
  }),
}));

vi.mock('@/services/APIs', () => ({
  default: {
    codes: {
      getSamplingOptions: vi.fn().mockResolvedValue([
        { code: 'A', description: 'Sampling option: A' },
        { code: 'B', description: 'Sampling option: B' },
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

const renderWithProps = (props: Partial<ComponentProps<typeof WasteSearchFilters>>) =>
  renderWithAppAsync(
    <WasteSearchFilters
      value={defaultFilters}
      onChange={props.onChange || vi.fn()}
      onSearch={props.onSearch || vi.fn()}
      {...props}
    />,
  );

describe('WasteSearchFilters', () => {
  it('shouldRenderSearchInputAndFilterColumns_whenRendered', async () => {
    await renderWithProps({});
    screen.getAllByPlaceholderText('Search by RU No. or Block ID');
    screen.getByPlaceholderText(/Sampling/i);
    screen.getByPlaceholderText(/District/i);
    screen.getByPlaceholderText(/Status/i);
  });

  it('shouldRenderAdvancedSearchAndSearchButtons_whenDesktop', async () => {
    await renderWithProps({});
    expect(screen.getAllByText('Advanced Search').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Search').length).toBeGreaterThan(0);
  });

  it('shouldCallOnSearch_whenSearchButtonIsClicked', async () => {
    const onSearch = vi.fn();
    await renderWithProps({ onSearch });
    const searchButton = screen.getByTestId('search-button-most');
    expect(searchButton).toBeDefined();
    fireEvent.click(searchButton);
    expect(onSearch).toHaveBeenCalled();
  });

  it('shouldShowAndCloseAdvancedSearchModal_whenAdvancedSearchButtonClicked', async () => {
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

  it('shouldRenderFilterTagsAndShowOptions_whenFiltersDropdownsOpened', async () => {
    await renderWithProps({});
    expect(APIs.codes.getAssessAreaStatuses).toHaveBeenCalled();

    const samplingBox = screen.getByPlaceholderText(/Sampling/i);
    const samplingButton = within(samplingBox.parentElement!).getByRole('button');
    expect(samplingButton).not.toBeNull();

    const districtBox = screen.getByPlaceholderText(/District/i);
    const districtButton = within(districtBox.parentElement!).getByRole('button');
    expect(districtButton).not.toBeNull();

    const statusBox = screen.getByPlaceholderText(/Status/i);
    const statusButton = within(statusBox.parentElement!).getByRole('button');
    expect(statusButton).not.toBeNull();

    expect(samplingButton).toBeInstanceOf(HTMLButtonElement);
    await userEvent.click(samplingButton as HTMLButtonElement);
    screen.getByText('A - Sampling option: A');

    expect(districtButton).toBeInstanceOf(HTMLButtonElement);
    await userEvent.click(districtButton as HTMLButtonElement);
    screen.getByText('B - District: B');

    expect(statusButton).toBeInstanceOf(HTMLButtonElement);
    await userEvent.click(statusButton as HTMLButtonElement);
    screen.getByText('A - Assess area status: A');
  });

  it('shouldRenderActiveFilterTagsArea_whenFiltersHaveValue', async () => {
    await renderWithProps({
      value: {
        sampling: ['A'],
      },
    });
    screen.getByTestId('active-filters');

    screen.getByTestId('dt-sampling-A');
  });

  it('shouldCallOnChange_whenSearchInputChanges', async () => {
    const onChange = vi.fn();
    await renderWithProps({ onChange });

    const searchBox = screen.getAllByPlaceholderText('Search by RU No. or Block ID')[0];
    expect(searchBox).toBeDefined();

    await userEvent.type(searchBox, 'supertest');
    await waitFor(() => expect(onChange).toHaveBeenCalled());
  });

  it('shouldCallOnChange_whenDropdownSelectionChanges', async () => {
    const onChange = vi.fn();
    await renderWithProps({ onChange });

    const samplingBox = screen.getByPlaceholderText(/Sampling/i);
    const samplingButton = within(samplingBox.parentElement!).getByRole('button');
    expect(samplingBox).toBeDefined();
    expect(samplingButton).toBeDefined();
    expect(samplingButton).toBeInstanceOf(HTMLButtonElement);
    await userEvent.click(samplingButton as HTMLButtonElement);
    await userEvent.click(screen.getByText('A - Sampling option: A'));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
  });
});
