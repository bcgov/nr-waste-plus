/**
 * Unit tests for {@link module:http/api-client}.
 *
 * Mocks all middleware factories and transport to verify that
 * `createApiClient` composes the stack in the correct order and
 * injects client-level defaults into every request context.
 *
 * @module http/api-client.unit.test
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mock middleware factories ───────────────────────────────────────
//
// Each factory returns a uniquely identifiable middleware so we can
// assert on composition order.  vi.hoisted() ensures the mock
// functions are available when the hoisted vi.mock() factories execute.

const {
  mockAuthMiddleware,
  mockTraceMiddleware,
  mockRetryMiddleware,
  mockHeadersMiddleware,
  mockTransport,
} = vi.hoisted(() => ({
  mockAuthMiddleware: vi.fn(),
  mockTraceMiddleware: vi.fn(),
  mockRetryMiddleware: vi.fn(),
  mockHeadersMiddleware: vi.fn(),
  mockTransport: vi.fn(),
}));

vi.mock('./middlewares/auth', () => ({
  createAuthMiddleware: vi.fn(() => mockAuthMiddleware),
}));

vi.mock('./middlewares/trace', () => ({
  createTraceMiddleware: vi.fn(() => mockTraceMiddleware),
}));

vi.mock('./middlewares/retry', () => ({
  createRetryMiddleware: vi.fn(() => mockRetryMiddleware),
}));

vi.mock('./middlewares/headers', () => ({
  createHeadersMiddleware: vi.fn(() => mockHeadersMiddleware),
}));

vi.mock('./transport', () => ({
  transport: mockTransport,
}));

vi.mock('./compose', () => ({
  compose: vi.fn(() => mockTransport),
}));

// ── Import after mocks ──────────────────────────────────────────────

import { createApiClient } from './api-client';

import type { ApiClientConfig } from './api-client';
import type { Middleware, RequestContext, ResponseContext, Transport } from './types';

// ── Helpers ─────────────────────────────────────────────────────────

const baseResponse: ResponseContext = {
  data: {},
  status: 200,
  statusText: 'OK',
  headers: {},
  meta: {},
  config: { url: '/api/test', method: 'GET' },
};

const baseConfig: ApiClientConfig = {
  baseURL: 'http://api.example.com',
  tokenProvider: async () => 'test-token',
};

const freshCtx = (overrides?: Partial<RequestContext['config']>): RequestContext => ({
  config: { url: '/api/test', method: 'GET', ...overrides },
  meta: {},
});

/** Reads the context the composed pipeline (mockTransport) received. */
const passedCtx = (): RequestContext | undefined =>
  mockTransport.mock.calls[0]?.[0] as RequestContext | undefined;

// ── Suite ───────────────────────────────────────────────────────────

