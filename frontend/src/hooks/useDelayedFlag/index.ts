import { useEffect, useState } from 'react';

/**
 * Delay in milliseconds before a loading skeleton is shown.
 *
 * Sub-300 ms responses complete before the timer fires, so the skeleton never
 * flashes for fast requests.
 */
export const SKELETON_DELAY_MS = 300;

/**
 * Turns a boolean condition into a delayed boolean flag.
 *
 * The returned flag flips to `true` only after `active` has stayed `true`
 * continuously for `delayMs`, and resets to `false` as soon as `active`
 * becomes `false`. Use it to defer transient UI such as a loading skeleton.
 *
 * @param active - The condition being observed (for example `query.isLoading`).
 * @param delayMs - How long `active` must hold before the flag turns on.
 * @returns `true` once the condition has been active for `delayMs`.
 *
 * @example
 * ```tsx
 * const showSkeleton = useDelayedFlag(isLoading, SKELETON_DELAY_MS);
 * return isLoading ? (showSkeleton ? <Skeleton /> : null) : <Content />;
 * ```
 */
const useDelayedFlag = (active: boolean, delayMs: number = SKELETON_DELAY_MS): boolean => {
  const [elapsed, setElapsed] = useState(false);
  const [wasActive, setWasActive] = useState(active);

  // Re-arm during render whenever `active` toggles, following React's
  // "adjust state when a prop changes" pattern. Resetting here keeps the
  // effect below free of synchronous setState calls.
  if (wasActive !== active) {
    setWasActive(active);
    setElapsed(false);
  }

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const timer = setTimeout(() => setElapsed(true), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs]);

  return elapsed;
};

export default useDelayedFlag;
