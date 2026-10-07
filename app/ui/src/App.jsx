import { useCallback, useEffect, useRef, useState } from 'react';

import { useResource } from './data.js';
import { activitySummary } from './lib/runs.js';
import { ActivityPage } from './pages/Activity.jsx';
import { ApplicationsPage } from './pages/Applications.jsx';
import { CompaniesPage } from './pages/Companies.jsx';
import { HelpPage } from './pages/Help.jsx';
import { JobPage } from './pages/Job.jsx';
import { MyCvPage } from './pages/MyCv.jsx';
import { NotFoundPage } from './pages/NotFound.jsx';
import { SkillsPage } from './pages/Skills.jsx';
import { TodayPage } from './pages/Today.jsx';
import { ToReviewPage } from './pages/ToReview.jsx';
import { WorkspacePage } from './pages/Workspace.jsx';
import { RunsProvider, useRuns } from './runs.jsx';
import { ActivityPanel } from './shell/ActivityPanel.jsx';
import { LiveRegions } from './shell/announce.jsx';
import { RouteProvider, useRoute } from './shell/router.jsx';
import { TopBar } from './shell/TopBar.jsx';
import { UndoBar } from './shell/undo.jsx';

/**
 * App.jsx — the shell of the approved direction (M7 "C + A patterns", ia.md):
 * skip link, top bar, one <main>, the Activity panel laid over the page, the
 * live regions and the Undo bar. Pages render inside <main>.
 */

const PAGES = {
  today: TodayPage,
  applications: ApplicationsPage,
  job: JobPage,
  'to-review': ToReviewPage,
  companies: CompaniesPage,
  skills: SkillsPage,
  'my-cv': MyCvPage,
  activity: ActivityPage,
  workspace: WorkspacePage,
  help: HelpPage,
  'not-found': NotFoundPage,
};

const OPENED_KEY = 'jsc-activity-opened';
const readOpened = () => {
  try {
    return Number(window.localStorage.getItem(OPENED_KEY)) || 0;
  } catch {
    return 0;
  }
};

function Shell() {
  const { route } = useRoute();
  const { list, connected } = useRuns();
  const today = useResource('today');
  const [panelOpen, setPanelOpen] = useState(false);
  const [lastOpened, setLastOpened] = useState(readOpened);
  const activityButton = useRef(null);

  const openPanel = useCallback(() => {
    setPanelOpen(true);
    const at = Date.now();
    setLastOpened(at);
    try {
      window.localStorage.setItem(OPENED_KEY, String(at));
    } catch {
      // A private window without storage just shows "done" a little longer.
    }
  }, []);
  const closePanel = useCallback(() => {
    setPanelOpen(false);
    activityButton.current?.focus();
  }, []);

  // Escape closes the panel even when focus is on the page beneath it (A8-03).
  useEffect(() => {
    if (!panelOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !document.querySelector('.modal-overlay')) closePanel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelOpen, closePanel]);

  // A link inside the panel goes to another page; the panel steps aside.
  useEffect(() => setPanelOpen(false), [route.page, route.params.id]);

  const activity = activitySummary(list, { dismissed: today.data?.dismissed ?? [], lastOpened });
  const Page = PAGES[route.page] ?? NotFoundPage;

  return (
    <>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        Skip to content
      </a>
      <TopBar activity={activity} onActivity={() => (panelOpen ? closePanel() : openPanel())} activityRef={activityButton} panelOpen={panelOpen} />
      {!connected ? (
        <p className="notice warn offline" role="status">
          Lost the connection to the app. It reconnects by itself; if this stays, check that the app is still running.
        </p>
      ) : null}
      <main id="main" tabIndex={-1}>
        <Page params={route.params} />
      </main>
      <ActivityPanel open={panelOpen} onClose={closePanel} onStepAside={() => setPanelOpen(false)} />
      <UndoBar />
      <LiveRegions />
    </>
  );
}

export default function App() {
  return (
    <RouteProvider>
      <RunsProvider>
        <Shell />
      </RunsProvider>
    </RouteProvider>
  );
}
