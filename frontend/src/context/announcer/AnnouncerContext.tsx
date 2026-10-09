import { createContext } from 'react';

/**
 * Shape of the announcer context shared across the app.
 */
export type AnnouncerContextData = {
  /** Publishes a polite screen-reader announcement message. */
  announce: (message: string) => void;
};

/**
 * React context for the app-wide polite screen-reader announcer.
 */
export const AnnouncerContext = createContext<AnnouncerContextData | undefined>(undefined);
