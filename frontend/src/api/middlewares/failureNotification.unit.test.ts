/**
 * Unit tests for {@link module:api/middlewares/failureNotification}.
 *
 * Ports the pre-migration `failureNotificationMiddleware` interceptor
 * suite to the Koa-style pipeline model: the middleware catches typed
 * pipeline errors from `next()`, composes the toast from the normalised
 * ProblemDetails payload, and re-throws the original error.
 *
 * @module api/middlewares/failureNotification.unit.test
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { sendEvent } from '@/hooks/useNotificationEvents/eventHandler';
import { AbortError, HttpError, NetworkError } from '@/http/types';

import { failureNotificationMiddleware } from './failureNotification';

import type { ProblemDetails } from './problemDetails';
import type { RequestContext, ResponseContext } from '@/http/types';

vi.mock('@/hooks/useNotificationEvents/eventHandler', () => ({
  sendEvent: vi.fn(),
}));

// ── Helpers ─────────────────────────────────────────────────────────

const makeCtx = (overrides: Partial<RequestContext> = {}): RequestContext => ({
  config: { url: '/api/example', method: 'GET' },
  meta: {},
  ...overrides,
});

const okResponse: ResponseContext = {
  data: {},
  status: 200,
  statusText: 'OK',
  headers: {},
  meta: {},
  config: { url: '/api/example', method: 'GET' },
};

const nextRejecting = (error: unknown) =>
  vi.fn<() => Promise<ResponseContext>>().mockRejectedValue(error);

const pdBody = (overrides: Partial<ProblemDetails> = {}): ProblemDetails => ({
  type: 'about:blank',
  title: 'Internal Server Error',
  status: 500,
  detail: 'Backend exploded',
  ...overrides,
});

/** Runs the middleware against a rejecting next and returns the re-thrown error. */
const runFailing = async (error: unknown, ctx: RequestContext = makeCtx()): Promise<unknown> => {
  const middleware = failureNotificationMiddleware();
  try {
    await middleware(ctx, nextRejecting(error));
  } catch (thrown) {
    return thrown;
  }
  expect.unreachable('middleware should re-throw');
};

// ── Suite ───────────────────────────────────────────────────────────

