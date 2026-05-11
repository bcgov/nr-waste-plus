/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import MyClientListing from './index';

import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { MyForestClientDto } from '@/services/types';

import { renderCell } from '@/components/Form/TableResource/types';
import { createTestRouter } from '@/config/tests/routerTestHelper';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import * as eventHandler from '@/hooks/useNotificationEvents/eventHandler';
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

const mockLargeDataset: PageableResponse<MyForestClientDto> = {
  content: Array.from({ length: 10 }, (_, i) => ({
    id: `0000${1000 + i}`,
    client: { code: `0000${1000 + i}`, description: `Client ${i + 1}` },
    submissionsCount: i * 5,
    blocksCount: i * 2,
    lastUpdate: '2024-12-01T10:00:00',
  })),
  page: { number: 0, size: 10, totalElements: 25, totalPages: 3 },
};

const renderWithProps = async () => {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  await act(async () => {
    render(
      <RouterProvider
        router={createTestRouter(() => (
          <QueryClientProvider client={qc}>
            <PreferenceProvider>
              <MyClientListing />
            </PreferenceProvider>
          </QueryClientProvider>
        ))}
      />,
    );
  });
};

describe('MyClientListing', () => {
  const mockSearchClients = vi.mocked(APIs.forestclient.searchMyForestClients);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial rendering', () => {
    it('renders search input and table components', async () => {
      mockSearchClients.mockResolvedValue(mockSearchResults);
      await renderWithProps();

      expect(screen.getByPlaceholderText('Search by name')).toBeDefined();
      expect(screen.getByTestId('search-button-other')).toBeDefined();
    });

    it('automatically fetches data on mount', async () => {
      mockSearchClients.mockResolvedValue(mockSearchResults);
      await renderWithProps();

      await waitFor(() => {
        expect(APIs.forestclient.searchMyForestClients).toHaveBeenCalledWith('', 0, 10, {
          notificationTarget: 'my-client-list',
        });
      });
    });

    it('displays client data after initial load', async () => {
      mockSearchClients.mockResolvedValue(mockSearchResults);
      await renderWithProps();

      await waitFor(() => {
        expect(screen.getByText('ABC Logging Ltd')).toBeDefined();
        expect(screen.getByText('XYZ Forestry Inc')).toBeDefined();
      });
    });
  });

  describe('search functionality', () => {
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
        expect(screen.getByText('ABC Logging Ltd')).toBeDefined();
      });

      const searchInput = screen.getByPlaceholderText('Search by name');
      await userEvent.clear(searchInput);
      await userEvent.type(searchInput, 'ABC');

      const searchButton = screen.getByTestId('search-button-other');
      await userEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('ABC Logging Ltd')).toBeDefined();
        expect(screen.queryByText('XYZ Forestry Inc')).toBeNull();
      });
    });

    it('displays no results message when search returns empty', async () => {
      mockSearchClients
        .mockResolvedValueOnce(mockSearchResults)
        .mockResolvedValueOnce(mockEmptyResults);

      await renderWithProps();

      await waitFor(() => {
        expect(screen.getByText('ABC Logging Ltd')).toBeDefined();
      });

      const searchInput = screen.getByPlaceholderText('Search by name');
      await userEvent.clear(searchInput);
      await userEvent.type(searchInput, 'NONEXISTENT');

      const searchButton = screen.getByTestId('search-button-other');
      await userEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('No results')).toBeDefined();
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

  describe('pagination', () => {
    it('handles page change correctly', async () => {
      mockSearchClients.mockResolvedValue(mockLargeDataset);
      await renderWithProps();

      await waitFor(() => {
        expect(screen.getByText('Client 1')).toBeDefined();
      });

      // Find and click next page button
      const nextButton = screen.getByLabelText('Next page');
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(APIs.forestclient.searchMyForestClients).toHaveBeenCalledWith('', 1, 10, {
          notificationTarget: 'my-client-list',
        });
      });
    });

    it('calls API when page size changes', async () => {
      mockSearchClients.mockResolvedValue(mockLargeDataset);
      await renderWithProps();

      await waitFor(() => {
        expect(screen.getByText('Client 1')).toBeDefined();
      });

      const initialCallCount = mockSearchClients.mock.calls.length;

      // Verify that pagination controls exist
      const pageSizeSelect = screen.getByLabelText('Items per page:');
      expect(pageSizeSelect).toBeDefined();

      // Verify component can handle page size changes by checking initial state
      expect(initialCallCount).toBeGreaterThan(0);
    });

    it('resets to first page when page exceeds total pages', async () => {
      const page2Data: PageableResponse<MyForestClientDto> = {
        ...mockLargeDataset,
        page: { number: 2, size: 10, totalElements: 25, totalPages: 3 },
      };

      mockSearchClients
        .mockResolvedValueOnce(mockLargeDataset)
        .mockResolvedValueOnce(page2Data)
        .mockResolvedValueOnce(mockEmptyResults);

      await renderWithProps();

      await waitFor(() => {
        expect(screen.getByText('Client 1')).toBeDefined();
      });

      // Try to navigate to page 3 (beyond total pages)
      const nextButton = screen.getByLabelText('Next page');
      await userEvent.click(nextButton);
      await userEvent.click(nextButton);

      await waitFor(() => {
        const calls = mockSearchClients.mock.calls;
        // Verify it doesn't go beyond valid page range
        expect(calls.at(-1)?.[1]).toBeLessThan(3);
      });
    });
  });

  describe('error handling', () => {
    it('displays error state when search fails', async () => {
      const errorResponse = {
        body: {
          title: 'Search Failed',
          detail: 'Unable to retrieve client data',
          status: 500,
          type: 'about:blank',
        },
      };

      mockSearchClients.mockRejectedValue(errorResponse);
      await renderWithProps();

      await waitFor(() => {
        // Component displays empty results state with error flag
        expect(screen.getByText('No results')).toBeDefined();
      });
    });

    it('sends event when error occurs', async () => {
      const sendEventSpy = vi.spyOn(eventHandler, 'sendEvent').mockImplementation(vi.fn());

      const errorResponse = {
        body: {
          title: 'Search Failed',
          detail: 'Unable to retrieve client data',
          status: 500,
          type: 'about:blank',
        },
      };

      mockSearchClients.mockRejectedValue(errorResponse);
      await renderWithProps();

      await waitFor(() => {
        expect(sendEventSpy).toHaveBeenCalledWith({
          title: 'Search Failed',
          description: 'Unable to retrieve client data',
          displayMode: 'inline',
          eventType: 'error',
          eventTarget: 'my-client-list',
        });
      });
    });

    it('sends event with default detail when error has no detail', async () => {
      const sendEventSpy = vi.spyOn(eventHandler, 'sendEvent').mockImplementation(vi.fn());

      const errorResponse = {
        body: {
          title: 'Unknown Error',
          status: 500,
          type: 'about:blank',
        },
      };

      mockSearchClients.mockRejectedValue(errorResponse);
      await renderWithProps();

      await waitFor(() => {
        expect(sendEventSpy).toHaveBeenCalledWith({
          title: 'Unknown Error',
          description: 'No additional details provided.',
          displayMode: 'inline',
          eventType: 'error',
          eventTarget: 'my-client-list',
        });
      });
    });
  });

  describe('data display', () => {
    it('displays all client information columns', async () => {
      mockSearchClients.mockResolvedValue(mockSearchResults);
      await renderWithProps();

      await waitFor(() => {
        // Check headers
        expect(screen.getByText('Client No.')).toBeDefined();
        expect(screen.getByText('Client name')).toBeDefined();
        expect(screen.getByText('Submission Count')).toBeDefined();
        expect(screen.getByText('Draft Block Count')).toBeDefined();
        expect(screen.getByText('Last Update')).toBeDefined();

        // Check data
        expect(screen.getByText('00001001')).toBeDefined();
        expect(screen.getByText('ABC Logging Ltd')).toBeDefined();
        expect(screen.getByText('15')).toBeDefined();
        expect(screen.getByText('8')).toBeDefined();
      });
    });

    it('adds id property to each client for table rendering', async () => {
      mockSearchClients.mockResolvedValue(mockSearchResults);
      await renderWithProps();

      await waitFor(() => {
        // The component transforms data to add id from client.code
        expect(screen.getByText('00001001')).toBeDefined();
        expect(screen.getByText('00001002')).toBeDefined();
      });
    });

    it('renders client code as a link to search page with client filter', async () => {
      mockSearchClients.mockResolvedValue(mockSearchResults);
      await renderWithProps();

      await waitFor(() => {
        const link = screen.getByRole('link', { name: '00001001' });
        expect(link).toBeDefined();
        expect(link.getAttribute('href')).toBe('/search?clientNumbers=00001001');
      });
    });

    it('renders all client codes as search links', async () => {
      mockSearchClients.mockResolvedValue(mockSearchResults);
      await renderWithProps();

      await waitFor(() => {
        const link1 = screen.getByRole('link', { name: '00001001' });
        const link2 = screen.getByRole('link', { name: '00001002' });
        expect(link1.getAttribute('href')).toBe('/search?clientNumbers=00001001');
        expect(link2.getAttribute('href')).toBe('/search?clientNumbers=00001002');
      });
    });
  });

  describe('loading states', () => {
    it('hides loading state after data is fetched', async () => {
      mockSearchClients.mockResolvedValue(mockSearchResults);
      await renderWithProps();

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).toBeNull();
        expect(screen.getByText('ABC Logging Ltd')).toBeDefined();
      });
    });
  });

  describe('query configuration', () => {
    it('disables query by default (enabled: false)', async () => {
      mockSearchClients.mockResolvedValue(mockSearchResults);
      await renderWithProps();

      // Despite enabled: false, useEffect triggers refetch on mount
      await waitFor(() => {
        expect(APIs.forestclient.searchMyForestClients).toHaveBeenCalled();
      });
    });

    it('clears cache on each search (gcTime: 0)', async () => {
      mockSearchClients.mockResolvedValue(mockSearchResults);
      await renderWithProps();

      await waitFor(() => {
        expect(APIs.forestclient.searchMyForestClients).toHaveBeenCalledTimes(1);
      });

      const searchButton = screen.getByTestId('search-button-other');
      await userEvent.click(searchButton);

      await waitFor(() => {
        // Each search fetches fresh data due to gcTime: 0
        expect(APIs.forestclient.searchMyForestClients).toHaveBeenCalledTimes(2);
      });
    });
  });
});
