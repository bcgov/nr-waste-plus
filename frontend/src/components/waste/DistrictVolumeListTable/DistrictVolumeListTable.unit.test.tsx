/* eslint-disable @typescript-eslint/no-explicit-any */
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import DistrictVolumeListTable from './index';

import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { DistrictVolumeListItem } from '@/services/districtvolumes.types';

import { renderCell, resolveTableRowActionValue } from '@/components/Form/TableResource/types';
import * as hooks from '@/config/react-query/hooks';
import { renderWithAppAsync } from '@/config/tests/renderWithApp';
import { sendToastEvent } from '@/hooks/useNotificationEvents/eventHandler';

vi.mock('@/config/react-query/hooks');

vi.mock('@/hooks/useNotificationEvents/eventHandler', () => ({
  sendEvent: vi.fn(),
  sendToastEvent: vi.fn(),
  sendInlineEvent: vi.fn(),
}));

const { latestConfirmHandler } = vi.hoisted(() => ({
  latestConfirmHandler: { current: undefined as (() => void) | undefined },
}));

vi.mock('@/components/waste/ConfigurationDeleteConfirmModal', () => ({
  default: ({ open, configurationType, isDeleting, onConfirm, onClose }: any) => {
    latestConfirmHandler.current = onConfirm;
    return open ? (
      <div data-testid="delete-confirm-modal">
        <span>{configurationType}</span>
        <button disabled={isDeleting} onClick={onConfirm}>
          Confirm delete
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null;
  },
}));

const mockUseDistrictVolumeListQuery = vi.mocked(hooks.useDistrictVolumeListQuery);
const mockUseDistrictVolumeTableDeleteMutation = vi.mocked(
  hooks.useDistrictVolumeTableDeleteMutation,
);

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
                        {resolveTableRowActionValue(action.label, row)}
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
        </div>
        <button aria-label="Sort by Area" onClick={() => onSortChange?.({ area: 'ASC' })}>
          Sort
        </button>
      </div>
    );
  },
}));

const mockData: PageableResponse<DistrictVolumeListItem> = {
  content: [
    {
      id: 1,
      area: 'INTERIOR',
      startDate: '2025-01-01',
      endDate: null,
      uploadedBy: 'admin@gov.bc.ca',
      dateOfUpload: '2025-01-15T10:30:00',
    },
    {
      id: 2,
      area: 'COASTAL',
      startDate: '2024-06-01',
      endDate: '2024-12-31',
      uploadedBy: 'user@gov.bc.ca',
      dateOfUpload: '2024-05-20T14:00:00',
    },
  ],
  page: { number: 0, size: 10, totalElements: 2, totalPages: 1 },
};

const mockEmptyData: PageableResponse<DistrictVolumeListItem> = {
  content: [],
  page: { number: 0, size: 10, totalElements: 0, totalPages: 0 },
};

const mockMultiPageData: PageableResponse<DistrictVolumeListItem> = {
  content: [
    {
      id: 1,
      area: 'INTERIOR',
      startDate: '2025-01-01',
      endDate: null,
      uploadedBy: 'admin@gov.bc.ca',
      dateOfUpload: '2025-01-15T10:30:00',
    },
  ],
  page: { number: 0, size: 10, totalElements: 25, totalPages: 3 },
};

const mockFutureData: PageableResponse<DistrictVolumeListItem> = {
  content: [
    {
      id: 3,
      area: 'INTERIOR',
      startDate: '2026-09-01',
      endDate: null,
      uploadedBy: 'admin@gov.bc.ca',
      dateOfUpload: '2026-08-01T10:00:00',
    },
  ],
  page: { number: 0, size: 10, totalElements: 1, totalPages: 1 },
};