describe('createApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransport.mockResolvedValue(baseResponse);
  });

  // ── Factory ──────────────────────────────────────────────────────

  it('returns a Transport function', () => {
    const client = createApiClient(baseConfig);

    expect(typeof client).toBe('function');
  });

  it('creates auth middleware with the provided tokenProvider', async () => {
    const tokenProvider = async () => 'my-token';
    createApiClient({ ...baseConfig, tokenProvider });

    const { createAuthMiddleware } = await import('./middlewares/auth');
    expect(createAuthMiddleware).toHaveBeenCalledWith(tokenProvider);
  });

  it('creates trace middleware with the provided traceProvider', async () => {
    const traceProvider = async () => 'existing-trace';
    createApiClient({ ...baseConfig, traceProvider });

    const { createTraceMiddleware } = await import('./middlewares/trace');
    expect(createTraceMiddleware).toHaveBeenCalledWith(traceProvider);
  });

  it('creates trace middleware without a traceProvider', async () => {
    createApiClient(baseConfig);

    const { createTraceMiddleware } = await import('./middlewares/trace');
    expect(createTraceMiddleware).toHaveBeenCalledWith(undefined);
  });

  it('creates headers middleware with the provided header names', async () => {
    createApiClient({ ...baseConfig, extractHeaders: ['location'] });

    const { createHeadersMiddleware } = await import('./middlewares/headers');
    expect(createHeadersMiddleware).toHaveBeenCalledWith(['location']);
  });

  it('creates headers middleware with empty array when no extractHeaders', async () => {
    createApiClient(baseConfig);

    const { createHeadersMiddleware } = await import('./middlewares/headers');
    expect(createHeadersMiddleware).toHaveBeenCalledWith([]);
  });

  // ── Composition order ────────────────────────────────────────────

  it('composes middlewares with compose()', async () => {
    createApiClient(baseConfig);

    const { compose } = await import('./compose');
    expect(compose).toHaveBeenCalledTimes(1);

    // compose(middlewares, transport) — verify middlewares include all 4
    const [middlewares] = (compose as ReturnType<typeof vi.fn>).mock.calls[0] as [
      Middleware[],
      Transport,
    ];
    expect(middlewares).toContain(mockAuthMiddleware);
    expect(middlewares).toContain(mockTraceMiddleware);
    expect(middlewares).toContain(mockRetryMiddleware);
    expect(middlewares).toContain(mockHeadersMiddleware);
  });

  it('prepends custom middlewares before the standard stack', async () => {
    const customMiddleware: Middleware = vi.fn();
    createApiClient({ ...baseConfig, middlewares: [customMiddleware] });

    const { compose } = await import('./compose');
    const [middlewares] = (compose as ReturnType<typeof vi.fn>).mock.calls[0] as [
      Middleware[],
      Transport,
    ];

    // Custom middleware should appear before auth
    const customIndex = middlewares.indexOf(customMiddleware);
    const authIndex = middlewares.indexOf(mockAuthMiddleware);
    expect(customIndex).toBeLessThan(authIndex);
  });

  // ── Default injection ────────────────────────────────────────────

  it('injects baseURL from config when ctx.config.baseURL is not set', async () => {
    const client = createApiClient(baseConfig);

    await client(freshCtx());

    expect(passedCtx()?.config.baseURL).toBe('http://api.example.com');
  });

  it('preserves ctx.config.baseURL when already set', async () => {
    const client = createApiClient(baseConfig);

    await client(freshCtx({ baseURL: 'http://other.example.com' }));

    expect(passedCtx()?.config.baseURL).toBe('http://other.example.com');
  });

  it('injects the client timeout when the request sets none', async () => {
    const client = createApiClient({ ...baseConfig, timeout: 60_000 });

    await client(freshCtx());

    expect(passedCtx()?.config.timeout).toBe(60_000);
  });

  it('preserves a per-request timeout over the client default', async () => {
    const client = createApiClient({ ...baseConfig, timeout: 60_000 });

    await client(freshCtx({ timeout: 5_000 }));

    expect(passedCtx()?.config.timeout).toBe(5_000);
  });

  it('injects withCredentials/withXSRFToken defaults', async () => {
    const client = createApiClient({
      ...baseConfig,
      withCredentials: true,
      withXSRFToken: true,
    });

    await client(freshCtx());

    expect(passedCtx()?.config.withCredentials).toBe(true);
    expect(passedCtx()?.config.withXSRFToken).toBe(true);
  });

  it('preserves per-request credential flag overrides', async () => {
    const client = createApiClient({ ...baseConfig, withCredentials: true });

    await client(freshCtx({ withCredentials: false }));

    expect(passedCtx()?.config.withCredentials).toBe(false);
  });

  it('merges defaultHeaders under per-request headers', async () => {
    const client = createApiClient({
      ...baseConfig,
      defaultHeaders: { 'Accept': 'application/json', 'X-Client': 'waste-plus' },
    });

    await client(
      freshCtx({ headers: { 'Content-Type': 'application/json', 'X-Client': 'override' } }),
    );

    expect(passedCtx()?.config.headers).toEqual({
      'Accept': 'application/json',
      'X-Client': 'override',
      'Content-Type': 'application/json',
    });
  });

  it('does not mutate the caller context', async () => {
    const client = createApiClient({ ...baseConfig, timeout: 60_000 });
    const ctx = freshCtx();

    await client(ctx);

    expect(ctx.config.baseURL).toBeUndefined();
    expect(ctx.config.timeout).toBeUndefined();
  });
});
