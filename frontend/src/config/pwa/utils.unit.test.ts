/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, afterEach } from 'vitest';

import { registerBackgroundSync, registerPeriodicSync } from './utils';

const originalNavigator = navigator;
const originalWindow = globalThis;

type TestState = 'have' | 'donthave' | 'fail';

const delayPromiseRejection = (ms: number, error: any) =>
  vi.fn(() => new Promise((_, reject) => setTimeout(() => reject(error), ms)));

const buildSW = (fail: boolean) => {
  if (fail) {
    return {
      serviceWorker: {
        ready: delayPromiseRejection(100, 'Service Worker error'),
      },
    };
  }
  return {
    serviceWorker: {
      ready: Promise.resolve({
        periodicSync: {
          register: vi.fn(),
        },
        sync: {
          register: vi.fn(),
        },
      }),
    },
  };
};

const buildPerm = (testState: TestState, state: PermissionState) => {
  switch (testState) {
    case 'have': {
      return {
        permissions: {
          query: vi.fn().mockResolvedValueOnce({ state }),
        },
      };
    }
    case 'donthave': {
      return {};
    }
    case 'fail': {
      return {
        permissions: {
          query: delayPromiseRejection(100, 'Permission error'),
        },
      };
    }
  }
};

const mockWorker = (
  state: PermissionState,
  periodicSync: TestState,
  sync: TestState,
  permission: TestState,
) => {
  vi.stubGlobal('navigator', {
    ...buildSW(periodicSync === 'fail' || sync === 'fail'),
    ...buildPerm(permission, state),
  });
  // Provide stubbed managers when feature is expected to exist
  if (periodicSync === 'have')
    (globalThis as any).PeriodicSyncManager = (globalThis as any).PeriodicSyncManager || {};
  if (sync === 'have') (globalThis as any).SyncManager = (globalThis as any).SyncManager || {};
  if (periodicSync === 'donthave') delete (globalThis as any).PeriodicSyncManager;
  if (sync === 'donthave') delete (globalThis as any).SyncManager;
};

afterEach(() => {
  (globalThis as any).PeriodicSyncManager = (originalWindow as any).PeriodicSyncManager;
  (globalThis as any).SyncManager = (originalWindow as any).SyncManager;
  vi.stubGlobal('navigator', originalNavigator);
});

describe('registerBackgroundSync', () => {
  it('should register background sync when supported and granted', async () => {
    mockWorker('granted', 'have', 'have', 'have');

    const result = await registerBackgroundSync('test-tag');
    expect(result).toBe(true);
    expect((await (navigator.serviceWorker.ready as any)).sync.register).toHaveBeenCalledWith(
      'test-tag',
    );
  });

  it('should return false if permission is denied', async () => {
    mockWorker('denied', 'have', 'have', 'have');

    const result = await registerBackgroundSync('test-tag');
    expect(result).toBe(false);
  });

  it('should return false if SyncManager is not supported', async () => {
    mockWorker('granted', 'have', 'donthave', 'have');

    const result = await registerBackgroundSync('test-tag');
    expect(result).toBe(false);
  });

  it('should return false ready failed', async () => {
    mockWorker('granted', 'have', 'fail', 'have');

    const result = await registerBackgroundSync('test-tag');
    expect(result).toBe(false);
  });
});

describe('registerPeriodicSync', () => {
  it('should register periodic sync when supported and granted', async () => {
    mockWorker('granted', 'have', 'have', 'have');

    const result = await registerPeriodicSync('periodic-tag', 3600000);
    expect(result).toBe(true);
    expect(
      (await (navigator.serviceWorker.ready as any)).periodicSync.register,
    ).toHaveBeenCalledWith('periodic-tag', { minInterval: 3600000 });
  });

  it('should return false if PeriodicSyncManager is not supported', async () => {
    mockWorker('granted', 'donthave', 'have', 'have');
    const result = await registerPeriodicSync('periodic-tag', 1000);
    expect(result).toBe(false);
  });

  it('should return false if permission is denied', async () => {
    mockWorker('denied', 'have', 'have', 'have');
    const result = await registerPeriodicSync('periodic-tag', 1000);
    expect(result).toBe(false);
  });

  it('should return false if fail to get ready', async () => {
    mockWorker('granted', 'fail', 'have', 'have');
    const result = await registerPeriodicSync('periodic-tag', 1000);
    expect(result).toBe(false);
  });

  it('should return false if permission fail', async () => {
    mockWorker('granted', 'fail', 'have', 'fail');
    const result = await registerPeriodicSync('periodic-tag', 1000);
    expect(result).toBe(false);
  });

  it('should return false if permission dont exist', async () => {
    mockWorker('granted', 'fail', 'have', 'donthave');
    const result = await registerPeriodicSync('periodic-tag', 1000);
    expect(result).toBe(false);
  });
});
