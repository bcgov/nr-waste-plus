/**
 * Unit tests for {@link module:config/pwa/middleware}.
 *
 * Converted from the legacy axios-interceptor (`ApiMiddleware`) test suite
 * to the Koa-style pipeline `Middleware` signature: middlewares are now
 * exercised as `(ctx, next)` functions.
 *
 * @module config/pwa/middleware.unit.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import * as idbConfig from '@/config/pwa/idb/config';
import { onlineStatusStore } from '@/hooks/useOfflineMode/onlineStatusStore';

import { offlineDataMiddleware, offlineMutationMiddleware } from './middleware';
import * as utils from './utils';

import type { RequestContext, ResponseContext } from '@/http/types';

// ── Helpers ─────────────────────────────────────────────────────────

const makeCtx = (overrides: Partial<RequestContext['config']> = {}): RequestContext => ({
  config: { url: '/api/test', method: 'GET', ...overrides },
  meta: {},
});

const makeRes = (data: unknown, overrides: Partial<ResponseContext> = {}): ResponseContext => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  meta: {},
  config: { url: '/api/test', method: 'GET' },
  ...overrides,
});

const nextResolving = (res: ResponseContext) =>
  vi.fn<() => Promise<ResponseContext>>().mockResolvedValue(res);

const nextRejecting = (error: unknown) =>
  vi.fn<() => Promise<ResponseContext>>().mockRejectedValue(error);

// ── Suites ──────────────────────────────────────────────────────────

describe('offlineDataMiddleware', () => {
  const key = '/api/test';
  const data = { foo: 'bar' };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('saves response and registers sync when idbSave is true', async () => {
    vi.spyOn(idbConfig, 'addOfflineItem').mockResolvedValue();
    vi.spyOn(utils, 'registerPeriodicSync').mockResolvedValue(true);
    const mw = offlineDataMiddleware({ idbSave: true, idbKey: key });

    const res = await mw(makeCtx(), nextResolving(makeRes(data)));

    expect(res.data).toEqual(data);
    expect(idbConfig.addOfflineItem).toHaveBeenCalledWith(key, data);
    expect(utils.registerPeriodicSync).toHaveBeenCalledWith(key, 30 * 1000);
  });

  it('does not save response if idbSave is false', async () => {
    const addSpy = vi.spyOn(idbConfig, 'addOfflineItem');
    const mw = offlineDataMiddleware();

    await mw(makeCtx(), nextResolving(makeRes(data)));

    expect(addSpy).not.toHaveBeenCalled();
  });

  it('returns cached data on failure if offline and idbSave is true', async () => {
    vi.spyOn(onlineStatusStore, 'getStatus').mockReturnValue(false);
    vi.spyOn(idbConfig, 'getOfflineItem').mockResolvedValue(data);
    const mw = offlineDataMiddleware({ idbSave: true, idbKey: key });
    const error = new Error('network down');

    const result = await mw(makeCtx(), nextRejecting(error));

    expect(result.status).toBe(200);
    expect(result.data).toEqual(data);
    expect(result.headers['x-offline-cache']).toBe('true');
  });

  it('rejects error on failure if online or idbSave is false', async () => {
    vi.spyOn(onlineStatusStore, 'getStatus').mockReturnValue(true);
    const error = new Error('network down');
    const mw = offlineDataMiddleware({ idbSave: true, idbKey: key });
    await expect(mw(makeCtx(), nextRejecting(error))).rejects.toBe(error);

    const mw2 = offlineDataMiddleware();
    await expect(mw2(makeCtx(), nextRejecting(error))).rejects.toBe(error);
  });
});

describe('offlineMutationMiddleware', () => {
  const key = '/api/mutate';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('queues mutation if offline and idbSave is true', async () => {
    vi.spyOn(onlineStatusStore, 'getStatus').mockReturnValue(false);
    const addMutation = vi.spyOn(idbConfig, 'addMutation').mockResolvedValue();
    const mw = offlineMutationMiddleware({ idbSave: true });

    await mw(
      makeCtx({ url: key, method: 'POST', data: { foo: 'bar' }, headers: {} }),
      nextResolving(makeRes(null)),
    );

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

    await mw(makeCtx({ url: key, method: 'POST' }), nextResolving(makeRes(null)));
    expect(addMutation).not.toHaveBeenCalled();

    // Offline, but idbSave not enabled → still no queueing
    vi.spyOn(onlineStatusStore, 'getStatus').mockReturnValue(false);
    const mw2 = offlineMutationMiddleware();
    await mw2(makeCtx({ url: key, method: 'POST' }), nextResolving(makeRes(null)));
    expect(addMutation).not.toHaveBeenCalled();
  });

  it('returns 204 response on failure if offline and idbSave is true', async () => {
    vi.spyOn(onlineStatusStore, 'getStatus').mockReturnValue(false);
    // The merged (ctx, next) middleware also runs the request-phase queuing
    // before next(); spy it away so the failure path is what's under test
    // (jsdom has no indexedDB).
    vi.spyOn(idbConfig, 'addMutation').mockResolvedValue();
    const mw = offlineMutationMiddleware({ idbSave: true });
    const error = new Error('network down');

    const result = await mw(makeCtx({ url: key, method: 'POST' }), nextRejecting(error));

    expect(result.status).toBe(204);
    expect(result.statusText).toMatch(/offline mutation queued/);
  });

  it('rejects error on failure if online or idbSave is false', async () => {
    vi.spyOn(onlineStatusStore, 'getStatus').mockReturnValue(true);
    const error = new Error('network down');
    const mw = offlineMutationMiddleware({ idbSave: true });
    await expect(mw(makeCtx({ url: key, method: 'POST' }), nextRejecting(error))).rejects.toBe(
      error,
    );

    const mw2 = offlineMutationMiddleware();
    await expect(mw2(makeCtx({ url: key, method: 'POST' }), nextRejecting(error))).rejects.toBe(
      error,
    );
  });
});
