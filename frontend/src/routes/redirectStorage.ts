const REDIRECT_KEY = 'redirectAfterLogin';

/**
 * Persists a post-login redirect target in session storage.
 *
 * @param url The in-app URL to restore after authentication completes.
 */
export const persistRedirectUrl = (url: string) => {
  try {
    sessionStorage.setItem(REDIRECT_KEY, url);
  } catch {
    // Storage unavailable (e.g. private-browsing quota exceeded) — silently skip.
  }
};

/**
 * Reads the persisted redirect target from session storage.
 *
 * @returns The stored redirect target or `null` when none has been saved.
 */
export const readPersistedRedirect = (): string | null => {
  try {
    return sessionStorage.getItem(REDIRECT_KEY);
  } catch {
    return null;
  }
};

/**
 * Clears the persisted redirect key from session storage.
 */
export const clearPersistedRedirect = () => {
  try {
    sessionStorage.removeItem(REDIRECT_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
};
