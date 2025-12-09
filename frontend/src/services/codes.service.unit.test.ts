/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { CodesService } from './codes.service';

const mockConfig = { baseURL: 'http://localhost' };
let service: CodesService;

beforeEach(() => {
  service = new CodesService(mockConfig as any);
});

describe('CodesService', () => {
  it('getSamplingOptions should call API and return sampling options', async () => {
    const mockData = [{ code: 'A', description: 'Alpha' }];
    (service as any).doRequest = vi.fn().mockResolvedValue(mockData);
    const result = await service.getSamplingOptions();
    expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
      method: 'GET',
      url: '/api/codes/samplings',
      middleware: [expect.objectContaining({ failure: expect.any(Function) })],
    });
    expect(result).toEqual(mockData);
  });

  it('getDistricts should call API and return districts', async () => {
    const mockData = [{ code: 'B', description: 'Bravo' }];
    (service as any).doRequest = vi.fn().mockResolvedValue(mockData);
    const result = await service.getDistricts();
    expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
      method: 'GET',
      url: '/api/codes/districts',
      middleware: [expect.objectContaining({ failure: expect.any(Function) })],
    });
    expect(result).toEqual(mockData);
  });

  it('getAssessAreaStatuses should call API and return assess area statuses', async () => {
    const mockData = [{ code: 'C', description: 'Charlie' }];
    (service as any).doRequest = vi.fn().mockResolvedValue(mockData);
    const result = await service.getAssessAreaStatuses();
    expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
      method: 'GET',
      url: '/api/codes/assess-area-statuses',
      middleware: [expect.objectContaining({ failure: expect.any(Function) })],
    });
    expect(result).toEqual(mockData);
  });
});
