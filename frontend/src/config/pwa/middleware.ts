/**
 * Middleware utilities for handling offline data and mutations using IndexedDB.
 *
 * These middlewares enable offline-first support for API requests by saving
 * and retrieving data from IndexedDB. They follow the Koa-style pipeline
 * `Middleware` signature from `@/http/types` and can be registered via
 * `createApiClient({ middlewares: [...] })`.
 *
 * Note: To activate offline behavior, you must provide a valid
 * `IdbMiddlewareOptions` object with the `idbSave` property set to true.
 * If not provided, the middleware will not attempt to persist or retrieve
 * data from IndexedDB.
 *
 * Status: **dormant** — not registered on the app client; preserved for the
 * future offline mode (`featureFlags['offline-mode-enabled']`).
 *
 * @module config/pwa/middleware
 */

import { addMutation, addOfflineItem, getOfflineItem } from '@/config/pwa/idb/config';
import { onlineStatusStore } from '@/hooks/useOfflineMode/onlineStatusStore';

import { registerPeriodicSync } from './utils';

import type { IdbMiddlewareOptions } from '@/config/pwa/types';
import type { Middleware } from '@/http/types';

/** HTTP methods treated as mutations for offline queuing. */
const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Middleware for caching GET/response data for offline usage.
 *
 * When `idbSave` is enabled in the provided {@link IdbMiddlewareOptions}:
 * - Successful responses are saved to IndexedDB for offline access.
 * - On failure (when offline), cached data is served from IndexedDB
 *   instead of propagating the error.
 *
 * @param cacheable - Options to control offline caching. Must provide
 *   `idbSave: true` to enable offline behavior.
 * @returns A {@link Middleware} providing offline read caching.
 */
export const offlineDataMiddleware = (cacheable?: IdbMiddlewareOptions): Middleware => {
  const offlineData: Middleware = async (ctx, next) => {
    try {
      const res = await next();

      if (cacheable?.idbSave) {
        const key = cacheable.idbKey || ctx.config.url || '';
        await addOfflineItem(key, res.data);
        await registerPeriodicSync(key, 30 * 1000);
      }

      return res;
    } catch (error) {
      if (cacheable?.idbSave && !onlineStatusStore.getStatus()) {
        const key = cacheable.idbKey || ctx.config.url || '';
        const entry = await getOfflineItem(key);
        if (entry) {
          return {
            data: entry,
            status: 200,
            statusText: 'OK (offline cache)',
            headers: { 'x-offline-cache': 'true' },
            meta: { offlineCache: true },
            config: ctx.config,
          };
        }
      }

      throw error;
    }
  };

  return offlineData;
};

/**
 * Middleware for queuing mutational (write) requests when offline.
 *
 * When `idbSave` is enabled in the provided {@link IdbMiddlewareOptions}:
 * - Mutation requests (POST, PUT, PATCH, DELETE) are saved to IndexedDB
 *   when offline, to be replayed later.
 * - On failure (when offline), a successful 204 response is returned,
 *   indicating the mutation has been queued.
 *
 * @param cacheable - Options to control offline mutation queuing. Must
 *   provide `idbSave: true` to enable offline behavior.
 * @returns A {@link Middleware} providing offline mutation queuing.
 */
export const offlineMutationMiddleware = (cacheable?: IdbMiddlewareOptions): Middleware => {
  const offlineMutation: Middleware = async (ctx, next) => {
    const isMutation = MUTATION_METHODS.includes(ctx.config.method);

    if (cacheable?.idbSave && !onlineStatusStore.getStatus() && isMutation) {
      await addMutation({
        url: ctx.config.url,
        method: ctx.config.method,
        data: ctx.config.data,
        headers: ctx.config.headers,
      });
    }

    try {
      return await next();
    } catch (error) {
      if (cacheable?.idbSave && !onlineStatusStore.getStatus() && isMutation) {
        return {
          data: null,
          status: 204,
          statusText: 'No Content (offline mutation queued)',
          headers: {},
          meta: { offlineQueued: true },
          config: ctx.config,
        };
      }

      throw error;
    }
  };

  return offlineMutation;
};
