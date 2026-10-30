import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { subscribe } from '@/mocks/db';

export interface QueryState<T> { data: T | undefined; loading: boolean; error: Error | null; reload: () => void }

/** Minimal data hook. Mutations anywhere refresh silently, keeping current data on screen. */
export function useQuery<T>(fn: () => Promise<T>, deps: DependencyList): QueryState<T> {
  const [state, setState] = useState<{ data?: T; loading: boolean; error: Error | null }>({ loading: true, error: null });
  const ref = useRef(fn);
  ref.current = fn;
  const token = useRef(0);

  const run = useCallback((silent: boolean) => {
    const id = ++token.current;
    if (!silent) setState((s) => ({ data: s.data, loading: true, error: null }));
    ref.current().then(
      (data) => id === token.current && setState({ data, loading: false, error: null }),
      (error: Error) => id === token.current && !silent && setState({ loading: false, error }),
    );
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => run(false), deps);
  useEffect(() => subscribe(() => run(true)), [run]);

  return { data: state.data, loading: state.loading, error: state.error, reload: () => run(false) };
}
