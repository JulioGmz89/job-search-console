import { useEffect, useRef, useState } from 'react';

import { addAvoidWord, fetchWritingSample, pdfUrl, removeAvoidWord, restoreVoice, saveVoice } from '../../api.js';
import { useLeaveGuard } from '../../components/LeaveGuard.jsx';
import { RunItem } from '../../components/RunItem.jsx';
import { ConfirmDialog, CostNote, HelpLink } from '../../components/ui.jsx';
import { reload, setResource, useResource } from '../../data.js';
import { dateTime, fit, jobName, plural, shortDate } from '../../lib/labels.js';
import { runState, runTitle } from '../../lib/runs.js';
import { runsForJob, useRuns } from '../../runs.jsx';
import { announce } from '../../shell/announce.jsx';
import { offerUndo } from '../../shell/undo.jsx';

/** One writing sample, its text read on Open (UI-cv-samples). */
function Sample({ sample }) {
  const [state, setState] = useState(null);
  return (
    <details
      onToggle={(event) => {
        if (event.currentTarget.open && state === null) {
          fetchWritingSample(sample.name)
            .then((r) => setState({ text: r.text, truncated: r.truncated }))
            .catch((e) => setState({ error: e.message }));
        }
      }}
    >
      <summary>
        Open <span className="mono">{sample.name}</span> <span className="small muted">· changed {shortDate(sample.modified)}</span>
      </summary>
      {state === null ? <p className="small muted">Loading…</p> : null}
      {state?.error ? <p className="small">{state.error}</p> : null}
      {state?.text !== undefined ? (
        <>
          <pre className="log" tabIndex={0} aria-label={`Text of ${sample.name}`}>
            {state.text}
          </pre>
          {state.truncated ? <p className="small muted">Only the start is shown; the file is long.</p> : null}
        </>
      ) : null}
    </details>
  );
}

