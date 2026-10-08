/**
 * Unit tests for {@link module:http/middlewares/trace}.
 *
 * @module http/middlewares/trace.unit.test
 */

import { describe, expect, it, vi } from 'vitest';

import { createTraceMiddleware } from './trace';

import type { Middleware, RequestContext, ResponseContext } from '../types';

// ── Helpers ─────────────────────────────────────────────────────────

const freshCtx = (): RequestContext => ({
  config: {
    url: '/api/users',
    method: 'GET',
  },
  meta: {},
});

const baseResponse: ResponseContext = {
  data: {},
  status: 200,
  statusText: 'OK',
  headers: {},
  meta: {},
  config: freshCtx().config,
};

const makeNext = (response: ResponseContext = baseResponse) =>
  vi.fn<() => Promise<ResponseContext>>().mockResolvedValue(response);

// ── Suite ───────────────────────────────────────────────────────────

describe('createTraceMiddleware', () => {
  // ── Header injection ─────────────────────────────────────────────

  it('injects X-B3-TraceId and X-B3-SpanId headers', async () => {
    const trace = createTraceMiddleware();
    const ctx = freshCtx();
    const next = makeNext();

    await trace(ctx, next);

    expect(ctx.config.headers?.['X-B3-TraceId']).toBeDefined();
    expect(ctx.config.headers?.['X-B3-SpanId']).toBeDefined();
  });

  it('generates a 32-hex trace ID', async () => {
    const trace = createTraceMiddleware();
    const ctx = freshCtx();
    const next = makeNext();

    await trace(ctx, next);

    const traceId = ctx.config.headers?.['X-B3-TraceId'];
    expect(traceId).toMatch(/^[0-9a-f]{32}$/);
  });

  it('generates a 16-hex span ID', async () => {
    const trace = createTraceMiddleware();
    const ctx = freshCtx();
    const next = makeNext();

    await trace(ctx, next);

    const spanId = ctx.config.headers?.['X-B3-SpanId'];
    expect(spanId).toMatch(/^[0-9a-f]{16}$/);
  });

  it('generates unique trace IDs across requests', async () => {
    const trace = createTraceMiddleware();
    const ctx1 = freshCtx();
    const ctx2 = freshCtx();
    const next = makeNext();

    await trace(ctx1, next);
    await trace(ctx2, next);

    const id1 = ctx1.config.headers?.['X-B3-TraceId'];
    const id2 = ctx2.config.headers?.['X-B3-TraceId'];
    expect(id1).not.toBe(id2);
  });

  it('generates unique span IDs across requests', async () => {
    const trace = createTraceMiddleware();
    const ctx1 = freshCtx();
    const ctx2 = freshCtx();
    const next = makeNext();

    await trace(ctx1, next);
    await trace(ctx2, next);

    const id1 = ctx1.config.headers?.['X-B3-SpanId'];
    const id2 = ctx2.config.headers?.['X-B3-SpanId'];
    expect(id1).not.toBe(id2);
  });

  // ── Trace provider ───────────────────────────────────────────────

  it('uses trace ID from traceProvider when provided', async () => {
    const provider = vi.fn<() => Promise<string | null>>().mockResolvedValue('abc123');
    const trace = createTraceMiddleware(provider);
    const ctx = freshCtx();
    const next = makeNext();

    await trace(ctx, next);

    expect(ctx.config.headers?.['X-B3-TraceId']).toBe('abc123');
  });

  it('generates a new trace ID when traceProvider returns null', async () => {
    const provider = vi.fn<() => Promise<string | null>>().mockResolvedValue(null);
    const trace = createTraceMiddleware(provider);
    const ctx = freshCtx();
    const next = makeNext();

    await trace(ctx, next);

    const traceId = ctx.config.headers?.['X-B3-TraceId'];
    expect(traceId).toMatch(/^[0-9a-f]{32}$/);
  });

  it('calls traceProvider exactly once per request', async () => {
    const provider = vi.fn<() => Promise<string | null>>().mockResolvedValue(null);
    const trace = createTraceMiddleware(provider);
    const next = makeNext();

    await trace(freshCtx(), next);
    await trace(freshCtx(), next);

    expect(provider).toHaveBeenCalledTimes(2);
  });

  // ── Response meta enrichment ─────────────────────────────────────

  it('writes traceId and spanId into res.meta', async () => {
    const provider = vi.fn<() => Promise<string | null>>().mockResolvedValue('my-trace');
    const trace = createTraceMiddleware(provider);
    const ctx = freshCtx();
    const next = makeNext();

    const res = await trace(ctx, next);

    expect(res.meta.traceId).toBe('my-trace');
    expect(res.meta.spanId).toBeDefined();
    expect(res.meta.spanId).toMatch(/^[0-9a-f]{16}$/);
  });

  // ── Header preservation ──────────────────────────────────────────

  it('preserves existing headers when adding B3 headers', async () => {
    const trace = createTraceMiddleware();
    const next = makeNext();

    const ctx: RequestContext = {
      config: {
        ...freshCtx().config,
        headers: { Authorization: 'Bearer tok' },
      },
      meta: {},
    };

    await trace(ctx, next);

    expect(ctx.config.headers?.Authorization).toBe('Bearer tok');
    expect(ctx.config.headers?.['X-B3-TraceId']).toBeDefined();
  });

  // ── Error propagation ────────────────────────────────────────────

  it('propagates errors from traceProvider', async () => {
    const provider = vi
      .fn<() => Promise<string | null>>()
      .mockRejectedValue(new Error('trace source down'));
    const trace = createTraceMiddleware(provider);
    const next = makeNext();

    await expect(trace(freshCtx(), next)).rejects.toThrow('trace source down');
    expect(next).not.toHaveBeenCalled();
  });

  it('propagates errors from next()', async () => {
    const trace = createTraceMiddleware();
    const next = vi.fn<() => Promise<ResponseContext>>().mockRejectedValue(new Error('network'));

    await expect(trace(freshCtx(), next)).rejects.toThrow('network');
  });

  // ── Type conformance ─────────────────────────────────────────────

  it('is a valid Middleware — matches the Middleware type signature', () => {
    const trace: Middleware = createTraceMiddleware();

    expect(typeof trace).toBe('function');
    expect(trace.length).toBe(2);
  });
});
