import { useCallback, useEffect, useState } from 'react';

import { fetchCvStyle, fetchCvTemplates, fetchVoice, fetchWritingSamples, saveCvStyle, saveVoice } from '../api.js';

/**
 * CV Studio, phase A (PROJECT_PLAN.md §7a, §7b): the style tokens that shape
 * every PDF the console renders, and the voice rules that shape every letter.
 *
 * Nothing here renders a preview — that is M5's deterministic renderer. Both
 * layers take effect on the next PDF or cover letter generated from the
 * console (and voice-dna.md on any manual session in this directory too).
 */

const FONT_PAIRS = [
  'DM Sans, Arial, sans-serif',
  'Space Grotesk, sans-serif',
  '"Liberation Sans", Arial, sans-serif',
  'Georgia, "Times New Roman", serif',
  'Calibri, Carlito, sans-serif',
  'Helvetica, Arial, sans-serif',
];

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

export default function CvStudioPage() {
  const [style, setStyle] = useState(null);
  const [form, setForm] = useState(null);
  const [templates, setTemplates] = useState(null);
  const [voice, setVoice] = useState(null);
  const [voiceText, setVoiceText] = useState('');
  const [samples, setSamples] = useState(null);
  const [notice, setNotice] = useState(null);
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetchCvStyle().then((s) => { setStyle(s); setForm(s.style); }).catch((e) => setNotice(e.message));
    fetchCvTemplates().then(setTemplates).catch(() => setTemplates({ templates: [] }));
    fetchVoice().then((v) => { setVoice(v); setVoiceText(v.text); }).catch(() => {});
    fetchWritingSamples().then(setSamples).catch(() => {});
  }, []);
  useEffect(load, [load]);

  if (!style || !form) return <p className="empty">{notice ?? 'Loading…'}</p>;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value === '' ? null : e.target.value });
  const errorFor = (key) => errors.find((e) => e.key === key)?.message;

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    setErrors([]);
    try {
      const saved = await saveCvStyle(form);
      setStyle(saved);
      setForm(saved.style);
      setNotice('Style saved. It applies to the next PDF generated from the console.');
    } catch (failure) {
      setErrors(Array.isArray(failure.detail) ? failure.detail : []);
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
  const upstream = (templates?.templates ?? []).filter((t) => t.source === 'upstream');
  const custom = (templates?.templates ?? []).filter((t) => t.source === 'custom');

  return (
    <div className="cv-studio">
      {notice ? <div className={`notice${errors.length ? ' warn' : ''}`}>{notice}</div> : null}

      {warnings.style || warnings.cvSections || warnings.cvTemplate ? (
        <div className="notice warn">
          <strong>config/profile.yml overrides some of these settings.</strong> Upstream’s renderer applies
          profile.yml’s own values <em>after</em> the console’s, so
          {warnings.style ? <> its <code>style:</code> block wins over the tokens below;</> : null}
          {warnings.cvSections ? <> its <code>cv.sections</code> wins over the section order below;</> : null}
          {warnings.cvTemplate ? <> its <code>cv.template: {warnings.cvTemplate}</code> is what a manual session uses (the console uses the template chosen here);</> : null}
          {' '}remove those keys from profile.yml to let CV Studio decide.
        </div>
      ) : null}

      <form className="entry-form" onSubmit={save}>
        <h3>Look — style tokens</h3>
        <p className="intro wide">
          These land on upstream’s CV templates as CSS variables when a PDF is generated from the console
          (<code>config/cv/style.yml</code>). Leave a field empty to keep the template’s own default. Every
          template stays ATS-parseable: real text, standard headings, no images of text.
        </p>

        <Field label="Accent colour" hint={errorFor('accent_color') ?? style.fields.accent_color}>
          <span className="color-row">
            <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(form.accent_color ?? '') ? form.accent_color : '#1f4e79'} onChange={set('accent_color')} />
            <input type="text" value={form.accent_color ?? ''} onChange={set('accent_color')} placeholder="template default" />
          </span>
        </Field>
        <Field label="Body font" hint={errorFor('font_family') ?? style.fields.font_family}>
          <input type="text" list="font-pairs" value={form.font_family ?? ''} onChange={set('font_family')} placeholder="template default" />
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
        <Field label="Template" hint={errorFor('template') ?? `${style.fields.template} Drop your own into ${templates?.customDir ?? 'config/cv/templates/'}.`}>
          <select value={form.template ?? 'standard'} onChange={set('template')}>
            {custom.length ? <optgroup label="Yours (config/cv/templates/)">{custom.map((t) => <option key={t.name} value={t.name}>{t.displayName}</option>)}</optgroup> : null}
            <optgroup label="Upstream (templates/)">{upstream.map((t) => <option key={t.name} value={t.name}>{t.displayName} ({t.name})</option>)}</optgroup>
          </select>
        </Field>
        <div className="wide">
          <span className="field-label">Section order</span>
          <SectionOrder value={form.sections} keys={style.sectionKeys} onChange={(sections) => setForm({ ...form, sections })} />
          <small className="hint">{errorFor('sections') ?? style.fields.sections}</small>
        </div>

        <div className="entry-actions">
          <button type="submit" className="chip primary" disabled={busy}>Save style</button>
          <button type="button" className="chip" disabled={busy} onClick={() => setForm(style.style)}>Revert</button>
          <span className="muted">{style.exists ? style.path : 'Not saved yet — template defaults apply'}</span>
        </div>
      </form>

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
        <summary>Tokens vs. voice — what each changes</summary>
        <dl>
          <div>
            <dt>Style tokens (this page, top)</dt>
            <dd>
              How the PDF looks: colour, fonts, size, margin, density, template, section order. Applied by the
              console’s render step (<code>app/cv/render-cv.js</code>) on top of upstream’s templates; the templates
              and upstream’s renderer are never edited. Affects only PDFs generated from the console.
            </dd>
          </div>
          <div>
            <dt>Voice rules (this page, bottom)</dt>
            <dd>
              How the text reads. Upstream’s <code>voice-dna.md</code>, applied by the pdf, cover and email modes
              in any session, console or terminal.
            </dd>
          </div>
          <div>
            <dt>Content</dt>
            <dd>
              Always from <code>cv.md</code>, <code>article-digest.md</code> and <code>config/profile.yml</code>.
              Neither layer here can add a fact; the fact gate (<code>verify-cv-facts.mjs</code>) runs before
              every render.
            </dd>
          </div>
        </dl>
        <p className="muted">
          Live preview without an agent call, a theme gallery and the ATS check arrive with CV Studio’s next
          phase (PROJECT_PLAN.md §7c–7d, M5).
        </p>
      </details>
    </div>
  );
}
