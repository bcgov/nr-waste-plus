/**
 * Header-parsing middleware — extracts specified response headers into
 * `res.meta` for easy downstream access.
 *
 * This is useful for pulling the `Location` header (create endpoints),
 * correlation IDs, or other custom response headers into a structured
 * location without requiring every consumer to dig through the raw
 * headers map.
 *
 * @module http/middlewares/headers
 */

import type { Middleware } from '../types';

/**
 * Creates a header-parsing middleware that extracts the specified
 * response header names into `res.meta`.
 *
 * Extracted headers are stored under `res.meta.headers` as a plain
 * object mapping lowercase header names to their string values (or
 * `undefined` if the header was not present in the response).
 *
 * Header names in the config are normalised to **lowercase** for
 * case-insensitive matching, consistent with HTTP header conventions.
 *
 * @param headerNames - List of response header names to extract.
 * @returns A {@link Middleware} that populates `res.meta.headers`.
 *
 * @example
 * ```ts
 * const parseHeaders = createHeadersMiddleware(['Location', 'X-Request-Id']);
 * // res.meta.headers = {
 * //   'location': '/api/reporting-units/42',
 * //   'x-request-id': 'abc123',
 * // }
 * ```
 */
export const createHeadersMiddleware = (headerNames: readonly string[]): Middleware => {
  // Normalise to lowercase once at creation time.
  const normalised = headerNames.map((h) => h.toLowerCase());

  const parseHeaders: Middleware = async (_ctx, next) => {
    const res = await next();

    const extracted: Record<string, string | undefined> = {};

    // Build a lowercase-keyed lookup from the response headers for
    // case-insensitive matching (HTTP headers are case-insensitive).
    const lowerHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(res.headers)) {
      lowerHeaders[key.toLowerCase()] = value;
    }

    for (const name of normalised) {
      extracted[name] = lowerHeaders[name];
    }

    res.meta.headers = extracted;

    return res;
  };

  return parseHeaders;
};
