import { useCallback, useEffect, useState } from 'react';

import { navigate, setLeaveGuard } from '../shell/router.jsx';
import { ConfirmDialog } from './ui.jsx';

/**
 * Unsaved changes warn before leaving (ia.md §2.7): a page change is held
 * back and the user is asked; closing the tab gets the browser's own warning.
 * Used by every editor on My CV.
 *
 * @param {boolean} dirty - whether there is something unsaved.
 * @param {{what: string, onDiscard?: () => void}} options - `what` names it ("your CV").
 * @returns {JSX.Element} the dialog, to render once on the page.
 */
export function useLeaveGuard(dirty, { what, onDiscard = () => {} }) {
  const [leaving, setLeaving] = useState(null);
  const guard = useCallback(
    (target) => {
      if (!dirty) return true;
      setLeaving(target);
      return false;
    },
    [dirty],
  );
  useEffect(() => {
    setLeaveGuard(guard);
    const unload = (e) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', unload);
    return () => {
      setLeaveGuard(null);
      window.removeEventListener('beforeunload', unload);
    };
  }, [guard, dirty]);

  return (
    <ConfirmDialog
      isOpen={leaving !== null}
      title={`Leave without saving ${what}?`}
      confirmLabel="Leave without saving"
      cancelLabel="Stay"
      danger
      onConfirm={() => {
        const target = leaving;
        setLeaving(null);
        setLeaveGuard(null);
        onDiscard();
        navigate(target);
      }}
      onCancel={() => setLeaving(null)}
    >
      <p>Your changes to {what} are not saved yet. Stay to save them, or leave and lose them.</p>
    </ConfirmDialog>
  );
}
