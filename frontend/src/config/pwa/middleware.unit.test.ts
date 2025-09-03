/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import * as idbConfig from '@/config/pwa/idb/config';
import { onlineStatusStore } from '@/hooks/useOfflineMode/onlineStatusStore';

import { offlineDataMiddleware, offlineMutationMiddleware } from './middleware';
import * as utils from './utils';

import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

describe('offlineDataMiddleware', () => {
  const key = '/api/test';
  const data = { foo: 'bar' };
  const axiosResponse: AxiosResponse<unknown, unknown> = {
    config: { url: key } as InternalAxiosRequestConfig,
    data,
  } as AxiosResponse;
  const error = { config: { url: key, headers: {} } } as AxiosError;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('saves response and registers sync when idbSave is true', async () => {
    vi.spyOn(idbConfig, 'addOfflineItem').mockResolvedValue();
    vi.spyOn(utils, 'registerPeriodicSync').mockResolvedValue(true);
    const mw = offlineDataMiddleware({ idbSave: true, idbKey: key });
    await mw.response!(axiosResponse);
    expect(idbConfig.addOfflineItem).toHaveBeenCalledWith(key, data);
    expect(utils.registerPeriodicSync).toHaveBeenCalledWith(key, 30 * 1000);
  });

  it('does not save response if idbSave is false', async () => {
    const addSpy = vi.spyOn(idbConfig, 'addOfflineItem');
    const mw = offlineDataMiddleware();
    await mw.response!(axiosResponse);
    expect(addSpy).not.toHaveBeenCalled();
  });

  it('returns cached data on failure if offline and idbSave is true', async () => {
    vi.spyOn(onlineStatusStore, 'getStatus').mockReturnValue(false);
    vi.spyOn(idbConfig, 'getOfflineItem').mockResolvedValue(data);
    const mw = offlineDataMiddleware({ idbSave: true, idbKey: key });
    const result: any = await mw.failure!(error).catch(() => undefined);
    expect(result.status).toBe(200);
    expect(result.data).toEqual(data);
    expect(result.headers['x-offline-cache']).toBe('true');
  });

  it('rejects error on failure if online or idbSave is false', async () => {
    vi.spyOn(onlineStatusStore, 'getStatus').mockReturnValue(true);
    const mw = offlineDataMiddleware({ idbSave: true, idbKey: key });
    await expect(mw.failure!(error)).rejects.toBe(error);
    const mw2 = offlineDataMiddleware();
    await expect(mw2.failure!(error)).rejects.toBe(error);
  });
});

describe('offlineMutationMiddleware', () => {
  const key = '/api/mutate';
  const config = {
    url: key,
    method: 'POST',
    data: { foo: 'bar' },
    headers: {},
  } as InternalAxiosRequestConfig;
  const error = { config } as AxiosError;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('queues mutation if offline and idbSave is true', async () => {
    vi.spyOn(onlineStatusStore, 'getStatus').mockReturnValue(false);
    const addMutation = vi.spyOn(idbConfig, 'addMutation').mockResolvedValue();
    const mw = offlineMutationMiddleware({ idbSave: true });
    await mw.request!(config);
    expect(addMutation).toHaveBeenCalledWith({
      url: key,
      method: 'POST',
      data: { foo: 'bar' },
      headers: {},
    });
  });

  it('does not queue mutation if online or idbSave is false', async () => {
    vi.spyOn(onlineStatusStore, 'getStatus').mockReturnValue(true);
    const addMutation = vi.spyOn(idbConfig, 'addMutation');
    const mw = offlineMutationMiddleware({ idbSave: true });
    await mw.request!(config);
    expect(addMutation).not.toHaveBeenCalled();
    const mw2 = offlineMutationMiddleware();
    await mw2.request!(config);
    expect(addMutation).not.toHaveBeenCalled();
  });

  it('returns 204 response on failure if offline and idbSave is true', async () => {
    vi.spyOn(onlineStatusStore, 'getStatus').mockReturnValue(false);
    const mw = offlineMutationMiddleware({ idbSave: true });
    const result: any = await mw.failure!(error).catch(() => undefined);
    expect(result.status).toBe(204);
    expect(result.statusText).toMatch(/offline mutation queued/);
  });

  it('rejects error on failure if online or idbSave is false', async () => {
    vi.spyOn(onlineStatusStore, 'getStatus').mockReturnValue(true);
    const mw = offlineMutationMiddleware({ idbSave: true });
    await expect(mw.failure!(error)).rejects.toBe(error);
    const mw2 = offlineMutationMiddleware();
    await expect(mw2.failure!(error)).rejects.toBe(error);
  });
});
