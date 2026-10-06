/**
 * cvtext.js — the CV as text in the browser: what a saved CV is said to hold,
 * and reading a chosen file (only its text is sent; ia.md §4).
 */

import { plural } from './labels.js';

/** "Alex Rivera · Summary, Experience (2 roles), Education, Skills". */
export function cvSummaryText(summary) {
  if (!summary) return '';
  const sections = summary.sections.map((s) => (s.entries ? `${s.title} (${plural(s.entries, 'role')})` : s.title)).join(', ');
  return [summary.name, sections].filter(Boolean).join(' · ');
}

/** Read a chosen .md/.txt file in the browser; only its text is sent (ia.md §4). */
export function readTextFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file chosen'));
    if (file.size > 512 * 1024) return reject(new Error('That file is larger than 512 KB — choose your CV as a .md or .txt file'));
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.readAsText(file);
  });
}
