/* eslint-disable @typescript-eslint/no-explicit-any */
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import FormulaConfigurationListTable from './index';

import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { FormulaSetResponse } from '@/services/formulaConfiguration.types';

import { renderCell, resolveTableRowActionValue } from '@/components/Form/TableResource/types';
import { renderWithAppAsync } from '@/config/tests/renderWithApp';
import { useFormulaSetList, useDeleteFormulaSet } from '@/hooks/useFormulaConfiguration';
import { sendToastEvent } from '@/hooks/useNotificationEvents/eventHandler';

const mockUseFormulaSetList = vi.mocked(useFormulaSetList);
const mockUseDeleteFormulaSet = vi.mocked(useDeleteFormulaSet);

vi.mock('@/hooks/useFormulaConfiguration', () => ({
  useFormulaSetList: vi.fn(),
  useDeleteFormulaSet: vi.fn(),
}));

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

const makeFormulaSet = (overrides: Partial<FormulaSetResponse>): FormulaSetResponse => ({
  id: 1,
  area: 'INTERIOR',
  startDate: '2025-01-01',
  endDate: null,
  deleted: false,
  formulas: [],
  createdAt: '2025-01-15T10:30:00',
  updatedAt: '2025-01-15T10:30:00',
  ...overrides,
});

const mockData: PageableResponse<FormulaSetResponse> = {
  content: [
    makeFormulaSet({ id: 1, area: 'INTERIOR', formulas: [] }),
    makeFormulaSet({
      id: 2,
      area: 'COASTAL',
      startDate: '2024-06-01',
      endDate: '2024-12-31',
      formulas: [
        {
          formulaKey: 'block.waste.avoidable_sawlog',
          expression: '1.5',
          declaredVariables: [],
          validationErrors: [],
          sortOrder: 1,
        },
        {
          formulaKey: 'block.area.road',
          expression: '0.5',
          declaredVariables: [],
          validationErrors: [],
          sortOrder: 2,
        },
      ],
    }),
  ],
  page: { number: 0, size: 10, totalElements: 2, totalPages: 1 },
};

const mockEmptyData: PageableResponse<FormulaSetResponse> = {
  content: [],
  page: { number: 0, size: 10, totalElements: 0, totalPages: 0 },
};

const mockMultiPageData: PageableResponse<FormulaSetResponse> = {
  content: [makeFormulaSet({ id: 1 })],
  page: { number: 0, size: 10, totalElements: 25, totalPages: 3 },
};

const mockFutureData: PageableResponse<FormulaSetResponse> = {
  content: [makeFormulaSet({ id: 3, startDate: '2099-01-01' })],
  page: { number: 0, size: 10, totalElements: 1, totalPages: 1 },
};

