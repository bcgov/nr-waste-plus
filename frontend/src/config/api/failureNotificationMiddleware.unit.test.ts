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

const makeConfig = (
  overrides: MockRequestConfig = {},
): InternalAxiosRequestConfig<unknown> => ({
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
});
