/**
 * cv-specs.js — the deterministic CV render as a queued run (PROJECT_PLAN.md §7c).
 *
 * `cv-render` renders one structured CV (a payload in the CV library) in a
 * theme through `app/cv/render-cv.js --document`: upstream's builder, the fact
 * gate, upstream's renderer, then the ATS guardrail. No agent. It is how a past
 * CV is re-rendered in a new theme, and the step a structured PDF run chains to
 * after its agent has written the payload.
 *
 * The browser names a document id and a theme; both are checked here against
 * the library and the template list, and the argv is rebuilt from them — the
 * script never sees a path from a request.
 */

import { readAtsRecord } from '../services/ats.js';
import { getCvDocument } from '../services/cvdocs.js';
import { resolveDataRoot } from '../services/paths.js';
import { resolveRequestStyle } from '../services/cvrender.js';
import { loadStyle } from '../../cv/theme.js';
import { internalSpec, SpecError } from './specs.js';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * @param {{documentId: string, template?: string|null}} options
 * @param {{root?: string, repoRoot: string}} ctx
 */
export function buildCvRenderSpec({ documentId, template = null } = {}, ctx = {}) {
  const dataRoot = resolveDataRoot(ctx.root);
  let doc;
  try {
    doc = getCvDocument(documentId, { root: dataRoot });
  } catch (error) {
    throw new SpecError(error.message, { code: error.code ?? 'document-invalid', status: error.status ?? 400 });
  }
  if (doc.sample) throw new SpecError('The sample CV is for previews only', { code: 'document-sample' });

  const theme = template ?? loadStyle({ root: dataRoot }).style.template;
  try {
    resolveRequestStyle({ template: theme }, { root: dataRoot });
  } catch (error) {
    throw new SpecError(error.message, { code: error.code ?? 'template-missing', status: error.status ?? 400 });
  }

  const date = today();
  const pdf = `${doc.id}-${date}.pdf`;
  const reportNum = doc.reportId === null ? null : String(doc.reportId).padStart(3, '0');

  return {
    kind: 'cv-render',
    script: 'app/cv/render-cv.js',
    label: `Render ${doc.id} · ${theme}`,
    args: [`--document=${doc.id}`, `--template=${theme}`, `--date=${date}`],
    dryRun: false,
    writes: true,
    confirmRequired: false,
    reportsFindings: false,
    lane: 'script',
    exclusive: false,
    dedupeKey: `cv-render:${doc.id}`,
    meta: { documentId: doc.id, template: theme, reportId: doc.reportId, pdf },
    hooks: {
      after(run, { provisional, record }) {
        if (provisional.status !== 'succeeded') return {};
        const ats = readAtsRecord(dataRoot, pdf);
        if (ats?.verdict === 'fail') record(`ATS check failed for ${pdf} — see the issues above before sending this CV`, 'stderr');
        return {
          result: {
            documentId: doc.id,
            template: theme,
            reportId: doc.reportId,
            pdf,
            ats: ats ? { verdict: ats.verdict, score: ats.score, issues: ats.issues } : null,
          },
          // The tracker's PDF flag flips through upstream's canonical writer, as after an agent PDF run.
          next: reportNum ? [internalSpec('mark-pdf-ready', ctx, { reportNum })] : [],
        };
      },
    },
  };
}
