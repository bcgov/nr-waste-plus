/**
 * Unit tests for {@link module:http/middlewares/retry}.
 *
 * Uses fake timers to avoid real waits in back-off tests.
 *
 * @module http/middlewares/retry.unit.test
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { AbortError, HttpError, NetworkError } from '../types';

import { createRetryMiddleware } from './retry';

import type { Middleware, RequestContext, ResponseContext } from '../types';

// ── Helpers ─────────────────────────────────────────────────────────

const freshCtx = (meta: Record<string, unknown> = {}): RequestContext => ({
  config: { url: '/api/users', method: 'GET' },
  meta,
});

const baseResponse: ResponseContext = {
  data: {},
  status: 200,
  statusText: 'OK',
  headers: {},
  meta: {},
  config: { url: '/api/users', method: 'GET' },
};

/**
 * Creates a `next` mock that fails `failCount` times then succeeds.
 */
const makeFlakyNext = (
  failCount: number,
  error: Error = new HttpError(500, 'Internal Server Error', '/api/users', null),
) => {
  let calls = 0;
  return vi.fn<() => Promise<ResponseContext>>().mockImplementation(() => {
    calls++;
    if (calls <= failCount) return Promise.reject(error);
    return Promise.resolve({ ...baseResponse, meta: { ...baseResponse.meta } });
  });
};

// ── Suite ───────────────────────────────────────────────────────────

