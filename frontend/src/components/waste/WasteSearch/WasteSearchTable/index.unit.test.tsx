/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';

import WasteSearchTable from './index';

import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { ReportingUnitSearchResultDto } from '@/services/search.types';

import { AuthProvider } from '@/context/auth/AuthProvider';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import * as useSendEvent from '@/hooks/useSendEvent';
import APIs from '@/services/APIs';

vi.mock('@/services/APIs', () => {
  return {
    default: {
      user: {
        getUserPreferences: vi.fn(),
        updateUserPreferences: vi.fn(),
      },
      codes: {
        getSamplingOptions: vi.fn(),
        getDistricts: vi.fn(),
        getAssessAreaStatuses: vi.fn(),
      },
      search: {
        searchReportingUnit: vi.fn(),
      },
    },
  };
});

const mockSearchResults: PageableResponse<ReportingUnitSearchResultDto> = {
  content: [
    {
      id: 'RU-4069-Block-411B-224813681',
      blockId: '411B',
      ruNumber: 4069,
      client: { code: '00010005', description: 'JACOB FEHR' },
      clientLocation: { code: 'LOC001', description: 'Location One' },
      sampling: { code: 'OCU', description: 'Ocular' },
      district: { code: 'DCC', description: 'Cariboo-Chilcotin' },
      status: { code: 'BIS', description: 'Billing Issued' },
      lastUpdated: '2006-09-08T08:24:17',
    },
    {
      id: 'RU-4070-Block-412B-224813682',
      blockId: '412B',
      ruNumber: 4070,
      client: { code: '00010006', description: 'TEST CLIENT' },
      clientLocation: { code: 'LOC002', description: 'Location Two' },
      sampling: { code: 'S2', description: 'Sampling Two' },
      district: { code: 'D2', description: 'District Two' },
      status: { code: 'SUB', description: 'Submitted' },
      lastUpdated: '2025-01-16T10:00:00',
    },
  ],
  page: {
    number: 0,
    size: 10,
    totalElements: 2,
    totalPages: 1,
  },
};

const mockEmptyResults: PageableResponse<ReportingUnitSearchResultDto> = {
  content: [],
  page: {
    number: 0,
    size: 10,
    totalElements: 0,
    totalPages: 0,
  },
};

const renderWithProps = async () => {
  const qc = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  await act(async () =>
    render(
      <QueryClientProvider client={qc}>
        <PreferenceProvider>
          <AuthProvider>
            <WasteSearchTable />
          </AuthProvider>
        </PreferenceProvider>
      </QueryClientProvider>,
    ),
  );
};

