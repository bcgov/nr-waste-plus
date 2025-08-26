import { useEffect, useState } from 'react';

import { onlineStatusStore } from './onlineStatusStore';

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
