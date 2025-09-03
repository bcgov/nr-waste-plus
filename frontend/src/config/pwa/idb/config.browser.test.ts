/* eslint-disable @typescript-eslint/no-explicit-any */

import { DateTime, Settings } from 'luxon';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { NoOfflineItemError, CacheVersionMismatchError } from '@/config/pwa/types';

import * as idbConfig from './config';

// Mocks
vi.mock('idb', () => {
  const stores: Record<string, Record<string, any>> = {
    offline: {},
    mutations: {},
  };
  return {
    openDB: vi.fn(async (_name, _version, { upgrade }) => {
      const db = {
        objectStoreNames: {
          contains: (name: string) => name in stores,
        },
        createObjectStore: (name: string) => {
          stores[name] = {};
        },
      };
      if (upgrade) upgrade(db);
      return {
        put: async (store: string, value: any, key: string) => {
          stores[store][key] = value;
        },
        get: async (store: string, key: string) => stores[store][key],
        delete: async (store: string, key: string) => {
          delete stores[store][key];
        },
        getAll: async (store: string) => Object.values(stores[store]),
        add: async (store: string, value: any) => {
          const key = String(Object.keys(stores[store]).length + 1);
          stores[store][key] = value;
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        transaction: (store: string, _mode: string) => {
          return {
            objectStore: () => ({
              put: async (value: any, key: string) => {
                stores[store][key] = value;
              },
              getAll: async () => Object.values(stores[store]),
            }),
            done: Promise.resolve(),
          };
        },
      };
    }),
  };
});

const key = 'test-key';
const value = { foo: 'bar' };
const version = 'v1';

// Helper to reset mocks
beforeEach(() => {
  vi.clearAllMocks();
});

describe('idb config', () => {
  it('addOfflineItem and getOfflineItem (success)', async () => {
    await idbConfig.addOfflineItem(key, value, version);
    const result = await idbConfig.getOfflineItem(key, version);
    expect(result).toEqual(value);
  });

  it('getOfflineItem throws NoOfflineItemError if not found', async () => {
    await expect(idbConfig.getOfflineItem('missing')).rejects.toThrow(NoOfflineItemError);
  });

  it('getOfflineItem throws CacheVersionMismatchError if version mismatch', async () => {
    await idbConfig.addOfflineItem(key, value, 'v2');
    await expect(idbConfig.getOfflineItem(key, 'v1')).rejects.toThrow(CacheVersionMismatchError);
  });

  it('getOfflineItem throws NoOfflineItemError if expired by TTL', async () => {
    const initialTime = DateTime.local(2025, 8, 12, 0, 0, 0, 0);
    const finalTime = DateTime.local(2025, 8, 12, 1, 0, 0, 0);
    // Patch DateTime.now to simulate old timestamp
    Settings.now = () => initialTime.toMillis();
    await idbConfig.addOfflineItem(key, value, version);
    // Now simulate current time much later
    Settings.now = () => finalTime.toMillis();
    await expect(idbConfig.getOfflineItem(key, version, 1)).rejects.toThrow(NoOfflineItemError);
  });

  it('deleteOfflineItem removes the item', async () => {
    await idbConfig.addOfflineItem(key, value, version);
    await idbConfig.deleteOfflineItem(key);
    await expect(idbConfig.getOfflineItem(key)).rejects.toThrow(NoOfflineItemError);
  });

  it('getAllOfflineItems returns all cached items', async () => {
    await idbConfig.addOfflineItem('a', { a: 1 });
    await idbConfig.addOfflineItem('b', { b: 2 });
    const all = await idbConfig.getAllOfflineItems();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it('addMutation and getAllPendingMutations', async () => {
    await idbConfig.addMutation({ m: 1 });
    const all = await idbConfig.getAllPendingMutations();
    expect(all.length).toBeGreaterThanOrEqual(1);
  });

  it('runMutationTransaction works with callback', async () => {
    const result = await idbConfig.runMutationTransaction('readwrite', async (store) => {
      await store.put?.({ test: 1 }, 'k');
      return await store.getAll();
    });
    expect(Array.isArray(result)).toBe(true);
  });
});
