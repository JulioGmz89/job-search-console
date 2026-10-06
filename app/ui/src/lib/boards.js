/** boards.js — which job-board system a followed company is on, in words. */

export const PROVIDER_NAMES = { greenhouse: 'Greenhouse', lever: 'Lever', ashby: 'Ashby', workday: 'Workday', smartrecruiters: 'SmartRecruiters', recruitee: 'Recruitee', workable: 'Workable' };

/** Which board system a company is on, in words. */
export function boardType(entry) {
  if (entry.provider) return PROVIDER_NAMES[entry.provider] ?? entry.provider;
  const host = (() => {
    try {
      return new URL(entry.careersUrl ?? entry.api ?? '').hostname;
    } catch {
      return '';
    }
  })();
  const hit = Object.keys(PROVIDER_NAMES).find((p) => host.includes(p));
  if (hit) return PROVIDER_NAMES[hit];
  if (entry.scanMethod === 'websearch') return 'Web search';
  return host ? `Careers page (${host})` : 'Careers page';
}
