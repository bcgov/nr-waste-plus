import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sendEvent } from '@/hooks/useNotificationEvents/eventHandler';
import API from '@/services/APIs';

import {
  useDistrictVolumeListQuery,
  useDistrictVolumeTableCreateMutation,
  useDistrictVolumeTableDeleteMutation,
  useDistrictVolumeTableDetailQuery,
  useReportingUnitCreateMutation,
  useSpeciesCompositionCreateMutation,
  useSpeciesCompositionDeleteMutation,
  useSpeciesCompositionDetailQuery,
  useSpeciesCompositionListQuery,
} from './hooks';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/hooks/useNotificationEvents/eventHandler', () => ({
  sendEvent: vi.fn(),
}));

vi.mock('@/services/APIs', () => ({
  default: {
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
      deleteDistrictVolume: vi.fn().mockResolvedValue(undefined),
    },
    speciesComposition: {
      listSpeciesCompositions: vi.fn().mockResolvedValue({
        content: [
          {
            id: 1,
            startDate: '2026-05-15',
            endDate: null,
            uploadedBy: 'IDIR/ABCDEF',
            dateOfUpload: '2026-03-27T00:00:00Z',
          },
        ],
        page: { number: 0, size: 10, totalElements: 1, totalPages: 1 },
      }),
      getSpeciesCompositionById: vi.fn().mockResolvedValue({
        id: 1,
        startDate: '2026-05-15',
        endDate: null,
        uploadedBy: 'IDIR/ABCDEF',
        dateOfUpload: '2026-03-27T00:00:00Z',
        tableData: { rows: [] },
      }),
      createSpeciesComposition: vi.fn().mockResolvedValue(555),
      deleteSpeciesComposition: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

vi.mock('@/api/utils', () => ({
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

  describe('useSpeciesCompositionListQuery', () => {
    it('should call listSpeciesCompositions with the correct params', async () => {
      const { result } = renderHook(
        () => useSpeciesCompositionListQuery({ page: 0, size: 10, sort: {} }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(API.speciesComposition.listSpeciesCompositions).toHaveBeenCalledWith({
        page: 0,
        size: 10,
        sort: [],
      });
      expect(result.current.data).toBeDefined();
    });

    it('should accept an options object with staleTime', async () => {
      const { result } = renderHook(
        () => useSpeciesCompositionListQuery({ page: 0, size: 10, sort: {} }, { staleTime: 60000 }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should dispatch a notification on error when notificationTarget is supplied', async () => {
      const mockError = new Error('List failed');
      vi.mocked(API.speciesComposition.listSpeciesCompositions).mockRejectedValueOnce(mockError);

      const { result } = renderHook(
        () =>
          useSpeciesCompositionListQuery(
            { page: 0, size: 10, sort: {} },
            { notificationTarget: 'sc-list' },
          ),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
      await waitFor(() => expect(sendEvent).toHaveBeenCalled());
    });
  });

  describe('useSpeciesCompositionDetailQuery', () => {
    it('should call getSpeciesCompositionById with the correct ID', async () => {
      const { result } = renderHook(() => useSpeciesCompositionDetailQuery(42), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(API.speciesComposition.getSpeciesCompositionById).toHaveBeenCalledWith(42);
    });

    it('should accept an options object with staleTime', async () => {
      const { result } = renderHook(
        () => useSpeciesCompositionDetailQuery(42, { staleTime: 60000 }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should dispatch a notification on error when notificationTarget is supplied', async () => {
      const mockError = new Error('Detail failed');
      vi.mocked(API.speciesComposition.getSpeciesCompositionById).mockRejectedValueOnce(mockError);

      const { result } = renderHook(
        () => useSpeciesCompositionDetailQuery(999, { notificationTarget: 'sc-detail-panel' }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
      await waitFor(() => expect(sendEvent).toHaveBeenCalled());
    });
  });

  describe('useSpeciesCompositionCreateMutation', () => {
    const validCreateRequest = {
      area: 'INTERIOR',
      startDate: '2026-05-15',
      tableLevelFactor: 1.0,
      heliMultiplier: null,
      tableData: {
        type: 'SPECIES_COMPOSITION' as const,
        rows: [
          {
            district: { code: 'DCC', description: 'Cariboo' },
            species: {
              balsam: 0.1,
              cedar: 0.2,
              cottonwood: 0,
              cypress: 0,
              fir: 0.3,
              hemlock: 0,
              larch: 0,
              maple: 0,
              pine: 0.1,
              poplar: 0,
              redcedar: 0,
              redwood: 0,
              spruce: 0,
              whitebirch: 0,
              whitepine: 0,
              yew: 0,
              other: 0,
              unknown: 0,
            },
          },
        ],
      },
    };

    it('should call createSpeciesComposition and return the new ID', async () => {
      const { result } = renderHook(() => useSpeciesCompositionCreateMutation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(validCreateRequest);
      });

      expect(API.speciesComposition.createSpeciesComposition).toHaveBeenCalledWith(
        validCreateRequest,
      );
      await waitFor(() => expect(result.current.data).toBe(555));
    });

    it('should invoke onSuccess with the created ID', async () => {
      const onSuccessMock = vi.fn();
      const { result } = renderHook(
        () => useSpeciesCompositionCreateMutation({ onSuccess: onSuccessMock }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await result.current.mutateAsync(validCreateRequest);
      });

      expect(onSuccessMock).toHaveBeenCalledWith(555);
    });

    it('should dispatch a notification on error when notificationTarget is supplied', async () => {
      const mockError = new Error('Create failed');
      vi.mocked(API.speciesComposition.createSpeciesComposition).mockRejectedValueOnce(mockError);

      const { result } = renderHook(
        () => useSpeciesCompositionCreateMutation({ notificationTarget: 'sc-create' }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        try {
          await result.current.mutateAsync(validCreateRequest);
        } catch (_e) {
          // expected
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      await waitFor(() => expect(sendEvent).toHaveBeenCalled());
    });

    it('should not dispatch notification when notificationTarget is omitted', async () => {
      const mockError = new Error('Create failed');
      vi.mocked(API.speciesComposition.createSpeciesComposition).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useSpeciesCompositionCreateMutation(), {
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

  describe('useDistrictVolumeTableDeleteMutation', () => {
    it('should call deleteDistrictVolume with the id on mutate', async () => {
      const { result } = renderHook(() => useDistrictVolumeTableDeleteMutation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(42);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(API.districtVolume.deleteDistrictVolume).toHaveBeenCalledWith(42);
    });

    it('should invoke onSuccess callback after delete completes', async () => {
      const onSuccessMock = vi.fn();
      const { result } = renderHook(
        () => useDistrictVolumeTableDeleteMutation({ onSuccess: onSuccessMock }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await result.current.mutateAsync(42);
      });

      expect(onSuccessMock).toHaveBeenCalledTimes(1);
    });

    it('should handle mutation errors without throwing', async () => {
      const mockError = new Error('Delete failed');
      vi.mocked(API.districtVolume.deleteDistrictVolume).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useDistrictVolumeTableDeleteMutation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync(42);
        } catch (_e) {
          // Error is expected and caught
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should support notificationTarget for problem-detail errors', async () => {
      const mockError = new Error('Delete failed');
      (mockError as unknown as { body: { detail: string; title: string } }).body = {
        detail: 'Entry is not future-dated',
        title: 'Unprocessable Entity',
      };
      vi.mocked(API.districtVolume.deleteDistrictVolume).mockRejectedValueOnce(mockError);

      const { result } = renderHook(
        () =>
          useDistrictVolumeTableDeleteMutation({
            notificationTarget: 'district-volume-list',
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        try {
          await result.current.mutateAsync(42);
        } catch (_e) {
          // expected
        }
      });

      await waitFor(() => expect(sendEvent).toHaveBeenCalled());
      expect(sendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'error',
          eventTarget: 'district-volume-list',
          description: 'Entry is not future-dated',
        }),
      );
    });

    it('should not dispatch notification when notificationTarget is omitted', async () => {
      const mockError = new Error('Delete failed');
      vi.mocked(API.districtVolume.deleteDistrictVolume).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useDistrictVolumeTableDeleteMutation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync(42);
        } catch (_e) {
          // expected
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(sendEvent).not.toHaveBeenCalled();
    });
  });

  describe('useSpeciesCompositionDeleteMutation', () => {
    it('should call deleteSpeciesComposition with the id on mutate', async () => {
      const { result } = renderHook(() => useSpeciesCompositionDeleteMutation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(42);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(API.speciesComposition.deleteSpeciesComposition).toHaveBeenCalledWith(42);
    });

    it('should invoke onSuccess callback after delete completes', async () => {
      const onSuccessMock = vi.fn();
      const { result } = renderHook(
        () => useSpeciesCompositionDeleteMutation({ onSuccess: onSuccessMock }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await result.current.mutateAsync(42);
      });

      expect(onSuccessMock).toHaveBeenCalledTimes(1);
    });

    it('should handle mutation errors without throwing', async () => {
      const mockError = new Error('Delete failed');
      vi.mocked(API.speciesComposition.deleteSpeciesComposition).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useSpeciesCompositionDeleteMutation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync(42);
        } catch (_e) {
          // Error is expected and caught
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should support notificationTarget for problem-detail errors', async () => {
      const mockError = new Error('Delete failed');
      (mockError as unknown as { body: { detail: string; title: string } }).body = {
        detail: 'Entry is not future-dated',
        title: 'Unprocessable Entity',
      };
      vi.mocked(API.speciesComposition.deleteSpeciesComposition).mockRejectedValueOnce(mockError);

      const { result } = renderHook(
        () =>
          useSpeciesCompositionDeleteMutation({
            notificationTarget: 'species-composition-list',
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        try {
          await result.current.mutateAsync(42);
        } catch (_e) {
          // expected
        }
      });

      await waitFor(() => expect(sendEvent).toHaveBeenCalled());
      expect(sendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'error',
          eventTarget: 'species-composition-list',
          description: 'Entry is not future-dated',
        }),
      );
    });

    it('should not dispatch notification when notificationTarget is omitted', async () => {
      const mockError = new Error('Delete failed');
      vi.mocked(API.speciesComposition.deleteSpeciesComposition).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useSpeciesCompositionDeleteMutation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync(42);
        } catch (_e) {
          // expected
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(sendEvent).not.toHaveBeenCalled();
    });
  });
});
