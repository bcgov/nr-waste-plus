import { isProblemDetails } from './problemDetailsMiddleware';

import type { ApiMiddleware, ProblemDetails } from './types';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { sendEvent } from '@/hooks/useNotificationEvents/eventHandler';

type FailureNotificationMeta = {
  notificationTarget?: string;
  suppressFailureNotification?: boolean;
};

const getMeta = (error: AxiosError<unknown>): FailureNotificationMeta => {
  const config = error.config as (InternalAxiosRequestConfig<unknown> & { meta?: unknown }) | null;

  if (!config || typeof config.meta !== 'object' || config.meta === null) {
    return {};
  }

  const meta = config.meta as Record<string, unknown>;

  return {
    notificationTarget:
      typeof meta.notificationTarget === 'string' ? meta.notificationTarget : undefined,
    suppressFailureNotification: meta.suppressFailureNotification === true,
  };
};

const getProblemDetails = (error: AxiosError<unknown>): ProblemDetails | undefined => {
  const data = error.response?.data;
  return isProblemDetails(data) ? data : undefined;
};

/**
 * Default middleware for API failures.
 *
 * Emits a toast error for unscoped request failures so network/CORS/backend issues are never silent.
 * Scoped requests are expected to handle inline notifications in their owning feature.
 */
export const failureNotificationMiddleware = (): ApiMiddleware => ({
  async failure(error: AxiosError<unknown>): Promise<unknown> {
    const { notificationTarget, suppressFailureNotification } = getMeta(error);

    // Avoid noisy events for user-cancelled requests.
    if (error.code === 'ERR_CANCELED') {
      throw error;
    }

    if (suppressFailureNotification || notificationTarget) {
      throw error;
    }

    const problemDetails = getProblemDetails(error);

    sendEvent({
      eventType: 'error',
      displayMode: 'toast',
      title: problemDetails?.title || 'Request failed',
      description:
        problemDetails?.detail || error.message || 'No additional details were provided.',
      meta: {
        status: error.response?.status,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        problemDetails,
      },
    });

    throw error;
  },
});
