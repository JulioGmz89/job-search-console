import { useState } from 'react';

/**
 * Add or edit one scanner source.
 *
 * Every field carries a hint saying what it does and when to fill it. The
 * relationship between the careers URL, the provider and the scan method is
 * not obvious from the field names alone, and getting it wrong produces a
 * source the scanner silently skips — which reads as "the scanner is broken".
 *
 * The provider list and the scan methods both come from the server — providers
 * are derived from `providers/*.mjs`, so anything offered here is something
 * upstream can actually resolve. Leaving the provider blank is the normal case:
 * the scanner auto-detects roughly a quarter of them from the careers URL alone.
 */

const EMPTY = {
  name: '',
  careersUrl: '',
  api: '',
  provider: '',
  scanMethod: '',
  scanQuery: '',
  notes: '',
  enabled: true,
};

/** A labelled field with its explanation underneath. */
function Field({ label, hint, className, children }) {
  return (
    <label className={className}>
      <span className="field-label">{label}</span>
      {children}
      {hint ? <small className="hint">{hint}</small> : null}
    </label>
  );
}

export default function PortalEntryForm({ entry, kind, providers, scanMethods, onSubmit, onCancel, busy }) {
  const [draft, setDraft] = useState(() => ({
    ...EMPTY,
    ...Object.fromEntries(
      Object.keys(EMPTY).map((key) => [key, entry?.[key] ?? EMPTY[key]]),
    ),
  }));

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const isWebsearch = draft.scanMethod === 'websearch';

  return (
    <form
      className="entry-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(draft);
      }}
    >
      <h3>{entry ? `Edit ${entry.name}` : `Add a ${kind === 'board' ? 'job board' : 'company'}`}</h3>

      <p className="intro wide">
        A source is scannable in one of three ways. <strong>Most companies</strong> run their jobs page
        on a known applicant-tracking system (Greenhouse, Lever, Ashby, Workday, SmartRecruiters…), and
        the scanner recognises it from the careers URL alone — fill in the URL and leave the rest.
        <strong> Aggregator boards</strong> (RemoteOK, We Work Remotely) have no per-company page, so
        pick their provider explicitly. <strong>Everything else</strong> is <code>websearch</code>: the
        scanner cannot reach it and hands it to the AI agent instead, so it is never fetched by a scan.
      </p>

      <Field
        label="Name"
        hint="How this source appears in the sources list, the scan log and the tracker's Company column. Must be unique."
      >
        <input value={draft.name} onChange={set('name')} required />
      </Field>

      <Field
        label="Careers URL"
        hint="The page where this company lists its openings. When it lives on a recognised job-board system the scanner detects the provider from the address — e.g. job-boards.greenhouse.io/anthropic is unmistakably Greenhouse. Find it by opening any of the company's job postings and looking at the address bar."
      >
        <input
          type="url"
          value={draft.careersUrl}
          onChange={set('careersUrl')}
          placeholder="https://job-boards.greenhouse.io/acme"
        />
      </Field>

      <Field
        label="Provider"
        hint="Which job-board system to read. Leave on detect unless the URL does not reveal it (a custom domain fronting Workday, say) or the source is an aggregator with no per-company page. A wrong provider is worse than none: the fetch fails instead of being auto-detected."
      >
        <select value={draft.provider} onChange={set('provider')}>
          <option value="">Detect from the careers URL</option>
          {providers.map((id) => <option key={id} value={id}>{id}</option>)}
        </select>
      </Field>

      <Field
        label="API endpoint"
        hint="Rarely needed. A few providers accept an explicit feed address instead of the careers page (Greenhouse's boards API, Comeet, Avature). Leave empty unless the provider's notes in templates/portals.example.yml call for one."
      >
        <input type="url" value={draft.api} onChange={set('api')} placeholder="optional" />
      </Field>

      <Field
        label="Scan method"
        hint="Default lets the provider fetch postings. websearch means no provider can reach this company: scans skip it and list it under “Agent/WebSearch handoff” for the AI agent (arriving in a later milestone). local_parser runs a script of your own — configured in portals.yml by hand."
      >
        <select value={draft.scanMethod} onChange={set('scanMethod')}>
          <option value="">Default (provider fetch)</option>
          {scanMethods.map((method) => <option key={method} value={method}>{method}</option>)}
        </select>
      </Field>

      <Field
        label="Search query"
        hint={isWebsearch
          ? 'The web search the agent will run for this company. Put the company name in quotes and add the role words you care about.'
          : 'Only used when the scan method is websearch. Ignored otherwise.'}
      >
        <input
          value={draft.scanQuery}
          onChange={set('scanQuery')}
          placeholder='site:careers.example.com ("Software Engineer" OR "Developer") remote'
        />
      </Field>

      <Field
        label="Notes"
        className="wide"
        hint="Free text for you — why this company is on the list, a warm contact, a caveat. Shown under the name in the sources list. Never sent anywhere."
      >
        <input value={draft.notes} onChange={set('notes')} />
      </Field>

      <label className="inline">
        <input type="checkbox" checked={draft.enabled} onChange={set('enabled')} />
        Include in scans
        <small className="hint">Unticked keeps the entry in portals.yml but every scan and probe skips it.</small>
      </label>

      {entry?.extraKeys?.length ? (
        <p className="muted wide">
          This source also sets <code>{entry.extraKeys.join('</code>, <code>')}</code>, which the form does not
          edit. Those stay exactly as they are.
        </p>
      ) : null}

      <div className="entry-actions">
        <button type="submit" className="chip primary" disabled={busy}>
          {entry ? 'Save' : 'Add source'}
        </button>
        <button type="button" className="chip" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}
