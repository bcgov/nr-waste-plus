/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ForestClientService } from './forestclient.service';

const mockConfig = { baseURL: 'http://localhost' };
let service: ForestClientService;

beforeEach(() => {
  service = new ForestClientService(mockConfig as any);
});

describe('ForestClientService', () => {
  it('getForestClient should call API and return forest client', async () => {
    const mockData = { clientNumber: '123', name: 'Test Client' };
    (service as any).doRequest = vi.fn().mockResolvedValue(mockData);
    const result = await service.getForestClient('123');
    expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
      method: 'GET',
      url: '/api/forest-clients/{clientNumber}',
      path: { clientNumber: '123' },
    });
    expect(result).toEqual(mockData);
  });

  it('getForestClientLocations should call API and return locations', async () => {
    const mockData = [{ code: 'A', description: 'Location A' }];
    (service as any).doRequest = vi.fn().mockResolvedValue(mockData);
    const result = await service.getForestClientLocations('456');
    expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
      method: 'GET',
      url: '/api/forest-clients/{clientNumber}/locations',
      path: { clientNumber: '456' },
    });
    expect(result).toEqual(mockData);
  });

  it('searchForestClients should call API and return autocomplete results', async () => {
    const mockData = [{ clientNumber: '789', name: 'Client789' }];
    (service as any).doRequest = vi.fn().mockResolvedValue(mockData);
    const result = await service.searchForestClients('search', 2, 5);
    expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
      method: 'GET',
      url: '/api/forest-clients/byNameAcronymNumber',
      query: { page: 2, size: 5, value: 'search' },
    });
    expect(result).toEqual(mockData);
  });

  it('search by numbers to load data', async () => {
    const mockData = [{ clientNumber: '789', name: 'Client789' }];
    (service as any).doRequest = vi.fn().mockResolvedValue(mockData);
    const result = await service.searchByClientNumbers(['789']);
    expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
      method: 'GET',
      url: '/api/forest-clients/searchByNumbers',
      query: { page: 0, size: 10, values: ['789'] },
    });
    expect(result).toEqual(mockData);
  });
});
