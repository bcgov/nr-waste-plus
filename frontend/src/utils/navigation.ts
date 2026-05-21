/**
 * Navigate the browser to the specified URL.
 *
 * Extracted so tests can replace this with a spy/stub without touching
 * `globalThis.location` directly (jsdom does not implement navigation).
 *
 * @param url - The destination URL (absolute or relative).
 * @example
 * navigateTo('/reporting-units/123')
 */
export const navigateTo = (url: string): void => {
  globalThis.location.assign(url);
};
