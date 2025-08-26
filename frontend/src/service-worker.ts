import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

import { handleSyncMutation, handleSyncRefresh } from '@/config/pwa/syncHandlers';

interface PeriodicSyncEvent extends Event {
  isTrusted: boolean;
  bubbles: boolean;
  cancelBubble: boolean;
  cancelable: boolean;
  composed: boolean;
  currenttarget: ServiceWorkerGlobalScope;
  defaultPrevented: boolean;
  eventPhase: number;
  tag: string;
  timeStamps: number;
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  waitUntil(promise: Promise<any>): void;
}

interface SyncEvent extends PeriodicSyncEvent {
  lastChance: boolean;
  returnValue: boolean;
}

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
self.skipWaiting();
clientsClaim();

// Register routes for assets with stale-while-revalidate strategy
registerRoute(
  ({ request }) =>
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image',
  new StaleWhileRevalidate(),
);

self.addEventListener('sync', (event) => {
  const syncEvent = event as SyncEvent;
  if (syncEvent.tag === 'sync-mutation') {
    syncEvent.waitUntil(handleSyncMutation());
  }
});

self.addEventListener('periodicsync', (event) => {
  const syncEvent = event as PeriodicSyncEvent;
  syncEvent.waitUntil(handleSyncRefresh(syncEvent.tag));
});
