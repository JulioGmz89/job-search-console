import { useEffect, useRef } from 'react';

import { serverEventsUrl } from './api.js';

/**
 * One EventSource on `/api/events` for the whole app.
 *
 * The server pushes `changed` when a file under reports/, output/ or data/ was
 * written — by a run here, by an upstream script, or by a Claude Code session
 * in the same directory — and `run` on every queue transition. Callers refetch
 * what they show; nothing here caches. The browser's EventSource reconnects on
 * its own after a drop, and the server greets every connection with the
 * current queue, so a reconnect is never a stale view.
 *
 * @param {{onChanged?: (event: {paths: string[]}) => void, onRun?: (run: object) => void,
 *   onHello?: (hello: {runs: object}) => void, onConnection?: (up: boolean) => void}} handlers
 */
export function useServerEvents(handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const source = new EventSource(serverEventsUrl());
    const parse = (event) => JSON.parse(event.data);
    source.addEventListener('hello', (event) => {
      ref.current.onConnection?.(true);
      ref.current.onHello?.(parse(event));
    });
    source.addEventListener('changed', (event) => ref.current.onChanged?.(parse(event)));
    source.addEventListener('run', (event) => ref.current.onRun?.(parse(event).run));
    source.onerror = () => ref.current.onConnection?.(false);
    return () => source.close();
  }, []);
}
