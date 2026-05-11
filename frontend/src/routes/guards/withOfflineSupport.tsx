import type { ComponentType } from 'react';

interface OfflineOptions {
  offlineOnly?: boolean; // Route only accessible when offline.
  offlineReady?: boolean; // Route accessible regardless of connectivity.
}

/**
 * HOC guard scaffold: restricts or allows route access based on network connectivity.
 * Body is intentionally a no-op — offline feature not yet implemented.
 * TODO: implement navigator.onLine / network-event detection and redirect logic.
 */
export function withOfflineSupport<P extends object>(
  Component: ComponentType<P>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _options?: OfflineOptions,
): ComponentType<P> {
  function OfflineSupport(props: P) {
    return <Component {...props} />;
  }

  OfflineSupport.displayName = `withOfflineSupport(${Component.displayName ?? Component.name ?? 'Component'})`;
  return OfflineSupport;
}
