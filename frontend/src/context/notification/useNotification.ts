import { useContext } from 'react';

import { NotificationContext } from './NotificationContext';

/**
 * Returns the notification context used to display toast messages.
 *
 * @returns The active notification context value.
 * @throws Error when used outside of a NotificationProvider.
 */
export const useNotification = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return ctx;
};
