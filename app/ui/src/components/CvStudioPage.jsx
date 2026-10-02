import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  cvPreviewUrl,
  cvThumbUrl,
  fetchCvDocuments,
  fetchCvStyle,
  fetchCvThemes,
  fetchVoice,
  fetchWritingSamples,
  renderAllCvs,
  renderCvPreview,
  saveCvStyle,
  saveVoice,
} from '../api.js';
import { useRun } from '../useRun.js';
import AtsVerdict from './AtsVerdict.jsx';
import RunPanel from './RunPanel.jsx';

/**
 * CV Studio (PROJECT_PLAN.md §7): how every CV the console renders looks
 * (themes and style tokens), how it reads (voice rules), and whether an ATS
 * can still read it (the guardrail).
 *
 * The preview is the M5 core: a CV is kept as structured data (the payload
 * next to it in output/), so changing a token re-renders it deterministically
 * on the server in well under a second — no agent, no tokens. Every preview
 * is a real PDF from the same pipeline a final render uses, and every one is
 * checked against the ATS guardrail.
 */

const FONT_PAIRS = [
  'DM Sans, Arial, sans-serif',
  'Space Grotesk, sans-serif',
  '"Liberation Sans", Arial, sans-serif',
  'Georgia, "Times New Roman", serif',
  'Calibri, Carlito, sans-serif',
  'Helvetica, Arial, sans-serif',
];

const PREVIEW_DEBOUNCE_MS = 300;

/**
 * A single named section states no order, and the server refuses it — but it
 * is exactly where the user is after picking their first one. Until a second
 * is added, previews (and the gallery) render as if no order were set.
 */
const pendingOrder = (style) => (style?.sections?.length === 1 ? { ...style, sections: [] } : style);

/** A refusal's own words: the per-field details, not just "Some style values are not valid". */
function failureText(failure) {
  const details = Array.isArray(failure.detail) ? failure.detail.map((d) => (d.key ? `${d.key}: ${d.message}` : d.message)) : [];
  return details.length ? `${failure.message} — ${details.join('; ')}` : failure.message;
}

function Field({ label, hint, children }) {
  return (
    <label>
      <span className="field-label">{label}</span>
      {children}
      {hint ? <small className="hint">{hint}</small> : null}
    </label>
  );
}

/** Up/down ordering of the named sections; the unnamed keep the template's place. */
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
    <div className="section-order">
      <ol>
        {chosen.map((key, i) => (
          <li key={key}>
            <span>{key}</span>
            <button type="button" className="chip" onClick={() => move(i, -1)} disabled={i === 0} title="Move up">↑</button>
            <button type="button" className="chip" onClick={() => move(i, 1)} disabled={i === chosen.length - 1} title="Move down">↓</button>
            <button type="button" className="chip" onClick={() => onChange(chosen.filter((k) => k !== key))} title="Leave where the template puts it">×</button>
          </li>
        ))}
      </ol>
      {rest.length ? (
        <select value="" onChange={(e) => e.target.value && onChange([...chosen, e.target.value])}>
          <option value="">Add a section to order…</option>
          {rest.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      ) : null}
    </div>
  );
}

