/**
 * Unit tests for {@link module:api/codes} hook module.
 *
 * Migrated from config/react-query/hooks.unit.test.ts during the API
 * connection-layer migration: the data-source boundary is now the
 * CodesResource module (globally mocked in setup-env; overridden here
 * with programmable hoisted handles).
 *
 * @module api/codes.unit.test
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useCodesQuery,
  useDistrictOptionsQuery,
  useWasteSearchFilterOptionsQueries,
} from './codes';

import { sendEvent } from '@/hooks/useNotificationEvents/eventHandler';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/hooks/useNotificationEvents/eventHandler', () => ({
  sendEvent: vi.fn(),
}));

const { mockCodes } = vi.hoisted(() => ({
  mockCodes: {
    getSamplingOptions: vi.fn(),
    getDistricts: vi.fn(),
    getAssessAreaStatuses: vi.fn(),
  },
}));

vi.mock('@/api/resources/codes-resource', () => ({
  CodesResource: class {
    getSamplingOptions = mockCodes.getSamplingOptions;
    getDistricts = mockCodes.getDistricts;
    getAssessAreaStatuses = mockCodes.getAssessAreaStatuses;
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('api/codes hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCodes.getSamplingOptions.mockResolvedValue([{ code: 'S1', description: 'Sampling 1' }]);
    mockCodes.getDistricts.mockResolvedValue([{ code: 'D1', description: 'District 1' }]);
    mockCodes.getAssessAreaStatuses.mockResolvedValue([{ code: 'APP', description: 'Approved' }]);
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

  describe('notification deduplification', () => {
    it('useWasteSearchFilterOptionsQueries should not send duplicate notifications for the same error', async () => {
      const mockError = new Error('Mock Error');
      (mockError as unknown as { body: { detail: string; title: string } }).body = {
        detail: 'Error detail',
        title: 'Title',
      };
      vi.mocked(mockCodes.getSamplingOptions).mockRejectedValueOnce(mockError);

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

  describe('error notification behavior', () => {
    it('useCodesQuery should dispatch error notification when notificationTarget is provided', async () => {
      const mockError = new Error('API Error');
      (mockError as unknown as { body: { detail: string; title: string } }).body = {
        detail: 'Code not found',
        title: 'Not Found',
      };
      vi.mocked(mockCodes.getSamplingOptions).mockRejectedValueOnce(mockError);

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
      vi.mocked(mockCodes.getDistricts).mockRejectedValueOnce(mockError);

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
      vi.mocked(mockCodes.getSamplingOptions).mockRejectedValueOnce(mockError);

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

    it('should use fallback description when problem details exist but detail is empty', async () => {
      const mockError = new Error('API Error');
      (mockError as unknown as { body: { detail?: string; title: string } }).body = {
        title: 'Bad Request',
      };
      vi.mocked(mockCodes.getSamplingOptions).mockRejectedValueOnce(mockError);

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
      vi.mocked(mockCodes.getDistricts).mockRejectedValueOnce(mockError);

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
      vi.mocked(mockCodes.getSamplingOptions).mockRejectedValueOnce(mockError);

      renderHook(() => useWasteSearchFilterOptionsQueries(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockCodes.getSamplingOptions).toHaveBeenCalled();
      });

      expect(sendEvent).not.toHaveBeenCalled();
    });

    it('useCodesQuery should not send duplicate notifications for the same error via errorUpdatedAt dedup', async () => {
      const mockError = new Error('API Error');
      (mockError as unknown as { body: { detail: string; title: string } }).body = {
        detail: 'Error detail',
        title: 'Title',
      };
      vi.mocked(mockCodes.getSamplingOptions).mockRejectedValueOnce(mockError);

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

  });});
