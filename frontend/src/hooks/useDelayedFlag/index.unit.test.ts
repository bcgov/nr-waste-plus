import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import useDelayedFlag, { SKELETON_DELAY_MS } from './index';

describe('useDelayedFlag', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shouldReturnFalse_whenActiveBelowDelay', () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useDelayedFlag(true));

    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(SKELETON_DELAY_MS - 1);
    });

    expect(result.current).toBe(false);
  });

  it('shouldReturnTrue_whenActiveReachesDelay', () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useDelayedFlag(true));

    act(() => {
      vi.advanceTimersByTime(SKELETON_DELAY_MS);
    });

    expect(result.current).toBe(true);
  });

  it('shouldResetToFalse_whenActiveTurnsOff', () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active), {
      initialProps: { active: true },
    });

    act(() => {
      vi.advanceTimersByTime(SKELETON_DELAY_MS);
    });
    expect(result.current).toBe(true);

    rerender({ active: false });
    expect(result.current).toBe(false);
  });

  it('shouldReapplyDelay_whenActiveRestarts', () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active), {
      initialProps: { active: true },
    });

    act(() => {
      vi.advanceTimersByTime(SKELETON_DELAY_MS);
    });
    expect(result.current).toBe(true);

    rerender({ active: false });
    expect(result.current).toBe(false);

    rerender({ active: true });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(SKELETON_DELAY_MS - 1);
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);
  });

  it('shouldCancelPendingTimer_whenComponentUnmounts', () => {
    vi.useFakeTimers();

    const { unmount } = renderHook(() => useDelayedFlag(true));
    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('shouldUseCustomDelay_whenProvided', () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useDelayedFlag(true, 50));

    act(() => {
      vi.advanceTimersByTime(49);
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);
  });
});
