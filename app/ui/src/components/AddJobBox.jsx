import { useState } from 'react';

import { addInboxUrl } from '../api.js';
import { useRuns } from '../runs.jsx';
import { useRun } from '../useRun.js';
import RunPanel from './RunPanel.jsx';

/**
 * The milestone's headline path (PROJECT_PLAN.md §8, M3): paste a job URL,
 * click once, and watch the evaluation — then the PDF — arrive.
 *
 * "Add to inbox" only files the URL for later (a scan would do the same).
 * "Evaluate now" files it and queues the evaluation in the same request; the
 * run's log streams here so the user can see what Claude is doing without
 * leaving the pipeline.
 */
export default function AddJobBox({ onChanged }) {
  const { agentReady, agentReason, agent } = useRuns();
  const [url, setUrl] = useState('');
  const [autoPdf, setAutoPdf] = useState(true);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = useRun({ onFinish: onChanged });

  const threshold = agent?.profile?.autoPdfThreshold;

  const submit = async (evaluate) => {
    setBusy(true);
    setNotice(null);
    try {
      const result = await addInboxUrl({ url: url.trim(), evaluate, autoPdf });
      if (result.run) {
        run.follow(result.run);
        setNotice(result.added ? null : 'Already in the inbox — evaluating it anyway.');
      } else {
        setNotice(result.added ? 'Added to the inbox.' : `Already in the inbox (${result.existing?.section}).`);
      }
      if (result.added || result.run) setUrl('');
      onChanged?.();
    } catch (failure) {
      setNotice(failure.message);
    } finally {
      setBusy(false);
    }
  };

  const valid = /^https?:\/\/\S+$/.test(url.trim());
  const running = run.run && (run.run.status === 'queued' || run.run.status === 'running');

  return (
    <section className="add-job">
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid && agentReady) submit(true);
        }}
      >
        <input
          type="url"
          className="url-input"
          placeholder="Paste a job posting URL…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={busy}
        />
        <button
          type="submit"
          className="chip primary"
          disabled={!valid || busy || !agentReady || running}
          title={agentReady ? 'File it in the inbox and start the evaluation' : agentReason}
        >
          Evaluate now
        </button>
        <button type="button" className="chip" disabled={!valid || busy} onClick={() => submit(false)} title="File it in the inbox without evaluating">
          Add to inbox
        </button>
        <label className="inline" title="Queue the tailored PDF automatically when the score reaches your profile's threshold">
          <input type="checkbox" checked={autoPdf} onChange={(e) => setAutoPdf(e.target.checked)} />
          PDF if score ≥ {threshold ?? '…'}
        </label>
        {notice ? <span className="muted">{notice}</span> : null}
      </form>

      {!agentReady && agentReason ? <div className="notice warn">{agentReason}</div> : null}

      <details className="help compact">
        <summary>What happens when I click Evaluate now?</summary>
        <p>
          The URL is filed in the inbox (<code>data/pipeline.md</code>) and a headless Claude Code session
          starts in this directory with the same instructions <code>/career-ops oferta</code> uses in a
          terminal. It fetches the posting, scores it against your <code>cv.md</code> and profile, writes the
          A–G report to <code>reports/</code> and a tracker row. When it finishes, the console merges the row
          into <code>data/applications.md</code>, moves the URL to the inbox’s Processed section, and — if the
          score reaches your threshold — queues a tailored CV PDF. Everything streams below; the row appears
          in the table by itself. Nothing is ever submitted to anyone.
        </p>
        <p className="muted">
          Evaluations take a few minutes and stop themselves after 13. Two can run at once; more wait in the
          queue. Cancel stops the session and releases its report number.
        </p>
      </details>

      <RunPanel run={run.run} lines={run.lines} progress={run.progress} error={run.error} onCancel={run.cancel} onDismiss={run.reset} />
    </section>
  );
}
