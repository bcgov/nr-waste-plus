import { useContext } from 'react';

import { AnnouncerContext } from './AnnouncerContext';

/**
 * Returns the announcer context used to publish polite screen-reader messages.
 *
 * @returns The active announcer context value.
 * @throws Error when used outside of an AnnouncerProvider.
 */
export const useAnnouncer = () => {
  const ctx = useContext(AnnouncerContext);
  if (!ctx) {
    throw new Error('useAnnouncer must be used within an AnnouncerProvider');
  }
  return ctx;
};
