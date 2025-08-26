import { registerSW } from 'virtual:pwa-register';

import { sendEvent } from '@/hooks/useSendEvent/eventHandler';

const updateSW = registerSW({
  onRegistered() {
    sendEvent({
      eventType: 'success',
      title: 'Application registered successfully',
      description: 'Your application is now ready to work offline.',
    });
  },
  onRegisterError(error) {
    sendEvent({
      eventType: 'error',
      title: 'Failed to register the app for offline use',
      description: JSON.stringify(error), //Need to change
    });
  },
  onNeedRefresh() {
    sendEvent({
      eventType: 'info',
      title: 'New content available',
      description: 'A new version of the app is available. Please refresh the app by pressing F5.',
    });
  },
  onOfflineReady() {
    sendEvent({
      eventType: 'info',
      title: 'You are offline',
      description: "Don't worry, you will still be able to access offline content.",
    });
  },
});

export default updateSW;
