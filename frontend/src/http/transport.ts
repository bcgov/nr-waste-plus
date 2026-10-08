/**
 * Transport layer — the sole file allowed to import axios.
 *
 * Translates a {@link RequestContext} into an axios call, then maps the
 * axios response (or error) back into a {@link ResponseContext} or a
 * typed pipeline error ({@link HttpError}, {@link NetworkError},
 * {@link AbortError}).
 *
 * On 401 responses, dispatches a global `auth:unauthorized` CustomEvent
 * so any part of the app can react (re-authentication, session-expired
 * notices) without the transport knowing about the auth layer.
 *
 * @module http/transport
 */

import axios from 'axios';

import { AbortError, HttpError, NetworkError } from './types';

import type { RequestContext, ResponseContext } from './types';
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

// ── 401 event ──────────────────────────────────────────────────────

/**
 * Dispatched when the backend responds with HTTP 401.
 *
 * Listeners can `window.addEventListener('auth:unauthorized', ...)` to
 * trigger re-authentication flows.  The pipeline preserves this contract.
 */
const dispatchUnauthorized = (): void => {
  window.dispatchEvent(new CustomEvent('auth:unauthorized'));
};

// ── Header normalisation ───────────────────────────────────────────

/**
 * Normalises an axios response header record to `Record<string, string>`.
 *
 * Axios may return headers as a `Headers` object, a plain record, or
 * (in older versions) a lowercased plain record.  This helper always
 * produces a `Record<string, string>` for the pipeline.
 */
const normalizeHeaders = (headers: unknown): Record<string, string> => {
  if (headers instanceof Headers) {
    const out: Record<string, string> = {};
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }

  if (typeof headers === 'object' && headers !== null) {
    return Object.fromEntries(
      Object.entries(headers as Record<string, unknown>).map(([key, val]) => [key, String(val)]),
    );
  }

  return {};
};

// ── Error mapping ──────────────────────────────────────────────────

/**
 * Maps an {@link AxiosError} to the pipeline's typed error hierarchy.
 *
 * - `ERR_CANCELED` or `ECONNABORTED` with an abort-cause → {@link AbortError}
 * - `error.response` present (server replied) → {@link HttpError}
 * - No response (network-level failure) → {@link NetworkError}
 */
const mapAxiosError = (error: AxiosError): never => {
  // Aborted via AbortSignal
  if (
    error.code === 'ERR_CANCELED' ||
    (error.code === 'ECONNABORTED' && error.config?.signal?.aborted)
  ) {
    throw new AbortError(error.message);
  }

  // Server responded with non-2xx
  if (error.response) {
    const { status, statusText } = error.response;
    const path = error.config?.url ?? 'unknown';

    if (status === 401) {
      dispatchUnauthorized();
    }

    throw new HttpError(status, statusText, path, error.response.data);
  }

  // Network-level failure (no response received)
  throw new NetworkError(error.message, error.code ?? undefined);
};

// ── Query-param serialisation ──────────────────────────────────────

/** True when the value is neither `undefined` nor `null`. */
const isDefined = <T>(value: T | null | undefined): value is Exclude<T, null | undefined> =>
  value !== undefined && value !== null;

/**
 * Serialises query parameters into the wire format the backend expects:
 *
 * - Arrays repeat the key per element (`values=a&values=b`) — required for
 *   Spring `@RequestParam List<String>` binding. Axios' default serialiser
 *   emits `values[]=a&values[]=b`, which Spring does not bind.
 * - Nested objects use bracket notation (`pageable[page]=1`).
 * - `undefined` / `null` values and empty arrays are omitted.
 * - Keys and values are URI-component encoded.
 *
 * Matches the legacy `getQueryString` helper byte-for-byte so existing
 * backend routes and WireMock stubs see identical URLs. Returned without
 * the leading `?` (axios appends the separator itself).
 */
export const serializeParams = (params: Record<string, unknown>): string => {
  const qs: string[] = [];

  const append = (key: string, value: unknown): void => {
    qs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  };

  const process = (key: string, value: unknown): void => {
    if (!isDefined(value)) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((v) => {
        process(key, v);
      });
      return;
    }

    if (typeof value === 'object') {
      Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
        process(`${key}[${k}]`, v);
      });
      return;
    }

    append(key, value);
  };

  Object.entries(params).forEach(([key, value]) => {
    process(key, value);
  });

  return qs.join('&');
};

// ── Transport function ─────────────────────────────────────────────

/**
 * Performs the actual HTTP request via axios.
 *
 * This is the **only** function in the codebase that calls axios directly.
 * All other modules go through the middleware pipeline, which eventually
 * invokes this transport.
 */
export const transport = async (ctx: RequestContext): Promise<ResponseContext> => {
  const { config } = ctx;

  const axiosConfig: AxiosRequestConfig = {
    url: config.url,
    method: config.method,
    baseURL: config.baseURL,
    headers: config.headers,
    params: config.params,
    paramsSerializer: serializeParams,
    data: config.data,
    signal: config.signal,
    timeout: config.timeout,
    responseType: config.responseType,
    withCredentials: config.withCredentials,
    withXSRFToken: config.withXSRFToken,
  };

  let response: AxiosResponse;

  try {
    response = await axios(axiosConfig);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      mapAxiosError(error);
    }

    // Non-axios error (should not happen in normal operation)
    throw new NetworkError(error instanceof Error ? error.message : 'Unknown error');
  }

  return {
    data: response.data,
    status: response.status,
    statusText: response.statusText,
    headers: normalizeHeaders(response.headers),
    meta: {},
    config,
  };
};
