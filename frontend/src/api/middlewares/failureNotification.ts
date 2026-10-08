/**
 * Failure-notification middleware — toasts unscoped request failures.
 *
 * Emits a toast error for request failures so network/CORS/backend
 * issues are never silent.  Requests scoped with `notificationTarget`
 * (or `suppressFailureNotification`) in `RequestContext.meta` are
 * expected to handle inline notifications in their owning feature and
 * are skipped here.
 *
 * Pipeline position: registered as the **outermost** custom middleware
 * so that, on the error path, it sees errors after retry has given up
 * and after `problemDetailsMiddleware` has normalised HTTP bodies.
 *
 * @module api/middlewares/failureNotification
 */

import { sendEvent } from '@/hooks/useNotificationEvents/eventHandler';
import { AbortError, HttpError, NetworkError } from '@/http/types';

import { buildNetworkProblemDetails, isProblemDetails } from './problemDetails';

import type { ProblemDetails } from './problemDetails';
import type { Middleware, RequestContext } from '@/http/types';

type FailureNotificationMeta = {
  notificationTarget?: string;
  suppressFailureNotification?: boolean;
};

const getMeta = (ctx: RequestContext): FailureNotificationMeta => {
  const meta = ctx.meta;

  return {
    notificationTarget:
      typeof meta.notificationTarget === 'string' ? meta.notificationTarget : undefined,
    suppressFailureNotification: meta.suppressFailureNotification === true,
  };
};

/**
 * Returns true when the outgoing request carried a bearer token.
 *
 * Inside the pipeline `ctx.config.headers` is a plain record populated
 * by the auth middleware; both key casings are checked because header
 * casing is not normalised before send.
 */
const hasAuthorizationHeader = (ctx: RequestContext): boolean => {
  const headers = ctx.config.headers;
  if (!headers) return false;

  const raw = headers['Authorization'] ?? headers['authorization'];
  return typeof raw === 'string' && raw.length > 0;
};

/**
 * Resolves the RFC 7807 payload to surface for a failed request.
 *
 * - `HttpError`: the (already normalised) ProblemDetails body, when conforming.
 * - `NetworkError`: a synthesised payload from the friendly-message map.
 * - Anything else: `undefined` — callers fall back to title/message text.
 */
const resolveProblemDetails = (error: unknown, ctx: RequestContext): ProblemDetails | undefined => {
  if (error instanceof HttpError) {
    return isProblemDetails(error.body) ? error.body : undefined;
  }
  if (error instanceof NetworkError) {
    return buildNetworkProblemDetails(error.code, error.message, ctx.config.url);
  }
  return undefined;
};

/**
 * Default middleware for API failures.
 *
 * Emits a toast error for unscoped request failures so network/CORS/backend
 * issues are never silent. Scoped requests are expected to handle inline
 * notifications in their owning feature.
 *
 * @returns A {@link Middleware} that dispatches a toast on unscoped failures.
 */
export const failureNotificationMiddleware = (): Middleware => {
  const failureNotification: Middleware = async (ctx, next) => {
    try {
      return await next();
    } catch (error) {
      // Avoid noisy events for user-cancelled requests.
      if (error instanceof AbortError) {
        throw error;
      }

      // Suppress 401 errors that fired without an auth token — this is the
      // expected outcome during initial app load and right after the OAuth
      // redirect, when the session cookie is not yet available. Showing a
      // toast here would confuse users who are actively logging in.
      // Requests that did carry a token but still got a 401 (expired/invalid
      // token) are NOT suppressed so the user is still informed.
      if (error instanceof HttpError && error.status === 401 && !hasAuthorizationHeader(ctx)) {
        throw error;
      }

      const { notificationTarget, suppressFailureNotification } = getMeta(ctx);
      if (suppressFailureNotification || notificationTarget) {
        throw error;
      }

      const problemDetails = resolveProblemDetails(error, ctx);
      const message = error instanceof Error ? error.message : undefined;

      sendEvent({
        eventType: 'error',
        displayMode: 'toast',
        title: problemDetails?.title || 'Request failed',
        description: problemDetails?.detail || message || 'No additional details were provided.',
        meta: {
          status:
            error instanceof HttpError
              ? error.status
              : error instanceof NetworkError
                ? 0
                : undefined,
          url: ctx.config.url,
          method: ctx.config.method?.toUpperCase(),
          problemDetails,
        },
      });

      throw error;
    }
  };

  return failureNotification;
};
