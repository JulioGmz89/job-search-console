import { useState } from 'react';

/**
 * Add or edit one scanner source.
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

  return (
    <form
      className="entry-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(draft);
      }}
    >
      <h3>{entry ? `Edit ${entry.name}` : `Add a ${kind === 'board' ? 'job board' : 'company'}`}</h3>

      <label>
        Name
        <input value={draft.name} onChange={set('name')} required />
      </label>

      <label>
        Careers URL
        <input
          type="url"
          value={draft.careersUrl}
          onChange={set('careersUrl')}
          placeholder="https://job-boards.greenhouse.io/acme"
        />
      </label>

      <label>
        Provider
        <select value={draft.provider} onChange={set('provider')}>
          <option value="">Detect from the careers URL</option>
          {providers.map((id) => <option key={id} value={id}>{id}</option>)}
        </select>
      </label>

      <label>
        API endpoint
        <input type="url" value={draft.api} onChange={set('api')} placeholder="optional" />
      </label>

      <label>
        Scan method
        <select value={draft.scanMethod} onChange={set('scanMethod')}>
          <option value="">Default (Playwright)</option>
          {scanMethods.map((method) => <option key={method} value={method}>{method}</option>)}
        </select>
      </label>

      <label>
        Search query
        <input
          value={draft.scanQuery}
          onChange={set('scanQuery')}
          placeholder='Used when the scan method is "websearch"'
        />
      </label>

      <label className="wide">
        Notes
        <input value={draft.notes} onChange={set('notes')} />
      </label>

      <label className="inline">
        <input type="checkbox" checked={draft.enabled} onChange={set('enabled')} />
        Include in scans
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
