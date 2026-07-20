/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SpeciesCompositionService } from './speciesComposition.service';

import type {
  SpeciesCompositionDetail,
  SpeciesCompositionListItem,
} from './speciesComposition.types';
import type { PageableRequest } from '@/services/types';

const mockConfig = { baseURL: 'http://localhost' };
let service: SpeciesCompositionService;

beforeEach(() => {
  service = new SpeciesCompositionService(mockConfig as any);
  vi.clearAllMocks();
});

const mockListItem: SpeciesCompositionListItem = {
  id: 1,
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

const mockDetail: SpeciesCompositionDetail = {
  id: 1,
  startDate: '2026-05-15',
  endDate: null,
  uploadedBy: 'IDIR/ABCDEF',
  dateOfUpload: '2026-03-27T00:00:00Z',
  tableData: {
    rows: [
      {
        district: { code: 'DCC', description: 'Cariboo' },
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
        total: 0.7,
      },
    ],
  },
};

describe('SpeciesCompositionService', () => {
  describe('listSpeciesCompositions', () => {
    it('should call API with correct parameters and return paginated results', async () => {
      const pageable: PageableRequest<SpeciesCompositionListItem> = {
        page: 0,
        size: 10,
      };
      (service as any).doRequest = vi.fn().mockResolvedValue(mockPageResponse);

      const result = await service.listSpeciesCompositions(pageable);

      expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'GET',
        url: '/api/configuration/species-composition',
        query: { size: 10 },
      });
      expect(result.content).toHaveLength(1);
      expect(result.content[0].id).toBe(1);
      expect(result.page.number).toBe(0);
      expect(result.page.size).toBe(10);
      expect(result.page.totalElements).toBe(1);
      expect(result.page.totalPages).toBe(1);
    });

    it('should not include undefined keys in query', async () => {
      const pageable: PageableRequest<SpeciesCompositionListItem> = {
        page: 0,
        size: 10,
      };
      (service as any).doRequest = vi.fn().mockResolvedValue(mockPageResponse);

      await service.listSpeciesCompositions(pageable);

      const callArgs = (service as any).doRequest.mock.calls[0][1];
      expect(callArgs).not.toHaveProperty('body');
      expect(callArgs.query).toEqual({ size: 10 });
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

      const result = await service.listSpeciesCompositions({ page: 0, size: 10 });

      expect(result.content).toEqual([]);
      expect(result.page.totalElements).toBe(0);
    });

    it('should include meta when provided', async () => {
      const pageable: PageableRequest<SpeciesCompositionListItem> = {
        page: 0,
        size: 10,
      };
      const meta = { notificationTarget: 'species-composition-list' };
      (service as any).doRequest = vi.fn().mockResolvedValue(mockPageResponse);

      await service.listSpeciesCompositions(pageable, meta);

      const callArgs = (service as any).doRequest.mock.calls[0][1];
      expect(callArgs.meta).toEqual(meta);
    });

    it('should not include meta when not provided', async () => {
      const pageable: PageableRequest<SpeciesCompositionListItem> = {
        page: 0,
        size: 10,
      };
      (service as any).doRequest = vi.fn().mockResolvedValue(mockPageResponse);

      await service.listSpeciesCompositions(pageable);

      const callArgs = (service as any).doRequest.mock.calls[0][1];
      expect(callArgs.meta).toBeUndefined();
    });

    it('should handle multiple items in content', async () => {
      const item2: SpeciesCompositionListItem = {
        id: 2,
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

      const result = await service.listSpeciesCompositions({ page: 0, size: 10 });

      expect(result.content).toHaveLength(2);
      expect(result.content[1].id).toBe(2);
    });
  });

  describe('Service Configuration', () => {
    it('should be initialized with correct config', () => {
      expect(service.config).toEqual(mockConfig);
    });
  });

  describe('createSpeciesComposition', () => {
    const validCreateRequest = {
      tableData: {
        rows: [
          {
            district: { code: 'DCC', description: 'Cariboo' },
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
            total: 0.7,
          },
        ],
      },
    };

    it('should parse resource ID from Location header', async () => {
      (service as any).doRequest = vi
        .fn()
        .mockResolvedValue('http://example.com/api/configuration/species-composition/42');

      const result = await service.createSpeciesComposition(validCreateRequest);

      expect(result).toBe(42);
      expect((service as any).doRequest).toHaveBeenCalledWith(
        mockConfig,
        expect.objectContaining({
          method: 'POST',
          url: '/api/configuration/species-composition',
          responseHeader: 'location',
        }),
      );
    });

    it('should reject when Location header cannot be parsed', async () => {
      (service as any).doRequest = vi.fn().mockResolvedValue('invalid-location');

      await expect(service.createSpeciesComposition(validCreateRequest)).rejects.toThrow(
        'Invalid Location header: "invalid-location"',
      );
    });

    it('should propagate network errors', async () => {
      (service as any).doRequest = vi.fn().mockRejectedValue(new Error('Network Error'));

      await expect(service.createSpeciesComposition(validCreateRequest)).rejects.toThrow(
        'Network Error',
      );
    });

    it('should reject with CancelError when cancelled', async () => {
      const innerRequest = new Promise(() => {});
      (innerRequest as any).cancel = vi.fn();
      (service as any).doRequest = vi.fn().mockReturnValue(innerRequest);

      const request = service.createSpeciesComposition(validCreateRequest);

      request.cancel();

      await expect(request).rejects.toThrow('Request aborted');
    });

    it('should pass meta to doRequest when provided', async () => {
      const meta = { notificationTarget: 'species-composition-create' };
      (service as any).doRequest = vi.fn().mockResolvedValue('http://example.com/42');

      await service.createSpeciesComposition(validCreateRequest, meta);

      const callArgs = (service as any).doRequest.mock.calls[0][1];
      expect(callArgs.meta).toEqual(meta);
    });

    it('should not include meta when not provided', async () => {
      (service as any).doRequest = vi.fn().mockResolvedValue('http://example.com/42');

      await service.createSpeciesComposition(validCreateRequest);

      const callArgs = (service as any).doRequest.mock.calls[0][1];
      expect(callArgs.meta).toBeUndefined();
    });
  });

  describe('getSpeciesCompositionById', () => {
    it('should call API with correct ID and return detail', async () => {
      (service as any).doRequest = vi.fn().mockResolvedValue(mockDetail);

      const result = await service.getSpeciesCompositionById(1);

      expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'GET',
        url: '/api/configuration/species-composition/1',
      });
      expect(result.id).toBe(1);
      expect(result.tableData.rows).toHaveLength(1);
    });

    it('should include meta when provided', async () => {
      const meta = { notificationTarget: 'species-composition-detail' };
      (service as any).doRequest = vi.fn().mockResolvedValue(mockDetail);

      await service.getSpeciesCompositionById(1, meta);

      const callArgs = (service as any).doRequest.mock.calls[0][1];
      expect(callArgs.meta).toEqual(meta);
    });

    it('should not include meta when not provided', async () => {
      (service as any).doRequest = vi.fn().mockResolvedValue(mockDetail);

      await service.getSpeciesCompositionById(1);

      const callArgs = (service as any).doRequest.mock.calls[0][1];
      expect(callArgs.meta).toBeUndefined();
    });

    it('should propagate network errors', async () => {
      (service as any).doRequest = vi.fn().mockRejectedValue(new Error('Network Error'));

      await expect(service.getSpeciesCompositionById(1)).rejects.toThrow('Network Error');
    });

    it('should handle API 404 error', async () => {
      (service as any).doRequest = vi.fn().mockRejectedValue(new Error('Not Found'));

      await expect(service.getSpeciesCompositionById(999)).rejects.toThrow('Not Found');
    });
  });
});