describe('DistrictVolumeListTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDistrictVolumeTableDeleteMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    } as any);
  });

  describe('initial rendering', () => {
    it('renders the TableResource with correct id', async () => {
      mockUseDistrictVolumeListQuery.mockReturnValue({
        data: mockData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<DistrictVolumeListTable />);

      expect(screen.getByTestId('district-volume-list')).toBeTruthy();
    });

    it('shows loading state when query is loading', async () => {
      mockUseDistrictVolumeListQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<DistrictVolumeListTable />);

      screen.getByTestId('loading-skeleton');
    });

    it('calls refetch on mount', async () => {
      const refetch = vi.fn();
      mockUseDistrictVolumeListQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
        isError: false,
        refetch,
      } as any);
      await renderWithAppAsync(<DistrictVolumeListTable />);

      expect(refetch).toHaveBeenCalled();
    });
  });

  describe('data display', () => {
    it('displays table data after load', async () => {
      mockUseDistrictVolumeListQuery.mockReturnValue({
        data: mockData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<DistrictVolumeListTable />);

      await screen.findByTestId('district-volume-list');
      screen.getByText('Interior');
      screen.getByText('Coast');
    });

    it('displays all column headers', async () => {
      mockUseDistrictVolumeListQuery.mockReturnValue({
        data: mockData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<DistrictVolumeListTable />);

      await screen.findByText('Area');
      screen.getByText('Start date');
      screen.getByText('End date');
      screen.getByText('Uploaded by');
      screen.getByText('Date of upload');
    });
  });

  describe('empty state', () => {
    it('shows empty state when no results', async () => {
      mockUseDistrictVolumeListQuery.mockReturnValue({
        data: mockEmptyData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<DistrictVolumeListTable />);

      screen.getByText('No results');
    });
  });

  describe('error state', () => {
    it('shows error when query fails', async () => {
      mockUseDistrictVolumeListQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
        isError: true,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<DistrictVolumeListTable />);

      screen.getByText('Something went wrong!');
    });
  });

  describe('pagination', () => {
    it('handles page change via onPageChange callback', async () => {
      const refetch = vi.fn();
      mockUseDistrictVolumeListQuery.mockReturnValue({
        data: mockMultiPageData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch,
      } as any);
      await renderWithAppAsync(<DistrictVolumeListTable />);

      await screen.findByText('Next');
      const nextButton = screen.getByLabelText('Next page');
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(refetch).toHaveBeenCalled();
      });
    });

    it('handles previous page click', async () => {
      const page2Data: PageableResponse<DistrictVolumeListItem> = {
        ...mockMultiPageData,
        page: { number: 1, size: 10, totalElements: 25, totalPages: 3 },
      };
      mockUseDistrictVolumeListQuery.mockReturnValue({
        data: page2Data,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<DistrictVolumeListTable />);

      await screen.findByText('Previous');
      const prevButton = screen.getByLabelText('Previous page');
      await userEvent.click(prevButton);

      await waitFor(() => {
        expect(mockUseDistrictVolumeListQuery).toHaveBeenCalled();
      });
    });

    it('handles page change when no data is present', async () => {
      const refetch = vi.fn();
      mockUseDistrictVolumeListQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch,
      } as any);
      await renderWithAppAsync(<DistrictVolumeListTable />);

      await screen.findByText('Next');
      const nextButton = screen.getByLabelText('Next page');
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(refetch).toHaveBeenCalled();
      });
    });
  });

  describe('sorting', () => {
    it('handles sort change via onSortChange callback', async () => {
      const refetch = vi.fn();
      mockUseDistrictVolumeListQuery.mockReturnValue({
        data: mockData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch,
      } as any);
      await renderWithAppAsync(<DistrictVolumeListTable />);

      await screen.findByText('Sort');
      const sortButton = screen.getByLabelText('Sort by Area');
      await userEvent.click(sortButton);

      await waitFor(() => {
        expect(refetch).toHaveBeenCalled();
      });
    });
  });

  describe('query configuration', () => {
    it('uses enabled: false by default', async () => {
      mockUseDistrictVolumeListQuery.mockReturnValue({
        data: mockData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<DistrictVolumeListTable />);

      const callArgs = mockUseDistrictVolumeListQuery.mock.calls[0];
      expect(callArgs[1]).toEqual(expect.objectContaining({ enabled: false, staleTime: Infinity }));
    });
  });

  describe('row actions', () => {
    it('renders Actions column when getRowActions is provided', async () => {
      mockUseDistrictVolumeListQuery.mockReturnValue({
        data: mockData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<DistrictVolumeListTable />);

      await screen.findByTestId('district-volume-list');
      screen.getByText('Actions');
    });

    it('renders See details button for each row', async () => {
      mockUseDistrictVolumeListQuery.mockReturnValue({
        data: mockData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<DistrictVolumeListTable />);

      await screen.findByTestId('district-volume-list');
      const seeDetailsButtons = screen.getAllByText('See details');
      expect(seeDetailsButtons).toHaveLength(mockData.content.length);
    });

    it('exposes a Delete action only for future-dated rows', async () => {
      mockUseDistrictVolumeListQuery.mockReturnValue({
        data: mockFutureData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<DistrictVolumeListTable />);

      await screen.findByTestId('district-volume-list');
      screen.getByRole('button', { name: 'Delete district volume starting 2026-09-01' });
      expect(screen.queryByText('Delete district volume starting 2025-01-01')).toBeNull();
    });

    it('does not render a Delete action for current or past rows', async () => {
      mockUseDistrictVolumeListQuery.mockReturnValue({
        data: mockData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<DistrictVolumeListTable />);

      await screen.findByTestId('district-volume-list');
      expect(screen.queryByText(/Delete district volume starting/)).toBeNull();
    });
  });

  describe('deletion flow', () => {
    it('opens the confirmation modal when Delete is picked', async () => {
      mockUseDistrictVolumeListQuery.mockReturnValue({
        data: mockFutureData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<DistrictVolumeListTable />);

      await screen.findByRole('button', { name: 'Delete district volume starting 2026-09-01' });
      await userEvent.click(
        screen.getByRole('button', { name: 'Delete district volume starting 2026-09-01' }),
      );

      expect(screen.getByTestId('delete-confirm-modal')).toBeTruthy();
      screen.getByText('district volume');
    });

    it('confirms deletion by calling the mutation with the row id', async () => {
      const mutate = vi.fn();
      mockUseDistrictVolumeTableDeleteMutation.mockReturnValue({
        mutate,
        isPending: false,
        isError: false,
        error: null,
      } as any);
      mockUseDistrictVolumeListQuery.mockReturnValue({
        data: mockFutureData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<DistrictVolumeListTable />);

      await screen.findByRole('button', { name: 'Delete district volume starting 2026-09-01' });
      await userEvent.click(
        screen.getByRole('button', { name: 'Delete district volume starting 2026-09-01' }),
      );
      await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

      expect(mutate).toHaveBeenCalledWith(3);
    });

    it('keeps the confirm button disabled while the deletion is pending', async () => {
      mockUseDistrictVolumeTableDeleteMutation.mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
        isError: false,
        error: null,
      } as any);
      mockUseDistrictVolumeListQuery.mockReturnValue({
        data: mockFutureData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<DistrictVolumeListTable />);

      await screen.findByRole('button', { name: 'Delete district volume starting 2026-09-01' });
      await userEvent.click(
        screen.getByRole('button', { name: 'Delete district volume starting 2026-09-01' }),
      );

      expect(
        (screen.getByRole('button', { name: 'Confirm delete' }) as HTMLButtonElement).disabled,
      ).toBe(true);
    });

    it('cancelling leaves the data untouched and closes the modal', async () => {
      const mutate = vi.fn();
      mockUseDistrictVolumeTableDeleteMutation.mockReturnValue({
        mutate,
        isPending: false,
        isError: false,
        error: null,
      } as any);
      mockUseDistrictVolumeListQuery.mockReturnValue({
        data: mockFutureData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<DistrictVolumeListTable />);

      await screen.findByRole('button', { name: 'Delete district volume starting 2026-09-01' });
      await userEvent.click(
        screen.getByRole('button', { name: 'Delete district volume starting 2026-09-01' }),
      );
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(mutate).not.toHaveBeenCalled();
      expect(screen.queryByTestId('delete-confirm-modal')).toBeNull();
      screen.getByRole('button', { name: 'Delete district volume starting 2026-09-01' });
    });

    it('refreshes the list and shows a success toast after a successful delete', async () => {
      const refetch = vi.fn();
      let capturedOnSuccess: (() => void) | undefined;
      mockUseDistrictVolumeTableDeleteMutation.mockImplementation((options) => {
        capturedOnSuccess = options?.onSuccess;
        return { mutate: vi.fn(), isPending: false, isError: false, error: null } as any;
      });
      mockUseDistrictVolumeListQuery.mockReturnValue({
        data: mockFutureData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch,
      } as any);
      await renderWithAppAsync(<DistrictVolumeListTable />);

      await screen.findByRole('button', { name: 'Delete district volume starting 2026-09-01' });
      await userEvent.click(
        screen.getByRole('button', { name: 'Delete district volume starting 2026-09-01' }),
      );
      await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

      await act(async () => {
        capturedOnSuccess?.();
      });

      expect(refetch).toHaveBeenCalled();
      expect(sendToastEvent).toHaveBeenCalledWith({
        title: 'District volume deleted',
        description: 'The district volume configuration was deleted.',
        eventType: 'success',
      });
      expect(screen.queryByTestId('delete-confirm-modal')).toBeNull();
    });

    it('keeps the row visible and shows no success toast when the delete fails', async () => {
      mockUseDistrictVolumeTableDeleteMutation.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        isError: true,
        error: new Error('Unprocessable Entity'),
      } as any);
      mockUseDistrictVolumeListQuery.mockReturnValue({
        data: mockFutureData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<DistrictVolumeListTable />);

      await screen.findByRole('button', { name: 'Delete district volume starting 2026-09-01' });
      await userEvent.click(
        screen.getByRole('button', { name: 'Delete district volume starting 2026-09-01' }),
      );
      await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

      screen.getByRole('button', { name: 'Delete district volume starting 2026-09-01' });
      expect(sendToastEvent).not.toHaveBeenCalled();
    });

    it('no-ops a stale confirm once the row has been cleared', async () => {
      const mutate = vi.fn();
      mockUseDistrictVolumeTableDeleteMutation.mockReturnValue({
        mutate,
        isPending: false,
        isError: false,
        error: null,
      } as any);
      mockUseDistrictVolumeListQuery.mockReturnValue({
        data: mockFutureData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<DistrictVolumeListTable />);

      await screen.findByRole('button', { name: 'Delete district volume starting 2026-09-01' });
      await userEvent.click(
        screen.getByRole('button', { name: 'Delete district volume starting 2026-09-01' }),
      );
      // Close the modal so the confirm handler now closes over a cleared row.
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByTestId('delete-confirm-modal')).toBeNull();

      // Simulate a stale/racing confirm arriving after the row was cleared.
      act(() => {
        latestConfirmHandler.current?.();
      });

      expect(mutate).not.toHaveBeenCalled();
    });
  });
});
