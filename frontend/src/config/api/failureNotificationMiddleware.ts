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

    // Suppress 401 errors that fired without an auth token — this is the expected outcome
    // during initial app load and right after the OAuth redirect, when the session cookie is
    // not yet available. Showing a toast here would confuse users who are actively logging in.
    // Requests that did carry a token but still got a 401 (expired/invalid token) are NOT
    // suppressed so the user is still informed of a real auth problem.
    const hasAuthHeader =
      typeof error.config?.headers?.['Authorization'] === 'string' &&
      error.config.headers['Authorization'].length > 0;
    if (!hasAuthHeader && error.response?.status === 401) {
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
