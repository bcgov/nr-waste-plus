/**
 * Unit tests for {@link module:api/reportingUnits} hook module.
 *
 * Migrated from config/react-query/hooks.unit.test.ts during the API
 * connection-layer migration: the data-source boundary is now the
 * ReportingUnitResource module (globally mocked in setup-env;
 * overridden here with programmable hoisted handles).
 *
 * @module api/reportingUnits.unit.test
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useReportingUnitCreateMutation } from './reportingUnits';

import { sendEvent } from '@/hooks/useNotificationEvents/eventHandler';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/hooks/useNotificationEvents/eventHandler', () => ({
  sendEvent: vi.fn(),
}));

const { mockReportingUnit } = vi.hoisted(() => ({
  mockReportingUnit: {
    getReportingUnit: vi.fn(),
    createReportingUnit: vi.fn(),
  },
}));

vi.mock('@/api/resources/reporting-unit-resource', () => ({
  ReportingUnitResource: class {
    getReportingUnit = mockReportingUnit.getReportingUnit;
    createReportingUnit = mockReportingUnit.createReportingUnit;
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('api/reportingUnits hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReportingUnit.getReportingUnit.mockResolvedValue({ id: 1 });
    mockReportingUnit.createReportingUnit.mockResolvedValue(333);
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

      vi.mocked(mockReportingUnit.createReportingUnit).mockRejectedValueOnce(mockError);

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
      vi.mocked(mockReportingUnit.createReportingUnit).mockRejectedValueOnce(mockError);

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
  });});
