import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, afterEach, vi, beforeAll, afterAll } from 'vitest';

import useOfflineMode from './index';

describe('useOfflineMode', () => {
  let originalNavigatorOnLine: boolean;

  beforeAll(() => {
    originalNavigatorOnLine = window.navigator.onLine;
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });
  });

  afterEach(() => {
    // Reset to online after each test
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
  });

  afterAll(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => originalNavigatorOnLine,
    });
  });

  it('should return online status initially', () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
    const { result } = renderHook(() => useOfflineMode());
    expect(result.current.isOnline).toBe(true);
  });

  it('should update when going offline', () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
    const { result } = renderHook(() => useOfflineMode());
    expect(result.current.isOnline).toBe(true);

    act(() => {
      vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.isOnline).toBe(false);
  });

  it('should update when going back online', () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    const { result } = renderHook(() => useOfflineMode());
    expect(result.current.isOnline).toBe(false);

    act(() => {
      vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.isOnline).toBe(true);
  });
});
