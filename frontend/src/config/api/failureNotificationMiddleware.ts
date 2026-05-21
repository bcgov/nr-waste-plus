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
 * Returns the value of the Authorization header regardless of header container type or key casing.
 *
 * At runtime `error.config.headers` can be either an `AxiosHeaders` class instance (which exposes
 * a case-insensitive `.get()` method) or a plain object where Axios may have normalised the key to
 * lowercase. Both shapes are handled to avoid false negatives that would incorrectly suppress 401
 * toast notifications for requests that did carry a bearer token.
 */
const getAuthorizationHeader = (
  headers: InternalAxiosRequestConfig['headers'] | undefined,
): string | undefined => {
  if (!headers) return undefined;

  // AxiosHeaders instances expose a case-insensitive .get() — verify at runtime because
  // error.config.headers is not always an AxiosHeaders class instance.
  if (typeof (headers as { get?: unknown }).get === 'function') {
    const value = (headers as { get(name: string): string | false | null | undefined }).get(
      'Authorization',
    );
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  // Plain-object fallback: check both title-case and lowercase variants.
  const plain = headers as Record<string, unknown>;
  const raw = plain['Authorization'] ?? plain['authorization'];
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
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
    const hasAuthHeader = getAuthorizationHeader(error.config?.headers) !== undefined;
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
