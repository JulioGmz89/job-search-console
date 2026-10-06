/**
 * files.js — the one way the console replaces a user file it owns a form for.
 *
 * Write a temp file beside the target, keep the previous version as `<file>.bak`
 * (the Undo and "your old version is kept" promises in ia.md §3 rest on it),
 * then rename over the target so a crash never leaves half a file.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export function atomicWrite(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, text, 'utf-8');
  if (existsSync(path)) writeFileSync(`${path}.bak`, readFileSync(path));
  renameSync(tmp, path);
}

/** Line endings as LF, and a final newline unless the text is empty. */
export function normalizeText(text) {
  const normalized = text.replace(/\r\n?/g, '\n');
  return normalized === '' || normalized.endsWith('\n') ? normalized : `${normalized}\n`;
}
