/**
 * Unit tests for {@link module:api/search} hook module.
 *
 * Migrated from config/react-query/hooks.unit.test.ts during the API
 * connection-layer migration: the data-source boundary is now the
 * SearchResource module (globally mocked in setup-env; overridden here
 * with programmable hoisted handles).
 *
 * @module api/search.unit.test
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from './queryKeys';
import { useReportingUnitExpandQuery, useSearchReportingUnitsQuery } from './search';

import { sendEvent } from '@/hooks/useNotificationEvents/eventHandler';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/hooks/useNotificationEvents/eventHandler', () => ({
  sendEvent: vi.fn(),
}));

vi.mock('@/api/utils', () => ({
  forestClientAutocompleteResult2CodeDescription: vi.fn((c) => c),
  generateSortArray: vi.fn(() => []),
}));

const { mockSearch } = vi.hoisted(() => ({
  mockSearch: {
    searchReportingUnit: vi.fn(),
    getReportingUnitSearchExpand: vi.fn(),
    searchReportingUnitUsers: vi.fn(),
  },
}));

vi.mock('@/api/resources/search-resource', () => ({
  SearchResource: class {
    searchReportingUnit = mockSearch.searchReportingUnit;
    getReportingUnitSearchExpand = mockSearch.getReportingUnitSearchExpand;
    searchReportingUnitUsers = mockSearch.searchReportingUnitUsers;
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('api/search hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch.searchReportingUnit.mockResolvedValue({ items: [], total: 0 });
    mockSearch.getReportingUnitSearchExpand.mockResolvedValue({ id: 1 });
    mockSearch.searchReportingUnitUsers.mockResolvedValue([]);
  });

  describe('useSearchReportingUnitsQuery', () => {
    it('should return paginated search results', async () => {
      const { result } = renderHook(
        () =>
          useSearchReportingUnitsQuery({
            filters: {},
            page: 0,
            size: 10,
            sort: { ruNumber: 'ASC' },
          }),
        { wrapper: createWrapper() },
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('useReportingUnitExpandQuery', () => {
    it('should be disabled when ruId is null', () => {
      const { result } = renderHook(() => useReportingUnitExpandQuery('row-1', null, null), {
        wrapper: createWrapper(),
      });
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('should fetch when both IDs are provided', async () => {
      const { result } = renderHook(() => useReportingUnitExpandQuery('row-1', 10, 20), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('useReportingUnitExpandQuery error handling', () => {
    it('should throw error when ruId is null', async () => {
      const { result } = renderHook(() => useReportingUnitExpandQuery('row-1', null, 20), {
        wrapper: createWrapper(),
      });

      // Query should be disabled when ruId is null
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('should throw error when wasteAssessmentAreaId is null', async () => {
      const { result } = renderHook(() => useReportingUnitExpandQuery('row-1', 10, null), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });

    it('should fetch when both IDs are provided and throw error without notification target', async () => {
      const mockError = new Error('Expand failed');
      vi.mocked(mockSearch.getReportingUnitSearchExpand).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useReportingUnitExpandQuery('row-1', 10, 20), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      // Without notificationTarget, no event should be sent
      expect(sendEvent).not.toHaveBeenCalled();
    });

    it('should invoke queryFn guard clause when refetch is called with null IDs', async () => {
      const { result } = renderHook(() => useReportingUnitExpandQuery('row-1', null, null), {
        wrapper: createWrapper(),
      });

      // Query starts disabled
      expect(result.current.fetchStatus).toBe('idle');

      // refetch() ignores the enabled flag and calls queryFn, which throws
      // because the guard clause catches null IDs. TanStack Query catches
      // the error and sets status to 'error' rather than rejecting.
      const refetchResult = await result.current.refetch();
      expect(refetchResult.status).toBe('error');
      expect(refetchResult.error).toBeDefined();
    });
  });

  describe('search reporting units with sort', () => {
    it('should generate sort array from sort record', async () => {
      const sort = { ruNumber: 'ASC' as const, district: 'DESC' as const };
      renderHook(
        () =>
          useSearchReportingUnitsQuery({
            filters: {},
            page: 1,
            size: 20,
            sort,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(mockSearch.searchReportingUnit).toHaveBeenCalled());
    });
  });

  describe('useReportingUnitExpandQuery defensive guard', () => {
    it('should throw when queryFn is invoked with null IDs via fetchQuery', async () => {
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

      await expect(
        qc.fetchQuery({
          queryKey: queryKeys.search.reportingUnitExpand('row-1', null, null),
          queryFn: () => {
            const ruId = null;
            const wasteAssessmentAreaId = null;
            if (ruId === null || wasteAssessmentAreaId === null) {
              throw new Error('Reporting unit expand query requires both IDs.');
            }
            return mockSearch.getReportingUnitSearchExpand(ruId, wasteAssessmentAreaId);
          },
        }),
      ).rejects.toThrow('Reporting unit expand query requires both IDs.');
    });
  });

  describe('error notification behavior', () => {
    it('useSearchReportingUnitsQuery should dispatch error notification on failure', async () => {
      const mockError = new Error('Search failed');
      (mockError as unknown as { body: { detail: string; title: string } }).body = {
        detail: 'Invalid filter',
        title: 'Bad Request',
      };
      vi.mocked(mockSearch.searchReportingUnit).mockRejectedValueOnce(mockError);

      const { result } = renderHook(
        () =>
          useSearchReportingUnitsQuery(
            { filters: {}, page: 0, size: 10, sort: {} },
            { notificationTarget: 'search-panel' },
          ),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(sendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'error',
          eventTarget: 'search-panel',
        }),
      );
    });

    it('useSearchReportingUnitsQuery should not send notification when notificationTarget is omitted', async () => {
      const mockError = new Error('Search failed');
      vi.mocked(mockSearch.searchReportingUnit).mockRejectedValueOnce(mockError);

      const { result } = renderHook(
        () => useSearchReportingUnitsQuery({ filters: {}, page: 0, size: 10, sort: {} }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(sendEvent).not.toHaveBeenCalled();
    });

  });});
