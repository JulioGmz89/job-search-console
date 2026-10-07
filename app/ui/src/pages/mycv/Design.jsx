import { useEffect, useMemo, useRef, useState } from 'react';

import { cvPreviewUrl, cvThumbUrl, fetchCvThemes, releaseProfileDesign, renderAllCvs, renderCvPreview, restoreProfileDesign, saveCvStyle } from '../../api.js';
import { useLeaveGuard } from '../../components/LeaveGuard.jsx';
import { RunItem } from '../../components/RunItem.jsx';
import { ConfirmDialog, HelpLink } from '../../components/ui.jsx';
import { reload, setResource, useResource } from '../../data.js';
import { designName } from '../../lib/designs.js';
import { jobName, plural, shortDate } from '../../lib/labels.js';
import { runState, runTitle } from '../../lib/runs.js';
import { useRuns } from '../../runs.jsx';
import { announce } from '../../shell/announce.jsx';
import { offerUndo } from '../../shell/undo.jsx';

const DEBOUNCE_MS = 300;

/** A screening verdict in words (ia.md §2.7). */
function verdictWords(ats) {
  if (!ats) return 'Not checked';
  if (ats.verdict === 'fail') return 'Screening problems';
  if (ats.verdict === 'warn') return `Readable, ${plural(ats.warnings ?? ats.issues?.filter((i) => i.severity === 'warning').length ?? 1, 'small issue')}`;
  return 'Readable by screening systems';
}
const verdictTone = (ats) => (ats?.verdict === 'fail' ? 'fail' : ats?.verdict === 'warn' ? 'warn' : ats ? 'ok' : 'neutral');

/** A single section named states no order; preview as if none were set until a second joins it. */
const pendingOrder = (style) => (style?.sections?.length === 1 ? { ...style, sections: [] } : style);

