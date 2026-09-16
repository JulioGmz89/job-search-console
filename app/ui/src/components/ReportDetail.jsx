/**
 * Job detail: the Machine Summary as a fact panel, the A–H prose, and the PDF.
 *
 * The prose HTML arrives already sanitized by the server (reports.js is the one
 * choke point for untrusted posting content), which is what makes the
 * dangerouslySetInnerHTML below acceptable. Do not move rendering into this
 * component: the seam is deliberately server-side so there is one place to
 * audit rather than one per view.
 */

import { useEffect, useState } from 'react';

import { coverUrl, pdfUrl } from '../api.js';
import { runsForReport, useRuns } from '../runs.jsx';
import { outcome } from './RunPanel.jsx';
import RowActions from './RowActions.jsx';

const FACTS = [
  ['final_decision', 'Decision'],
  ['legitimacy_tier', 'Legitimacy'],
  ['risk_level', 'Risk'],
  ['confidence', 'Confidence'],
  ['advertised_comp', 'Advertised comp'],
  ['next_action', 'Next action'],
];

const LISTS = [
  ['hard_stops', 'Hard stops'],
  ['soft_gaps', 'Soft gaps'],
  ['top_strengths', 'Top strengths'],
  ['discard_reasons', 'Discard reasons'],
];

export default function ReportDetail({ report, error, onRunStarted, onCoverRequested, onOpenRun }) {
  const [tab, setTab] = useState('report');
  const { list } = useRuns();

  // A newly opened report should never inherit the previous one's tab — landing
  // on an empty PDF pane reads as a broken preview.
  useEffect(() => { setTab('report'); }, [report?.id]);

  if (error) return <div className="detail"><p className="empty">{error}</p></div>;
  if (!report) return null;

  const machine = report.machine ?? {};
  const hasPdf = report.pdf?.exists === true;
  const hasCover = Boolean(report.cover);
  // What the console has done, or is doing, for this report.
  const related = runsForReport(list, report.id).slice(0, 6);

  return (
    <div className="detail">
      <div className="detail-head">
        <h2>{report.title ?? `Report ${report.id}`}</h2>
        <div className="sub">
          {report.tracker?.status ? <span className="badge">{report.tracker.status}</span> : null}
          {report.header?.date ? <> · {report.header.date}</> : null}
          {report.url ? <> · <a href={report.url} target="_blank" rel="noopener noreferrer">{report.url}</a></> : null}
        </div>
        <div className="detail-actions">
          <RowActions report={report} onStarted={onRunStarted} onCoverRequested={() => onCoverRequested?.(report)} />
          {related.length ? (
            <span className="related-runs">
              {related.map((run) => (
                <button key={run.id} className={`badge ${outcome(run).className}`} onClick={() => onOpenRun?.(run.id)} title={`${run.label} — ${outcome(run).label}. Open its log.`}>
                  {run.label}: {outcome(run).label}
                </button>
              ))}
            </span>
          ) : null}
        </div>
      </div>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'report'} onClick={() => setTab('report')}>Report</button>
        <button
          role="tab"
          aria-selected={tab === 'pdf'}
          onClick={() => setTab('pdf')}
          disabled={!hasPdf}
          title={hasPdf ? '' : 'No PDF generated for this report'}
        >
          PDF{hasPdf ? '' : ' —'}
        </button>
        <button
          role="tab"
          aria-selected={tab === 'cover'}
          onClick={() => setTab('cover')}
          disabled={!hasCover}
          title={hasCover ? `Rendered ${report.cover.date}` : 'No cover letter generated for this report'}
        >
          Cover letter{hasCover ? '' : ' —'}
        </button>
      </div>

      {tab === 'pdf' && hasPdf ? (
        <iframe className="pdf-frame" src={pdfUrl(report.id)} title={`CV for report ${report.id}`} />
      ) : tab === 'cover' && hasCover ? (
        <iframe className="pdf-frame" src={coverUrl(report.id)} title={`Cover letter for report ${report.id}`} />
      ) : (
        <>
          {report.machine ? (
            <dl className="facts">
              {FACTS.filter(([key]) => machine[key]).map(([key, label]) => (
                <div className="fact" key={key}>
                  <dt>{label}</dt>
                  <dd>{String(machine[key])}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="notice warn">
              This report has no machine summary — the structured fields below are unavailable.
            </div>
          )}

          {LISTS.some(([key]) => machine[key]?.length) ? (
            <div className="lists">
              {LISTS.filter(([key]) => machine[key]?.length).map(([key, label]) => (
                <section key={key}>
                  <h4>{label}</h4>
                  <ul>{machine[key].map((item, i) => <li key={i}>{String(item)}</li>)}</ul>
                </section>
              ))}
            </div>
          ) : null}

          {report.issues?.length ? (
            <div className="notice warn" style={{ margin: '14px 20px' }}>
              {report.issues.map((issue, i) => <div key={i}>{issue.code}{issue.message ? `: ${issue.message}` : ''}</div>)}
            </div>
          ) : null}

          <div className="prose">
            {report.sections.map((section) => (
              <section key={section.title}>
                <h3>{section.title}</h3>
                <div dangerouslySetInnerHTML={{ __html: section.html }} />
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
