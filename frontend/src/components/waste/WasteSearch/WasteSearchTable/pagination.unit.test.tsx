import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';

import WasteSearchTable from './index';

import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { ReportingUnitSearchResultDto } from '@/services/search.types';

import { renderWithAppAsync } from '@/config/tests/renderWithApp';
import * as useNotificationEvents from '@/hooks/useNotificationEvents';
import APIs from '@/services/APIs';

// Mock WasteSearchFilters
vi.mock('@/components/waste/WasteSearch/WasteSearchFilters', () => ({
  default: ({ value, onChange, onSearch }: any) => (
    <div>
      <input
        placeholder="Search by RU No. or Block ID"
        value={value.mainSearchTerm || ''}
        onChange={(e) => onChange({ ...value, mainSearchTerm: e.target.value })}
      />
      <button data-testid="search-button-most" onClick={onSearch}>
        Search
      </button>
      <button data-testid="advanced-search-button-most" onClick={() => {}}>
        Advanced
      </button>
    </div>
  ),
}));

// Mock TableResource
vi.mock('@/components/Form/TableResource', () => ({
  default: ({ headers, content, loading, error, onPageChange, onSortChange, id }: any) => {
    if (loading) {
      return <div data-testid="loading-skeleton">Loading...</div>;
    }
    if (error) {
      return <div>Something went wrong!</div>;
    }
    if (!content?.content || content.content.length === 0) {
      return content?.page?.totalElements === 0 ? (
        <div>No results</div>
      ) : (
        <div>Nothing to show yet!</div>
      );
    }
    return (
      <div data-testid={id}>
        <table>
          <thead>
            <tr>
              {headers.map((h: any, idx: number) => (
                <th
                  key={`${idx}-${h.key}`}
                  onClick={() => h.isSortable && onSortChange?.({ [h.key]: 'ASC' })}
                >
                  {h.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {content.content.map((row: any) => (
              <tr key={row.id}>
                <td>{row.cutBlockId}</td>
                <td>{row.ruNumber}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div>
          <label htmlFor="page-size-select">Items per page:</label>
          <select
            id="page-size-select"
            aria-label="Items per page:"
            onChange={(e) =>
              onPageChange?.({ page: content.page.number, pageSize: Number(e.target.value) })
            }
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
          <button
            aria-label="Next page"
            onClick={() =>
              onPageChange?.({ page: content.page.number + 1, pageSize: content.page.size })
            }
          >
            Next
          </button>
        </div>
      </div>
    );
  },
}));

vi.mock('@/services/APIs', () => {
  return {
    default: {
      user: {
        getUserPreferences: vi.fn(),
        updateUserPreferences: vi.fn(),
        setUserBookmarkedRu: vi.fn(),
        deleteUserBookmarkedRu: vi.fn(),
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
      cutBlockId: '411B',
      wasteAssessmentAreaId: 411,
      ruNumber: 4069,
      client: { code: '00010005', description: 'JACOB FEHR' },
      licenseNumber: 'A12345',
      cuttingPermit: 'CP001',
      timberMark: 'TM001',
      multiMark: false,
      secondaryEntry: false,
      sampling: { code: 'OCU', description: 'Ocular' },
      district: { code: 'DCC', description: 'Cariboo-Chilcotin' },
      status: { code: 'BIS', description: 'Billing Issued' },
      lastUpdated: '2006-09-08T08:24:17',
      bookmarked: false,
    },
  ],
  page: {
    number: 0,
    size: 10,
    totalElements: 50,
    totalPages: 5,
  },
};

const altMockSearchResults1: PageableResponse<ReportingUnitSearchResultDto> = {
  content: [
    {
      id: 'RU-4069-Block-521B-224813683',
      cutBlockId: '521B',
      wasteAssessmentAreaId: 521,
      ruNumber: 4069,
      client: { code: '00010005', description: 'JACOB FEHR' },
      licenseNumber: 'A12345',
      cuttingPermit: 'CP001',
      timberMark: 'TM001',
      multiMark: false,
      secondaryEntry: false,
      sampling: { code: 'OCU', description: 'Ocular' },
      district: { code: 'DCC', description: 'Cariboo-Chilcotin' },
      status: { code: 'BIS', description: 'Billing Issued' },
      lastUpdated: '2006-09-08T08:24:17',
      bookmarked: false,
    },
  ],
  page: {
    number: 0,
    size: 10,
    totalElements: 50,
    totalPages: 5,
  },
};

const altMockSearchResults2: PageableResponse<ReportingUnitSearchResultDto> = {
  content: [
    {
      id: 'RU-4069-Block-631B-224813681',
      cutBlockId: '631B',
      wasteAssessmentAreaId: 631,
      ruNumber: 4069,
      client: { code: '00010005', description: 'JACOB FEHR' },
      licenseNumber: 'A12345',
      cuttingPermit: 'CP001',
      timberMark: 'TM001',
      multiMark: false,
      secondaryEntry: false,
      sampling: { code: 'OCU', description: 'Ocular' },
      district: { code: 'DCC', description: 'Cariboo-Chilcotin' },
      status: { code: 'BIS', description: 'Billing Issued' },
      lastUpdated: '2006-09-08T08:24:17',
      bookmarked: false,
    },
  ],
  page: {
    number: 0,
    size: 10,
    totalElements: 2,
    totalPages: 1,
  },
};

const setInputValue = (input: HTMLElement, value: string) => {
  fireEvent.change(input, { target: { value } });
};

const renderWithProps = () => renderWithAppAsync(<WasteSearchTable />);

describe('WasteSearchTable - Pagination', () => {
  let sendEventMock: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    sendEventMock = vi.fn();
    vi.spyOn(useNotificationEvents, 'default').mockReturnValue({
      clearEvents: vi.fn(),
      sendEvent: sendEventMock,
      sendInlineEvent: vi.fn(),
      sendToastEvent: vi.fn(),
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
    (APIs.search.searchReportingUnit as Mock).mockResolvedValue(mockSearchResults);
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
      setInputValue(keywordInput, 'BLOCK');

      const searchButton = screen.getByTestId('search-button-most');
      await userEvent.click(searchButton);

      await waitFor(() => {
        screen.getByText('411B');
      });

      const nextPageButton = screen.getByLabelText('Next page');
      await userEvent.click(nextPageButton);

      await waitFor(() => {
        expect(APIs.search.searchReportingUnit).toHaveBeenCalledWith(
          expect.objectContaining({ mainSearchTerm: 'BLOCK' }),
          expect.objectContaining({ page: 1, size: 10 }),
          expect.objectContaining({ notificationTarget: 'waste-search' }),
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
      setInputValue(keywordInput, 'BLOCK');

      const searchButton = screen.getByTestId('search-button-most');
      await userEvent.click(searchButton);

      await waitFor(() => {
        screen.getByText('411B');
      });

      const pageSizeSelect = screen.getByLabelText('Items per page:');
      await userEvent.selectOptions(pageSizeSelect, '20');

      await waitFor(() => {
        expect(APIs.search.searchReportingUnit).toHaveBeenCalledWith(
          expect.objectContaining({ mainSearchTerm: 'BLOCK' }),
          expect.objectContaining({ page: 0, size: 20 }),
          expect.objectContaining({ notificationTarget: 'waste-search' }),
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
      setInputValue(keywordInput, 'BLOCK');

      const searchButton = screen.getByTestId('search-button-most');
      await userEvent.click(searchButton);

      await waitFor(() => {
        expect(APIs.search.searchReportingUnit).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ page: 0 }),
          expect.objectContaining({ notificationTarget: 'waste-search' }),
        );
      });
    });

    it('resets to first page when a new search is requested', async () => {
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
      setInputValue(keywordInput, 'BLOCK');

      const searchButton = screen.getByTestId('search-button-most');
      await userEvent.click(searchButton);

      await waitFor(() => {
        screen.getByText('411B');
      });

      const secondPageResults: PageableResponse<ReportingUnitSearchResultDto> = {
        ...altMockSearchResults1,
        page: {
          number: 1,
          size: 10,
          totalElements: 50,
          totalPages: 5,
        },
      };
      (APIs.search.searchReportingUnit as Mock).mockResolvedValue(secondPageResults);

      const nextPageButton = screen.getByLabelText('Next page');
      await userEvent.click(nextPageButton);

      await waitFor(() => {
        expect(APIs.search.searchReportingUnit).toHaveBeenCalledWith(
          expect.objectContaining({ mainSearchTerm: 'BLOCK' }),
          expect.objectContaining({ page: 1, size: 10 }),
          expect.objectContaining({ notificationTarget: 'waste-search' }),
        );
      });

      await waitFor(() => {
        screen.getByText('521B');
      });

      const fewResults: PageableResponse<ReportingUnitSearchResultDto> = {
        ...altMockSearchResults2,
      };
      (APIs.search.searchReportingUnit as Mock).mockResolvedValue(fewResults);

      setInputValue(keywordInput, 'LESS');
      await userEvent.click(searchButton);

      await waitFor(() => {
        expect(APIs.search.searchReportingUnit).toHaveBeenCalledWith(
          expect.objectContaining({ mainSearchTerm: 'LESS' }),
          expect.objectContaining({ page: 0 }),
          expect.objectContaining({ notificationTarget: 'waste-search' }),
        );
      });

      await waitFor(() => {
        screen.getByText('631B');
      });
    });
  });
});
