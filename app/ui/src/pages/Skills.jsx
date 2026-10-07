import { useState } from 'react';

import { setSkillOverride, startRun, startSkillsExtract, startSkillsFetch } from '../api.js';
import { RunItem } from '../components/RunItem.jsx';
import { ChoiceSelect, EmptyState } from '../components/ui.jsx';
import { reload, useResource } from '../data.js';
import { fit, plural, shortDate } from '../lib/labels.js';
import { runState } from '../lib/runs.js';
import { rankSkills, SKILL_VIEWS } from '../lib/skills.js';
import { useRuns } from '../runs.jsx';
import { announce } from '../shell/announce.jsx';
import { PageHead } from '../shell/router.jsx';
import { offerUndo } from '../shell/undo.jsx';

const STATUS = [
  { id: 'missing', label: 'Missing' },
  { id: 'partial', label: 'Partly' },
  { id: 'have', label: 'Has it' },
  { id: 'ignore', label: 'Ignore this skill' },
];
const STATUS_WORD = { missing: 'Missing', partial: 'Partly', have: 'Has it', ignore: 'Ignored' };

const INTRO = {
  learn: 'Learn next: skills your CV doesn’t show',
  strengthen: 'Strengthen: skills your CV shows only partly',
  asked: 'Most asked for: every skill, whether or not you have it',
};