describe('createRetryMiddleware', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Success path ─────────────────────────────────────────────────

  it('returns immediately on first success', async () => {
    const retry = createRetryMiddleware();
    const next = vi.fn<() => Promise<ResponseContext>>().mockResolvedValue(baseResponse);

    const res = await retry(freshCtx(), next);

    expect(res.status).toBe(200);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.meta.retryCount).toBeUndefined();
  });

  // ── Retryable errors ────────────────────────────────────────────

  it('retries on 5xx HttpError and eventually succeeds', async () => {
    const retry = createRetryMiddleware();
    const next = makeFlakyNext(2);

    const promise = retry(freshCtx({ maxRetries: 3, retryDelayMs: 10 }), next);

    // Advance timers for each retry delay.
    await vi.advanceTimersByTimeAsync(10);
    await vi.advanceTimersByTimeAsync(20);

    const res = await promise;

    expect(res.status).toBe(200);
    expect(next).toHaveBeenCalledTimes(3);
    expect(res.meta.retryCount).toBe(2);
  });

  it('retries on NetworkError and eventually succeeds', async () => {
    const retry = createRetryMiddleware();
    const next = makeFlakyNext(1, new NetworkError('Network Error'));

    const promise = retry(freshCtx({ maxRetries: 3, retryDelayMs: 10 }), next);

    await vi.advanceTimersByTimeAsync(10);

    const res = await promise;

    expect(res.status).toBe(200);
    expect(next).toHaveBeenCalledTimes(2);
    expect(res.meta.retryCount).toBe(1);
  });

  // ── Non-retryable errors ────────────────────────────────────────

  it('does NOT retry on 4xx HttpError', async () => {
    const retry = createRetryMiddleware();
    const next = makeFlakyNext(1, new HttpError(403, 'Forbidden', '/api/users', null));

    await expect(retry(freshCtx({ maxRetries: 3 }), next)).rejects.toThrow(HttpError);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on AbortError', async () => {
    const retry = createRetryMiddleware();
    const next = makeFlakyNext(1, new AbortError('Request cancelled'));

    await expect(retry(freshCtx({ maxRetries: 3 }), next)).rejects.toThrow(AbortError);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on non-ApiError throws', async () => {
    const retry = createRetryMiddleware();
    const next = makeFlakyNext(1, new Error('something unexpected'));

    await expect(retry(freshCtx({ maxRetries: 3 }), next)).rejects.toThrow('something unexpected');
    expect(next).toHaveBeenCalledTimes(1);
  });

  // ── maxRetries: 0 (non-idempotent request guard) ────────────────

  it('does NOT retry at all when ctx.meta.maxRetries is 0', async () => {
    const retry = createRetryMiddleware();
    const next = makeFlakyNext(99, new HttpError(500, 'Internal Server Error', '/api/x', null));

    await expect(retry(freshCtx({ maxRetries: 0 }), next)).rejects.toThrow(HttpError);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry a NetworkError when ctx.meta.maxRetries is 0', async () => {
    const retry = createRetryMiddleware();
    const next = makeFlakyNext(99, new NetworkError('down'));

    await expect(retry(freshCtx({ maxRetries: 0 }), next)).rejects.toThrow(NetworkError);
    expect(next).toHaveBeenCalledTimes(1);
  });

  // ── Exhausted retries ───────────────────────────────────────────

  it('throws last error when retries are exhausted', async () => {
    const retry = createRetryMiddleware();
    const next = makeFlakyNext(99, new HttpError(503, 'Service Unavailable', '/api/users', null));

    const promise = retry(freshCtx({ maxRetries: 2, retryDelayMs: 10 }), next);
    // Swallow unhandled rejections from intermediate retry attempts.
    void promise.catch(() => undefined);

    await vi.advanceTimersByTimeAsync(10);
    await vi.advanceTimersByTimeAsync(20);
    await vi.advanceTimersByTimeAsync(40);

    await expect(promise).rejects.toThrow(HttpError);
    // Initial attempt + 2 retries = 3 total calls
    expect(next).toHaveBeenCalledTimes(3);
  });

  // ── Defaults ─────────────────────────────────────────────────────

  it('uses default maxRetries (3) when ctx.meta.maxRetries is not set', async () => {
    const retry = createRetryMiddleware();
    const next = makeFlakyNext(99, new NetworkError('down'));

    const promise = retry(freshCtx({ retryDelayMs: 10 }), next);
    // Swallow unhandled rejections from intermediate retry attempts.
    void promise.catch(() => undefined);

    for (let i = 0; i < 4; i++) {
      await vi.advanceTimersByTimeAsync(10 * Math.pow(2, i));
    }

    await expect(promise).rejects.toThrow(NetworkError);
    expect(next).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  });

  // ── Exponential backoff ──────────────────────────────────────────

  it('uses exponential back-off between retries', async () => {
    const retry = createRetryMiddleware();
    const callTimes: number[] = [];
    const next = vi.fn<() => Promise<ResponseContext>>().mockImplementation(() => {
      callTimes.push(Date.now());
      if (callTimes.length <= 2) return Promise.reject(new NetworkError('down'));
      return Promise.resolve({ ...baseResponse, meta: { ...baseResponse.meta } });
    });

    const promise = retry(freshCtx({ maxRetries: 3, retryDelayMs: 100 }), next);

    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(200);

    const res = await promise;
    expect(res.status).toBe(200);
    expect(next).toHaveBeenCalledTimes(3);
  });

  // ── Meta ─────────────────────────────────────────────────────────

  it('sets retryCount to 0 when no retries needed', async () => {
    const retry = createRetryMiddleware();
    const next = vi.fn<() => Promise<ResponseContext>>().mockResolvedValue(baseResponse);

    const res = await retry(freshCtx(), next);

    expect(res.meta.retryCount).toBeUndefined();
  });

  it('sets retryCount to the number of retries used', async () => {
    const retry = createRetryMiddleware();
    const next = makeFlakyNext(2);

    const promise = retry(freshCtx({ maxRetries: 3, retryDelayMs: 10 }), next);

    await vi.advanceTimersByTimeAsync(10);
    await vi.advanceTimersByTimeAsync(20);

    const res = await promise;
    expect(res.meta.retryCount).toBe(2);
  });

  // ── Type conformance ─────────────────────────────────────────────

  it('is a valid Middleware — matches the Middleware type signature', () => {
    const retry: Middleware = createRetryMiddleware();

    expect(typeof retry).toBe('function');
    expect(retry.length).toBe(2);
  });
});
