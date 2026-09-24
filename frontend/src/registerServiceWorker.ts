/**
 * Service-worker cleanup migration.
 *
 * Previously this file called `registerSW()` from `virtual:pwa-register` when
 * the `offline-mode-enabled` feature flag was true.  The PWA plugin has been
 * removed from the Vite config, so this module is now a no-op for registration.
 *
 * However, users who ran an earlier release may still have an active service
 * worker registration and cached PWA assets.  Those registrations can continue
 * intercepting navigations and asset requests with the old Workbox precache,
 * leaving deployed users on stale bundles or failing when a new chunk is missing.
 *
 * This module exports a one-time migration that unregisters any existing service
 * workers and clears Workbox-related caches.  It is invoked from `main.tsx` at
 * startup so the cleanup runs exactly once per session.
 *
 * When offline mode is re-enabled, restore the registration logic here and
 * re-add `vite-plugin-pwa` to the Vite config.
 */

const SW_CLEANUP_DONE_KEY = 'pwa-sw-cleanup-done';

/**
 * Removes all registered service workers and clears Workbox-related caches.
 *
 * Safe to call multiple times — skips if already executed in this session or if
 * the browser does not support service workers.
 */
export function migrateOldServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (sessionStorage.getItem(SW_CLEANUP_DONE_KEY)) return;

  // Unregister every active service worker
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      void reg.unregister();
    }
  });

  // Clear Workbox-structured caches (workbox-precaching, workbox-runtime-caching)
  void caches.keys().then((cacheNames) => {
    for (const name of cacheNames) {
      if (name.startsWith('workbox-') || name === 'precache-v2') {
        void caches.delete(name);
      }
    }
  });

  sessionStorage.setItem(SW_CLEANUP_DONE_KEY, '1');
}

/**
 * No-op stub — service-worker registration is currently disabled.
 *
 * Previously this file returned the `registerSW` callback from
 * `virtual:pwa-register`.  The PWA plugin has been removed, so this module
 * exports an empty function to preserve the call-site contract.
 *
 * @see {@link migrateOldServiceWorker} for the one-time cleanup logic.
 */
const updateSW = (_?: boolean) => {
  // eslint-disable-next-line no-console
  console.debug('[pwa] service-worker registration disabled (no-op)');
};

export default updateSW;
