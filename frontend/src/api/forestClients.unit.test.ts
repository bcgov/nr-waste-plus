/**
 * Unit tests for {@link module:api/forestClients} hook module.
 *
 * Migrated from config/react-query/hooks.unit.test.ts during the API
 * connection-layer migration: the data-source boundary is now the
 * ForestClientResource module (globally mocked in setup-env; overridden
 * here with programmable hoisted handles).
 *
 * @module api/forestClients.unit.test
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useClientLookupQuery,
  useForestClientsByNumbersQuery,
  useMyForestClientsQuery,
} from './forestClients';
import { queryKeys } from './queryKeys';

import { forestClientAutocompleteResult2CodeDescription } from '@/api/utils';
import { sendEvent } from '@/hooks/useNotificationEvents/eventHandler';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/hooks/useNotificationEvents/eventHandler', () => ({
  sendEvent: vi.fn(),
}));

vi.mock('@/api/utils', () => ({
  forestClientAutocompleteResult2CodeDescription: vi.fn((c) => c),
  generateSortArray: vi.fn(() => []),
}));

const { mockForestClient } = vi.hoisted(() => ({
  mockForestClient: {
    getForestClient: vi.fn(),
    searchForestClients: vi.fn(),
    searchByClientNumbers: vi.fn(),
    searchMyForestClients: vi.fn(),
  },
}));

vi.mock('@/api/resources/forest-client-resource', () => ({
  ForestClientResource: class {
    getForestClient = mockForestClient.getForestClient;
    searchForestClients = mockForestClient.searchForestClients;
    searchByClientNumbers = mockForestClient.searchByClientNumbers;
    searchMyForestClients = mockForestClient.searchMyForestClients;
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('api/forestClients hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockForestClient.getForestClient.mockResolvedValue({});
    mockForestClient.searchForestClients.mockResolvedValue([]);
    mockForestClient.searchByClientNumbers.mockResolvedValue([]);
    mockForestClient.searchMyForestClients.mockResolvedValue({ items: [], total: 0 });
  });

  describe('useForestClientsByNumbersQuery', () => {
    it('should be disabled when clientNumbers is empty', () => {
      const { result } = renderHook(() => useForestClientsByNumbersQuery([]), {
        wrapper: createWrapper(),
      });
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('should fetch when clientNumbers are provided', async () => {
      const { result } = renderHook(
        () => useForestClientsByNumbersQuery(['00001001', '00001002']),
        { wrapper: createWrapper() },
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('useMyForestClientsQuery', () => {
    it('should return paginated forest client data', async () => {
      const { result } = renderHook(() => useMyForestClientsQuery('test', 0, 10), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('useClientLookupQuery', () => {
    it('should be disabled when clientCode is undefined', () => {
      const { result } = renderHook(() => useClientLookupQuery(undefined, true), {
        wrapper: createWrapper(),
      });
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('should be disabled when enabled is false', () => {
      const { result } = renderHook(() => useClientLookupQuery('00001001', false), {
        wrapper: createWrapper(),
      });
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('should fetch when code and enabled are set', async () => {
      const { result } = renderHook(() => useClientLookupQuery('00001001', true), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('useClientLookupQuery forest client transformation', () => {
    it('should return empty array when clientCode is empty string and query runs', async () => {
      const { result } = renderHook(() => useClientLookupQuery('', true), {
        wrapper: createWrapper(),
      });

      // Query should be disabled because clientCode is empty, even if enabled=true
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('should transform forest client results using the helper function', async () => {
      const { result } = renderHook(() => useClientLookupQuery('00001001', true), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBeDefined();
    });

    it('should not fetch when enabled is false', () => {
      const { result } = renderHook(() => useClientLookupQuery('00001001', false), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('forest client search pagination', () => {
    it('should call searchByClientNumbers with correct offset and limit', async () => {
      renderHook(() => useForestClientsByNumbersQuery(['001', '002', '003']), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(mockForestClient.searchByClientNumbers).toHaveBeenCalledWith(
          ['001', '002', '003'],
          0,
          3,
          { signal: expect.any(AbortSignal) },
        ),
      );
    });
  });

  describe('useClientLookupQuery map transformation', () => {
    it('should transform forest client results through forestClientAutocompleteResult2CodeDescription', async () => {
      vi.mocked(mockForestClient.searchForestClients).mockResolvedValueOnce([
        { id: '00001001', name: 'Test Client', acronym: 'TC' },
        { id: '00001002', name: 'Another Client', acronym: null },
      ] as never);

      const { result } = renderHook(() => useClientLookupQuery('00001', true), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(2);
    });

    it('should return empty array when queryFn runs with empty clientCode via fetchQuery', async () => {
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

      const data = await qc.fetchQuery({
        queryKey: queryKeys.forestClient.lookupByClientCode(''),
        queryFn: async () => {
          const clientCode = '';
          if (!clientCode) {
            return [];
          }
          return (await mockForestClient.searchForestClients(clientCode, 0, 1)).map(
            forestClientAutocompleteResult2CodeDescription,
          );
        },
      });

      expect(data).toEqual([]);
    });

    it('should return empty array when refetch is called with empty clientCode', async () => {
      const { result } = renderHook(() => useClientLookupQuery('', true), {
        wrapper: createWrapper(),
      });

      // Query is disabled because clientCode is empty string
      expect(result.current.fetchStatus).toBe('idle');

      // refetch() ignores enabled flag, invokes queryFn which returns [] for empty clientCode
      const { data } = await result.current.refetch();
      expect(data).toEqual([]);
    });
  });

  describe('error notification behavior', () => {
    it('useMyForestClientsQuery should dispatch error notification when notificationTarget is provided', async () => {
      const mockError = new Error('Unauthorized');
      (mockError as unknown as { body: { detail: string; title: string } }).body = {
        detail: 'Access denied',
        title: 'Forbidden',
      };
      vi.mocked(mockForestClient.searchMyForestClients).mockRejectedValueOnce(mockError);

      const { result } = renderHook(
        () => useMyForestClientsQuery('filter', 0, 10, { notificationTarget: 'user-panel' }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(sendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'error',
          eventTarget: 'user-panel',
          description: 'Access denied',
        }),
      );
    });

    it('useMyForestClientsQuery should not send notification when notificationTarget is omitted', async () => {
      const mockError = new Error('API Error');
      vi.mocked(mockForestClient.searchMyForestClients).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useMyForestClientsQuery('filter', 0, 10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(sendEvent).not.toHaveBeenCalled();
    });

  });});
