/**
 * The ATS guardrail's verdict (PROJECT_PLAN.md §7d), shown wherever a CV is.
 *
 * A failure is loud on purpose: a CV an applicant-tracking system cannot read
 * is worse than a plain one, and the user is about to send it. Warnings are
 * listed; the advisory notes upstream's structural audit raises are folded
 * away, because the PDF text check measures what they only guess at.
 */

const TITLE = {
  pass: 'ATS check passed',
  warn: 'ATS check passed with warnings',
  fail: 'ATS check failed — an applicant-tracking system will lose part of this CV',
};

/**
 * @param {{ats: {verdict: string, score: number, issues: {severity: string, message: string}[],
 *   keywords?: {percent: number, total: number}, pages?: number|null}|null, custom?: boolean, compact?: boolean}} props
 */
export default function AtsVerdict({ ats, custom = false, compact = false }) {
  if (!ats) return null;
  const serious = ats.issues.filter((i) => i.severity === 'critical' || i.severity === 'warning');
  const notes = ats.issues.filter((i) => i.severity === 'info');
  const facts = [
    `score ${ats.score}/100`,
    ats.keywords?.total ? `${ats.keywords.percent}% of keywords readable` : null,
    ats.pages ? `${ats.pages} page${ats.pages === 1 ? '' : 's'}` : null,
  ].filter(Boolean);

  return (
    <div className={`ats-verdict ats-${ats.verdict}${compact ? ' compact' : ''}`} role={ats.verdict === 'fail' ? 'alert' : 'status'}>
      <div className="ats-head">
        <strong>{ats.verdict === 'fail' ? '🚨 ' : ats.verdict === 'warn' ? '⚠ ' : '✓ '}{TITLE[ats.verdict] ?? ats.verdict}</strong>
        <span className="muted"> · {facts.join(' · ')}</span>
      </div>
      {ats.verdict === 'fail' && custom ? (
        <p className="ats-custom">This is a custom theme, and it is not ATS-safe. Fix the template or pick another before sending a CV made with it.</p>
      ) : null}
      {serious.length ? (
        <ul>
          {serious.map((i) => (
            <li key={i.message} className={i.severity}>{i.message}</li>
          ))}
        </ul>
      ) : null}
      {notes.length && !compact ? (
        <details>
          <summary>{notes.length} advisory note{notes.length === 1 ? '' : 's'}</summary>
          <ul>{notes.map((i) => <li key={i.message}>{i.message}</li>)}</ul>
        </details>
      ) : null}
    </div>
  );
}
