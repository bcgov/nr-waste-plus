/**
 * Resource — typed CRUD wrapper around an ApiClient transport.
 *
 * A `Resource<T>` provides convenience methods for common HTTP patterns
 * (GET one, GET list, POST, PATCH, DELETE) while ensuring all requests
 * flow through the middleware pipeline.
 *
 * Concrete resources (e.g. `UserResource`, `SearchResource`) extend this
 * class and call its protected methods with entity-specific paths and
 * types.
 *
 * TanStack Query hooks stay in `api/` files and call Resource methods
 * internally — the Resource itself is framework-agnostic.
 *
 * @module http/resource
 */

import type {
  HttpMethod,
  RequestConfig,
  RequestContext,
  ResponseContext,
  Transport,
} from './types';

// ── Options ─────────────────────────────────────────────────────────

/**
 * Options accepted by {@link Resource} convenience methods.
 *
 * Extends the wire-level {@link RequestConfig} with pipeline metadata
 * that middlewares consume (e.g. `notificationTarget` for failure
 * routing, `maxRetries` for the retry middleware).  `meta` is never
 * sent over the wire.
 */
export interface ResourceRequestOptions extends Partial<RequestConfig> {
  /** Pipeline metadata merged into `RequestContext.meta`. */
  meta?: Record<string, unknown>;
}

// ── Resource base ────────────────────────────────────────────────────

/**
 * Base class for per-entity API resources.
 *
 * @typeParam T - Shape of a single entity record (e.g. `UserSummary`).
 */
export class Resource<T> {
  protected readonly basePath: string;
  protected readonly transport: Transport;

  /**
   * @param basePath - URL prefix for all requests (e.g. `/api/users`).
   * @param transport - Configured pipeline from `createApiClient()`.
   */
  constructor(basePath: string, transport: Transport) {
    this.basePath = basePath;
    this.transport = transport;
  }

  // ── Convenience methods ──────────────────────────────────────────

  /**
   * Sends a GET request and returns the deserialized response body.
   *
   * @param path - Path relative to {@link basePath}, or empty for the base.
   * @param options - Additional request config overrides and pipeline meta.
   * @returns The deserialized response body.
   */
  protected async get<R = T>(path = '', options?: ResourceRequestOptions): Promise<R> {
    const res = await this.request<R>('GET', path, options);
    return res.data;
  }

  /**
   * Sends a POST request and returns the deserialized response body.
   *
   * @param path - Path relative to {@link basePath}, or empty for the base.
   * @param data - Request body (JSON-serializable).
   * @param options - Additional request config overrides and pipeline meta.
   * @returns The deserialized response body.
   */
  protected async post<R = T>(
    path = '',
    data?: unknown,
    options?: ResourceRequestOptions,
  ): Promise<R> {
    const res = await this.request<R>('POST', path, { ...options, data });
    return res.data;
  }

  /**
   * Sends a PATCH request and returns the deserialized response body.
   *
   * @param path - Path relative to {@link basePath}, or empty for the base.
   * @param data - Request body (JSON-serializable).
   * @param options - Additional request config overrides and pipeline meta.
   * @returns The deserialized response body (or `undefined` for 204).
   */
  protected async patch<R = T>(
    path = '',
    data?: unknown,
    options?: ResourceRequestOptions,
  ): Promise<R | undefined> {
    const res = await this.request<R>('PATCH', path, { ...options, data });
    // 204 No Content — no body to return.
    if (res.status === 204) return undefined;
    return res.data;
  }

  /**
   * Sends a DELETE request and returns the deserialized response body.
   *
   * @param path - Path relative to {@link basePath}, or empty for the base.
   * @param options - Additional request config overrides and pipeline meta.
   * @returns The deserialized response body (or `undefined` for 204).
   */
  protected async del<R = T>(path = '', options?: ResourceRequestOptions): Promise<R | undefined> {
    const res = await this.request<R>('DELETE', path, options);
    if (res.status === 204) return undefined;
    return res.data;
  }

  // ── Core request ────────────────────────────────────────────────

  /**
   * Sends a request through the transport pipeline.
   *
   * This is the single point where a `RequestContext` is built and
   * passed to the transport.  All convenience methods delegate here.
   *
   * Subclass methods should call `request()` directly — never `get()` /
   * `post()` — because subclass members can shadow the base helpers and
   * cause infinite recursion.
   *
   * @param method - HTTP method.
   * @param path - Path relative to {@link basePath}.
   * @param options - Additional request config overrides and pipeline meta.
   * @returns The full pipeline response.
   */
  protected async request<R = unknown>(
    method: HttpMethod,
    path: string,
    options?: ResourceRequestOptions,
  ): Promise<ResponseContext<R>> {
    const { meta, ...config } = options ?? {};
    const fullUrl = `${this.basePath}${path}`;

    const ctx: RequestContext = {
      config: {
        url: fullUrl,
        method,
        headers: { 'Content-Type': 'application/json' },
        ...config,
      },
      meta: { ...meta },
    };

    return this.transport(ctx) as Promise<ResponseContext<R>>;
  }
}
