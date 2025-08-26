import type { DBSchema } from 'idb';

export interface PwaDB extends DBSchema {
  mutations: {
    key: string;
    value: unknown;
  };
  offline: {
    key: string;
    value: unknown;
  };
}

export interface CachedValue<T> {
  version?: string;
  timestamp: number;
  value: T;
}

export interface IdbMiddlewareOptions {
  idbSave?: boolean;
  idbKey?: string;
}

export class NoOfflineItemError extends Error {
  constructor(key: string) {
    super(`No offline item found for key: ${key}`);
    this.name = 'NoOfflineItemError';
  }
}

export class CacheVersionMismatchError extends Error {
  constructor(key: string, expectedVersion: string, actualVersion: string | undefined) {
    super(
      `Version mismatch for key: ${key}. Expected: ${expectedVersion}, Actual: ${actualVersion}`,
    );
    this.name = 'CacheVersionMismatchError';
  }
}