/** The gallery: every theme, rendered with this CV and these tokens, with its ATS badge. */
function ThemeGallery({ themes, loading, error, current, onPick, onRefresh }) {
  return (
    <section className="theme-gallery">
      <div className="gallery-head">
        <h3>Themes</h3>
        <button type="button" className="chip" onClick={onRefresh} disabled={loading} title="Render every theme again with the tokens in the form">
          {loading ? 'Rendering…' : 'Refresh with these tokens'}
        </button>
      </div>
      {error ? <div className="notice warn">{error}</div> : null}
      {!themes && loading ? <p className="muted">Rendering every theme with this CV — a few seconds the first time.</p> : null}
      <div className="gallery-grid">
        {(themes ?? []).map((t) => (
          <button
            key={t.name}
            type="button"
            className={`theme-card${t.name === current ? ' selected' : ''}`}
            onClick={() => onPick(t.name)}
            aria-pressed={t.name === current}
            title={t.error ?? `${t.displayName} (${t.source})`}
          >
            {t.thumb ? <img src={cvThumbUrl(t.thumb)} alt="" loading="lazy" /> : <div className="thumb-missing">{t.error ? 'Did not render' : '…'}</div>}
            <span className="theme-name">
              {t.displayName}
              {t.source === 'custom' ? <span className="badge">yours</span> : null}
            </span>
            {t.error ? <span className="muted small theme-error">{t.error.replace(/^build-cv-html\.mjs failed: /, 'Cannot be filled from a CV payload: ')}</span> : null}
            {t.ats ? (
              <span className={`ats-badge ats-${t.ats.verdict}`}>
                {t.ats.verdict === 'fail' ? `ATS fail · ${t.ats.critical} critical` : t.ats.verdict === 'warn' ? `ATS ok · ${t.ats.warnings} warning${t.ats.warnings === 1 ? '' : 's'}` : 'ATS pass'}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}

export default function CvStudioPage() {
  const [style, setStyle] = useState(null);
  const [form, setForm] = useState(null);
  const [docs, setDocs] = useState(null);
  const [documentId, setDocumentId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [rendering, setRendering] = useState(false);
  const [themes, setThemes] = useState(null);
  const [themesLoading, setThemesLoading] = useState(false);
  const [themesError, setThemesError] = useState(null);
  const [voice, setVoice] = useState(null);
  const [voiceText, setVoiceText] = useState('');
  const [samples, setSamples] = useState(null);
  const [notice, setNotice] = useState(null);
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);
  // A finished render changes the document's current PDF; the list says which.
  const render = useRun({ onFinish: () => fetchCvDocuments().then(({ documents }) => setDocs(documents)).catch(() => {}) });
  const previewSeq = useRef(0);
  const themesSeq = useRef(0);

  useEffect(() => {
    fetchCvStyle().then((s) => { setStyle(s); setForm(s.style); }).catch((e) => setNotice(e.message));
    fetchCvDocuments()
      .then(({ documents }) => {
        setDocs(documents);
        // Start on the newest real CV; the sample is there for a fresh install.
        setDocumentId((current) => current ?? (documents.find((d) => !d.sample) ?? documents[0])?.id ?? null);
      })
      .catch((e) => setNotice(e.message));
    fetchVoice().then((v) => { setVoice(v); setVoiceText(v.text); }).catch(() => {});
    fetchWritingSamples().then(setSamples).catch(() => {});
  }, []);

  const formKey = useMemo(() => JSON.stringify(form), [form]);

  // Live preview: every change to the document or the form re-renders after a
  // short pause. A slower, older response never replaces a newer one.
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
          setPreviewError(failureText(failure));
          setErrors(Array.isArray(failure.detail) ? failure.detail : []);
        })
        .finally(() => {
          if (seq === previewSeq.current) setRendering(false);
        });
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // formKey stands for form: a new object with the same values must not re-render.
  }, [documentId, formKey]);

  const loadThemes = useCallback((id, tokens) => {
    if (!id || !tokens) return;
    const seq = ++themesSeq.current;
    setThemesLoading(true);
    setThemesError(null);
    fetchCvThemes(id, pendingOrder(tokens))
      .then((result) => { if (seq === themesSeq.current) setThemes(result.themes); })
      .catch((failure) => { if (seq === themesSeq.current) setThemesError(failureText(failure)); })
      .finally(() => { if (seq === themesSeq.current) setThemesLoading(false); });
  }, []);

  // The gallery is heavier (every theme), so it follows the document and the
  // saved style, and the form only when asked.
  const savedKey = JSON.stringify(style?.style ?? null);
  useEffect(() => {
    if (documentId && style) loadThemes(documentId, style.style);
    // savedKey stands for style.style, so a save with unchanged values does not re-render every theme.
  }, [documentId, savedKey, loadThemes]);

  if (!style || !form) return <p className="empty">{notice ?? 'Loading…'}</p>;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value === '' ? null : e.target.value });
  const errorFor = (key) => errors.find((e) => e.key === key)?.message;
  const dirty = JSON.stringify(form) !== JSON.stringify(style.style);
  // One section is a half-made order: nothing to save or render until a second joins it.
  const halfOrder = form.sections?.length === 1;
  const doc = docs?.find((d) => d.id === documentId) ?? null;
  const currentTheme = themes?.find((t) => t.name === (form.template ?? 'standard'));

  const persist = async () => {
    const saved = await saveCvStyle(form);
    setStyle(saved);
    setForm(saved.style);
    return saved;
  };

  const save = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setNotice(null);
    setErrors([]);
    try {
      await persist();
      setNotice('Style saved. Every CV the console renders from now on uses it.');
    } catch (failure) {
      setErrors(Array.isArray(failure.detail) ? failure.detail : []);
      setNotice(failure.message);
    } finally {
      setBusy(false);
    }
  };

  // A final render reads the saved style, so unsaved tokens are saved first —
  // otherwise the PDF would not be the preview the user is looking at.
  const renderThis = async () => {
    setBusy(true);
    setNotice(null);
    try {
      if (dirty) await persist();
      await render.start('cv-render', { documentId, template: form.template ?? 'standard' });
    } catch (failure) {
      setNotice(failure.message);
    } finally {
      setBusy(false);
    }
  };

  const renderAll = async () => {
    const count = docs.filter((d) => d.reportId !== null).length;
    if (!window.confirm(`Re-render all ${count} CVs that belong to a report in “${form.template ?? 'standard'}”? Each gets a new PDF; the old ones stay in output/.`)) return;
    setBusy(true);
    setNotice(null);
    try {
      if (dirty) await persist();
      const { queued, skipped } = await renderAllCvs(form.template ?? 'standard');
      setNotice(`Queued ${queued.length} render${queued.length === 1 ? '' : 's'}${skipped.length ? ` (${skipped.length} already rendering)` : ''} — follow them on the Runs page.`);
    } catch (failure) {
      setNotice(failure.message);
    } finally {
      setBusy(false);
    }
  };

  const saveVoiceText = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await saveVoice(voiceText);
      setNotice('voice-dna.md saved. It applies to the next cover letter or PDF.');
      fetchVoice().then((v) => { setVoice(v); setVoiceText(v.text); });
    } catch (failure) {
      setNotice(failure.message);
    } finally {
      setBusy(false);
    }
  };

  const warnings = style.profileWarnings ?? {};

  return (
    <div className="cv-studio">
      {notice ? <div className={`notice${errors.length ? ' warn' : ''}`}>{notice}</div> : null}

      {warnings.style || warnings.cvSections || warnings.cvTemplate ? (
        <div className="notice warn">
          <strong>config/profile.yml overrides some of these settings.</strong> Upstream’s renderer applies
          profile.yml’s own values <em>after</em> the console’s, so
          {warnings.style ? <> its <code>style:</code> block wins over the tokens below;</> : null}
          {warnings.cvSections ? <> its <code>cv.sections</code> wins over the section order below;</> : null}
          {warnings.cvTemplate ? <> its <code>cv.template: {warnings.cvTemplate}</code> is what a manual session uses (the console uses the theme chosen here);</> : null}
          {' '}remove those keys from profile.yml to let CV Studio decide. The preview already shows their effect.
        </div>
      ) : null}

      <div className="studio-bar">
        <label>
          <span className="field-label">CV</span>
          <select value={documentId ?? ''} onChange={(e) => setDocumentId(e.target.value)} disabled={!docs?.length}>
            {(docs ?? []).map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </label>
        <span className="muted small">
          {doc?.sample
            ? 'A fictional CV, for trying themes before you have generated one.'
            : doc
              ? `Structured data: output/${doc.id}.json${doc.pdf ? ` · current PDF ${doc.pdf}` : ' · not rendered yet'}`
              : 'No CVs yet.'}
        </span>
      </div>

      <div className="studio-grid">
        <div className="studio-controls">
          <form className="entry-form" onSubmit={save}>
            <h3>Look — style tokens</h3>
            <p className="intro wide">
              Every change re-renders the preview on the right — no agent, no tokens spent. Leave a field empty to
              keep the theme’s own default. Saved to <code>config/cv/style.yml</code>.
            </p>

            <Field label="Accent colour" hint={errorFor('accent_color') ?? style.fields.accent_color}>
              <span className="color-row">
                <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(form.accent_color ?? '') ? form.accent_color : '#1f4e79'} onChange={set('accent_color')} />
                <input type="text" value={form.accent_color ?? ''} onChange={set('accent_color')} placeholder="theme default" />
              </span>
            </Field>
            <Field label="Body font" hint={errorFor('font_family') ?? style.fields.font_family}>
              <input type="text" list="font-pairs" value={form.font_family ?? ''} onChange={set('font_family')} placeholder="theme default" />
            </Field>
            <Field label="Heading font" hint={errorFor('heading_font_family') ?? style.fields.heading_font_family}>
              <input type="text" list="font-pairs" value={form.heading_font_family ?? ''} onChange={set('heading_font_family')} placeholder="same as body" />
            </Field>
            <datalist id="font-pairs">{FONT_PAIRS.map((f) => <option key={f} value={f} />)}</datalist>
            <Field label="Font size" hint={errorFor('font_size') ?? style.fields.font_size}>
              <input type="text" value={form.font_size ?? ''} onChange={set('font_size')} placeholder="e.g. 10.5pt" />
            </Field>
            <Field label="Page margin" hint={errorFor('margin') ?? style.fields.margin}>
              <input type="text" value={form.margin ?? ''} onChange={set('margin')} placeholder="e.g. 0.6in" />
            </Field>
            <Field label="Density" hint={errorFor('density') ?? style.fields.density}>
              <select value={form.density ?? 'normal'} onChange={set('density')}>
                {Object.entries(style.densities).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </Field>
            <div className="wide">
              <span className="field-label">Section order</span>
              <SectionOrder value={form.sections} keys={style.sectionKeys} onChange={(sections) => setForm({ ...form, sections })} />
              <small className={`hint${halfOrder ? ' pending' : ''}`}>
                {errorFor('sections') ?? (halfOrder ? 'Add at least one more section — one alone sets no order, so the preview ignores it until then.' : style.fields.sections)}
              </small>
            </div>

            <div className="entry-actions">
              <button type="submit" className="chip primary" disabled={busy || !dirty || halfOrder}>Save as default</button>
              <button type="button" className="chip" disabled={busy || !dirty} onClick={() => setForm(style.style)}>Revert</button>
              <span className="muted">{dirty ? 'Unsaved changes — the preview shows them already.' : style.exists ? 'Saved.' : 'Not saved yet — theme defaults apply.'}</span>
            </div>
          </form>

          <ThemeGallery
            themes={themes}
            loading={themesLoading}
            error={themesError}
            current={form.template ?? 'standard'}
            onPick={(name) => setForm({ ...form, template: name })}
            onRefresh={() => loadThemes(documentId, form)}
          />
          <p className="muted small">
            Your own themes: drop an HTML template into <code>config/cv/templates/</code> (see the README there) and
            refresh. Each one is checked against the ATS guardrail like upstream’s.
          </p>
        </div>

        <div className="studio-preview">
          <div className="preview-head">
            <strong>{currentTheme?.displayName ?? form.template ?? 'standard'}</strong>
            <span className="muted small">
              {rendering ? 'Rendering…' : preview ? `Rendered in ${preview.ms} ms · no agent call${preview.cached ? '' : ' · HTML rebuilt'}` : ''}
            </span>
          </div>
          {previewError ? <div className="notice warn">Preview failed: {previewError}</div> : null}
          {preview ? <AtsVerdict ats={preview.ats} custom={preview.template.source === 'custom'} /> : null}
          <div className="preview-actions">
            <button type="button" className="chip primary" disabled={busy || !doc || doc.sample || halfOrder || render.run?.status === 'running'} onClick={renderThis}
              title={doc?.sample ? 'The sample is for previews only' : 'Render this CV to a PDF in output/ with this theme and these tokens'}>
              {dirty ? 'Save & render this CV' : 'Render this CV'}
            </button>
            <button type="button" className="chip" disabled={busy || halfOrder || !docs?.some((d) => d.reportId !== null)} onClick={renderAll}
              title="Re-render every CV that belongs to a report in this theme">
              Re-render all in this theme
            </button>
          </div>
          <RunPanel run={render.run} lines={render.lines} progress={render.progress} error={render.error} onCancel={render.cancel} onDismiss={render.reset} />
          {preview ? (
            <iframe className={`pdf-frame preview-frame${rendering ? ' stale' : ''}`} src={`${cvPreviewUrl(preview.id)}#view=FitH`} title="CV preview" />
          ) : (
            <div className="pdf-frame preview-frame placeholder">{docs?.length === 0 ? 'No CV to preview.' : 'Rendering the first preview…'}</div>
          )}
        </div>
      </div>

      <section className="entry-form voice">
        <h3>Voice — writing rules</h3>
        <p className="intro wide">
          <code>voice-dna.md</code> is upstream’s writing guardrail: banned words and phrases, rhythm, what
          reads as machine-written. The console inlines it into every PDF and cover-letter session (Tier 1 for
          the CV, Tier 1 + 2 for letters), and a manual <code>claude</code> session in this directory reads the
          same file. Facts always win over style — it changes wording, never content.
        </p>
        <textarea
          className="wide voice-text"
          rows={18}
          value={voiceText}
          onChange={(e) => setVoiceText(e.target.value)}
          placeholder="No voice-dna.md yet. Seed it from upstream's template, or write your own rules."
          spellCheck={false}
        />
        <div className="entry-actions">
          <button type="button" className="chip primary" disabled={busy} onClick={saveVoiceText}>Save voice rules</button>
          {voice?.templateText ? (
            <button type="button" className="chip" disabled={busy} onClick={() => setVoiceText(voice.templateText)} title="Load upstream's voice-dna.template.md into the editor (not saved until you click Save)">
              Seed from template
            </button>
          ) : null}
          <span className="muted">{voice?.exists ? voice.path : 'voice-dna.md does not exist yet'}</span>
        </div>

        <div className="wide">
          <h4 className="muted">Writing samples</h4>
          {samples?.samples?.length ? (
            <ul className="inbox-list">
              {samples.samples.map((s) => <li key={s.name}>{s.name} <span className="muted">· {(s.size / 1024).toFixed(1)} KB · {s.modified.slice(0, 10)}</span></li>)}
            </ul>
          ) : (
            <p className="muted">
              None yet. Drop past cover letters, a LinkedIn “About”, any professional writing of yours into{' '}
              <code>{samples?.path ?? 'writing-samples/'}</code> — the modes calibrate tone against them, and your own
              writing is the strongest signal against machine-sounding output.
            </p>
          )}
        </div>
      </section>

      <details className="help">
        <summary>Content, look, voice and the ATS check — what each changes</summary>
        <dl>
          <div>
            <dt>Content (structured data)</dt>
            <dd>
              A PDF run’s Claude session tailors your CV to the job and writes it as data —{' '}
              <code>output/cv-…json</code>, upstream’s <code>build-cv-html.mjs</code> payload — and stops. Facts come
              only from <code>cv.md</code>, <code>article-digest.md</code> and <code>config/profile.yml</code>; the
              fact gate (<code>verify-cv-facts.mjs</code>) runs before every render.
            </dd>
          </div>
          <div>
            <dt>Look (theme + tokens, this page)</dt>
            <dd>
              The console renders that data itself: theme, then tokens, then upstream’s renderer. Because it is
              deterministic, the preview costs nothing, and any past CV can be re-rendered in a new theme.
            </dd>
          </div>
          <div>
            <dt>Voice (this page, bottom)</dt>
            <dd>How the text reads. Upstream’s <code>voice-dna.md</code>, applied by the pdf, cover and email modes in any session.</dd>
          </div>
          <div>
            <dt>ATS check</dt>
            <dd>
              Every preview and every render is read back the way an applicant-tracking system reads it: the text is
              extracted from the PDF and checked for your name and email, every section heading in order, and your
              keywords — plus upstream’s structural audit (tables, columns, hidden text, images). A theme that fails it
              gets a red warning here and in the render log.
            </dd>
          </div>
        </dl>
      </details>
    </div>
  );
}
