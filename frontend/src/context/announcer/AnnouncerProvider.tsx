import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { AnnouncerContext } from './AnnouncerContext';

/**
 * Delay before the message text is written into the live region after clearing.
 * Clearing first guarantees consecutive identical messages are re-announced
 * (screen readers only announce text-node mutations, not identical re-sets).
 */
const CLEAR_DELAY_MS = 50;

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
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  const announce = useCallback((text: string) => {
    window.clearTimeout(timeoutRef.current);
    setMessage('');
    timeoutRef.current = window.setTimeout(() => setMessage(text), CLEAR_DELAY_MS);
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
