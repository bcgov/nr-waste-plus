import { registerSW } from 'virtual:pwa-register';

import { featureFlags } from '@/env';
import { sendToastEvent } from '@/hooks/useNotificationEvents/eventHandler';

const updateSW = featureFlags['offline-mode-enabled']
  ? registerSW({
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
          description: error instanceof Error ? error.message : String(error),
        });
      },
      onNeedRefresh() {
        sendToastEvent({
          eventType: 'info',
          title: 'New content available',
          description:
            'A new version of the app is available. Please refresh the app by pressing F5.',
        });
      },
      onOfflineReady() {
        sendToastEvent({
          eventType: 'info',
          title: 'You are offline',
          description: "Don't worry, you will still be able to access offline content.",
        });
      },
    })
  : (_reloadPage?: boolean) => {
      // No-op when offline mode is disabled. Keep the signature compatible with
      // the registerSW return value so callers don't need to change.
      // The argument is intentionally ignored in this mode.
      // eslint-disable-next-line no-console
      console.debug('[pwa] offline-mode-disabled: skipping service worker registration (call ignored)');
    };

export default updateSW;
