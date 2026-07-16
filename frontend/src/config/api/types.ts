import axios from 'axios';

import { CancelablePromise } from './CancelablePromise';
import { parseResourceIdFromLocation } from './locationHeader';
import { request } from './request';

import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

export type ApiMiddleware = {
  request?: (
    config: InternalAxiosRequestConfig<unknown>,
  ) => Promise<InternalAxiosRequestConfig<unknown>>;
  response?: (
    response: AxiosResponse<unknown, unknown>,
  ) => Promise<AxiosResponse<unknown, unknown>>;
  failure?: (error: AxiosError<unknown>) => Promise<unknown>;
};

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

export type HttpMethod = 'GET' | 'PUT' | 'POST' | 'DELETE' | 'OPTIONS' | 'HEAD' | 'PATCH';

export type ApiRequestOptions = {
  readonly method: HttpMethod;
  readonly url: string;
  readonly path?: Record<string, unknown>;
  readonly cookies?: Record<string, unknown>;
  readonly headers?: Record<string, unknown>;
  readonly query?: Record<string, unknown>;
  readonly formData?: Record<string, unknown>;
  readonly body?: unknown;
  readonly mediaType?: string;
  readonly responseHeader?: string;
  readonly errors?: Record<number, string>;
  readonly middleware?: Array<ApiMiddleware>;
  readonly meta?: Record<string, unknown>;
};

export type ApiResult = {
  readonly url: string;
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly body: unknown;
};

export class ApiError extends Error {
  public readonly url: string;
  public readonly status: number;
  public readonly statusText: string;
  public readonly body: unknown;
  public readonly request: ApiRequestOptions;

  constructor(request: ApiRequestOptions, response: ApiResult, message: string) {
    super(message);

    this.name = 'ApiError';
    this.url = response.url;
    this.status = response.status;
    this.statusText = response.statusText;
    this.body = response.body;
    this.request = request;
  }
}

type Resolver<T> = (options: ApiRequestOptions) => Promise<T>;
type Headers = Record<string, string>;

export type APIConfig = {
  BASE: string;
  VERSION: string;
  WITH_CREDENTIALS: boolean;
  CREDENTIALS: 'include' | 'omit' | 'same-origin';
  TOKEN?: string | Resolver<string> | undefined;
  USERNAME?: string | Resolver<string> | undefined;
  PASSWORD?: string | Resolver<string> | undefined;
  HEADERS?: Headers | Resolver<Headers> | undefined;
  ENCODE_PATH?: ((path: string) => string) | undefined;
  MIDDLEWARE?: Array<ApiMiddleware>;
  TIMEOUT?: number;
  ADAPTER?: AxiosRequestConfig['adapter'];
};

export class HttpClient {
  axiosInstance: AxiosInstance;
  constructor(readonly config: APIConfig) {
    this.config = config;
    this.axiosInstance = axios.create({
      baseURL: config.BASE,
      timeout: config.TIMEOUT || 60000, // Default timeout of 60 seconds
      headers: {
        'Content-Type': 'application/json',
        ...config.HEADERS,
      },
    });
  }

  protected doRequest = <T>(config: APIConfig, options: ApiRequestOptions): CancelablePromise<T> =>
    request<T>(config, options, this.axiosInstance);

  /**
   * Performs a create request that returns the new resource ID via the
   * `Location` response header.
   *
   * Issues the request with `responseHeader: 'location'`, then parses the
   * returned header value into a resource identifier. Cancellation is
   * forwarded to the underlying request, and any HTTP / parse error is
   * propagated unchanged.
   *
   * @template T - the resolved resource identifier type
   * @param options - the request configuration (method, url, body, meta, ...)
   * @param idParser - optional custom `Location` parser; defaults to the
   * trailing-numeric ID strategy
   * @returns a promise that resolves to the parsed resource identifier
   * @throws {ApiError} when the HTTP request fails (400, 409, 500, etc.)
   * @throws {Error} when the `Location` header value cannot be parsed
   * @example
   * const id = await this.createResource<number>({
   *   method: 'POST',
   *   url: '/api/reporting-units',
   *   body,
   * });
   */
  protected createResource = <T = number>(
    options: ApiRequestOptions,
    idParser: (location: string) => T = parseResourceIdFromLocation as (location: string) => T,
  ): CancelablePromise<T> =>
    new CancelablePromise<T>((resolve, reject, onCancel) => {
      const request$ = this.doRequest<string>(this.config, {
        ...options,
        responseHeader: 'location',
      });

      onCancel(() => request$.cancel());

      request$
        .then((location) => {
          try {
            resolve(idParser(location));
          } catch (error) {
            reject(error);
          }
        })
        .catch(reject);
    });
}
