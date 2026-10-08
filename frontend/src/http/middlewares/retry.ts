/**
 * Retry middleware — retries requests on transient failures.
 *
 * Retries on:
 * - **5xx** server errors (HttpError with status >= 500)
 * - **NetworkError** (no response received, e.g. timeout / DNS)
 *
 * Does **not** retry on:
 * - 4xx client errors (including 401/403)
 * - AbortError (user-initiated cancellation)
 * - Non-ApiError throws
 *
 * Uses exponential back-off with jitter to avoid thundering-herd
 * retries across concurrent clients.
 *
 * Configuration is read from `ctx.meta` so callers can override
 * defaults per-request:
 * - `ctx.meta.maxRetries`  – maximum retry attempts (default: 3)
 * - `ctx.meta.retryDelayMs` – base delay in ms (default: 1000)
 *
 * Non-idempotent requests (e.g. create POSTs) should set
 * `meta: { maxRetries: 0 }` at the resource layer to avoid replaying
 * a request whose outcome is unknown after a network failure.
 *
 * After all retries are exhausted the last error is re-thrown.
 * On success, `res.meta.retryCount` reports how many retries were used.
 *
 * @module http/middlewares/retry
 */

import { HttpError, NetworkError } from '../types';

import type { Middleware } from '../types';

/** Default maximum retry attempts. */
const DEFAULT_MAX_RETRIES = 3;

/** Default base delay between retries (ms). */
const DEFAULT_RETRY_DELAY_MS = 1000;

/**
 * Computes the delay for a given retry attempt using exponential
 * back-off with full jitter.
 *
 * Formula: `random(0, baseDelay * 2^attempt)`
 *
 * @param attempt - Zero-indexed retry attempt number.
 * @param baseDelay - Base delay in milliseconds.
 */
const backoffDelay = (attempt: number, baseDelay: number): number => {
  const ceiling = baseDelay * Math.pow(2, attempt);
  return Math.floor(Math.random() * ceiling);
};

/**
 * Sleep for the given number of milliseconds.
 */
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Type guard that checks whether an error is retryable.
 *
 * Retryable: HttpError with status >= 500, or NetworkError.
 */
const isRetryable = (error: unknown): error is HttpError | NetworkError => {
  if (error instanceof HttpError) return error.status >= 500;
  return error instanceof NetworkError;
};

/**
 * Creates a retry middleware with configurable defaults.
 *
 * @returns A {@link Middleware} that retries on 5xx and network errors.
 *
 * @example
 * ```ts
 * // Default: up to 3 retries, 1 s base delay
 * const retry = createRetryMiddleware();
 *
 * // Per-request override via ctx.meta:
 * ctx.meta.maxRetries = 5;
 * ctx.meta.retryDelayMs = 2000;
 * ```
 */
export const createRetryMiddleware = (): Middleware => {
  const retry: Middleware = async (ctx, next) => {
    const maxRetries: number = (ctx.meta.maxRetries as number | undefined) ?? DEFAULT_MAX_RETRIES;
    const baseDelay: number =
      (ctx.meta.retryDelayMs as number | undefined) ?? DEFAULT_RETRY_DELAY_MS;

    let lastError: unknown;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const res = await next();
        res.meta.retryCount = attempt > 0 ? attempt : undefined;
        return res;
      } catch (error) {
        lastError = error;

        if (!isRetryable(error) || attempt >= maxRetries) {
          throw error;
        }

        const delay = backoffDelay(attempt, baseDelay);
        await sleep(delay);
        attempt++;
      }
    }

    // Should be unreachable, but TypeScript needs it.
    throw lastError;
  };

  return retry;
};