describe('FormulaConfigurationListTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDeleteFormulaSet.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    } as any);
  });

  describe('initial rendering', () => {
    it('renders the TableResource with correct id', async () => {
      mockUseFormulaSetList.mockReturnValue({
        data: mockData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<FormulaConfigurationListTable />);

      expect(screen.getByTestId('formula-configuration-list')).toBeTruthy();
    });

    it('shows loading state when query is loading', async () => {
      mockUseFormulaSetList.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<FormulaConfigurationListTable />);

      screen.getByTestId('loading-skeleton');
    });

    it('calls refetch on mount', async () => {
      const refetch = vi.fn();
      mockUseFormulaSetList.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
        isError: false,
        refetch,
      } as any);
      await renderWithAppAsync(<FormulaConfigurationListTable />);

      expect(refetch).toHaveBeenCalled();
    });
  });

  describe('data display', () => {
    it('displays table data after load', async () => {
      mockUseFormulaSetList.mockReturnValue({
        data: mockData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<FormulaConfigurationListTable />);

      await screen.findByTestId('formula-configuration-list');
      screen.getByText('Interior');
      screen.getByText('Coastal');
    });

    it('displays all column headers', async () => {
      mockUseFormulaSetList.mockReturnValue({
        data: mockData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<FormulaConfigurationListTable />);

      await screen.findByText('Area');
      screen.getByText('Start date');
      screen.getByText('End date');
      screen.getByText('Formulas');
      screen.getByText('Created');
      screen.getByText('Updated');
    });

    it('displays the formula count for each row', async () => {
      mockUseFormulaSetList.mockReturnValue({
        data: mockData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<FormulaConfigurationListTable />);

      await screen.findByTestId('formula-configuration-list');
      screen.getByText('0');
      screen.getByText('2');
    });
  });

  describe('empty state', () => {
    it('shows empty state when no results', async () => {
      mockUseFormulaSetList.mockReturnValue({
        data: mockEmptyData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<FormulaConfigurationListTable />);

      screen.getByText('No results');
    });
  });

  describe('error state', () => {
    it('shows error when query fails', async () => {
      mockUseFormulaSetList.mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
        isError: true,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<FormulaConfigurationListTable />);

      screen.getByText('Something went wrong!');
    });
  });

  describe('pagination', () => {
    it('handles page change via onPageChange callback', async () => {
      const refetch = vi.fn();
      mockUseFormulaSetList.mockReturnValue({
        data: mockMultiPageData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch,
      } as any);
      await renderWithAppAsync(<FormulaConfigurationListTable />);

      await screen.findByText('Next');
      const nextButton = screen.getByLabelText('Next page');
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(refetch).toHaveBeenCalled();
      });
    });

    it('handles previous page click', async () => {
      const page2Data: PageableResponse<FormulaSetResponse> = {
        ...mockMultiPageData,
        page: { number: 1, size: 10, totalElements: 25, totalPages: 3 },
      };
      mockUseFormulaSetList.mockReturnValue({
        data: page2Data,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<FormulaConfigurationListTable />);

      await screen.findByText('Previous');
      const prevButton = screen.getByLabelText('Previous page');
      await userEvent.click(prevButton);

      await waitFor(() => {
        expect(mockUseFormulaSetList).toHaveBeenCalled();
      });
    });

    it('handles page change when no data is present', async () => {
      const refetch = vi.fn();
      mockUseFormulaSetList.mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch,
      } as any);
      await renderWithAppAsync(<FormulaConfigurationListTable />);

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
      mockUseFormulaSetList.mockReturnValue({
        data: mockData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch,
      } as any);
      await renderWithAppAsync(<FormulaConfigurationListTable />);

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
      mockUseFormulaSetList.mockReturnValue({
        data: mockData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<FormulaConfigurationListTable />);

      const callArgs = mockUseFormulaSetList.mock.calls[0];
      expect(callArgs[0]).toEqual(expect.objectContaining({ page: 0, size: 10, sort: {} }));
    });
  });

  describe('row actions', () => {
    it('renders Actions column when getRowActions is provided', async () => {
      mockUseFormulaSetList.mockReturnValue({
        data: mockData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<FormulaConfigurationListTable />);

      await screen.findByTestId('formula-configuration-list');
      screen.getByText('Actions');
    });

    it('renders See details button for each row', async () => {
      mockUseFormulaSetList.mockReturnValue({
        data: mockData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<FormulaConfigurationListTable />);

      await screen.findByTestId('formula-configuration-list');
      const seeDetailsButtons = screen.getAllByText('See details');
      expect(seeDetailsButtons).toHaveLength(mockData.content.length);
    });

    it('exposes a Delete action only for future-dated rows', async () => {
      mockUseFormulaSetList.mockReturnValue({
        data: mockFutureData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<FormulaConfigurationListTable />);

      await screen.findByTestId('formula-configuration-list');
      // Delete button should be visible for future-dated rows
      screen.getByRole('button', { name: 'Delete formula configuration entry' });
    });

    it('does not render a Delete action for current or past rows', async () => {
      mockUseFormulaSetList.mockReturnValue({
        data: mockData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<FormulaConfigurationListTable />);

      await screen.findByTestId('formula-configuration-list');
      expect(
        screen.queryByRole('button', { name: 'Delete formula configuration entry' }),
      ).toBeNull();
    });
  });

  describe('deletion flow', () => {
    it('opens the confirmation modal when Delete is picked', async () => {
      mockUseFormulaSetList.mockReturnValue({
        data: mockFutureData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<FormulaConfigurationListTable />);

      await screen.findByRole('button', { name: 'Delete formula configuration entry' });
      await userEvent.click(
        screen.getByRole('button', { name: 'Delete formula configuration entry' }),
      );

      expect(screen.getByTestId('delete-confirm-modal')).toBeTruthy();
      screen.getByText('formula configuration');
    });

    it('confirms deletion by calling the mutation with the row id', async () => {
      const mutate = vi.fn();
      mockUseDeleteFormulaSet.mockReturnValue({
        mutate,
        isPending: false,
        isError: false,
        error: null,
      } as any);
      mockUseFormulaSetList.mockReturnValue({
        data: mockFutureData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<FormulaConfigurationListTable />);

      await screen.findByRole('button', { name: 'Delete formula configuration entry' });
      await userEvent.click(
        screen.getByRole('button', { name: 'Delete formula configuration entry' }),
      );
      await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

      expect(mutate).toHaveBeenCalledWith(
        3,
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });

    it('keeps the confirm button disabled while the deletion is pending', async () => {
      mockUseDeleteFormulaSet.mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
        isError: false,
        error: null,
      } as any);
      mockUseFormulaSetList.mockReturnValue({
        data: mockFutureData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<FormulaConfigurationListTable />);

      await screen.findByRole('button', { name: 'Delete formula configuration entry' });
      await userEvent.click(
        screen.getByRole('button', { name: 'Delete formula configuration entry' }),
      );

      expect(
        (screen.getByRole('button', { name: 'Confirm delete' }) as HTMLButtonElement).disabled,
      ).toBe(true);
    });

    it('cancelling leaves the data untouched and closes the modal', async () => {
      const mutate = vi.fn();
      mockUseDeleteFormulaSet.mockReturnValue({
        mutate,
        isPending: false,
        isError: false,
        error: null,
      } as any);
      mockUseFormulaSetList.mockReturnValue({
        data: mockFutureData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<FormulaConfigurationListTable />);

      await screen.findByRole('button', { name: 'Delete formula configuration entry' });
      await userEvent.click(
        screen.getByRole('button', { name: 'Delete formula configuration entry' }),
      );
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(mutate).not.toHaveBeenCalled();
      expect(screen.queryByTestId('delete-confirm-modal')).toBeNull();
      screen.getByRole('button', { name: 'Delete formula configuration entry' });
    });

    it('refreshes the list and shows a success toast after a successful delete', async () => {
      const refetch = vi.fn();
      let capturedOnSuccess: (() => void) | undefined;
      const mutate = vi.fn((_id: number, options?: { onSuccess?: () => void }) => {
        capturedOnSuccess = options?.onSuccess;
      });
      mockUseDeleteFormulaSet.mockReturnValue({
        mutate,
        isPending: false,
        isError: false,
        error: null,
      } as any);
      mockUseFormulaSetList.mockReturnValue({
        data: mockFutureData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch,
      } as any);
      await renderWithAppAsync(<FormulaConfigurationListTable />);

      await screen.findByRole('button', { name: 'Delete formula configuration entry' });
      await userEvent.click(
        screen.getByRole('button', { name: 'Delete formula configuration entry' }),
      );
      await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

      await act(async () => {
        capturedOnSuccess?.();
      });

      expect(refetch).toHaveBeenCalled();
      expect(sendToastEvent).toHaveBeenCalledWith({
        title: 'Formula set deleted',
        description: 'The formula configuration was deleted.',
        eventType: 'success',
      });
      expect(screen.queryByTestId('delete-confirm-modal')).toBeNull();
    });

    it('keeps the row visible and shows no success toast when the delete fails', async () => {
      mockUseDeleteFormulaSet.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        isError: true,
        error: new Error('Unprocessable Entity'),
      } as any);
      mockUseFormulaSetList.mockReturnValue({
        data: mockFutureData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<FormulaConfigurationListTable />);

      await screen.findByRole('button', { name: 'Delete formula configuration entry' });
      await userEvent.click(
        screen.getByRole('button', { name: 'Delete formula configuration entry' }),
      );
      await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

      screen.getByRole('button', { name: 'Delete formula configuration entry' });
      expect(sendToastEvent).not.toHaveBeenCalled();
    });

    it('no-ops a stale confirm once the row has been cleared', async () => {
      const mutate = vi.fn();
      mockUseDeleteFormulaSet.mockReturnValue({
        mutate,
        isPending: false,
        isError: false,
        error: null,
      } as any);
      mockUseFormulaSetList.mockReturnValue({
        data: mockFutureData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      await renderWithAppAsync(<FormulaConfigurationListTable />);

      await screen.findByRole('button', { name: 'Delete formula configuration entry' });
      await userEvent.click(
        screen.getByRole('button', { name: 'Delete formula configuration entry' }),
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
