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
