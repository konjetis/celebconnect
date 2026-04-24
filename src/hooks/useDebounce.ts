import { useState, useEffect } from 'react';

/**
 * Returns a debounced version of the value that only updates after
 * the specified delay (ms) of inactivity.
 *
 * Usage:
 *   const debouncedSearch = useDebounce(searchText, 400);
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
