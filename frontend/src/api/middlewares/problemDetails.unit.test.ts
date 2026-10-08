/**
 * Unit tests for {@link module:api/middlewares/problemDetails}.
 *
 * Ports the pre-migration `problemDetailsMiddleware` interceptor suite
 * to the Koa-style pipeline model: the middleware catches typed pipeline
 * errors from `next()` and re-throws `HttpError` instances whose `body`
 * is a normalised RFC 7807 ProblemDetails payload.
 *
 * @module api/middlewares/problemDetails.unit.test
 */

import { describe, it, expect, vi } from 'vitest';

import { AbortError, HttpError, NetworkError } from '@/http/types';

import {
  buildNetworkProblemDetails,
  isProblemDetails,
  problemDetailsMiddleware,
} from './problemDetails';

import type { ProblemDetails } from './problemDetails';
import type { RequestContext, ResponseContext } from '@/http/types';

// ── Helpers ─────────────────────────────────────────────────────────

const ctx: RequestContext = {
  config: { url: '/api/users/123', method: 'GET' },
  meta: {},
};

const okResponse: ResponseContext = {
  data: { id: 1 },
  status: 200,
  statusText: 'OK',
  headers: {},
  meta: {},
  config: ctx.config,
};

const nextRejecting = (error: unknown) =>
  vi.fn<() => Promise<ResponseContext>>().mockRejectedValue(error);

const nextResolving = (response: ResponseContext = okResponse) =>
  vi.fn<() => Promise<ResponseContext>>().mockResolvedValue(response);

/** Runs the middleware and returns the re-thrown error. */
const captureError = async (error: unknown): Promise<unknown> => {
  const middleware = problemDetailsMiddleware();
  try {
    await middleware(ctx, nextRejecting(error));
  } catch (thrown) {
    return thrown;
  }
  expect.unreachable('middleware should re-throw');
};

// ── isProblemDetails ────────────────────────────────────────────────

describe('isProblemDetails', () => {
  it('returns true for valid ProblemDetails object', () => {
    const validProblemDetails: ProblemDetails = {
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: 'The requested resource was not found',
      instance: '/api/users/123',
    };
    expect(isProblemDetails(validProblemDetails)).toBe(true);
  });

  it('returns true when content type is application/problem+json', () => {
    expect(isProblemDetails({}, 'application/problem+json')).toBe(true);
  });

  it('returns true for minimal valid ProblemDetails (only title and status)', () => {
    expect(isProblemDetails({ title: 'Error', status: 500 })).toBe(true);
  });

  it('returns false for null or undefined', () => {
    expect(isProblemDetails(null)).toBe(false);
    expect(isProblemDetails(undefined)).toBe(false);
  });

  it('returns false for non-object types', () => {
    expect(isProblemDetails('string')).toBe(false);
    expect(isProblemDetails(123)).toBe(false);
    expect(isProblemDetails(true)).toBe(false);
  });

  it('returns false for object missing title', () => {
    expect(isProblemDetails({ status: 404, detail: 'Some detail' })).toBe(false);
  });

  it('returns false for object missing status', () => {
    expect(isProblemDetails({ title: 'Error', detail: 'Some detail' })).toBe(false);
  });

  it('returns false for object with wrong title type', () => {
    expect(isProblemDetails({ title: 123, status: 404 })).toBe(false);
  });

  it('returns false for object with wrong status type', () => {
    expect(isProblemDetails({ title: 'Error', status: '404' })).toBe(false);
  });
});

// ── buildNetworkProblemDetails ──────────────────────────────────────

describe('buildNetworkProblemDetails', () => {
  it('maps ERR_NETWORK to the friendly payload', () => {
    expect(buildNetworkProblemDetails('ERR_NETWORK', 'Network Error', '/api/test')).toEqual({
      type: 'about:blank',
      title: 'Network Connection Failed',
      status: 0,
      detail:
        'Unable to connect to the server. Please check your internet connection and try again.',
      instance: '/api/test',
    });
  });

  it('maps ERR_BAD_REQUEST to the friendly payload', () => {
    const pd = buildNetworkProblemDetails('ERR_BAD_REQUEST', 'Bad Request');
    expect(pd.title).toBe('Invalid Request');
    expect(pd.detail).toBe(
      'The request could not be understood by the server due to malformed syntax.',
    );
  });

  it('maps ECONNABORTED to the timeout payload', () => {
    const pd = buildNetworkProblemDetails('ECONNABORTED', 'timeout of 5000ms exceeded');
    expect(pd.title).toBe('Request Timeout');
    expect(pd.detail).toBe('The request took too long to complete. Please try again.');
  });

  it('maps ETIMEDOUT to the connection timeout payload', () => {
    const pd = buildNetworkProblemDetails('ETIMEDOUT', 'timeout');
    expect(pd.title).toBe('Connection Timeout');
    expect(pd.detail).toBe('The connection to the server timed out. Please try again.');
  });

  it('falls back to generic title and the raw message for unknown codes', () => {
    const pd = buildNetworkProblemDetails('UNKNOWN_ERROR', 'Some unknown error occurred');
    expect(pd.title).toBe('Network Error');
    expect(pd.detail).toBe('Some unknown error occurred');
    expect(pd.status).toBe(0);
  });

  it('uses the raw message when no code is present', () => {
    const pd = buildNetworkProblemDetails(undefined, 'Custom error message');
    expect(pd.detail).toBe('Custom error message');
  });

  it('uses the fallback detail when no code or message', () => {
    const pd = buildNetworkProblemDetails(undefined, '');
    expect(pd.detail).toBe('A network error occurred');
  });

  it('leaves instance undefined when url is missing or empty', () => {
    expect(buildNetworkProblemDetails('ERR_NETWORK', 'x', '').instance).toBeUndefined();
    expect(buildNetworkProblemDetails('ERR_NETWORK', 'x').instance).toBeUndefined();
  });
});

