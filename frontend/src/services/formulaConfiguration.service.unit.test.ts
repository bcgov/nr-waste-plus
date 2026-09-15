import { describe, expect, it, vi, beforeEach } from 'vitest';

import { FormulaConfigurationService } from './formulaConfiguration.service';

import type {
  FormulaSetRequest,
  FormulaSetResponse,
  FormulaSetListResponse,
  FormulaSetEffectiveParams,
  CurrentFormulaSetParams,
  FormulaVariablesResponse,
  FormulaVariablesParams,
} from './formulaConfiguration.types';
import type { APIConfig } from '@/config/api/types';
import type { PageableRequest } from '@/services/types';

describe('FormulaConfigurationService', () => {
  let service: FormulaConfigurationService;
  let mockDoRequest: ReturnType<typeof vi.fn>;
  const mockConfig: APIConfig = {
    BASE: 'http://localhost:8080',
    VERSION: '0',
    WITH_CREDENTIALS: true,
    CREDENTIALS: 'include',
    MIDDLEWARE: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Create service instance and mock its doRequest method
    service = new FormulaConfigurationService(mockConfig);
    mockDoRequest = vi.fn();
    // @ts-expect-error - accessing private method for testing
    service.doRequest = mockDoRequest;
  });

  describe('getFormulaSets', () => {
    it('should call doRequest with correct parameters for list', async () => {
      const mockResponse: FormulaSetListResponse = {
        content: [],
        page: { number: 0, size: 20, totalElements: 0, totalPages: 0 },
      };
      mockDoRequest.mockResolvedValue(mockResponse);

      const pageable: PageableRequest<FormulaSetResponse> = {
        page: 0,
        size: 20,
        sort: ['startDate,DESC'],
      };
      const result = await service.getFormulaSets(pageable);

      expect(mockDoRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'GET',
        url: '/api/configuration/formulas',
        query: { size: 20, sort: ['startDate,DESC'] },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle empty pageable params', async () => {
      const mockResponse: FormulaSetListResponse = {
        content: [],
        page: { number: 0, size: 20, totalElements: 0, totalPages: 0 },
      };
      mockDoRequest.mockResolvedValue(mockResponse);

      const pageable: PageableRequest<FormulaSetResponse> = { page: 0, size: 20 };
      await service.getFormulaSets(pageable);

      expect(mockDoRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'GET',
        url: '/api/configuration/formulas',
        query: { size: 20 },
      });
    });

    it('should pass through meta when provided', async () => {
      const mockResponse: FormulaSetListResponse = {
        content: [],
        page: { number: 0, size: 20, totalElements: 0, totalPages: 0 },
      };
      mockDoRequest.mockResolvedValue(mockResponse);

      const pageable: PageableRequest<FormulaSetResponse> = {
        page: 0,
        size: 20,
        sort: ['startDate,DESC'],
      };
      await service.getFormulaSets(pageable, { raw: true });

      expect(mockDoRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'GET',
        url: '/api/configuration/formulas',
        query: { size: 20, sort: ['startDate,DESC'] },
        meta: { raw: true },
      });
    });
  });

  describe('getEffectiveFormulaSet', () => {
    it('should call doRequest with correct URL for effective lookup', async () => {
      const mockResponse: FormulaSetResponse = {
        id: 1,
        area: 'INTERIOR',
        startDate: '2026-06-01',
        endDate: null,
        deleted: false,
        formulas: [],
        createdAt: '2026-05-15T14:23:00Z',
        updatedAt: '2026-06-01T10:00:00Z',
      };
      mockDoRequest.mockResolvedValue(mockResponse);

      const params: FormulaSetEffectiveParams = { date: '2026-11-03', area: 'INTERIOR' };
      const result = await service.getEffectiveFormulaSet(params);

      expect(mockDoRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'GET',
        url: '/api/configuration/formulas/2026-11-03/INTERIOR',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createFormulaSet', () => {
    it('should call doRequest with POST and body', async () => {
      const mockResponse: FormulaSetResponse = {
        id: 10,
        area: 'INTERIOR',
        startDate: '2026-09-11',
        endDate: null,
        deleted: false,
        formulas: [],
        createdAt: '2026-09-10T10:00:00Z',
        updatedAt: '2026-09-10T10:00:00Z',
      };
      mockDoRequest.mockResolvedValue(mockResponse);

      const dto: FormulaSetRequest = {
        area: 'INTERIOR',
        startDate: '2026-09-11',
        endDate: null,
        formulas: [],
      };
      const result = await service.createFormulaSet(dto);

      expect(mockDoRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'POST',
        url: '/api/configuration/formulas',
        body: dto,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getFormulaSet', () => {
    it('should call doRequest with GET and the correct URL for the id', async () => {
      const mockResponse: FormulaSetResponse = {
        id: 5,
        area: 'INTERIOR',
        startDate: '2026-06-01',
        endDate: null,
        deleted: false,
        formulas: [],
        createdAt: '2026-05-15T14:23:00Z',
        updatedAt: '2026-06-01T10:00:00Z',
      };
      mockDoRequest.mockResolvedValue(mockResponse);

      const result = await service.getFormulaSet(5);

      expect(mockDoRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'GET',
        url: '/api/configuration/formulas/5',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should include meta when provided', async () => {
      const mockResponse: FormulaSetResponse = {
        id: 5,
        area: 'INTERIOR',
        startDate: '2026-06-01',
        endDate: null,
        deleted: false,
        formulas: [],
        createdAt: '2026-05-15T14:23:00Z',
        updatedAt: '2026-06-01T10:00:00Z',
      };
      mockDoRequest.mockResolvedValue(mockResponse);

      await service.getFormulaSet(5, { raw: true });

      expect(mockDoRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'GET',
        url: '/api/configuration/formulas/5',
        meta: { raw: true },
      });
    });
  });

  describe('getCurrentOpenEndedFormulaSet', () => {
    it('should call doRequest with the selected area', async () => {
      const mockResponse: FormulaSetResponse = {
        id: 12,
        area: 'INTERIOR',
        startDate: '2026-06-01',
        endDate: null,
        deleted: false,
        formulas: [],
        createdAt: '2026-05-15T14:23:00Z',
        updatedAt: '2026-06-01T10:00:00Z',
      };
      mockDoRequest.mockResolvedValue(mockResponse);

      const params: CurrentFormulaSetParams = { area: 'INTERIOR' };
      const result = await service.getCurrentOpenEndedFormulaSet(params);

      expect(mockDoRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'GET',
        url: '/api/configuration/formulas/current/INTERIOR',
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateFormulaSet', () => {
    it('should call doRequest with PUT and correct ID', async () => {
      const mockResponse: FormulaSetResponse = {
        id: 5,
        area: 'INTERIOR',
        startDate: '2026-09-11',
        endDate: null,
        deleted: false,
        formulas: [],
        createdAt: '2026-09-10T10:00:00Z',
        updatedAt: '2026-09-10T10:00:00Z',
      };
      mockDoRequest.mockResolvedValue(mockResponse);

      const dto: FormulaSetRequest = {
        area: 'INTERIOR',
        startDate: '2026-09-11',
        endDate: null,
        formulas: [],
      };
      const result = await service.updateFormulaSet(5, dto);

      expect(mockDoRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'PUT',
        url: '/api/configuration/formulas/5',
        body: dto,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteFormulaSet', () => {
    it('should call doRequest with DELETE and correct ID', async () => {
      mockDoRequest.mockResolvedValue(undefined);

      await service.deleteFormulaSet(5);

      expect(mockDoRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'DELETE',
        url: '/api/configuration/formulas/5',
      });
    });
  });

  describe('getVariables', () => {
    it('should call doRequest with correct query parameters', async () => {
      const mockResponse: FormulaVariablesResponse = {
        effectiveDate: '2026-11-03',
        area: 'INTERIOR',
        namespaces: {},
        flat: { 'da.mature.avoidableGradeY': 11.53 },
        schema: {},
        catalog: [],
      };
      mockDoRequest.mockResolvedValue(mockResponse);

      const params: FormulaVariablesParams = { date: '2026-11-03', area: 'INTERIOR' };
      const result = await service.getVariables(params);

      expect(mockDoRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'GET',
        url: '/api/configuration/formulas/variables',
        query: { date: '2026-11-03', area: 'INTERIOR' },
      });
      expect(result).toEqual(mockResponse);
    });
  });
});
