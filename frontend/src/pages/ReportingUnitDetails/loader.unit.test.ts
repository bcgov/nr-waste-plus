import { describe, it, expect, vi, beforeEach } from 'vitest';

import { reportingUnitLoader } from './loader';

import { ApiError } from '@/config/api/types';
import { queryClient } from '@/config/react-query/config';
import APIs from '@/services/APIs';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/config/react-query/config', () => ({
  queryClient: {
    ensureQueryData: vi.fn(),
  },
}));

vi.mock('@/services/APIs', () => ({
  default: {
    reportingUnit: {
      getReportingUnit: vi.fn(),
    },
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockEnsureQueryData = vi.mocked(queryClient.ensureQueryData);

function makeApiError(status: number, statusText: string): ApiError {
  return new ApiError(
    { method: 'GET', url: `/api/reporting-units/999` },
    { url: `/api/reporting-units/999`, ok: false, status, statusText, body: null },
    statusText,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('reportingUnitLoader', () => {
  beforeEach(() => {
    mockEnsureQueryData.mockReset();
  });

  describe('param validation', () => {
    it('throws notFound when ruId is a non-numeric string', async () => {
      await expect(reportingUnitLoader({ params: { ruId: 'abc' } })).rejects.toMatchObject({
        isNotFound: true,
      });
      expect(mockEnsureQueryData).not.toHaveBeenCalled();
    });

    it('throws notFound when ruId is "NaN"', async () => {
      await expect(reportingUnitLoader({ params: { ruId: 'NaN' } })).rejects.toMatchObject({
        isNotFound: true,
      });
      expect(mockEnsureQueryData).not.toHaveBeenCalled();
    });

      it('accepts zero as a valid numeric ruId and calls ensureQueryData', async () => {
      const mockData = { id: 0, client: { code: 'A', description: 'A' }, clientStatus: { code: 'A', description: 'A' }, grade: { code: 'A', description: 'A' }, sampling: { code: 'A', description: 'A' }, district: { code: 'A', description: 'A' } };
      mockEnsureQueryData.mockResolvedValue(mockData);
      const result = await reportingUnitLoader({ params: { ruId: '0' } });
      expect(result).toEqual(mockData);
      expect(mockEnsureQueryData).toHaveBeenCalledOnce();
    });
  });

  describe('successful fetch', () => {
    it('returns reporting unit data when found', async () => {
      const mockData = {
        id: 123,
        client: { code: '00001001', description: 'Test Client' },
        clientStatus: { code: 'ACT', description: 'Active' },
        grade: { code: 'G1', description: 'Grade 1' },
        sampling: { code: 'S1', description: 'Sampling 1' },
        district: { code: 'DCR', description: 'District CR' },
      };
      mockEnsureQueryData.mockResolvedValue(mockData);

      const result = await reportingUnitLoader({ params: { ruId: '123' } });

      expect(result).toEqual(mockData);
    });

    it('passes the correct query key for the given ruId', async () => {
      const mockData = {
        id: 42,
        client: { code: 'C', description: 'C' },
        clientStatus: { code: 'A', description: 'A' },
        grade: { code: 'A', description: 'A' },
        sampling: { code: 'A', description: 'A' },
        district: { code: 'A', description: 'A' },
      };
      mockEnsureQueryData.mockResolvedValue(mockData);

      await reportingUnitLoader({ params: { ruId: '42' } });

      expect(mockEnsureQueryData).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['reporting-unit', 'details', 42],
          queryFn: expect.any(Function),
        }),
      );
    });

    it('queryFn calls the reporting unit service with the numeric id', async () => {
      const mockData = {
        id: 7,
        client: { code: 'X', description: 'X' },
        clientStatus: { code: 'A', description: 'A' },
        grade: { code: 'A', description: 'A' },
        sampling: { code: 'A', description: 'A' },
        district: { code: 'A', description: 'A' },
      };
      const mockGetReportingUnit = vi.mocked(APIs.reportingUnit.getReportingUnit);
      mockGetReportingUnit.mockResolvedValue(mockData);

      // Let ensureQueryData actually call the queryFn
      mockEnsureQueryData.mockImplementation(({ queryFn }) => queryFn());

      const result = await reportingUnitLoader({ params: { ruId: '7' } });

      expect(mockGetReportingUnit).toHaveBeenCalledWith(7);
      expect(result).toEqual(mockData);
    });

    it('parses the ruId string to a number before calling ensureQueryData', async () => {
      const mockData = {
        id: 999,
        client: { code: 'X', description: 'X' },
        clientStatus: { code: 'A', description: 'A' },
        grade: { code: 'A', description: 'A' },
        sampling: { code: 'A', description: 'A' },
        district: { code: 'A', description: 'A' },
      };
      mockEnsureQueryData.mockResolvedValue(mockData);

      await reportingUnitLoader({ params: { ruId: '999' } });

      const call = mockEnsureQueryData.mock.calls[0]?.[0];
      expect(typeof call?.queryKey[2]).toBe('number');
      expect(call?.queryKey[2]).toBe(999);
    });
  });

  describe('empty data guard', () => {
    it('throws notFound when ensureQueryData resolves to null', async () => {
      mockEnsureQueryData.mockResolvedValue(null);

      await expect(reportingUnitLoader({ params: { ruId: '123' } })).rejects.toMatchObject({
        isNotFound: true,
      });
    });

    it('throws notFound when ensureQueryData resolves to undefined', async () => {
      mockEnsureQueryData.mockResolvedValue(undefined);

      await expect(reportingUnitLoader({ params: { ruId: '123' } })).rejects.toMatchObject({
        isNotFound: true,
      });
    });
  });

  describe('API error handling', () => {
    it('throws notFound when the API returns 404', async () => {
      mockEnsureQueryData.mockRejectedValue(makeApiError(404, 'Not Found'));

      await expect(reportingUnitLoader({ params: { ruId: '999' } })).rejects.toMatchObject({
        isNotFound: true,
      });
    });

    it('throws notFound when the API returns 403 (non-existent resource reported as Forbidden)', async () => {
      mockEnsureQueryData.mockRejectedValue(makeApiError(403, 'Forbidden'));

      await expect(reportingUnitLoader({ params: { ruId: '999' } })).rejects.toMatchObject({
        isNotFound: true,
      });
    });

    it('re-throws ApiError as-is when status is 500', async () => {
      const serverError = makeApiError(500, 'Internal Server Error');
      mockEnsureQueryData.mockRejectedValue(serverError);

      await expect(reportingUnitLoader({ params: { ruId: '999' } })).rejects.toThrow(
        'Internal Server Error',
      );
    });

    it('re-throws ApiError as-is when status is 401', async () => {
      const unauthorizedError = makeApiError(401, 'Unauthorized');
      mockEnsureQueryData.mockRejectedValue(unauthorizedError);

      await expect(reportingUnitLoader({ params: { ruId: '99' } })).rejects.toThrow(
        'Unauthorized',
      );
    });

    it('re-throws non-ApiError network errors unchanged', async () => {
      const networkError = new Error('Network Error');
      mockEnsureQueryData.mockRejectedValue(networkError);

      await expect(reportingUnitLoader({ params: { ruId: '123' } })).rejects.toThrow(
        'Network Error',
      );
    });

    it('re-throws unknown thrown values unchanged', async () => {
      const weirdThing = { code: 'WEIRD' };
      mockEnsureQueryData.mockRejectedValue(weirdThing);

      await expect(reportingUnitLoader({ params: { ruId: '1' } })).rejects.toEqual(weirdThing);
    });
  });
});
