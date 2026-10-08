/**
 * ProblemDetails middleware — normalises API errors to RFC 7807 shape.
 *
 * The Spring backend emits RFC 7807 Problem Details natively
 * (`spring.mvc.problemdetails.enabled` + `GlobalExceptionHandler`), so
 * most `HttpError` bodies already conform and pass through untouched.
 * This middleware wraps the cases that do not:
 *
 * - Non-conforming HTTP error bodies (HTML proxy pages, plain strings,
 *   ad-hoc JSON) are re-thrown as an `HttpError` whose `body` is a
 *   synthesised ProblemDetails payload.
 * - `NetworkError` / `AbortError` / non-API errors pass through
 *   unchanged; the failure-notification middleware derives friendly
 *   text for those via {@link buildNetworkProblemDetails}.
 *
 * Pipeline position: registered as a custom middleware **inside**
 * `failureNotificationMiddleware` so that, on the error path, bodies
 * are normalised before the toast is composed.
 *
 * @module api/middlewares/problemDetails
 */

import { HttpError } from '@/http/types';

import type { Middleware } from '@/http/types';

/**
 * RFC 7807 Problem Details for HTTP APIs
 * https://datatracker.ietf.org/doc/html/rfc7807
 *
 * A standardized format for describing HTTP API errors.
 */
export type ProblemDetails = {
  /** A URI reference that identifies the problem type */
  type?: string;
  /** A short, human-readable summary of the problem type */
  title: string;
  /** The HTTP status code */
  status: number;
  /** A human-readable explanation specific to this occurrence */
  detail?: string;
  /** A URI reference that identifies the specific occurrence */
  instance?: string;
  /** Additional extension members (any other properties) */
  [key: string]: unknown;
};

/**
 * Map of transport error codes to user-friendly messages.
 *
 * Keyed by the axios error code carried on {@link NetworkError.code}.
 * @see https://github.com/axios/axios#handling-errors
 */
const NETWORK_ERROR_MESSAGES: Record<string, { title: string; detail: string }> = {
  ERR_NETWORK: {
    title: 'Network Connection Failed',
    detail: 'Unable to connect to the server. Please check your internet connection and try again.',
  },
  ERR_BAD_REQUEST: {
    title: 'Invalid Request',
    detail: 'The request could not be understood by the server due to malformed syntax.',
  },
  ERR_BAD_RESPONSE: {
    title: 'Invalid Server Response',
    detail: 'The server returned an invalid response. Please try again later.',
  },
  ECONNABORTED: {
    title: 'Request Timeout',
    detail: 'The request took too long to complete. Please try again.',
  },
  ERR_CANCELED: {
    title: 'Request Cancelled',
    detail: 'The request was cancelled before it could complete.',
  },
  ERR_DEPRECATED: {
    title: 'Deprecated Feature',
    detail: 'This feature is deprecated and may not work as expected.',
  },
  ERR_FR_TOO_MANY_REDIRECTS: {
    title: 'Too Many Redirects',
    detail: 'The request failed due to too many redirects.',
  },
  ETIMEDOUT: {
    title: 'Connection Timeout',
    detail: 'The connection to the server timed out. Please try again.',
  },
};

/**
 * Type guard to check if an object conforms to RFC 7807 Problem Details format.
 *
 * @param data - The data to check
 * @param contentType - Optional response content type; `application/problem+json` short-circuits to true
 * @returns True if the data is a valid Problem Details object
 *
 * @example
 * ```typescript
 * if (isProblemDetails(error.body)) {
 *   console.log(error.body.title, error.body.detail);
 * }
 * ```
 */
export const isProblemDetails = (data: unknown, contentType?: string): data is ProblemDetails => {
  if (contentType?.includes('application/problem+json')) return true;
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.title === 'string' &&
    typeof obj.status === 'number' &&
    (obj.type === undefined || typeof obj.type === 'string')
  );
};

/**
 * Helper function to extract a meaningful detail message from various response data formats.
 *
 * @param data - The response data
 * @returns A detail string or undefined
 */
const extractDetailFromResponse = (data: unknown): string | undefined => {
  // If data is a string, return it directly
  if (typeof data === 'string') {
    return data;
  }

  // If data is an object, look for common error message properties
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;

    // Check for common error message properties (in priority order)
    const messageProp = obj.detail || obj.message || obj.error || obj.errorMessage;
    if (typeof messageProp === 'string') {
      return messageProp;
    }

    // Try to stringify the object (truncate if too long)
    try {
      const str = JSON.stringify(data);
      return str.length > 500 ? `${str.substring(0, 500)}...` : str;
    } catch {
      return undefined;
    }
  }

  return undefined;
};

/**
 * Builds a ProblemDetails payload for a failure that never received an
 * HTTP response (network error, timeout, DNS failure).
 *
 * Uses the friendly-message map keyed by the transport error code,
 * falling back to the raw message. `status` is `0` because no HTTP
 * status exists, matching the pre-migration interceptor behaviour.
 *
 * @param code - Transport error code (e.g. `ERR_NETWORK`), when known.
 * @param message - Raw error message.
 * @param instance - Request URL path the failure occurred on.
 * @returns A synthesised ProblemDetails payload.
 */
export const buildNetworkProblemDetails = (
  code: string | undefined,
  message: string,
  instance?: string,
): ProblemDetails => {
  const errorMapping = code ? NETWORK_ERROR_MESSAGES[code] : undefined;

  return {
    type: 'about:blank',
    title: errorMapping?.title || 'Network Error',
    status: 0,
    detail: errorMapping?.detail || message || 'A network error occurred',
    instance: instance || undefined,
  };
};

/**
 * Middleware that normalizes HTTP errors to RFC 7807 Problem Details format.
 *
 * This middleware is idempotent — if the backend already sends errors in
 * Problem Details format, they pass through unchanged. Otherwise, the
 * `HttpError` is re-thrown with a ProblemDetails body.
 *
 * @returns A {@link Middleware} that normalises `HttpError` bodies.
 *
 * @example
 * ```typescript
 * import { problemDetailsMiddleware } from '@/api/middlewares/problemDetails';
 * const client = createApiClient({
 *   baseURL: env.VITE_BACKEND_URL,
 *   tokenProvider,
 *   middlewares: [failureNotificationMiddleware(), problemDetailsMiddleware()],
 * });
 * ```
 */
export const problemDetailsMiddleware = (): Middleware => {
  const problemDetails: Middleware = async (_ctx, next) => {
    try {
      return await next();
    } catch (error) {
      if (error instanceof HttpError && !isProblemDetails(error.body)) {
        throw new HttpError(error.status, error.statusText, error.path, {
          type: 'about:blank',
          title: error.statusText || 'HTTP Error',
          status: error.status,
          detail: extractDetailFromResponse(error.body),
          instance: error.path === 'unknown' ? undefined : error.path,
        } satisfies ProblemDetails);
      }

      throw error;
    }
  };

  return problemDetails;
};
