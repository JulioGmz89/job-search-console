import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchSkills, setSkillOverride, startSkillsExtract, startSkillsFetch } from '../api.js';
import { useRuns } from '../runs.jsx';

/**
 * The Skills Gap page (PROJECT_PLAN.md §6): what the scanned postings ask for,
 * what the CV already covers, and — the question the page exists to answer —
 * what to learn next, each answer backed by the postings that demand it.
 *
 * Everything shown is computed on the server from `data/skills/`; this page
 * only chooses a lens (which list, which category, only the jobs worth
 * applying to) and starts the two runs that fill the cache: fetching posting
 * text (free) and extracting with Claude (costs sessions, so it says how many).
 */

const TABS = [
  { id: 'learn', label: 'Learn next', hint: 'In demand, not on your CV' },
  { id: 'deepen', label: 'Deepen', hint: 'In demand, only touched on your CV' },
  { id: 'demanded', label: 'Most demanded', hint: 'Every skill, by how many postings ask for it' },
];

const STATUS_LABEL = { have: 'Have', partial: 'Partial', missing: 'Missing', ignore: 'Ignore' };
const STATUS_ORDER = ['have', 'partial', 'missing', 'ignore'];

const CATEGORY_LABEL = {
  language: 'language',
  framework: 'framework',
  'cloud-infra': 'cloud / infra',
  data: 'data',
  'ai-ml': 'AI / ML',
  practice: 'practice',
  tool: 'tool',
  certification: 'certification',
  domain: 'domain',
  soft: 'other',
  other: 'other',
};

const BLOCKS = '▁▂▃▄▅▆▇█';

/** A six-month trend as text blocks, so no chart library is needed for a glance. */
function Spark({ trend, months }) {
  const max = Math.max(1, ...trend);
  const text = trend.map((n) => (n === 0 ? BLOCKS[0] : BLOCKS[Math.min(7, Math.ceil((n / max) * 7))])).join('');
  const title = trend.map((n, i) => `${months[i]}: ${n}`).join('\n');
  return <span className="spark" title={title} aria-label={`trend ${trend.join(', ')}`}>{text}</span>;
}

function scoreClass(score) {
  if (typeof score !== 'number') return '';
  if (score >= 4) return 'strong';
  if (score >= 3) return 'review';
  return 'skip';
}

