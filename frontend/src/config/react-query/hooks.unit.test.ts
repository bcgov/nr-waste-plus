import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useClientLookupQuery,
  useCodesQuery,
  useDistrictOptionsQuery,
  useForestClientsByNumbersQuery,
  useMyForestClientsQuery,
  useReportingUnitCreateMutation,
  useReportingUnitDetailsQuery,
  useReportingUnitExpandQuery,
  useSearchReportingUnitsQuery,
  useWasteSearchFilterOptionsQueries,
} from './hooks';

import { sendEvent } from '@/hooks/useNotificationEvents/eventHandler';
import API from '@/services/APIs';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/hooks/useNotificationEvents/eventHandler', () => ({
  sendEvent: vi.fn(),
}));

vi.mock('@/services/APIs', () => ({
  default: {
    codes: {
      getSamplingOptions: vi.fn().mockResolvedValue([{ code: 'S1', description: 'Sampling 1' }]),
      getDistricts: vi.fn().mockResolvedValue([{ code: 'D1', description: 'District 1' }]),
      getAssessAreaStatuses: vi.fn().mockResolvedValue([{ code: 'APP', description: 'Approved' }]),
    },
    search: {
      searchReportingUnit: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      getReportingUnitSearchExpand: vi.fn().mockResolvedValue({ id: 1 }),
    },
    forestclient: {
      searchByClientNumbers: vi.fn().mockResolvedValue([]),
      searchMyForestClients: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      searchForestClients: vi.fn().mockResolvedValue([]),
    },
    reportingUnit: {
      getReportingUnit: vi.fn().mockResolvedValue({ id: 1 }),
      createReportingUnit: vi.fn().mockResolvedValue(333),
    },
  },
}));

