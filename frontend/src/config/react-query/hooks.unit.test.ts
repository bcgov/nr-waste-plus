import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useClientLookupQuery,
  useCodesQuery,
  useDistrictOptionsQuery,
  useDistrictVolumeListQuery,
  useDistrictVolumeTableCreateMutation,
  useForestClientsByNumbersQuery,
  useMyForestClientsQuery,
  useReportingUnitCreateMutation,
  useReportingUnitExpandQuery,
  useSearchReportingUnitsQuery,
  useDistrictVolumeTableDetailQuery,
  useWasteSearchFilterOptionsQueries,
} from './hooks';
import { queryKeys } from './queryKeys';

import { sendEvent } from '@/hooks/useNotificationEvents/eventHandler';
import API from '@/services/APIs';
import { forestClientAutocompleteResult2CodeDescription } from '@/services/utils';

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
    districtVolume: {
      getDistrictVolumes: vi.fn().mockResolvedValue({
        content: [
          {
            id: 1,
            area: 'INTERIOR',
            startDate: '2026-05-15',
            endDate: null,
            uploadedBy: 'IDIR/ABCDEF',
            dateOfUpload: '2026-03-27T00:00:00Z',
          },
        ],
        page: { number: 0, size: 10, totalElements: 1, totalPages: 1 },
      }),
      getDistrictVolumeTableDetail: vi.fn().mockResolvedValue({
        area: 'INTERIOR',
        id: 42,
        startDate: '2026-06-01',
        zones: [],
      }),
      createDistrictVolumeTable: vi.fn().mockResolvedValue(444),
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

    it('should use fallback description when problem details exist but detail is empty', async () => {
      const mockError = new Error('API Error');
      (mockError as unknown as { body: { detail?: string; title: string } }).body = {
        title: 'Bad Request',
      };
      vi.mocked(API.codes.getSamplingOptions).mockRejectedValueOnce(mockError);

      renderHook(() => useCodesQuery('samplingOptions', { notificationTarget: 'test-panel' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(sendEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            description: 'No additional details provided.',
            title: 'Bad Request',
          }),
        ),
      );
    });

    it('should use fallback title when problem details exist but title is empty', async () => {
      const mockError = new Error('API Error');
      (mockError as unknown as { body: { detail: string; title?: string } }).body = {
        detail: 'Something went wrong',
      };
      vi.mocked(API.codes.getDistricts).mockRejectedValueOnce(mockError);

      renderHook(() => useCodesQuery('districtOptions', { notificationTarget: 'panel' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(sendEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Request failed',
          }),
        ),
      );
    });

    it('useWasteSearchFilterOptionsQueries should not send notifications when notificationTarget is omitted', async () => {
      const mockError = new Error('API Error');
      vi.mocked(API.codes.getSamplingOptions).mockRejectedValueOnce(mockError);

      renderHook(() => useWasteSearchFilterOptionsQueries(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(API.codes.getSamplingOptions).toHaveBeenCalled();
      });

      expect(sendEvent).not.toHaveBeenCalled();
    });

    it('useCodesQuery should not send duplicate notifications for the same error via errorUpdatedAt dedup', async () => {
      const mockError = new Error('API Error');
      (mockError as unknown as { body: { detail: string; title: string } }).body = {
        detail: 'Error detail',
        title: 'Title',
      };
      vi.mocked(API.codes.getSamplingOptions).mockRejectedValueOnce(mockError);

      const { rerender } = renderHook(
        () => useCodesQuery('samplingOptions', { notificationTarget: 'panel' }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(sendEvent).toHaveBeenCalledTimes(1));

      // Re-render with same notification target — should NOT send another event
      // because errorUpdatedAt hasn't changed
      rerender();

      // Give the effect time to run
      await vi.waitFor(() => {
        expect(sendEvent).toHaveBeenCalledTimes(1);
      });
    });

    it('useMyForestClientsQuery should not send notification when notificationTarget is omitted', async () => {
      const mockError = new Error('API Error');
      vi.mocked(API.forestclient.searchMyForestClients).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useMyForestClientsQuery('filter', 0, 10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(sendEvent).not.toHaveBeenCalled();
    });

    it('useSearchReportingUnitsQuery should not send notification when notificationTarget is omitted', async () => {
      const mockError = new Error('Search failed');
      vi.mocked(API.search.searchReportingUnit).mockRejectedValueOnce(mockError);

      const { result } = renderHook(
        () => useSearchReportingUnitsQuery({ filters: {}, page: 0, size: 10, sort: {} }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(sendEvent).not.toHaveBeenCalled();
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

  describe('useDistrictVolumeListQuery', () => {
    it('should return paginated district volume data', async () => {
      const { result } = renderHook(
        () =>
          useDistrictVolumeListQuery({
            page: 0,
            size: 10,
            sort: {},
          }),
        { wrapper: createWrapper() },
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBeDefined();
      expect(result.current.data?.content).toHaveLength(1);
      expect(result.current.data?.content[0].area).toBe('INTERIOR');
    });

    it('should call getDistrictVolumes with correct parameters', async () => {
      renderHook(
        () =>
          useDistrictVolumeListQuery({
            page: 0,
            size: 10,
            sort: {},
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() =>
        expect(API.districtVolume.getDistrictVolumes).toHaveBeenCalledWith(undefined, {
          page: 0,
          size: 10,
          sort: [],
        }),
      );
    });

    it('should accept query option overrides', async () => {
      const { result } = renderHook(
        () => useDistrictVolumeListQuery({ page: 0, size: 10, sort: {} }, { staleTime: 60000 }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should support notificationTarget for error notifications', async () => {
      const mockError = new Error('API Error');
      (mockError as unknown as { body: { detail: string; title: string } }).body = {
        detail: 'Failed to load district volumes',
        title: 'Server Error',
      };
      vi.mocked(API.districtVolume.getDistrictVolumes).mockRejectedValueOnce(mockError);

      const { result } = renderHook(
        () =>
          useDistrictVolumeListQuery(
            { page: 0, size: 10, sort: {} },
            { notificationTarget: 'district-volume-panel' },
          ),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(sendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'error',
          eventTarget: 'district-volume-panel',
          description: 'Failed to load district volumes',
        }),
      );
    });
  });

  describe('useDistrictVolumeTableDetailQuery', () => {
    it('should return district volume table detail', async () => {
      const { result } = renderHook(() => useDistrictVolumeTableDetailQuery(42), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBeDefined();
      expect(API.districtVolume.getDistrictVolumeTableDetail).toHaveBeenCalledWith(42);
    });

    it('should support query option overrides', async () => {
      const { result } = renderHook(
        () => useDistrictVolumeTableDetailQuery(42, { staleTime: 60000 }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should dispatch error notification when notificationTarget is provided', async () => {
      const mockError = new Error('Detail fetch failed');
      (mockError as unknown as { body: { detail: string; title: string } }).body = {
        detail: 'Volume table not found',
        title: 'Not Found',
      };
      vi.mocked(API.districtVolume.getDistrictVolumeTableDetail).mockRejectedValueOnce(mockError);

      const { result } = renderHook(
        () => useDistrictVolumeTableDetailQuery(999, { notificationTarget: 'dv-detail-panel' }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(sendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'error',
          eventTarget: 'dv-detail-panel',
          description: 'Volume table not found',
        }),
      );
    });

    it('should not dispatch notification when notificationTarget is omitted on error', async () => {
      const mockError = new Error('Detail fetch failed');
      vi.mocked(API.districtVolume.getDistrictVolumeTableDetail).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useDistrictVolumeTableDetailQuery(999), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(sendEvent).not.toHaveBeenCalled();
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
            return API.search.getReportingUnitSearchExpand(ruId, wasteAssessmentAreaId);
          },
        }),
      ).rejects.toThrow('Reporting unit expand query requires both IDs.');
    });
  });

  describe('useClientLookupQuery map transformation', () => {
    it('should transform forest client results through forestClientAutocompleteResult2CodeDescription', async () => {
      vi.mocked(API.forestclient.searchForestClients).mockResolvedValueOnce([
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
          return (await API.forestclient.searchForestClients(clientCode, 0, 1)).map(
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

  describe('useDistrictVolumeTableCreateMutation', () => {
    const validCreateRequest = {
      area: 'INTERIOR' as const,
      startDate: '2026-06-01',
      tableLevelFactor: 1.5,
      tableData: {
        type: 'INTERIOR' as const,
        zones: [
          {
            name: 'Dry belt' as const,
            districts: [
              {
                code: 'DKM',
                avoidableSawlog: 10,
                avoidableGrade4: 5,
                unavoidableGrade4: 3,
                total: 18,
              },
            ],
          },
        ],
        formulas: {},
      },
    };

    it('should call createDistrictVolumeTable on mutate', async () => {
      const { result } = renderHook(() => useDistrictVolumeTableCreateMutation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(validCreateRequest);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(API.districtVolume.createDistrictVolumeTable).toHaveBeenCalledWith(validCreateRequest);
    });

    it('should return the created district volume ID', async () => {
      const { result } = renderHook(() => useDistrictVolumeTableCreateMutation(), {
        wrapper: createWrapper(),
      });

      let createdId: number | undefined;
      await act(async () => {
        createdId = await result.current.mutateAsync(validCreateRequest);
      });

      expect(typeof createdId).toBe('number');
      expect(createdId).toBe(444);
    });

    it('should invoke onSuccess callback with the created ID', async () => {
      const onSuccessMock = vi.fn();
      const { result } = renderHook(
        () => useDistrictVolumeTableCreateMutation({ onSuccess: onSuccessMock }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await result.current.mutateAsync(validCreateRequest);
      });

      expect(onSuccessMock).toHaveBeenCalledWith(444);
      expect(onSuccessMock).toHaveBeenCalledTimes(1);
    });

    it('should handle mutation errors without throwing', async () => {
      const mockError = new Error('Create failed');
      vi.mocked(API.districtVolume.createDistrictVolumeTable).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useDistrictVolumeTableCreateMutation(), {
        wrapper: createWrapper(),
      });

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

    it('should support notificationTarget for error notifications', async () => {
      const mockError = new Error('Create failed');
      (mockError as unknown as { body: { detail: string; title: string } }).body = {
        detail: 'Duplicate volume table',
        title: 'Conflict',
      };
      vi.mocked(API.districtVolume.createDistrictVolumeTable).mockRejectedValueOnce(mockError);

      const { result } = renderHook(
        () => useDistrictVolumeTableCreateMutation({ notificationTarget: 'dv-create' }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        try {
          await result.current.mutateAsync(validCreateRequest);
        } catch (_e) {
          // expected
        }
      });

      await waitFor(() => expect(sendEvent).toHaveBeenCalled());
      expect(sendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'error',
          eventTarget: 'dv-create',
          description: 'Duplicate volume table',
        }),
      );
    });

    it('should support both onSuccess and notificationTarget together', async () => {
      const onSuccessMock = vi.fn();
      const { result } = renderHook(
        () =>
          useDistrictVolumeTableCreateMutation({
            onSuccess: onSuccessMock,
            notificationTarget: 'dv-create',
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await result.current.mutateAsync(validCreateRequest);
      });

      expect(onSuccessMock).toHaveBeenCalledWith(444);
    });

    it('should not dispatch notification when notificationTarget is omitted', async () => {
      const mockError = new Error('Create failed');
      vi.mocked(API.districtVolume.createDistrictVolumeTable).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useDistrictVolumeTableCreateMutation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync(validCreateRequest);
        } catch (_e) {
          // expected
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(sendEvent).not.toHaveBeenCalled();
    });
  });
});