function SkillRow({ skill, n, max, goodFitOnly, rows, onStatus, overridden, onReset }) {
  const what = goodFitOnly ? 'good-fit posting' : 'posting';
  const byCompany = new Map();
  for (const p of skill.postings) byCompany.set(p.company ?? 'Unknown company', [...(byCompany.get(p.company ?? 'Unknown company') ?? []), p]);
  const companies = [...byCompany.entries()].sort((a, b) => b[1].length - a[1].length);
  const rowFor = (reportId) => rows.find((r) => r.reportId === reportId) ?? null;
  return (
    <div className="skill-row" id={`skill-${skill.id}`}>
      <div>
        <b>
          {n}. {skill.name}
        </b>
        <br />
        <span className="small muted">{skill.category}</span>
      </div>
      <div>
        <span className="bar" style={{ width: `${Math.round((skill.count / max) * 100)}%` }} aria-hidden="true" />
        <br />
        <span className="small">
          Asked for in <b>{skill.count}</b> {skill.count === 1 ? what : `${what}s`} ({skill.required} required, {skill.nice} nice to have)
        </span>
        <details>
          <summary>Show the evidence for {skill.name}</summary>
          <p className="small">
            <b>The {plural(skill.count, what)} asking for it, by company:</b>
          </p>
          <ul className="small">
            {companies.map(([company, postings]) => (
              <li key={company}>
                {company} ({postings.length}):{' '}
                {postings.map((p, i) => (
                  <span key={p.id}>
                    {i ? ', ' : ''}
                    <a href={p.url} target="_blank" rel="noopener noreferrer">
                      {p.title ?? 'posting'}
                      {typeof p.score === 'number' ? ` · fit ${fit(p.score)}` : ''} ↗
                    </a>
                  </span>
                ))}
              </li>
            ))}
          </ul>
          {skill.gapReports.length ? (
            <p className="small">
              <b>Flagged as a gap in your fit reports{goodFitOnly ? ' (fit 4 and up)' : ''}:</b>{' '}
              {skill.gapReports.slice(0, 8).map((id, i) => {
                const row = rowFor(id);
                return (
                  <span key={id}>
                    {i ? ', ' : ''}
                    <a href={row ? `#/applications/${row.id}` : `#/applications/report/${id}`}>
                      {row ? `${row.company} — ${row.role} (#${row.id}, fit ${fit(row.score)})` : `report ${id}`}
                    </a>
                  </span>
                );
              })}
            </p>
          ) : null}
          {skill.cooccur?.length ? (
            <p className="small">
              <b>Often asked for together with:</b> {skill.cooccur.map((c) => c.name).join(', ')}
            </p>
          ) : null}
        </details>
      </div>
      <div>
        <ChoiceSelect label={`${skill.name} on your CV`} visibleLabel value={skill.status} options={STATUS} onChange={(status) => onStatus(skill, status)} />
        {overridden ? (
          <p className="small">
            You set this.{' '}
            <button type="button" className="btn-link" onClick={() => onReset(skill)}>
              Back to automatic<span className="visually-hidden"> for {skill.name}</span>
            </button>
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Skills (ia.md §2.6): what employers in the user's search keep asking for,
 * three views as links, a filter that applies to everything in a row
 * (WP-T6-01), and the evidence behind every number.
 */
export function SkillsPage({ params }) {
  const skills = useResource('skills');
  const pipeline = useResource('pipeline');
  const portals = useResource('portals');
  const { list, track } = useRuns();
  const [goodFitOnly, setGoodFitOnly] = useState(false);
  const [showIgnored, setShowIgnored] = useState(false);
  const [category, setCategory] = useState('');
  const [find, setFind] = useState('');
  const [local, setLocal] = useState({});
  const [error, setError] = useState(null);
  const view = params.view ?? 'learn';

  const nav = (
    <nav className="subnav" aria-label="Skills views">
      <ul>
        {Object.entries(SKILL_VIEWS).map(([id, v]) => (
          <li key={id}>
            <a href={`#/skills/${id}`} aria-current={view === id ? 'page' : undefined}>
              {v.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
  const head = <PageHead title="Skills" lead="What employers in your job search keep asking for, and what your CV is missing." />;

  if (!skills.data) return head;
  const data = skills.data;
  const cov = data.coverage;
  if (!cov.postings) {
    return (
      <>
        {head}
        {nav}
        <EmptyState title="Nothing to rank yet">
          <p>Skills are counted from the job postings the app has found. Follow a company and check for new openings first; each posting is read once, and the counts appear here.</p>
          <p>
            <a href="#/companies">Companies you follow</a> · <a href="#/to-review">Check for new openings</a>
          </p>
        </EmptyState>
      </>
    );
  }

  const ranked = rankSkills(data, { view, goodFitOnly, showIgnored, statusById: local });
  const { hidden, counted } = ranked;
  const categories = [...new Set(ranked.rows.map((r) => r.category).filter(Boolean))].sort();
  const words = find.trim().toLowerCase();
  // Category and search narrow the list; the numbering keeps the rank in the full view.
  const rows = ranked.rows.map((r, i) => ({ ...r, rank: i + 1 })).filter((r) => (!category || r.category === category) && (!words || r.name.toLowerCase().includes(words)));
  const max = Math.max(...ranked.rows.map((r) => r.count), 1);
  const improving = list.find((r) => ['skills-extract', 'skills-cv', 'skills-fetch'].includes(r.kind) && ['waiting', 'working'].includes(runState(r)));
  const what = goodFitOnly ? 'good-fit postings' : 'postings';

  const onStatus = async (skill, status) => {
    const before = local[skill.id] ?? skill.status;
    setLocal((l) => ({ ...l, [skill.id]: status }));
    try {
      await setSkillOverride(skill.id, status);
      await reload('skills');
      // The row may move or leave this view; focus goes to its select if still here, else the list.
      setTimeout(() => (document.getElementById(`skill-${skill.id}`)?.querySelector('button') ?? document.getElementById('skills-list'))?.focus(), 0);
      announce(`${skill.name}: moved to ${STATUS_WORD[status]}`);
      offerUndo(`${skill.name} moved to ${STATUS_WORD[status]}`, async () => {
        // Back to what it was: the earlier override, or none (the CV's own reading).
        await setSkillOverride(skill.id, data.overrides?.[skill.id] ?? null);
        setLocal((l) => ({ ...l, [skill.id]: before }));
        await reload('skills');
      });
    } catch (e) {
      setLocal((l) => ({ ...l, [skill.id]: before }));
      setError(e.message);
    }
  };

  // UI-skills-reset: drop the user's choice, so the CV's own reading decides again.
  const onReset = async (skill) => {
    const before = data.overrides?.[skill.id] ?? null;
    try {
      await setSkillOverride(skill.id, null);
      setLocal((l) => {
        const rest = { ...l };
        delete rest[skill.id];
        return rest;
      });
      await reload('skills');
      setTimeout(() => document.getElementById(`skill-${skill.id}`)?.querySelector('button')?.focus(), 0);
      announce(`${skill.name}: back to what your CV shows`);
      offerUndo(`${skill.name} back to automatic`, async () => {
        await setSkillOverride(skill.id, before);
        await reload('skills');
      });
    } catch (e) {
      setError(e.message);
    }
  };
  const startKind = async (kind, options, said) => {
    setError(null);
    try {
      track(await startRun(kind, options));
      announce(said);
    } catch (e) {
      setError(e.message);
    }
  };

  const improve = async () => {
    setError(null);
    try {
      const result = await startSkillsExtract(5);
      for (const run of [...(result.runs ?? []), ...(result.cv ? [result.cv] : [])]) track(run);
      announce(`Started improving the analysis: ${plural(result.batches, 'session')}.`);
      setTimeout(() => document.querySelector('.notice .act-title a')?.focus(), 0);
    } catch (e) {
      setError(e.message);
    }
  };
  const fetchNew = async () => {
    setError(null);
    try {
      track(await startSkillsFetch({}));
      announce('Started reading the new postings.');
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      {head}
      {nav}
      <div className="notice info stack-sm">
        <p>
          Based on <b>{plural(cov.postings, 'posting')}</b> from {plural((portals.data?.companies ?? []).length, 'company', 'companies')}
          {cov.lastFetchAt ? `, last read ${shortDate(cov.lastFetchAt)}` : ''} · {cov.extractedLlm} read by Claude, {cov.rulesOnly} by quick rules
          {cov.fetchFailed ? `, ${cov.fetchFailed} couldn’t be loaded (the job was taken down)` : ''}
          {cov.unfetched ? `, ${cov.unfetched} not read yet` : ''}.
        </p>
        {improving ? (
          <RunItem run={improving} headingLevel={3} />
        ) : (
          <div className="row">
            {cov.pendingLlm ? (
              <>
                <button type="button" className="btn2 btn-sm" onClick={improve}>
                  Improve the analysis
                </button>
                <span className="hint inline">
                  Reads {plural(cov.pendingLlm, 'posting')} with Claude · about {plural(cov.sessionsNeeded, 'session')} · uses your Claude plan
                </span>
              </>
            ) : null}
            {cov.unfetched ? (
              <button type="button" className="btn2 btn-sm" onClick={fetchNew}>
                Read the {cov.unfetched} new postings
              </button>
            ) : null}
            {cov.fetchFailed ? (
              <button type="button" className="btn2 btn-sm" onClick={() => startKind('skills-fetch', { retryFailed: true }, `Started reading the ${cov.fetchFailed} postings that failed again.`)}>
                Try the {plural(cov.fetchFailed, 'failed posting')} again
              </button>
            ) : null}
            {data.cv?.present ? (
              <>
                <button type="button" className="btn2 btn-sm" onClick={() => startKind('skills-cv', {}, 'Started reading your CV’s skills again.')}>
                  Read my CV’s skills again
                </button>
                <span className="hint inline">
                  {data.cv.stale ? 'Your CV changed since Claude last read it' : data.cv.engine === 'llm' ? `Read by Claude${data.cv.extractedAt ? ` ${shortDate(data.cv.extractedAt)}` : ''}` : 'Read by quick rules so far'} · one Claude session · uses your Claude plan
                </span>
              </>
            ) : null}
          </div>
        )}
      </div>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      <p className="small muted">
        {INTRO[view]}, ranked by how many {what} ask for them (more “required” first on a tie).
      </p>
      <div className="row">
        <label className="check">
          <input type="checkbox" checked={goodFitOnly} onChange={(e) => setGoodFitOnly(e.target.checked)} /> Only jobs I’d apply to (fit 4 and up)
        </label>
        <label className="check">
          <input type="checkbox" checked={showIgnored} onChange={(e) => setShowIgnored(e.target.checked)} /> Show skills I ignored
        </label>
      </div>
      <div className="row filters">
        <div className="field narrow">
          <label htmlFor="skills-category">Category</label>
          <select id="skills-category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="field grow">
          <label htmlFor="skills-find">Find a skill</label>
          <input id="skills-find" type="search" value={find} placeholder="e.g. Kubernetes" onChange={(e) => setFind(e.target.value)} />
        </div>
      </div>
      <p className="small" role="status">
        {goodFitOnly
          ? `Counting only the ${counted} postings whose fit is 4 or more: every number, the evidence and the order below use just those.${hidden ? ` ${plural(hidden, 'skill')} with no good-fit posting ${hidden === 1 ? 'is' : 'are'} hidden.` : ''}`
          : `Counting all ${counted} postings that could be read${cov.postings > counted ? ` (of the ${cov.postings} found)` : ''}.`}
      </p>
      <p className="small muted">Each bar’s length is how many {what} ask for the skill, against the most-asked one.</p>
      <section className="card flush" id="skills-list" tabIndex={-1} aria-label={`${SKILL_VIEWS[view].label}: skills list`}>
        {rows.length ? (
          rows.map((skill) => <SkillRow key={skill.id} skill={skill} n={skill.rank} max={max} goodFitOnly={goodFitOnly} rows={pipeline.data?.rows ?? []} onStatus={onStatus} overridden={Boolean(data.overrides?.[skill.id])} onReset={onReset} />)
        ) : (
          <p className="pad">No skills to show in this view{goodFitOnly || category || words ? ' with these filters' : ''}.</p>
        )}
      </section>
    </>
  );
}
