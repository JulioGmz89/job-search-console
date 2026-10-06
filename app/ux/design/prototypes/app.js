/*
 * app.js — the M7 clickable prototype of the chosen direction ("C + A patterns").
 *
 * One small vanilla renderer for every page in ../ia.md. Each T<n>.html page
 * loads it with a start state (<html data-scenario="empty|populated|broken">)
 * that matches the UX sandbox seeds, so a walkthrough of T<n> starts where the
 * M6 persona run started. Everything is fictional (data.js, generated from the
 * sandbox seed). Nothing leaves the browser, and the "agent" is a timer: a
 * check that takes 2–5 minutes for real finishes here in a few seconds.
 *
 * The state lives in sessionStorage per page, so a reload keeps it. "Reset
 * prototype" in the banner starts over. Storage failures are ignored and the
 * prototype then simply forgets on reload.
 */
(() => {
  'use strict';

  const D = window.PROTO_DATA;
  const SCEN = document.documentElement.dataset.scenario || 'populated';
  const STORE = `jsc-proto:${location.pathname}`;
  const RUN_MS = Number(document.documentElement.dataset.runMs || 3500);
  const TODAY = '2026-10-06';
  const YESTERDAY = '2026-10-05';

  // ── helpers ─────────────────────────────────────────────────────────
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtDate = (iso) => (iso ? `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}` : '—');
  const clock = (t) => new Date(t).toTimeString().slice(0, 5);
  const fit = (n) => (typeof n === 'number' ? n.toFixed(1) : '—');
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '');
  const jobName = (a) => `${a.company} — ${a.role}`;
  const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

  const STATUS_LABEL = {
    Evaluated: 'Reviewed — not applied',
    Applied: 'Applied',
    Responded: 'They replied',
    Interview: 'Interviewing',
    Offer: 'Offer',
    Hired: 'Hired',
    Rejected: 'Rejected',
    Discarded: 'Not for me',
    SKIP: 'Skipped — don’t apply',
  };
  const STATUS_ORDER = ['Evaluated', 'Applied', 'Responded', 'Interview', 'Offer', 'Hired', 'Rejected', 'Discarded', 'SKIP'];
  const CLOSED = new Set(['Rejected', 'Discarded', 'SKIP', 'Hired']);
  const RECO = { Apply: 'Apply', Consider: 'Consider', Skip: 'Skip', 'Not evaluated': 'Not checked' };

  const DESIGNS = [
    { id: 'standard', name: 'Standard', note: 'Plain, one column', verdict: 'pass' },
    { id: 'executive', name: 'Executive', note: 'Serif headings, generous spacing', verdict: 'pass' },
    { id: 'compact', name: 'Compact', note: 'Fits more on one page', verdict: 'warn' },
    { id: 'modern', name: 'Modern', note: 'Accent rule, sans serif', verdict: 'pass' },
    { id: 'custom', name: 'Two-column custom', note: 'Yours · config/cv/templates', verdict: 'fail', yours: true },
  ];
  const VERDICT_TEXT = {
    pass: 'Readable by screening systems',
    warn: 'Readable, 2 small issues',
    fail: 'Screening problems',
  };

  // ── state ───────────────────────────────────────────────────────────
  function neverWrite(text) {
    const m = /## Never write\s*\n([\s\S]*?)(\n## |$)/.exec(text || '');
    return m ? m[1].split('\n').map((l) => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean) : [];
  }

  function initialState() {
    const s = {
      v: 3,
      apps: [],
      toReview: [],
      processed: [],
      companies: [],
      runs: [],
      nextRun: 1,
      nextApp: 41,
      cv: null,
      cvSaved: null,
      voiceText: null,
      voiceBackup: null,
      design: { saved: 'standard', selected: 'standard' },
      profile: { name: 'Alex Rivera', location: 'Austin, TX (remote)', targets: 'Senior backend or platform engineer', remote: 'Remote (US)', comp: '$160K+', threshold: '3.5', language: 'English', tier: 'Standard' },
      lastScan: { date: '2026-09-24', summary: null },
      dataIssue: null,
      dismissed: [],
      history: {},
      drafts: {},
      errors: {},
      ui: { menu: null, panel: false, navOpen: false, appFilter: { status: 'all', fit: 'any', q: '' }, sort: { key: 'fit', dir: 'desc' }, keep: [], rowMsg: {}, notice: null, addRun: null, selected: [], followOpen: false, editCompany: null, fix: null, tidy: {}, skillsStrong: false, skillsIgnored: false, coverOpen: {}, shown: null },
    };
    if (SCEN === 'empty') {
      s.lastScan = { date: null, summary: null };
      return s;
    }

    s.apps = D.apps.map((a) => ({ ...a, pdf: a.pdf ? { ...a.pdf, design: 'Standard', rules: '2026-10-01', verdict: 'pass' } : null }));
    s.toReview = D.toReview.map((p, i) => ({ ...p, key: `p${i + 1}` }));
    s.processed = s.apps.filter((a) => a.url).slice(0, 6).map((a) => ({ company: a.company, role: a.role, id: a.id }));
    s.companies = D.companies.map((c) => ({ ...c }));
    s.cv = D.cv;
    s.cvSaved = '2026-09-02';
    s.voiceText = D.voice;
    s.skills = JSON.parse(JSON.stringify(D.skills));
    s.skillStatus = {};

    if (SCEN === 'broken') {
      s.design = { saved: 'custom', selected: 'custom' };
      s.apps.forEach((a) => {
        if (a.pdf && a.id === 12) Object.assign(a.pdf, { design: 'Two-column custom', verdict: 'fail', date: '2026-10-04' });
      });
      s.dataIssue = { company: 'Quarry Systems', role: 'Platform Engineer', line: 57, problem: 'the score column says “high” instead of a number like 4.2' };
      const failed = s.toReview.find((p) => /4109592/.test(p.url));
      if (failed) failed.lastFailed = true;
      s.runs.push({
        id: s.nextRun++,
        kind: 'check',
        url: failed?.url,
        reviewKey: failed?.key,
        label: 'Check fit · Driftwood Analytics — Data Engineer',
        status: 'failed',
        startedAt: Date.now() - 41 * 60e3,
        finishedAt: Date.now() - 38 * 60e3,
        cause: 'The assistant opened the posting but stopped before writing the fit report. This is usually temporary — a slow page or a session that ended early.',
        todo: 'Try again. It usually works the second time and uses your Claude plan again.',
        tech: 'evaluate · lane agent · exit 0 · session ended without writing reports/041-*.md · log data/jsc/logs/evaluate-7f3a.log',
      });
    }
    return s;
  }

  let S;
  try {
    S = JSON.parse(sessionStorage.getItem(STORE) || 'null');
  } catch {
    S = null;
  }
  if (!S || S.v !== 3) S = initialState();
  const save = () => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify(S));
    } catch {
      /* storage unavailable: the prototype forgets on reload */
    }
  };

  // ── announcements and focus ─────────────────────────────────────────
  let pendingFocus = null;
  function announce(msg, urgent = false) {
    const el = document.getElementById(urgent ? 'alert' : 'announce');
    if (!el) return;
    el.textContent = '';
    setTimeout(() => {
      el.textContent = msg;
    }, 60);
  }
  const focusLater = (sel) => {
    pendingFocus = sel;
  };

  // ── routing ─────────────────────────────────────────────────────────
  function route() {
    const raw = location.hash.replace(/^#\/?/, '') || 'today';
    const [path, query = ''] = raw.split('?');
    const parts = path.split('/').filter(Boolean);
    return { parts, page: parts[0] || 'today', params: new URLSearchParams(query) };
  }
  const go = (hash) => {
    location.hash = hash;
  };

  // ── derived ─────────────────────────────────────────────────────────
  const setupDone = () => Boolean(S.cv) && S.companies.length > 0;
  const appById = (id) => S.apps.find((a) => String(a.id) === String(id));
  const working = () => S.runs.filter((r) => r.status === 'working');
  const failedOpen = () => S.runs.filter((r) => r.status === 'failed' && !r.retried && !S.dismissed.includes(r.id));
  const activityState = () => {
    const f = failedOpen().length;
    const w = working().length;
    const d = S.runs.filter((r) => r.status === 'done' && !r.seen).length;
    if (f) return { state: 'failed', label: `Activity · ${f} failed` };
    if (w) return { state: 'working', label: `Activity · ${w} working` };
    if (d) return { state: 'done', label: `Activity · ${d} done` };
    return { state: 'quiet', label: 'Activity' };
  };
  const newCount = () => S.toReview.filter((p) => p.isNew).length;
  const brokenBoards = () => S.companies.filter((c) => c.enabled && c.health && c.health.status !== 'reachable');
  const designOf = (id) => DESIGNS.find((d) => d.id === id) || DESIGNS[0];

  // ── shared bits ─────────────────────────────────────────────────────
  function topbar(page) {
    const nav = [
      ['today', 'Today', ''],
      ['applications', 'Applications', ''],
      ['to-review', 'To review', newCount() ? `<span class="navcount">${newCount()} new</span>` : ''],
      ['companies', 'Companies', brokenBoards().length ? `<span class="navcount warn">${brokenBoards().length}</span>` : ''],
      ['skills', 'Skills', ''],
      ['my-cv', 'My CV', S.cv ? '' : '<span class="navcount warn">add</span>'],
    ];
    const act = activityState();
    return `
<header class="topbar">
  <a class="brand" href="#/today">Job Search Console</a>
  <button class="menu-toggle" data-action="toggle-nav" aria-expanded="${S.ui.navOpen}" aria-controls="mainnav">Menu</button>
  <nav class="mainnav" id="mainnav" aria-label="Main" data-open="${S.ui.navOpen}">
    <ul>${nav.map(([id, label, extra]) => `<li><a href="#/${id}"${page === id ? ' aria-current="page"' : ''}>${label}${extra ? ' ' + extra : ''}</a></li>`).join('')}</ul>
  </nav>
  <div class="topbar-tools">
    <form class="search" role="search" data-form="search">
      <label class="visually-hidden" for="q-search">Find a job, company or document</label>
      <input id="q-search" type="search" placeholder="Find a job, company or document" data-draft value="${esc(S.drafts['q-search'] || '')}">
      <button type="submit">Find</button>
    </form>
    <button class="activity-btn" id="activity-btn" data-action="toggle-panel" data-state="${act.state}" aria-expanded="${S.ui.panel}" aria-controls="activity-panel">${act.label}</button>
    <a class="topbar-link" href="#/workspace"${page === 'workspace' ? ' aria-current="page"' : ''}>Workspace</a>
  </div>
</header>`;
  }

  function notice() {
    const n = S.ui.notice;
    if (!n) return '';
    return `<div class="notice ${n.tone || 'ok'} row between" role="status"><span>${n.html}</span>${n.undo ? `<button class="btn2 btn-sm" data-action="undo" id="undo-btn">Undo</button>` : ''}</div>`;
  }

  function menu(key, label, ariaLabel, items, opts = {}) {
    const open = S.ui.menu === key;
    return `<div class="menu-wrap"><button class="menu-btn" id="mb-${key}" data-action="menu" data-arg="${key}" aria-haspopup="true" aria-expanded="${open}" aria-label="${esc(ariaLabel)}">${esc(label)} ▾</button>${
      open
        ? `<ul class="menu${opts.right ? ' right' : ''}" role="menu" aria-label="${esc(ariaLabel)}">${items
            .map((it) => (it.sep ? '<li role="separator"></li>' : `<li role="none"><button role="menuitem" data-action="${it.action}" data-arg="${esc(it.arg)}">${esc(it.label)}</button></li>`))
            .join('')}</ul>`
        : ''
    }</div>`;
  }

  function statusMenu(a) {
    const items = [];
    for (const st of STATUS_ORDER) {
      if (st === a.status) continue;
      if (st === 'Applied') {
        items.push({ action: 'set-status', arg: `${a.id}|Applied|${TODAY}`, label: 'Applied — today' });
        items.push({ action: 'set-status', arg: `${a.id}|Applied|${YESTERDAY}`, label: 'Applied — yesterday' });
      } else items.push({ action: 'set-status', arg: `${a.id}|${st}|${TODAY}`, label: STATUS_LABEL[st] });
    }
    return menu(`st-${a.id}`, STATUS_LABEL[a.status] || a.status, `Status for ${jobName(a)}: ${STATUS_LABEL[a.status] || a.status}`, items);
  }

  function costLine(min = '2–5') {
    return `<span class="small muted">Uses the AI assistant · about ${min} min · uses your Claude plan</span>`;
  }

  function progress(label) {
    return `<div class="progress" role="progressbar" aria-label="${esc(label)}" aria-valuetext="Working"><span></span></div>`;
  }

  // ── runs ────────────────────────────────────────────────────────────
  function startRun(run) {
    const r = { id: S.nextRun++, status: 'working', startedAt: Date.now(), nested: [], ...run };
    S.runs.push(r);
    announce(`Started: ${r.label}. ${r.kind === 'scan' || r.kind === 'layout' || r.kind === 'layout-all' || r.kind === 'tidy' ? 'This takes a few seconds.' : 'This usually takes 2 to 5 minutes. You can keep working.'}`);
    schedule(r);
    return r;
  }
  function schedule(r) {
    const left = Math.max(400, r.startedAt + (r.ms || RUN_MS) - Date.now());
    setTimeout(() => finish(r.id), left);
  }
  function finish(id) {
    const r = S.runs.find((x) => x.id === id);
    if (!r || r.status !== 'working') return;
    r.finishedAt = Date.now();
    EFFECTS[r.kind]?.(r);
    if (r.status === 'working') r.status = 'done';
    save();
    render();
    if (r.status === 'failed') announce(`Failed: ${r.label}. ${r.cause}`, true);
    else announce(`Done: ${r.outcomeText || r.label}`);
  }

  function guessJob(url) {
    const m = /greenhouse\.io\/([a-z0-9-]+)\/jobs\/(\d+)/i.exec(url || '');
    const known = {
      '4134913': { company: 'Kestrel Media', role: 'Senior Backend Engineer', score: 4.1, decision: 'Apply' },
      '4109592': { company: 'Driftwood Analytics', role: 'Data Engineer', score: 3.7, decision: 'Consider' },
      '4101707': { company: 'Brightwater Health', role: 'Data Engineer', score: 4.1, decision: 'Apply' },
    };
    if (m && known[m[2]]) return known[m[2]];
    const pending = S.toReview.find((p) => p.url === url);
    if (pending) return { company: pending.company, role: pending.role, score: 3.6, decision: 'Consider' };
    const board = m ? m[1] : (url.split('/')[2] || 'company');
    const company = (S.companies.find((c) => slug(c.name) === slug(board))?.name) || board.replace(/(^|-)([a-z])/g, (x, p, ch) => (p ? ' ' : '') + ch.toUpperCase());
    return { company, role: 'Software Engineer', score: 3.6, decision: 'Consider' };
  }

  const EFFECTS = {
    check(r) {
      const g = guessJob(r.url);
      const existing = S.apps.find((a) => a.company === g.company && a.role === g.role);
      let a;
      if (existing) {
        const before = existing.score;
        Object.assign(existing, { score: g.score, date: TODAY, url: r.url, decision: g.decision, updated: `Merged into #${existing.id}: fit ${fit(before)} → ${fit(g.score)}, posting link changed` });
        a = existing;
        r.nested.push(`then: merged into application #${a.id} (same company and role)`);
      } else {
        a = { id: S.nextApp++, date: TODAY, company: g.company, role: g.role, score: g.score, status: 'Evaluated', notes: '', decision: g.decision, url: r.url, gaps: ['Spark'], strengths: ['Go', 'PostgreSQL'], report: sampleReport(g), pdf: null, cover: null, isNew: true };
        S.apps.unshift(a);
        r.nested.push(`then: added to Applications as #${a.id}`);
      }
      r.appId = a.id;
      r.outcomeText = `${jobName(a)} · fit ${fit(a.score)} / 5 · recommendation ${g.decision} · ${existing ? `updated application #${a.id}` : `added to your applications as #${a.id}`}`;
      const item = S.toReview.find((p) => p.url === r.url);
      if (item) {
        S.toReview = S.toReview.filter((p) => p !== item);
        S.processed.unshift({ company: a.company, role: a.role, id: a.id });
        r.nested.push('then: removed from To review');
      }
      if (r.autoCv && a.score >= Number(S.profile.threshold)) {
        a.pdf = { file: `cv-alex-rivera-${slug(a.company)}-${String(a.id).padStart(3, '0')}.pdf`, date: TODAY, design: designOf(S.design.saved).name, rules: TODAY, verdict: designOf(S.design.saved).verdict };
        r.nested.push(`then: made a tailored CV (fit ${fit(a.score)} ≥ ${S.profile.threshold})`);
      }
      (S.history[a.id] ||= []).push(`${fmtDate(TODAY)} ${clock(Date.now())} · fit checked: ${fit(a.score)} / 5`);
      if (r.retryOf) {
        const prev = S.runs.find((x) => x.id === r.retryOf);
        if (prev) prev.retried = true;
      }
    },
    cv(r) {
      const a = appById(r.appId);
      const d = designOf(S.design.saved);
      a.pdf = { file: `cv-alex-rivera-${slug(a.company)}-${String(a.id).padStart(3, '0')}-${TODAY}.pdf`, date: TODAY, time: clock(Date.now()), design: d.name, rules: TODAY, rulesNote: S.voiceChanged ? `your writing rules of today (${S.voiceAdded ? `${plural(S.voiceAdded, 'word')} added` : 'edited'})` : null, verdict: d.verdict };
      r.outcomeText = `Tailored CV for ${jobName(a)} is ready · ${VERDICT_TEXT[d.verdict]}`;
      r.nested.push(`then: laid out in ${d.name} · screening check: ${VERDICT_TEXT[d.verdict].toLowerCase()}`);
      (S.history[a.id] ||= []).push(`${fmtDate(TODAY)} ${clock(Date.now())} · tailored CV made`);
    },
    cover(r) {
      const a = appById(r.appId);
      a.cover = { file: `cover-alex-rivera-${slug(a.company)}-${TODAY}.pdf`, date: TODAY, time: clock(Date.now()), tone: r.tone };
      r.outcomeText = `Cover letter for ${jobName(a)} is ready`;
      (S.history[a.id] ||= []).push(`${fmtDate(TODAY)} ${clock(Date.now())} · cover letter written (${r.tone.toLowerCase()})`);
    },
    layout(r) {
      const a = appById(r.appId);
      const d = designOf(S.design.saved);
      a.pdf = { ...(a.pdf || {}), file: a.pdf?.file || `cv-alex-rivera-${slug(a.company)}-${String(a.id).padStart(3, '0')}.pdf`, date: TODAY, time: clock(Date.now()), design: d.name, verdict: d.verdict, relaid: true };
      r.outcomeText = `${jobName(a)}: CV laid out again in ${d.name} · ${VERDICT_TEXT[d.verdict]}`;
    },
    'layout-all'(r) {
      const d = designOf(S.design.saved);
      const list = S.apps.filter((a) => a.pdf);
      list.forEach((a) => Object.assign(a.pdf, { date: TODAY, design: d.name, verdict: d.verdict, relaid: true }));
      r.outcomeText = `${plural(list.length, 'CV')} laid out again in ${d.name} · all ${VERDICT_TEXT[d.verdict].toLowerCase()}`;
    },
    scan(r) {
      const found = [
        { company: 'Driftwood Analytics', role: 'Site Reliability Engineer', location: 'Remote (Americas)', url: 'https://job-boards.greenhouse.io/driftwoodanalytics/jobs/4110220' },
        { company: 'Harbor Learning', role: 'Full Stack Engineer', location: 'Remote (Americas)', url: 'https://job-boards.greenhouse.io/harborlearning/jobs/4125301' },
        { company: 'Lumen Grid', role: 'Platform Engineer', location: 'Remote (US) · EST overlap', url: 'https://job-boards.greenhouse.io/lumengrid/jobs/4140118' },
        { company: 'Mosaic Retail', role: 'Platform Engineer', location: 'Remote (Americas)', url: 'https://job-boards.greenhouse.io/mosaicretail/jobs/4144870' },
      ];
      const preview = r.preview;
      const active = S.companies.filter((c) => c.enabled);
      const reachable = active.filter((c) => !c.health || c.health.status === 'reachable').length;
      const paused = S.companies.filter((c) => !c.enabled).map((c) => c.name);
      if (!preview) {
        S.toReview.forEach((p) => {
          p.isNew = false;
        });
        found.forEach((f, i) => S.toReview.unshift({ ...f, key: `n${Date.now()}${i}`, posted: TODAY, isNew: true }));
        S.lastScan = { date: TODAY, time: clock(Date.now()) };
      }
      S.lastScan.summary = { found: found.map((f) => `${f.company} — ${f.role}`), checked: reachable, unreachable: brokenBoards().map((c) => c.name), paused, preview };
      r.outcomeText = `${preview ? 'Preview: ' : ''}${found.length} new openings · ${reachable} companies checked${brokenBoards().length ? ` · ${brokenBoards().map((c) => c.name).join(', ')} couldn’t be reached` : ''}`;
      if (!preview) r.nested.push('then: fetched posting text for Skills');
    },
    tidy(r) {
      S.ui.tidy[r.tool] = 'done';
      r.outcomeText = r.result;
    },
    skills(r) {
      S.skills.coverage.extractedLlm += S.skills.coverage.pendingLlm;
      S.skills.coverage.rulesOnly = 0;
      S.skills.coverage.pendingLlm = 0;
      S.skills.coverage.readOn = TODAY;
      r.outcomeText = `Skills analysis improved: ${S.skills.coverage.extractedLlm} postings now read by Claude`;
    },
    boards(r) {
      r.outcomeText = brokenBoards().length ? `${brokenBoards().length} job board needs attention: ${brokenBoards().map((c) => c.name).join(', ')}` : 'All job boards answered';
    },
  };

  function sampleReport(g) {
    return [
      { title: 'A) Role Summary', text: `${g.company} — ${g.role}. Remote (US). Owns backend services end to end.` },
      { title: 'B) CV Match', text: 'Go — direct production experience (cv.md: Experience). PostgreSQL — direct. Spark — not on your CV.' },
      { title: 'C) Level and Strategy', text: 'Senior level matches your seven years. Lead with the settlement pipeline rebuild.' },
      { title: 'D) Comp and Demand', text: 'Advertised $150K–175K; in line with your target.' },
      { title: 'E) Personalization Plan', text: 'Move payments and data-pipeline bullets up; name the queue-backed scheduler.' },
      { title: 'F) Interview Plan', text: 'Expect a system design round on data pipelines.' },
    ];
  }

  // ── pages ───────────────────────────────────────────────────────────
  function pageHead(title, sub = '', actions = '') {
    return `<div class="page-head"><div class="stack-sm"><h1 tabindex="-1" id="page-title">${title}</h1>${sub ? `<p class="lead">${sub}</p>` : ''}</div>${actions}</div>`;
  }

  function addJobBox(prefix) {
    const err = S.errors[`${prefix}-url`];
    const r = S.runs.find((x) => x.id === S.ui.addRun);
    let result = '';
    if (r && r.status === 'working') result = `<div class="card work" id="${prefix}-result"><span class="tag work">Checking fit · usually 2–5 min</span><p><b>${esc(guessJob(r.url).company)}</b> — ${esc(r.url)}</p>${progress('Checking fit')}<p class="small muted">You can keep working. The result appears here and in Activity.</p></div>`;
    else if (r && r.status === 'done') {
      const a = appById(r.appId);
      result = `<div class="card ok" id="${prefix}-result"><span class="tag ok">Done · ${a.updated ? `updated application #${a.id}` : `added to your applications as #${a.id}`}</span><h3>${esc(jobName(a))}</h3><p><b>Fit ${fit(a.score)} / 5</b> · Recommendation: <b>${esc(a.decision)}</b></p>${a.updated ? `<p class="small">${esc(a.updated)}</p>` : ''}${r.nested.length ? `<p class="small muted">${r.nested.map(esc).join(' · ')}</p>` : ''}<div class="row"><a class="btn" href="#/applications/${a.id}" id="${prefix}-open">Open ${esc(a.company)}</a></div></div>`;
    } else if (r && r.status === 'saved') result = `<div class="notice ok" id="${prefix}-result" role="status">Saved for later in <a href="#/to-review">To review</a>: ${esc(guessJob(r.url).company)}.</div>`;
    return `
<form class="card" data-form="add-job" data-arg="${prefix}" novalidate aria-labelledby="${prefix}-h">
  <h2 id="${prefix}-h" class="h3" style="font-size:var(--text-lg)">Add a job</h2>
  <div><label for="${prefix}-url">Job posting link</label><input id="${prefix}-url" type="url" data-draft placeholder="https://…/jobs/123" value="${esc(S.drafts[`${prefix}-url`] || '')}" ${err ? `aria-invalid="true" aria-describedby="${prefix}-url-err"` : ''}>${err ? `<p class="error" id="${prefix}-url-err">${esc(err)}</p>` : ''}</div>
  <label class="check"><input type="checkbox" id="${prefix}-autocv" data-draft-check ${S.drafts[`${prefix}-autocv`] === false ? '' : 'checked'}> Also make a tailored CV if the fit is ${esc(S.profile.threshold)} or more <span class="muted">(set in <a href="#/my-cv/profile">Profile</a>)</span></label>
  <div class="row"><button class="btn" type="submit" data-submit="check">Check fit now</button><button class="btn2" type="submit" data-submit="save">Save for later</button></div>
  <p class="small muted"><b>Check fit now:</b> the AI assistant writes a fit report — about 2–5 min, uses your Claude plan. <b>Save for later:</b> keeps the link in To review.</p>
  ${result}
</form>`;
  }

  function cvSummary(text) {
    const name = (/^#\s+(.+)$/m.exec(text || '') || [])[1] || 'Your CV';
    const secs = [...(text || '').matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
    const roles = (text || '').match(/^###\s+/gm)?.length || 0;
    return `<b>${esc(name)}</b> · ${secs.map((s) => (s === 'Experience' && roles ? `Experience (${plural(roles, 'role')})` : esc(s))).join(', ') || 'no sections found'}`;
  }

  function pageToday() {
    const parts = [];
    if (!setupDone()) {
      const cvErr = S.errors['cv-paste'];
      const nErr = S.errors['co-name'];
      const uErr = S.errors['co-url'];
      const left = (S.cv ? 0 : 1) + (S.companies.length ? 0 : 1);
      parts.push(pageHead('Welcome. Let’s get you set up.', `${plural(left, 'step')} left · about 5 minutes. Everything else in the app works meanwhile.`));
      parts.push(`<section aria-labelledby="setup-h" class="stack"><h2 id="setup-h">Get set up</h2><ol class="steps">
<li class="card ${S.cv ? 'ok' : ''}"><div class="row"><span class="stepnum ${S.cv ? 'done' : ''}" aria-hidden="true">${S.cv ? '✓' : '1'}</span><h3 id="step-cv">Add your CV ${S.cv ? '<span class="visually-hidden">(done)</span>' : ''}</h3></div>
${S.cv
  ? `<p id="cv-saved" tabindex="-1">Saved: ${cvSummary(S.cv)}. <a href="#/my-cv/content">Edit in My CV</a></p>`
  : `<p class="muted">Every check, tailored CV and letter starts from it. Paste it, or choose a Markdown or text file.</p>
<form class="stack-sm" data-form="save-cv" novalidate><div><label for="cv-paste">Your CV</label><textarea id="cv-paste" rows="8" data-draft placeholder="Paste your CV here (Markdown or plain text)" ${cvErr ? 'aria-invalid="true" aria-describedby="cv-paste-err"' : 'aria-describedby="cv-paste-hint"'}>${esc(S.drafts['cv-paste'] || '')}</textarea>${cvErr ? `<p class="error" id="cv-paste-err">${esc(cvErr)}</p>` : ''}<p class="hint" id="cv-paste-hint">Saved in your workspace folder as cv.md, so the command-line tools see it too. You can edit it later in My CV.</p></div>
<div><label for="cv-file">Or choose a file</label><input id="cv-file" type="file" accept=".md,.txt,text/markdown,text/plain" data-change="cv-file"></div>
<div class="row"><button class="btn" type="submit">Save my CV</button></div></form>`}
</li>
<li class="card ${S.companies.length ? 'ok' : ''}"><div class="row"><span class="stepnum ${S.companies.length ? 'done' : ''}" aria-hidden="true">${S.companies.length ? '✓' : '2'}</span><h3 id="step-co">Follow a company ${S.companies.length ? '<span class="visually-hidden">(done)</span>' : ''}</h3></div>
${S.companies.length
  ? `<p id="co-saved" tabindex="-1">Following <b>${esc(S.companies[0].name)}</b> · ${esc(providerName(S.companies[0].provider))} job board found · 6 open roles. <a href="#/companies">Companies you follow</a></p>`
  : `<p class="muted">The app checks the companies you follow for new openings. Start with one; add more any time.</p>
<form class="stack-sm" data-form="follow" data-arg="setup" novalidate><div class="grid-2"><div><label for="co-name">Company name</label><input id="co-name" type="text" data-draft placeholder="e.g. Example Corp" value="${esc(S.drafts['co-name'] || '')}" ${nErr ? 'aria-invalid="true" aria-describedby="co-name-err"' : ''}>${nErr ? `<p class="error" id="co-name-err">${esc(nErr)}</p>` : ''}</div>
<div><label for="co-url">Careers page link</label><input id="co-url" type="url" data-draft placeholder="https://…" value="${esc(S.drafts['co-url'] || '')}" ${uErr ? 'aria-invalid="true" aria-describedby="co-url-err"' : 'aria-describedby="co-url-hint"'}>${uErr ? `<p class="error" id="co-url-err">${esc(uErr)}</p>` : `<p class="hint" id="co-url-hint">Greenhouse, Lever, Ashby and most other job boards are recognised from the link.</p>`}</div></div>
<div class="row"><button class="btn" type="submit">Follow company</button></div></form>`}
</li>
<li class="card ok"><div class="row"><span class="stepnum done" aria-hidden="true">✓</span><h3>AI assistant ready <span class="visually-hidden">(done)</span></h3></div><p>Claude Code is installed and signed in. Each check takes 2–5 minutes and uses your Claude plan. <a href="#/help/costs">What a check costs</a></p></li>
</ol></section>`);
      return parts.join('');
    }

    const nf = failedOpen();
    const cards = [];
    for (const r of nf) {
      cards.push(`<article class="card attn" aria-labelledby="fail-${r.id}"><span class="tag attn">Needs you · a ${r.kind === 'check' ? 'fit check' : 'job'} didn’t finish</span><h3 id="fail-${r.id}">${esc(r.label.replace(/^Check fit · /, ''))}</h3>
<p>You asked for a fit check at ${clock(r.startedAt)}. ${esc(r.cause)}</p><p>${esc(r.todo)}</p>
<div class="row"><button class="btn" data-action="retry" data-arg="${r.id}" id="retry-${r.id}">Try again</button>${r.url ? `<a class="btn2" href="${esc(r.url)}" target="_blank" rel="noopener">Open the posting ↗</a>` : ''}<button class="btn2" data-action="dismiss" data-arg="${r.id}">Dismiss</button></div>
<details><summary>Technical details</summary><p class="mono">${esc(r.tech)}</p></details></article>`);
    }
    if (S.dataIssue) cards.push(`<article class="card attn"><span class="tag attn">Needs you · data problem</span><h3>1 application could not be read</h3><p>${esc(S.dataIssue.company)} — ${esc(S.dataIssue.role)} (line ${S.dataIssue.line} of your applications file): ${esc(S.dataIssue.problem)}. It is hidden from Applications until it is fixed.</p><div class="row"><a class="btn2" href="#/workspace">Show me how to fix it</a></div></article>`);
    if (designOf(S.design.saved).verdict === 'fail') cards.push(`<article class="card attn"><span class="tag attn">Needs you · your CV design</span><h3>Your CV design fails the screening check</h3><p>Tailored CVs made with “${esc(designOf(S.design.saved).name)}” lose your name and 3 headings when an applicant-tracking system reads them.</p><div class="row"><a class="btn" href="#/my-cv/design">Choose a design that passes</a></div></article>`);
    for (const c of brokenBoards()) cards.push(`<article class="card attn"><span class="tag attn">Needs you · a job board isn’t working</span><h3>${esc(c.name)}: board not found since ${fmtDate(c.health.at)}</h3><p>The app can’t check ${esc(c.name)} for new openings until the link is fixed or the company is paused.</p><div class="row"><a class="btn2" href="#/companies">Fix ${esc(c.name)}</a></div></article>`);

    const news = S.toReview.filter((p) => p.isNew);
    const newCard = news.length
      ? `<article class="card"><span class="tag info">New since you last looked</span><h3>${plural(news.length, 'new opening')} at the companies you follow</h3><ul>${news.map((p) => `<li>${esc(p.company)} — ${esc(p.role)}</li>`).join('')}</ul><div class="row"><a class="btn2" href="#/to-review">Look at the ${news.length} new openings</a></div></article>`
      : `<article class="card"><span class="tag info">New openings</span><h3>${S.lastScan.date ? `Last checked for new openings ${fmtDate(S.lastScan.date)}` : 'You haven’t checked for new openings yet'}</h3><p class="muted">Checks the ${plural(S.companies.filter((c) => c.enabled).length, 'company', 'companies')} you follow. Takes a few seconds; no AI involved.</p><div class="row"><button class="btn2" data-action="scan" id="today-scan">Check for new openings</button></div></article>`;

    const waiting = S.apps.filter((a) => (a.status === 'Responded' || a.status === 'Interview') && (!a.pdf || !a.cover));
    const reviewed = S.apps.filter((a) => a.status === 'Evaluated').sort((x, y) => (y.score ?? 0) - (x.score ?? 0));
    const waitCards = [];
    if (waiting.length) waitCards.push(`<article class="card"><span class="tag info">Waiting for you</span><h3>${plural(waiting.length, 'job')} that replied or ${waiting.length === 1 ? 'is' : 'are'} interviewing without a tailored CV or letter</h3><ul>${waiting.map((a) => `<li><a href="#/applications/${a.id}/documents">${esc(jobName(a))}</a> — ${STATUS_LABEL[a.status]} · ${!a.pdf && !a.cover ? 'no CV or letter' : !a.pdf ? 'no tailored CV' : 'no cover letter'}</li>`).join('')}</ul></article>`);
    if (reviewed.length) waitCards.push(`<article class="card"><span class="tag info">Waiting for you</span><h3>${plural(reviewed.length, 'job')} reviewed but not applied</h3><p>Best: ${reviewed.slice(0, 3).map((a) => `<a href="#/applications/${a.id}">${esc(jobName(a))}</a> (${fit(a.score)})`).join(' · ')}</p><div class="row"><a class="btn2" href="#/applications?status=Evaluated">Review them</a></div></article>`);

    const finished = S.runs.filter((r) => r.status === 'done' && !r.ack && r.kind !== 'save' && r.kind !== 'tidy');
    const doneCards = finished
      .slice()
      .reverse()
      .map((r) => {
        const a = r.appId ? appById(r.appId) : null;
        const head = r.kind === 'check' && a ? `<span class="tag ok">Done · ${a.updated ? `updated application #${a.id}` : `added to your applications as #${a.id}`}</span><h3>${esc(jobName(a))}</h3><p style="font-size:var(--text-lg)"><b>Fit ${fit(a.score)} / 5</b> · Recommendation: <b>${esc(a.decision)}</b></p>${r.retryOf ? '<p class="small muted">Second attempt — the first one didn’t finish.</p>' : ''}` : `<span class="tag ok">Done</span><h3>${esc(r.label)}</h3><p>${esc(r.outcomeText || '')}</p>`;
        const open = r.kind === 'scan' ? '<a class="btn" href="#/to-review">See the new openings</a>' : a ? `<a class="btn" href="#/applications/${a.id}${r.kind === 'check' ? '' : '/documents'}">Open ${esc(a.company)}</a>` : '<a class="btn" href="#/activity">Open Activity</a>';
        return `<article class="card ok" aria-labelledby="done-${r.id}"><div id="done-${r.id}" tabindex="-1" class="stack-sm">${head}</div><div class="row">${open}<button class="btn2" data-action="ack" data-arg="${r.id}">Got it<span class="visually-hidden">: ${esc(r.label)}</span></button></div></article>`;
      });
    const w = working();
    const workCard = w.length ? `<article class="card work"><span class="tag work">Working now</span><ul>${w.map((r) => `<li>${esc(r.label)} — started ${clock(r.startedAt)}</li>`).join('')}</ul><div class="row"><button class="btn2" data-action="toggle-panel">Open Activity</button></div></article>` : '';
    const firstJob = S.apps.length ? '' : `<section aria-labelledby="fj-h" class="stack"><h2 id="fj-h" class="group-title">Next</h2>${addJobBox('today')}</section>`;
    const needs = cards.length ? `<section aria-labelledby="needs-h" class="stack"><h2 id="needs-h" class="group-title">Needs you</h2>${cards.join('')}</section>` : '';
    if (S.setupJustDone) {
      doneCards.unshift(`<article class="card ok" aria-labelledby="setup-done-h"><span class="tag ok">Set-up complete</span><h3 id="setup-done-h" tabindex="-1">You’re set up</h3><ul class="stack-sm" style="list-style:none;margin:0;padding:0"><li>✓ Your CV: ${cvSummary(S.cv)} · <a href="#/my-cv/content">Edit in My CV</a></li><li>✓ Following <b>${esc(S.companies[0].name)}</b> · ${esc(providerName(S.companies[0].provider))} job board found · <a href="#/companies">Companies you follow</a></li><li>✓ AI assistant ready</li></ul><p>Next: check a job you already like (below), or look for new openings at ${esc(S.companies[0].name)}.</p><div class="row"><button class="btn2" data-action="ack-setup">Got it</button></div></article>`);
    }
    const justDone = doneCards.length ? `<section aria-labelledby="done-h" class="stack"><h2 id="done-h" class="group-title">Just finished</h2>${doneCards.join('')}</section>` : '';
    return `${pageHead('Good morning, Alex', `${cards.length ? `${plural(cards.length, 'thing needs', 'things need')} you. ` : 'Nothing needs you right now. '}Here is what changed and what is waiting.`)}${notice()}${needs}${justDone}${workCard ? `<section aria-labelledby="work-h" class="stack"><h2 id="work-h" class="group-title">Working now</h2>${workCard}</section>` : ''}${firstJob}
<section aria-labelledby="new-h" class="stack"><h2 id="new-h" class="group-title">New since you last looked</h2>${newCard}</section>
${waitCards.length ? `<section aria-labelledby="wait-h" class="stack"><h2 id="wait-h" class="group-title">Waiting for you</h2>${waitCards.join('')}</section>` : ''}`;
  }

  const providerName = (p) => ({ greenhouse: 'Greenhouse', lever: 'Lever', ashby: 'Ashby' })[p] || 'Job board';

  function filteredApps() {
    const f = S.ui.appFilter;
    const q = f.q.trim().toLowerCase();
    let list = S.apps.filter((a) => {
      if (S.ui.keep.includes(a.id)) return true;
      if (f.status !== 'all' && a.status !== f.status) return false;
      if (f.fit === '4' && !(a.score >= 4)) return false;
      if (f.fit === '3.5' && !(a.score >= 3.5)) return false;
      if (f.fit === 'low' && !(a.score < 3)) return false;
      if (q && !`${a.company} ${a.role} ${a.notes}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const { key, dir } = S.ui.sort;
    const val = (a) => (key === 'fit' ? a.score ?? -1 : key === 'date' ? a.date : key === 'company' ? jobName(a).toLowerCase() : key === 'status' ? STATUS_ORDER.indexOf(a.status) : a.id);
    list = list.slice().sort((x, y) => (val(x) < val(y) ? -1 : val(x) > val(y) ? 1 : 0) * (dir === 'desc' ? -1 : 1));
    return list;
  }

  function sortHeader(key, label) {
    const s = S.ui.sort;
    const on = s.key === key;
    const aria = on ? (s.dir === 'desc' ? 'descending' : 'ascending') : 'none';
    return `<th scope="col" aria-sort="${aria}"><button class="sort" data-action="sort" data-arg="${key}">${label}${on ? (s.dir === 'desc' ? ' ↓' : ' ↑') : ''}<span class="visually-hidden">${on ? '' : ', sort'}</span></button></th>`;
  }

  function docsCell(a) {
    const bits = [];
    if (a.pdf) bits.push(a.pdf.verdict === 'fail' ? '<span class="badge fail">CV fails screening</span>' : 'CV');
    if (a.cover) bits.push('letter');
    const w = S.runs.find((r) => r.status === 'working' && r.appId === a.id && (r.kind === 'cv' || r.kind === 'cover'));
    if (w) bits.push('<span class="badge new">working</span>');
    return bits.join(', ') || '—';
  }

  function pageApplications(params) {
    if (params.get('status') && !S.ui.appliedParam) {
      S.ui.appFilter.status = params.get('status');
      S.ui.appliedParam = true;
    }
    const f = S.ui.appFilter;
    const counts = {};
    S.apps.forEach((a) => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });
    const list = filteredApps();
    const filtering = f.status !== 'all' || f.fit !== 'any' || f.q;
    const chips = [`<button class="chip" data-action="filter-status" data-arg="all" aria-pressed="${f.status === 'all'}">All ${S.apps.length}</button>`]
      .concat(STATUS_ORDER.filter((s) => counts[s]).map((s) => `<button class="chip" data-action="filter-status" data-arg="${s}" aria-pressed="${f.status === s}">${STATUS_LABEL[s]} ${counts[s]}</button>`))
      .join('');
    const rows = list
      .map((a) => {
        const msg = S.ui.rowMsg[a.id];
        const actions = [
          { action: 'make-cv', arg: String(a.id), label: a.pdf ? `Make tailored CV again for ${a.company}` : `Make tailored CV for ${a.company}` },
          { action: 'goto', arg: `#/applications/${a.id}/cover`, label: `Write cover letter for ${a.company}` },
          { action: 'check-again', arg: String(a.id), label: 'Check fit again' },
          ...(a.url ? [{ action: 'open-url', arg: a.url, label: 'Open the posting ↗' }] : []),
        ];
        return `<tr class="${S.ui.keep.includes(a.id) ? 'moved' : ''} ${a.isNew || a.updated ? 'flash' : ''}" id="row-${a.id}">
<td class="num" data-label="#">${a.id}</td>
<td data-label="Job"><a class="joblink" href="#/applications/${a.id}">${esc(a.company)} — ${esc(a.role)}</a>${a.isNew ? ' <span class="badge new">New</span>' : ''}${a.updated ? ' <span class="badge new">Updated</span>' : ''}</td>
<td class="num" data-label="Fit">${fit(a.score)}</td>
<td data-label="Recommendation">${esc(RECO[a.decision] || a.decision || '—')}</td>
<td data-label="Status">${statusMenu(a)}${msg ? `<span class="rowmsg" role="status">${esc(msg)} <button class="btn-link" data-action="undo">Undo</button></span>` : ''}</td>
<td class="hide-md" data-label="Documents">${docsCell(a)}</td>
<td class="hide-md num" data-label="Checked">${fmtDate(a.date)}</td>
<td data-label="Actions">${menu(`act-${a.id}`, 'Actions', `Actions for ${jobName(a)}`, actions, { right: true })}</td></tr>`;
      })
      .join('');
    const tidy = menu('tidy-apps', 'Tidy up', 'Tidy up applications', [
      { action: 'goto', arg: '#/workspace|dedup', label: 'Find duplicate applications' },
      { action: 'goto', arg: '#/workspace|verify', label: 'Check my list for problems' },
    ], { right: true });
    return `${pageHead('Applications', `${plural(S.apps.length, 'application')} · ${counts.Evaluated || 0} reviewed but not applied`, tidy)}${notice()}
${addJobBox('add')}
<section aria-labelledby="list-h" class="stack-sm"><h2 id="list-h" class="visually-hidden">Your applications</h2>
<div class="chips" role="group" aria-label="Show by status">${chips}</div>
<div class="row"><div style="width:14rem"><label for="fit-filter">Fit</label><select id="fit-filter" data-change="fit-filter"><option value="any"${f.fit === 'any' ? ' selected' : ''}>Any</option><option value="4"${f.fit === '4' ? ' selected' : ''}>4 and up</option><option value="3.5"${f.fit === '3.5' ? ' selected' : ''}>3.5 and up</option><option value="low"${f.fit === 'low' ? ' selected' : ''}>Under 3</option></select></div>
<div class="grow" style="max-width:22rem"><label for="app-q">Search</label><input id="app-q" type="search" data-draft data-live="app-q" placeholder="Company, role or note" value="${esc(f.q)}"></div>
${filtering ? '<button class="btn2" data-action="clear-filters" style="align-self:flex-end">Clear filters</button>' : ''}</div>
<p class="small muted" role="status">Showing ${list.length} of ${S.apps.length}${filtering ? ' (filtered)' : ''}</p>
${list.length ? `<div class="table-wrap"><table class="stackable"><caption>Your applications. Open a job to see its fit report and documents.</caption><thead><tr>${sortHeader('id', '#')}${sortHeader('company', 'Company and role')}${sortHeader('fit', 'Fit')}<th scope="col">Recommendation</th>${sortHeader('status', 'Status')}<th scope="col" class="hide-md">Documents</th>${sortHeader('date', 'Checked').replace('<th ', '<th class="hide-md" ')}<th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead><tbody>${rows}</tbody></table></div>`
  : `<div class="card"><h3>No applications match</h3><p class="muted">${S.apps.length ? 'Nothing matches these filters.' : 'Add a job above, or look at what is waiting in To review.'}</p>${filtering ? '<div><button class="btn2" data-action="clear-filters">Clear filters</button></div>' : ''}</div>`}
</section>`;
  }

  function verdictLine(v, detailsId) {
    if (v === 'fail') return `<div class="notice attn"><b>Screening check: problems.</b> An applicant-tracking system loses your name and 3 headings in this CV. <a href="#/my-cv/design">Choose a design that passes</a><details id="${detailsId}"><summary>Details</summary><ul class="small"><li>Name is drawn as an image-like heading the text layer skips</li><li>“Experience”, “Skills”, “Education” are in a side column read out of order</li><li>2 dates are split across columns</li></ul></details></div>`;
    if (v === 'warn') return `<p class="notice warn"><b>Screening check: readable, 2 small issues</b> — nothing you need to fix. <a href="#/help/screening">What is checked</a></p>`;
    return `<p class="notice ok"><b>Screening check: readable</b> by applicant-tracking systems. <a href="#/help/screening">What is checked</a></p>`;
  }

  function pageJob(id, sub) {
    const a = appById(id);
    if (!a) return `${pageHead('Job not found')}<p><a href="#/applications">← Applications</a></p>`;
    const runsHere = S.runs.filter((r) => r.appId === a.id);
    const cvRun = runsHere.find((r) => r.kind === 'cv' && r.status === 'working');
    const layRun = runsHere.find((r) => r.kind === 'layout' && r.status === 'working');
    const clRun = runsHere.find((r) => r.kind === 'cover' && r.status === 'working');
    const chkRun = S.runs.find((r) => r.kind === 'check' && r.status === 'working' && r.url && r.url === a.url);
    const coverForm = S.ui.coverOpen[a.id] || sub === 'cover';
    if (sub === 'cover') S.ui.coverOpen[a.id] = true;
    const errs = (k) => S.errors[`cl-${k}-${a.id}`];
    const field = (k, label) => `<div><label for="cl-${k}-${a.id}">${label} <span class="req">(required)</span></label><textarea id="cl-${k}-${a.id}" rows="2" data-draft ${errs(k) ? `aria-invalid="true" aria-describedby="cl-${k}-${a.id}-err"` : ''}>${esc(S.drafts[`cl-${k}-${a.id}`] || '')}</textarea>${errs(k) ? `<p class="error" id="cl-${k}-${a.id}-err">${esc(errs(k))}</p>` : ''}</div>`;
    const d = designOf(S.design.saved);
    const cvCard = `<section class="card" aria-labelledby="doc-cv-h"><div class="row between"><h3 id="doc-cv-h">Tailored CV</h3>${cvRun || layRun ? '<span class="badge new">Working</span>' : a.pdf ? (a.pdf.verdict === 'fail' ? '<span class="badge fail">Fails screening</span>' : '<span class="badge ok">Ready</span>') : '<span class="badge neutral">Not made yet</span>'}</div>
${cvRun || layRun
  ? `${progress(`Making the tailored CV for ${jobName(a)}`)}<p class="small" id="cv-working" tabindex="-1">${cvRun ? 'Writing your CV for this role… usually about 3 minutes.' : 'Laying out the PDF again in your design… a few seconds, no AI.'} You can leave this page; it appears here and in Activity.</p>`
  : a.pdf
    ? `<p id="cv-ready" tabindex="-1"><span class="mono">${esc(a.pdf.file)}</span><br>Made ${fmtDate(a.pdf.date)}${a.pdf.time ? `, ${a.pdf.time}` : ''} · ${esc(a.pdf.design)} design · ${esc(a.pdf.rulesNote || `your writing rules of ${fmtDate(a.pdf.rules || a.pdf.date)}`)}${a.pdf.relaid ? ' · layout updated (wording unchanged)' : ''}</p>${verdictLine(a.pdf.verdict, `cvd-${a.id}`)}
<div class="row"><a class="btn" href="#/document/cv/${a.id}">Open</a><button class="btn2" data-action="download" data-arg="cv|${a.id}">Download</button><button class="btn2" data-action="make-cv" data-arg="${a.id}">Make it again</button>${a.pdf.design !== d.name ? `<button class="btn2" data-action="layout" data-arg="${a.id}">Update the layout to ${esc(d.name)}</button>` : ''}</div>
<p class="small muted"><b>Make it again</b> rewrites the CV for this role with your current CV and writing rules (AI, about 3 min). ${a.pdf.design !== d.name ? `<b>Update the layout</b> only re-draws it in ${esc(d.name)} (no AI, wording unchanged).` : ''}</p>`
    : `<p>Your CV rewritten for this role, in your design (${esc(d.name)}).</p><p>${costLine('3')}</p><div class="row"><button class="btn" data-action="make-cv" data-arg="${a.id}" id="make-cv-${a.id}">Make tailored CV</button></div>`}
</section>`;
    const clCard = `<section class="card" aria-labelledby="doc-cl-h"><div class="row between"><h3 id="doc-cl-h">Cover letter</h3>${clRun ? '<span class="badge new">Working</span>' : a.cover ? '<span class="badge ok">Ready</span>' : '<span class="badge neutral">Not made yet</span>'}</div>
${clRun
  ? `${progress(`Writing the cover letter for ${jobName(a)}`)}<p class="small" id="cl-working" tabindex="-1">Writing in a ${esc(clRun.tone.toLowerCase())} tone… usually about 2 minutes.</p>`
  : coverForm
    ? `<form class="stack-sm" data-form="cover" data-arg="${a.id}" novalidate aria-label="Cover letter questions for ${esc(jobName(a))}"><p class="small muted">Answer three short questions; the assistant drafts a one-page letter from them and your CV.</p>${field('why', 'Why this role?')}${field('problem', 'What problem would you solve for them?')}${field('approach', 'How would you start?')}
<div style="max-width:16rem"><label for="cl-tone-${a.id}">Tone</label><select id="cl-tone-${a.id}" data-draft-select>${['Direct', 'Warm', 'Formal'].map((t) => `<option${(S.drafts[`cl-tone-${a.id}`] || 'Direct') === t ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
${a.cover ? `<p class="notice warn">This replaces the letter of ${fmtDate(a.cover.date)}.</p>` : ''}<p>${costLine('2')}</p>
<div class="row"><button class="btn" type="submit">Write the letter</button><button class="btn2" type="button" data-action="cancel-cover" data-arg="${a.id}">Cancel</button></div></form>`
    : a.cover
      ? `<p id="cl-ready" tabindex="-1"><span class="mono">${esc(a.cover.file)}</span><br>Made ${fmtDate(a.cover.date)}${a.cover.time ? `, ${a.cover.time}` : ''}${a.cover.tone ? ` · ${esc(a.cover.tone.toLowerCase())} tone` : ''}</p><div class="row"><a class="btn" href="#/document/cover/${a.id}">Open</a><button class="btn2" data-action="download" data-arg="cover|${a.id}">Download</button><button class="btn2" data-action="open-cover" data-arg="${a.id}">Write it again</button></div>`
      : `<p>A one-page letter for this role from three short answers.</p><div class="row"><button class="btn2" data-action="open-cover" data-arg="${a.id}" id="open-cover-${a.id}">Write cover letter</button></div>`}
</section>`;
    const failedHere = S.runs.find((r) => r.status === 'failed' && !r.retried && r.appId === a.id);
    const hist = (S.history[a.id] || []).slice().reverse();
    return `<p><a href="#/applications">← Applications</a></p>
${pageHead(`${esc(a.company)} — ${esc(a.role)}`, `${esc(a.archetype || '')}${a.comp ? ` · ${esc(a.comp)}` : ''}`)}${notice()}
${a.updated ? `<p class="notice info">${esc(a.updated)}</p>` : ''}
${failedHere ? `<div class="notice attn">The last check of this job didn’t finish. <button class="btn btn-sm" data-action="retry" data-arg="${failedHere.id}">Try again</button></div>` : ''}
<section aria-labelledby="sum-h" class="card"><h2 id="sum-h" class="visually-hidden">Summary</h2>
<div class="row between"><p style="font-size:var(--text-lg)"><b>Fit ${fit(a.score)} / 5</b> · Recommendation: <b>${esc(RECO[a.decision] || a.decision || '—')}</b> <a class="small" href="#/help/fit">How the fit is worked out</a></p>${a.url ? `<a href="${esc(a.url)}" target="_blank" rel="noopener">Open the posting ↗</a>` : ''}</div>
<div class="row"><span class="label" style="margin:0">Status</span>${statusMenu(a)}${S.ui.rowMsg[a.id] ? `<span class="rowmsg" role="status">${esc(S.ui.rowMsg[a.id])} <button class="btn-link" data-action="undo">Undo</button></span>` : ''}</div>
<div class="row">${chkRun ? `${progress('Checking fit again')}<span class="small">Checking fit again…</span>` : `<button class="btn2 btn-sm" data-action="check-again" data-arg="${a.id}">Check fit again</button> ${costLine()}`}</div>
${a.notes ? `<p class="small"><b>Your note:</b> ${esc(a.notes)}</p>` : ''}</section>
<section aria-labelledby="docs-h" class="stack" id="documents"><h2 id="docs-h">Documents</h2><div class="grid-2">${cvCard}${clCard}</div>
<p class="small muted">You send these yourself — the app never applies or emails for you.${a.status === 'Evaluated' ? ` <button class="btn2 btn-sm" data-action="sent" data-arg="${a.id}">I’ve sent my application</button>` : ''}</p></section>
<section aria-labelledby="rep-h" class="stack"><h2 id="rep-h">Fit report</h2><div class="card"><p><b>Fit ${fit(a.score)} / 5.</b> The assistant compares the posting with your CV and profile in six parts (A–F) and scores the match from 1 to 5; 4 and up is a strong fit. ${a.gaps?.length ? `Gaps it found: ${a.gaps.map(esc).join(', ')}.` : ''}</p>
${(a.report || []).map((r) => `<h3 style="font-size:var(--text-md)">${esc(r.title)}</h3><p class="small">${esc(r.text)}…</p>`).join('')}</div></section>
<section aria-labelledby="his-h" class="stack"><h2 id="his-h">History</h2><ul class="small">${hist.map((h) => `<li>${esc(h)}</li>`).join('')}<li>${fmtDate(a.date)} · fit checked: ${fit(a.score)} / 5</li></ul></section>`;
  }

  function pageDocument(kind, id) {
    const a = appById(id);
    const doc = a && (kind === 'cv' ? a.pdf : a.cover);
    if (!doc) return `${pageHead('Document not found')}<p><a href="#/applications">← Applications</a></p>`;
    return `<p><a href="#/applications/${a.id}/documents">← ${esc(jobName(a))}</a></p>${pageHead(kind === 'cv' ? 'Tailored CV' : 'Cover letter', `${esc(jobName(a))} · <span class="mono">${esc(doc.file)}</span>`, `<button class="btn" data-action="download" data-arg="${kind}|${a.id}">Download</button>`)}${notice()}
<div class="preview" aria-label="Document preview">${kind === 'cv'
  ? `<h3>Alex Rivera</h3><p>Austin, TX (remote) · alex.rivera@example.com</p><p class="sec">Summary</p><p>Backend engineer, seven years in payments and data platforms (Go, TypeScript). Tailored for ${esc(a.company)}: ${esc(a.role)}.</p><p class="sec">Experience</p><p><b>Senior Backend Engineer — Northwind Payments</b> (2022–present)</p><ul><li>Rebuilt the settlement pipeline as an event-driven Go service; reconciliation went from 4 hours to 25 minutes.</li><li>Moved cron jobs to a queue-backed scheduler with idempotent retries; payment incidents fell 60% in two quarters.</li></ul><p class="sec">Skills</p><p>Go, TypeScript, SQL, PostgreSQL, Kafka, Kubernetes</p>`
  : `<p>Dear ${esc(a.company)} hiring team,</p><p>I want this role because ${esc(a.company)} runs payments at a scale I have not worked at yet…</p><p>Alex Rivera</p>`}</div>
<p class="small muted">Prototype: a fictional preview. The real app opens the PDF.</p>`;
  }

  function pageToReview() {
    const sum = S.lastScan.summary;
    const scanning = S.runs.find((r) => r.kind === 'scan' && r.status === 'working');
    const sel = S.ui.selected;
    const items = S.toReview
      .map((p) => {
        const failedRun = S.runs.find((r) => r.status === 'failed' && !r.retried && r.url === p.url);
        const checking = S.runs.find((r) => r.status === 'working' && r.kind === 'check' && r.url === p.url);
        return `<li class="card" style="padding:var(--space-3) var(--space-4)" id="tr-${p.key}"><div class="row between"><label class="check" style="margin:0"><input type="checkbox" data-action="select" data-arg="${p.key}" ${sel.includes(p.key) ? 'checked' : ''}><span><b>${esc(p.company)}</b> — ${esc(p.role)} <span class="muted small">${esc(p.location || '')}${p.posted ? ` · posted ${fmtDate(p.posted)}` : ''}</span></span></label>
<span class="row">${p.isNew ? '<span class="badge new">New</span>' : ''}${failedRun ? '<span class="badge fail">Last check failed</span>' : ''}${p.error ? '<span class="badge warn">Posting couldn’t be read</span>' : ''}</span></div>
${failedRun ? `<p class="small">${esc(failedRun.cause)}</p>` : ''}${p.error ? '<p class="small">The posting page didn’t load. Try again, or remove it if the job is gone.</p>' : ''}
<div class="row">${checking ? `${progress(`Checking ${p.company}`)}<span class="small">Checking fit… usually 2–5 min</span>` : `<button class="${failedRun ? 'btn' : 'btn2'} btn-sm" data-action="${failedRun ? 'retry' : 'check-url'}" data-arg="${failedRun ? failedRun.id : p.url}">${failedRun ? 'Try again' : 'Check fit'}<span class="visually-hidden"> for ${esc(p.company)} — ${esc(p.role)}</span></button>`}<a class="btn2 btn-sm" href="${esc(p.url)}" target="_blank" rel="noopener">Open the posting ↗<span class="visually-hidden"> ${esc(p.company)} — ${esc(p.role)}</span></a><button class="btn2 btn-sm" data-action="remove-review" data-arg="${p.key}">Remove<span class="visually-hidden"> ${esc(p.company)} — ${esc(p.role)}</span></button></div></li>`;
      })
      .join('');
    const options = `<details ${S.ui.scanOpts ? 'open' : ''} data-toggle="scanOpts"><summary>Options</summary><div class="grid-2">
<div><label for="scan-company">Only this company</label><select id="scan-company" data-draft-select><option value="">All companies you follow</option>${S.companies.map((c) => `<option${S.drafts['scan-company'] === c.name ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
<div><label for="scan-days">Only openings from the last … days</label><input id="scan-days" type="number" min="1" data-draft placeholder="Any age" value="${esc(S.drafts['scan-days'] || '')}"></div>
<label class="check"><input type="checkbox" id="scan-preview" data-draft-check ${S.drafts['scan-preview'] ? 'checked' : ''}> Preview without saving <span class="muted small">— see what would be added</span></label>
<label class="check"><input type="checkbox" id="scan-verify" data-draft-check ${S.drafts['scan-verify'] ? 'checked' : ''}> Confirm each posting is still live <span class="muted small">— slower</span></label></div></details>`;
    return `${pageHead('To review', 'Job links waiting to be checked: found at the companies you follow, or saved by you.', `<div class="stack-sm" style="align-items:flex-end">${scanning ? `<span>${progress('Checking for new openings')}Checking ${S.companies.filter((c) => c.enabled).length} companies…</span>` : `<button class="btn" data-action="scan" id="scan-btn">Check for new openings</button>`}<span class="small muted">Last checked ${fmtDate(S.lastScan.date)}${S.lastScan.time ? `, ${S.lastScan.time}` : ''} · no AI, a few seconds</span></div>`)}${notice()}
${options}
${sum ? `<section class="card ${sum.unreachable.length ? 'attn' : 'ok'}" aria-labelledby="scan-sum-h" id="scan-summary" tabindex="-1"><h2 id="scan-sum-h" style="font-size:var(--text-lg)">${sum.preview ? 'Preview — nothing saved: ' : 'Last check: '}${plural(sum.found.length, 'new opening')}</h2><ul>${sum.found.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
<p>${sum.checked} companies checked.${sum.unreachable.length ? ` <b>${sum.unreachable.map(esc).join(', ')} couldn’t be reached</b> (board not found) — <a href="#/companies">Fix in Companies</a>.` : ''}${sum.paused.length ? ` ${sum.paused.map(esc).join(', ')} ${sum.paused.length === 1 ? 'is' : 'are'} paused, so not checked.` : ''}</p>
<details><summary>Technical details</summary><p class="mono">scan.mjs · 80 jobs found · 6 filtered by title · 70 already seen · ${sum.found.length} added to data/pipeline.md · log data/jsc/logs/scan-31c2.log</p></details></section>` : ''}
<section aria-labelledby="tr-h" class="stack-sm"><div class="row between"><h2 id="tr-h">${plural(S.toReview.length, 'link')} to review${newCount() ? ` · ${newCount()} new` : ''}</h2>
<div class="row">${sel.length ? `<button class="btn" data-action="check-selected">Check fit for selected (${sel.length})</button><button class="btn2" data-action="remove-selected">Remove selected (${sel.length})</button>` : '<span class="small muted">Select links to check or remove several at once.</span>'}${menu('tidy-review', 'Tidy up', 'Tidy up To review', [{ action: 'goto', arg: '#/workspace|reconcile', label: 'Remove links already in Applications' }], { right: true })}</div></div>
${S.toReview.length ? `<ul class="stack-sm" style="list-style:none;margin:0;padding:0">${items}</ul>` : `<div class="card"><p>Nothing waiting. <button class="btn2" data-action="scan">Check for new openings</button> or add a job in <a href="#/applications">Applications</a>.</p></div>`}
<details><summary>Already checked (${S.processed.length})</summary><ul class="small">${S.processed.map((p) => `<li><a href="#/applications/${p.id}">${esc(p.company)} — ${esc(p.role)}</a></li>`).join('')}</ul></details></section>`;
  }

  function pageCompanies() {
    const editing = S.ui.editCompany;
    const rows = S.companies
      .map((c, i) => {
        const bad = c.health && c.health.status !== 'reachable';
        const status = !c.enabled ? '<span class="badge neutral">Paused</span>' : bad ? `<span class="badge fail">Board not found since ${fmtDate(c.health.at)}</span>` : c.health ? `<span class="small muted">Last worked ${fmtDate(c.health.at)}</span>` : '<span class="small muted">Not checked yet</span>';
        return `<li class="card" style="padding:var(--space-3) var(--space-4)" id="co-${i}"><div class="row between"><div><b>${esc(c.name)}</b> <span class="small muted">· ${esc(providerName(c.provider))}</span><br>${status}</div>
<div class="row"><label class="check" style="margin:0"><input type="checkbox" role="switch" data-action="toggle-company" data-arg="${i}" ${c.enabled ? 'checked' : ''}> <span>Check ${esc(c.name)} for new openings</span></label>
${bad && c.enabled ? `<button class="btn btn-sm" data-action="fix-company" data-arg="${i}">Fix<span class="visually-hidden"> ${esc(c.name)}</span></button>` : ''}<button class="btn2 btn-sm" data-action="edit-company" data-arg="${i}">Edit<span class="visually-hidden"> ${esc(c.name)}</span></button><button class="btn2 btn-sm" data-action="remove-company" data-arg="${i}">Remove<span class="visually-hidden"> ${esc(c.name)}</span></button></div></div>
${S.ui.fix === i ? `<div class="notice warn" id="fix-${i}" tabindex="-1"><b>${esc(c.name)}’s job board moved or closed.</b> We looked for a new board under the same name and found none. You can pause ${esc(c.name)} for now, or edit its careers page link if you know the new one.<div class="row" style="margin-top:var(--space-2)"><button class="btn2 btn-sm" data-action="toggle-company" data-arg="${i}">Pause ${esc(c.name)}</button><button class="btn2 btn-sm" data-action="edit-company" data-arg="${i}">Edit the link</button></div></div>` : ''}
${editing === i ? companyForm('edit', c) : ''}</li>`;
      })
      .join('');
    return `${pageHead('Companies you follow', 'The app checks these companies’ job boards for new openings.', `<div class="row"><button class="btn" data-action="toggle-follow" aria-expanded="${S.ui.followOpen}" id="follow-btn">Follow a company</button><button class="btn2" data-action="scan">Check for new openings</button></div>`)}${notice()}
${S.ui.followOpen ? companyForm('new') : ''}
<section aria-labelledby="cl-h" class="stack-sm"><h2 id="cl-h">${plural(S.companies.length, 'company', 'companies')}</h2>${S.companies.length ? `<ul class="stack-sm" style="list-style:none;margin:0;padding:0">${rows}</ul>` : '<div class="card"><p>You don’t follow any company yet. <button class="btn" data-action="toggle-follow">Follow a company</button></p></div>'}</section>
<section aria-labelledby="keep-h" class="card"><h2 id="keep-h" style="font-size:var(--text-lg)">What jobs to keep</h2><p>Only openings whose title mentions <b>backend, platform, infrastructure, SRE, data</b> or <b>engineer</b>, and not <b>intern, junior</b> or <b>manager</b>. Remote or Austin, TX.</p><p class="small muted">Editing these here comes in a later version; they live in portals.yml. <a href="#/help/files">Files in your workspace folder</a></p></section>
<section aria-labelledby="skip-h" class="card"><h2 id="skip-h" style="font-size:var(--text-lg)">Companies to skip</h2><p class="muted">None. Companies listed here are never checked or suggested.</p></section>
<section aria-labelledby="chk-h" class="card"><h2 id="chk-h" style="font-size:var(--text-lg)">Check companies’ job boards</h2><p class="muted">Tests every link above and tells you which ones need fixing. A few seconds, no AI.</p><div><button class="btn2" data-action="check-boards">Check companies’ job boards</button></div>${S.ui.boardsResult ? `<p class="notice ${brokenBoards().length ? 'warn' : 'ok'}" role="status">${esc(S.ui.boardsResult)}</p>` : ''}</section>`;
  }

  function companyForm(mode, c = {}) {
    const p = mode === 'new' ? 'nf' : 'ef';
    const nErr = S.errors[`${p}-name`];
    const uErr = S.errors[`${p}-url`];
    return `<form class="card soft stack-sm" data-form="follow" data-arg="${mode}" novalidate aria-labelledby="${p}-h" id="${p}-form"><h2 id="${p}-h" style="font-size:var(--text-lg)" tabindex="-1">${mode === 'new' ? 'Follow a company' : `Edit ${esc(c.name)}`}</h2>
<div class="grid-2"><div><label for="${p}-name">Company name</label><input id="${p}-name" type="text" data-draft value="${esc(S.drafts[`${p}-name`] ?? c.name ?? '')}" placeholder="e.g. Example Corp" ${nErr ? `aria-invalid="true" aria-describedby="${p}-name-err"` : ''}>${nErr ? `<p class="error" id="${p}-name-err">${esc(nErr)}</p>` : ''}</div>
<div><label for="${p}-url">Careers page link</label><input id="${p}-url" type="url" data-draft value="${esc(S.drafts[`${p}-url`] ?? c.careersUrl ?? '')}" placeholder="https://…" ${uErr ? `aria-invalid="true" aria-describedby="${p}-url-err"` : ''}>${uErr ? `<p class="error" id="${p}-url-err">${esc(uErr)}</p>` : '<p class="hint">Greenhouse, Lever, Ashby and most other job boards are recognised from the link.</p>'}</div></div>
<details><summary>More options</summary><div class="grid-2"><div><label for="${p}-prov">Board type</label><select id="${p}-prov"><option>Recognised from the link</option><option>Greenhouse</option><option>Lever</option><option>Ashby</option></select></div><div><label for="${p}-api">API endpoint</label><input id="${p}-api" type="url" placeholder="Filled in automatically"></div><div><label for="${p}-how">How to check for openings</label><select id="${p}-how"><option>Job board (recommended)</option><option>Careers page</option><option>Web search (not supported in the app yet)</option></select></div><div><label for="${p}-notes">Notes</label><input id="${p}-notes" type="text"></div></div></details>
<div class="row"><button class="btn" type="submit">${mode === 'new' ? 'Follow' : 'Save'}</button><button class="btn2" type="button" data-action="${mode === 'new' ? 'toggle-follow' : 'cancel-edit'}">Cancel</button></div></form>`;
  }

  function pageSkills(view) {
    const v = ['learn', 'strengthen', 'asked'].includes(view) ? view : 'learn';
    if (!S.skills) return `${pageHead('Skills', 'What employers in your job search keep asking for, and what your CV is missing.')}<div class="card"><h2 style="font-size:var(--text-lg)">Nothing to rank yet</h2><p>Skills are counted from the job postings the app has found. Follow a company and check for new openings first.</p><div class="row"><a class="btn2" href="#/companies">Companies you follow</a><a class="btn2" href="#/to-review">Check for new openings</a></div></div>`;
    const src = v === 'learn' ? S.skills.learn : v === 'strengthen' ? S.skills.deepen : S.skills.demanded;
    const cov = S.skills.coverage;
    const strong = S.ui.skillsStrong;
    const keep = (p) => !strong || (typeof p.score === 'number' && p.score >= 4);
    // Every number in a row, its evidence and the ranking come from the same postings (WP-T6-01).
    const allPostings = new Map();
    [...S.skills.learn, ...S.skills.deepen, ...S.skills.demanded].forEach((s) => (s.postings || []).forEach((p) => allPostings.set(p.url, p)));
    const goodFit = [...allPostings.values()].filter((p) => typeof p.score === 'number' && p.score >= 4).length;
    const rows0 = src
      .filter((s) => S.ui.skillsIgnored || (S.skillStatus[s.id] || s.status) !== 'ignore')
      .map((s, i) => {
        const ps = (s.postings || []).filter(keep);
        const byCo = new Map();
        ps.forEach((p) => byCo.set(p.company, [...(byCo.get(p.company) || []), p]));
        const gaps = s.gapReports.map((id) => appById(id)).filter((a) => a && (!strong || a.score >= 4));
        return { ...s, i, ps, count: ps.length, req: ps.filter((p) => p.level === 'required').length, nice: ps.filter((p) => p.level !== 'required').length, byCo, gaps };
      });
    const hidden = rows0.filter((s) => !s.count).length;
    const list = rows0.filter((s) => s.count).sort((x, y) => y.count - x.count || y.req - x.req || x.i - y.i);
    const max = Math.max(...list.map((s) => s.count), 1);
    const statusLabel = { missing: 'Missing', partial: 'Partly', have: 'Has it', ignore: 'Ignored' };
    const what = strong ? 'good-fit postings' : 'postings';
    const rows = list
      .map((s, n) => {
        const st = S.skillStatus[s.id] || s.status || 'missing';
        const cos = [...s.byCo.entries()].sort((a, b) => b[1].length - a[1].length);
        return `<div class="skill-row"><div><b>${n + 1}. ${esc(s.name)}</b><br><span class="small muted">${esc(s.category || '')}</span></div>
<div><span class="bar" style="width:${Math.round((s.count / max) * 100)}%" aria-hidden="true"></span><br><span class="small">Asked for in <b>${s.count}</b> ${s.count === 1 ? what.replace(/s$/, '') : what} (${s.req} required, ${s.nice} nice to have)</span>
<details><summary>Show the evidence for ${esc(s.name)}</summary><p class="small"><b>The ${plural(s.count, what.replace(/s$/, ''), what)} asking for it, by company:</b></p><ul class="small">${cos.map(([co, ps]) => `<li>${esc(co)} (${ps.length}): ${ps.map((p) => `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.role)}${typeof p.score === 'number' ? ` · fit ${fit(p.score)}` : ''} ↗</a>`).join(', ')}</li>`).join('')}</ul>
${s.gaps.length ? `<p class="small"><b>Flagged as a gap in your fit reports${strong ? ' (fit 4 and up)' : ''}:</b> ${s.gaps.slice(0, 6).map((a) => `<a href="#/applications/${a.id}">${esc(jobName(a))} (#${a.id}, fit ${fit(a.score)})</a>`).join(', ')}</p>` : ''}${s.cooccur.length ? `<p class="small"><b>Often asked for together with:</b> ${s.cooccur.map(esc).join(', ')}</p>` : ''}</details></div>
<div><span class="label small" style="margin:0">Your CV</span>${menu(`sk-${s.id}`, statusLabel[st], `Your CV has ${s.name}: ${statusLabel[st]}`, [['missing', 'Missing'], ['partial', 'Partly'], ['have', 'Has it'], ['ignore', 'Ignore this skill']].filter(([k]) => k !== st).map(([k, l]) => ({ action: 'skill-status', arg: `${s.id}|${k}`, label: l })))}</div></div>`;
      })
      .join('');
    const improving = S.runs.find((r) => r.kind === 'skills' && r.status === 'working');
    const read = cov.extractedLlm + cov.rulesOnly;
    const unread = cov.postings - read;
    return `${pageHead('Skills', 'What employers in your job search keep asking for, and what your CV is missing.')}${notice()}
<nav class="subnav" aria-label="Skills views"><ul><li><a href="#/skills/learn"${v === 'learn' ? ' aria-current="page"' : ''}>Learn next</a></li><li><a href="#/skills/strengthen"${v === 'strengthen' ? ' aria-current="page"' : ''}>Strengthen</a></li><li><a href="#/skills/asked"${v === 'asked' ? ' aria-current="page"' : ''}>Most asked for</a></li></ul></nav>
<p class="notice info">Based on <b>${cov.postings} postings</b> from ${S.companies.length} companies, last read ${fmtDate(cov.readOn || cov.lastFetchAt?.slice(0, 10))} · ${cov.extractedLlm} read by Claude, ${cov.rulesOnly} by quick rules${unread > 0 ? `, ${unread} couldn’t be loaded (the job was taken down)` : ''}. ${cov.pendingLlm ? (improving ? `Improving… ${progress('Improving the analysis')}` : `<button class="btn2 btn-sm" data-action="improve-skills">Improve the analysis</button> <span class="small">(reads ${cov.pendingLlm} postings with Claude · about ${cov.sessionsNeeded} sessions · uses your Claude plan)</span>`) : ''}</p>
<p class="small muted">${v === 'learn' ? 'Learn next: skills your CV doesn’t show' : v === 'strengthen' ? 'Strengthen: skills your CV shows only partly' : 'Most asked for: every skill, whether or not you have it'}, ranked by how many ${what} ask for them (more “required” first on a tie).</p>
<div class="row"><label class="check"><input type="checkbox" id="skills-strong" data-action="skills-strong" ${strong ? 'checked' : ''}> Only jobs I’d apply to (fit 4 and up)</label><label class="check"><input type="checkbox" id="skills-ignored" data-action="skills-ignored" ${S.ui.skillsIgnored ? 'checked' : ''}> Show skills I ignored</label></div>
<p class="small" role="status">${strong ? `Counting only the ${goodFit} postings whose fit is 4 or more: every number, the evidence and the order below use just those.${hidden ? ` ${plural(hidden, 'skill')} with no good-fit posting ${hidden === 1 ? 'is' : 'are'} hidden.` : ''}` : `Counting all ${cov.postings} postings.`}</p>
<section class="card" style="padding:0" aria-label="Skills list">${rows || '<p style="padding:var(--space-4)">No skills to show.</p>'}</section>`;
  }

  function pageMyCv(section) {
    const sec = ['content', 'profile', 'design', 'writing'].includes(section) ? section : 'content';
    const sub = `<nav class="subnav" aria-label="My CV sections"><ul>${[['content', 'Content'], ['profile', 'Profile'], ['design', 'Design'], ['writing', 'Writing rules']].map(([k, l]) => `<li><a href="#/my-cv/${k}"${sec === k ? ' aria-current="page"' : ''}>${l}</a></li>`).join('')}</ul></nav>`;
    let body;
    if (sec === 'content') {
      body = S.cv
        ? `<form class="card stack-sm" data-form="cv-edit" novalidate><div><label for="cv-edit">Your CV (Markdown)</label><textarea id="cv-edit" rows="16" data-draft>${esc(S.drafts['cv-edit'] ?? S.cv)}</textarea><p class="hint">Last saved ${fmtDate(S.cvSaved)} · the source of every fit check, tailored CV and letter.</p></div><div class="row"><button class="btn" type="submit">Save</button><label for="cv-import" class="btn2" style="margin:0">Import from a file</label><input id="cv-import" type="file" class="visually-hidden" accept=".md,.txt" data-change="cv-file"></div></form>`
        : `<div class="card"><p>No CV yet. <a href="#/today">Add it in Get set up</a>, or paste it here.</p></div>`;
    } else if (sec === 'profile') {
      const f = (id, label, val, hint = '') => `<div><label for="pf-${id}">${label}</label><input id="pf-${id}" type="text" data-draft value="${esc(S.drafts[`pf-${id}`] ?? val)}">${hint ? `<p class="hint">${hint}</p>` : ''}</div>`;
      body = `<form class="stack" data-form="profile" novalidate><fieldset class="grid-2"><legend>About you</legend>${f('name', 'Name', S.profile.name)}${f('location', 'Location', S.profile.location)}</fieldset>
<fieldset class="grid-2"><legend>What you’re looking for</legend>${f('targets', 'Target roles', S.profile.targets)}${f('remote', 'Where', S.profile.remote)}${f('comp', 'Compensation', S.profile.comp)}</fieldset>
<fieldset class="grid-2"><legend>How the app works for you</legend>${f('threshold', 'Make a tailored CV automatically when the fit is at least', S.profile.threshold, 'Used when you tick “Also make a tailored CV” while adding a job.')}${f('language', 'Language of reports and documents', S.profile.language)}${f('tier', 'Claude usage tier', S.profile.tier)}</fieldset>
<div class="row"><button class="btn" type="submit">Save profile</button></div>
<details><summary>Advanced files</summary><ul class="small"><li><span class="mono">modes/_profile.md</span> — the kinds of roles you target and how checks weigh them. Edit it in your editor.</li><li><span class="mono">article-digest.md</span> — proof points the assistant may quote. Edit it in your editor.</li></ul></details></form>`;
    } else if (sec === 'design') body = designSection();
    else body = writingSection();
    return `${pageHead('My CV', 'Your CV, your profile, how your CV looks and how the assistant writes.')}${sub}${notice()}${body}`;
  }

  function designSection() {
    const sel = designOf(S.design.selected);
    const saved = designOf(S.design.saved);
    const unsaved = S.design.selected !== S.design.saved;
    const withPdf = S.apps.filter((a) => a.pdf);
    const prevId = S.drafts['preview-with'] || String(withPdf.find((a) => a.id === 12)?.id || withPdf[0]?.id || '');
    const prevApp = appById(prevId);
    const onlyPass = S.ui.onlyPass;
    const updating = S.ui.previewUpdating;
    const layRun = S.runs.find((r) => (r.kind === 'layout' || r.kind === 'layout-all') && r.status === 'working');
    const cards = DESIGNS.filter((d) => !onlyPass || d.verdict !== 'fail')
      .filter((d) => SCEN === 'broken' || !d.yours)
      .map((d) => `<button class="design" data-action="pick-design" data-arg="${d.id}" aria-pressed="${S.design.selected === d.id}"><span class="thumb" aria-hidden="true"><i class="h"></i><i></i><i style="width:80%"></i><i></i><i style="width:60%"></i></span><b>${esc(d.name)}${d.yours ? ' · Yours' : ''}${S.design.saved === d.id ? ' · your design' : ''}</b><span class="small">${esc(d.note)}</span><span class="badge ${d.verdict === 'pass' ? 'ok' : d.verdict === 'warn' ? 'warn' : 'fail'}">${VERDICT_TEXT[d.verdict]}</span></button>`)
      .join('');
    return `<div class="grid-2">
<section class="stack" aria-labelledby="gal-h"><div class="row between"><h2 id="gal-h" style="font-size:var(--text-lg)">Designs</h2><label class="check"><input type="checkbox" data-action="only-pass" ${onlyPass ? 'checked' : ''}> Only designs that pass the screening check</label></div>
<p>Your design: <b>${esc(saved.name)}</b> — <span class="badge ${saved.verdict === 'pass' ? 'ok' : saved.verdict === 'warn' ? 'warn' : 'fail'}">${VERDICT_TEXT[saved.verdict]}</span></p>
<div class="designs">${cards}</div>
${unsaved ? `<div class="notice info" id="unsaved"><b>Unsaved:</b> ${esc(sel.name)} is shown in the preview, but your design is still ${esc(saved.name)}.</div>` : ''}
<div class="row"><button class="btn" data-action="save-design" id="save-design" ${unsaved ? '' : 'aria-disabled="true"'}>Make ${esc(sel.name)} my design for every CV</button>${unsaved ? '<button class="btn2" data-action="discard-design">Discard changes</button>' : ''}</div>
${unsaved ? '' : '<p class="small muted">Pick a design above to preview it. It becomes your design only when you save it.</p>'}
<details><summary>Fine-tune</summary><div class="grid-2"><div><label for="ft-accent">Accent colour</label><input id="ft-accent" type="text" value="#1f3a5f"></div><div><label for="ft-body">Body font</label><input id="ft-body" type="text" value="Georgia"></div><div><label for="ft-head">Heading font</label><input id="ft-head" type="text" value="Georgia"></div><div><label for="ft-size">Text size</label><input id="ft-size" type="text" value="10.5pt"></div><div><label for="ft-margin">Page margin</label><input id="ft-margin" type="text" value="18mm"></div><div><label for="ft-spacing">Spacing</label><select id="ft-spacing"><option>Normal</option><option>Compact</option><option>Roomy</option></select></div></div><p class="small muted">Section order: Summary, Experience, Skills, Education. <button class="btn-link" type="button">Move Experience up</button></p></details>
<section class="card" aria-labelledby="all-h"><h3 id="all-h">Your existing CVs</h3><p>${plural(withPdf.length, 'tailored CV')} use${withPdf.length === 1 ? 's' : ''} older designs. Updating re-draws their PDFs in ${esc(saved.name)}; the wording does not change and no AI is used.</p>${layRun ? `${progress('Updating CV layouts')}<p class="small">Updating…</p>` : `<div class="row"><button class="btn2" data-action="layout-all-confirm">Update existing CVs to ${esc(saved.name)} (${withPdf.length})</button></div>`}</section></section>
<section class="stack" aria-labelledby="pv-h"><h2 id="pv-h" style="font-size:var(--text-lg)">Preview</h2>
<div><label for="preview-with">Preview with</label><select id="preview-with" data-change="preview-with">${withPdf.map((a) => `<option value="${a.id}"${String(a.id) === String(prevId) ? ' selected' : ''}>${esc(jobName(a))}, ${fmtDate(a.pdf.date)}</option>`).join('')}</select></div>
<p class="small" role="status">${updating ? 'Updating the preview…' : `Showing ${esc(sel.name)} with the CV for ${prevApp ? esc(jobName(prevApp)) : '—'} · rendered in 240 ms, no AI`}</p>
<div class="preview" style="${updating ? 'opacity:.5' : ''}${sel.id === 'executive' ? ';font-family:Georgia,serif' : ''}"><h3 style="${sel.id === 'modern' ? 'border-bottom:3px solid #6d28d9' : ''}">Alex Rivera</h3><p>Austin, TX (remote) · alex.rivera@example.com</p><p class="sec">Experience</p><p><b>Senior Backend Engineer — Northwind Payments</b></p><p>Rebuilt the settlement pipeline as an event-driven Go service…</p><p class="sec">Skills</p><p>Go, TypeScript, PostgreSQL, Kafka</p></div>
${verdictLine(sel.verdict, 'design-verdict')}
${prevApp && !unsaved && prevApp.pdf && prevApp.pdf.design !== saved.name ? `<div class="card soft"><p>The CV for <b>${esc(jobName(prevApp))}</b> is still in ${esc(prevApp.pdf.design)}.</p><div class="row"><button class="btn" data-action="layout" data-arg="${prevApp.id}" id="layout-one">Update this CV’s layout to ${esc(saved.name)}</button></div><p class="small muted">Re-draws the PDF in ${esc(saved.name)} and runs the screening check again. No AI, wording unchanged.</p></div>` : ''}
${prevApp && prevApp.pdf && prevApp.pdf.relaid && prevApp.pdf.design === saved.name ? `<p class="notice ok" id="layout-done" tabindex="-1">The CV for ${esc(jobName(prevApp))} was laid out again in ${esc(saved.name)} today · ${VERDICT_TEXT[prevApp.pdf.verdict].toLowerCase()}. <a href="#/document/cv/${prevApp.id}">Open</a></p>` : ''}
</section></div>`;
  }

  function voiceWords() {
    return neverWrite(S.voiceText);
  }
  function setWords(words) {
    const block = words.map((w) => `- ${w}`).join('\n');
    if (/## Never write\s*\n/.test(S.voiceText || '')) S.voiceText = S.voiceText.replace(/## Never write\s*\n[\s\S]*?(?=\n## |$)/, `## Never write\n${block}\n`);
    else S.voiceText = `${S.voiceText || '# Writing rules\n'}\n## Never write\n${block}\n`;
  }

  function writingSection() {
    const words = voiceWords();
    const err = S.errors['add-word'];
    const withPdf = S.apps.filter((a) => a.pdf).sort((x, y) => (y.score ?? 0) - (x.score ?? 0));
    return `<section class="card" aria-labelledby="avoid-h"><h2 id="avoid-h" style="font-size:var(--text-lg)">Words to avoid</h2><p class="muted">The assistant never uses these in your tailored CVs and letters.</p>
<ul class="chips" style="list-style:none;margin:0;padding:0" aria-label="Words to avoid">${words.map((w) => `<li class="wordchip">${esc(w)}<button data-action="remove-word" data-arg="${esc(w)}" aria-label="Remove “${esc(w)}”">×</button></li>`).join('')}</ul>
<form class="row" data-form="add-word" novalidate style="align-items:flex-end"><div style="width:18rem"><label for="add-word">Add a word or phrase</label><input id="add-word" type="text" data-draft value="${esc(S.drafts['add-word'] || '')}" placeholder="e.g. game-changing" ${err ? 'aria-invalid="true" aria-describedby="add-word-err"' : ''}>${err ? `<p class="error" id="add-word-err">${esc(err)}</p>` : ''}</div><button class="btn" type="submit">Add</button></form>
<p class="small muted">Added words are appended to your rules; nothing else in them changes.</p></section>
<section class="card" aria-labelledby="apply-h"><h2 id="apply-h" style="font-size:var(--text-lg)">When do new rules apply?</h2><p>To the <b>next</b> tailored CV or cover letter. Documents you already made keep their wording. To get a fresh CV under the new rules, make it again:</p>
<p><b>Your ${plural(withPdf.length, 'tailored CV')}</b>, best fit first:</p><ul style="list-style:none;margin:0;padding:0">${withPdf.map((a) => { const busy = S.runs.find((r) => r.kind === 'cv' && r.appId === a.id && r.status === 'working'); const fresh = a.pdf.rulesNote && a.pdf.date === TODAY; return `<li class="row between" style="padding:var(--space-2) 0;border-top:1px solid var(--border)"><span><a href="#/applications/${a.id}/documents">${esc(jobName(a))}</a><br><span class="small ${fresh ? '' : 'muted'}">${fresh ? `✓ Made today under your current rules (${esc(a.pdf.rulesNote.replace(/^your writing rules of today \((.*)\)$/, '$1'))})` : `CV made ${fmtDate(a.pdf.date)} · ${esc(a.pdf.rulesNote || `your writing rules of ${fmtDate(a.pdf.rules || a.pdf.date)}`)}`}</span></span><span class="row">${busy ? `<span class="badge new">Writing…</span>` : `${fresh ? `<a class="btn btn-sm" href="#/document/cv/${a.id}">Open<span class="visually-hidden"> the CV for ${esc(jobName(a))}</span></a>` : ''}<button class="btn2 btn-sm" data-action="make-cv" data-arg="${a.id}">Make it again<span class="visually-hidden"> for ${esc(jobName(a))}</span></button>`}</span></li>`; }).join('')}</ul><p class="small muted">Each uses the AI assistant, about 3 min, and your Claude plan. Jobs without a tailored CV: make one from the job’s page in <a href="#/applications">Applications</a>.</p></section>
<details class="card" data-toggle="rulesOpen"${S.ui.rulesOpen ? ' open' : ''}><summary>All rules (advanced)</summary><form class="stack-sm" data-form="voice-edit" novalidate><label for="voice-edit">Your writing rules (Markdown)</label><textarea id="voice-edit" rows="12" data-draft>${esc(S.drafts['voice-edit'] ?? S.voiceText ?? '')}</textarea><div class="row"><button class="btn" type="submit">Save rules</button></div>${S.ui.rulesSaved ? `<p class="notice ok" role="status" id="rules-saved" tabindex="-1">Writing rules saved at ${S.ui.rulesSaved}. They apply to the next tailored CV or letter.</p>` : ''}</form></details>
<section class="card" aria-labelledby="samp-h"><h2 id="samp-h" style="font-size:var(--text-lg)">Writing samples</h2><p class="muted">Your own writing, used to match your tone.</p><ul><li>linkedin-about.md <a href="#/help/files">Open</a></li><li>blog-settlements.md <a href="#/help/files">Open</a></li></ul><p class="small muted">Add samples to the writing-samples folder in your workspace.</p></section>
<section class="card" aria-labelledby="ex-h"><h2 id="ex-h" style="font-size:var(--text-lg)">Start from the example rules</h2><p class="muted">Replaces your rules with the example set that comes with the app. Your current rules are kept as a backup and you can undo.</p><div><button class="btn2" data-action="seed-confirm">Start from the example rules…</button></div></section>`;
  }

  function pageActivity(id) {
    if (id) {
      const r = S.runs.find((x) => String(x.id) === String(id));
      if (!r) return `${pageHead('Activity not found')}<p><a href="#/activity">← Activity</a></p>`;
      r.seen = true;
      return `<p><a href="#/activity">← Activity</a></p>${pageHead(esc(r.label), `${r.status === 'failed' ? 'Failed' : r.status === 'working' ? 'Working' : 'Done'} · started ${clock(r.startedAt)}`)}${activityItem(r, true)}`;
    }
    const groups = [
      ['Now', S.runs.filter((r) => r.status === 'working' || (r.status === 'failed' && !r.retried && !S.dismissed.includes(r.id)))],
      ['Earlier', S.runs.filter((r) => r.status === 'done' || r.retried || S.dismissed.includes(r.id))],
    ];
    return `${pageHead('Activity', 'Everything the app has done for you since it started. Older logs are in your workspace folder.')}${notice()}${groups.map(([t, list]) => `<section class="stack-sm" aria-labelledby="ag-${t}"><h2 id="ag-${t}" class="group-title">${t}</h2>${list.length ? list.slice().reverse().map((r) => activityItem(r)).join('') : '<p class="muted">Nothing here.</p>'}</section>`).join('')}`;
  }

  function activityItem(r, full = false) {
    const cls = r.status === 'failed' && !r.retried ? 'failed' : r.status === 'working' ? 'working' : 'done';
    const badge = r.status === 'failed' ? (r.retried ? '<span class="badge neutral">Failed, tried again</span>' : '<span class="badge fail">Failed</span>') : r.status === 'working' ? '<span class="badge new">Working</span>' : '<span class="badge ok">Done</span>';
    let open = '';
    if (r.status === 'done') {
      if (r.appId && (r.kind === 'cv' || r.kind === 'layout')) open = `<a class="btn btn-sm" href="#/document/cv/${r.appId}">Open the CV</a>`;
      else if (r.appId && r.kind === 'cover') open = `<a class="btn btn-sm" href="#/document/cover/${r.appId}">Open the letter</a>`;
      else if (r.appId) open = `<a class="btn btn-sm" href="#/applications/${r.appId}">Open the application</a>`;
      else if (r.kind === 'scan') open = '<a class="btn btn-sm" href="#/to-review">See the new openings</a>';
      else if (r.kind === 'skills') open = '<a class="btn btn-sm" href="#/skills/learn">Open Skills</a>';
    }
    return `<article class="act ${cls}" aria-label="${esc(r.label)}"><div class="row between"><span class="row">${badge}<span class="small muted">${clock(r.startedAt)}${r.finishedAt ? ` · ${Math.max(1, Math.round((r.finishedAt - r.startedAt) / 60000))} min` : ' · usually 2–5 min'}</span></span></div>
<h3 style="font-size:var(--text-md)">${full ? '' : `<a href="#/activity/${r.id}">`}${esc(r.label)}${full ? '' : '</a>'}</h3>
${r.status === 'working' ? `${progress(r.label)}<div class="row"><button class="btn2 btn-sm" data-action="cancel-run" data-arg="${r.id}">Cancel<span class="visually-hidden"> ${esc(r.label)}</span></button></div>` : ''}
${r.status === 'failed' && !r.retried ? `<p><b>What happened:</b> ${esc(r.cause)}</p><p><b>What to do:</b> ${esc(r.todo)}</p><div class="row"><button class="btn btn-sm" data-action="retry" data-arg="${r.id}">Try again</button>${r.url ? `<a class="btn2 btn-sm" href="${esc(r.url)}" target="_blank" rel="noopener">Open the posting ↗</a>` : ''}</div>` : ''}
${r.status === 'done' && r.outcomeText ? `<p>${esc(r.outcomeText)}</p>` : ''}${r.nested?.length ? `<p class="nested">${r.nested.map(esc).join(' · ')}</p>` : ''}${open ? `<div class="row">${open}</div>` : ''}
${r.status === 'cancelled' ? '<p class="small">Cancelled.</p>' : ''}
<details><summary>Technical details</summary><p class="mono">${esc(r.tech || `${r.kind} · lane ${r.kind === 'scan' ? 'exclusive' : 'agent'} · log data/jsc/logs/${r.kind}-${r.id}.log`)}</p></details></article>`;
  }

  function panel() {
    if (!S.ui.panel) return '';
    const now = S.runs.filter((r) => r.status === 'working' || (r.status === 'failed' && !r.retried && !S.dismissed.includes(r.id)));
    const earlier = S.runs.filter((r) => !now.includes(r)).slice(-5);
    S.runs.forEach((r) => {
      if (r.status === 'done') r.seen = true;
    });
    return `<section class="panel" id="activity-panel" role="dialog" aria-modal="false" aria-labelledby="panel-h"><div class="panel-head"><h2 id="panel-h" tabindex="-1" style="font-size:var(--text-lg)">Activity</h2><button class="btn2 btn-sm" data-action="toggle-panel">Close<span class="visually-hidden"> Activity</span></button></div>
<div class="panel-body"><h3 class="group-title">Now</h3>${now.length ? now.slice().reverse().map((r) => activityItem(r)).join('') : '<p class="muted small">Nothing running.</p>'}
<h3 class="group-title">Earlier</h3>${earlier.length ? earlier.slice().reverse().map((r) => activityItem(r)).join('') : '<p class="muted small">Nothing yet.</p>'}
<a href="#/activity">See all activity</a></div></section>`;
  }

  function pageWorkspace() {
    const t = S.ui.tidy;
    const toolCard = (id, title, desc, preview, result) => `<section class="card" aria-labelledby="tool-${id}-h" id="tool-${id}"><h3 id="tool-${id}-h">${title}</h3><p class="muted">${desc}</p>
${t[id] === 'preview' ? `<div class="notice info">${preview}</div><div class="row"><button class="btn" data-action="tidy-confirm" data-arg="${id}">${id === 'dedup' ? 'Merge these 2 pairs' : id === 'reconcile' ? 'Remove 3 links' : 'OK'}</button><button class="btn2" data-action="tidy-discard" data-arg="${id}">Don’t change anything</button></div>` : t[id] === 'done' ? `<p class="notice ok" role="status">${result}</p>` : `<div><button class="btn2" data-action="tidy-preview" data-arg="${id}">${title}</button></div>`}</section>`;
    return `${pageHead('Workspace', 'The folder the app reads, its health, and tools to tidy it up.')}${notice()}
<section class="card" aria-labelledby="fold-h"><h2 id="fold-h" style="font-size:var(--text-lg)">Folder</h2><p class="mono">~/job-search (fictional)</p><p>${plural(S.apps.length, 'application')} · ${plural(S.apps.length, 'fit report')} · ${plural(S.apps.filter((a) => a.pdf).length, 'tailored CV')} · ${plural(S.apps.filter((a) => a.cover).length, 'cover letter')}</p></section>
<section class="card ${S.dataIssue ? 'attn' : ''}" aria-labelledby="health-h" id="health"><h2 id="health-h" style="font-size:var(--text-lg)">Data health</h2>${S.dataIssue ? `<p><b>1 application could not be read:</b> ${esc(S.dataIssue.company)} — ${esc(S.dataIssue.role)}, line ${S.dataIssue.line} of data/applications.md: ${esc(S.dataIssue.problem)}.</p><p><b>To fix it:</b> open data/applications.md in your editor, go to line ${S.dataIssue.line} and put a number like 4.2 in the score column. The app picks the change up by itself.</p>` : '<p>No problems found.</p>'}<p class="small muted">Fit reports not in Applications: none.</p></section>
<section class="stack" aria-labelledby="tidy-h"><h2 id="tidy-h" style="font-size:var(--text-lg)">Tidy up</h2><div class="grid-2">
${toolCard('dedup', 'Find duplicate applications', 'Looks for the same job listed twice. Shows the pairs first; nothing changes until you confirm.', '<b>2 possible duplicates:</b><br>#11 Brightwater Health — Backend Engineer (Go), Aug 24, posting …/4101878 and #21 Brightwater Health — Data Engineer, Sep 6 (different roles — keep both?)<br>#22 Cobalt Freight — Senior Backend Engineer, Sep 7, and the To review link …/4105437 (same posting)', 'Merged 2 pairs. A backup was kept as applications.md.bak.')}
${toolCard('reconcile', 'Remove links already in Applications', 'Clears links from To review that you have already checked.', '3 links in To review are already in Applications: Cobalt Freight — Senior Backend Engineer, Brightwater Health — Data Engineer, Cobalt Freight — Staff Software Engineer.', 'Removed 3 links from To review.')}
${toolCard('verify', 'Check my list for problems', 'Checks that every application has a valid status, score and fit report.', 'Checked 40 applications.', S.dataIssue ? `1 problem: ${esc(S.dataIssue.company)}, line ${S.dataIssue.line}. Everything else is fine.` : 'No problems found in 40 applications.')}
${toolCard('boards', 'Find the right job board for a company', 'For a company whose board isn’t found, looks for its current board.', 'Searching…', 'Juniper Mobility: no current board found. Pause it or edit its link in Companies.')}
</div></section>
<section class="card" aria-labelledby="ai-h"><h2 id="ai-h" style="font-size:var(--text-lg)">AI assistant</h2><p>Claude Code found and signed in. Up to 2 checks run at once; more wait their turn. (Changing these comes in a later version.)</p></section>
<section class="card" aria-labelledby="help-h"><h2 id="help-h" style="font-size:var(--text-lg)">Help</h2><p><a href="#/help">All help topics</a></p></section>`;
  }

  const HELP = {
    fit: ['How the fit is worked out', 'The assistant reads the posting and compares it with your CV and profile in six parts: role summary, CV match, level, pay, how to tailor, and interview plan. It scores the match from 1 to 5. 4 and up is a strong fit; under 3 usually means skip. The recommendation (Apply, Consider, Skip) follows from the score and any hard stops.'],
    costs: ['What a check costs, and why it takes minutes', 'Fit checks, tailored CVs and cover letters are written by Claude Code on your machine, using your own Claude plan. Each takes 2–5 minutes because the assistant reads the posting, your CV and your rules. Checking for new openings, laying out a PDF and the screening check use no AI and take seconds.'],
    failures: ['Why something can fail, and what to do', 'Most failures are temporary: a slow posting page, a session that ended early, or a job board that was briefly down. Use Try again where the failure is shown. If the same job fails twice, open the posting to check it still exists.'],
    screening: ['The screening (ATS) check', 'Companies run CVs through applicant-tracking systems that read the text inside the PDF. The app reads your PDF the same way and checks that your name, headings, dates and keywords come out in order. Two-column and image-heavy designs often fail.'],
    rules: ['Writing rules', 'Words to avoid and your tone notes are given to the assistant every time it writes a tailored CV or letter. They apply to the next document, not to ones already made.'],
    never: ['What the app never does', 'It never applies, sends email or fills in forms for you. It writes and checks; you decide and send.'],
    files: ['Files in your workspace folder', 'cv.md (your CV), config/profile.yml (Profile), portals.yml (Companies), voice-dna.md (Writing rules), data/applications.md (Applications), data/pipeline.md (To review), reports/ (fit reports), output/ (PDFs). The command-line tools read the same files.'],
  };
  function pageHelp(topic) {
    if (topic && HELP[topic]) return `<p><a href="#/help">← Help</a></p>${pageHead(HELP[topic][0])}<div class="card"><p>${HELP[topic][1]}</p></div>`;
    return `${pageHead('Help')}<ul class="stack-sm">${Object.entries(HELP).map(([k, [t]]) => `<li><a href="#/help/${k}">${t}</a></li>`).join('')}</ul>`;
  }

  function pageSearch(q) {
    const t = (q || '').trim().toLowerCase();
    const jobs = t ? S.apps.filter((a) => jobName(a).toLowerCase().includes(t)).slice(0, 10) : [];
    const cos = t ? S.companies.filter((c) => c.name.toLowerCase().includes(t)) : [];
    const docs = t ? S.apps.filter((a) => (a.pdf || a.cover) && jobName(a).toLowerCase().includes(t)) : [];
    const pages = [['Check for new openings', '#/to-review'], ['Writing rules', '#/my-cv/writing'], ['Design', '#/my-cv/design'], ['Profile', '#/my-cv/profile'], ['Skills to learn', '#/skills/learn'], ['Activity', '#/activity'], ['Workspace', '#/workspace']].filter(([l]) => t && l.toLowerCase().includes(t));
    const sec = (title, items) => (items.length ? `<section class="stack-sm"><h2 class="group-title">${title}</h2><ul>${items.join('')}</ul></section>` : '');
    return `${pageHead(`Results for “${esc(q)}”`)}${sec('Jobs', jobs.map((a) => `<li><a href="#/applications/${a.id}">${esc(jobName(a))}</a> · ${STATUS_LABEL[a.status]}</li>`))}${sec('Companies', cos.map((c) => `<li><a href="#/companies">${esc(c.name)}</a></li>`))}${sec('Documents', docs.map((a) => `<li><a href="#/applications/${a.id}/documents">${esc(jobName(a))}</a>: ${a.pdf ? 'tailored CV' : ''}${a.pdf && a.cover ? ', ' : ''}${a.cover ? 'cover letter' : ''}</li>`))}${sec('Pages and actions', pages.map(([l, h]) => `<li><a href="${h}">${l}</a></li>`))}${!jobs.length && !cos.length && !docs.length && !pages.length ? '<p>Nothing found. Try a company name.</p>' : ''}`;
  }

  // ── render ──────────────────────────────────────────────────────────
  const TITLES = { today: 'Today', applications: 'Applications', 'to-review': 'To review', companies: 'Companies', skills: 'Skills', 'my-cv': 'My CV', activity: 'Activity', workspace: 'Workspace', help: 'Help', search: 'Search', document: 'Document' };
  let lastRoute = null;

  function render() {
    const { parts, page, params } = route();
    let html;
    if (page === 'today') html = pageToday();
    else if (page === 'applications' && parts[1]) html = pageJob(parts[1], parts[2]);
    else if (page === 'applications') html = pageApplications(params);
    else if (page === 'to-review') html = pageToReview();
    else if (page === 'companies') html = pageCompanies();
    else if (page === 'skills') html = pageSkills(parts[1]);
    else if (page === 'my-cv') html = pageMyCv(parts[1]);
    else if (page === 'activity') html = pageActivity(parts[1]);
    else if (page === 'workspace') html = pageWorkspace();
    else if (page === 'help') html = pageHelp(parts[1]);
    else if (page === 'search') html = pageSearch(params.get('q'));
    else if (page === 'document') html = pageDocument(parts[1], parts[2]);
    else html = `${pageHead('Page not found')}<p><a href="#/today">Go to Today</a></p>`;

    const active = document.activeElement;
    const keepId = active && active !== document.body ? active.id || null : null;
    const keepAction = active?.dataset?.action ? `[data-action="${active.dataset.action}"]${active.dataset.arg !== undefined ? `[data-arg="${CSS.escape(active.dataset.arg)}"]` : ''}` : null;

    const navPage = page === 'document' ? 'applications' : page === 'search' ? '' : page;
    document.getElementById('top').innerHTML = topbar(navPage);
    document.getElementById('main').innerHTML = html;
    document.getElementById('panel').innerHTML = panel();
    const a = parts[1] && page === 'applications' ? appById(parts[1]) : null;
    document.title = `${a ? jobName(a) : TITLES[page] || 'Job Search Console'} — Job Search Console`;

    const routeKey = location.hash;
    let target = null;
    if (pendingFocus) {
      target = document.querySelector(pendingFocus);
      if (target && !target.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|TEXTAREA|SELECT|SUMMARY)$/.test(target.tagName)) target.setAttribute('tabindex', '-1');
    } else if (routeKey !== lastRoute) {
      if (page === 'applications' && parts[2] === 'documents') target = document.getElementById('docs-h');
      if (page === 'applications' && parts[2] === 'cover') target = document.querySelector(`[id^="cl-why-"]`);
      target ||= document.getElementById('page-title');
      if (target && !target.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) target.setAttribute('tabindex', '-1');
      if (lastRoute !== null) window.scrollTo(0, 0);
      if (target && (parts[2] === 'documents' || parts[2] === 'cover')) target.scrollIntoView({ block: 'start' });
    } else if (keepId) target = document.getElementById(keepId);
    else if (keepAction) target = document.querySelector(keepAction);
    if (target && lastRoute !== null) target.focus({ preventScroll: routeKey === lastRoute && !pendingFocus });
    else if (target && pendingFocus) target.focus();
    pendingFocus = null;
    lastRoute = routeKey;
  }

  // ── actions ─────────────────────────────────────────────────────────
  const isUrl = (u) => /^https?:\/\/[^\s/]+\.[^\s/]+/i.test(u || '');
  function setNotice(html, tone = 'ok', undo = null) {
    S.ui.notice = { html, tone, undo: Boolean(undo) };
    S.undo = undo;
  }
  function confirmDialog({ title, body, ok, okClass = 'btn', onOk }) {
    const dlg = document.getElementById('confirm');
    const opener = document.activeElement;
    dlg.innerHTML = `<form method="dialog" class="stack"><h2 id="dlg-h" style="font-size:var(--text-lg)">${title}</h2><p>${body}</p><div class="row"><button class="${okClass}" value="ok">${ok}</button><button class="btn2" value="cancel" autofocus>Cancel</button></div></form>`;
    dlg.setAttribute('aria-labelledby', 'dlg-h');
    dlg.onclose = () => {
      if (dlg.returnValue === 'ok') onOk();
      else if (opener && document.contains(opener)) opener.focus();
    };
    dlg.returnValue = '';
    dlg.showModal();
  }

  const ACTIONS = {
    'toggle-nav': () => {
      S.ui.navOpen = !S.ui.navOpen;
    },
    'toggle-panel': () => {
      S.ui.panel = !S.ui.panel;
      focusLater(S.ui.panel ? '#panel-h' : '#activity-btn');
    },
    menu: (key) => {
      S.ui.menu = S.ui.menu === key ? null : key;
      focusLater(S.ui.menu ? `#mb-${key} + .menu [role="menuitem"]` : `#mb-${key}`);
    },
    goto: (arg) => {
      const [hash, extra] = arg.split('|');
      S.ui.menu = null;
      if (extra && hash === '#/workspace') S.ui.tidy[extra] = S.ui.tidy[extra] || null;
      go(hash);
      if (extra && hash === '#/workspace') focusLater(`#tool-${extra}-h`);
    },
    'open-url': (url) => {
      S.ui.menu = null;
      window.open(url, '_blank', 'noopener');
    },
    'set-status': (arg) => {
      const [id, st, on] = arg.split('|');
      const a = appById(id);
      const before = { status: a.status, date: a.date };
      a.status = st;
      const when = st === 'Applied' ? ` (${on === YESTERDAY ? 'yesterday' : 'today'}, ${fmtDate(on)})` : '';
      (S.history[a.id] ||= []).push(`${fmtDate(TODAY)} · status → ${STATUS_LABEL[st]}${when}`);
      S.ui.rowMsg = { [a.id]: `Saved: ${STATUS_LABEL[st]}${when}` };
      const f = S.ui.appFilter;
      if (f.status !== 'all' && f.status !== st && !S.ui.keep.includes(a.id)) S.ui.keep.push(a.id);
      S.ui.menu = null;
      S.undo = { type: 'status', id: a.id, before };
      announce(`Saved: ${jobName(a)} is now ${STATUS_LABEL[st]}${when}. Undo is available.`);
      focusLater(`#mb-st-${a.id}`);
    },
    sent: (id) => ACTIONS['set-status'](`${id}|Applied|${TODAY}`),
    undo: () => {
      const u = S.undo;
      if (!u) return;
      if (u.type === 'status') {
        Object.assign(appById(u.id), u.before);
        S.ui.rowMsg = { [u.id]: `Back to ${STATUS_LABEL[u.before.status]}` };
        S.ui.keep = S.ui.keep.filter((x) => x !== u.id);
        announce(`Undone. Back to ${STATUS_LABEL[u.before.status]}.`);
        focusLater(`#mb-st-${u.id}`);
      } else if (u.type === 'review') {
        S.toReview.splice(u.index, 0, u.item);
        setNotice(`Put back: ${esc(u.item.company)} — ${esc(u.item.role)}.`);
        announce('Put back.');
      } else if (u.type === 'company') {
        S.companies.splice(u.index, 0, u.item);
        setNotice(`Following ${esc(u.item.name)} again.`);
        announce(`Following ${u.item.name} again.`);
      } else if (u.type === 'voice') {
        S.voiceText = u.text;
        setNotice('Your previous writing rules are back.');
        announce('Your previous writing rules are back.');
      } else if (u.type === 'dismiss') {
        S.dismissed = S.dismissed.filter((x) => x !== u.id);
        setNotice('Put back.');
        announce('Put back.');
      } else if (u.type === 'skill') {
        delete S.skillStatus[u.id];
        setNotice('Skill status put back.');
        announce('Skill status put back.');
        focusLater(`#mb-sk-${u.id}`);
      }
      S.undo = null;
      if (u.type !== 'status') S.ui.notice = { ...S.ui.notice, undo: false };
    },
    'filter-status': (st) => {
      S.ui.appFilter.status = st;
      S.ui.keep = [];
      S.ui.rowMsg = {};
    },
    'clear-filters': () => {
      S.ui.appFilter = { status: 'all', fit: 'any', q: '' };
      S.ui.keep = [];
      delete S.drafts['app-q'];
      announce('Filters cleared.');
      focusLater('#app-q');
    },
    sort: (key) => {
      const s = S.ui.sort;
      S.ui.sort = s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: key === 'company' ? 'asc' : 'desc' };
      focusLater(`[data-action="sort"][data-arg="${key}"]`);
    },
    'make-cv': (id) => {
      const a = appById(id);
      S.ui.menu = null;
      const r = startRun({ kind: 'cv', appId: a.id, label: `Tailored CV · ${jobName(a)}` });
      setNotice(`Started: tailored CV for ${esc(jobName(a))} — about 3 min. <a href="#/applications/${a.id}/documents">Follow it on the job’s page</a> or in Activity.`, 'info');
      if (route().page === 'applications' && route().parts[1]) {
        S.ui.notice = null;
        focusLater('#cv-working');
      }
      return r;
    },
    layout: (id) => {
      const a = appById(id);
      startRun({ kind: 'layout', appId: a.id, label: `Update layout · ${jobName(a)}`, ms: 1500 });
      focusLater(route().page === 'my-cv' ? '#pv-h' : '#cv-working');
    },
    'layout-all-confirm': () => {
      const n = S.apps.filter((a) => a.pdf).length;
      const d = designOf(S.design.saved);
      confirmDialog({
        title: `Update ${n} CVs to ${d.name}?`,
        body: `This re-draws ${n} tailored CV PDFs in ${d.name} and runs the screening check on each. The wording does not change, no AI is used, and the old PDFs are replaced.`,
        ok: `Update ${n} CVs`,
        onOk: () => {
          startRun({ kind: 'layout-all', label: `Update layout · ${n} CVs to ${d.name}`, ms: 2500 });
          focusLater('#all-h');
          save();
          render();
        },
      });
      return 'no-render';
    },
    'open-cover': (id) => {
      S.ui.coverOpen[id] = true;
      focusLater(`#cl-why-${id}`);
    },
    'cancel-cover': (id) => {
      S.ui.coverOpen[id] = false;
      ['why', 'problem', 'approach'].forEach((k) => delete S.errors[`cl-${k}-${id}`]);
      if (route().parts[2] === 'cover') {
        go(`#/applications/${id}/documents`);
      }
      focusLater(`#open-cover-${id}`);
    },
    'check-again': (id) => {
      const a = appById(id);
      S.ui.menu = null;
      const run = () => {
        startRun({ kind: 'check', url: a.url || `https://job-boards.greenhouse.io/${slug(a.company)}/jobs/${4100000 + a.id}`, appId: a.id, label: `Check fit · ${jobName(a)}` });
        focusLater('#page-title');
        save();
        render();
      };
      if (CLOSED.has(a.status)) {
        confirmDialog({ title: `Check ${jobName(a)} again?`, body: `This job is marked “${STATUS_LABEL[a.status]}”. A new check uses the AI assistant (2–5 min, your Claude plan) and replaces its fit report.`, ok: 'Check fit again', onOk: run });
        return 'no-render';
      }
      run();
      return 'no-render';
    },
    'check-url': (url) => {
      const p = S.toReview.find((x) => x.url === url);
      startRun({ kind: 'check', url, reviewKey: p?.key, label: `Check fit · ${p ? `${p.company} — ${p.role}` : url}` });
    },
    retry: (id) => {
      const old = S.runs.find((r) => String(r.id) === String(id));
      const nr = startRun({ kind: old.kind, url: old.url, appId: old.appId, label: old.label, retryOf: old.id });
      old.retried = true;
      if (old.url && /4109592/.test(old.url)) nr.ms = RUN_MS;
      announce(`Trying again: ${old.label}. This usually takes 2 to 5 minutes.`);
      focusLater(route().page === 'today' ? '#page-title' : '#activity-btn');
    },
    'ack-setup': () => {
      S.setupJustDone = false;
      focusLater('#page-title');
    },
    ack: (id) => {
      const r = S.runs.find((x) => String(x.id) === String(id));
      r.ack = true;
      r.seen = true;
      focusLater('#page-title');
    },
    dismiss: (id) => {
      S.dismissed.push(Number(id));
      setNotice('Dismissed. It is still in Activity if you need it.', 'ok', { type: 'dismiss', id: Number(id) });
      announce('Dismissed. Undo is available.');
      focusLater('#undo-btn');
    },
    'cancel-run': (id) => {
      const r = S.runs.find((x) => String(x.id) === String(id));
      r.status = 'cancelled';
      r.finishedAt = Date.now();
      r.outcomeText = 'Cancelled';
      announce(`Cancelled: ${r.label}.`);
    },
    scan: () => {
      const preview = Boolean(S.drafts['scan-preview']);
      startRun({ kind: 'scan', preview, label: `Check for new openings · ${plural(S.companies.filter((c) => c.enabled).length, 'company', 'companies')}`, ms: 2500 });
      if (route().page === 'to-review') focusLater('#page-title');
      else setNotice('Checking for new openings… a few seconds. <a href="#/to-review">See the results in To review</a>.', 'info');
    },
    select: (key) => {
      const s = S.ui.selected;
      S.ui.selected = s.includes(key) ? s.filter((k) => k !== key) : [...s, key];
    },
    'check-selected': () => {
      const items = S.toReview.filter((p) => S.ui.selected.includes(p.key));
      confirmDialog({
        title: `Check fit for ${plural(items.length, 'job')}?`,
        body: `Each check uses the AI assistant and your Claude plan. Two run at a time; ${items.length} take about ${Math.ceil(items.length / 2) * 4} minutes in all. You can keep working.`,
        ok: `Check ${plural(items.length, 'job')}`,
        onOk: () => {
          items.forEach((p, i) => startRun({ kind: 'check', url: p.url, label: `Check fit · ${p.company} — ${p.role}`, ms: RUN_MS + Math.floor(i / 2) * RUN_MS }));
          S.ui.selected = [];
          focusLater('#tr-h');
          save();
          render();
        },
      });
      return 'no-render';
    },
    'remove-review': (key) => {
      const index = S.toReview.findIndex((p) => p.key === key);
      const [item] = S.toReview.splice(index, 1);
      S.ui.selected = S.ui.selected.filter((k) => k !== key);
      setNotice(`Removed: ${esc(item.company)} — ${esc(item.role)}.`, 'ok', { type: 'review', item, index });
      announce(`Removed ${item.company} — ${item.role}. Undo is available.`);
      focusLater('#undo-btn');
    },
    'remove-selected': () => {
      const n = S.ui.selected.length;
      S.toReview = S.toReview.filter((p) => !S.ui.selected.includes(p.key));
      S.ui.selected = [];
      setNotice(`Removed ${plural(n, 'link')}.`, 'ok');
      announce(`Removed ${plural(n, 'link')}.`);
    },
    'toggle-follow': () => {
      S.ui.followOpen = !S.ui.followOpen;
      ['nf-name', 'nf-url'].forEach((k) => delete S.errors[k]);
      focusLater(S.ui.followOpen ? '#nf-name' : '#follow-btn');
    },
    'toggle-company': (i) => {
      const c = S.companies[i];
      c.enabled = !c.enabled;
      S.ui.fix = null;
      setNotice(`${esc(c.name)} ${c.enabled ? 'will be checked for new openings again' : 'is paused — it won’t be checked until you turn it back on'}.`);
      announce(`${c.name} ${c.enabled ? 'on' : 'paused'}.`);
      focusLater(`[data-action="toggle-company"][data-arg="${i}"]`);
    },
    'fix-company': (i) => {
      S.ui.fix = Number(i);
      focusLater(`#fix-${i}`);
    },
    'edit-company': (i) => {
      S.ui.editCompany = Number(i);
      focusLater('#ef-name');
    },
    'cancel-edit': () => {
      S.ui.editCompany = null;
      ['ef-name', 'ef-url'].forEach((k) => {
        delete S.errors[k];
        delete S.drafts[k];
      });
    },
    'remove-company': (i) => {
      const [item] = S.companies.splice(Number(i), 1);
      setNotice(`You no longer follow ${esc(item.name)}.`, 'ok', { type: 'company', item, index: Number(i) });
      announce(`Removed ${item.name}. Undo is available.`);
      focusLater('#undo-btn');
    },
    'check-boards': () => {
      S.ui.boardsResult = brokenBoards().length ? `${brokenBoards().map((c) => c.name).join(', ')}: board not found. Every other board answered.` : 'Every job board answered.';
      announce(S.ui.boardsResult);
    },
    'skills-strong': () => {
      S.ui.skillsStrong = !S.ui.skillsStrong;
      announce(S.ui.skillsStrong ? 'Counting only postings with a fit of 4 or more. Numbers, evidence and order updated.' : 'Counting all postings again.');
      focusLater('#skills-strong');
    },
    'skills-ignored': () => {
      S.ui.skillsIgnored = !S.ui.skillsIgnored;
      announce(S.ui.skillsIgnored ? 'Showing skills you ignored.' : 'Hiding skills you ignored.');
      focusLater('#skills-ignored');
    },
    'skill-status': (arg) => {
      const [id, st] = arg.split('|');
      S.skillStatus[id] = st;
      S.ui.menu = null;
      const name = [...S.skills.learn, ...S.skills.deepen, ...S.skills.demanded].find((s) => s.id === id)?.name || id;
      setNotice(`Saved: your CV ${st === 'have' ? 'has' : st === 'partial' ? 'partly has' : st === 'ignore' ? 'ignores' : 'is missing'} ${esc(name)}.`, 'ok', { type: 'skill', id });
      announce(`Saved ${name}. Undo is available.`);
      focusLater(`#mb-sk-${id}`);
    },
    'improve-skills': () => {
      startRun({ kind: 'skills', label: `Improve the skills analysis · ${S.skills.coverage.pendingLlm} postings`, ms: 3000 });
    },
    'pick-design': (id) => {
      S.design.selected = id;
      S.ui.previewUpdating = true;
      setTimeout(() => {
        S.ui.previewUpdating = false;
        save();
        render();
        announce(`Preview: ${designOf(id).name}. Screening check: ${VERDICT_TEXT[designOf(id).verdict]}.`);
      }, 600);
      focusLater(`[data-action="pick-design"][data-arg="${id}"]`);
    },
    'only-pass': () => {
      S.ui.onlyPass = !S.ui.onlyPass;
    },
    'save-design': () => {
      if (S.design.selected === S.design.saved) return;
      S.design.saved = S.design.selected;
      const d = designOf(S.design.saved);
      setNotice(`<b>${esc(d.name)} is now your design for every new CV.</b> ${VERDICT_TEXT[d.verdict]}. Existing CVs keep their old layout until you update them below.`);
      announce(`${d.name} is now your design for every new CV.`);
      focusLater('.notice[role="status"]');
    },
    'discard-design': () => {
      S.design.selected = S.design.saved;
      announce('Changes discarded.');
    },
    'remove-word': (w) => {
      const text = S.voiceText;
      setWords(voiceWords().filter((x) => x !== w));
      setNotice(`Removed “${esc(w)}” from words to avoid.`, 'ok', { type: 'voice', text });
      announce(`Removed ${w}. Undo is available.`);
      focusLater('#add-word');
    },
    'seed-confirm': () => {
      confirmDialog({
        title: 'Replace your writing rules with the example rules?',
        body: `Your ${plural(voiceWords().length, 'word')} to avoid and your tone notes are replaced. A backup is kept as voice-dna.md.bak, and you can undo right after.`,
        ok: 'Replace my rules',
        okClass: 'btn-danger',
        onOk: () => {
          const text = S.voiceText;
          S.voiceText = '# Writing rules (example)\n\n## Tone\nClear and specific.\n\n## Never write\n- passionate\n- synergy\n- go-getter\n';
          setNotice('Replaced with the example rules. Your old rules are in voice-dna.md.bak.', 'ok', { type: 'voice', text });
          announce('Replaced with the example rules. Undo is available.');
          focusLater('#undo-btn');
          save();
          render();
        },
      });
      return 'no-render';
    },
    'tidy-preview': (id) => {
      S.ui.tidy[id] = id === 'verify' || id === 'boards' ? 'done' : 'preview';
      focusLater(`#tool-${id}-h`);
    },
    'tidy-confirm': (id) => {
      S.ui.tidy[id] = 'done';
      focusLater(`#tool-${id}-h`);
    },
    'tidy-discard': (id) => {
      S.ui.tidy[id] = null;
      focusLater(`#tool-${id}-h`);
    },
    download: (arg) => {
      const [kind, id] = arg.split('|');
      const a = appById(id);
      const doc = kind === 'cv' ? a.pdf : a.cover;
      const blob = new Blob([`Prototype download: ${doc.file} (fictional).`], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = doc.file.replace(/\.pdf$/, '.txt');
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      announce(`Downloading ${doc.file}.`);
      return 'no-render';
    },
  };

  const FORMS = {
    search: () => {
      const q = (S.drafts['q-search'] || '').trim();
      if (q) go(`#/search?q=${encodeURIComponent(q)}`);
    },
    'add-job': (prefix, submitter) => {
      const url = (S.drafts[`${prefix}-url`] || '').trim();
      if (!isUrl(url)) {
        S.errors[`${prefix}-url`] = url ? 'That doesn’t look like a job posting link. It should start with https:// and include the job’s page.' : 'Paste the link to the job posting first.';
        focusLater(`#${prefix}-url`);
        return;
      }
      delete S.errors[`${prefix}-url`];
      if (submitter === 'save') {
        const g = guessJob(url);
        S.toReview.unshift({ url, company: g.company, role: g.role, location: '', posted: TODAY, key: `s${Date.now()}` });
        const r = { id: S.nextRun++, kind: 'save', url, status: 'saved', startedAt: Date.now() };
        S.runs.push(r);
        S.ui.addRun = r.id;
        announce(`Saved for later in To review: ${g.company}.`);
      } else {
        const r = startRun({ kind: 'check', url, autoCv: S.drafts[`${prefix}-autocv`] !== false, label: `Check fit · ${guessJob(url).company} — ${guessJob(url).role}` });
        S.ui.addRun = r.id;
      }
      delete S.drafts[`${prefix}-url`];
      focusLater(`#${prefix}-result`);
    },
    'save-cv': () => {
      const text = (S.drafts['cv-paste'] || '').trim();
      if (text.length < 20) {
        S.errors['cv-paste'] = text ? 'That looks too short to be a CV. Paste the whole CV, or choose a file.' : 'Paste your CV, or choose a file, before saving.';
        focusLater('#cv-paste');
        return;
      }
      delete S.errors['cv-paste'];
      S.cv = text;
      S.cvSaved = TODAY;
      delete S.drafts['cv-paste'];
      if (setupDone()) S.setupJustDone = true;
      announce(`CV saved. ${S.companies.length ? 'Set-up complete.' : 'Next: follow a company.'}`);
      focusLater(S.companies.length ? '#setup-done-h' : '#co-name');
    },
    'cv-edit': () => {
      S.cv = S.drafts['cv-edit'] ?? S.cv;
      S.cvSaved = TODAY;
      setNotice(`CV saved ${fmtDate(TODAY)}. It is used by the next fit check, tailored CV and letter.`);
      announce('CV saved.');
    },
    follow: (mode) => {
      const p = mode === 'setup' ? 'co' : mode === 'new' ? 'nf' : 'ef';
      const name = (S.drafts[`${p}-name`] ?? (mode === 'edit' ? S.companies[S.ui.editCompany]?.name : '') ?? '').trim();
      const url = (S.drafts[`${p}-url`] ?? (mode === 'edit' ? S.companies[S.ui.editCompany]?.careersUrl : '') ?? '').trim();
      let bad = false;
      if (!name) {
        S.errors[`${p}-name`] = 'Enter the company’s name.';
        bad = true;
      } else delete S.errors[`${p}-name`];
      if (!isUrl(url)) {
        S.errors[`${p}-url`] = url ? 'That doesn’t look like a link. It should start with https://' : 'Enter the link to the company’s careers page or job board.';
        bad = true;
      } else delete S.errors[`${p}-url`];
      if (bad) {
        focusLater(`#${S.errors[`${p}-name`] ? `${p}-name` : `${p}-url`}`);
        return;
      }
      const provider = /greenhouse/.test(url) ? 'greenhouse' : /lever/.test(url) ? 'lever' : /ashby/.test(url) ? 'ashby' : 'other';
      if (mode === 'edit') {
        Object.assign(S.companies[S.ui.editCompany], { name, careersUrl: url, provider, health: { at: TODAY, status: 'reachable' } });
        S.ui.editCompany = null;
        setNotice(`Saved ${esc(name)}.`);
      } else {
        S.companies.unshift({ name, careersUrl: url, provider, enabled: true, health: { at: TODAY, status: 'reachable' } });
        if (mode === 'new') {
          S.ui.followOpen = false;
          setNotice(`Following ${esc(name)} · ${esc(providerName(provider))} job board found.`);
        }
      }
      [`${p}-name`, `${p}-url`].forEach((k) => delete S.drafts[k]);
      if (mode === 'setup' && setupDone()) S.setupJustDone = true;
      announce(`Following ${name}. ${providerName(provider)} job board found.${mode === 'setup' && setupDone() ? ' Set-up complete.' : ''}`);
      focusLater(mode === 'setup' ? (S.cv ? '#setup-done-h' : '#cv-paste') : '.notice[role="status"]');
    },
    cover: (id) => {
      let bad = null;
      for (const k of ['why', 'problem', 'approach']) {
        if (!(S.drafts[`cl-${k}-${id}`] || '').trim()) {
          S.errors[`cl-${k}-${id}`] = 'Answer this question — a sentence is enough.';
          bad ||= k;
        } else delete S.errors[`cl-${k}-${id}`];
      }
      if (bad) {
        focusLater(`#cl-${bad}-${id}`);
        return;
      }
      const a = appById(id);
      S.ui.coverOpen[id] = false;
      startRun({ kind: 'cover', appId: a.id, tone: S.drafts[`cl-tone-${id}`] || 'Direct', label: `Cover letter · ${jobName(a)}` });
      if (route().parts[2] === 'cover') history.replaceState(null, '', `#/applications/${id}/documents`);
      focusLater('#cl-working');
    },
    'add-word': () => {
      const w = (S.drafts['add-word'] || '').trim().replace(/^-\s*/, '');
      if (!w) {
        S.errors['add-word'] = 'Type a word or phrase first.';
        focusLater('#add-word');
        return;
      }
      delete S.errors['add-word'];
      const words = voiceWords();
      if (words.some((x) => x.toLowerCase() === w.toLowerCase())) {
        setNotice(`“${esc(w)}” is already on the list.`, 'info');
      } else {
        setWords([...words, w]);
        S.voiceChanged = true;
        S.voiceAdded = (S.voiceAdded || 0) + 1;
        setNotice(`Added “${esc(w)}”. It applies to the next tailored CV or letter.`);
        announce(`Added ${w}. It applies to the next tailored CV or letter.`);
      }
      delete S.drafts['add-word'];
      focusLater('#add-word');
    },
    'voice-edit': () => {
      S.voiceText = S.drafts['voice-edit'] ?? S.voiceText;
      delete S.drafts['voice-edit'];
      S.voiceChanged = true;
      S.ui.rulesOpen = true;
      S.ui.rulesSaved = clock(Date.now());
      announce('Writing rules saved. They apply to the next tailored CV or letter.');
      focusLater('#rules-saved');
    },
    profile: () => {
      ['name', 'location', 'targets', 'remote', 'comp', 'threshold', 'language', 'tier'].forEach((k) => {
        if (S.drafts[`pf-${k}`] !== undefined) S.profile[k] = S.drafts[`pf-${k}`];
      });
      setNotice('Profile saved.');
      announce('Profile saved.');
    },
  };

  // ── events ──────────────────────────────────────────────────────────
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) {
      if (S.ui.menu && !e.target.closest('.menu-wrap')) {
        S.ui.menu = null;
        render();
      }
      return;
    }
    if (el.tagName === 'INPUT' && el.type === 'checkbox' && !['select', 'toggle-company', 'skills-strong', 'skills-ignored', 'only-pass'].includes(el.dataset.action)) return;
    const fn = ACTIONS[el.dataset.action];
    if (!fn) return;
    if (el.tagName === 'A') e.preventDefault();
    if (el.dataset.action !== 'undo' && el.dataset.action !== 'menu' && !el.closest('.menu')) {
      if (S.ui.notice && !S.ui.notice.sticky) S.ui.notice = null;
    }
    const out = fn(el.dataset.arg, el);
    save();
    if (out !== 'no-render') render();
  });

  document.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-form]');
    if (!form || form.method === 'dialog') return;
    e.preventDefault();
    const submitter = e.submitter?.dataset?.submit || null;
    if (S.ui.notice) S.ui.notice = null;
    FORMS[form.dataset.form]?.(form.dataset.arg, submitter);
    save();
    render();
  });

  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.matches('[data-draft]')) {
      S.drafts[el.id] = el.value;
      if (el.dataset.live === 'app-q') {
        S.ui.appFilter.q = el.value;
        S.ui.keep = [];
        save();
        render();
        return;
      }
      save();
    }
  });

  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.matches('[data-draft-check]')) S.drafts[el.id] = el.checked;
    if (el.matches('[data-draft-select]')) S.drafts[el.id] = el.value;
    const kind = el.dataset.change;
    if (kind === 'fit-filter') {
      S.ui.appFilter.fit = el.value;
      S.ui.keep = [];
      save();
      render();
    } else if (kind === 'preview-with') {
      S.drafts['preview-with'] = el.value;
      S.ui.previewUpdating = true;
      save();
      render();
      setTimeout(() => {
        S.ui.previewUpdating = false;
        render();
      }, 500);
    } else if (kind === 'cv-file' && el.files?.[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || '');
        if (route().page === 'my-cv') S.drafts['cv-edit'] = text;
        else S.drafts['cv-paste'] = text;
        announce(`Read ${el.files[0].name}. Check it, then save.`);
        save();
        render();
      };
      reader.readAsText(el.files[0]);
    } else save();
  });

  document.addEventListener('toggle', (e) => {
    const key = e.target.dataset?.toggle;
    if (key) S.ui[key] = e.target.open;
  }, true);

  document.addEventListener('keydown', (e) => {
    const inMenu = e.target.closest?.('[role="menu"]');
    if (inMenu) {
      const items = [...inMenu.querySelectorAll('[role="menuitem"]')];
      const i = items.indexOf(e.target);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[(i + 1) % items.length].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[(i - 1 + items.length) % items.length].focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        items[0].focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        items[items.length - 1].focus();
      } else if (e.key === 'Escape' || e.key === 'Tab') {
        const key = S.ui.menu;
        S.ui.menu = null;
        if (e.key === 'Escape') {
          e.preventDefault();
          focusLater(`#mb-${key}`);
        }
        render();
      }
      return;
    }
    if (e.key === 'Escape' && S.ui.panel && !document.getElementById('confirm').open) {
      S.ui.panel = false;
      focusLater('#activity-btn');
      render();
    }
  });

  // Leaving the Design section with an unsaved choice asks first (F-060).
  let guardHash = location.hash;
  window.addEventListener('hashchange', () => {
    const from = guardHash;
    const to = location.hash;
    if (from.startsWith('#/my-cv/design') && !to.startsWith('#/my-cv/design') && S.design.selected !== S.design.saved) {
      history.replaceState(null, '', from);
      confirmDialog({
        title: 'Leave without saving your design?',
        body: `${designOf(S.design.selected).name} is only in the preview. Your design is still ${designOf(S.design.saved).name}.`,
        ok: 'Leave without saving',
        onOk: () => {
          S.design.selected = S.design.saved;
          save();
          guardHash = to;
          location.hash = to;
        },
      });
      return;
    }
    guardHash = to;
    S.ui.menu = null;
    S.ui.navOpen = false;
    if (S.ui.notice && !S.ui.notice.undo) S.ui.notice = null;
    if (!to.startsWith('#/applications')) S.ui.appliedParam = false;
    save();
    render();
  });

  // Reset starts over in place. A reload here let automated clicks land on the reloaded page.
  document.getElementById('reset')?.addEventListener('click', () => {
    S = initialState();
    save();
    pendingFocus = '#page-title';
    if (location.hash === '#/today') render();
    else location.hash = '#/today';
    announce('Prototype reset to its start state.');
  });

  // The skip link cannot use href="#main": the hash is the router. It moves focus instead.
  document.querySelector('.skip')?.addEventListener('click', (e) => {
    e.preventDefault();
    const h = document.getElementById('page-title');
    if (h) {
      h.setAttribute('tabindex', '-1');
      h.focus();
    }
  });

  // Runs that were working when the page was reloaded finish now.
  S.runs.filter((r) => r.status === 'working').forEach(schedule);
  render();
})();
