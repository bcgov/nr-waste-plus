/**
 * Shared TanStack Query helpers for the API hook modules.
 *
 * Houses the cross-domain conventions used by every `api/<domain>.ts`
 * hook module: reference-data cache settings, the inline-notification
 * option type, and RFC 7807 error surfacing.
 *
 * @module api/hookUtils
 */

import { sendEvent } from '@/hooks/useNotificationEvents/eventHandler';

import type { ProblemDetails } from './middlewares/problemDetails';

/**
 * Shared TanStack Query options for reference-data requests.
 *
 * Reference data (codes, districts, statuses) rarely changes mid-session.
 * Using `staleTime: Infinity` prevents background refetches; the data is
 * still refreshed on mount and on network reconnect.
 */
export const REFERENCE_DATA_QUERY_CONFIG = {
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  refetchOnMount: true,
} as const;

/**
 * Options shared by hooks that support inline error notifications.
 * When `notificationTarget` is supplied, the hook fires a notification event
 * on query failure instead of (or in addition to) propagating the error state.
 */
export type QueryNotificationOptions = {
  /** Target element identifier for inline error notifications. When omitted, no notification is dispatched. */
  notificationTarget?: string;
};

/**
 * Extracts a {@link ProblemDetails} payload from a thrown error object when one is present.
 *
 * The pipeline throws `HttpError` instances whose `body` carries the
 * structured RFC 7807 problem details when the backend returns one
 * (normalised by the problemDetails middleware otherwise).
 *
 * @param error - The error thrown by a query function.
 * @returns The `ProblemDetails` body if present, otherwise `undefined`.
 */
const getProblemDetails = (error: Error) => {
  if (typeof error !== 'object' || error === null || !('body' in error)) {
    return undefined;
  }

  return (error as { body?: ProblemDetails }).body;
};

/**
 * Dispatches an inline error notification event for a failed query.
 *
 * Uses {@link getProblemDetails} to prefer structured RFC 7807 detail text;
 * falls back to `error.message` when no structured body is available.
 *
 * @param error - The error thrown by a query function.
 * @param eventTarget - Identifier for the notification target element.
 */
export const notifyProblemDetailsError = (error: Error, eventTarget: string) => {
  const problemDetails = getProblemDetails(error);

  sendEvent({
    description: problemDetails
      ? problemDetails.detail || 'No additional details provided.'
      : error.message || 'No additional details provided.',
    displayMode: 'inline',
    eventTarget,
    eventType: 'error',
    title: problemDetails?.title || 'Request failed',
  });
};
