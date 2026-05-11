import type { ComponentType } from 'react';

/** Configuration options for the {@link withOfflineSupport} guard. */
interface OfflineOptions {
  /** When `true`, the route is only accessible when the device is offline. */
  offlineOnly?: boolean;
  /** When `true`, the route is accessible regardless of connectivity. */
  offlineReady?: boolean;
}

/**
 * HOC guard scaffold: restricts or allows route access based on network connectivity.
 *
 * This is a no-op scaffold — the offline restriction logic is not yet implemented.
 * Future implementation should check `navigator.onLine`, subscribe to `'online'`/`'offline'`
 * events, and redirect users based on `offlineOnly` and `offlineReady` flags.
 *
 * @param Component - The route component to wrap.
 * @param _options - Offline connectivity options (unused until feature is implemented).
 * @returns The wrapped component unchanged (no-op until feature is implemented).
 *
 * @todo Implement `navigator.onLine` / network-event detection and redirect logic.
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
