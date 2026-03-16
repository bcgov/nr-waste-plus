import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

import { useWasteSearchFilterOptions } from './useWasteSearchFilterOptions';

import APIs from '@/services/APIs';

vi.mock('@/services/APIs', () => ({
  default: {
    codes: {
      getSamplingOptions: vi.fn(),
      getDistricts: vi.fn(),
      getAssessAreaStatuses: vi.fn(),
    },
  },
}));

const samplingData = [
  { code: 'S1', description: 'Sampling Option 1' },
  { code: 'S2', description: 'Sampling Option 2' },
];
const districtData = [
  { code: 'D1', description: 'District 1' },
  { code: 'D2', description: 'District 2' },
];
const statusData = [
  { code: 'ST1', description: 'Status 1' },
  { code: 'ST2', description: 'Status 2' },
];

const createWrapper = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('useWasteSearchFilterOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (APIs.codes.getSamplingOptions as Mock).mockResolvedValue(samplingData);
    (APIs.codes.getDistricts as Mock).mockResolvedValue(districtData);
    (APIs.codes.getAssessAreaStatuses as Mock).mockResolvedValue(statusData);
  });

  it('returns empty arrays before data is loaded', () => {
    (APIs.codes.getSamplingOptions as Mock).mockReturnValue(new Promise(() => {}));
    (APIs.codes.getDistricts as Mock).mockReturnValue(new Promise(() => {}));
    (APIs.codes.getAssessAreaStatuses as Mock).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useWasteSearchFilterOptions(), {
      wrapper: createWrapper(),
    });

    expect(result.current.samplingOptions).toEqual([]);
    expect(result.current.districtOptions).toEqual([]);
    expect(result.current.statusOptions).toEqual([]);
  });

  it('calls getSamplingOptions API', async () => {
    renderHook(() => useWasteSearchFilterOptions(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(APIs.codes.getSamplingOptions).toHaveBeenCalledTimes(1);
    });
  });

  it('calls getDistricts API', async () => {
    renderHook(() => useWasteSearchFilterOptions(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(APIs.codes.getDistricts).toHaveBeenCalledTimes(1);
    });
  });

  it('calls getAssessAreaStatuses API', async () => {
    renderHook(() => useWasteSearchFilterOptions(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(APIs.codes.getAssessAreaStatuses).toHaveBeenCalledTimes(1);
    });
  });

  it('returns sampling options after data loads', async () => {
    const { result } = renderHook(() => useWasteSearchFilterOptions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.samplingOptions).toEqual(samplingData);
    });
  });

  it('returns district options after data loads', async () => {
    const { result } = renderHook(() => useWasteSearchFilterOptions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.districtOptions).toEqual(districtData);
    });
  });

  it('returns status options after data loads', async () => {
    const { result } = renderHook(() => useWasteSearchFilterOptions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.statusOptions).toEqual(statusData);
    });
  });

  it('returns all three datasets simultaneously', async () => {
    const { result } = renderHook(() => useWasteSearchFilterOptions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.samplingOptions).toEqual(samplingData);
      expect(result.current.districtOptions).toEqual(districtData);
      expect(result.current.statusOptions).toEqual(statusData);
    });
  });

  it('returns empty arrays when API returns empty results', async () => {
    (APIs.codes.getSamplingOptions as Mock).mockResolvedValue([]);
    (APIs.codes.getDistricts as Mock).mockResolvedValue([]);
    (APIs.codes.getAssessAreaStatuses as Mock).mockResolvedValue([]);

    const { result } = renderHook(() => useWasteSearchFilterOptions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.samplingOptions).toEqual([]);
      expect(result.current.districtOptions).toEqual([]);
      expect(result.current.statusOptions).toEqual([]);
    });
  });
});
