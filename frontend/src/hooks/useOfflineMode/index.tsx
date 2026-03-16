import { useEffect, useState } from 'react';

import { onlineStatusStore } from './onlineStatusStore';

/**
 * Exposes the current online status and the shared online status store subscriptions.
 *
 * @returns Connectivity state plus subscribe and unsubscribe helpers.
 */
const useOfflineMode = () => {
  const [isOnline, setIsOnline] = useState(onlineStatusStore.getStatus());

  useEffect(() => {
    const unsubscribe = onlineStatusStore.subscribe(setIsOnline);
    return () => unsubscribe();
  }, []);

  return {
    isOnline,
    subscribe: onlineStatusStore.subscribe,
    unsubscribe: onlineStatusStore.unsubscribe,
  };
};

export default useOfflineMode;
