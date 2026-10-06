/**
 * labels.js — the words the UI shows for stored values (ia.md §3, brief.md glossary).
 *
 * Stored values never change (templates/states.yml stays the source); only what
 * the user reads does. Pure functions, tested with node --test.
 */

/** Status id (states.yml) → what the user sees. */
export const STATUS_LABELS = Object.freeze({
  evaluated: 'Reviewed — not applied',
  applied: 'Applied',
  responded: 'They replied',
  interview: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
  discarded: 'Not for me',
  skip: "Skipped — don't apply",
  hired: 'Hired',
});

/** The shown label for a status id or stored label ("Evaluated", "SKIP"). */
export function statusLabel(status) {
  if (!status) return 'No status';
  const id = String(status).trim().toLowerCase();
  return STATUS_LABELS[id] ?? String(status);
}

/** A fit score as the UI writes it: "4.1", or "—" when there is none. */
export function fit(score) {
  return typeof score === 'number' && Number.isFinite(score) ? score.toFixed(1) : '—';
}

/** "1 posting", "3 postings". */
export function plural(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const toDate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  // A bare YYYY-MM-DD is a calendar day, not midnight UTC shifted into yesterday.
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** "Oct 6" (with the year when it is not this year). */
export function shortDate(value, now = new Date()) {
  const date = toDate(value);
  if (!date) return '';
  const day = `${MONTHS[date.getMonth()]} ${date.getDate()}`;
  return date.getFullYear() === now.getFullYear() ? day : `${day}, ${date.getFullYear()}`;
}

/** "Oct 6, 10:42". */
export function dateTime(value, now = new Date()) {
  const date = toDate(value);
  if (!date) return '';
  return `${shortDate(date, now)}, ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** "45 s", "3 min", "1 h 5 min". */
export function duration(ms) {
  if (typeof ms !== 'number' || ms < 0) return '';
  const s = Math.round(ms / 1000);
  if (s < 1) return 'under a second';
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

/** "Granite Cloud — Software Engineer, Payments", from whatever names a job. */
export function jobName(item) {
  if (!item) return '';
  const company = item.company ?? null;
  const role = item.role ?? item.title ?? null;
  if (company && role) return `${company} — ${role}`;
  return company ?? role ?? item.url ?? '';
}
