/**
 * Unit tests for http/types — error hierarchy.
 *
 * @module http/types.unit.test
 */

import { describe, expect, it } from 'vitest';

import { AbortError, ApiError, HttpError, NetworkError } from './types';

// ── ApiError (base class) ──────────────────────────────────────────

describe('ApiError', () => {
  it('is an instance of Error', () => {
    const err = new ApiError('test');
    expect(err).toBeInstanceOf(Error);
  });

  it('is an instance of ApiError', () => {
    const err = new ApiError('test');
    expect(err).toBeInstanceOf(ApiError);
  });

  it('carries the provided message', () => {
    const err = new ApiError('something broke');
    expect(err.message).toBe('something broke');
  });

  it('has name "ApiError"', () => {
    const err = new ApiError('x');
    expect(err.name).toBe('ApiError');
  });
});

// ── HttpError ──────────────────────────────────────────────────────

describe('HttpError', () => {
  it('extends ApiError', () => {
    const err = new HttpError(404, 'Not Found', '/api/users');
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toBeInstanceOf(HttpError);
  });

  it('has name "HttpError"', () => {
    const err = new HttpError(500, 'Internal Server Error', '/api/me');
    expect(err.name).toBe('HttpError');
  });

  it('captures status, statusText, and path', () => {
    const err = new HttpError(403, 'Forbidden', '/api/admin');
    expect(err.status).toBe(403);
    expect(err.statusText).toBe('Forbidden');
    expect(err.path).toBe('/api/admin');
  });

  it('captures optional body', () => {
    const body = { error: 'invalid_token' };
    const err = new HttpError(401, 'Unauthorized', '/api/me', body);
    expect(err.body).toEqual(body);
  });

  it('body defaults to undefined', () => {
    const err = new HttpError(404, 'Not Found', '/api/users');
    expect(err.body).toBeUndefined();
  });

  it('builds message from path and status', () => {
    const err = new HttpError(500, 'Server Error', '/api/crash');
    expect(err.message).toBe('/api/crash failed with status 500');
  });
});

// ── NetworkError ───────────────────────────────────────────────────

describe('NetworkError', () => {
  it('extends ApiError', () => {
    const err = new NetworkError();
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toBeInstanceOf(NetworkError);
  });

  it('has name "NetworkError"', () => {
    const err = new NetworkError();
    expect(err.name).toBe('NetworkError');
  });

  it('defaults message to "Network request failed"', () => {
    const err = new NetworkError();
    expect(err.message).toBe('Network request failed');
  });

  it('accepts a custom message', () => {
    const err = new NetworkError('DNS resolution failed');
    expect(err.message).toBe('DNS resolution failed');
  });
});

// ── AbortError ─────────────────────────────────────────────────────

describe('AbortError', () => {
  it('extends ApiError', () => {
    const err = new AbortError();
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toBeInstanceOf(AbortError);
  });

  it('has name "AbortError"', () => {
    const err = new AbortError();
    expect(err.name).toBe('AbortError');
  });

  it('defaults message to "Request was aborted"', () => {
    const err = new AbortError();
    expect(err.message).toBe('Request was aborted');
  });

  it('accepts a custom message', () => {
    const err = new AbortError('User navigated away');
    expect(err.message).toBe('User navigated away');
  });
});

// ── instanceof discrimination ──────────────────────────────────────

describe('error discrimination', () => {
  it('distinguishes between HttpError and NetworkError', () => {
    const http = new HttpError(500, 'Error', '/x');
    const network = new NetworkError();

    expect(http).toBeInstanceOf(HttpError);
    expect(http).not.toBeInstanceOf(NetworkError);
    expect(network).toBeInstanceOf(NetworkError);
    expect(network).not.toBeInstanceOf(HttpError);
  });

  it('catch-all via ApiError catches all subtypes', () => {
    const errors = [new HttpError(404, 'Not Found', '/a'), new NetworkError(), new AbortError()];

    for (const err of errors) {
      expect(err).toBeInstanceOf(ApiError);
    }
  });

  it('plain Error is not an ApiError', () => {
    const err = new Error('unrelated');
    expect(err).not.toBeInstanceOf(ApiError);
  });
});
