/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SearchService } from './search.service';
import type {
  ReportingUnitSearchParametersDto,
  ReportingUnitSearchResultDto,
  ReportingUnitSearchExpandedDto,
} from './types';
import type { PageableRequest } from './types';

const mockConfig = { baseURL: 'http://localhost' };
let service: SearchService;

beforeEach(() => {
  service = new SearchService(mockConfig as any);
  vi.clearAllMocks();
});

describe('SearchService', () => {
  describe('searchReportingUnit', () => {
    it('should call API with correct parameters and return paginated results', async () => {
      const filters: ReportingUnitSearchParametersDto = {
        mainSearchTerm: 'Unit1',
        status: ['ACTIVE'],
      };
      const pageable: PageableRequest<ReportingUnitSearchResultDto> = {
        page: 1,
        size: 10,
      };
      const mockData = {
        content: [
          {
            ruNumber: 1,
            blockId: 1,
            cutBlockId: 'CB-001',
            client: { code: 'CLI01', description: 'Client One' },
            licenseNumber: 'LIC-001',
            cuttingPermit: 'CP-001',
            timberMark: 'TM-001',
            multiMark: false,
            sampling: { code: 'SAM01', description: 'Sampling Method 1' },
            district: { code: 'DIST01', description: 'District One' },
            status: { code: 'ACTIVE', description: 'Active' },
            lastUpdated: '2024-01-15T10:00:00Z',
          },
        ],
        page: { number: 1, size: 10, totalElements: 1, totalPages: 1 },
      };
      (service as any).doRequest = vi.fn().mockResolvedValue(mockData);

      const result = await service.searchReportingUnit(filters, pageable);

      expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'GET',
        url: '/api/search/reporting-units',
        query: { mainSearchTerm: 'Unit1', status: ['ACTIVE'], page: 1, size: 10 },
        middleware: [expect.objectContaining({ failure: expect.any(Function) })],
      });
      expect(result).toEqual(mockData);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].ruNumber).toBe(1);
    });

    it('should handle multiple filter criteria', async () => {
      const filters: ReportingUnitSearchParametersDto = {
        mainSearchTerm: 'TestUnit',
        district: ['DIST01', 'DIST02'],
        sampling: ['SAM01'],
        status: ['ACTIVE', 'PENDING'],
      };
      const pageable: PageableRequest<ReportingUnitSearchResultDto> = {
        page: 1,
        size: 20,
      };
      const mockData = {
        content: [],
        page: { number: 1, size: 20, totalElements: 0, totalPages: 0 },
      };
      (service as any).doRequest = vi.fn().mockResolvedValue(mockData);

      const result = await service.searchReportingUnit(filters, pageable);

      expect((service as any).doRequest).toHaveBeenCalledWith(
        mockConfig,
        expect.objectContaining({
          method: 'GET',
          url: '/api/search/reporting-units',
          query: expect.objectContaining({
            mainSearchTerm: 'TestUnit',
            page: 1,
            size: 20,
          }),
        }),
      );
      expect(result.content).toHaveLength(0);
    });

    it('should handle empty filters', async () => {
      const filters: ReportingUnitSearchParametersDto = {};
      const pageable: PageableRequest<ReportingUnitSearchResultDto> = {
        page: 1,
        size: 50,
      };
      const mockData = {
        content: [],
        page: { number: 1, size: 50, totalElements: 0, totalPages: 0 },
      };
      (service as any).doRequest = vi.fn().mockResolvedValue(mockData);

      const result = await service.searchReportingUnit(filters, pageable);

      expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'GET',
        url: '/api/search/reporting-units',
        query: { page: 1, size: 50 },
        middleware: [expect.objectContaining({ failure: expect.any(Function) })],
      });
      expect(result.content).toEqual([]);
    });

    it('should handle pagination correctly', async () => {
      const filters: ReportingUnitSearchParametersDto = {};
      const pageable: PageableRequest<ReportingUnitSearchResultDto> = {
        page: 5,
        size: 25,
      };
      (service as any).doRequest = vi.fn().mockResolvedValue({
        content: [],
        page: { number: 5, size: 25, totalElements: 150, totalPages: 6 },
      });

      const result = await service.searchReportingUnit(filters, pageable);

      expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'GET',
        url: '/api/search/reporting-units',
        query: { page: 5, size: 25 },
        middleware: [expect.objectContaining({ failure: expect.any(Function) })],
      });
      expect(result.page.number).toBe(5);
      expect(result.page.totalPages).toBe(6);
    });
  });

  describe('getReportingUnitSearchExpand', () => {
    it('should call API with correct ruId and blockId parameters', async () => {
      const ruId = 123;
      const blockId = 456;
      const mockData: ReportingUnitSearchExpandedDto = {
        id: 123,
        licenseNo: 'LIC-001',
        cuttingPermit: 'CP-001',
        timberMark: 'TM-001',
        exempted: false,
        multiMark: true,
        netArea: 1000.5,
        submitter: 'IDIR\\TESTUSER',
        attachment: { code: 'ATT01', description: 'Attachment Type 1' },
        comments: 'Test comments',
        totalBlocks: 5,
      };
      (service as any).doRequest = vi.fn().mockResolvedValue(mockData);

      const result = await service.getReportingUnitSearchExpand(ruId, blockId);

      expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'GET',
        url: '/api/search/reporting-units/ex/123/456',
        middleware: [expect.objectContaining({ failure: expect.any(Function) })],
      });
      expect(result).toEqual(mockData);
      expect(result.id).toBe(123);
      expect(result.netArea).toBe(1000.5);
    });

    it('should construct correct URL with different ruId and blockId values', async () => {
      const ruId = 999;
      const blockId = 888;
      const mockData: ReportingUnitSearchExpandedDto = {
        id: 999,
        licenseNo: null,
        cuttingPermit: null,
        timberMark: null,
        exempted: true,
        multiMark: false,
        netArea: 500,
        submitter: null,
        attachment: { code: 'ATT02', description: 'Attachment Type 2' },
        comments: null,
        totalBlocks: 1,
      };
      (service as any).doRequest = vi.fn().mockResolvedValue(mockData);

      await service.getReportingUnitSearchExpand(ruId, blockId);

      expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'GET',
        url: '/api/search/reporting-units/ex/999/888',
        middleware: [expect.objectContaining({ failure: expect.any(Function) })],
      });
    });

    it('should handle expanded data with null optional fields', async () => {
      const ruId = 1;
      const blockId = 1;
      const mockData: ReportingUnitSearchExpandedDto = {
        id: 1,
        licenseNo: null,
        cuttingPermit: null,
        timberMark: null,
        exempted: false,
        multiMark: false,
        netArea: 100,
        submitter: null,
        attachment: { code: 'ATT01', description: 'Attachment' },
        comments: null,
        totalBlocks: 1,
      };
      (service as any).doRequest = vi.fn().mockResolvedValue(mockData);

      const result = await service.getReportingUnitSearchExpand(ruId, blockId);

      expect(result.licenseNo).toBeNull();
      expect(result.comments).toBeNull();
      expect(result.submitter).toBeNull();
    });
  });

  describe('searchReportingUnitUsers', () => {
    it('should call API and return array of user identifiers', async () => {
      const userId = 'testUser';
      const mockData = ['IDIR\\TESTUSER', 'BCEID\\TESTUSERNAME'];
      (service as any).doRequest = vi.fn().mockResolvedValue(mockData);

      const result = await service.searchReportingUnitUsers(userId);

      expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'GET',
        url: '/api/search/reporting-units-users',
        query: { userId },
        middleware: [expect.objectContaining({ failure: expect.any(Function) })],
      });
      expect(result).toEqual(mockData);
      expect(result).toHaveLength(2);
      expect(result).toContain('IDIR\\TESTUSER');
    });

    it('should return empty array when no users found', async () => {
      const userId = 'nonexistentUser';
      const mockData: string[] = [];
      (service as any).doRequest = vi.fn().mockResolvedValue(mockData);

      const result = await service.searchReportingUnitUsers(userId);

      expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'GET',
        url: '/api/search/reporting-units-users',
        query: { userId },
        middleware: [expect.objectContaining({ failure: expect.any(Function) })],
      });
      expect(result).toEqual([]);
    });

    it('should handle different userId formats', async () => {
      const userId = 'IDIR\\ADMINUSER';
      const mockData = ['IDIR\\ADMINUSER'];
      (service as any).doRequest = vi.fn().mockResolvedValue(mockData);

      const result = await service.searchReportingUnitUsers(userId);

      expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'GET',
        url: '/api/search/reporting-units-users',
        query: { userId: 'IDIR\\ADMINUSER' },
        middleware: [expect.objectContaining({ failure: expect.any(Function) })],
      });
      expect(result[0]).toBe('IDIR\\ADMINUSER');
    });

    it('should return multiple users when applicable', async () => {
      const userId = 'manager';
      const mockData = [
        'IDIR\\MANAGER_USER1',
        'IDIR\\MANAGER_USER2',
        'BCEID\\MANAGER_USER3',
      ];
      (service as any).doRequest = vi.fn().mockResolvedValue(mockData);

      const result = await service.searchReportingUnitUsers(userId);

      expect(result).toHaveLength(3);
      expect(result).toEqual(mockData);
    });
  });

  describe('Service Configuration', () => {
    it('should be initialized with correct config', () => {
      expect(service.config).toEqual(mockConfig);
    });

    it('should use problem details middleware for all requests', async () => {
      const filters = {};
      const pageable = { page: 0, size: 10 };

      (service as any).doRequest = vi.fn().mockResolvedValue({ content: [], page: {} });
      await service.searchReportingUnit(filters, pageable);

      const callArgs = (service as any).doRequest.mock.calls[0][1];
      expect(callArgs.middleware).toBeDefined();
      expect(callArgs.middleware[0]).toEqual(
        expect.objectContaining({ failure: expect.any(Function) }),
      );
    });
  });
});