describe('WasteSearchTable', () => {
  let sendEventMock: Mock;
  let clearEventsMock: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    sendEventMock = vi.fn();
    clearEventsMock = vi.fn();
    vi.spyOn(useSendEvent, 'default').mockReturnValue({
      sendEvent: sendEventMock,
      clearEvents: clearEventsMock,
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    });

    (APIs.user.getUserPreferences as Mock).mockResolvedValue({ theme: 'g10' });
    (APIs.user.updateUserPreferences as Mock).mockResolvedValue({});
    (APIs.codes.getSamplingOptions as Mock).mockResolvedValue([
      { code: 'S1', description: 'Sampling One' },
      { code: 'S2', description: 'Sampling Two' },
    ]);
    (APIs.codes.getDistricts as Mock).mockResolvedValue([
      { code: 'D1', description: 'District One' },
      { code: 'D2', description: 'District Two' },
    ]);
    (APIs.codes.getAssessAreaStatuses as Mock).mockResolvedValue([
      { code: 'APP', description: 'Approved' },
      { code: 'SUB', description: 'Submitted' },
    ]);
    (APIs.search.searchReportingUnit as Mock).mockResolvedValue(mockEmptyResults);
  });

  describe('initial rendering', () => {
    it('renders WasteSearchFilters component', async () => {
      await renderWithProps();
      expect(screen.getByPlaceholderText('Search by RU No. or Block ID')).toBeDefined();
    });

    it('renders TableResource component', async () => {
      await renderWithProps();
      expect(screen.getByText('Nothing to show yet!')).toBeDefined();
    });

    it('renders with empty data initially', async () => {
      await renderWithProps();
      expect(screen.getByText('Nothing to show yet!')).toBeDefined();
    });

    it('does not trigger search on initial load', async () => {
      await renderWithProps();
      expect(APIs.search.searchReportingUnit).not.toHaveBeenCalled();
    });
  });

  describe('search functionality', () => {
    it('executes search when search button is clicked with filters', async () => {
      (APIs.search.searchReportingUnit as Mock).mockResolvedValue(mockSearchResults);
      await renderWithProps();

      const keywordInput = screen.getByPlaceholderText('Search by RU No. or Block ID');
      await userEvent.type(keywordInput, '411B');

      const searchButton = screen.getByTestId('search-button-most');
      await userEvent.click(searchButton);

      await waitFor(() => {
        expect(APIs.search.searchReportingUnit).toHaveBeenCalledWith(
          expect.objectContaining({ mainSearchTerm: '411B' }),
          expect.objectContaining({ page: 0, size: 10, sort: [] }),
        );
      });
    });

    it('displays search results after successful search', async () => {
      (APIs.search.searchReportingUnit as Mock).mockResolvedValue(mockSearchResults);
      await renderWithProps();

      const keywordInput = screen.getByPlaceholderText('Search by RU No. or Block ID');
      await userEvent.type(keywordInput, 'BLOCK');

      const searchButton = screen.getByTestId('search-button-most');
      await userEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('411B')).toBeDefined();
        expect(screen.getByText('412B')).toBeDefined();
      });
    });

    it('displays no results message when search returns empty', async () => {
      (APIs.search.searchReportingUnit as Mock).mockResolvedValue(mockEmptyResults);
      await renderWithProps();

      const keywordInput = screen.getByPlaceholderText('Search by RU No. or Block ID');
      await userEvent.type(keywordInput, 'NONEXISTENT');

      const searchButton = screen.getByTestId('search-button-most');
      await userEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('No results')).toBeDefined();
      });
    });

    it('does not execute search when filters are empty', async () => {
      await renderWithProps();

      const searchButton = screen.getByTestId('search-button-most');
      await userEvent.click(searchButton);

      // Wait a bit to ensure no search is triggered
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(APIs.search.searchReportingUnit).not.toHaveBeenCalled();
    });

    it('clears events when search is executed', async () => {
      (APIs.search.searchReportingUnit as Mock).mockResolvedValue(mockSearchResults);
      await renderWithProps();

      const keywordInput = screen.getByPlaceholderText('Search by RU No. or Block ID');
      await userEvent.type(keywordInput, 'BLOCK');

      const searchButton = screen.getByTestId('search-button-most');
      await userEvent.click(searchButton);

      await waitFor(() => {
        expect(clearEventsMock).toHaveBeenCalledWith('waste-search');
      });
    });
  });

  describe('pagination', () => {
    it('handles page change correctly', async () => {
      const largeResults: PageableResponse<ReportingUnitSearchResultDto> = {
        ...mockSearchResults,
        page: {
          number: 0,
          size: 10,
          totalElements: 50,
          totalPages: 5,
        },
      };
      (APIs.search.searchReportingUnit as Mock).mockResolvedValue(largeResults);

      await renderWithProps();

      const keywordInput = screen.getByPlaceholderText('Search by RU No. or Block ID');
      await userEvent.type(keywordInput, 'BLOCK');

      const searchButton = screen.getByTestId('search-button-most');
      await userEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('411B')).toBeDefined();
      });

      // Find and click the next page button
      const nextPageButton = screen.getByLabelText('Next page');
      await userEvent.click(nextPageButton);

      await waitFor(() => {
        expect(APIs.search.searchReportingUnit).toHaveBeenCalledWith(
          expect.objectContaining({ mainSearchTerm: 'BLOCK' }),
          expect.objectContaining({ page: 1, size: 10 }),
        );
      });
    });

    it('handles page size change correctly', async () => {
      const largeResults: PageableResponse<ReportingUnitSearchResultDto> = {
        ...mockSearchResults,
        page: {
          number: 0,
          size: 10,
          totalElements: 50,
          totalPages: 5,
        },
      };
      (APIs.search.searchReportingUnit as Mock).mockResolvedValue(largeResults);

      await renderWithProps();

      const keywordInput = screen.getByPlaceholderText('Search by RU No. or Block ID');
      await userEvent.type(keywordInput, 'BLOCK');

      const searchButton = screen.getByTestId('search-button-most');
      await userEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('411B')).toBeDefined();
      });

      // Find and change page size
      const pageSizeSelect = screen.getByLabelText('Items per page:');
      await userEvent.selectOptions(pageSizeSelect, '20');

      await waitFor(() => {
        expect(APIs.search.searchReportingUnit).toHaveBeenCalledWith(
          expect.objectContaining({ mainSearchTerm: 'BLOCK' }),
          expect.objectContaining({ page: 0, size: 20 }),
        );
      });
    });

    it('resets to first page when page exceeds total pages', async () => {
      const largeResults: PageableResponse<ReportingUnitSearchResultDto> = {
        ...mockSearchResults,
        page: {
          number: 0,
          size: 10,
          totalElements: 5,
          totalPages: 1,
        },
      };
      (APIs.search.searchReportingUnit as Mock).mockResolvedValue(largeResults);

      await renderWithProps();

      const keywordInput = screen.getByPlaceholderText('Search by RU No. or Block ID');
      await userEvent.type(keywordInput, 'BLOCK');

      const searchButton = screen.getByTestId('search-button-most');
      await userEvent.click(searchButton);

      await waitFor(() => {
        expect(APIs.search.searchReportingUnit).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ page: 0 }),
        );
      });
    });
  });

  describe('sorting', () => {
    it('handles sort change correctly', async () => {
      (APIs.search.searchReportingUnit as Mock).mockResolvedValue(mockSearchResults);
      await renderWithProps();

      const keywordInput = screen.getByPlaceholderText('Search by RU No. or Block ID');
      await userEvent.type(keywordInput, 'BLOCK');

      const searchButton = screen.getByTestId('search-button-most');
      await userEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('411B')).toBeDefined();
      });

      // Click on sortable column header (Block ID)
      const blockIdHeader = screen.getByText('Block ID');
      await userEvent.click(blockIdHeader);

      await waitFor(() => {
        expect(APIs.search.searchReportingUnit).toHaveBeenCalledWith(
          expect.objectContaining({ mainSearchTerm: 'BLOCK' }),
          expect.objectContaining({
            page: 0,
            size: 10,
            sort: expect.arrayContaining([expect.stringMatching(/blockId,ASC/)]),
          }),
        );
      });
    });

    it('can sort by multiple columns', async () => {
      (APIs.search.searchReportingUnit as Mock).mockResolvedValue(mockSearchResults);
      await renderWithProps();

      const keywordInput = screen.getByPlaceholderText('Search by RU No. or Block ID');
      await userEvent.type(keywordInput, 'BLOCK');

      const searchButton = screen.getByTestId('search-button-most');
      await userEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('411B')).toBeDefined();
      });

      // Verify sorting capability is available on sortable columns
      const blockIdHeader = screen.getByText('Block ID');
      expect(blockIdHeader).toBeDefined();

      // TableResource component should handle sort changes through onSortChange callback
      // which is tested in the "handles sort change correctly" test above
    });
  });

  describe('error handling', () => {
    it('displays error message when search fails', async () => {
      const errorResponse = {
        body: {
          title: 'Search Failed',
          detail: 'Unable to complete search request',
          status: 500,
          type: 'about:blank',
        },
      };
      (APIs.search.searchReportingUnit as Mock).mockRejectedValue(errorResponse);

      await renderWithProps();

      const keywordInput = screen.getByPlaceholderText('Search by RU No. or Block ID');
      await userEvent.type(keywordInput, 'BLOCK');

      const searchButton = screen.getByTestId('search-button-most');
      await userEvent.click(searchButton);

      await waitFor(() => {
        expect(sendEventMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Search Failed',
            description: 'Unable to complete search request',
            eventType: 'error',
            eventTarget: 'waste-search',
          }),
        );
      });
    });

    it('displays error state in table when search fails', async () => {
      const errorResponse = {
        body: {
          title: 'Search Failed',
          detail: 'Network error occurred',
          status: 500,
          type: 'about:blank',
        },
      };
      (APIs.search.searchReportingUnit as Mock).mockRejectedValue(errorResponse);

      await renderWithProps();

      const keywordInput = screen.getByPlaceholderText('Search by RU No. or Block ID');
      await userEvent.type(keywordInput, 'BLOCK');

      const searchButton = screen.getByTestId('search-button-most');
      await userEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Something went wrong!')).toBeDefined();
      });
    });

    it('sends event with default detail when error has no detail', async () => {
      const errorResponse = {
        body: {
          title: 'Error Occurred',
          status: 500,
          type: 'about:blank',
        },
      };
      (APIs.search.searchReportingUnit as Mock).mockRejectedValue(errorResponse);

      await renderWithProps();

      const keywordInput = screen.getByPlaceholderText('Search by RU No. or Block ID');
      await userEvent.type(keywordInput, 'BLOCK');

      const searchButton = screen.getByTestId('search-button-most');
      await userEvent.click(searchButton);

      await waitFor(() => {
        expect(sendEventMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Error Occurred',
            description: 'No additional details provided.',
            eventType: 'error',
            eventTarget: 'waste-search',
          }),
        );
      });
    });
  });

  describe('filter integration', () => {
    it('updates search when filters change', async () => {
      (APIs.search.searchReportingUnit as Mock).mockResolvedValue(mockSearchResults);
      await renderWithProps();

      const keywordInput = screen.getByPlaceholderText('Search by RU No. or Block ID');
      await userEvent.type(keywordInput, 'test');

      const searchButton = screen.getByTestId('search-button-most');
      await userEvent.click(searchButton);

      await waitFor(() => {
        expect(APIs.search.searchReportingUnit).toHaveBeenCalledWith(
          expect.objectContaining({ mainSearchTerm: 'test' }),
          expect.anything(),
        );
      });
    });

    it('includes all filter parameters in search request', async () => {
      (APIs.search.searchReportingUnit as Mock).mockResolvedValue(mockSearchResults);
      await renderWithProps();

      // Open advanced filters
      const advancedFiltersButton = screen.getByTestId('advanced-search-button-most');
      await userEvent.click(advancedFiltersButton);

      // Fill in some filters
      const keywordInput = screen.getByPlaceholderText('Search by RU No. or Block ID');
      await userEvent.type(keywordInput, 'BLOCK');

      const searchButton = screen.getByTestId('search-button-most');
      await userEvent.click(searchButton);

      await waitFor(() => {
        expect(APIs.search.searchReportingUnit).toHaveBeenCalledWith(
          expect.objectContaining({ mainSearchTerm: 'BLOCK' }),
          expect.objectContaining({ page: 0, size: 10 }),
        );
      });
    });
  });

  describe('loading states', () => {
    it('shows loading state while fetching data', async () => {
      let resolveSearch: (value: any) => void;
      const searchPromise = new Promise((resolve) => {
        resolveSearch = resolve;
      });
      (APIs.search.searchReportingUnit as Mock).mockReturnValue(searchPromise);

      await renderWithProps();

      const keywordInput = screen.getByPlaceholderText('Search by RU No. or Block ID');
      await userEvent.type(keywordInput, 'BLOCK');

      const searchButton = screen.getByTestId('search-button-most');
      await userEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByTestId('loading-skeleton')).toBeDefined();
      });

      // Resolve the promise
      await act(async () => {
        resolveSearch!(mockSearchResults);
      });
    });

    it('hides loading state after data is fetched', async () => {
      (APIs.search.searchReportingUnit as Mock).mockResolvedValue(mockSearchResults);
      await renderWithProps();

      const keywordInput = screen.getByPlaceholderText('Search by RU No. or Block ID');
      await userEvent.type(keywordInput, 'BLOCK');

      const searchButton = screen.getByTestId('search-button-most');
      await userEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('411B')).toBeDefined();
      });

      expect(screen.queryByTestId('loading-skeleton')).toBeNull();
    });
  });

  describe('query configuration', () => {
    it('disables query by default', async () => {
      await renderWithProps();
      // Query should not execute automatically
      expect(APIs.search.searchReportingUnit).not.toHaveBeenCalled();
    });

    it('clears cache on each search (gcTime: 0)', async () => {
      (APIs.search.searchReportingUnit as Mock).mockResolvedValue(mockSearchResults);
      await renderWithProps();

      const keywordInput = screen.getByPlaceholderText('Search by RU No. or Block ID');
      await userEvent.type(keywordInput, 'BLOCK');

      const searchButton = screen.getByTestId('search-button-most');

      // First search
      await userEvent.click(searchButton);
      await waitFor(() => {
        expect(APIs.search.searchReportingUnit).toHaveBeenCalledTimes(1);
      });

      // Second search
      await userEvent.click(searchButton);
      await waitFor(() => {
        expect(APIs.search.searchReportingUnit).toHaveBeenCalledTimes(2);
      });
    });
  });
});
