import { useState } from 'react';

/**
 * The four answers `modes/cover.md` Step 6 always asks for, collected before
 * the run instead of during it.
 *
 * The mode is explicit that no instruction overrides this gate — the letter's
 * angle, the problem it addresses and the candidate's opening move are the
 * candidate's to state, not the model's to guess. A headless session cannot
 * ask, so the console asks here and hands the answers over verbatim.
 */
const TONES = [
  ['formal', 'Formal', 'structured, respectful distance — suits enterprise and corporate postings'],
  ['direct', 'Direct', 'plain sentences, no pleasantries, gets to the point'],
  ['conversational', 'Conversational', 'warm but professional, reads like a thoughtful person'],
  ['mirror', 'Mirror the posting', 'match whatever register the company used'],
];

export default function CoverLetterDialog({ report, onSubmit, onCancel, busy }) {
  const machine = report?.machine ?? {};
  const [answers, setAnswers] = useState({
    why: '',
    problem: machine.next_action ? '' : '',
    approach: '',
    tone: 'mirror',
  });
  const set = (key) => (e) => setAnswers({ ...answers, [key]: e.target.value });
  const complete = answers.why.trim() && answers.problem.trim() && answers.approach.trim();

  const hints = [machine.top_strengths?.length ? `Strengths the report found: ${machine.top_strengths.slice(0, 3).join('; ')}` : null];

  return (
    <form
      className="cover-dialog"
      onSubmit={(e) => {
        e.preventDefault();
        if (complete) onSubmit(answers);
      }}
    >
      <h3>Cover letter for {machine.company ?? `report ${report?.id}`}</h3>
      <p className="intro">
        The cover-letter mode refuses to draft until you have answered these four questions — they are
        the parts of the letter only you can supply. Short, specific answers make a better letter than long
        ones. The session drafts the letter from your answers, the report and your CV, then renders the
        PDF in one go.
      </p>
      {hints.filter(Boolean).map((hint) => <p key={hint} className="hint">{hint}</p>)}

      <label>
        <span className="field-label">A. Why this role / company?</span>
        <textarea rows={3} value={answers.why} onChange={set('why')} placeholder="One or two concrete reasons: the scale, the domain, the stage, a specific thing you want to learn…" />
      </label>
      <label>
        <span className="field-label">B. What problem would you solve for them?</span>
        <textarea rows={3} value={answers.problem} onChange={set('problem')} placeholder="The problem the posting is really about, in your words." />
      </label>
      <label>
        <span className="field-label">C. How would you approach it?</span>
        <textarea rows={3} value={answers.approach} onChange={set('approach')} placeholder="Your opening move on day one, in one or two sentences. This is the most differentiated part of the letter." />
      </label>
      <label>
        <span className="field-label">D. Tone</span>
        <select value={answers.tone} onChange={set('tone')}>
          {TONES.map(([value, label, meaning]) => (
            <option key={value} value={value}>{label} — {meaning}</option>
          ))}
        </select>
      </label>

      <div className="entry-actions">
        <button type="submit" className="chip primary" disabled={!complete || busy}>Draft and render the letter</button>
        <button type="button" className="chip" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
