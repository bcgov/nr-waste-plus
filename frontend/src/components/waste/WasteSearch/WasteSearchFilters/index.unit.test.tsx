import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { renderWithAppAsync } from '@/config/tests/renderWithApp';
import APIs from '@/services/APIs';

import WasteSearchFilters from './index';

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

const renderAt = (path: string, onSearch: () => void = vi.fn()) =>
  renderWithAppAsync(<WasteSearchFilters onSearch={onSearch} />, { route: path });

describe('WasteSearchFilters', () => {
  it('shouldRenderSearchInputAndFilterColumns_whenRendered', async () => {
    await renderAt('/search');
    screen.getAllByPlaceholderText('Search by RU No. or Block ID');
    screen.getByPlaceholderText(/Sampling/i);
    screen.getByPlaceholderText(/District/i);
    screen.getByPlaceholderText(/Status/i);
  });

  it('shouldRenderAdvancedSearchAndSearchButtons_whenDesktop', async () => {
    await renderAt('/search');
    expect(screen.getAllByText('Advanced Search').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Search').length).toBeGreaterThan(0);
  });

  it('shouldCallOnSearch_whenSearchButtonIsClicked', async () => {
    const onSearch = vi.fn();
    await renderAt('/search', onSearch);
    const searchButton = screen.getByTestId('search-button-most');
    expect(searchButton).toBeDefined();
    await userEvent.click(searchButton);
    expect(onSearch).toHaveBeenCalled();
  });

  it('shouldShowAndCloseAdvancedSearchModal_whenAdvancedSearchButtonClicked', async () => {
    await renderAt('/search');
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
    await renderAt('/search');
    expect(APIs.codes.getAssessAreaStatuses).toHaveBeenCalled();

    const samplingBox = screen.getByPlaceholderText(/Sampling/i);
    // eslint-disable-next-line testing-library/no-node-access
    const samplingButton = within(samplingBox.parentElement!).getByRole('button');
    expect(samplingButton).not.toBeNull();

    const districtBox = screen.getByPlaceholderText(/District/i);
    // eslint-disable-next-line testing-library/no-node-access
    const districtButton = within(districtBox.parentElement!).getByRole('button');
    expect(districtButton).not.toBeNull();

    const statusBox = screen.getByPlaceholderText(/Status/i);
    // eslint-disable-next-line testing-library/no-node-access
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

  it('shouldRenderActiveFilterTagsArea_whenUrlCarriesFilters', async () => {
    await renderAt('/search?sampling=A');
    screen.getByTestId('active-filters');

    screen.getByTestId('dt-sampling-A');
  });

  it('shouldWriteToUrl_whenSearchInputChanges', async () => {
    await renderAt('/search');

    const searchBox = screen.getAllByPlaceholderText('Search by RU No. or Block ID')[0];
    expect(searchBox).toBeDefined();

    // Typing routes the value through the /search search params; the input is
    // controlled from the URL-derived state, so the typed text round-trips.
    await userEvent.type(searchBox, 'supertest');
    await waitFor(() => {
      expect(screen.getByDisplayValue('supertest')).toBeDefined();
    });
  });

  it('shouldWriteToUrl_whenDropdownSelectionChanges', async () => {
    await renderAt('/search');

    const samplingBox = screen.getByPlaceholderText(/Sampling/i);
    // eslint-disable-next-line testing-library/no-node-access
    const samplingButton = within(samplingBox.parentElement!).getByRole('button');
    await userEvent.click(samplingButton as HTMLButtonElement);
    await userEvent.click(screen.getByText('A - Sampling option: A'));

    // The selection is routed through the /search search params and the active
    // tag renders from the URL-derived state.
    await waitFor(() => {
      expect(screen.getByTestId('dt-sampling-A')).toBeDefined();
    });
  });

  it('shouldOpenAdvancedSearchFromSmallScreenButton_whenClicked', async () => {
    await renderAt('/search');
    const smAdvanced = screen.getByTestId('advanced-search-button-sm');
    await userEvent.click(smAdvanced);

    const modal = await screen.findByRole('dialog');
    expect(modal).toBeDefined();
  });

  it('shouldCallOnSearchFromSmallScreenSearchButton_whenClicked', async () => {
    const onSearch = vi.fn();
    await renderAt('/search', onSearch);
    const smSearch = screen.getByTestId('search-button-sm');
    await userEvent.click(smSearch);
    expect(onSearch).toHaveBeenCalled();
  });

  it('shouldCallOnSearchFromAdvancedModalSearchButton_whenClicked', async () => {
    const onSearch = vi.fn();
    await renderAt('/search', onSearch);

    await userEvent.click(screen.getByTestId('advanced-search-button-most'));
    const modal = await screen.findByRole('dialog');

    const modalSearch = within(modal).getByRole('button', { name: /Search/i });
    await userEvent.click(modalSearch);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(onSearch).toHaveBeenCalled();
    });
  });

  it('shouldRenderWithPreselectedFilterValues_coveringSelectedItemsBranches', async () => {
    await renderAt('/search?sampling=A&district=B&status=A');

    // Cover selectedItems filter branches for all three dropdowns.
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Clear selected item/i }).length).toBe(3);
    });
  });
});
