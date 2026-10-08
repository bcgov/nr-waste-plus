/**
 * Unit tests for http/compose — middleware composition engine.
 *
 * @module http/compose.unit.test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { compose } from './compose';

import type { Middleware, RequestContext, ResponseContext, Transport } from './types';

// ── Helpers ────────────────────────────────────────────────────────

/** Creates a minimal RequestContext for testing. */
function makeCtx(overrides?: Partial<RequestContext>): RequestContext {
  return {
    config: { url: '/test', method: 'GET' },
    meta: {},
    ...overrides,
  };
}

/** Creates a minimal ResponseContext for testing. */
function makeRes(overrides?: Partial<ResponseContext>): ResponseContext {
  return {
    data: null,
    status: 200,
    statusText: 'OK',
    headers: {},
    meta: {},
    config: { url: '/test', method: 'GET' },
    ...overrides,
  };
}

/** A transport that returns a fixed 200 OK response. */
const okTransport: Transport = vi.fn(async (_ctx: RequestContext) => makeRes({ data: 'ok' }));

/** A transport that always throws. */
const failTransport: Transport = vi.fn(async (_ctx: RequestContext) => {
  throw new Error('transport failed');
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Compose basics ─────────────────────────────────────────────────

describe('compose', () => {
  it('calls transport directly when no middlewares are provided', async () => {
    const pipeline = compose([], okTransport);
    const ctx = makeCtx();
    const res = await pipeline(ctx);

    expect(res.data).toBe('ok');
    expect(okTransport).toHaveBeenCalledOnce();
    expect(okTransport).toHaveBeenCalledWith(ctx);
  });

  it('calls the single middleware before transport', async () => {
    const order: string[] = [];
    const mw: Middleware = async (_ctx, next) => {
      order.push('mw-before');
      const res = await next();
      order.push('mw-after');
      return res;
    };

    const pipeline = compose([mw], okTransport);
    const res = await pipeline(makeCtx());

    expect(res.data).toBe('ok');
    expect(order).toEqual(['mw-before', 'mw-after']);
    expect(okTransport).toHaveBeenCalledOnce();
  });

  it('executes middlewares in registration order', async () => {
    const order: string[] = [];

    const mw1: Middleware = async (_ctx, next) => {
      order.push('1-in');
      const res = await next();
      order.push('1-out');
      return res;
    };
    const mw2: Middleware = async (_ctx, next) => {
      order.push('2-in');
      const res = await next();
      order.push('2-out');
      return res;
    };
    const mw3: Middleware = async (_ctx, next) => {
      order.push('3-in');
      const res = await next();
      order.push('3-out');
      return res;
    };

    const pipeline = compose([mw1, mw2, mw3], okTransport);
    await pipeline(makeCtx());

    // In: 1 → 2 → 3 → transport
    // Out: transport → 3 → 2 → 1
    expect(order).toEqual(['1-in', '2-in', '3-in', '3-out', '2-out', '1-out']);
  });
});

// ── Middleware capabilities ────────────────────────────────────────

describe('middleware capabilities', () => {
  it('can modify ctx before calling next', async () => {
    const authMw: Middleware = async (ctx, next) => {
      ctx.config.headers = {
        ...ctx.config.headers,
        Authorization: 'Bearer token123',
      };
      return next();
    };

    const inspectTransport: Transport = vi.fn(async (ctx: RequestContext) => {
      expect(ctx.config.headers?.Authorization).toBe('Bearer token123');
      return makeRes();
    });

    const pipeline = compose([authMw], inspectTransport);
    await pipeline(makeCtx());

    expect(inspectTransport).toHaveBeenCalledOnce();
  });

  it('can modify response after calling next', async () => {
    const addMetaMw: Middleware = async (_ctx, next) => {
      const res = await next();
      return { ...res, meta: { ...res.meta, addedBy: 'mw' } };
    };

    const pipeline = compose([addMetaMw], okTransport);
    const res = await pipeline(makeCtx());

    expect(res.meta.addedBy).toBe('mw');
  });

  it('can short-circuit by not calling next', async () => {
    const cacheMw: Middleware = async (_ctx, _next) => makeRes({ data: 'from-cache', status: 200 });

    const pipeline = compose([cacheMw], okTransport);
    const res = await pipeline(makeCtx());

    expect(res.data).toBe('from-cache');
    expect(okTransport).not.toHaveBeenCalled();
  });

  it('short-circuit does not block earlier middlewares from running', async () => {
    let afterCalled = false;
    const beforeMw: Middleware = async (_ctx, next) => {
      const res = await next();
      afterCalled = true;
      return res;
    };
    const shortCircuitMw: Middleware = async () => makeRes({ data: 'short' });

    const pipeline = compose([beforeMw, shortCircuitMw], okTransport);
    const res = await pipeline(makeCtx());

    expect(res.data).toBe('short');
    expect(afterCalled).toBe(true);
    expect(okTransport).not.toHaveBeenCalled();
  });
});

// ── Error handling ─────────────────────────────────────────────────

describe('error handling', () => {
  it('throws if next() is called multiple times', async () => {
    const badMw: Middleware = async (_ctx, next) => {
      await next();
      await next(); // second call — illegal
      return makeRes();
    };

    const pipeline = compose([badMw], okTransport);
    await expect(pipeline(makeCtx())).rejects.toThrow('next() called multiple times');
  });

  it('propagates transport errors through middleware stack', async () => {
    const catchMw: Middleware = async (_ctx, next) => {
      try {
        return await next();
      } catch {
        return makeRes({ data: 'caught', status: 200 });
      }
    };

    const pipeline = compose([catchMw], failTransport);
    const res = await pipeline(makeCtx());

    expect(res.data).toBe('caught');
  });

  it('propagates middleware errors to caller when not caught', async () => {
    const throwMw: Middleware = async () => {
      throw new Error('mw exploded');
    };

    const pipeline = compose([throwMw], okTransport);
    await expect(pipeline(makeCtx())).rejects.toThrow('mw exploded');
  });

  it('uncaught error in middleware prevents later middlewares from running', async () => {
    const shouldNotRun: Middleware = vi.fn(
      async (_ctx: RequestContext, next: () => Promise<ResponseContext>) => next(),
    );

    const throwMw: Middleware = async () => {
      throw new Error('stop');
    };

    const pipeline = compose([throwMw, shouldNotRun], okTransport);
    await expect(pipeline(makeCtx())).rejects.toThrow('stop');
    expect(shouldNotRun).not.toHaveBeenCalled();
  });
});

// ── Context isolation ──────────────────────────────────────────────

describe('context isolation', () => {
  it('passes the same ctx object through the entire chain', async () => {
    let capturedCtx: RequestContext | null = null;
    const captureMw: Middleware = async (ctx, next) => {
      capturedCtx = ctx;
      return next();
    };

    const ctx = makeCtx();
    const pipeline = compose([captureMw], okTransport);
    await pipeline(ctx);

    expect(capturedCtx).toBe(ctx);
  });

  it('transport receives modifications from all middlewares', async () => {
    const mw1: Middleware = async (ctx, next) => {
      ctx.meta.step1 = true;
      return next();
    };
    const mw2: Middleware = async (ctx, next) => {
      ctx.meta.step2 = true;
      return next();
    };

    const verifyTransport: Transport = vi.fn(async (ctx: RequestContext) => {
      expect(ctx.meta.step1).toBe(true);
      expect(ctx.meta.step2).toBe(true);
      return makeRes();
    });

    const pipeline = compose([mw1, mw2], verifyTransport);
    await pipeline(makeCtx());

    expect(verifyTransport).toHaveBeenCalledOnce();
  });
});
