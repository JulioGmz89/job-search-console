import { useEffect, useRef, useState } from 'react';

import { saveCvContent } from '../../api.js';
import { useLeaveGuard } from '../../components/LeaveGuard.jsx';
import { EmptyState } from '../../components/ui.jsx';
import { reload, setResource, useResource } from '../../data.js';
import { dateTime } from '../../lib/labels.js';
import { announce } from '../../shell/announce.jsx';
import { cvSummaryText, readTextFile } from '../../lib/cvtext.js';

/**
 * My CV › Content (ia.md §2.7): cv.md in an editor, the source of every fit
 * check, tailored CV and letter. The home of N-01 (F-001).
 */
export function ContentSection() {
  const cv = useResource('cv');
  const [text, setText] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);
  const savedRef = useRef(null);

  // Unsaved edits warn before leaving (ia.md §2.7).
  const leaveDialog = useLeaveGuard(Boolean(cv.data && text !== null && text !== cv.data.text), { what: 'your CV' });

  // Start from the file, and follow it when it changes on disk while unedited.
  useEffect(() => {
    if (cv.data && text === null) setText(cv.data.text);
  }, [cv.data, text]);
  useEffect(() => {
    if (saved) savedRef.current?.focus();
  }, [saved]);

  if (!cv.data || text === null) return <p className="muted">Loading…</p>;
  const dirty = text !== cv.data.text;

  const save = async (value) => {
    setError(null);
    setBusy(true);
    try {
      const result = await saveCvContent(value);
      setResource('cv', result);
      setText(result.text);
      reload('workspace');
      reload('agent');
      setSaved(`Saved ${dateTime(result.modified)}: ${cvSummaryText(result.summary)}.`);
      announce(`Your CV is saved: ${cvSummaryText(result.summary)}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      {!cv.data.exists ? (
        <EmptyState title="No CV yet">
          <p>Paste your CV below or import a Markdown or text file. Every fit check, tailored CV and letter starts from it.</p>
        </EmptyState>
      ) : null}
      <form
        className="card stack-sm"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save(text);
        }}
      >
        <div className="field">
          <label htmlFor="cv-edit">Your CV (Markdown)</label>
          <textarea
            id="cv-edit"
            className="editor"
            rows={20}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSaved(null);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={`cv-edit-hint${error ? ' cv-edit-err' : ''}`}
          />
          {error ? (
            <p className="error" id="cv-edit-err">
              {error}
            </p>
          ) : null}
          <p className="hint" id="cv-edit-hint">
            {cv.data.exists ? `Last saved ${dateTime(cv.data.modified)} · ` : ''}Saved as cv.md in your workspace folder; your previous version is kept as cv.md.bak. Use # for your name, ## for sections and ### for each role.
          </p>
        </div>
        <div className="row">
          <button type="submit" className="btn" disabled={busy || !dirty}>
            Save
          </button>
          {!dirty ? <span className="small muted">Nothing to save yet: edit your CV above.</span> : null}
          <label htmlFor="cv-import" className="btn2 file-button">
            Import from a file
          </label>
          <input
            id="cv-import"
            type="file"
            className="visually-hidden"
            accept=".md,.txt,text/markdown,text/plain"
            onChange={async (e) => {
              try {
                const value = await readTextFile(e.target.files?.[0]);
                setText(value);
                setSaved(null);
                announce('File loaded into the editor. Review it, then Save.');
              } catch (err) {
                setError(err.message);
              }
            }}
          />
          {dirty ? <span className="small muted">Unsaved changes</span> : null}
        </div>
        {saved ? (
          <p className="notice ok" tabIndex={-1} ref={savedRef}>
            {saved}
          </p>
        ) : null}
      </form>
      {cv.data.exists ? (
        <section className="card" aria-labelledby="cv-sum-h">
          <h2 id="cv-sum-h" className="card-title">
            What the app reads from it
          </h2>
          <p>{cvSummaryText(cv.data.summary) || 'No name or sections found. Start your CV with “# Your Name” and use “## Experience”, “## Skills” and so on.'}</p>
        </section>
      ) : null}
      {leaveDialog}
    </div>
  );
}
