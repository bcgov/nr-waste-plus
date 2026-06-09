/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from 'vitest';

export type PwaTestState = 'have' | 'donthave' | 'fail';

const originalNavigator = navigator;
const originalWindow = globalThis;

/**
 * Create a mock for Service Worker.ready with optional sync/periodicSync managers.
 * @param fail - If true, ready promise will reject
 * @returns Partial navigator object with serviceWorker property
 */
export const buildSW = (fail: boolean) => {
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

/**
 * Create a mock for Permissions API.
 * @param testState - 'have' to include permissions, 'donthave' to omit, 'fail' to reject
 * @param state - The PermissionStatus.state to return ('granted', 'denied', 'prompt')
 * @returns Partial navigator object with permissions property
 */
export const buildPerm = (testState: PwaTestState, state: PermissionState) => {
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

/**
 * Utility to create a delayed promise rejection for error scenarios.
 * @param ms - Delay in milliseconds before rejection
 * @param error - Error to reject with
 * @returns Mock function that returns the delayed rejection
 */
const delayPromiseRejection = (ms: number, error: any) =>
  vi.fn(() => new Promise((_, reject) => setTimeout(() => reject(error), ms)));

/**
 * Mock the navigator.serviceWorker and global sync managers for PWA testing.
 * @param state - Permission state ('granted', 'denied', 'prompt')
 * @param periodicSync - 'have' to provide PeriodicSyncManager, 'donthave' to omit, 'fail' to error
 * @param sync - 'have' to provide SyncManager, 'donthave' to omit, 'fail' to error
 * @param permission - 'have' to provide Permissions API, 'donthave' to omit, 'fail' to error
 */
export const mockPwaWorker = (
  state: PermissionState,
  periodicSync: PwaTestState,
  sync: PwaTestState,
  permission: PwaTestState,
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

/**
 * Restore PWA-related globals to their original state.
 * Call this in afterEach to cleanup after PWA mocking.
 */
export const restorePwaGlobals = () => {
  (globalThis as any).PeriodicSyncManager = (originalWindow as any).PeriodicSyncManager;
  (globalThis as any).SyncManager = (originalWindow as any).SyncManager;
  vi.stubGlobal('navigator', originalNavigator);
};
