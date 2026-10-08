/**
 * Unit tests for {@link module:api/speciesCompositions} hook module.
 *
 * Migrated from config/react-query/hooks.unit.test.ts during the API
 * connection-layer migration: the data-source boundary is now the
 * SpeciesCompositionResource module (globally mocked in setup-env;
 * overridden here with programmable hoisted handles).
 *
 * @module api/speciesCompositions.unit.test
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sendEvent } from '@/hooks/useNotificationEvents/eventHandler';

import {
  useSpeciesCompositionCreateMutation,
  useSpeciesCompositionDeleteMutation,
  useSpeciesCompositionDetailQuery,
  useSpeciesCompositionListQuery,
} from './speciesCompositions';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/hooks/useNotificationEvents/eventHandler', () => ({
  sendEvent: vi.fn(),
}));

vi.mock('@/api/utils', () => ({
  forestClientAutocompleteResult2CodeDescription: vi.fn((c) => c),
  generateSortArray: vi.fn(() => []),
  removeEmpty: vi.fn((o) => o),
}));

const { mockSC } = vi.hoisted(() => ({
  mockSC: {
    listSpeciesCompositions: vi.fn(),
    getSpeciesCompositionById: vi.fn(),
    createSpeciesComposition: vi.fn(),
    deleteSpeciesComposition: vi.fn(),
  },
}));

vi.mock('@/api/resources/species-composition-resource', () => ({
  SpeciesCompositionResource: class {
    listSpeciesCompositions = mockSC.listSpeciesCompositions;
    getSpeciesCompositionById = mockSC.getSpeciesCompositionById;
    createSpeciesComposition = mockSC.createSpeciesComposition;
    deleteSpeciesComposition = mockSC.deleteSpeciesComposition;
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('api/speciesCompositions hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSC.listSpeciesCompositions.mockResolvedValue({
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
    });
    mockSC.getSpeciesCompositionById.mockResolvedValue({
      id: 1,
      startDate: '2026-05-15',
      endDate: null,
      uploadedBy: 'IDIR/ABCDEF',
      dateOfUpload: '2026-03-27T00:00:00Z',
      tableData: { rows: [] },
    });
    mockSC.createSpeciesComposition.mockResolvedValue(555);
    mockSC.deleteSpeciesComposition.mockResolvedValue(undefined);
  });

  describe('useSpeciesCompositionListQuery', () => {
    it('should call listSpeciesCompositions with the correct params', async () => {
      const { result } = renderHook(
        () => useSpeciesCompositionListQuery({ page: 0, size: 10, sort: {} }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockSC.listSpeciesCompositions).toHaveBeenCalledWith(
        { page: 0, size: 10, sort: [] },
        { signal: expect.any(AbortSignal) },
      );
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
      vi.mocked(mockSC.listSpeciesCompositions).mockRejectedValueOnce(mockError);

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

      expect(mockSC.getSpeciesCompositionById).toHaveBeenCalledWith(42, {
        signal: expect.any(AbortSignal),
      });
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
      vi.mocked(mockSC.getSpeciesCompositionById).mockRejectedValueOnce(mockError);

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

      expect(mockSC.createSpeciesComposition).toHaveBeenCalledWith(validCreateRequest);
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
      vi.mocked(mockSC.createSpeciesComposition).mockRejectedValueOnce(mockError);

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
      vi.mocked(mockSC.createSpeciesComposition).mockRejectedValueOnce(mockError);

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

  describe('useSpeciesCompositionDeleteMutation', () => {
    it('should call deleteSpeciesComposition with the id on mutate', async () => {
      const { result } = renderHook(() => useSpeciesCompositionDeleteMutation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(42);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockSC.deleteSpeciesComposition).toHaveBeenCalledWith(42);
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
      vi.mocked(mockSC.deleteSpeciesComposition).mockRejectedValueOnce(mockError);

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
      vi.mocked(mockSC.deleteSpeciesComposition).mockRejectedValueOnce(mockError);

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
      vi.mocked(mockSC.deleteSpeciesComposition).mockRejectedValueOnce(mockError);

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
