export const registerBackgroundSync = async (tag: string): Promise<boolean> => {
  if ('serviceWorker' in navigator && 'SyncManager' in globalThis) {
    try {
      const permission = await checkPeriodicSyncPermission('background-sync');
      if (permission === 'denied') return false;
      const registration = await navigator.serviceWorker.ready;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (registration as any).sync.register(tag);
      return true;
    } catch {
      return false;
    }
  } else {
    return false;
  }
};

export const registerPeriodicSync = async (tag: string, minInterval: number): Promise<boolean> => {
  if ('serviceWorker' in navigator && 'PeriodicSyncManager' in globalThis) {
    try {
      const permission = await checkPeriodicSyncPermission('periodic-background-sync');
      if (permission === 'denied') return false;
      const registration = await navigator.serviceWorker.ready;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (registration as any).periodicSync.register(tag, { minInterval });
      return true;
    } catch {
      return false;
    }
  } else {
    return false;
  }
};

const checkPeriodicSyncPermission = async (permission: string): Promise<PermissionState> => {
  if ('permissions' in navigator) {
    try {
      // @ts-expect-error: is not assignable to type 'PermissionName'.
      const status = await navigator.permissions.query({ name: permission });
      return status.state; // 'granted', 'denied', or 'prompt'
    } catch {
      return 'denied';
    }
  }
  return 'denied';
};
