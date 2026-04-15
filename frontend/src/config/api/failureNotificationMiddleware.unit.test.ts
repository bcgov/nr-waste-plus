import { describe, expect, it, vi, beforeEach } from 'vitest';

import { failureNotificationMiddleware } from './failureNotificationMiddleware';

import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { sendEvent } from '@/hooks/useNotificationEvents/eventHandler';

vi.mock('@/hooks/useNotificationEvents/eventHandler', () => ({
  sendEvent: vi.fn(),
}));

const makeError = (overrides: Partial<AxiosError<unknown>> = {}): AxiosError<unknown> => {
  return {
    config: {
      url: '/api/example',
    } as InternalAxiosRequestConfig,
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
      }),
    );
  });

  it('does not notify when request is scoped with notificationTarget', async () => {
    const middleware = failureNotificationMiddleware();
    const error = makeError({
      config: {
        meta: { notificationTarget: 'waste-search' },
      } as InternalAxiosRequestConfig,
    });

    await expect(middleware.failure?.(error)).rejects.toBe(error);

    expect(sendEvent).not.toHaveBeenCalled();
  });

  it('does not notify when request is explicitly suppressed', async () => {
    const middleware = failureNotificationMiddleware();
    const error = makeError({
      config: {
        meta: { suppressFailureNotification: true },
      } as InternalAxiosRequestConfig,
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
