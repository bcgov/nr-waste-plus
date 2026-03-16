import { useState, useEffect } from 'react';

/**
 * Returns a debounced copy of a value that only updates after the delay elapses.
 *
 * @typeParam T The value type being debounced.
 * @param value The source value.
 * @param delay The debounce delay in milliseconds.
 * @returns The debounced value.
 */
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debounced;
};

export default useDebounce;
