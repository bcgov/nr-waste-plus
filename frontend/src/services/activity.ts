/**
 * User-activity signal used to decide whether a session may be renewed.
 *
 * The rule is deliberately simple and privacy-free: a user is "active" when a
 * pointer or key event was observed within the idle window AND the tab is
 * visible. A hidden tab is idle immediately — the realm session is allowed to
 * expire while the user is away. State is module-scoped (per tab) and never
 * persisted; it is reset whenever tracking starts.
 */
const IDLE_THRESHOLD_MS = 5 * 60 * 1000;

let lastActivityAt = Date.now();
let subscribers = 0;
let detachListeners: (() => void) | undefined;

/**
 * Reports whether the user is currently active for renewal purposes.
 *
 * @returns `true` when there was recent interaction and the tab is visible.
 */
export const isUserActive = (): boolean => {
  const document = globalThis.document;
  if (!document || document.hidden) return false;
  return Date.now() - lastActivityAt < IDLE_THRESHOLD_MS;
};

/**
 * Starts listening for activity events. Safe to call from multiple consumers;
 * listeners are removed when the last subscriber stops.
 *
 * @returns A function that releases this subscriber.
 */
export const startActivityTracking = (): (() => void) => {
  const document = globalThis.document;
  if (!document) return () => undefined;

  subscribers += 1;
  lastActivityAt = Date.now();

  if (!detachListeners) {
    const onActivity = (): void => {
      lastActivityAt = Date.now();
    };
    const onVisibilityChange = (): void => {
      lastActivityAt = document.hidden ? 0 : Date.now();
    };

    document.addEventListener('pointerdown', onActivity, { passive: true });
    document.addEventListener('keydown', onActivity, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    detachListeners = () => {
      document.removeEventListener('pointerdown', onActivity);
      document.removeEventListener('keydown', onActivity);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      detachListeners = undefined;
    };
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    subscribers -= 1;
    if (subscribers === 0) detachListeners?.();
  };
};

/**
 * Resets the activity clock, for example after logout.
 */
export const resetActivityTracking = (): void => {
  lastActivityAt = Date.now();
};
