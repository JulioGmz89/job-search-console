import { useEffect, useState } from 'react';

/**
 * announce.jsx — the app's two live regions (ia.md §3 "Announcements", F-006).
 *
 * One polite and one assertive region, always mounted in the shell, so a screen
 * reader hears progress and results wherever focus is. Messages name the item
 * ("Tailored CV for Granite Cloud is ready"). Failures use the assertive one.
 * A region is cleared before each message so the same words are read again.
 */

const subscribers = new Set();

/** @param {string} message @param {{assertive?: boolean}} [options] */
export function announce(message, { assertive = false } = {}) {
  if (!message) return;
  subscribers.forEach((fn) => fn({ message, assertive, at: Date.now() }));
}

export function LiveRegions() {
  const [polite, setPolite] = useState('');
  const [assertive, setAssertive] = useState('');
  useEffect(() => {
    const timers = new Set();
    const onMessage = ({ message, assertive: loud }) => {
      const set = loud ? setAssertive : setPolite;
      set('');
      const timer = setTimeout(() => {
        timers.delete(timer);
        set(message);
      }, 60);
      timers.add(timer);
    };
    subscribers.add(onMessage);
    return () => {
      subscribers.delete(onMessage);
      timers.forEach(clearTimeout);
    };
  }, []);
  return (
    <>
      <div id="announce" className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {polite}
      </div>
      <div id="alert" className="visually-hidden" aria-live="assertive" aria-atomic="true">
        {assertive}
      </div>
    </>
  );
}
