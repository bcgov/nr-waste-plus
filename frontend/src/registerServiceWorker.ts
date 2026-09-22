/**
 * Stub module — service worker registration is currently disabled.
 *
 * Previously this file called `registerSW()` from `virtual:pwa-register` when
 * the `offline-mode-enabled` feature flag was true.  The PWA plugin has been
 * removed from the Vite config, so this module is now a no-op.
 *
 * When offline mode is re-enabled, restore the registration logic here and
 * re-add `vite-plugin-pwa` to the Vite config.
 */
const updateSW = (_?: boolean) => {
  // eslint-disable-next-line no-console
  console.debug('[pwa] service-worker registration disabled (no-op)');
};

export default updateSW;
