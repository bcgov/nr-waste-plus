/**
 * Versioned storage key for the disabled devtools panels preference.
 *
 * The `v1` suffix allows future preference shape changes to migrate or
 * abandon old keys without colliding with persisted state from older builds.
 */
export const DISABLED_PANELS_STORAGE_KEY = 'nrw.devtools.disabled-panels.v1';

/**
 * Reads the persisted list of disabled devtools panel ids.
 *
 * The value is guarded: any missing key, corrupted JSON, non-array payload,
 * or non-string entry degrades to an empty list rather than throwing.
 *
 * @returns The disabled panel ids, or an empty list when none are persisted.
 */
export const readDisabledPanelIds = (): string[] => {
  try {
    const raw = globalThis.localStorage.getItem(DISABLED_PANELS_STORAGE_KEY);
    if (raw === null) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry): entry is string => typeof entry === 'string');
  } catch {
    return [];
  }
};

/**
 * Persists the list of disabled devtools panel ids.
 *
 * Write failures (for example, storage being unavailable) are swallowed:
 * the preference is a developer convenience, never a correctness dependency.
 *
 * @param ids The disabled panel ids to persist.
 */
export const writeDisabledPanelIds = (ids: readonly string[]): void => {
  try {
    globalThis.localStorage.setItem(DISABLED_PANELS_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Storage unavailable — the in-session toggle still works, it just won't persist.
  }
};
