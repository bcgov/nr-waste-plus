/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { DistrictVolumeService } from './districtvolume.service';

import type { DistrictVolumeDetail, DistrictVolumeListItem } from './districtvolumes.types';
import type { PageableRequest } from './types';

const mockConfig = { baseURL: 'http://localhost' };
let service: DistrictVolumeService;

beforeEach(() => {
  service = new DistrictVolumeService(mockConfig as any);
  vi.clearAllMocks();
});

const mockListItem: DistrictVolumeListItem = {
  id: 1,
  area: 'INTERIOR',
  startDate: '2026-05-15',
  endDate: null,
  uploadedBy: 'IDIR/ABCDEF',
  dateOfUpload: '2026-03-27T00:00:00Z',
};

const mockPageResponse = {
  content: [mockListItem],
  page: {
    number: 0,
    size: 10,
    totalElements: 1,
    totalPages: 1,
  },
};

const mockInteriorDetail: DistrictVolumeDetail = {
  id: 1,
  area: 'INTERIOR',
  startDate: '2026-05-15',
  endDate: null,
  uploadedBy: 'IDIR/ABCDEF',
  dateOfUpload: '2026-03-27T00:00:00Z',
  tableLevelFactor: 0,
  tableData: {
    type: 'INTERIOR',
    zones: [
      {
        name: 'Dry belt',
        districts: [
          {
            code: 'D1',
            avoidableSawlog: 100,
            avoidableGrade4: 50,
            unavoidableGrade4: 25,
            total: 175,
          },
        ],
      },
    ],
    formulas: {},
  },
};

const mockCoastalDetail: DistrictVolumeDetail = {
  id: 2,
  area: 'COASTAL',
  startDate: '2026-06-01',
  endDate: '2026-12-31',
  uploadedBy: 'IDIR/WXYZ',
  dateOfUpload: '2026-04-01T00:00:00Z',
  tableLevelFactor: 1,
  heliMultiplier: 1.5,
  tableData: {
    type: 'COASTAL',
    sections: [
      {
        name: 'Mature',
        districts: [
          {
            code: 'C1',
            avoidableSawlog: 200,
            avoidableHembalGradeU: 30,
            avoidableGradeY: 20,
            unavoidable: 10,
            total: 260,
          },
        ],
      },
    ],
    formulas: {},
  },
};

