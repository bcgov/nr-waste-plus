/**
 * Unit tests for {@link module:api/districtVolumes} hook module.
 *
 * Migrated from config/react-query/hooks.unit.test.ts during the API
 * connection-layer migration: the data-source boundary is now the
 * DistrictVolumeResource module (globally mocked in setup-env;
 * overridden here with programmable hoisted handles).
 *
 * @module api/districtVolumes.unit.test
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sendEvent } from '@/hooks/useNotificationEvents/eventHandler';

import {
  useDistrictVolumeListQuery,
  useDistrictVolumeTableCreateMutation,
  useDistrictVolumeTableDeleteMutation,
  useDistrictVolumeTableDetailQuery,
} from './districtVolumes';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/hooks/useNotificationEvents/eventHandler', () => ({
  sendEvent: vi.fn(),
}));

vi.mock('@/api/utils', () => ({
  forestClientAutocompleteResult2CodeDescription: vi.fn((c) => c),
  generateSortArray: vi.fn(() => []),
  removeEmpty: vi.fn((o) => o),
}));

const { mockDV } = vi.hoisted(() => ({
  mockDV: {
    getDistrictVolumes: vi.fn(),
    createDistrictVolumeTable: vi.fn(),
    getDistrictVolumeTableDetail: vi.fn(),
    deleteDistrictVolume: vi.fn(),
  },
}));

vi.mock('@/api/resources/district-volume-resource', () => ({
  DistrictVolumeResource: class {
    getDistrictVolumes = mockDV.getDistrictVolumes;
    createDistrictVolumeTable = mockDV.createDistrictVolumeTable;
    getDistrictVolumeTableDetail = mockDV.getDistrictVolumeTableDetail;
    deleteDistrictVolume = mockDV.deleteDistrictVolume;
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('api/districtVolumes hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDV.getDistrictVolumes.mockResolvedValue({
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
    });
    mockDV.getDistrictVolumeTableDetail.mockResolvedValue({
      area: 'INTERIOR',
      id: 42,
      startDate: '2026-06-01',
      zones: [],
    });
    mockDV.createDistrictVolumeTable.mockResolvedValue(444);
    mockDV.deleteDistrictVolume.mockResolvedValue(undefined);
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
        expect(mockDV.getDistrictVolumes).toHaveBeenCalledWith(
          undefined,
          { page: 0, size: 10, sort: [] },
          { signal: expect.any(AbortSignal) },
        ),
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
      vi.mocked(mockDV.getDistrictVolumes).mockRejectedValueOnce(mockError);

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
      expect(mockDV.getDistrictVolumeTableDetail).toHaveBeenCalledWith(42, {
        signal: expect.any(AbortSignal),
      });
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
      vi.mocked(mockDV.getDistrictVolumeTableDetail).mockRejectedValueOnce(mockError);

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
      vi.mocked(mockDV.getDistrictVolumeTableDetail).mockRejectedValueOnce(mockError);

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

      expect(mockDV.createDistrictVolumeTable).toHaveBeenCalledWith(validCreateRequest);
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
      vi.mocked(mockDV.createDistrictVolumeTable).mockRejectedValueOnce(mockError);

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
      vi.mocked(mockDV.createDistrictVolumeTable).mockRejectedValueOnce(mockError);

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
      vi.mocked(mockDV.createDistrictVolumeTable).mockRejectedValueOnce(mockError);

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

  describe('useDistrictVolumeTableDeleteMutation', () => {
    it('should call deleteDistrictVolume with the id on mutate', async () => {
      const { result } = renderHook(() => useDistrictVolumeTableDeleteMutation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(42);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockDV.deleteDistrictVolume).toHaveBeenCalledWith(42);
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
      vi.mocked(mockDV.deleteDistrictVolume).mockRejectedValueOnce(mockError);

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
      vi.mocked(mockDV.deleteDistrictVolume).mockRejectedValueOnce(mockError);

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
      vi.mocked(mockDV.deleteDistrictVolume).mockRejectedValueOnce(mockError);

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
});
