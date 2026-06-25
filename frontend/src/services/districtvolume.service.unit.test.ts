/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { DistrictVolumeService } from './districtvolume.service';

import type { DistrictVolumeListItem } from './districtvolumes.types';
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
      (service as any).doRequest = vi.fn().mockResolvedValue('http://example.com/api/configuration/district-average-volumes/42');

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
});
