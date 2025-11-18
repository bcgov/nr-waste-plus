import { useEffect, type RefObject } from 'react';

export const useOutsideClick = <T extends HTMLElement>(
  elementRef: RefObject<T | null>,
  callback: () => void,
  enabled: boolean = true
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