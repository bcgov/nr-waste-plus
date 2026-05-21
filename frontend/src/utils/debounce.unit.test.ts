import { describe, it, expect, vi, afterEach } from 'vitest';

import { debounce } from './debounce';

describe('debounce utility', () => {
  afterEach(() => {
    // restore real timers between tests
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('debounces a synchronous function and resolves with its value', async () => {
    vi.useFakeTimers();

    const fn = vi.fn((n: number) => n * 2);
    const debounced = debounce(fn, 200);

    const p = debounced(3);

    await vi.advanceTimersByTimeAsync(200);
    // flush microtasks queued by Promise.resolve(fn(...))
    await Promise.resolve();

    await expect(p).resolves.toBe(6);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(3);
  });

  it('only invokes the last call when called rapidly', async () => {
    vi.useFakeTimers();

    const fn = vi.fn((n: number) => n + 1);
    const debounced = debounce(fn, 100);

    const p1 = debounced(1);
    const p2 = debounced(2);

    await vi.advanceTimersByTimeAsync(100);
    await Promise.resolve();

    // only the last call should have been invoked
    await expect(p2).resolves.toBe(3);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(2);

    // p1 is the older promise; by design it does not resolve because
    // its scheduled timer was cleared by the subsequent call.
    // We don't await p1 here to avoid hanging the test.
  });

  it('supports async wrapped functions', async () => {
    vi.useFakeTimers();

    const fn = vi.fn(async (n: number) => {
      // simulate async work
      await Promise.resolve();
      return n * 5;
    });

    const debounced = debounce(fn, 30);
    const p = debounced(2);

    await vi.advanceTimersByTimeAsync(30);
    await Promise.resolve();

    await expect(p).resolves.toBe(10);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('forwards thrown errors as rejected promises', async () => {
    vi.useFakeTimers();

    const fn = vi.fn(() => {
      throw new Error('boom');
    });

    const debounced = debounce(fn, 50);
    const p = debounced(1);

    await vi.advanceTimersByTimeAsync(50);
    await Promise.resolve();

    await expect(p).rejects.toThrow('boom');
  });
});
