import { useEffect, useRef, useState } from 'react';

import { saveProfile } from '../../api.js';
import { useLeaveGuard } from '../../components/LeaveGuard.jsx';
import { reload, setResource, useResource } from '../../data.js';
import { dateTime } from '../../lib/labels.js';
import { announce } from '../../shell/announce.jsx';

const GROUPS = [
  {
    legend: 'About you',
    fields: [
      ['fullName', 'Name'],
      ['email', 'Email'],
      ['location', 'Location', 'Where you live, e.g. Austin, TX (remote)'],
    ],
  },
  {
    legend: 'What you’re looking for',
    fields: [
      ['targetRoles', 'Target roles', 'One per line, e.g. Senior Backend Engineer', 'list'],
      ['workArrangement', 'Where and how you want to work', 'e.g. Remote in the US; a week a quarter on site is fine'],
      ['compensation', 'Target pay', 'e.g. $165K–190K'],
      ['minimum', 'Lowest pay you would accept'],
    ],
  },
  {
    legend: 'How the app works for you',
    fields: [
      ['autoPdfThreshold', 'Make a tailored CV automatically when the fit is at least', 'A number from 0 to 5. Used when you tick “Also make a tailored CV” while adding a job.', 'number'],
      ['language', 'Language of reports and documents', 'A language code, e.g. en, es, de'],
      ['spendTier', 'Claude usage tier', 'Economy is cheaper and faster; Premium is the most careful. Standard suits most people.', 'tier'],
    ],
  },
];

const TIER_WORDS = { economy: 'Economy', standard: 'Standard', premium: 'Premium' };

/**
 * My CV › Profile (ia.md §2.7; PROJECT_PLAN §5 page 4): config/profile.yml as
 * a form. Saves go field by field through the server, keeping every comment
 * and every key the form doesn't show.
 */
export function ProfileSection() {
  const profile = useResource('profile');
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);
  const savedRef = useRef(null);

  useEffect(() => {
    if (profile.data && draft === null) {
      const f = profile.data.fields;
      setDraft({ ...f, targetRoles: (f.targetRoles ?? []).join('\n'), autoPdfThreshold: f.autoPdfThreshold ?? '' });
    }
  }, [profile.data, draft]);
  useEffect(() => {
    if (saved) savedRef.current?.focus();
  }, [saved]);
  // Unsaved edits warn before leaving (ia.md §2.7).
  const [savedDraft, setSavedDraft] = useState(null);
  useEffect(() => {
    if (draft !== null && savedDraft === null) setSavedDraft(draft);
  }, [draft, savedDraft]);
  const leaveDialog = useLeaveGuard(savedDraft !== null && JSON.stringify(draft) !== JSON.stringify(savedDraft), { what: 'your profile' });

  if (!profile.data || draft === null) return <p className="muted">Loading…</p>;
  if (profile.data.error) {
    return (
      <p className="notice attn">
        Your profile file (config/profile.yml) can’t be read: {profile.data.error}. Fix it in your editor; this page shows it again once it reads.
      </p>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const fields = Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, v === '' ? null : v]));
      const result = await saveProfile(fields);
      setResource('profile', result);
      setSavedDraft(draft);
      reload('agent');
      setSaved(`Profile saved ${dateTime(result.modified)}.`);
      announce('Profile saved.');
    } catch (err) {
      const field = err.detail?.[0]?.field;
      setErrors(field ? { [field]: err.message } : { form: err.message });
      if (field) document.getElementById(`pf-${field}`)?.focus();
    } finally {
      setBusy(false);
    }
  };

  const input = ([key, label, hint, type]) => {
    const id = `pf-${key}`;
    const described = [errors[key] ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;
    const common = { id, value: draft[key] ?? '', 'aria-invalid': errors[key] ? true : undefined, 'aria-describedby': described, onChange: (e) => setDraft({ ...draft, [key]: e.target.value }) };
    return (
      <div className="field" key={key}>
        <label htmlFor={id}>{label}</label>
        {type === 'list' ? (
          <textarea rows={3} {...common} />
        ) : type === 'tier' ? (
          <select {...common}>
            <option value="">Not set (the assistant’s default)</option>
            {profile.data.tiers.map((t) => (
              <option key={t} value={t}>
                {TIER_WORDS[t] ?? t}
              </option>
            ))}
          </select>
        ) : (
          <input type={type === 'number' ? 'number' : 'text'} step={type === 'number' ? '0.1' : undefined} min={type === 'number' ? 0 : undefined} max={type === 'number' ? 5 : undefined} {...common} />
        )}
        {errors[key] ? (
          <p className="error" id={`${id}-err`}>
            {errors[key]}
          </p>
        ) : null}
        {hint ? (
          <p className="hint" id={`${id}-hint`}>
            {hint}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <form className="stack" noValidate onSubmit={submit}>
      {!profile.data.exists ? <p className="notice info">You have no profile yet. Fill in what you like; the file is created when you save.</p> : null}
      <details>
        <summary>Advanced files: two more files that shape your checks</summary>
        <ul className="small">
          <li>
            <span className="mono">modes/_profile.md</span> — the kinds of roles you target and how checks weigh them. Edit it in your editor.
            {profile.data.advanced?.find((a) => a.file === 'modes/_profile.md')?.exists ? '' : ' (not created yet)'}
          </li>
          <li>
            <span className="mono">article-digest.md</span> — proof points the assistant may quote. Edit it in your editor.
            {profile.data.advanced?.find((a) => a.file === 'article-digest.md')?.exists ? '' : ' (not created yet)'}
          </li>
        </ul>
      </details>
      {GROUPS.map((g) => (
        <fieldset key={g.legend} className="grid-2">
          <legend>{g.legend}</legend>
          {g.fields.map(input)}
        </fieldset>
      ))}
      {errors.form ? (
        <p className="error" role="alert">
          {errors.form}
        </p>
      ) : null}
      {/* Sticky, so Save is in view wherever the user is in the form (UI-mycv-profile-save). */}
      <div className="row savebar">
        <button type="submit" className="btn" disabled={busy}>
          Save profile
        </button>
        <span className="small muted">Saved in config/profile.yml; comments and everything else in the file stay as they are.</span>
      </div>
      {saved ? (
        <p className="notice ok" tabIndex={-1} ref={savedRef}>
          {saved}
        </p>
      ) : null}
      {leaveDialog}
    </form>
  );
}
