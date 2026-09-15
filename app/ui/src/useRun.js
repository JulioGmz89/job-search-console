import { useCallback, useEffect, useRef, useState } from 'react';

import { cancelRun, runEventsUrl, startRun } from './api.js';

/**
 * Drive one run and its live output.
 *
 * The server replays a run's whole log before the first live event, so this hook
 * never has to reason about having connected late — it just renders whatever
 * arrives. That is what makes a page reload during a long scan harmless.
 *
 * @param {{onFinish?: (run: object) => void}} [options]
 */
export function useRun({ onFinish } = {}) {
  const [run, setRun] = useState(null);
  const [lines, setLines] = useState([]);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);
  const sourceRef = useRef(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  const disconnect = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
  }, []);

  // A live EventSource outlives the component that opened it unless it is
  // explicitly closed, and a scan can run for minutes.
  useEffect(() => disconnect, [disconnect]);

  const connect = useCallback((id) => {
    disconnect();
    const source = new EventSource(runEventsUrl(id));
    sourceRef.current = source;

    // A run waiting for a lane, then taking one: the record changes, the log does not.
    source.addEventListener('queued', (event) => setRun(JSON.parse(event.data).run));
    source.addEventListener('started', (event) => setRun(JSON.parse(event.data).run));
    source.addEventListener('line', (event) => {
      const { line } = JSON.parse(event.data);
      setLines((current) => [...current, line]);
    });
    source.addEventListener('progress', (event) => {
      setProgress(JSON.parse(event.data).progress);
    });
    source.addEventListener('done', (event) => {
      const finished = JSON.parse(event.data).run;
      setRun(finished);
      disconnect();
      finishRef.current?.(finished);
    });
    source.onerror = () => {
      // The server ends the stream itself on `done`, so an error after that is
      // just the socket closing. Only a drop mid-run is worth reporting.
      if (sourceRef.current === source) {
        setError(new Error('Lost the connection to the run — reload to reattach'));
        disconnect();
      }
    };
  }, [disconnect]);

  /**
   * @param {string} kind @param {object} [options] @param {string} [confirmToken]
   */
  const start = useCallback(async (kind, options = {}, confirmToken) => {
    setStarting(true);
    setError(null);
    setLines([]);
    setProgress(null);
    try {
      const started = await startRun(kind, options, confirmToken);
      setRun(started);
      connect(started.id);
      return started;
    } catch (failure) {
      setError(failure);
      setRun(null);
      return null;
    } finally {
      setStarting(false);
    }
  }, [connect]);

  /**
   * Attach to a run that already exists — one chained by the server, or one
   * picked from the Runs page. The replayed log makes it indistinguishable from
   * having started it here.
   *
   * @param {object|string} target - A run record, or an id.
   */
  const follow = useCallback(async (target) => {
    setError(null);
    setLines([]);
    setProgress(null);
    const id = typeof target === 'string' ? target : target.id;
    setRun(typeof target === 'string' ? { id, status: 'queued', label: '…', queuedAt: Date.now() } : target);
    connect(id);
  }, [connect]);

  const cancel = useCallback(async () => {
    if (!run) return;
    try {
      await cancelRun(run.id);
    } catch (failure) {
      setError(failure);
    }
  }, [run]);

  const reset = useCallback(() => {
    disconnect();
    setRun(null);
    setLines([]);
    setProgress(null);
    setError(null);
  }, [disconnect]);

  return { run, lines, progress, error, starting, start, follow, cancel, reset };
}
