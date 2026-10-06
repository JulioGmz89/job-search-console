/**
 * routes.js — the hash routes of ia.md §1, and redirects from the M1–M5 ones.
 *
 * Every page and every job has its own URL, so a refresh or a link from Today
 * lands in the same place. Pure: parseHash() takes the hash and returns what to
 * render, or where to go instead.
 */

/** The six top-bar destinations, in order. */
export const DESTINATIONS = Object.freeze([
  { page: 'today', label: 'Today', href: '#/today' },
  { page: 'applications', label: 'Applications', href: '#/applications' },
  { page: 'to-review', label: 'To review', href: '#/to-review' },
  { page: 'companies', label: 'Companies', href: '#/companies' },
  { page: 'skills', label: 'Skills', href: '#/skills/learn' },
  { page: 'my-cv', label: 'My CV', href: '#/my-cv/content' },
]);

export const SKILL_VIEWS = Object.freeze(['learn', 'strengthen', 'asked']);
export const CV_SECTIONS = Object.freeze(['content', 'profile', 'design', 'writing']);

const TITLES = {
  today: 'Today',
  applications: 'Applications',
  job: 'Applications',
  'to-review': 'To review',
  companies: 'Companies',
  skills: 'Skills',
  'my-cv': 'My CV',
  activity: 'Activity',
  workspace: 'Workspace',
  help: 'Help',
  'not-found': 'Page not found',
};

/**
 * @param {string} hash - location.hash, e.g. "#/applications/12".
 * @returns {{page: string, params: object, redirect?: string}}
 *   With `redirect`, replace the URL with it and parse again.
 */
export function parseHash(hash) {
  const path = String(hash ?? '').replace(/^#\/?/, '').split('?')[0];
  const [first = '', second, third] = path.split('/').map((p) => decodeURIComponent(p));

  switch (first) {
    case '':
      return { page: 'today', params: {} };
    case 'today':
    case 'to-review':
    case 'companies':
    case 'workspace':
      return { page: first, params: {} };
    case 'applications':
      if (second === 'report' && /^\d+$/.test(third ?? '')) return { page: 'job', params: { reportId: Number(third) } };
      if (second && /^\d+$/.test(second)) return { page: 'job', params: { id: Number(second) } };
      return { page: 'applications', params: {} };
    case 'skills':
      if (!SKILL_VIEWS.includes(second)) return { page: 'skills', params: {}, redirect: '#/skills/learn' };
      return { page: 'skills', params: { view: second } };
    case 'my-cv':
      if (!CV_SECTIONS.includes(second)) return { page: 'my-cv', params: {}, redirect: '#/my-cv/content' };
      return { page: 'my-cv', params: { section: second } };
    case 'activity':
      return { page: 'activity', params: second ? { id: second } : {} };
    case 'help':
      return { page: 'help', params: second ? { topic: second } : {} };

    // M1–M5 routes, so links in old notes keep working (ia.md §1).
    case 'pipeline':
      return { page: 'applications', params: {}, redirect: second ? `#/applications/report/${encodeURIComponent(second)}` : '#/applications' };
    case 'sources':
      return { page: 'companies', params: {}, redirect: '#/companies' };
    case 'runs':
      return { page: 'activity', params: {}, redirect: second ? `#/activity/${encodeURIComponent(second)}` : '#/activity' };
    case 'cv':
      return { page: 'my-cv', params: {}, redirect: '#/my-cv/design' };
    default:
      return { page: 'not-found', params: {} };
  }
}

/** The top-bar destination a page belongs to, for aria-current. */
export function destinationOf(page) {
  return page === 'job' ? 'applications' : page;
}

/** `<title>`: "<page> — Job Search Console"; a job page passes its own name. */
export function documentTitle(page, name = null) {
  return `${name ?? TITLES[page] ?? 'Job Search Console'} — Job Search Console`;
}
