/**
 * ApiClient — configured middleware pipeline for one backend.
 *
 * `createApiClient(config)` composes the standard middleware stack
 * (auth → trace → retry → headers → transport) and returns a
 * `Transport` function that is the single entry-point for all HTTP
 * calls to that backend.
 *
 * This module is a **pure factory**: it holds no default instance and
 * no business knowledge.  The application's configured client (base
 * URL, token provider, project middlewares) lives in `src/api/client.ts`.
 *
 * @module http/api-client
 */

import { compose } from './compose';
import { createAuthMiddleware } from './middlewares/auth';
import { createHeadersMiddleware } from './middlewares/headers';
import { createRetryMiddleware } from './middlewares/retry';
import { createTraceMiddleware } from './middlewares/trace';
import { transport } from './transport';

import type { TokenProvider } from './middlewares/auth';
import type { TraceProvider } from './middlewares/trace';
import type { Middleware, RequestContext, ResponseContext, Transport } from './types';

// ── Configuration ───────────────────────────────────────────────────

/**
 * Configuration for creating an ApiClient instance.
 */
export interface ApiClientConfig {
  /** Base URL for the API backend (e.g. `http://localhost:8080`). */
  baseURL: string;
  /** Callback that resolves the current access token. */
  tokenProvider: TokenProvider;
  /** Optional callback that provides an existing trace ID. */
  traceProvider?: TraceProvider;
  /** Response header names to extract into `res.meta.headers`. */
  extractHeaders?: readonly string[];
  /** Additional middlewares inserted **before** the standard stack. */
  middlewares?: readonly Middleware[];
  /** Default request timeout (ms) applied when a request sets none. */
  timeout?: number;
  /**
   * Default for including credentials (cookies) on cross-origin requests.
   * Applied per request unless the request overrides it.
   */
  withCredentials?: boolean;
  /**
   * Default for attaching the `X-XSRF-TOKEN` header from the `XSRF-TOKEN`
   * cookie.  Applied per request unless the request overrides it.
   */
  withXSRFToken?: boolean;
  /**
   * Headers merged into every request.  Per-request headers with the same
   * name take precedence.
   */
  defaultHeaders?: Readonly<Record<string, string>>;
}

// ── Factory ─────────────────────────────────────────────────────────

/**
 * Creates an ApiClient for a specific backend.
 *
 * Builds the standard middleware stack in execution order:
 * 1. `auth`   — injects `Authorization: Bearer` header
 * 2. `trace`  — injects `X-B3-TraceId` / `X-B3-SpanId` headers
 * 3. `retry`  — retries 5xx / network errors with exponential back-off
 * 4. `headers` — extracts named response headers into `res.meta.headers`
 * 5. `transport` — performs the actual HTTP request via axios
 *
 * Additional middlewares from `config.middlewares` are prepended
 * before the auth middleware (so they run first on the request path
 * and last on the response path).
 *
 * The returned transport injects client-level defaults (`baseURL`,
 * `timeout`, credential/XSRF flags, default headers) into every request
 * context; values already set on the request win.
 *
 * @param config - Client configuration.
 * @returns A `Transport` function.
 *
 * @example
 * ```ts
 * const client = createApiClient({
 *   baseURL: env.VITE_BACKEND_URL,
 *   tokenProvider: cookieTokenProvider,
 *   timeout: 60_000,
 *   withCredentials: true,
 *   withXSRFToken: true,
 *   middlewares: [problemDetailsMiddleware(), failureNotificationMiddleware()],
 * });
 * ```
 */
export const createApiClient = (config: ApiClientConfig): Transport => {
  const auth = createAuthMiddleware(config.tokenProvider);
  const trace = createTraceMiddleware(config.traceProvider);
  const retry = createRetryMiddleware();
  const parseHeaders = createHeadersMiddleware(config.extractHeaders ?? []);

  const standardStack: Middleware[] = [auth, trace, retry, parseHeaders];

  const allMiddlewares = [...(config.middlewares ?? []), ...standardStack];

  const pipeline = compose(allMiddlewares, transport);

  // Wrap to inject client-level defaults into every request context.
  const client: Transport = async (ctx: RequestContext): Promise<ResponseContext> => {
    const ctxWithDefaults: RequestContext = {
      ...ctx,
      config: {
        ...ctx.config,
        baseURL: ctx.config.baseURL ?? config.baseURL,
        timeout: ctx.config.timeout ?? config.timeout,
        withCredentials: ctx.config.withCredentials ?? config.withCredentials,
        withXSRFToken: ctx.config.withXSRFToken ?? config.withXSRFToken,
        headers: { ...config.defaultHeaders, ...ctx.config.headers },
      },
    };

    return pipeline(ctxWithDefaults);
  };

  return client;
};