describe('DistrictVolumeService', () => {
  describe('getDistrictVolumes', () => {
    it('should call API with correct parameters and return paginated results', async () => {
      const pageable: PageableRequest<DistrictVolumeListItem> = {
        page: 0,
        size: 10,
      };
      (service as any).doRequest = vi.fn().mockResolvedValue(mockPageResponse);

      const result = await service.getDistrictVolumes(undefined, pageable);

      expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'GET',
        url: '/api/configuration/district-average-volumes',
        query: { size: 10 },
      });
      expect(result.content).toHaveLength(1);
      expect(result.content[0].id).toBe(1);
      expect(result.content[0].area).toBe('INTERIOR');
      expect(result.page.number).toBe(0);
      expect(result.page.size).toBe(10);
      expect(result.page.totalElements).toBe(1);
      expect(result.page.totalPages).toBe(1);
    });

    it('should include area filter when provided', async () => {
      const pageable: PageableRequest<DistrictVolumeListItem> = {
        page: 0,
        size: 10,
      };
      (service as any).doRequest = vi.fn().mockResolvedValue(mockPageResponse);

      await service.getDistrictVolumes('INTERIOR', pageable);

      expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'GET',
        url: '/api/configuration/district-average-volumes',
        query: { size: 10, area: 'INTERIOR' },
      });
    });

    it('should not include area filter when undefined', async () => {
      const pageable: PageableRequest<DistrictVolumeListItem> = {
        page: 0,
        size: 10,
      };
      (service as any).doRequest = vi.fn().mockResolvedValue(mockPageResponse);

      await service.getDistrictVolumes(undefined, pageable);

      const callArgs = (service as any).doRequest.mock.calls[0][1];
      expect(callArgs.query).not.toHaveProperty('area');
    });

    it('should handle empty content', async () => {
      const emptyResponse = {
        content: [],
        page: {
          number: 0,
          size: 10,
          totalElements: 0,
          totalPages: 0,
        },
      };
      (service as any).doRequest = vi.fn().mockResolvedValue(emptyResponse);

      const result = await service.getDistrictVolumes(undefined, { page: 0, size: 10 });

      expect(result.content).toEqual([]);
      expect(result.page.totalElements).toBe(0);
    });

    it('should include meta when provided', async () => {
      const pageable: PageableRequest<DistrictVolumeListItem> = {
        page: 0,
        size: 10,
      };
      const meta = { notificationTarget: 'district-volume-list' };
      (service as any).doRequest = vi.fn().mockResolvedValue(mockPageResponse);

      await service.getDistrictVolumes(undefined, pageable, meta);

      const callArgs = (service as any).doRequest.mock.calls[0][1];
      expect(callArgs.meta).toEqual(meta);
    });

    it('should not include meta when not provided', async () => {
      const pageable: PageableRequest<DistrictVolumeListItem> = {
        page: 0,
        size: 10,
      };
      (service as any).doRequest = vi.fn().mockResolvedValue(mockPageResponse);

      await service.getDistrictVolumes(undefined, pageable);

      const callArgs = (service as any).doRequest.mock.calls[0][1];
      expect(callArgs.meta).toBeUndefined();
    });

    it('should handle multiple items in content', async () => {
      const item2: DistrictVolumeListItem = {
        id: 2,
        area: 'COASTAL',
        startDate: '2026-04-01',
        endDate: null,
        uploadedBy: 'IDIR/WXYZ',
        dateOfUpload: '2026-02-12T00:00:00Z',
      };
      const multiResponse = {
        content: [mockListItem, item2],
        page: {
          number: 0,
          size: 10,
          totalElements: 2,
          totalPages: 1,
        },
      };
      (service as any).doRequest = vi.fn().mockResolvedValue(multiResponse);

      const result = await service.getDistrictVolumes(undefined, { page: 0, size: 10 });

      expect(result.content).toHaveLength(2);
      expect(result.content[1].area).toBe('COASTAL');
    });
  });

  describe('Service Configuration', () => {
    it('should be initialized with correct config', () => {
      expect(service.config).toEqual(mockConfig);
    });
  });

  describe('createDistrictVolumeTable', () => {
    it('should parse resource ID from Location header', async () => {
      (service as any).doRequest = vi
        .fn()
        .mockResolvedValue('http://example.com/api/configuration/district-average-volumes/42');

      const result = await service.createDistrictVolumeTable({
        area: 'INTERIOR',
        startDate: '2026-06-01',
        tableLevelFactor: 0,
        tableData: { type: 'INTERIOR', zones: [], formulas: {} },
      });

      expect(result).toBe(42);
      expect((service as any).doRequest).toHaveBeenCalledWith(
        mockConfig,
        expect.objectContaining({
          method: 'POST',
          url: '/api/configuration/district-average-volumes',
          responseHeader: 'location',
        }),
      );
    });

    it('should reject when Location header cannot be parsed', async () => {
      (service as any).doRequest = vi.fn().mockResolvedValue('invalid-location');

      await expect(
        service.createDistrictVolumeTable({
          area: 'INTERIOR',
          startDate: '2026-06-01',
          tableLevelFactor: 0,
          tableData: { type: 'INTERIOR', zones: [], formulas: {} },
        }),
      ).rejects.toThrow('Could not parse resource ID from Location header');
    });

    it('should propagate network errors', async () => {
      (service as any).doRequest = vi.fn().mockRejectedValue(new Error('Network Error'));

      await expect(
        service.createDistrictVolumeTable({
          area: 'INTERIOR',
          startDate: '2026-06-01',
          tableLevelFactor: 0,
          tableData: { type: 'INTERIOR', zones: [], formulas: {} },
        }),
      ).rejects.toThrow('Network Error');
    });

    it('should reject with CancelError when cancelled', async () => {
      const innerRequest = new Promise(() => {});
      (innerRequest as any).cancel = vi.fn();
      (service as any).doRequest = vi.fn().mockReturnValue(innerRequest);

      const request = service.createDistrictVolumeTable({
        area: 'INTERIOR',
        startDate: '2026-06-01',
        tableLevelFactor: 0,
        tableData: { type: 'INTERIOR', zones: [], formulas: {} },
      });

      request.cancel();

      await expect(request).rejects.toThrow('Request aborted');
    });

    it('should pass meta to doRequest when provided', async () => {
      const meta = { notificationTarget: 'district-volume-create' };
      (service as any).doRequest = vi.fn().mockResolvedValue('http://example.com/42');

      await service.createDistrictVolumeTable(
        {
          area: 'INTERIOR',
          startDate: '2026-06-01',
          tableLevelFactor: 0,
          tableData: { type: 'INTERIOR', zones: [], formulas: {} },
        },
        meta,
      );

      const callArgs = (service as any).doRequest.mock.calls[0][1];
      expect(callArgs.meta).toEqual(meta);
    });

    it('should not include meta when not provided', async () => {
      (service as any).doRequest = vi.fn().mockResolvedValue('http://example.com/42');

      await service.createDistrictVolumeTable({
        area: 'INTERIOR',
        startDate: '2026-06-01',
        tableLevelFactor: 0,
        tableData: { type: 'INTERIOR', zones: [], formulas: {} },
      });

      const callArgs = (service as any).doRequest.mock.calls[0][1];
      expect(callArgs.meta).toBeUndefined();
    });
  });

  describe('getDistrictVolumeTableDetail', () => {
    it('should call API with correct ID and return detail', async () => {
      (service as any).doRequest = vi.fn().mockResolvedValue(mockInteriorDetail);

      const result = await service.getDistrictVolumeTableDetail(1);

      expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'GET',
        url: '/api/configuration/district-average-volumes/1',
      });
      expect(result.id).toBe(1);
      expect(result.area).toBe('INTERIOR');
      expect(result.tableData.type).toBe('INTERIOR');
    });

    it('should return COASTAL detail with heliMultiplier', async () => {
      (service as any).doRequest = vi.fn().mockResolvedValue(mockCoastalDetail);

      const result = await service.getDistrictVolumeTableDetail(2);

      expect(result.id).toBe(2);
      expect(result.area).toBe('COASTAL');
      expect((result as DistrictVolumeDetail & { heliMultiplier: number }).heliMultiplier).toBe(
        1.5,
      );
      expect(result.endDate).toBe('2026-12-31');
      expect(result.tableData.type).toBe('COASTAL');
    });

    it('should include meta when provided', async () => {
      const meta = { notificationTarget: 'district-volume-detail' };
      (service as any).doRequest = vi.fn().mockResolvedValue(mockInteriorDetail);

      await service.getDistrictVolumeTableDetail(1, meta);

      const callArgs = (service as any).doRequest.mock.calls[0][1];
      expect(callArgs.meta).toEqual(meta);
    });

    it('should not include meta when not provided', async () => {
      (service as any).doRequest = vi.fn().mockResolvedValue(mockInteriorDetail);

      await service.getDistrictVolumeTableDetail(1);

      const callArgs = (service as any).doRequest.mock.calls[0][1];
      expect(callArgs.meta).toBeUndefined();
    });

    it('should propagate network errors', async () => {
      (service as any).doRequest = vi.fn().mockRejectedValue(new Error('Network Error'));

      await expect(service.getDistrictVolumeTableDetail(1)).rejects.toThrow('Network Error');
    });

    it('should handle API 404 error', async () => {
      (service as any).doRequest = vi.fn().mockRejectedValue(new Error('Not Found'));

      await expect(service.getDistrictVolumeTableDetail(999)).rejects.toThrow('Not Found');
    });
  });
});
