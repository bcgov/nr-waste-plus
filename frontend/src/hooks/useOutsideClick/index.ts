import { useEffect, type RefObject } from 'react';

/**
 * Invokes a callback when the user clicks outside of the referenced element.
 *
 * @typeParam T The referenced HTML element type.
 * @param elementRef The element ref to guard.
 * @param callback The callback to invoke on outside clicks.
 * @param enabled When false, no listeners are registered.
 */
export const useOutsideClick = <T extends HTMLElement>(
  elementRef: RefObject<T | null>,
  callback: () => void,
  enabled: boolean = true,
) => {
  useEffect(() => {
    if (!enabled || !elementRef) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (elementRef.current && !elementRef.current.contains(target)) {
        callback();
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClick);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClick);
    };
  }, [elementRef, callback, enabled]);
};