function SectionOrder({ value, keys, onChange }) {
  const chosen = value ?? [];
  const rest = keys.filter((k) => !chosen.includes(k));
  const move = (i, delta) => {
    const next = [...chosen];
    const j = i + delta;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="stack-sm">
      <span className="label">Section order</span>
      {chosen.length ? (
        <ol className="stack-sm">
          {chosen.map((key, i) => (
            <li key={key} className="row">
              <span className="grow">{key}</span>
              <button type="button" className="btn2 btn-sm" onClick={() => move(i, -1)} disabled={i === 0}>
                Up<span className="visually-hidden"> {key}</span>
              </button>
              <button type="button" className="btn2 btn-sm" onClick={() => move(i, 1)} disabled={i === chosen.length - 1}>
                Down<span className="visually-hidden"> {key}</span>
              </button>
              <button type="button" className="btn2 btn-sm" onClick={() => onChange(chosen.filter((k) => k !== key))}>
                Remove<span className="visually-hidden"> {key} from the order</span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="small muted">The design’s own order.</p>
      )}
      {rest.length ? (
        <div className="field narrow">
          <label htmlFor="add-section">Add a section to the order</label>
          <select id="add-section" value="" onChange={(e) => e.target.value && onChange([...chosen, e.target.value])}>
            <option value="">Choose…</option>
            {rest.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}

/**
 * My CV › Design (ia.md §2.7; the old CV Studio "look"): choose a design with
 * its screening verdict in view, fine-tune it with a live preview (no AI),
 * make it the design for every CV, and update existing CVs (T7, F-007, F-019).
 */
export function DesignSection() {
  const style = useResource('style');
  const documents = useResource('documents');
  const templates = useResource('templates');
  const pipeline = useResource('pipeline');
  const { list, start } = useRuns();
  const [form, setForm] = useState(null);
  const [documentId, setDocumentId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [rendering, setRendering] = useState(false);
  const [themes, setThemes] = useState(null);
  const [themesError, setThemesError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [errors, setErrors] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [batch, setBatch] = useState(null);
  const previewSeq = useRef(0);
  const noticeRef = useRef(null);

  const docs = useMemo(() => documents.data?.documents ?? [], [documents.data]);
  const rows = pipeline.data?.rows ?? [];
  useEffect(() => {
    if (style.data && form === null) setForm(style.data.style);
  }, [style.data, form]);
  useEffect(() => {
    if (!documentId && docs.length) setDocumentId((docs.find((d) => !d.sample) ?? docs[0]).id);
  }, [docs, documentId]);
  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

  const formKey = JSON.stringify(form);
  // Live preview: a change re-renders after a short pause; an older answer never replaces a newer one.
  useEffect(() => {
    if (!documentId || !form) return undefined;
    const seq = ++previewSeq.current;
    setRendering(true);
    const timer = setTimeout(() => {
      renderCvPreview(documentId, pendingOrder(form))
        .then((result) => {
          if (seq !== previewSeq.current) return;
          setPreview(result);
          setPreviewError(null);
          setErrors([]);
        })
        .catch((failure) => {
          if (seq !== previewSeq.current) return;
          setPreviewError(failure.message);
          setErrors(Array.isArray(failure.detail) ? failure.detail : []);
        })
        .finally(() => seq === previewSeq.current && setRendering(false));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // formKey stands for form: an equal copy must not re-render.
  }, [documentId, formKey]);

  // The gallery follows the document and the saved style.
  const savedKey = JSON.stringify(style.data?.style ?? null);
  useEffect(() => {
    if (!documentId || !style.data) return undefined;
    let live = true;
    setThemesError(null);
    fetchCvThemes(documentId, pendingOrder(style.data.style))
      .then((result) => live && setThemes(result.themes))
      .catch((e) => live && setThemesError(e.message));
    return () => {
      live = false;
    };
  }, [documentId, savedKey]);

  const dirty = form && style.data && JSON.stringify(form) !== JSON.stringify(style.data.style);

  // Unsaved changes warn before leaving (ia.md §2.7).
  const leaveDialog = useLeaveGuard(Boolean(dirty), { what: 'your design', onDiscard: () => setForm(style.data.style) });

  if (!style.data || !form) return <p className="muted">Loading…</p>;

  const set = (key, value) => setForm({ ...form, [key]: value === '' ? null : value });
  const errorFor = (key) => errors.find((e) => e.key === key)?.message;
  const chosen = form.template ?? 'standard';
  const saved = style.data.style.template ?? 'standard';
  const chosenTheme = themes?.find((t) => t.name === chosen) ?? null;
  const chosenName = chosenTheme?.displayName ?? designName(chosen, templates.data?.templates);
  // The live preview is the chosen design with the fine-tuning applied; the gallery is the fallback.
  const chosenAts = preview?.ats ?? chosenTheme?.ats ?? null;
  const reportDocs = docs.filter((d) => d.reportId !== null);
  const doc = docs.find((d) => d.id === documentId) ?? null;
  const docLabel = (d) => {
    if (d.sample) return 'Sample CV (fictional)';
    const row = rows.find((r) => r.reportId === d.reportId);
    return row ? `${jobName(row)}, ${shortDate(d.modified)}` : `A CV made ${shortDate(d.modified)}`;
  };
  const passing = (themes ?? []).filter((t) => t.ats?.verdict !== 'fail' && !t.error);
  const relaying = list.filter((r) => r.kind === 'cv-render' && ['waiting', 'working'].includes(runState(r)));
  const lastRelay = list.find((r) => r.kind === 'cv-render' && r.meta?.documentId === documentId);

  const persist = async () => {
    const result = await saveCvStyle(pendingOrder(form));
    setResource('style', { ...style.data, ...result });
    setForm(result.style);
    reload('design');
    return result;
  };

  const makeDefault = async () => {
    setConfirm(null);
    try {
      await persist();
      const name = themes?.find((t) => t.name === chosen)?.displayName ?? chosen;
      setNotice(`${name} is now your design for every new CV. CVs you already have keep their old layout until you update them: Update existing CVs, or Lay out this CV again beside the preview.`);
      announce(`${name} is now your design for every new CV.`);
    } catch (e) {
      setErrors(Array.isArray(e.detail) ? e.detail : []);
      setNotice(null);
      setPreviewError(e.message);
    }
  };

  const updateAll = async () => {
    setConfirm(null);
    try {
      if (dirty) await persist();
      const result = await renderAllCvs(chosen);
      setBatch(result);
      announce(`Updating ${plural(result.queued.length, 'CV')} to the ${chosenName} design. A few seconds each; no AI.`);
    } catch (e) {
      setPreviewError(e.message);
    }
  };

  const updateThis = async () => {
    try {
      if (dirty) await persist();
      const run = await start('cv-render', { documentId, template: chosen });
      announce(`Started: ${runTitle(run)}`);
      setTimeout(() => document.querySelector('.design-preview .act-title a')?.focus(), 0);
    } catch (e) {
      setPreviewError(e.message);
    }
  };

  // UI-cv-profile-warning: the Profile form can't edit these, so the page offers to take them over.
  const handOver = async () => {
    try {
      const result = await releaseProfileDesign();
      setResource('style', result.style);
      announce(`This page now decides the ${result.removed.join(' and ')}.`);
      offerUndo(`Removed your profile’s ${result.removed.join(' and ')}`, async () => {
        const back = await restoreProfileDesign();
        setResource('style', back.style);
      }, { focus: true });
    } catch (e) {
      announce(`Not changed: ${e.message}`, { assertive: true });
    }
  };
  const warnings = style.data.profileWarnings ?? {};
  const failCritical = chosenAts?.issues?.filter((i) => i.severity === 'critical') ?? [];

  return (
    <div className="stack">
      {warnings.style || warnings.cvSections ? (
        <div className="notice warn stack-sm">
          <p>
            Your profile (config/profile.yml) has its own {warnings.style ? 'style' : ''}
            {warnings.style && warnings.cvSections ? ' and ' : ''}
            {warnings.cvSections ? 'section order' : ''}, which wins over the settings here; the preview already shows their effect.
          </p>
          <div className="row">
            <button type="button" className="btn2 btn-sm" onClick={handOver}>
              Let this page decide
            </button>
            <span className="hint inline">Removes only those settings from profile.yml; everything else in it stays. You can undo it.</span>
          </div>
        </div>
      ) : null}

      <div className="design-layout">
        <div className="stack">
          <div className="field">
            <label htmlFor="design-doc">Preview with</label>
            <select id="design-doc" value={documentId ?? ''} onChange={(e) => setDocumentId(e.target.value)} disabled={!docs.length}>
              {docs.map((d) => (
                <option key={d.id} value={d.id}>
                  {docLabel(d)}
                </option>
              ))}
            </select>
          </div>

          <details className="card">
            <summary>Fine-tune {chosenName}: colour, fonts, size, spacing, section order</summary>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="ft-accent">Accent colour</label>
                <div className="row">
                  <input
                    type="color"
                    aria-label="Pick the accent colour"
                    value={/^#[0-9a-fA-F]{6}$/.test(form.accent_color ?? '') ? form.accent_color : '#1f4e79'}
                    onChange={(e) => set('accent_color', e.target.value)}
                  />
                  <input id="ft-accent" type="text" className="grow" value={form.accent_color ?? ''} placeholder="The design’s own" onChange={(e) => set('accent_color', e.target.value)} />
                </div>
                {errorFor('accent_color') ? <p className="error">{errorFor('accent_color')}</p> : null}
              </div>
              {[
                ['font_family', 'Body font', 'The design’s own'],
                ['heading_font_family', 'Heading font', 'Same as the body'],
                ['font_size', 'Text size', 'e.g. 10.5pt'],
                ['margin', 'Page margin', 'e.g. 0.6in'],
              ].map(([key, label, placeholder]) => (
                <div className="field" key={key}>
                  <label htmlFor={`ft-${key}`}>{label}</label>
                  <input id={`ft-${key}`} type="text" value={form[key] ?? ''} placeholder={placeholder} onChange={(e) => set(key, e.target.value)} aria-invalid={errorFor(key) ? true : undefined} />
                  {errorFor(key) ? <p className="error">{errorFor(key)}</p> : null}
                </div>
              ))}
              <div className="field">
                <label htmlFor="ft-density">Spacing</label>
                <select id="ft-density" value={form.density ?? 'normal'} onChange={(e) => set('density', e.target.value)}>
                  {Object.entries(style.data.densities ?? {}).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <SectionOrder value={form.sections} keys={style.data.sectionKeys ?? []} onChange={(sections) => set('sections', sections)} />
          </details>

          <section aria-labelledby="designs-h" className="stack-sm">
            <h2 id="designs-h" className="card-title">
              Designs
            </h2>
            <p className="small muted">
              Each design is shown with your CV and checked the way applicant-tracking systems read it. <HelpLink topic="screening">What the screening check is</HelpLink> · <HelpLink topic="own-design">Make your own design</HelpLink>
            </p>
            {themesError ? <p className="notice warn">{themesError}</p> : null}
            {!themes && !themesError ? <p className="muted">Showing every design with your CV — a few seconds the first time…</p> : null}
            <div className="designs" role="group" aria-label="Designs">
              {(themes ?? []).map((t) => (
                <button key={t.name} type="button" className="design" aria-pressed={t.name === chosen} onClick={() => set('template', t.name)}>
                  {t.thumb ? <img className="thumb-img" src={cvThumbUrl(t.thumb)} alt="" loading="lazy" /> : <span className="thumb" aria-hidden="true" />}
                  <b>
                    {t.displayName}
                    {t.name === saved ? ' · your design' : ''}
                  </b>
                  {t.source === 'custom' ? <span className="badge neutral">Yours</span> : null}
                  {t.error ? <span className={`badge fail`}>Can’t be used with your CV</span> : <span className={`badge ${verdictTone(t.ats)}`}>{verdictWords(t.ats)}</span>}
                </button>
              ))}
            </div>
          </section>


        </div>

        <section className="stack-sm design-preview" aria-labelledby="preview-h" data-run-home>
          <div className="row between">
            <h2 id="preview-h" className="card-title">
              Preview
            </h2>
            <span className="small muted" role="status">
              {rendering ? 'Updating…' : preview ? `Up to date · ${plural(preview.pages ?? 1, 'page')}` : ''}
            </span>
          </div>
          {chosenAts ? (
            <div className={`notice ${chosenAts.verdict === 'fail' ? 'attn' : chosenAts.verdict === 'warn' ? 'warn' : 'ok'}`}>
              <b>{verdictWords(chosenAts)}.</b>{' '}
              {chosenAts.verdict === 'fail' ? (
                <>
                  An applicant-tracking system reading this CV loses part of it{failCritical.length ? `: ${failCritical.slice(0, 2).map((i) => i.message).join(' ')}` : '.'}{' '}
                  {passing.length ? (
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => {
                        set('template', passing[0].name);
                        // The choice moved to another card; focus follows it.
                        setTimeout(() => document.querySelector('.designs [aria-pressed="true"]')?.focus(), 0);
                      }}
                    >
                      Show a design that passes
                    </button>
                  ) : null}
                </>
              ) : (
                'Your name, headings and keywords come out in order.'
              )}
              {chosenAts.issues?.length ? (
                <details>
                  <summary>Details</summary>
                  <ul className="small">
                    {chosenAts.issues.map((i, n) => (
                      <li key={n}>
                        {i.severity}: {i.message}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          ) : null}
          {/* The actions sit above the 60vh preview, in view with the verdict (UI-cv-save). */}
          <div className="stack-sm">
            <div className="row">
              <button type="button" className="btn" disabled={!dirty} onClick={() => (chosenAts?.verdict === 'fail' ? setConfirm('fail') : makeDefault())}>
                Make this my design for every CV
              </button>
              {dirty ? (
                <button
                  type="button"
                  className="btn2"
                  onClick={() => {
                    setForm(style.data.style);
                    announce('Changes discarded: the preview shows your saved design.');
                  }}
                >
                  Discard changes
                </button>
              ) : null}
              {reportDocs.length ? (
                <button type="button" className="btn2" disabled={relaying.length > 0} onClick={() => setConfirm('all')}>
                  Update existing CVs to this design ({reportDocs.length})
                </button>
              ) : null}
            </div>
            {dirty ? <p className="small muted">Unsaved changes: the preview shows them; your CVs don’t use them until you make this your design.</p> : null}
            {notice ? (
              <p className="notice ok" tabIndex={-1} ref={noticeRef}>
                {notice}
              </p>
            ) : null}
            {batch ? (
              <p className="notice info" role="status">
                Updating {plural(batch.queued.length, 'CV')} to {chosenName}
                {batch.skipped.length ? ` (${batch.skipped.length} already updating)` : ''}. Each takes a few seconds; follow them in Activity.
              </p>
            ) : null}
          </div>
          {previewError ? <p className="notice attn">{previewError}</p> : null}
          {preview ? <iframe className="doc" tabIndex={-1} src={cvPreviewUrl(preview.id)} title={`Preview of ${doc ? docLabel(doc) : 'your CV'} in the ${chosenName} design`} /> : <div className="preview-empty muted">{rendering ? 'Drawing your CV…' : 'No CV to preview yet.'}</div>}
          {doc && !doc.sample ? (
            <div className="stack-sm" id="relayout" data-run-home>
              {lastRelay && ['waiting', 'working', 'failed'].includes(runState(lastRelay)) ? <RunItem run={lastRelay} headingLevel={3} /> : null}
              <div className="row">
                <button type="button" className="btn2 btn-sm" onClick={updateThis} disabled={relaying.some((r) => r.meta?.documentId === documentId)}>
                  Lay out this CV again in {chosenName}
                </button>
                <span className="hint inline">A few seconds · no AI · wording unchanged</span>
              </div>
              {lastRelay && runState(lastRelay) === 'done' ? (
                <p className="small" tabIndex={-1} data-run-focus>
                  Laid out again {shortDate(lastRelay.endedAt)} in {designName(lastRelay.result?.template ?? chosen, templates.data?.templates)}: {verdictWords(lastRelay.result?.ats)}.
                  {doc.reportId ? (
                    <>
                      {' '}
                      <a href={`#/applications/report/${doc.reportId}#documents`}>Open the job’s documents</a>
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      <ConfirmDialog
        isOpen={confirm === 'fail'}
        title={`Use ${chosenName} even though it fails screening?`}
        confirmLabel="Use it anyway"
        danger
        onConfirm={makeDefault}
        onCancel={() => setConfirm(null)}
      >
        <p>Tailored CVs made with this design lose part of their text when an applicant-tracking system reads them{failCritical.length ? `: ${failCritical[0].message}` : ''}.</p>
        {passing.length ? <p>Designs that pass: {passing.map((t) => t.displayName).join(', ')}.</p> : null}
      </ConfirmDialog>
      <ConfirmDialog
        isOpen={confirm === 'all'}
        title={`Update ${plural(reportDocs.length, 'CV')} to the ${chosenName} design?`}
        confirmLabel={`Update ${plural(reportDocs.length, 'CV')}`}
        focusConfirm={false}
        onConfirm={updateAll}
        onCancel={() => setConfirm(null)}
      >
        <p>This lays out {plural(reportDocs.length, 'PDF')} again in {chosenName}; the wording does not change and no AI is used. A few seconds each.</p>
        {chosenAts?.verdict === 'fail' ? <p className="notice attn">This design fails the screening check. The updated PDFs would lose part of their text for applicant-tracking systems.</p> : null}
        {dirty ? <p>Your unsaved changes are saved first, so this becomes your design for every CV.</p> : null}
      </ConfirmDialog>
      {leaveDialog}
    </div>
  );
}
