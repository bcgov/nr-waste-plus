/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, afterEach } from 'vitest';

import { registerBackgroundSync, registerPeriodicSync } from './utils';

import { mockPwaWorker, restorePwaGlobals } from '@/config/tests/pwaTestHelper';

afterEach(() => {
  restorePwaGlobals();
});

describe('registerBackgroundSync', () => {
  it('should register background sync when supported and granted', async () => {
    mockPwaWorker('granted', 'have', 'have', 'have');

    const result = await registerBackgroundSync('test-tag');
    expect(result).toBe(true);
    expect((await (navigator.serviceWorker.ready as any)).sync.register).toHaveBeenCalledWith(
      'test-tag',
    );
  });

  it('should return false if permission is denied', async () => {
    mockPwaWorker('denied', 'have', 'have', 'have');

    const result = await registerBackgroundSync('test-tag');
    expect(result).toBe(false);
  });

  it('should return false if SyncManager is not supported', async () => {
    mockPwaWorker('granted', 'have', 'donthave', 'have');

    const result = await registerBackgroundSync('test-tag');
    expect(result).toBe(false);
  });

  it('should return false ready failed', async () => {
    mockPwaWorker('granted', 'have', 'fail', 'have');

    const result = await registerBackgroundSync('test-tag');
    expect(result).toBe(false);
  });
});

describe('registerPeriodicSync', () => {
  it('should register periodic sync when supported and granted', async () => {
    mockPwaWorker('granted', 'have', 'have', 'have');

    const result = await registerPeriodicSync('periodic-tag', 3600000);
    expect(result).toBe(true);
    expect(
      (await (navigator.serviceWorker.ready as any)).periodicSync.register,
    ).toHaveBeenCalledWith('periodic-tag', { minInterval: 3600000 });
  });

  it('should return false if PeriodicSyncManager is not supported', async () => {
    mockPwaWorker('granted', 'donthave', 'have', 'have');
    const result = await registerPeriodicSync('periodic-tag', 1000);
    expect(result).toBe(false);
  });

  it('should return false if permission is denied', async () => {
    mockPwaWorker('denied', 'have', 'have', 'have');
    const result = await registerPeriodicSync('periodic-tag', 1000);
    expect(result).toBe(false);
  });

  it('should return false if fail to get ready', async () => {
    mockPwaWorker('granted', 'fail', 'have', 'have');
    const result = await registerPeriodicSync('periodic-tag', 1000);
    expect(result).toBe(false);
  });

  it('should return false if permission fail', async () => {
    mockPwaWorker('granted', 'fail', 'have', 'fail');
    const result = await registerPeriodicSync('periodic-tag', 1000);
    expect(result).toBe(false);
  });

  it('should return false if permission dont exist', async () => {
    mockPwaWorker('granted', 'fail', 'have', 'donthave');
    const result = await registerPeriodicSync('periodic-tag', 1000);
    expect(result).toBe(false);
  });
});
