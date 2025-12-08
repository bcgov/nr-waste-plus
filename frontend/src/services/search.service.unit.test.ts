/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SearchService } from './search.service';

const mockConfig = { baseURL: 'http://localhost' };
let service: SearchService;

beforeEach(() => {
  service = new SearchService(mockConfig as any);
});

describe('SearchService', () => {
  it('searchReportingUnit should call API and return results', async () => {
    const filters = { mainSearchTerm: 'Unit1', status: [''] };
    const pageable = { page: 1, size: 10 };
    const mockData = {
      content: [{ ruNumber: 1, blockId: 'Unit1' }],
      page: { number: 1, size: 10, totalElements: 1, totalPages: 1 },
    };
    (service as any).doRequest = vi.fn().mockResolvedValue(mockData);
    const result = await service.searchReportingUnit(filters, pageable);
    expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
      method: 'GET',
      url: '/api/search/reporting-units',
      query: { mainSearchTerm: 'Unit1', page: 1, size: 10 },
      middleware: [expect.objectContaining({ failure: expect.any(Function) })],
    });
    expect(result).toEqual(mockData);
  });

  it('searchReportingUnitUsers should list users', async () => {
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
  });

  it('searchReportingUnitUsers should return empty', async () => {
    const userId = 'testUser';
    const mockData: string[] = [];
    (service as any).doRequest = vi.fn().mockResolvedValue(mockData);
    const result = await service.searchReportingUnitUsers(userId);
    expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
      method: 'GET',
      url: '/api/search/reporting-units-users',
      query: { userId },
      middleware: [expect.objectContaining({ failure: expect.any(Function) })],
    });
    expect(result).toEqual(mockData);
  });
});
