/* eslint-disable @typescript-eslint/no-explicit-any */

import { DateTime, Settings } from 'luxon';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import * as idbConfig from './config';

import { NoOfflineItemError, CacheVersionMismatchError } from '@/config/pwa/types';

const mockTransaction = (
  stores: Record<string, Record<string, any>>,
): ((
  store: string,
  _mode: string,
) => {
  objectStore: () => {
    put: (value: any, key: string) => Promise<void>;
    getAll: () => Promise<any[]>;
  };
  done: Promise<void>;
}) => {
  return (store: string) => {
    return {
      objectStore: () => ({
        put: async (value: any, key: string) => {
          stores[store][key] = value;
        },
        getAll: async () => Object.values(stores[store]),
      }),
      done: Promise.resolve(),
    };
  };
};

const mockAdd = (
  stores: Record<string, Record<string, any>>,
): ((store: string, value: any) => Promise<void>) => {
  return async (store: string, value: any) => {
    const key = String(Object.keys(stores[store]).length + 1);
    stores[store][key] = value;
  };
};

const mockGetAll = (
  stores: Record<string, Record<string, any>>,
): ((store: string) => Promise<any[]>) => {
  return async (store: string) => Object.values(stores[store]);
};

const mockDelete = (
  stores: Record<string, Record<string, any>>,
): ((store: string, key: string) => Promise<void>) => {
  return async (store: string, key: string) => {
    delete stores[store][key];
  };
};

const mockGet = (
  stores: Record<string, Record<string, any>>,
): ((store: string, key: string) => Promise<any>) => {
  return async (store: string, key: string) => stores[store][key];
};

const mockPut = (
  stores: Record<string, Record<string, any>>,
): ((store: string, value: any, key: string) => Promise<void>) => {
  return async (store: string, value: any, key: string) => {
    stores[store][key] = value;
  };
};

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
        put: mockPut(stores),
        get: mockGet(stores),
        delete: mockDelete(stores),
        getAll: mockGetAll(stores),
        add: mockAdd(stores),

        transaction: mockTransaction(stores),
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