// ── problemDetailsMiddleware ────────────────────────────────────────

describe('problemDetailsMiddleware', () => {
  it('passes successful responses through untouched', async () => {
    const middleware = problemDetailsMiddleware();
    const next = nextResolving();

    const res = await middleware(ctx, next);

    expect(res).toBe(okResponse);
    expect(next).toHaveBeenCalledTimes(1);
  });

  describe('HttpError normalisation', () => {
    it('passes through an HttpError whose body is already ProblemDetails (same instance)', async () => {
      const problemDetails: ProblemDetails = {
        type: 'https://example.com/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: 'User not found',
        instance: '/api/users/123',
      };
      const error = new HttpError(404, 'Not Found', '/api/users/123', problemDetails);

      const thrown = await captureError(error);

      expect(thrown).toBe(error);
    });

    it('wraps a non-ProblemDetails body', async () => {
      const error = new HttpError(500, 'Internal Server Error', '/api/users/123', {
        message: 'Something went wrong',
      });

      const thrown = (await captureError(error)) as HttpError;

      expect(thrown).toBeInstanceOf(HttpError);
      expect(thrown).not.toBe(error);
      expect(thrown.status).toBe(500);
      expect(thrown.statusText).toBe('Internal Server Error');
      expect(thrown.path).toBe('/api/users/123');
      expect(thrown.body).toEqual({
        type: 'about:blank',
        title: 'Internal Server Error',
        status: 500,
        detail: 'Something went wrong',
        instance: '/api/users/123',
      });
    });

    it('extracts detail from string response data', async () => {
      const error = new HttpError(400, 'Bad Request', '/api/test', 'Invalid input provided');

      const thrown = (await captureError(error)) as HttpError;
      const body = thrown.body as ProblemDetails;

      expect(body.detail).toBe('Invalid input provided');
    });

    it('extracts detail from various error message properties in priority order', async () => {
      const testCases = [
        { data: { detail: 'Detail message' }, expected: 'Detail message' },
        { data: { message: 'Message property' }, expected: 'Message property' },
        { data: { error: 'Error property' }, expected: 'Error property' },
        { data: { errorMessage: 'ErrorMessage property' }, expected: 'ErrorMessage property' },
      ];

      for (const testCase of testCases) {
        const error = new HttpError(400, 'Bad Request', '/api/test', testCase.data);
        const thrown = (await captureError(error)) as HttpError;
        const body = thrown.body as ProblemDetails;

        expect(body.detail).toBe(testCase.expected);
      }
    });

    it('stringifies object response data when no message properties found', async () => {
      const error = new HttpError(400, 'Bad Request', '/api/test', { foo: 'bar', baz: 'qux' });

      const thrown = (await captureError(error)) as HttpError;
      const body = thrown.body as ProblemDetails;

      expect(body.detail).toBe('{"foo":"bar","baz":"qux"}');
    });

    it('truncates long stringified object response data', async () => {
      const longString = 'x'.repeat(600);
      const error = new HttpError(400, 'Bad Request', '/api/test', { longField: longString });

      const thrown = (await captureError(error)) as HttpError;
      const body = thrown.body as ProblemDetails;

      expect(body.detail?.endsWith('...')).toBe(true);
      expect(body.detail?.length).toBeLessThanOrEqual(503); // 500 + "..."
    });

    it('uses default title when statusText is missing', async () => {
      const error = new HttpError(500, '', '/api/test', {});

      const thrown = (await captureError(error)) as HttpError;
      const body = thrown.body as ProblemDetails;

      expect(body.title).toBe('HTTP Error');
    });

    it('handles an HttpError with no body', async () => {
      const error = new HttpError(500, 'Internal Server Error', '/api/test');

      const thrown = (await captureError(error)) as HttpError;
      const body = thrown.body as ProblemDetails;

      expect(body.detail).toBeUndefined();
      expect(body.status).toBe(500);
    });

    it('handles circular reference in response data', async () => {
      const circularObj: Record<string, unknown> = { foo: 'bar' };
      circularObj.self = circularObj;

      const error = new HttpError(400, 'Bad Request', '/api/test', circularObj);

      const thrown = (await captureError(error)) as HttpError;
      const body = thrown.body as ProblemDetails;

      expect(body.detail).toBeUndefined();
    });

    it('leaves instance undefined when the HttpError path is unknown', async () => {
      const error = new HttpError(502, 'Bad Gateway', 'unknown', 'oops');

      const thrown = (await captureError(error)) as HttpError;
      const body = thrown.body as ProblemDetails;

      expect(body.instance).toBeUndefined();
    });
  });

  describe('non-HttpError passthrough', () => {
    it('passes NetworkError through unchanged (same instance)', async () => {
      const error = new NetworkError('Network Error', 'ERR_NETWORK');

      const thrown = await captureError(error);

      expect(thrown).toBe(error);
    });

    it('passes AbortError through unchanged (same instance)', async () => {
      const error = new AbortError();

      const thrown = await captureError(error);

      expect(thrown).toBe(error);
    });

    it('passes non-API errors through unchanged (same instance)', async () => {
      const error = new Error('Location header parse failed');

      const thrown = await captureError(error);

      expect(thrown).toBe(error);
    });
  });
});
