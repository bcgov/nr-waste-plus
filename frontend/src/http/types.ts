/**
 * API Connection Layer — core type definitions.
 *
 * Defines the request/response contexts, middleware signature, transport
 * contract, and typed error hierarchy used by the Koa-style pipeline.
 *
 * @module http/types
 */

// ── HTTP primitives ────────────────────────────────────────────────

/** Supported HTTP methods. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Pipeline-level request configuration.
 *
 * Mirrors the subset of AxiosRequestConfig that middlewares and transport
 * need.  The transport layer is responsible for translating this into its
 * native format — no other file in the pipeline imports axios.
 */
export interface RequestConfig {
  /** Request URL path (appended to baseURL). */
  url: string;
  /** HTTP method. */
  method: HttpMethod;
  /** Base URL for the API backend. */
  baseURL?: string;
  /** Request headers (merged by middlewares, final set sent by transport). */
  headers?: Record<string, string>;
  /** URL query parameters. */
  params?: Record<string, unknown>;
  /** Request body (JSON-serializable). */
  data?: unknown;
  /** AbortSignal for request cancellation. */
  signal?: AbortSignal;
  /** Request timeout in milliseconds. */
  timeout?: number;
  /** Expected response body format. */
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
  /**
   * Whether the browser should include credentials (cookies) on
   * cross-origin requests.
   *
   * Required by this project's backend: the CSRF token is delivered in a
   * non-HttpOnly cookie (`CookieCsrfTokenRepository.withHttpOnlyFalse()`),
   * so mutating requests must carry cookies for the XSRF header flow.
   */
  withCredentials?: boolean;
  /**
   * Whether axios should read the `XSRF-TOKEN` cookie and attach its value
   * as the `X-XSRF-TOKEN` request header.
   *
   * Only honoured by axios when {@link RequestConfig.withCredentials} is
   * also enabled.
   */
  withXSRFToken?: boolean;
}

// ── Pipeline contexts ──────────────────────────────────────────────

/**
 * Context object passed **forward** through the middleware pipeline.
 *
 * Middlewares read from `config` and write pipeline-only instructions
 * into `meta` (e.g. `{ maxRetries: 2, notificationTarget: 'search' }`).
 */
export interface RequestContext {
  /** Request configuration that will be sent to transport. */
  config: RequestConfig;
  /**
   * Pipeline-only metadata.
   * Middlewares read and write here; transport does **not** send it.
   * Callers may seed it via `Resource` methods to drive per-request
   * behaviour (failure-notification routing, retry overrides).
   */
  meta: Record<string, unknown>;
}

/**
 * Context object returned **backward** through the middleware pipeline.
 *
 * Each middleware receives the response from `next()` and may inspect or
 * transform it before returning to its caller.
 */
export interface ResponseContext<T = unknown> {
  /** Deserialized response body. */
  data: T;
  /** HTTP status code. */
  status: number;
  /** HTTP status text. */
  statusText: string;
  /** Response headers. */
  headers: Record<string, string>;
  /**
   * Pipeline-derived metadata.
   * Middlewares enrich this on the way back (e.g. `{ traceId, spanId }`).
   */
  meta: Record<string, unknown>;
  /** The request configuration that produced this response. */
  config: RequestConfig;
}

// ── Function signatures ────────────────────────────────────────────

/**
 * Middleware function signature.
 *
 * Receives the request context and a `next` function that invokes the next
 * middleware (or the transport, if this is the last middleware).  Must
 * return a `ResponseContext`.
 *
 * @example
 * ```ts
 * const loggingMiddleware: Middleware = async (ctx, next) => {
 *   console.log(`→ ${ctx.config.method} ${ctx.config.url}`);
 *   const res = await next();
 *   console.log(`← ${res.status}`);
 *   return res;
 * };
 * ```
 */
export type Middleware = (
  ctx: RequestContext,
  next: () => Promise<ResponseContext>,
) => Promise<ResponseContext>;

/**
 * Transport function signature.
 *
 * The final stage in the pipeline — performs the actual HTTP request.
 * Only one file (`http/transport.ts`) implements this; it is the sole
 * place axios is imported.
 */
export type Transport = (ctx: RequestContext) => Promise<ResponseContext>;

// ── Error hierarchy ────────────────────────────────────────────────

/**
 * Base error for all API-layer errors.
 *
 * All custom errors thrown by the pipeline extend this class, allowing
 * callers to distinguish pipeline errors from unrelated exceptions.
 */
export class ApiError extends Error {
  override readonly name: string;

  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Thrown when the server responds with a non-2xx status.
 *
 * Contains enough detail for callers to build user-facing messages or
 * make programmatic decisions (e.g. redirect on 401).
 */
export class HttpError extends ApiError {
  override readonly name: string;
  readonly status: number;
  readonly statusText: string;
  readonly path: string;
  readonly body: unknown;

  constructor(status: number, statusText: string, path: string, body?: unknown) {
    super(`${path} failed with status ${String(status)}`);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
    this.path = path;
    this.body = body;
  }
}

/**
 * Thrown when the network request fails (no response received).
 *
 * Typical causes: offline, DNS failure, CORS block, timeout without
 * a response.
 */
export class NetworkError extends ApiError {
  override readonly name: string;
  /**
   * Underlying transport error code when mapped from an axios failure
   * (e.g. `ERR_NETWORK`, `ECONNABORTED`).
   *
   * Lets app-layer middlewares pick user-friendly messages without
   * inspecting raw axios errors.
   */
  readonly code?: string;

  constructor(message = 'Network request failed', code?: string) {
    super(message);
    this.name = 'NetworkError';
    this.code = code;
  }
}

/**
 * Thrown when the request is aborted via `AbortSignal`.
 */
export class AbortError extends ApiError {
  override readonly name: string;

  constructor(message = 'Request was aborted') {
    super(message);
    this.name = 'AbortError';
  }
}
