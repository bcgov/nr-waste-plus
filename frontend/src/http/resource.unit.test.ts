/**
 * Unit tests for {@link module:http/resource}.
 *
 * @module http/resource.unit.test
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { Resource } from './resource';

import type { ResourceRequestOptions } from './resource';
import type { HttpMethod, RequestContext, ResponseContext } from './types';

// ── Test resource ───────────────────────────────────────────────────

/**
 * Test-only subclass that re-exposes the protected members so they can
 * be exercised directly (same convention as `httpClient.unit.test.ts`).
 */
class TestResource extends Resource<unknown> {
  public override request<R = unknown>(
    method: HttpMethod,
    path: string,
    options?: ResourceRequestOptions,
  ): Promise<ResponseContext<R>> {
    return super.request<R>(method, path, options);
  }

  public override get<R = unknown>(path = '', options?: ResourceRequestOptions): Promise<R> {
    return super.get<R>(path, options);
  }

  public override post<R = unknown>(
    path = '',
    data?: unknown,
    options?: ResourceRequestOptions,
  ): Promise<R> {
    return super.post<R>(path, data, options);
  }

  public override patch<R = unknown>(
    path = '',
    data?: unknown,
    options?: ResourceRequestOptions,
  ): Promise<R | undefined> {
    return super.patch<R>(path, data, options);
  }

  public override del<R = unknown>(
    path = '',
    options?: ResourceRequestOptions,
  ): Promise<R | undefined> {
    return super.del<R>(path, options);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

const okResponse = (data: unknown, overrides: Partial<ResponseContext> = {}): ResponseContext => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  meta: {},
  config: { url: '/api/test', method: 'GET' },
  ...overrides,
});

// ── Suite ───────────────────────────────────────────────────────────

