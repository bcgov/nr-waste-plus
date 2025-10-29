/**
 * Middleware utilities for handling offline data and mutations using IndexedDB.
 *
 * These middlewares enable offline-first support for API requests by saving and retrieving data from IndexedDB.
 *
 * Note: To activate offline behavior, you must provide a valid `IdbMiddlewareOptions` object with the `idbSave` property set to true.
 * If not provided, the middleware will not attempt to persist or retrieve data from IndexedDB.
 */
import { addMutation, addOfflineItem, getOfflineItem } from '@/config/pwa/idb/config';
import { onlineStatusStore } from '@/hooks/useOfflineMode/onlineStatusStore';

import { registerPeriodicSync } from './utils';

import type { ApiMiddleware } from '@/config/api/types';
import type { IdbMiddlewareOptions } from '@/config/pwa/types';

/**
 * Middleware implementation for caching GET/response data for offline usage.
 *
 * When `idbSave` is enabled in the provided `IdbMiddlewareOptions`, this middleware will:
 * - Save successful API responses to IndexedDB for offline access.
 * - On failure (when offline), attempt to return cached data from IndexedDB instead of failing.
 *
 * @param {IdbMiddlewareOptions} [cacheable] - Options to control offline caching. Must provide `idbSave: true` to enable offline behavior.
 * @returns {ApiMiddleware} Middleware for handling offline data caching and retrieval.
 */
export const offlineDataMiddleware = (cacheable?: IdbMiddlewareOptions): ApiMiddleware => ({
  async response(axiosResponse) {
    if (cacheable?.idbSave) {
      const key = cacheable?.idbKey || axiosResponse.config.url || '';
      await addOfflineItem(key, axiosResponse.data);
      await registerPeriodicSync(key, 30 * 1000);
    }
    return axiosResponse;
  },
  async failure(error) {
    if (cacheable?.idbSave && !onlineStatusStore.getStatus()) {
      const key = cacheable?.idbKey || error.config?.url || '';
      const entry = await getOfflineItem(key);
      if (entry) {
        return {
          ...error.config,
          status: 200,
          statusText: 'OK (offline cache)',
          data: entry,
          headers: { ...error.config?.headers, 'x-offline-cache': 'true' },
          config: error.config,
        };
      }
    }
    throw error;
  },
});

/**
 * Middleware implementation for queuing mutational (write) requests when offline.
 *
 * When `idbSave` is enabled in the provided `IdbMiddlewareOptions`, this middleware will:
 * - Save mutation requests (POST, PUT, DELETE, etc.) to IndexedDB when offline, to be replayed later.
 * - Return a successful response (204) when offline, indicating the mutation has been queued.
 *
 * @param {IdbMiddlewareOptions} [cacheable] - Options to control offline mutation queuing. Must provide `idbSave: true` to enable offline behavior.
 * @returns {ApiMiddleware} Middleware for handling offline mutation queuing.
 */
export const offlineMutationMiddleware = (cacheable?: IdbMiddlewareOptions): ApiMiddleware => ({
  async request(config) {
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
      config.method?.toUpperCase() || '',
    );
    if (cacheable?.idbSave && !onlineStatusStore.getStatus() && isMutation) {
      const data = {
        url: config.url,
        method: config.method,
        data: config.data,
        headers: config.headers,
      };
      await addMutation(data);
    }
    return config;
  },
  async failure(error) {
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
      error.config?.method?.toUpperCase() || '',
    );
    if (cacheable?.idbSave && !onlineStatusStore.getStatus() && isMutation) {
      return {
        ...error.config,
        status: 204,
        statusText: 'No Content (offline mutation queued)',
        data: null,
        headers: {},
        config: error.config,
      };
    }
    throw error;
  },
});
