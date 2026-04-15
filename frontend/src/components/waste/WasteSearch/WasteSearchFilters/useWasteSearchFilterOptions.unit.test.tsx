import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

import { useWasteSearchFilterOptions } from './useWasteSearchFilterOptions';

import APIs from '@/services/APIs';
import * as eventHandler from '@/hooks/useNotificationEvents/eventHandler';

vi.mock('@/services/APIs', () => ({
  default: {
    codes: {
      getSamplingOptions: vi.fn(),
      getDistricts: vi.fn(),
      getAssessAreaStatuses: vi.fn(),
    },
  },
}));

vi.mock('@/hooks/useNotificationEvents/eventHandler', () => ({
  sendEvent: vi.fn(),
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
  });;

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

  describe('CORS and network failure handling', () => {
    it('sends inline notification when district API fails with CORS error', async () => {
      const corsError = new Error('CORS error');
      (corsError as any).body = {
        title: 'Unauthorized Access',
        detail: 'Cross-Origin Request Blocked',
        status: 0,
      };

      (APIs.codes.getDistricts as Mock).mockRejectedValue(corsError);

      renderHook(() => useWasteSearchFilterOptions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(eventHandler.sendEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'error',
            displayMode: 'inline',
            eventTarget: 'waste-search',
            title: 'Unauthorized Access',
            description: 'Cross-Origin Request Blocked',
          }),
        );
      });
    });

    it('sends inline notification when sampling options API fails', async () => {
      const networkError = new Error('Network request failed');
      (networkError as any).body = {
        title: 'Network Error',
        detail: 'Unable to reach the server',
        status: 0,
      };

      (APIs.codes.getSamplingOptions as Mock).mockRejectedValue(networkError);

      renderHook(() => useWasteSearchFilterOptions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(eventHandler.sendEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'error',
            displayMode: 'inline',
            eventTarget: 'waste-search',
            title: 'Network Error',
            description: 'Unable to reach the server',
          }),
        );
      });
    });

    it('sends inline notification when status options API fails', async () => {
      const serverError = new Error('Internal Server Error');
      (serverError as any).body = {
        title: 'Server Error',
        detail: 'An error occurred while fetching statuses',
        status: 500,
      };

      (APIs.codes.getAssessAreaStatuses as Mock).mockRejectedValue(serverError);

      renderHook(() => useWasteSearchFilterOptions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(eventHandler.sendEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'error',
            displayMode: 'inline',
            eventTarget: 'waste-search',
            title: 'Server Error',
            description: 'An error occurred while fetching statuses',
          }),
        );
      });
    });

    it('uses error message when problem details are not available', async () => {
      const error = new Error('Generic network error');

      (APIs.codes.getDistricts as Mock).mockRejectedValue(error);

      renderHook(() => useWasteSearchFilterOptions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(eventHandler.sendEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'error',
            displayMode: 'inline',
            eventTarget: 'waste-search',
            title: 'Request failed',
            description: 'Generic network error',
          }),
        );
      });
    });

    it('handles multiple simultaneous API failures with separate notifications', async () => {
      const error1 = new Error('Districts failed');
      (error1 as any).body = { title: 'Error 1', detail: 'Districts unavailable' };

      const error2 = new Error('Statuses failed');
      (error2 as any).body = { title: 'Error 2', detail: 'Statuses unavailable' };

      (APIs.codes.getDistricts as Mock).mockRejectedValue(error1);
      (APIs.codes.getAssessAreaStatuses as Mock).mockRejectedValue(error2);

      renderHook(() => useWasteSearchFilterOptions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(eventHandler.sendEvent).toHaveBeenCalledTimes(2);
        expect(eventHandler.sendEvent).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            eventTarget: 'waste-search',
            title: 'Error 1',
            description: 'Districts unavailable',
          }),
        );
        expect(eventHandler.sendEvent).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            eventTarget: 'waste-search',
            title: 'Error 2',
            description: 'Statuses unavailable',
          }),
        );
      });
    });
  });
});
