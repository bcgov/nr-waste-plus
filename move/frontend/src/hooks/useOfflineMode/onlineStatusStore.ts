import { env } from '@/env';

type Listener = (online: boolean) => void;

/**
 * A store for tracking the online status of the application.
 * It uses the browser's online/offline events to update the status.
 * It also provides a way to subscribe to changes in the online status.
 * It is designed to be used in a React application, but can be used in any JavaScript environment that supports the `navigator.onLine` API.
 * It is also compatible with server-side rendering (SSR) frameworks.
 * It relies on a feature flag to enable or disable offline support.
 * If the flag is false, the application will always be considered online.
 */
class OnlineStatusStore {
  private isOnline = env.VITE_FEATURES_OFFLINE ? navigator.onLine : true;
  private listeners: Listener[] = [];

  constructor() {
    window.addEventListener('online', this.setOnlineTrue);
    window.addEventListener('offline', this.setOnlineFalse);
  }

  private setOnlineTrue = () => this.setOnline(true);
  private setOnlineFalse = () => this.setOnline(false);

  private setOnline(value: boolean) {
    if (!env.VITE_FEATURES_OFFLINE) return;
    this.isOnline = value;
    this.listeners.forEach((listener) => listener(this.isOnline));
  }

  getStatus() {
    return this.isOnline;
  }

  subscribe(listener: Listener) {
    this.listeners.push(listener);
    return () => this.unsubscribe(listener);
  }

  unsubscribe(listener: Listener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }
}

export const onlineStatusStore = new OnlineStatusStore();