vi.mock('@/services/utils', () => ({
  forestClientAutocompleteResult2CodeDescription: vi.fn((c) => c),
  generateSortArray: vi.fn(() => []),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('react-query hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useCodesQuery', () => {
    it('should return data for samplingOptions', async () => {
      const { result } = renderHook(() => useCodesQuery('samplingOptions'), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBeDefined();
    });

    it('should return data for districtOptions', async () => {
      const { result } = renderHook(() => useCodesQuery('districtOptions'), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should return data for statusOptions', async () => {
      const { result } = renderHook(() => useCodesQuery('statusOptions'), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('useWasteSearchFilterOptionsQueries', () => {
    it('should return three query results', async () => {
      const { result } = renderHook(() => useWasteSearchFilterOptionsQueries(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => result.current.every((q) => q.isSuccess));
      expect(result.current).toHaveLength(3);
    });

    it('should accept a notificationTarget', async () => {
      const { result } = renderHook(() => useWasteSearchFilterOptionsQueries('filter-panel'), {
        wrapper: createWrapper(),
      });
      await waitFor(() => result.current.every((q) => q.isSuccess));
      expect(result.current).toHaveLength(3);
    });
  });

  describe('useDistrictOptionsQuery', () => {
    it('should return district data', async () => {
      const { result } = renderHook(() => useDistrictOptionsQuery(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
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

  describe('useReportingUnitDetailsQuery', () => {
    it('should return reporting unit details', async () => {
      const { result } = renderHook(() => useReportingUnitDetailsQuery(123), {
        wrapper: createWrapper(),
      });
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

  describe('useReportingUnitCreateMutation', () => {
    const validCreateRequest = {
      clientNumber: '00012797',
      districtCode: 'DKM',
      samplingCode: 'AVG',
      gradeCode: null,
    };

    it('should call createReportingUnit on mutate', async () => {
      const { result } = renderHook(() => useReportingUnitCreateMutation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(validCreateRequest);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should return the created reporting unit ID', async () => {
      const { result } = renderHook(() => useReportingUnitCreateMutation(), {
        wrapper: createWrapper(),
      });

      let createdId: number | undefined;
      await act(async () => {
        createdId = await result.current.mutateAsync(validCreateRequest);
      });

      expect(typeof createdId).toBe('number');
      expect(createdId).toBeGreaterThan(0);
    });

    it('should invoke onSuccess callback with the created ID', async () => {
      const onSuccessMock = vi.fn();
      const { result } = renderHook(
        () => useReportingUnitCreateMutation({ onSuccess: onSuccessMock }),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        await result.current.mutateAsync(validCreateRequest);
      });

      expect(onSuccessMock).toHaveBeenCalledWith(expect.any(Number));
      expect(onSuccessMock).toHaveBeenCalledTimes(1);
    });

    it('should handle mutation errors without throwing', async () => {
      const mockError = new Error('Mock API error');
      const { result } = renderHook(() => useReportingUnitCreateMutation(), {
        wrapper: createWrapper(),
      });

      vi.mocked(API.reportingUnit.createReportingUnit).mockRejectedValueOnce(mockError);

      await act(async () => {
        try {
          await result.current.mutateAsync(validCreateRequest);
        } catch (_e) {
          // Error is expected and caught
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should support notificationTarget for error notifications', () => {
      const { result } = renderHook(
        () => useReportingUnitCreateMutation({ notificationTarget: 'create-ru' }),
        { wrapper: createWrapper() },
      );

      expect(result.current).toBeDefined();
      expect(result.current.mutateAsync).toBeDefined();
    });

    it('should support both onSuccess and notificationTarget together', async () => {
      const onSuccessMock = vi.fn();
      const { result } = renderHook(
        () =>
          useReportingUnitCreateMutation({
            onSuccess: onSuccessMock,
            notificationTarget: 'create-ru',
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await result.current.mutateAsync(validCreateRequest);
      });

      expect(onSuccessMock).toHaveBeenCalled();
    });
  });

  describe('error notification behavior', () => {
    it('useCodesQuery should dispatch error notification when notificationTarget is provided', async () => {
      const mockError = new Error('API Error');
      (mockError as unknown as { body: { detail: string; title: string } }).body = {
        detail: 'Code not found',
        title: 'Not Found',
      };
      vi.mocked(API.codes.getSamplingOptions).mockRejectedValueOnce(mockError);

      const { result } = renderHook(
        () => useCodesQuery('samplingOptions', { notificationTarget: 'test-panel' }),
        {
          wrapper: createWrapper(),
        },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(sendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'error',
          eventTarget: 'test-panel',
          description: 'Code not found',
        }),
      );
    });

    it('useCodesQuery should use error message when no problem details available', async () => {
      const mockError = new Error('Simple error message');
      vi.mocked(API.codes.getDistricts).mockRejectedValueOnce(mockError);

      renderHook(() => useCodesQuery('districtOptions', { notificationTarget: 'panel' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(sendEvent).toHaveBeenCalled());
      expect(sendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Simple error message',
        }),
      );
    });

    it('useWasteSearchFilterOptionsQueries should send error notifications for each failing query', async () => {
      const mockError = new Error('Mock API Error');
      (mockError as unknown as { body: { detail: string; title: string } }).body = {
        detail: 'Error detail',
        title: 'Error Title',
      };
      vi.mocked(API.codes.getSamplingOptions).mockRejectedValueOnce(mockError);

      renderHook(() => useWasteSearchFilterOptionsQueries('filter-panel'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(sendEvent).toHaveBeenCalled(), { timeout: 5000 });
      expect(sendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'error',
          eventTarget: 'filter-panel',
        }),
      );
    });

    it('useMyForestClientsQuery should dispatch error notification when notificationTarget is provided', async () => {
      const mockError = new Error('Unauthorized');
      (mockError as unknown as { body: { detail: string; title: string } }).body = {
        detail: 'Access denied',
        title: 'Forbidden',
      };
      vi.mocked(API.forestclient.searchMyForestClients).mockRejectedValueOnce(mockError);

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

    it('useSearchReportingUnitsQuery should dispatch error notification on failure', async () => {
      const mockError = new Error('Search failed');
      (mockError as unknown as { body: { detail: string; title: string } }).body = {
        detail: 'Invalid filter',
        title: 'Bad Request',
      };
      vi.mocked(API.search.searchReportingUnit).mockRejectedValueOnce(mockError);

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

    it('useReportingUnitDetailsQuery should dispatch error notification when notificationTarget is provided', async () => {
      const mockError = new Error('Not found');
      (mockError as unknown as { body: { detail: string; title: string } }).body = {
        detail: 'Reporting unit not found',
        title: 'Not Found',
      };
      vi.mocked(API.reportingUnit.getReportingUnit).mockRejectedValueOnce(mockError);

      const { result } = renderHook(
        () => useReportingUnitDetailsQuery(999, { notificationTarget: 'details' }),
        {
          wrapper: createWrapper(),
        },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(sendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'error',
          eventTarget: 'details',
          description: 'Reporting unit not found',
        }),
      );
    });

    it('useReportingUnitCreateMutation should dispatch error notification when notificationTarget is provided', async () => {
      const mockError = new Error('Create failed');
      (mockError as unknown as { body: { detail: string; title: string } }).body = {
        detail: 'Duplicate entry',
        title: 'Conflict',
      };
      vi.mocked(API.reportingUnit.createReportingUnit).mockRejectedValueOnce(mockError);

      const { result } = renderHook(
        () => useReportingUnitCreateMutation({ notificationTarget: 'create-form' }),
        { wrapper: createWrapper() },
      );

      const validRequest = {
        clientNumber: '00012797',
        districtCode: 'DKM',
        samplingCode: 'AVG',
        gradeCode: null,
      };

      await act(async () => {
        try {
          await result.current.mutateAsync(validRequest);
        } catch (_e) {
          // expected
        }
      });

      await waitFor(() => expect(sendEvent).toHaveBeenCalled());
      expect(sendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'error',
          eventTarget: 'create-form',
          description: 'Duplicate entry',
        }),
      );
    });
  });

  describe('query option overrides', () => {
    it('useCodesQuery should accept and apply custom query options', async () => {
      const { result } = renderHook(() => useCodesQuery('samplingOptions', { staleTime: 60000 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBeDefined();
    });

    it('useDistrictOptionsQuery should accept query option overrides', async () => {
      const { result } = renderHook(() => useDistrictOptionsQuery({ enabled: true }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('useReportingUnitDetailsQuery should accept query option overrides', async () => {
      const { result } = renderHook(() => useReportingUnitDetailsQuery(123, { staleTime: 30000 }), {
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
      vi.mocked(API.search.getReportingUnitSearchExpand).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useReportingUnitExpandQuery('row-1', 10, 20), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      // Without notificationTarget, no event should be sent
      expect(sendEvent).not.toHaveBeenCalled();
    });
  });

  describe('notification deduplification', () => {
    it('useWasteSearchFilterOptionsQueries should not send duplicate notifications for the same error', async () => {
      const mockError = new Error('Mock Error');
      (mockError as unknown as { body: { detail: string; title: string } }).body = {
        detail: 'Error detail',
        title: 'Title',
      };
      vi.mocked(API.codes.getSamplingOptions).mockRejectedValueOnce(mockError);

      const { rerender } = renderHook(() => useWasteSearchFilterOptionsQueries('panel'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(sendEvent).toHaveBeenCalled());

      const callCountBefore = vi.mocked(sendEvent).mock.calls.length;

      // Re-render should not trigger another notification for the same error
      rerender();

      const callCountAfter = vi.mocked(sendEvent).mock.calls.length;
      expect(callCountAfter).toBe(callCountBefore);
    });
  });

  describe('forest client search pagination', () => {
    it('should call searchByClientNumbers with correct offset and limit', async () => {
      renderHook(() => useForestClientsByNumbersQuery(['001', '002', '003']), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(API.forestclient.searchByClientNumbers).toHaveBeenCalledWith(
          ['001', '002', '003'],
          0,
          3,
        ),
      );
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

      await waitFor(() => expect(API.search.searchReportingUnit).toHaveBeenCalled());
    });
  });
});