/** The postings behind one skill, with a link to each. */
function Evidence({ skill, postings, onJump }) {
  const rows = skill.postings
    .map((p) => ({ ...postings[p.id], level: p.level }))
    .filter((p) => p.id)
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || (b.firstSeen ?? '').localeCompare(a.firstSeen ?? ''));
  return (
    <div className="evidence">
      <div className="evidence-head">
        <strong>{rows.length} posting{rows.length === 1 ? '' : 's'} ask for {skill.name}</strong>
        {skill.gapReports.length ? (
          <span className="muted">
            {' · '}flagged as a gap in {skill.gapReports.map((id, i) => (
              <span key={id}>{i ? ', ' : ''}<a href={`#/pipeline/${id}`}>report {String(id).padStart(3, '0')}</a></span>
            ))}
          </span>
        ) : null}
      </div>
      <ul className="evidence-list">
        {rows.map((p) => (
          <li key={p.id}>
            <span className={`badge level-${p.level}`}>{p.level === 'required' ? 'required' : 'nice to have'}</span>
            <span className="evidence-title">
              {p.company ? <strong>{p.company}</strong> : null}
              {p.company && p.title ? ' — ' : ''}
              {p.title ?? p.url}
            </span>
            {typeof p.score === 'number' ? <span className={`score ${scoreClass(p.score)}`}>{p.score.toFixed(1)}</span> : null}
            {p.firstSeen ? <span className="muted">{p.firstSeen}</span> : null}
            <span className="muted">{p.engine === 'llm' ? 'Claude' : 'rules'}</span>
            <a href={p.url} target="_blank" rel="noopener noreferrer">posting ↗</a>
            {p.reportId !== null && p.reportId !== undefined ? <a href={`#/pipeline/${p.reportId}`}>report {String(p.reportId).padStart(3, '0')}</a> : null}
          </li>
        ))}
      </ul>
      {skill.cooccur.length ? (
        <div className="cooccur">
          <span className="muted">Often asked for together with:</span>
          {skill.cooccur.map((c) => (
            <button key={c.id} className="chip" onClick={() => onJump(c.id)} title={`${c.n} of these postings`}>{c.name} <span className="n">{c.n}</span></button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SkillRow({ skill, maxWeight, months, postings, expanded, onToggle, onStatus, onJump, busy }) {
  const width = maxWeight > 0 ? Math.max(2, Math.round((skill.weighted / maxWeight) * 100)) : 0;
  return (
    <>
      <tr className={`skill-row status-${skill.status}${expanded ? ' expanded' : ''}`} id={`skill-${skill.id}`}>
        <td className="skill-name">
          <button className="linkish" onClick={onToggle} aria-expanded={expanded}>
            {expanded ? '▾' : '▸'} {skill.name}
          </button>
          <span className="badge category">{CATEGORY_LABEL[skill.category] ?? skill.category}</span>
        </td>
        <td className="skill-bar-cell">
          <div className="skill-bar" title={`weighted demand ${skill.weighted}`}>
            <div className={`skill-bar-fill status-${skill.status}`} style={{ width: `${width}%` }} />
          </div>
        </td>
        <td className="num" title={`${skill.required} required · ${skill.nice} nice to have`}>
          {skill.demand}
          <span className="muted small"> ({skill.required}/{skill.nice})</span>
        </td>
        <td className="num" title="Postings scored 4.0 or higher">{skill.strong || '—'}</td>
        <td className="num" title="Evaluation reports that called this a gap">{skill.gapMentions || '—'}</td>
        <td><Spark trend={skill.trend} months={months} /></td>
        <td>
          <select
            className={`status-select status-${skill.status}`}
            value={skill.status}
            disabled={busy}
            title={skill.statusSource === 'override' ? 'Set by you' : skill.statusSource === 'cv-llm' ? 'From the Claude reading of your CV' : skill.statusSource === 'cv-rules' ? 'From your CV (rules)' : 'Not found on your CV'}
            onChange={(e) => onStatus(skill.id, e.target.value)}
          >
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          {skill.statusSource === 'override' ? (
            <button className="chip tiny" title="Back to what the CV says" onClick={() => onStatus(skill.id, null)}>reset</button>
          ) : null}
        </td>
      </tr>
      {expanded ? (
        <tr className="evidence-row">
          <td colSpan={7}><Evidence skill={skill} postings={postings} onJump={onJump} /></td>
        </tr>
      ) : null}
    </>
  );
}

function Coverage({ coverage, cv }) {
  const pct = (n) => (coverage.postings ? Math.round((n / coverage.postings) * 100) : 0);
  return (
    <div className="coverage">
      <div className="coverage-row">
        <span><strong>{coverage.postings}</strong> postings</span>
        <span className="dot">·</span>
        <span><strong>{coverage.withText}</strong> with text ({pct(coverage.withText)}%)</span>
        <span className="dot">·</span>
        <span><strong>{coverage.extractedLlm}</strong> read by Claude</span>
        <span className="dot">·</span>
        <span><strong>{coverage.rulesOnly}</strong> rules only</span>
        {coverage.unfetched ? <><span className="dot">·</span><span>{coverage.unfetched} not fetched</span></> : null}
        {coverage.fetchFailed ? <><span className="dot">·</span><span className="warn-text">{coverage.fetchFailed} could not be read</span></> : null}
        <span className="dot">·</span>
        <span>{coverage.evaluated} evaluated</span>
      </div>
      <div className="coverage-bars">
        <div className="coverage-bar" title="Postings whose text is cached">
          <div className="coverage-fill text" style={{ width: `${pct(coverage.withText)}%` }} />
        </div>
        <div className="coverage-bar" title="Postings Claude has read">
          <div className="coverage-fill llm" style={{ width: `${pct(coverage.extractedLlm)}%` }} />
        </div>
      </div>
      <div className="muted small">
        CV: {cv.present
          ? cv.engine === 'llm'
            ? `${cv.skillCount} skills, read by Claude`
            : `${cv.skillCount} skills by rules${cv.stale ? ' — cv.md changed since Claude last read it' : ' — Claude has not read it yet'}`
          : 'no cv.md found'}
        {coverage.reportsWithGaps ? ` · gap notes mined from ${coverage.reportsWithGaps} report${coverage.reportsWithGaps === 1 ? '' : 's'}` : ''}
      </div>
    </div>
  );
}

export default function SkillsPage({ reloadRef, onRunStarted }) {
  const { agentReady, agentReason, list: runs } = useRuns();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('learn');
  const [category, setCategory] = useState('all');
  const [strongOnly, setStrongOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [showIgnored, setShowIgnored] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = useCallback(() => {
    fetchSkills().then((d) => { setData(d); setError(null); }).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);
  useEffect(() => {
    if (reloadRef) reloadRef.current = load;
    return () => { if (reloadRef) reloadRef.current = null; };
  }, [load, reloadRef]);

  const active = runs.filter((r) => r.kind?.startsWith('skills-') && (r.status === 'queued' || r.status === 'running'));
  const fetching = active.find((r) => r.kind === 'skills-fetch' || r.kind === 'skills-fetch-auto') ?? null;
  const extracting = active.filter((r) => r.kind === 'skills-extract' || r.kind === 'skills-cv');

  const act = useCallback(async (action) => {
    setBusy(true);
    setNotice(null);
    try {
      await action();
    } catch (failure) {
      setNotice({ level: 'warn', text: failure.message });
    } finally {
      setBusy(false);
    }
  }, []);

  const onFetch = (retryFailed) => act(async () => {
    const run = await startSkillsFetch(retryFailed ? { retryFailed: true } : {});
    onRunStarted?.(run);
  });

  const onExtract = () => act(async () => {
    const result = await startSkillsExtract();
    const n = result.runs.length + (result.cv ? 1 : 0);
    if (n === 0) setNotice({ level: 'info', text: 'Nothing left for Claude to read — every posting with text is already extracted.' });
    else {
      setNotice({
        level: 'info',
        text: `Queued ${n} Claude session${n === 1 ? '' : 's'}${result.remaining ? ` — ${result.remaining} postings will still be pending afterwards; click again when these finish` : ''}.`,
      });
      onRunStarted?.(result.runs[0] ?? result.cv);
    }
  });

  const onStatus = (id, status) => act(async () => {
    await setSkillOverride(id, status);
    load();
  });

  const jump = (id) => {
    setTab('demanded');
    setQuery('');
    setCategory('all');
    setExpanded(id);
    setTimeout(() => document.getElementById(`skill-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50);
  };

  const view = useMemo(() => {
    if (!data) return { rows: [], maxWeight: 0, categories: [] };
    const byId = Object.fromEntries(data.skills.map((s) => [s.id, s]));
    const categories = [...new Set(data.skills.map((s) => s.category))].sort();
    const needle = query.trim().toLowerCase();
    let rows = data.lists[tab].map((id) => byId[id]).filter(Boolean);
    if (showIgnored && tab === 'demanded') rows = [...rows, ...data.skills.filter((s) => s.status === 'ignore')];
    rows = rows
      .filter((s) => category === 'all' || s.category === category)
      .filter((s) => !needle || s.name.toLowerCase().includes(needle))
      .filter((s) => !strongOnly || s.strong > 0);
    if (strongOnly) rows = [...rows].sort((a, b) => b.strong - a.strong || b.weighted - a.weighted);
    const maxWeight = Math.max(0, ...rows.map((s) => s.weighted));
    return { rows, maxWeight, categories };
  }, [data, tab, category, query, strongOnly, showIgnored]);

  if (error && !data) return <div className="notice warn">{error}</div>;
  if (!data) return <p className="empty">Loading…</p>;

  const { coverage, cv } = data;
  const pendingText = coverage.pendingLlm
    ? `Read ${coverage.pendingLlm} posting${coverage.pendingLlm === 1 ? '' : 's'} with Claude (${coverage.sessionsNeeded} session${coverage.sessionsNeeded === 1 ? '' : 's'})`
    : cv.present && cv.engine !== 'llm'
      ? 'Read the CV with Claude'
      : 'Everything read by Claude';
  const extractDisabled = busy || !agentReady || extracting.length > 0 || (!coverage.pendingLlm && (!cv.present || cv.engine === 'llm'));

  return (
    <div className="skills">
      {notice ? <div className={`notice ${notice.level === 'warn' ? 'warn' : ''}`}>{notice.text}</div> : null}

      <section className="skills-head">
        <Coverage coverage={coverage} cv={cv} />
        <div className="toolbar">
          <button className="chip primary" disabled={busy || fetching !== null} onClick={() => onFetch(false)} title="Read the text of every scanned posting not yet cached. Network only, no Claude.">
            {fetching ? `Fetching… ${fetching.progress?.total ? `${fetching.progress.done}/${fetching.progress.total}` : ''}` : 'Fetch posting text'}
          </button>
          {coverage.fetchFailed ? (
            <button className="chip" disabled={busy || fetching !== null} onClick={() => onFetch(true)} title="Try the postings that could not be read again now">
              Retry {coverage.fetchFailed} failed
            </button>
          ) : null}
          <button className="chip primary" disabled={extractDisabled} onClick={onExtract} title={!agentReady ? agentReason : 'Each session reads up to ten postings and records category and required vs nice-to-have. Cached; a posting is never sent twice.'}>
            {extracting.length ? `Claude is reading… (${extracting.length} session${extracting.length === 1 ? '' : 's'})` : pendingText}
          </button>
          {!agentReady ? <span className="muted small">{agentReason}</span> : null}
          <span className="spacer" />
          {active.length ? <a href={`#/runs/${active[0].id}`}>Open the run log</a> : null}
        </div>
        <details className="help compact">
          <summary>How this page works</summary>
          <dl>
            <div>
              <dt>Fetch posting text</dt>
              <dd>The scanner only records that a posting exists. This reads each one once — through the board’s public API for Greenhouse, Lever, Ashby, Workday and LinkedIn postings, otherwise through a headless browser — and caches the text. It also runs on its own after every scan.</dd>
            </div>
            <div>
              <dt>Rules vs Claude</dt>
              <dd>As soon as a posting has text, a rules pass finds the skills it names from a fixed vocabulary and reads required vs nice-to-have from the section they sit in. A Claude session over a batch of ten postings does the same job better and catches skills outside the vocabulary; its result is cached by the posting’s text, so nothing is sent twice.</dd>
            </div>
            <div>
              <dt>Demand and weight</dt>
              <dd>Demand is how many postings ask for a skill. The bar is weighted: an evaluated posting counts by its score (4.5+ double, under 3.0 half), a nice-to-have mention counts half. “Strong” is the count among postings scored 4.0 or higher; “gaps” is how many evaluation reports flagged the skill as a gap.</dd>
            </div>
            <div>
              <dt>Have / Partial / Missing</dt>
              <dd>From your CV: named in a skills section or read by Claude as solid or expert means Have; mentioned in passing means Partial; absent means Missing. Change any of them here — your choice wins and is remembered. Ignore hides a skill that is noise.</dd>
            </div>
          </dl>
        </details>
      </section>

      {coverage.postings === 0 ? (
        <p className="empty">Nothing to analyse yet — scan your sources first, or paste a few job URLs on the Pipeline page.</p>
      ) : coverage.withText === 0 ? (
        <p className="empty">
          {coverage.postings} postings are known but none has its text yet. Click <strong>Fetch posting text</strong> to read them
          {fetching ? ' — a fetch is running now.' : '.'}
        </p>
      ) : (
        <>
          <div className="toolbar tabs-row">
            {TABS.map((t) => (
              <button key={t.id} className="chip" aria-pressed={tab === t.id} onClick={() => { setTab(t.id); setExpanded(null); }} title={t.hint}>
                {t.label}<span className="n">{data.lists[t.id].length}</span>
              </button>
            ))}
            <span className="spacer" />
            <label className="inline" title="Only skills asked for by postings you scored 4.0 or higher; sorted by that count">
              <input type="checkbox" checked={strongOnly} onChange={(e) => setStrongOnly(e.target.checked)} />
              Jobs I’d apply to
            </label>
            {tab === 'demanded' ? (
              <label className="inline">
                <input type="checkbox" checked={showIgnored} onChange={(e) => setShowIgnored(e.target.checked)} />
                Show ignored
              </label>
            ) : null}
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
              <option value="all">Any category</option>
              {view.categories.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c] ?? c}</option>)}
            </select>
            <input type="search" placeholder="Find a skill…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>

          <p className="muted small tab-hint">
            {tab === 'learn' && 'Skills at least two postings ask for that your CV does not show, ranked by weighted demand — the answer to “what should I learn next?”.'}
            {tab === 'deepen' && 'Skills your CV only touches on, ranked by weighted demand — worth a project or a line with real evidence.'}
            {tab === 'demanded' && 'Every skill found, by how many postings ask for it. Colour is your status: green have, amber partial, red missing.'}
          </p>

          {view.rows.length === 0 ? (
            <p className="empty">
              {tab === 'learn' && data.lists.learn.length === 0
                ? 'No missing skill is asked for by two or more postings yet. Fetch more postings, or check the Most demanded tab.'
                : 'Nothing matches these filters.'}
            </p>
          ) : (
            <div className="table-wrap">
              <table className="skills-table">
                <thead>
                  <tr>
                    <th>Skill</th>
                    <th>Weighted demand</th>
                    <th className="num" title="Postings asking (required / nice to have)">Postings</th>
                    <th className="num" title="Among postings scored 4.0 or higher">Strong</th>
                    <th className="num" title="Evaluation reports that flagged it as a gap">Gaps</th>
                    <th title="Postings per month, last six months">Trend</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {view.rows.map((skill) => (
                    <SkillRow
                      key={skill.id}
                      skill={skill}
                      maxWeight={view.maxWeight}
                      months={data.months}
                      postings={data.postings}
                      expanded={expanded === skill.id}
                      onToggle={() => setExpanded(expanded === skill.id ? null : skill.id)}
                      onStatus={onStatus}
                      onJump={jump}
                      busy={busy}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
