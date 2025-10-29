/**
 * IndexedDB configuration and utility functions for PWA offline and mutation management.
 *
 * Provides helpers to interact with the offline cache and mutation queue using idb.
 * Includes versioning, TTL, and error handling for offline-first scenarios.
 */
import { openDB, type IDBPObjectStore } from 'idb';
import { DateTime } from 'luxon';

import {
  type CachedValue,
  type PwaDB,
  CacheVersionMismatchError,
  NoOfflineItemError,
} from '@/config/pwa/types';

// Database name and version. The name should be parametized later on
const DB_NAME = 'pwa-db';
const DB_VERSION = 1;
const QUEUED_MUTATIONS = 'mutations';
const OFFLINE_STORE = 'offline';
/**
 * Opens (or creates) the IndexedDB database for the PWA.
 * Handles object store creation and version upgrades.
 * @returns {Promise<IDBPDatabase<PwaDB>>} The opened database instance.
 */
const getDB = () => {
  return openDB<PwaDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(QUEUED_MUTATIONS)) {
        db.createObjectStore(QUEUED_MUTATIONS, { keyPath: 'seq', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(OFFLINE_STORE)) {
        db.createObjectStore(OFFLINE_STORE);
      }
    },
  });
};

/* Offline item management */
/**
 * Adds or updates an item in the offline cache store.
 * @template T
 * @param {string} key - The cache key.
 * @param {T} value - The value to cache.
 * @param {string} [version] - Optional version string for cache validation.
 * @returns {Promise<void>}
 */
export const addOfflineItem = async <T>(key: string, value: T, version?: string): Promise<void> => {
  const db = await getDB();
  const payload: CachedValue<T> = {
    version,
    timestamp: DateTime.now().toMillis(),
    value,
  };
  await db.put(OFFLINE_STORE, payload, key);
};
/**
 * Retrieves an item from the offline cache store.
 * Throws if not found, version mismatch, or expired by TTL.
 * @template T
 * @param {string} key - The cache key.
 * @param {string} [expectedVersion] - Optional version to validate against.
 * @param {number} [ttl] - Optional time-to-live in milliseconds.
 * @returns {Promise<T>} The cached value.
 * @throws {NoOfflineItemError} If the item is not found or expired.
 * @throws {CacheVersionMismatchError} If the version does not match.
 */
export const getOfflineItem = async <T>(
  key: string,
  expectedVersion?: string,
  ttl?: number,
): Promise<T> => {
  const db = await getDB();
  return new Promise<T>((resolve, reject) => {
    db.get(OFFLINE_STORE, key).then((cache) => {
      const data = cache as CachedValue<T> | undefined;
      if (data === undefined) {
        reject(new NoOfflineItemError(key));
      } else {
        if (expectedVersion && data.version !== expectedVersion) {
          reject(new CacheVersionMismatchError(key, expectedVersion, data.version));
          return;
        }
        if (ttl && DateTime.now().toMillis() - data.timestamp > ttl) {
          deleteOfflineItem(key).then(() => {
            reject(new NoOfflineItemError(key));
          });
          return;
        }
        resolve(data.value);
      }
    });
  });
};
/**
 * Deletes an item from the offline cache store by key.
 * @param {string} key - The cache key to delete.
 * @returns {Promise<void>}
 */
export const deleteOfflineItem = async (key: string): Promise<void> => {
  const db = await getDB();
  await db.delete(OFFLINE_STORE, key);
};
/**
 * Retrieves all items from the offline cache store.
 * @template T
 * @returns {Promise<T[]>} Array of cached values.
 */
export const getAllOfflineItems = async <T>() => {
  const db = await getDB();
  return db.getAll(OFFLINE_STORE) as Promise<T[]>;
};

/* Mutation management */
/**
 * Adds a mutation to the queued mutations store.
 * @template T
 * @param {T} value - The mutation value.
 * @returns {Promise<void>}
 */
export const addMutation = async <T>(value: T) => {
  const db = await getDB();
  await db.add(QUEUED_MUTATIONS, { data: value, timesStamp: DateTime.now().toMillis() });
};
/**
 * Retrieves all pending mutations from the queued mutations store.
 * @returns {Promise<any[]>} Array of pending mutations.
 */
export const getAllPendingMutations = async () => {
  const db = await getDB();
  return db.getAll(QUEUED_MUTATIONS);
};

/**
 * Runs a transaction on the queued mutations store with the specified mode.
 * @template Mode
 * @template T
 * @param {Mode} mode - The transaction mode ('readonly' or 'readwrite').
 * @param {(store: IDBPObjectStore<PwaDB, [typeof QUEUED_MUTATIONS], typeof QUEUED_MUTATIONS, Mode>) => Promise<T>} callback - Function to execute within the transaction.
 * @returns {Promise<T>} The result of the callback.
 */
export const runMutationTransaction = async <Mode extends IDBTransactionMode, T>(
  mode: Mode,
  callback: (
    store: IDBPObjectStore<PwaDB, [typeof QUEUED_MUTATIONS], typeof QUEUED_MUTATIONS, Mode>,
  ) => Promise<T>,
): Promise<T> => {
  const db = await getDB();
  const tx = db.transaction(QUEUED_MUTATIONS, mode);
  const store = tx.objectStore(QUEUED_MUTATIONS);
  const result = await callback(store);
  await tx.done;
  return result;
};