describe('Resource', () => {
  const mockTransport = vi.fn<(ctx: RequestContext) => Promise<ResponseContext>>();
  let resource: TestResource;

  beforeEach(() => {
    vi.clearAllMocks();
    resource = new TestResource('/api/users', mockTransport);
  });

  // ── Construction ─────────────────────────────────────────────────

  it('stores basePath and transport', () => {
    expect(resource).toBeInstanceOf(Resource);
  });

  // ── request() ────────────────────────────────────────────────────

  it('request() builds a RequestContext with method, url, and Content-Type', async () => {
    mockTransport.mockResolvedValue(okResponse(null));

    await resource.request('GET', '/123');

    expect(mockTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          method: 'GET',
          url: '/api/users/123',
          headers: { 'Content-Type': 'application/json' },
        }),
      }),
    );
  });

  it('request() passes signal and params from config overrides', async () => {
    mockTransport.mockResolvedValue(okResponse(null));
    const controller = new AbortController();

    await resource.request('GET', '', {
      signal: controller.signal,
      params: { page: 0, size: 20 },
    });

    expect(mockTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          signal: controller.signal,
          params: { page: 0, size: 20 },
        }),
      }),
    );
  });

  it('request() passes data in config for POST/PATCH', async () => {
    mockTransport.mockResolvedValue(okResponse(null));

    await resource.request('POST', '/invite', { data: { email: 'a@b.com' } });

    expect(mockTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          method: 'POST',
          data: { email: 'a@b.com' },
        }),
      }),
    );
  });

  it('request() appends path to basePath', async () => {
    mockTransport.mockResolvedValue(okResponse(null));

    await resource.request('PATCH', '/abc/status');

    expect(mockTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ url: '/api/users/abc/status' }),
      }),
    );
  });

  it('request() returns the full ResponseContext', async () => {
    mockTransport.mockResolvedValue(okResponse({ id: '1' }));

    const result: ResponseContext = await resource.request('GET', '');

    expect(result.status).toBe(200);
    expect(result.data).toEqual({ id: '1' });
  });

  // ── meta passthrough ─────────────────────────────────────────────

  it('request() seeds ctx.meta from options.meta', async () => {
    mockTransport.mockResolvedValue(okResponse(null));

    await resource.request('GET', '', {
      meta: { notificationTarget: 'waste-search', suppressFailureNotification: true },
    });

    expect(mockTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: { notificationTarget: 'waste-search', suppressFailureNotification: true },
      }),
    );
  });

  it('request() defaults ctx.meta to an empty object', async () => {
    mockTransport.mockResolvedValue(okResponse(null));

    await resource.request('GET', '');

    expect(mockTransport).toHaveBeenCalledWith(expect.objectContaining({ meta: {} }));
  });

  it('request() copies meta so middleware mutation cannot leak to the caller', async () => {
    const callerMeta: Record<string, unknown> = { maxRetries: 0 };
    mockTransport.mockImplementation(async (ctx: RequestContext) => {
      ctx.meta.maxRetries = 99; // simulate a middleware mutating meta
      return okResponse(null);
    });

    await resource.request('GET', '', { meta: callerMeta });

    expect(callerMeta.maxRetries).toBe(0);
  });

  it('request() never places meta on the wire config', async () => {
    mockTransport.mockResolvedValue(okResponse(null));

    await resource.request('GET', '', { meta: { notificationTarget: 'x' } });

    const ctx = mockTransport.mock.calls[0]?.[0] as RequestContext;
    expect('meta' in ctx.config).toBe(false);
  });

  it('post() forwards meta alongside the body', async () => {
    mockTransport.mockResolvedValue(okResponse(null));

    await resource.post('/invite', { email: 'a@b.com' }, { meta: { maxRetries: 0 } });

    expect(mockTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ data: { email: 'a@b.com' } }),
        meta: { maxRetries: 0 },
      }),
    );
  });

  // ── Error propagation ───────────────────────────────────────────

  it('propagates transport errors', async () => {
    mockTransport.mockRejectedValue(new Error('network'));

    await expect(resource.request('GET', '')).rejects.toThrow('network');
  });

  // ── get() ────────────────────────────────────────────────────────

  it('get() sends GET request and returns response data', async () => {
    mockTransport.mockResolvedValue(okResponse({ id: '1', name: 'Alice' }));

    const data = await resource.get<{ id: string; name: string }>('/1');

    expect(data).toEqual({ id: '1', name: 'Alice' });
    expect(mockTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ method: 'GET', url: '/api/users/1' }),
      }),
    );
  });

  it('get() defaults path to empty string', async () => {
    mockTransport.mockResolvedValue(okResponse([]));

    await resource.get();

    expect(mockTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ url: '/api/users' }),
      }),
    );
  });

  it('get() passes config overrides', async () => {
    mockTransport.mockResolvedValue(okResponse([]));
    const controller = new AbortController();

    await resource.get('', { signal: controller.signal, params: { page: 1 } });

    expect(mockTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          signal: controller.signal,
          params: { page: 1 },
        }),
      }),
    );
  });

  // ── post() ───────────────────────────────────────────────────────

  it('post() sends POST request with data and returns response data', async () => {
    mockTransport.mockResolvedValue(okResponse('user-123'));

    const result = await resource.post<string>('/invite', { email: 'a@b.com' });

    expect(result).toBe('user-123');
    expect(mockTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          method: 'POST',
          data: { email: 'a@b.com' },
        }),
      }),
    );
  });

  it('post() merges data with config overrides', async () => {
    mockTransport.mockResolvedValue(okResponse('ok'));

    await resource.post('/invite', { email: 'a@b.com' }, { timeout: 5000 });

    expect(mockTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          method: 'POST',
          data: { email: 'a@b.com' },
          timeout: 5000,
        }),
      }),
    );
  });

  // ── patch() ──────────────────────────────────────────────────────

  it('patch() sends PATCH with data and returns response data', async () => {
    mockTransport.mockResolvedValue(okResponse({ enabled: true }));

    const result = await resource.patch<{ enabled: boolean }>('/1/status', {
      enabled: true,
    });

    expect(result).toEqual({ enabled: true });
    expect(mockTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          method: 'PATCH',
          data: { enabled: true },
        }),
      }),
    );
  });

  it('patch() returns undefined for 204 No Content', async () => {
    mockTransport.mockResolvedValue(okResponse(null, { status: 204 }));

    const result = await resource.patch('/1/status', { enabled: false });

    expect(result).toBeUndefined();
  });

  // ── del() ────────────────────────────────────────────────────────

  it('del() sends DELETE request and returns response data', async () => {
    mockTransport.mockResolvedValue(okResponse({ deleted: true }));

    const result = await resource.del<{ deleted: boolean }>('/1');

    expect(result).toEqual({ deleted: true });
    expect(mockTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ method: 'DELETE' }),
      }),
    );
  });

  it('del() returns undefined for 204 No Content', async () => {
    mockTransport.mockResolvedValue(okResponse(null, { status: 204 }));

    const result = await resource.del('/1');

    expect(result).toBeUndefined();
  });
});
