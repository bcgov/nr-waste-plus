const REDIRECT_AFTER_LOGIN_KEY = 'redirectAfterLogin';
const REDIRECT_AFTER_LOGIN_FALLBACK_KEY = 'redirectAfterLoginFallback';
const RETURN_TO_KEY = 'returnTo';
const RETURN_TO_FALLBACK_KEY = 'returnToFallback';

export const REDIRECT_STORAGE_KEYS = [
  REDIRECT_AFTER_LOGIN_KEY,
  RETURN_TO_KEY,
  REDIRECT_AFTER_LOGIN_FALLBACK_KEY,
  RETURN_TO_FALLBACK_KEY,
] as const;

/**
 * Persists a post-login redirect target across session and local storage keys.
 *
 * @param url The in-app URL to restore after authentication completes.
 */
export const persistRedirectUrl = (url: string) => {
  sessionStorage.setItem(REDIRECT_AFTER_LOGIN_KEY, url);
  sessionStorage.setItem(RETURN_TO_KEY, url);
  localStorage.setItem(REDIRECT_AFTER_LOGIN_FALLBACK_KEY, url);
  localStorage.setItem(RETURN_TO_FALLBACK_KEY, url);
};

/**
 * Reads the first available persisted redirect target from the supported storage keys.
 *
 * @returns The stored redirect target or `null` when none has been saved.
 */
export const readPersistedRedirect = (): string | null => {
  return (
    sessionStorage.getItem(REDIRECT_AFTER_LOGIN_KEY) ||
    sessionStorage.getItem(RETURN_TO_KEY) ||
    localStorage.getItem(REDIRECT_AFTER_LOGIN_FALLBACK_KEY) ||
    localStorage.getItem(RETURN_TO_FALLBACK_KEY)
  );
};

/**
 * Clears all persisted redirect keys from both session and local storage.
 */
export const clearPersistedRedirect = () => {
  REDIRECT_STORAGE_KEYS.forEach((key) => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  });
};
