/**
 * Unit tests for {@link module:http/middlewares/auth}.
 *
 * @module http/middlewares/auth.unit.test
 */

import { describe, expect, it, vi } from 'vitest';

import { createAuthMiddleware } from './auth';

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

describe('createAuthMiddleware', () => {
  it('injects Authorization header when tokenProvider returns a token', async () => {
    const tokenProvider = vi.fn<() => Promise<string | null>>().mockResolvedValue('test-token');
    const auth = createAuthMiddleware(tokenProvider);
    const ctx = freshCtx();
    const next = makeNext();

    await auth(ctx, next);

    expect(ctx.config.headers?.Authorization).toBe('Bearer test-token');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('preserves existing headers when adding Authorization', async () => {
    const tokenProvider = vi.fn<() => Promise<string | null>>().mockResolvedValue('abc123');
    const auth = createAuthMiddleware(tokenProvider);
    const next = makeNext();

    const ctx: RequestContext = {
      config: {
        ...freshCtx().config,
        headers: { 'X-Custom': 'value' },
      },
      meta: {},
    };

    await auth(ctx, next);

    expect(ctx.config.headers?.Authorization).toBe('Bearer abc123');
    expect(ctx.config.headers?.['X-Custom']).toBe('value');
  });

  it('overwrites a previous Authorization header', async () => {
    const tokenProvider = vi.fn<() => Promise<string | null>>().mockResolvedValue('new-token');
    const auth = createAuthMiddleware(tokenProvider);
    const next = makeNext();

    const ctx: RequestContext = {
      config: {
        ...freshCtx().config,
        headers: { Authorization: 'Bearer old-token' },
      },
      meta: {},
    };

    await auth(ctx, next);

    expect(ctx.config.headers?.Authorization).toBe('Bearer new-token');
  });

  it('does NOT set Authorization when tokenProvider returns null', async () => {
    const tokenProvider = vi.fn<() => Promise<string | null>>().mockResolvedValue(null);
    const auth = createAuthMiddleware(tokenProvider);
    const next = makeNext();

    const ctx: RequestContext = {
      config: {
        ...freshCtx().config,
        headers: { 'X-Custom': 'value' },
      },
      meta: {},
    };

    await auth(ctx, next);

    expect(ctx.config.headers?.Authorization).toBeUndefined();
    expect(ctx.config.headers?.['X-Custom']).toBe('value');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('does NOT set Authorization when tokenProvider returns empty string', async () => {
    const tokenProvider = vi.fn<() => Promise<string | null>>().mockResolvedValue('');
    const auth = createAuthMiddleware(tokenProvider);
    const ctx = freshCtx();
    const next = makeNext();

    await auth(ctx, next);

    expect(ctx.config.headers?.Authorization).toBeUndefined();
  });

  it('does NOT set headers key at all when no token and no prior headers', async () => {
    const tokenProvider = vi.fn<() => Promise<string | null>>().mockResolvedValue(null);
    const auth = createAuthMiddleware(tokenProvider);
    const ctx = freshCtx();
    const next = makeNext();

    await auth(ctx, next);

    expect(ctx.config.headers).toBeUndefined();
  });

  it('calls tokenProvider exactly once per request', async () => {
    const tokenProvider = vi.fn<() => Promise<string | null>>().mockResolvedValue('tok');
    const auth = createAuthMiddleware(tokenProvider);
    const next = makeNext();

    await auth(freshCtx(), next);
    await auth(freshCtx(), next);

    expect(tokenProvider).toHaveBeenCalledTimes(2);
  });

  it('returns the response from next()', async () => {
    const tokenProvider = vi.fn<() => Promise<string | null>>().mockResolvedValue('tok');
    const auth = createAuthMiddleware(tokenProvider);
    const response: ResponseContext = {
      ...baseResponse,
      status: 201,
      statusText: 'Created',
      data: { id: 42 },
    };
    const next = makeNext(response);

    const result = await auth(freshCtx(), next);

    expect(result).toBe(response);
  });

  it('propagates errors from tokenProvider', async () => {
    const tokenProvider = vi
      .fn<() => Promise<string | null>>()
      .mockRejectedValue(new Error('auth session unavailable'));
    const auth = createAuthMiddleware(tokenProvider);
    const next = makeNext();

    await expect(auth(freshCtx(), next)).rejects.toThrow('auth session unavailable');
    expect(next).not.toHaveBeenCalled();
  });

  it('propagates errors from next()', async () => {
    const tokenProvider = vi.fn<() => Promise<string | null>>().mockResolvedValue('tok');
    const auth = createAuthMiddleware(tokenProvider);
    const next = vi.fn<() => Promise<ResponseContext>>().mockRejectedValue(new Error('network'));

    await expect(auth(freshCtx(), next)).rejects.toThrow('network');
  });

  it('is a valid Middleware — matches the Middleware type signature', () => {
    const tokenProvider = vi.fn<() => Promise<string | null>>().mockResolvedValue('tok');
    const auth: Middleware = createAuthMiddleware(tokenProvider);

    expect(typeof auth).toBe('function');
    expect(auth.length).toBe(2);
  });
});
