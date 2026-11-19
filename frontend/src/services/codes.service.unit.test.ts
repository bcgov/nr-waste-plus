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
    });
    expect(result).toEqual(mockData);
  });

  it('getSamplingOptions should include meta when provided', async () => {
    const meta = { notificationTarget: 'waste-search' };
    (service as any).doRequest = vi.fn().mockResolvedValue([]);
    await service.getSamplingOptions(meta);
    expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
      method: 'GET',
      url: '/api/codes/samplings',
      meta,
    });
  });

  it('getDistricts should call API and return districts', async () => {
    const mockData = [{ code: 'B', description: 'Bravo' }];
    (service as any).doRequest = vi.fn().mockResolvedValue(mockData);
    const result = await service.getDistricts();
    expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
      method: 'GET',
      url: '/api/codes/districts',
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
    });
    expect(result).toEqual(mockData);
  });

  it('getAssessAreaStatuses should include meta when provided', async () => {
    const meta = { notificationTarget: 'waste-search' };
    (service as any).doRequest = vi.fn().mockResolvedValue([]);
    await service.getAssessAreaStatuses(meta);
    expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
      method: 'GET',
      url: '/api/codes/assess-area-statuses',
      meta,
    });
  });

  it('includes meta only when provided', async () => {
    const meta = { notificationTarget: 'waste-search' };
    (service as any).doRequest = vi.fn().mockResolvedValue([]);

    await service.getDistricts(meta);

    expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
      method: 'GET',
      url: '/api/codes/districts',
      meta,
    });
  });

  it('getHarvestStatusCodes should call API and return harvest statuses', async () => {
    const mockData = [{ code: 'COM', description: 'Complete' }];
    (service as any).doRequest = vi.fn().mockResolvedValue(mockData);

    const result = await service.getHarvestStatusCodes();

    expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
      method: 'GET',
      url: '/api/codes/harvest-statuses',
    });
    expect(result).toEqual(mockData);
  });

  it('getHarvestStatusCodes should include context query params and meta when provided', async () => {
    const meta = { notificationTarget: 'reporting-unit-block-details' };
    (service as any).doRequest = vi.fn().mockResolvedValue([]);

    await service.getHarvestStatusCodes({ reportingUnitId: 468, blockId: 12 }, meta);

    expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
      method: 'GET',
      url: '/api/codes/harvest-statuses',
      query: { reportingUnitId: 468, blockId: 12 },
      meta,
    });
  });

  it('getHarvestStatusCodes should include only provided context params', async () => {
    (service as any).doRequest = vi.fn().mockResolvedValue([]);

    await service.getHarvestStatusCodes({ blockId: 12 });

    expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
      method: 'GET',
      url: '/api/codes/harvest-statuses',
      query: { blockId: 12 },
    });
  });

  it('getMaturityTypeCodes should call API and return maturity types', async () => {
    const mockData = [{ code: 'IM', description: 'Immature' }];
    (service as any).doRequest = vi.fn().mockResolvedValue(mockData);

    const result = await service.getMaturityTypeCodes();

    expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
      method: 'GET',
      url: '/api/codes/maturity-types',
    });
    expect(result).toEqual(mockData);
  });

  it('getMaturityTypeCodes should include meta when provided', async () => {
    const meta = { notificationTarget: 'reporting-unit-block-details' };
    (service as any).doRequest = vi.fn().mockResolvedValue([]);

    await service.getMaturityTypeCodes(meta);

    expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
      method: 'GET',
      url: '/api/codes/maturity-types',
      meta,
    });
  });

  it('getDistrictAverageCriteriaCodes should call API and return district average criteria codes', async () => {
    const mockData = [{ code: '1', description: 'Criterion 1', areas: [] }];
    (service as any).doRequest = vi.fn().mockResolvedValue(mockData);

    const result = await service.getDistrictAverageCriteriaCodes();

    expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
      method: 'GET',
      url: '/api/codes/district-average-criteria',
    });
    expect(result).toEqual(mockData);
  });

  it('getDistrictAverageCriteriaCodes should include meta when provided', async () => {
    const meta = { notificationTarget: 'reporting-unit-block-details' };
    (service as any).doRequest = vi.fn().mockResolvedValue([]);

    await service.getDistrictAverageCriteriaCodes(meta);

    expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
      method: 'GET',
      url: '/api/codes/district-average-criteria',
      meta,
    });
  });
});
