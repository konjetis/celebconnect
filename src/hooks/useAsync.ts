import { useState, useCallback, useEffect, useRef } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Runs an async function and tracks its loading / error / data state.
 *
 * Usage:
 *   const { data, loading, error, execute } = useAsync(() => fetchUser(id));
 *
 * Pass `immediate: true` to run the function automatically on mount.
 */
export function useAsync<T>(
  asyncFn: () => Promise<T>,
  immediate = false
) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const execute = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const result = await asyncFn();
      if (mountedRef.current) {
        setState({ data: result, loading: false, error: null });
      }
      return result;
    } catch (err) {
      if (mountedRef.current) {
        setState({ data: null, loading: false, error: err instanceof Error ? err : new Error(String(err)) });
      }
      throw err;
    }
  }, [asyncFn]);

  useEffect(() => {
    if (immediate) { execute().catch(() => {}); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, execute };
}
