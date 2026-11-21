import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isUserActive, startActivityTracking, resetActivityTracking } from './activity';

describe('user activity tracking', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-20T12:00:00Z'));
    resetActivityTracking();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('treats a freshly loaded, visible tab as active', () => {
    expect(isUserActive()).toBe(true);
  });

  it('becomes idle after five minutes without interaction', () => {
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    expect(isUserActive()).toBe(false);
  });

  it('resets the idle clock on pointer and key activity', () => {
    const stop = startActivityTracking();
    vi.advanceTimersByTime(4 * 60 * 1000);
    document.dispatchEvent(new Event('pointerdown'));
    vi.advanceTimersByTime(4 * 60 * 1000);
    expect(isUserActive()).toBe(true);

    vi.advanceTimersByTime(60 * 1000 + 1);
    expect(isUserActive()).toBe(false);
    stop();
  });

  it('treats a hidden tab as idle immediately', () => {
    const stop = startActivityTracking();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(isUserActive()).toBe(false);
    stop();
  });
});
