import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReportingUnitService } from './reportingunit.service';

import type { APIConfig } from '@/config/api/types';

const config: APIConfig = {
  BASE: 'https://backend.example.test',
  VERSION: '1',
  WITH_CREDENTIALS: true,
  CREDENTIALS: 'include',
};

describe('ReportingUnitService block endpoints', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shouldRequestBlocksForReportingUnitAndForwardMetadata', async () => {
    const service = new ReportingUnitService(config);
    const response = {
      content: [],
      page: { number: 0, size: 10, totalElements: 0, totalPages: 0 },
    };
    const doRequest = vi.fn().mockReturnValue(Promise.resolve(response));
    Object.defineProperty(service, 'doRequest', { value: doRequest });
    const meta = { notificationTarget: 'ru-details' };

    await expect(service.getBlocks(468, meta)).resolves.toBe(response);

    expect(doRequest).toHaveBeenCalledWith(config, {
      method: 'GET',
      url: '/api/reporting-units/468/blocks',
      meta,
    });
  });

  it('shouldOmitMetadataWhenNoRequestMetadataIsProvided', async () => {
    const service = new ReportingUnitService(config);
    const doRequest = vi.fn().mockResolvedValue({});
    Object.defineProperty(service, 'doRequest', { value: doRequest });

    await service.getBlocks(469);

    expect(doRequest).toHaveBeenCalledWith(config, {
      method: 'GET',
      url: '/api/reporting-units/469/blocks',
    });
  });

  it('shouldResolveTheCurrentStubbedCreateShapeWithoutCallingHttp', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-07T12:30:00.000Z'));
    const service = new ReportingUnitService(config);
    const doRequest = vi.fn();
    Object.defineProperty(service, 'doRequest', { value: doRequest });
    const promise = service.createBlock(468, { blockType: 'DISTRICT_AVERAGE' });

    const expectedId = Date.now();
    await vi.advanceTimersByTimeAsync(299);
    expect(doRequest).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    await expect(promise).resolves.toEqual({
      id: expectedId,
      reportingUnitId: 468,
      blockType: 'DISTRICT_AVERAGE',
      state: 'DRAFT',
      version: 0,
      createdAt: '2026-10-07T12:30:00.000Z',
      updatedAt: '2026-10-07T12:30:00.000Z',
    });
    expect(doRequest).not.toHaveBeenCalled();
  });

  it('shouldCancelTheStubbedCreateTimer', async () => {
    vi.useFakeTimers();
    const service = new ReportingUnitService(config);
    const promise = service.createBlock(468, { blockType: 'DISTRICT_AVERAGE' });
    const settledPromise = promise.catch((error: unknown) => error);
    promise.cancel();
    await vi.advanceTimersByTimeAsync(300);

    await expect(settledPromise).resolves.toMatchObject({ name: 'CancelError' });
    expect(promise.isCancelled).toBe(true);
  });
});
