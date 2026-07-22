/* eslint-disable @typescript-eslint/no-explicit-any */
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import SpeciesCompositionListTable from './index';

import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { SpeciesCompositionListItem } from '@/services/speciesComposition.types';

import { renderCell } from '@/components/Form/TableResource/types';
import * as hooks from '@/config/react-query/hooks';
import { renderWithAppAsync } from '@/config/tests/renderWithApp';

vi.mock('@/config/react-query/hooks');

const mockUseSpeciesCompositionListQuery = vi.mocked(hooks.useSpeciesCompositionListQuery);

// Mock TableResource to avoid slow Carbon component rendering
vi.mock('@/components/Form/TableResource', () => ({
  default: ({
    headers,
    content,
    loading,
    error,
    onPageChange,
    onSortChange,
    id,
    getRowActions,
  }: any) => {
    let body: React.ReactNode;
    if (loading) {
      body = <div data-testid="loading-skeleton">Loading...</div>;
    } else if (error) {
      body = <div>Something went wrong!</div>;
    } else if (!content?.content || content.content.length === 0) {
      body =
        content?.page?.totalElements === 0 ? (
          <div>No results</div>
        ) : (
          <div>Nothing to show yet!</div>
        );
    } else {
      const hasActions = Boolean(getRowActions);
      body = (
        <table>
          <thead>
            <tr>
              {headers.map((h: any) => (
                <th key={h.key}>{h.header}</th>
              ))}
              {hasActions && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {content.content.map((row: any) => (
              <tr key={row.id}>
                {headers.map((h: any) => (
                  <td key={h.key}>{renderCell(row, h)}</td>
                ))}
                {hasActions && (
                  <td>
                    {getRowActions(row).map((action: any) => (
                      <button key={action.id} onClick={() => action.onClick(row)}>
                        {typeof action.label === 'string' ? action.label : 'Action'}
                      </button>
                    ))}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    return (
      <div data-testid={id}>
        {body}
        <div>
          <label htmlFor="page-size-select">Items per page:</label>
          <select
            id="page-size-select"
            aria-label="Items per page:"
            onChange={(e) =>
              onPageChange?.({
                page: content?.page?.number ?? 0,
                pageSize: Number(e.target.value),
              })
            }
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
          <button
            aria-label="Next page"
            onClick={() =>
              onPageChange?.({
                page: (content?.page?.number ?? 0) + 1,
                pageSize: content?.page?.size ?? 10,
              })
            }
          >
            Next
          </button>
          <button
            aria-label="Previous page"
            onClick={() =>
              onPageChange?.({
                page: (content?.page?.number ?? 0) - 1,
                pageSize: content?.page?.size ?? 10,
              })
            }
          >
            Previous
          </button>
          <button aria-label="Change page only" onClick={() => onPageChange?.({ page: 2 })}>
            Change page only
          </button>
          <button aria-label="Change size only" onClick={() => onPageChange?.({ pageSize: 25 })}>
            Change size only
          </button>
        </div>
        <button
          aria-label="Sort by Start date"
          onClick={() => onSortChange?.({ startDate: 'ASC' })}
        >
          Sort
        </button>
      </div>
    );
  },
}));

const mockData: PageableResponse<SpeciesCompositionListItem> = {
  content: [
    {
      id: 1,
      startDate: '2025-01-01',
      endDate: null,
      uploadedBy: 'admin@gov.bc.ca',
      dateOfUpload: '2025-01-15T10:30:00',
    },
    {
      id: 2,
      startDate: '2024-06-01',
      endDate: '2024-12-31',
      uploadedBy: 'user@gov.bc.ca',
      dateOfUpload: '2024-05-20T14:00:00',
    },
  ],
  page: { number: 0, size: 10, totalElements: 2, totalPages: 1 },
};

const mockEmptyData: PageableResponse<SpeciesCompositionListItem> = {
  content: [],
  page: { number: 0, size: 10, totalElements: 0, totalPages: 0 },
};

const mockMultiPageData: PageableResponse<SpeciesCompositionListItem> = {
  content: [
    {
      id: 1,
      startDate: '2025-01-01',
      endDate: null,
      uploadedBy: 'admin@gov.bc.ca',
      dateOfUpload: '2025-01-15T10:30:00',
    },
  ],
  page: { number: 0, size: 10, totalElements: 25, totalPages: 3 },
};

describe('SpeciesCompositionListTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial rendering', () => {
    it('renders the TableResource with correct id', async () => {
      mockUseSpeciesCompositionListQuery.mockReturnValue({
        data: mockData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<SpeciesCompositionListTable />);

      expect(screen.getByTestId('species-composition-list')).toBeTruthy();
    });

    it('shows loading state when query is loading', async () => {
      mockUseSpeciesCompositionListQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<SpeciesCompositionListTable />);

      screen.getByTestId('loading-skeleton');
    });

    it('calls refetch on mount', async () => {
      const refetch = vi.fn();
      mockUseSpeciesCompositionListQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
        isError: false,
        refetch,
      } as any);
      await renderWithAppAsync(<SpeciesCompositionListTable />);

      expect(refetch).toHaveBeenCalled();
    });
  });

  describe('data display', () => {
    it('displays table data after load', async () => {
      mockUseSpeciesCompositionListQuery.mockReturnValue({
        data: mockData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<SpeciesCompositionListTable />);

      await screen.findByTestId('species-composition-list');
      screen.getByText('admin@gov.bc.ca');
      screen.getByText('January 01, 2025');
      screen.getByText('May 20, 2024');
    });

    it('displays all column headers', async () => {
      mockUseSpeciesCompositionListQuery.mockReturnValue({
        data: mockData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<SpeciesCompositionListTable />);

      await screen.findByText('Start date');
      screen.getByText('End date');
      screen.getByText('Uploaded by');
      screen.getByText('Date of upload');
    });
  });

  describe('empty state', () => {
    it('shows empty state when no results', async () => {
      mockUseSpeciesCompositionListQuery.mockReturnValue({
        data: mockEmptyData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<SpeciesCompositionListTable />);

      screen.getByText('No results');
    });
  });

  describe('error state', () => {
    it('shows error when query fails', async () => {
      mockUseSpeciesCompositionListQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
        isError: true,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<SpeciesCompositionListTable />);

      screen.getByText('Something went wrong!');
    });
  });

  describe('pagination', () => {
    it('handles page change via onPageChange callback', async () => {
      const refetch = vi.fn();
      mockUseSpeciesCompositionListQuery.mockReturnValue({
        data: mockMultiPageData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch,
      } as any);
      await renderWithAppAsync(<SpeciesCompositionListTable />);

      await screen.findByText('Next');
      const nextButton = screen.getByLabelText('Next page');
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(refetch).toHaveBeenCalled();
      });
    });

    it('handles previous page click', async () => {
      const page2Data: PageableResponse<SpeciesCompositionListItem> = {
        ...mockMultiPageData,
        page: { number: 1, size: 10, totalElements: 25, totalPages: 3 },
      };
      mockUseSpeciesCompositionListQuery.mockReturnValue({
        data: page2Data,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<SpeciesCompositionListTable />);

      await screen.findByText('Previous');
      const prevButton = screen.getByLabelText('Previous page');
      await userEvent.click(prevButton);

      await waitFor(() => {
        expect(mockUseSpeciesCompositionListQuery).toHaveBeenCalled();
      });
    });

    it('handles page change when no data is present', async () => {
      const refetch = vi.fn();
      mockUseSpeciesCompositionListQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch,
      } as any);
      await renderWithAppAsync(<SpeciesCompositionListTable />);

      await screen.findByText('Next');
      const nextButton = screen.getByLabelText('Next page');
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(refetch).toHaveBeenCalled();
      });
    });

    it('handles page change with only the page argument', async () => {
      const refetch = vi.fn();
      mockUseSpeciesCompositionListQuery.mockReturnValue({
        data: mockMultiPageData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch,
      } as any);
      await renderWithAppAsync(<SpeciesCompositionListTable />);

      await screen.findByText('Change page only');
      const button = screen.getByLabelText('Change page only');
      await userEvent.click(button);

      await waitFor(() => {
        expect(refetch).toHaveBeenCalled();
      });
    });

    it('handles page change with only the size argument', async () => {
      const refetch = vi.fn();
      mockUseSpeciesCompositionListQuery.mockReturnValue({
        data: mockMultiPageData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch,
      } as any);
      await renderWithAppAsync(<SpeciesCompositionListTable />);

      await screen.findByText('Change size only');
      const button = screen.getByLabelText('Change size only');
      await userEvent.click(button);

      await waitFor(() => {
        expect(refetch).toHaveBeenCalled();
      });
    });
  });

  describe('sorting', () => {
    it('handles sort change via onSortChange callback', async () => {
      const refetch = vi.fn();
      mockUseSpeciesCompositionListQuery.mockReturnValue({
        data: mockData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch,
      } as any);
      await renderWithAppAsync(<SpeciesCompositionListTable />);

      await screen.findByText('Sort');
      const sortButton = screen.getByLabelText('Sort by Start date');
      await userEvent.click(sortButton);

      await waitFor(() => {
        expect(refetch).toHaveBeenCalled();
      });
    });
  });

  describe('query configuration', () => {
    it('uses enabled: false by default', async () => {
      mockUseSpeciesCompositionListQuery.mockReturnValue({
        data: mockData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<SpeciesCompositionListTable />);

      const callArgs = mockUseSpeciesCompositionListQuery.mock.calls[0];
      expect(callArgs[1]).toEqual(expect.objectContaining({ enabled: false, staleTime: Infinity }));
    });
  });

  describe('row actions', () => {
    it('renders Actions column when getRowActions is provided', async () => {
      mockUseSpeciesCompositionListQuery.mockReturnValue({
        data: mockData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<SpeciesCompositionListTable />);

      await screen.findByTestId('species-composition-list');
      screen.getByText('Actions');
    });

    it('renders See details button for each row', async () => {
      mockUseSpeciesCompositionListQuery.mockReturnValue({
        data: mockData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<SpeciesCompositionListTable />);

      await screen.findByTestId('species-composition-list');
      const seeDetailsButtons = screen.getAllByText('See details');
      expect(seeDetailsButtons).toHaveLength(mockData.content.length);
    });
  });
});
