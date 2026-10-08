/**
 * B3 trace middleware — injects Zipkin B3 propagation headers.
 *
 * Generates a new `X-B3-TraceId` (32-hex) and `X-B3-SpanId` (16-hex)
 * per request and merges them into `ctx.config.headers`.  On the
 * response path, both values are written into `res.meta` so callers
 * can log or surface the correlation IDs.
 *
 * Matches the backend's B3 propagation config; CORS already allows
 * these headers.
 *
 * If an external `traceProvider` supplies a trace ID (e.g. from a
 * server-rendered page or a parent span), the provider's value is used
 * instead of generating a new one.
 *
 * @module http/middlewares/trace
 */

import type { Middleware } from '../types';

/**
 * Generates a random hex string of the given length.
 *
 * Uses `crypto.getRandomValues()` for cryptographic randomness.
 * Each byte produces 2 hex characters, so `bytes = length / 2`.
 */
const randomHex = (length: number): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(length / 2));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Function that optionally provides an existing trace ID.
 *
 * Return `null` to let the middleware generate a new one.
 */
export type TraceProvider = () => Promise<string | null>;

/**
 * Creates a B3 trace middleware that injects `X-B3-TraceId` and
 * `X-B3-SpanId` headers.
 *
 * @param traceProvider - Optional callback that supplies an existing
 *   trace ID. When it returns `null` (or when omitted), a new 32-hex
 *   trace ID is generated per request.
 * @returns A {@link Middleware} that sets B3 headers and enriches
 *   `res.meta` with `traceId` and `spanId`.
 *
 * @example
 * ```ts
 * // Generate a new trace per request
 * const trace = createTraceMiddleware();
 *
 * // Propagate an existing trace ID
 * const trace = createTraceMiddleware(async () => parentTraceId);
 * ```
 */
export const createTraceMiddleware = (traceProvider?: TraceProvider): Middleware => {
  const trace: Middleware = async (ctx, next) => {
    const traceId = (await traceProvider?.()) ?? randomHex(32);
    const spanId = randomHex(16);

    ctx.config.headers = {
      ...ctx.config.headers,
      'X-B3-TraceId': traceId,
      'X-B3-SpanId': spanId,
    };

    const res = await next();

    res.meta.traceId = traceId;
    res.meta.spanId = spanId;

    return res;
  };

  return trace;
};
