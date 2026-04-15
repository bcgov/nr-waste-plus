/**
 * Navigates the browser to the given URL.
 *
 * Extracted so tests can replace this with a spy/stub without touching
 * `globalThis.location` directly (jsdom does not implement navigation).
 *
 * @param url The destination URL.
 */
export const navigateTo = (url: string): void => {
  globalThis.location.assign(url);
};
