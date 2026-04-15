import { registerSW } from 'virtual:pwa-register';

import { sendToastEvent } from '@/hooks/useNotificationEvents/eventHandler';

/**
 * Registers the PWA service worker and emits user-facing events for lifecycle changes.
 */
const updateSW = registerSW({
  onRegistered() {
    sendToastEvent({
      eventType: 'success',
      title: 'Application registered successfully',
      description: 'Your application is now ready to work offline.',
    });
  },
  onRegisterError(error) {
    sendToastEvent({
      eventType: 'error',
      title: 'Failed to register the app for offline use',
      description: JSON.stringify(error), //Need to change
    });
  },
  onNeedRefresh() {
    sendToastEvent({
      eventType: 'info',
      title: 'New content available',
      description: 'A new version of the app is available. Please refresh the app by pressing F5.',
    });
  },
  onOfflineReady() {
    sendToastEvent({
      eventType: 'info',
      title: 'You are offline',
      description: "Don't worry, you will still be able to access offline content.",
    });
  },
});

export default updateSW;
