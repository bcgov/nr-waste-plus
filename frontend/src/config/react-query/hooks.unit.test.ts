import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useClientLookupQuery,
  useCodesQuery,
  useDistrictOptionsQuery,
  useForestClientsByNumbersQuery,
  useMyForestClientsQuery,
  useReportingUnitDetailsQuery,
  useReportingUnitExpandQuery,
  useSearchReportingUnitsQuery,
  useWasteSearchFilterOptionsQueries,
} from './hooks';

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
});
