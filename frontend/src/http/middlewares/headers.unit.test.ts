/**
 * Unit tests for {@link module:http/middlewares/headers}.
 *
 * @module http/middlewares/headers.unit.test
 */

import { describe, expect, it, vi } from 'vitest';

import { createHeadersMiddleware } from './headers';

import type { Middleware, RequestContext, ResponseContext } from '../types';

// ── Helpers ─────────────────────────────────────────────────────────

const freshCtx = (): RequestContext => ({
  config: { url: '/api/users', method: 'GET' },
  meta: {},
});

const makeResponse = (headers: Record<string, string> = {}): ResponseContext => ({
  data: {},
  status: 200,
  statusText: 'OK',
  headers,
  meta: {},
  config: { url: '/api/users', method: 'GET' },
});

const makeNext = (response: ResponseContext = makeResponse()) =>
  vi.fn<() => Promise<ResponseContext>>().mockResolvedValue(response);

// ── Suite ───────────────────────────────────────────────────────────

describe('createHeadersMiddleware', () => {
  // ── Extraction ───────────────────────────────────────────────────

  it('extracts specified headers into res.meta.headers', async () => {
    const parseHeaders = createHeadersMiddleware(['Location', 'X-Request-Id']);
    const res = makeResponse({
      'location': '/api/reporting-units/42',
      'x-request-id': 'abc123',
      'x-other': 'ignored',
    });
    const next = makeNext(res);

    const result = await parseHeaders(freshCtx(), next);

    expect(result.meta.headers).toEqual({
      'location': '/api/reporting-units/42',
      'x-request-id': 'abc123',
    });
  });

  it('normalises header names to lowercase', async () => {
    const parseHeaders = createHeadersMiddleware(['X-Request-Id']);
    const res = makeResponse({ 'x-request-id': 'abc123' });
    const next = makeNext(res);

    const result = await parseHeaders(freshCtx(), next);

    const extracted = result.meta.headers as Record<string, string | undefined>;
    expect(extracted['x-request-id']).toBe('abc123');
  });

  it('sets undefined for missing headers', async () => {
    const parseHeaders = createHeadersMiddleware(['X-Missing', 'X-Present']);
    const res = makeResponse({ 'x-present': 'yes' });
    const next = makeNext(res);

    const result = await parseHeaders(freshCtx(), next);

    const extracted = result.meta.headers as Record<string, string | undefined>;
    expect(extracted['x-missing']).toBeUndefined();
    expect(extracted['x-present']).toBe('yes');
  });

  it('extracts nothing when headerNames is empty', async () => {
    const parseHeaders = createHeadersMiddleware([]);
    const res = makeResponse({ 'x-anything': 'value' });
    const next = makeNext(res);

    const result = await parseHeaders(freshCtx(), next);

    expect(result.meta.headers).toEqual({});
  });

  // ── Case insensitivity ──────────────────────────────────────────

  it('matches response headers case-insensitively', async () => {
    const parseHeaders = createHeadersMiddleware(['X-Custom']);
    // Response has mixed-case key
    const res = makeResponse({ 'X-CUSTOM': 'val' });
    const next = makeNext(res);

    const result = await parseHeaders(freshCtx(), next);

    // Key in meta.headers is lowercase regardless of response key case
    const extracted = result.meta.headers as Record<string, string | undefined>;
    expect(extracted['x-custom']).toBe('val');
  });

  // ── Pass-through ────────────────────────────────────────────────

  it('calls next() exactly once', async () => {
    const parseHeaders = createHeadersMiddleware(['X-Foo']);
    const next = makeNext();

    await parseHeaders(freshCtx(), next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('does not modify the original response headers', async () => {
    const parseHeaders = createHeadersMiddleware(['X-Foo']);
    const originalHeaders = { 'x-foo': 'bar', 'x-other': 'baz' };
    const res = makeResponse(originalHeaders);
    const next = makeNext(res);

    await parseHeaders(freshCtx(), next);

    // Original headers object unchanged
    expect(res.headers).toEqual(originalHeaders);
  });

  // ── Error propagation ───────────────────────────────────────────

  it('propagates errors from next()', async () => {
    const parseHeaders = createHeadersMiddleware(['X-Foo']);
    const next = vi.fn<() => Promise<ResponseContext>>().mockRejectedValue(new Error('network'));

    await expect(parseHeaders(freshCtx(), next)).rejects.toThrow('network');
  });

  // ── Type conformance ────────────────────────────────────────────

  it('is a valid Middleware — matches the Middleware type signature', () => {
    const parseHeaders: Middleware = createHeadersMiddleware(['X-Test']);

    expect(typeof parseHeaders).toBe('function');
    expect(parseHeaders.length).toBe(2);
  });
});
