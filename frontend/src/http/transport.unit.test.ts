/**
 * Unit tests for {@link module:http/transport}.
 *
 * Mocks axios entirely so that the transport logic (error mapping,
 * 401 dispatch, header normalisation, credential flags) is tested in
 * isolation.
 *
 * @module http/transport.unit.test
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { serializeParams, transport } from './transport';
import { AbortError, HttpError, NetworkError } from './types';

import type { RequestContext } from './types';
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

// ── Mock axios ─────────────────────────────────────────────────────
//
// The module under test does `import axios from 'axios'` (default)
// and calls `axios(config)` as a function plus `axios.isAxiosError()`.
// The mock factory must return a callable object with isAxiosError
// as a property so the default import is both callable AND has the
// static method.
//
// vi.hoisted() ensures the mock functions are available when the
// hoisted vi.mock() factory executes.

const { mockRequest, mockIsAxiosError } = vi.hoisted(() => ({
  mockRequest: vi.fn<(config: AxiosRequestConfig) => Promise<AxiosResponse>>(),
  mockIsAxiosError: vi.fn(),
}));

vi.mock('axios', () => {
  const mock = Object.assign(mockRequest, { isAxiosError: mockIsAxiosError });
  return { default: mock, isAxiosError: mockIsAxiosError };
});

// ── Helpers ────────────────────────────────────────────────────────
//
// The helpers accept loose record shapes on purpose: several tests feed
// runtime-realistic values (a `Headers` instance, `null` headers, partial
// axios configs) that axios's compile-time types reject but the transport
// must handle defensively.

const baseCtx: RequestContext = {
  config: {
    url: '/api/users',
    method: 'GET',
    baseURL: 'http://localhost:8080',
    headers: { Accept: 'application/json' },
  },
  meta: {},
};

const makeResponse = (overrides: Record<string, unknown> = {}): AxiosResponse =>
  ({
    data: { id: 1 },
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    config: {} as AxiosRequestConfig,
    ...overrides,
  }) as AxiosResponse;

const makeAxiosError = (overrides: Record<string, unknown> = {}): AxiosError =>
  Object.assign(new Error('axios error') as unknown as AxiosError, {
    isAxiosError: true,
    code: null,
    config: { url: '/api/users' },
    response: undefined,
    ...overrides,
  });

// ── Tests ──────────────────────────────────────────────────────────

describe('transport', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    mockIsAxiosError.mockReset();
  });

  // ── Happy path ─────────────────────────────────────────────────

  it('returns a ResponseContext on successful request', async () => {
    const axiosResponse = makeResponse({
      data: { id: 42, name: 'Alice' },
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
    });
    mockRequest.mockResolvedValueOnce(axiosResponse);

    const result = await transport(baseCtx);

    expect(result).toEqual({
      data: { id: 42, name: 'Alice' },
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      meta: {},
      config: baseCtx.config,
    });
  });

  it('passes RequestContext config fields to axios', async () => {
    mockRequest.mockResolvedValueOnce(makeResponse());

    const ctx: RequestContext = {
      config: {
        url: '/api/users',
        method: 'POST',
        baseURL: 'http://api.example.com',
        headers: { 'Content-Type': 'application/json' },
        params: { page: 1 },
        data: { name: 'Bob' },
        timeout: 5000,
        responseType: 'json',
      },
      meta: {},
    };

    await transport(ctx);

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/users',
        method: 'POST',
        baseURL: 'http://api.example.com',
        headers: { 'Content-Type': 'application/json' },
        params: { page: 1 },
        data: { name: 'Bob' },
        timeout: 5000,
        responseType: 'json',
      }),
    );
  });

  // ── Credentials / CSRF ─────────────────────────────────────────

  it('passes withCredentials and withXSRFToken through to axios', async () => {
    mockRequest.mockResolvedValueOnce(makeResponse());

    const ctx: RequestContext = {
      config: { ...baseCtx.config, withCredentials: true, withXSRFToken: true },
      meta: {},
    };

    await transport(ctx);

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ withCredentials: true, withXSRFToken: true }),
    );
  });

  it('leaves credential flags undefined when not set', async () => {
    mockRequest.mockResolvedValueOnce(makeResponse());

    await transport(baseCtx);

    const axiosCall = mockRequest.mock.calls[0]?.[0] as AxiosRequestConfig;
    expect(axiosCall.withCredentials).toBeUndefined();
    expect(axiosCall.withXSRFToken).toBeUndefined();
  });

  it('does not pass meta to axios config', async () => {
    mockRequest.mockResolvedValueOnce(makeResponse());

    const ctx: RequestContext = {
      ...baseCtx,
      meta: { maxRetries: 2, notificationTarget: 'search' },
    };

    await transport(ctx);

    const axiosCall = mockRequest.mock.calls[0]?.[0] as AxiosRequestConfig;
    // meta is not part of AxiosRequestConfig — should not appear
    expect('meta' in axiosCall).toBe(false);
    expect('maxRetries' in axiosCall).toBe(false);
  });

  it('passes AbortSignal through to axios', async () => {
    mockRequest.mockResolvedValueOnce(makeResponse());

    const controller = new AbortController();
    const ctx: RequestContext = {
      config: { ...baseCtx.config, signal: controller.signal },
      meta: {},
    };

    await transport(ctx);

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it('registers serializeParams as the axios paramsSerializer', async () => {
    mockRequest.mockResolvedValueOnce(makeResponse());

    await transport({ ...baseCtx, config: { ...baseCtx.config, params: { page: 0 } } });

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ paramsSerializer: serializeParams }),
    );
  });

  // ── 204 No Content ─────────────────────────────────────────────

  it('handles 204 No Content with empty data', async () => {
    const axiosResponse = makeResponse({
      data: '',
      status: 204,
      statusText: 'No Content',
    });
    mockRequest.mockResolvedValueOnce(axiosResponse);

    const result = await transport(baseCtx);

    expect(result.status).toBe(204);
    expect(result.data).toBe('');
  });

  // ── Error mapping: HttpError ────────────────────────────────────

  it('throws HttpError when server responds with 4xx', async () => {
    const axiosError = makeAxiosError({
      response: {
        data: { error: 'Not Found' },
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: {} as AxiosRequestConfig,
      },
      config: { url: '/api/missing' },
    });

    mockRequest.mockRejectedValueOnce(axiosError);
    mockIsAxiosError.mockReturnValueOnce(true);

    try {
      await transport({ ...baseCtx, config: { ...baseCtx.config, url: '/api/missing' } });
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      const httpErr = error as HttpError;
      expect(httpErr.status).toBe(404);
      expect(httpErr.statusText).toBe('Not Found');
      expect(httpErr.path).toBe('/api/missing');
      expect(httpErr.body).toEqual({ error: 'Not Found' });
      return;
    }
    expect.unreachable('Expected HttpError to be thrown');
  });

  it('throws HttpError when server responds with 5xx', async () => {
    const axiosError = makeAxiosError({
      response: {
        data: 'Internal Server Error',
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: {} as AxiosRequestConfig,
      },
      config: { url: '/api/fail' },
    });

    mockRequest.mockRejectedValueOnce(axiosError);
    mockIsAxiosError.mockReturnValueOnce(true);

    try {
      await transport({ ...baseCtx, config: { ...baseCtx.config, url: '/api/fail' } });
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(500);
      return;
    }
    expect.unreachable('Expected HttpError to be thrown');
  });

  it('uses "unknown" as HttpError path when error.config.url is missing', async () => {
    const axiosError = makeAxiosError({
      response: {
        data: 'Bad Gateway',
        status: 502,
        statusText: 'Bad Gateway',
        headers: {},
        config: {} as AxiosRequestConfig,
      },
      // No url on the config — covers the ?? 'unknown' branch
      config: {},
    });

    mockRequest.mockRejectedValueOnce(axiosError);
    mockIsAxiosError.mockReturnValueOnce(true);

    try {
      await transport(baseCtx);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).path).toBe('unknown');
      return;
    }
    expect.unreachable('Expected HttpError to be thrown');
  });

  // ── 401 dispatches auth:unauthorized ────────────────────────────

  it('dispatches auth:unauthorized CustomEvent on 401', async () => {
    const listener = vi.fn();
    window.addEventListener('auth:unauthorized', listener);

    const axiosError = makeAxiosError({
      response: {
        data: { error: 'Unauthorized' },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: {} as AxiosRequestConfig,
      },
      config: { url: '/api/secure' },
    });

    mockRequest.mockRejectedValueOnce(axiosError);
    mockIsAxiosError.mockReturnValueOnce(true);

    await expect(transport(baseCtx)).rejects.toThrow(HttpError);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: 'auth:unauthorized' }));

    window.removeEventListener('auth:unauthorized', listener);
  });

  it('does NOT dispatch auth:unauthorized on non-401 errors', async () => {
    const listener = vi.fn();
    window.addEventListener('auth:unauthorized', listener);

    const axiosError = makeAxiosError({
      response: {
        data: 'Forbidden',
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        config: {} as AxiosRequestConfig,
      },
      config: { url: '/api/forbidden' },
    });

    mockRequest.mockRejectedValueOnce(axiosError);
    mockIsAxiosError.mockReturnValueOnce(true);

    await expect(transport(baseCtx)).rejects.toThrow(HttpError);
    expect(listener).not.toHaveBeenCalled();

    window.removeEventListener('auth:unauthorized', listener);
  });

  // ── Error mapping: AbortError ───────────────────────────────────

  it('throws AbortError when request is cancelled (ERR_CANCELED)', async () => {
    const axiosError = makeAxiosError({ code: 'ERR_CANCELED' });

    mockRequest.mockRejectedValueOnce(axiosError);
    mockIsAxiosError.mockReturnValueOnce(true);

    await expect(transport(baseCtx)).rejects.toThrow(AbortError);
  });

  it('throws AbortError when ECONNABORTED and signal was aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    const axiosError = makeAxiosError({
      code: 'ECONNABORTED',
      config: { url: '/api/timeout', signal: controller.signal },
    });

    mockRequest.mockRejectedValueOnce(axiosError);
    mockIsAxiosError.mockReturnValueOnce(true);

    await expect(transport(baseCtx)).rejects.toThrow(AbortError);
  });

  it('throws NetworkError for ECONNABORTED without aborted signal (timeout)', async () => {
    const axiosError = makeAxiosError({
      code: 'ECONNABORTED',
      config: { url: '/api/timeout', signal: undefined },
    });

    mockRequest.mockRejectedValueOnce(axiosError);
    mockIsAxiosError.mockReturnValueOnce(true);

    await expect(transport(baseCtx)).rejects.toThrow(NetworkError);
  });

  // ── Error mapping: NetworkError ─────────────────────────────────

  it('throws NetworkError when no response is received', async () => {
    const axiosError = makeAxiosError({
      code: 'ERR_NETWORK',
      message: 'Network Error',
    });

    mockRequest.mockRejectedValueOnce(axiosError);
    mockIsAxiosError.mockReturnValueOnce(true);

    try {
      await transport(baseCtx);
    } catch (error) {
      expect(error).toBeInstanceOf(NetworkError);
      expect((error as NetworkError).message).toBe('Network Error');
      return;
    }
    expect.unreachable('Expected NetworkError to be thrown');
  });

  it('preserves the axios error code on NetworkError', async () => {
    const axiosError = makeAxiosError({
      code: 'ERR_NETWORK',
      message: 'Network Error',
    });

    mockRequest.mockRejectedValueOnce(axiosError);
    mockIsAxiosError.mockReturnValueOnce(true);

    try {
      await transport(baseCtx);
    } catch (error) {
      expect((error as NetworkError).code).toBe('ERR_NETWORK');
      return;
    }
    expect.unreachable('Expected NetworkError to be thrown');
  });

  it('preserves the ECONNABORTED code for timeouts without an aborted signal', async () => {
    const axiosError = makeAxiosError({
      code: 'ECONNABORTED',
      message: 'timeout of 60000ms exceeded',
      config: { url: '/api/slow', signal: undefined },
    });

    mockRequest.mockRejectedValueOnce(axiosError);
    mockIsAxiosError.mockReturnValueOnce(true);

    try {
      await transport(baseCtx);
    } catch (error) {
      expect(error).toBeInstanceOf(NetworkError);
      expect((error as NetworkError).code).toBe('ECONNABORTED');
      return;
    }
    expect.unreachable('Expected NetworkError to be thrown');
  });

  // ── Non-Axios error ─────────────────────────────────────────────

  it('wraps non-Axios errors in NetworkError', async () => {
    mockRequest.mockRejectedValueOnce(new Error('something weird'));
    mockIsAxiosError.mockReturnValueOnce(false);

    await expect(transport(baseCtx)).rejects.toThrow(NetworkError);
  });

  it('wraps non-Error throws in NetworkError with generic message', async () => {
    mockRequest.mockRejectedValueOnce('string error');
    mockIsAxiosError.mockReturnValueOnce(false);

    try {
      await transport(baseCtx);
    } catch (error) {
      expect(error).toBeInstanceOf(NetworkError);
      expect((error as NetworkError).message).toBe('Unknown error');
      return;
    }
    expect.unreachable('Expected NetworkError to be thrown');
  });

  // ── Header normalisation ────────────────────────────────────────

  it('normalises plain object headers from axios', async () => {
    const axiosResponse = makeResponse({
      headers: { 'x-custom': 'value', 'x-ratelimit': '100' },
    });
    mockRequest.mockResolvedValueOnce(axiosResponse);

    const result = await transport(baseCtx);

    expect(result.headers).toEqual({
      'x-custom': 'value',
      'x-ratelimit': '100',
    });
  });

  it('normalises Headers instance from axios', async () => {
    const headers = new Headers();
    headers.set('x-trace', 'abc123');
    headers.set('x-span', 'def456');

    const axiosResponse = makeResponse({ headers });
    mockRequest.mockResolvedValueOnce(axiosResponse);

    const result = await transport(baseCtx);

    expect(result.headers['x-trace']).toBe('abc123');
    expect(result.headers['x-span']).toBe('def456');
  });

  it('handles null or undefined headers gracefully', async () => {
    const axiosResponse = makeResponse({ headers: null });
    mockRequest.mockResolvedValueOnce(axiosResponse);

    const result = await transport(baseCtx);

    expect(result.headers).toEqual({});
  });

  // ── Query-param serialisation (Spring-compatible wire format) ───

  it('repeats array keys without brackets (Spring List binding)', () => {
    expect(serializeParams({ values: ['00012797', '00012798'] })).toBe(
      'values=00012797&values=00012798',
    );
  });

  it('serialises scalars and skips undefined/null values', () => {
    expect(serializeParams({ page: 0, size: 10, value: 'acme', q: undefined, r: null })).toBe(
      'page=0&size=10&value=acme',
    );
  });

  it('omits empty arrays entirely', () => {
    expect(serializeParams({ values: [], page: 1 })).toBe('page=1');
  });

  it('drops null/undefined/empty-string array elements but keeps the rest', () => {
    expect(serializeParams({ v: ['a', null, '', undefined, 'b'] })).toBe('v=a&v=&v=b');
  });

  it('uses bracket notation for nested objects', () => {
    expect(serializeParams({ pageable: { page: 1, size: 25 } })).toBe(
      'pageable%5Bpage%5D=1&pageable%5Bsize%5D=25',
    );
  });

  it('repeats the key per element for sort arrays (field,direction pairs)', () => {
    expect(serializeParams({ sort: ['area,ASC', 'startDate,DESC'] })).toBe(
      'sort=area%2CASC&sort=startDate%2CDESC',
    );
  });

  it('URI-encodes keys and values', () => {
    expect(serializeParams({ 'cli ent': 'a&b=c' })).toBe('cli%20ent=a%26b%3Dc');
  });

  it('serialises booleans as true/false strings', () => {
    expect(serializeParams({ active: true, hidden: false })).toBe('active=true&hidden=false');
  });

  it('returns an empty string when nothing is serialisable', () => {
    expect(serializeParams({})).toBe('');
    expect(serializeParams({ a: undefined })).toBe('');
  });

  // ── Response context shape ──────────────────────────────────────

  it('includes original RequestConfig in response.config', async () => {
    mockRequest.mockResolvedValueOnce(makeResponse());

    const result = await transport(baseCtx);

    expect(result.config).toBe(baseCtx.config);
  });

  it('initialises response.meta as empty object', async () => {
    mockRequest.mockResolvedValueOnce(makeResponse());

    const result = await transport(baseCtx);

    expect(result.meta).toEqual({});
  });
});
