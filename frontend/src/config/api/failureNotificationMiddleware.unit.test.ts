import { describe, expect, it, vi, beforeEach } from 'vitest';

import { failureNotificationMiddleware } from './failureNotificationMiddleware';

import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { sendEvent } from '@/hooks/useNotificationEvents/eventHandler';

vi.mock('@/hooks/useNotificationEvents/eventHandler', () => ({
  sendEvent: vi.fn(),
}));

type MockRequestConfig = Partial<InternalAxiosRequestConfig<unknown>> & {
  meta?: Record<string, unknown>;
};

const makeConfig = (overrides: MockRequestConfig = {}): InternalAxiosRequestConfig<unknown> =>
  ({
    headers: {},
    method: 'get',
    url: '/api/example',
    ...overrides,
  }) as InternalAxiosRequestConfig<unknown>;

const makeError = (overrides: Partial<AxiosError<unknown>> = {}): AxiosError<unknown> => {
  return {
    config: makeConfig(),
    isAxiosError: true,
    toJSON: () => ({}),
    name: 'AxiosError',
    message: 'Network Error',
    ...overrides,
  } as AxiosError<unknown>;
};

describe('failureNotificationMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends toast error notification for unscoped failures', async () => {
    const middleware = failureNotificationMiddleware();
    const error = makeError({
      response: {
        status: 500,
        statusText: 'Internal Server Error',
        data: {
          title: 'Internal Server Error',
          status: 500,
          detail: 'Backend exploded',
        },
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      },
    });

    await expect(middleware.failure?.(error)).rejects.toBe(error);

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
    const middleware = failureNotificationMiddleware();
    const error = makeError({
      config: makeConfig({
        meta: { notificationTarget: 'waste-search' },
      }),
    });

    await expect(middleware.failure?.(error)).rejects.toBe(error);

    expect(sendEvent).not.toHaveBeenCalled();
  });

  it('does not notify when request is explicitly suppressed', async () => {
    const middleware = failureNotificationMiddleware();
    const error = makeError({
      config: makeConfig({
        meta: { suppressFailureNotification: true },
      }),
    });

    await expect(middleware.failure?.(error)).rejects.toBe(error);

    expect(sendEvent).not.toHaveBeenCalled();
  });

  it('does not notify on cancelled requests', async () => {
    const middleware = failureNotificationMiddleware();
    const error = makeError({ code: 'ERR_CANCELED' });

    await expect(middleware.failure?.(error)).rejects.toBe(error);

    expect(sendEvent).not.toHaveBeenCalled();
  });

  it('does not notify for 401 when no Authorization header was sent', async () => {
    // Simulates unauthenticated requests during initial app load or the login page,
    // where no session cookie exists yet. A toast here would confuse users mid-login.
    const middleware = failureNotificationMiddleware();
    const error = makeError({
      config: makeConfig({ headers: {} as unknown as InternalAxiosRequestConfig['headers'] }),
      response: {
        status: 401,
        statusText: 'Unauthorized',
        data: { title: 'Unauthorized', status: 401, detail: 'No token provided' },
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      },
    });

    await expect(middleware.failure?.(error)).rejects.toBe(error);

    expect(sendEvent).not.toHaveBeenCalled();
  });

  it('still notifies for 401 when Authorization header was present', async () => {
    // An expired or invalid token was sent — the server explicitly rejected it.
    // The user should be informed rather than silently failing.
    const middleware = failureNotificationMiddleware();
    const error = makeError({
      config: makeConfig({ headers: { Authorization: 'Bearer expired-token' } as unknown as InternalAxiosRequestConfig['headers'] }),
      response: {
        status: 401,
        statusText: 'Unauthorized',
        data: { title: 'Unauthorized', status: 401, detail: 'Token expired' },
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      },
    });

    await expect(middleware.failure?.(error)).rejects.toBe(error);

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

  it('uses Request failed fallback title and error.message_whenResponseDataIsNotProblemDetails', async () => {
    const middleware = failureNotificationMiddleware();
    const error = makeError({
      message: 'timeout of 5000ms exceeded',
      response: {
        status: 503,
        statusText: 'Service Unavailable',
        data: { foo: 'bar' }, // valid object but not ProblemDetails (no title/status)
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      },
    });

    await expect(middleware.failure?.(error)).rejects.toBe(error);

    expect(sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'error',
        displayMode: 'toast',
        title: 'Request failed',
        description: 'timeout of 5000ms exceeded',
        meta: expect.objectContaining({ status: 503 }),
      }),
    );
  });

  it('uses Request failed title and error.message_whenNoResponse', async () => {
    const middleware = failureNotificationMiddleware();
    const error = makeError({ message: 'Network Error', response: undefined });

    await expect(middleware.failure?.(error)).rejects.toBe(error);

    expect(sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Request failed',
        description: 'Network Error',
      }),
    );
  });

  it('uses No additional details fallback_whenNoResponseAndNoMessage', async () => {
    const middleware = failureNotificationMiddleware();
    const error = makeError({ message: '', response: undefined });

    await expect(middleware.failure?.(error)).rejects.toBe(error);

    expect(sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Request failed',
        description: 'No additional details were provided.',
      }),
    );
  });
});
