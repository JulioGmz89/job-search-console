import { useState } from 'react';

import { useResource } from '../data.js';
import { DESTINATIONS, destinationOf } from '../lib/routes.js';
import { brokenBoards, newFromChecks } from '../lib/today.js';
import { useRuns } from '../runs.jsx';
import { useRoute } from './router.jsx';
import { Search } from './Search.jsx';

/**
 * The top bar on every page (ia.md §1): six destinations, search, the Activity
 * button and Workspace. Below 960 px the destinations fold into a Menu button.
 */
export function TopBar({ activity, onActivity, activityRef, panelOpen }) {
  const { route } = useRoute();
  const current = destinationOf(route.page);
  const [menuOpen, setMenuOpen] = useState(false);
  const inbox = useResource('inbox');
  const portals = useResource('portals');
  const today = useResource('today');
  const { list } = useRuns();

  const counts = {
    'to-review': newFromChecks(inbox.data?.pending ?? [], list, today.data?.lastSeen ?? null).length,
    companies: brokenBoards(portals.data?.companies ?? [], portals.data?.health ?? {}).length,
  };
  const countLabel = { 'to-review': 'new', companies: 'not working' };

  return (
    <header className="topbar">
      <a className="brand" href="#/today">
        Job Search Console
      </a>
      <button type="button" className="menu-toggle" aria-expanded={menuOpen} aria-controls="mainnav" onClick={() => setMenuOpen((o) => !o)}>
        Menu
      </button>
      <nav className="mainnav" id="mainnav" aria-label="Main" data-open={menuOpen}>
        <ul>
          {DESTINATIONS.map((d) => (
            <li key={d.page}>
              <a href={d.href} aria-current={current === d.page ? 'page' : undefined} onClick={() => setMenuOpen(false)}>
                {d.label}
                {counts[d.page] ? (
                  <span className={`navcount ${d.page === 'companies' ? 'warn' : ''}`}>
                    {counts[d.page]}
                    <span className="visually-hidden"> {countLabel[d.page]}</span>
                  </span>
                ) : null}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="topbar-tools">
        <Search />
        <button
          type="button"
          ref={activityRef}
          className="activity-btn"
          data-state={activity.state}
          aria-expanded={panelOpen}
          aria-controls={panelOpen ? 'activity-panel' : undefined}
          onClick={onActivity}
        >
          {activity.label}
        </button>
        <a className="topbar-link" href="#/workspace" aria-current={route.page === 'workspace' ? 'page' : undefined}>
          Workspace
        </a>
        <a className="topbar-link" href="#/help" aria-current={route.page === 'help' ? 'page' : undefined}>
          Help
        </a>
      </div>
    </header>
  );
}
