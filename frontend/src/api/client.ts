/**
 * Application API client — the configured transport for the backend.
 *
 * Assembles the reference middleware pipeline via `createApiClient()`
 * with this project's wiring:
 *
 * - **baseURL** — `VITE_BACKEND_URL` (Caddy-proxied Spring backend)
 * - **tokenProvider** — Cognito access token read from the session
 *   cookie on every request (mirrors the pre-migration `TOKEN` resolver)
 * - **credentials/XSRF** — the backend uses
 *   `CookieCsrfTokenRepository.withHttpOnlyFalse()`, so mutating
 *   requests must carry cookies plus the `X-XSRF-TOKEN` header
 * - **timeout** — 60 s default, matching the legacy axios instance
 * - **extractHeaders** — `location` for create endpoints that return
 *   the new resource ID in the `Location` header
 * - **custom middlewares** — failure notification (outermost) and
 *   ProblemDetails normalisation (inside it), reproducing the legacy
 *   interceptor order: on the error path, bodies are normalised first,
 *   then the toast is composed.
 *
 * Resource classes in `api/resources/` are constructed with this
 * client; TanStack Query hooks call the resources. Nothing outside
 * `http/transport.ts` touches axios.
 *
 * @module api/client
 */

import { getUserAccessTokenFromCookie } from '@/context/auth/authUtils';
import { env } from '@/env';
import { createApiClient } from '@/http/api-client';

import { failureNotificationMiddleware } from './middlewares/failureNotification';
import { problemDetailsMiddleware } from './middlewares/problemDetails';

import type { TokenProvider } from '@/http/middlewares/auth';
import type { Transport } from '@/http/types';

/**
 * Resolves the current Cognito access token from the session cookie.
 *
 * Called on every request so a refreshed session is picked up without
 * re-creating the client. Returns `null` when no session exists, which
 * makes the auth middleware omit the `Authorization` header entirely
 * (public endpoints keep working pre-login).
 */
export const cookieTokenProvider: TokenProvider = async () =>
  getUserAccessTokenFromCookie() ?? null;

/**
 * The application-wide API transport.
 *
 * Middleware order matters: `failureNotificationMiddleware` is listed
 * first so it sits **outside** `problemDetailsMiddleware` — errors
 * bubble through problemDetails (normalisation) before reaching the
 * notification middleware (toast).
 */
export const client: Transport = createApiClient({
  baseURL: env.VITE_BACKEND_URL,
  tokenProvider: cookieTokenProvider,
  timeout: 60_000,
  withCredentials: true,
  withXSRFToken: true,
  defaultHeaders: { Accept: 'application/json' },
  extractHeaders: ['location'],
  middlewares: [failureNotificationMiddleware(), problemDetailsMiddleware()],
});