/** Words to avoid: one chip per word, added and removed one at a time (F-002). */
function Words({ words }) {
  const [word, setWord] = useState('');
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);
  const input = useRef(null);

  const add = async (e) => {
    e.preventDefault();
    // "seamless, cutting-edge, robust" is three words, not one phrase (W8-T9-01).
    const words = word.split(/[,;\n]+/).map((w) => w.trim()).filter(Boolean);
    if (!words.length) {
      setError('Type a word or short phrase first.');
      return;
    }
    setError(null);
    try {
      const added = [];
      for (const w of words) if ((await addAvoidWord(w)).added) added.push(w);
      await reload('voice');
      setWord('');
      const already = words.filter((w) => !added.includes(w));
      setSaved(
        [added.length ? `Added ${added.map((w) => `“${w}”`).join(', ')}` : null, already.length ? `${already.map((w) => `“${w}”`).join(', ')} ${already.length === 1 ? 'was' : 'were'} already on the list` : null]
          .filter(Boolean)
          .join('; ') + '.',
      );
      announce(`${added.length ? `Added ${added.join(', ')} to the words to avoid.` : ''} ${already.length ? `${already.join(', ')} already on the list.` : ''}`.trim());
      input.current?.focus();
    } catch (err) {
      setError(err.message);
    }
  };
  const remove = async (w) => {
    try {
      await removeAvoidWord(w);
      await reload('voice');
      offerUndo(`Removed “${w}” from the words to avoid`, async () => {
        await addAvoidWord(w);
        await reload('voice');
      });
      input.current?.focus();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="card" aria-labelledby="words-h">
      <h2 id="words-h" className="card-title">
        Words to avoid
      </h2>
      <p className="small muted">The assistant never uses these in a tailored CV or letter.</p>
      {words.length ? (
        <ul className="chips plain" aria-label="Words to avoid">
          {words.map((w) => (
            <li key={w} className="wordchip">
              {w}
              <button type="button" onClick={() => remove(w)} aria-label={`Remove ${w}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>None yet.</p>
      )}
      <form className="row add-word" noValidate onSubmit={add}>
        <div className="field">
          <label htmlFor="add-word">Add a word</label>
          <input
            id="add-word"
            ref={input}
            type="text"
            value={word}
            placeholder="e.g. seamless"
            onChange={(e) => setWord(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'add-word-err' : 'add-word-hint'}
          />
          {error ? (
            <p className="error" id="add-word-err">
              {error}
            </p>
          ) : (
            <p className="hint" id="add-word-hint">
              Separate several with commas. Each is added under “Never write” in your rules; nothing else changes.
            </p>
          )}
        </div>
        <button type="submit" className="btn">
          Add
        </button>
      </form>
      {saved ? (
        <p className="notice ok">
          {saved}
        </p>
      ) : null}
    </section>
  );
}

/**
 * Every tailored CV, best fit first, saying whether it was written under the
 * current rules, with Make it again (WP-T9-01: the target job is never cut off).
 */
function RemakeList({ voice }) {
  const pipeline = useResource('pipeline');
  const documents = useResource('documents');
  const { list, start } = useRuns();
  const rows = (pipeline.data?.rows ?? []).filter((r) => r.pdf).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const docFor = (row) => (documents.data?.documents ?? []).find((d) => d.reportId === (row.pdf?.reportId ?? row.reportId)) ?? null;
  const rulesAt = voice.modified ? Date.parse(voice.modified) : 0;

  if (!rows.length) return <p className="small muted">You have no tailored CVs yet. They are made from a job’s page, under Documents.</p>;
  const stale = rows.filter((r) => {
    const doc = docFor(r);
    return !doc || Date.parse(doc.modified) < rulesAt;
  }).length;

  return (
    <section className="stack-sm" aria-labelledby="remake-h">
      <h3 id="remake-h">Your tailored CVs ({rows.length})</h3>
      <p className="small">
        {stale ? `${plural(stale, 'CV was', 'CVs were')} written before your rules last changed (${shortDate(voice.modified)}). ` : 'All of them were written under your current rules. '}
        Make one again to rewrite it under the current rules. <CostNote minutes="3" />
      </p>
      <ul className="plain stack-sm">
        {rows.map((row) => {
          const doc = docFor(row);
          const current = doc && Date.parse(doc.modified) >= rulesAt;
          const runs = runsForJob(list, { reportId: row.reportId });
          const making = runs.find((r) => r.kind === 'pdf' && ['waiting', 'working'].includes(runState(r)));
          const name = jobName(row);
          return (
            <li key={row.id} id={`remake-${row.id}`} className="card review-item" data-run-home>
              <div className="row between">
                <span>
                  <a href={`#/applications/${row.id}#documents`}>
                    <b>{name}</b>
                  </a>{' '}
                  <span className="small muted">
                    #{row.id} · fit {fit(row.score)}
                  </span>
                  <br />
                  <span className="small">{doc ? (current ? `✓ Made ${dateTime(doc.modified)}, under your current rules` : `Made ${dateTime(doc.modified)}, before your rules changed`) : 'Made outside the app; rules unknown'}</span>
                </span>
                {making ? null : (
                  <span className="row">
                    <a className="btn2 btn-sm" href={pdfUrl(row.reportId)} target="_blank" rel="noopener noreferrer">
                      Open<span className="visually-hidden"> the tailored CV for {name} (new tab)</span>
                    </a>
                    <button
                      type="button"
                      className={current ? 'btn2 btn-sm' : 'btn btn-sm'}
                      onClick={async () => {
                        const run = await start('pdf', { reportId: row.reportId });
                        announce(`Started: ${runTitle(run)}. About 3 minutes.`);
                        setTimeout(() => document.getElementById(`remake-${row.id}`)?.querySelector('.act-title a')?.focus(), 0);
                      }}
                    >
                      Make it again<span className="visually-hidden"> for {name}</span>
                    </button>
                  </span>
                )}
              </div>
              {making ? <RunItem run={making} headingLevel={4} /> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * My CV › Writing rules (ia.md §2.7): voice-dna.md and writing-samples/. Edits
 * never rewrite the file wholesale except "All rules", which the user edits
 * whole, and "Start from the example rules", which confirms and can be undone.
 */
export function WritingSection() {
  const voice = useResource('voice');
  const samples = useResource('samples');
  const [text, setText] = useState(null);
  const [edited, setEdited] = useState(false);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const savedRef = useRef(null);

  // Unsaved edits to All rules warn before leaving (ia.md §2.7).
  const leaveDialog = useLeaveGuard(edited && text !== voice.data?.text, { what: 'your writing rules' });

  // The editor follows the file (a word added above, an outside edit) until the user types in it.
  const fileText = voice.data?.text;
  useEffect(() => {
    if (fileText !== undefined && !edited) setText(fileText);
  }, [fileText, edited]);
  useEffect(() => {
    if (saved) savedRef.current?.focus();
  }, [saved]);

  if (!voice.data || text === null) return <p className="muted">Loading…</p>;
  const ruleCount = voice.data.text.split('\n').filter((l) => /^\s*[-*]\s+\S/.test(l)).length;

  const saveAll = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await saveVoice(text);
      await reload('voice');
      setEdited(false);
      setSaved(`Rules saved ${dateTime(new Date())}. They apply to the next tailored CV or letter.`);
      announce('Your writing rules are saved.');
      // Back to the rules before this save (R-cv-voice-restore); the server kept them as voice-dna.md.bak.
      offerUndo('Saved your writing rules', async () => {
        const back = await restoreVoice();
        setResource('voice', back);
        setEdited(false);
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const useExample = async () => {
    setConfirm(false);
    try {
      await saveVoice(voice.data.templateText);
      await reload('voice');
      setEdited(false);
      offerUndo('Replaced your rules with the example rules', async () => {
        const back = await restoreVoice();
        setResource('voice', back);
        setEdited(false);
      });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="stack">
      <Words words={voice.data.words ?? []} />

      <details className="card" open={!voice.data.exists}>
        <summary>All rules</summary>
        <form className="stack-sm" noValidate onSubmit={saveAll}>
          <div className="field">
            <label htmlFor="rules-edit">Your writing rules (voice-dna.md)</label>
            <textarea
              id="rules-edit"
              className="editor"
              rows={10}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setEdited(true);
                setSaved(null);
              }}
              aria-describedby="rules-edit-hint"
            />
            <p className="hint" id="rules-edit-hint">
              {voice.data.exists ? `Last changed ${dateTime(voice.data.modified)}. ` : 'No rules yet. '}Tone notes, bullet style, and words never to write. The previous version is kept as voice-dna.md.bak.
            </p>
          </div>
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="row">
            <button type="submit" className="btn" disabled={text === voice.data.text}>
              Save
            </button>
            {voice.data.templateText ? (
              <button type="button" className="btn2" onClick={() => setConfirm(true)}>
                Start from the example rules…
              </button>
            ) : null}
          </div>
          {saved ? (
            <p className="notice ok" tabIndex={-1} ref={savedRef}>
              {saved}
            </p>
          ) : null}
        </form>
      </details>

      <section className="card" aria-labelledby="samples-h">
        <h2 id="samples-h" className="card-title">
          Writing samples
        </h2>
        <p className="small muted">Things you wrote yourself. The assistant matches their voice; they are the strongest way to sound like you.</p>
        {samples.data?.samples?.length ? (
          <ul>
            {samples.data.samples.map((s) => (
              <li key={s.name}>
                <Sample sample={s} />
              </li>
            ))}
          </ul>
        ) : (
          <p>None yet.</p>
        )}
        <p className="small">
          To add one, put a text or Markdown file in the <span className="mono">writing-samples</span> folder of your workspace{samples.data?.path ? ` (${samples.data.path})` : ''}. It appears here by itself.
        </p>
      </section>

      <section className="card" aria-labelledby="apply-h">
        <h2 id="apply-h" className="card-title">
          When rules apply
        </h2>
        <p>
          These rules apply to the next tailored CV or letter. Already-made documents keep their wording. <HelpLink topic="rules">About writing rules</HelpLink>
        </p>
        <RemakeList voice={voice.data} />
      </section>

      {leaveDialog}
      <ConfirmDialog isOpen={confirm} title="Start from the example rules?" confirmLabel="Replace my rules" danger onConfirm={useExample} onCancel={() => setConfirm(false)}>
        <p>
          This replaces your {plural(ruleCount, 'rule')} with the example rules. Your current rules are kept as voice-dna.md.bak, and you can undo this right after.
        </p>
      </ConfirmDialog>
    </div>
  );
}
