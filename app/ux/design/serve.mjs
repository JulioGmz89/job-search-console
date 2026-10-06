#!/usr/bin/env node

/**
 * serve.mjs — serve the M7 prototypes on 127.0.0.1 (PROJECT_PLAN.md §8 M7).
 *
 *   node app/ux/design/serve.mjs [--port 4420]
 *
 * The prototypes are static HTML, CSS and a little vanilla JS with fictional
 * data, so nothing needs building: this only maps URLs to files under
 * `app/ux/design/`, with the prototypes' index at `/`. It binds loopback, like
 * the console itself (§9.2), and refuses any path outside the design folder.
 *
 * Prints `PROTOTYPES_READY {"url": …}` once listening, so the walkthrough and
 * axe scripts can wait for it the way they wait for `SANDBOX_READY`.
 */

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const here = dirname(fileURLToPath(import.meta.url));
const { values: opts } = parseArgs({ options: { port: { type: 'string', default: '4420' } } });
const port = Number.parseInt(opts.port, 10);
if (!Number.isInteger(port)) {
  console.error('--port must be a whole number');
  process.exit(2);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.md': 'text/plain; charset=utf-8',
};

/** The file a URL path names, or null when it escapes the design folder or does not exist. */
function resolveFile(urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/prototypes/index.html';
  const full = normalize(join(here, rel));
  if (full !== here && !full.startsWith(here + sep)) return null;
  try {
    const stat = statSync(full);
    if (stat.isDirectory()) return resolveFile(join(rel, 'index.html'));
    return full;
  } catch {
    return null;
  }
}

const server = createServer((req, res) => {
  let file;
  try {
    file = resolveFile(req.url ?? '/');
  } catch {
    file = null;
  }
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  createReadStream(file).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${port}/`;
  console.log(`M7 prototypes on ${url}`);
  console.log(`PROTOTYPES_READY ${JSON.stringify({ url })}`);
});
