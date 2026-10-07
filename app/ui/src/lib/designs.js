/** designs.js — a CV design's name as people read it ("ATS Friendly", not "ats"). */

/**
 * @param {string|null} code - the template name stored in style.yml.
 * @param {Array<{name: string, displayName?: string}>} [templates] - /api/cv/templates.
 */
export function designName(code, templates = []) {
  if (!code) return 'Standard';
  const hit = templates.find((t) => t.name === code);
  if (hit?.displayName) return hit.displayName;
  return code.replace(/[-_]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}
