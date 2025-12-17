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
      middleware: [expect.objectContaining({ failure: expect.any(Function) })],
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
      middleware: [expect.objectContaining({ failure: expect.any(Function) })],
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
      middleware: [expect.objectContaining({ failure: expect.any(Function) })],
    });
    expect(result).toEqual(mockData);
  });

  it('search by my clients', async () => {
    const mockData = [
      {
        client: { code: '789', description: 'Client 789' },
        submissionsCount: 2,
        blocksCount: 3,
        lastUpdate: '2020-01-01',
      },
    ];
    (service as any).doRequest = vi.fn().mockResolvedValue(mockData);
    const result = await service.searchMyForestClients('client', 1, 5);
    expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
      method: 'GET',
      url: '/api/forest-clients/clients',
      query: { page: 1, size: 5, value: 'client' },
      middleware: [expect.objectContaining({ failure: expect.any(Function) })],
    });
    expect(result).toEqual(mockData);
  });
});
