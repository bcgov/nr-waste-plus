/* eslint-disable @typescript-eslint/no-explicit-any */
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import MyClientListing from './index';

import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { MyForestClientDto } from '@/services/types';

import { renderCell } from '@/components/Form/TableResource/types';
import { renderWithAppAsync } from '@/config/tests/renderWithApp';
import APIs from '@/services/APIs';

vi.mock('@/services/APIs');
vi.mock('@/hooks/useNotificationEvents', () => ({
  default: vi.fn(() => ({
    sendEvent: vi.fn(),
    clearEvents: vi.fn(),
  })),
}));

// Mock TableResource to avoid slow Carbon component rendering
vi.mock('@/components/Form/TableResource', () => ({
  default: ({ headers, content, loading, error, onPageChange, id }: any) => {
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
              {headers.map((h: any) => (
                <th key={h.key}>{h.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {content.content.map((row: any) => (
              <tr key={row.id}>
                {headers.map((h: any) => (
                  <td key={h.key}>{renderCell(row, h)}</td>
                ))}
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

const mockSearchResults: PageableResponse<MyForestClientDto> = {
  content: [
    {
      id: '00001001',
      client: { code: '00001001', description: 'ABC Logging Ltd' },
      submissionsCount: 15,
      blocksCount: 8,
      lastUpdate: '2024-12-01T10:30:00',
    },
    {
      id: '00001002',
      client: { code: '00001002', description: 'XYZ Forestry Inc' },
      submissionsCount: 22,
      blocksCount: 12,
      lastUpdate: '2024-11-28T14:15:00',
    },
  ],
  page: { number: 0, size: 10, totalElements: 2, totalPages: 1 },
};

const mockEmptyResults: PageableResponse<MyForestClientDto> = {
  content: [],
  page: { number: 0, size: 10, totalElements: 0, totalPages: 0 },
};

const renderWithProps = () => renderWithAppAsync(<MyClientListing />);

describe('search functionality', () => {
  const mockSearchClients = vi.mocked(APIs.forestclient.searchMyForestClients);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes search when search button is clicked', async () => {
    mockSearchClients.mockResolvedValue(mockSearchResults);
    await renderWithProps();

    // Wait for initial load
    await waitFor(() => {
      expect(APIs.forestclient.searchMyForestClients).toHaveBeenCalledTimes(1);
    });

    const searchInput = screen.getByPlaceholderText('Search by name');
    await userEvent.type(searchInput, 'ABC');

    const searchButton = screen.getByTestId('search-button-other');
    await userEvent.click(searchButton);

    await waitFor(() => {
      expect(APIs.forestclient.searchMyForestClients).toHaveBeenCalledWith('ABC', 0, 10, {
        notificationTarget: 'my-client-list',
      });
    });
  });

  it('displays filtered results after search', async () => {
    const filteredResults: PageableResponse<MyForestClientDto> = {
      content: [
        {
          id: '00001001',
          client: { code: '00001001', description: 'ABC Logging Ltd' },
          submissionsCount: 15,
          blocksCount: 8,
          lastUpdate: '2024-12-01T10:30:00',
        },
      ],
      page: { number: 0, size: 10, totalElements: 1, totalPages: 1 },
    };

    mockSearchClients
      .mockResolvedValueOnce(mockSearchResults)
      .mockResolvedValueOnce(filteredResults);

    await renderWithProps();

    await waitFor(() => {
      screen.getByText('ABC Logging Ltd');
    });

    const searchInput = screen.getByPlaceholderText('Search by name');
    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, 'ABC');

    const searchButton = screen.getByTestId('search-button-other');
    await userEvent.click(searchButton);

    await waitFor(() => {
      screen.getByText('ABC Logging Ltd');
      expect(screen.queryByText('XYZ Forestry Inc')).toBeNull();
    });
  });

  it('displays no results message when search returns empty', async () => {
    mockSearchClients
      .mockResolvedValueOnce(mockSearchResults)
      .mockResolvedValueOnce(mockEmptyResults);

    await renderWithProps();

    await waitFor(() => {
      screen.getByText('ABC Logging Ltd');
    });

    const searchInput = screen.getByPlaceholderText('Search by name');
    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, 'NONEXISTENT');

    const searchButton = screen.getByTestId('search-button-other');
    await userEvent.click(searchButton);

    await waitFor(() => {
      screen.getByText('No results');
    });
  });

  it('can search with empty filter', async () => {
    mockSearchClients.mockResolvedValue(mockSearchResults);
    await renderWithProps();

    await waitFor(() => {
      expect(APIs.forestclient.searchMyForestClients).toHaveBeenCalledTimes(1);
    });

    const searchButton = screen.getByTestId('search-button-other');
    await userEvent.click(searchButton);

    await waitFor(() => {
      expect(APIs.forestclient.searchMyForestClients).toHaveBeenCalledWith('', 0, 10, {
        notificationTarget: 'my-client-list',
      });
      expect(APIs.forestclient.searchMyForestClients).toHaveBeenCalledTimes(2);
    });
  });
});
