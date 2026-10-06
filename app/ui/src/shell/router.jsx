import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { documentTitle, parseHash } from '../lib/routes.js';

/**
 * router.jsx — the hash router and the focus rule that goes with it
 * (ia.md §1, §3 "Focus": a page change moves focus to the page's <h1>).
 */

const RouteContext = createContext({ route: { page: 'today', params: {} }, hash: '', changed: false });

/** Is this hash only an anchor inside the current page (#/applications/12#documents)? */
const pagePart = (hash) => String(hash).split('#').slice(0, 2).join('#');

export function RouteProvider({ children }) {
  const [hash, setHash] = useState(() => window.location.hash);
  // Whether focus should move to the next page's heading: not on first load,
  // where the skip link must stay the first thing a keyboard reaches.
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    const onHash = () => {
      setHash((before) => {
        if (pagePart(before) !== pagePart(window.location.hash)) setChanged(true);
        return window.location.hash;
      });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const route = parseHash(pagePart(hash));
  useLayoutEffect(() => {
    if (route.redirect) {
      window.history.replaceState(null, '', route.redirect);
      setHash(route.redirect);
    }
  }, [route.redirect]);

  return <RouteContext.Provider value={{ route, hash, changed }}>{children}</RouteContext.Provider>;
}

export function useRoute() {
  return useContext(RouteContext);
}

/** The in-page anchor after the route, e.g. "documents" for #/applications/12#documents. */
export function useAnchor() {
  const { hash } = useRoute();
  return String(hash).split('#')[2] ?? null;
}

export function navigate(href) {
  if (window.location.hash === href) return;
  window.location.hash = href;
}

/**
 * The page heading: sets the document title and takes focus after a page
 * change. Every page renders exactly one.
 */
export function PageHead({ title, docTitle = null, lead = null, children = null, back = null }) {
  const { route, hash, changed } = useRoute();
  const ref = useRef(null);
  const page = pagePart(hash);
  useEffect(() => {
    document.title = documentTitle(route.page, docTitle);
  }, [route.page, docTitle]);
  useEffect(() => {
    if (!changed) return;
    window.scrollTo(0, 0);
    ref.current?.focus({ preventScroll: true });
    // Only when the page itself changes, not when its title updates in place.
  }, [page, changed]);
  return (
    <div className="page-head">
      <div className="stack-sm">
        {back}
        <h1 ref={ref} tabIndex={-1}>
          {title}
        </h1>
        {lead ? <p className="lead">{lead}</p> : null}
      </div>
      {children ? <div className="row">{children}</div> : null}
    </div>
  );
}
