import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { AnnouncerContext } from './AnnouncerContext';

/**
 * Delay before the message text is written into the live region after clearing.
 * Clearing first guarantees consecutive identical messages are re-announced
 * (screen readers only announce text-node mutations, not identical re-sets).
 */
const CLEAR_DELAY_MS = 50;

/**
 * Minimum time a message stays in the region before the next queued message
 * replaces it, giving screen readers a window to speak. Applies only when
 * announcements arrive faster than they can be spoken (e.g. a theme toggle
 * and a profile-panel close fired by the same click).
 */
const MESSAGE_DWELL_MS = 750;

/**
 * Provides a persistent polite ARIA live region for app-wide state-change
 * announcements (theme, district/client selection, profile panel).
 *
 * The region is always mounted so assistive technology registers it before
 * any message is inserted — a live region created together with its text is
 * not announced by screen readers.
 *
 * @param props The provider props.
 * @param props.children The subtree that may publish announcements.
 * @returns The announcer context provider and the visually hidden live region.
 */
export const AnnouncerProvider = ({ children }: { children: ReactNode }) => {
  const [message, setMessage] = useState('');
  const queueRef = useRef<string[]>([]);
  const timeoutRef = useRef<number | undefined>(undefined);
  const isProcessingRef = useRef(false);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  const announce = useCallback((text: string) => {
    // Queue instead of last-write-wins: two publishes in one interaction
    // (e.g. theme change + panel close) must both reach the screen reader.
    queueRef.current.push(text);
    if (isProcessingRef.current) {
      return;
    }
    isProcessingRef.current = true;

    const processNext = () => {
      const next = queueRef.current.shift();
      if (next === undefined) {
        isProcessingRef.current = false;
        return;
      }
      setMessage('');
      timeoutRef.current = window.setTimeout(() => {
        setMessage(next);
        // Hold the message long enough for a screen reader to speak it
        // before the next queued message clears the region.
        timeoutRef.current = window.setTimeout(processNext, MESSAGE_DWELL_MS);
      }, CLEAR_DELAY_MS);
    };

    processNext();
  }, []);

  const contextValue = useMemo(() => ({ announce }), [announce]);

  return (
    <AnnouncerContext.Provider value={contextValue}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="app-announcer"
        className="cds--visually-hidden"
      >
        {message}
      </div>
    </AnnouncerContext.Provider>
  );
};

export default AnnouncerProvider;