describe('failureNotificationMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes successful responses through untouched', async () => {
    const middleware = failureNotificationMiddleware();
    const next = vi.fn<() => Promise<ResponseContext>>().mockResolvedValue(okResponse);

    const res = await middleware(makeCtx(), next);

    expect(res).toBe(okResponse);
    expect(sendEvent).not.toHaveBeenCalled();
  });

  it('sends toast error notification for unscoped failures', async () => {
    const error = new HttpError(500, 'Internal Server Error', '/api/example', pdBody());

    const thrown = await runFailing(error);

    expect(thrown).toBe(error);
    expect(sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'error',
        displayMode: 'toast',
        title: 'Internal Server Error',
        description: 'Backend exploded',
        meta: expect.objectContaining({
          status: 500,
          url: '/api/example',
          method: 'GET',
          problemDetails: expect.objectContaining({
            title: 'Internal Server Error',
            status: 500,
            detail: 'Backend exploded',
          }),
        }),
      }),
    );
  });

  it('does not notify when request is scoped with notificationTarget', async () => {
    const error = new HttpError(500, 'Internal Server Error', '/api/example', pdBody());
    const ctx = makeCtx({ meta: { notificationTarget: 'waste-search' } });

    const thrown = await runFailing(error, ctx);

    expect(thrown).toBe(error);
    expect(sendEvent).not.toHaveBeenCalled();
  });

  it('does not notify when request is explicitly suppressed', async () => {
    const error = new HttpError(500, 'Internal Server Error', '/api/example', pdBody());
    const ctx = makeCtx({ meta: { suppressFailureNotification: true } });

    const thrown = await runFailing(error, ctx);

    expect(thrown).toBe(error);
    expect(sendEvent).not.toHaveBeenCalled();
  });

  it('does not notify on aborted requests', async () => {
    const error = new AbortError();

    const thrown = await runFailing(error);

    expect(thrown).toBe(error);
    expect(sendEvent).not.toHaveBeenCalled();
  });

  it('does not notify for 401 when no Authorization header was sent', async () => {
    // Simulates unauthenticated requests during initial app load or the login
    // page, where no session cookie exists yet. A toast here would confuse
    // users mid-login.
    const error = new HttpError(
      401,
      'Unauthorized',
      '/api/example',
      pdBody({
        title: 'Unauthorized',
        status: 401,
        detail: 'No token provided',
      }),
    );

    const thrown = await runFailing(error, makeCtx());

    expect(thrown).toBe(error);
    expect(sendEvent).not.toHaveBeenCalled();
  });

  it('still notifies for 401 when Authorization header was present', async () => {
    // An expired or invalid token was sent — the server explicitly rejected
    // it. The user should be informed rather than silently failing.
    const error = new HttpError(
      401,
      'Unauthorized',
      '/api/example',
      pdBody({
        title: 'Unauthorized',
        status: 401,
        detail: 'Token expired',
      }),
    );
    const ctx = makeCtx({
      config: { url: '/api/example', method: 'GET', headers: { Authorization: 'Bearer expired' } },
    });

    await runFailing(error, ctx);

    expect(sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'error',
        displayMode: 'toast',
        title: 'Unauthorized',
        description: 'Token expired',
        meta: expect.objectContaining({ status: 401 }),
      }),
    );
  });

  it('still notifies for 401 when the authorization header uses a lowercase key', async () => {
    const error = new HttpError(
      401,
      'Unauthorized',
      '/api/example',
      pdBody({
        title: 'Unauthorized',
        status: 401,
        detail: 'Token expired',
      }),
    );
    const ctx = makeCtx({
      config: { url: '/api/example', method: 'GET', headers: { authorization: 'Bearer expired' } },
    });

    await runFailing(error, ctx);

    expect(sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Unauthorized', description: 'Token expired' }),
    );
  });

  it('builds the toast from the friendly map for NetworkError with a known code', async () => {
    const error = new NetworkError('Network Error', 'ERR_NETWORK');

    const thrown = await runFailing(error);

    expect(thrown).toBe(error);
    expect(sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'error',
        displayMode: 'toast',
        title: 'Network Connection Failed',
        description:
          'Unable to connect to the server. Please check your internet connection and try again.',
        meta: expect.objectContaining({
          status: 0,
          url: '/api/example',
          problemDetails: expect.objectContaining({
            title: 'Network Connection Failed',
            status: 0,
          }),
        }),
      }),
    );
  });

  it('falls back to the raw message for NetworkError without a known code', async () => {
    const error = new NetworkError('weird socket failure');

    await runFailing(error);

    expect(sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Network Error',
        description: 'weird socket failure',
        meta: expect.objectContaining({ status: 0 }),
      }),
    );
  });

  it('uses Request failed fallback when the HttpError body is not ProblemDetails', async () => {
    // In the assembled pipeline problemDetailsMiddleware normalises bodies
    // first; this covers the defensive path when it did not run.
    const error = new HttpError(503, 'Service Unavailable', '/api/example', { foo: 'bar' });

    await runFailing(error);

    expect(sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'error',
        displayMode: 'toast',
        title: 'Request failed',
        description: error.message,
        meta: expect.objectContaining({ status: 503, problemDetails: undefined }),
      }),
    );
  });

  it('uses Request failed title and the message for non-API errors', async () => {
    const error = new Error('Location header parse failed');

    const thrown = await runFailing(error);

    expect(thrown).toBe(error);
    expect(sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Request failed',
        description: 'Location header parse failed',
        meta: expect.objectContaining({ status: undefined }),
      }),
    );
  });

  it('uses the No additional details fallback when there is no message', async () => {
    const error = new Error('');

    await runFailing(error);

    expect(sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Request failed',
        description: 'No additional details were provided.',
      }),
    );
  });

  it('notifies for 5xx even when retry metadata is present', async () => {
    const error = new HttpError(500, 'Internal Server Error', '/api/example', pdBody());
    const ctx = makeCtx({ meta: { maxRetries: 3, retryCount: 3 } });

    await runFailing(error, ctx);

    expect(sendEvent).toHaveBeenCalledTimes(1);
  });
});
