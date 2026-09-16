/**
 * index.js — the server entry point.
 *
 * Binding is not a preference. PROJECT_PLAN.md §9.2 makes loopback-only a
 * non-negotiable constraint, and config.js/config.test.js already enforce the
 * default; this file must not widen it. There is deliberately no --host flag.
 */

import { execFile } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { buildApp } from './app.js';
import { defaultConfig } from './config.js';
import { repoRoot, resolveDataRoot } from './services/paths.js';

const port = Number.parseInt(process.env.PORT ?? '', 10) || defaultConfig.port;

const app = buildApp({ logger: { transport: { target: 'pino-pretty' } } });

/**
 * Housekeeping before the first request.
 *
 * A server killed mid-evaluation leaves a `reports/NNN-RESERVED.md` sentinel
 * behind; upstream's allocator forgets those after four hours, but `--gc` at
 * boot means a restart never waits that long for its next number. The
 * `data/jsc/` directories hold prompts, raw session logs and payloads, and are
 * gitignored with the rest of `data/`.
 */
function prepare() {
  const dataRoot = resolveDataRoot();
  for (const dir of ['prompts', 'logs', 'tmp']) mkdirSync(join(dataRoot, 'data', 'jsc', dir), { recursive: true });
  execFile(process.execPath, [join(repoRoot, 'reserve-report-num.mjs'), '--gc'], { cwd: repoRoot, windowsHide: true }, (error) => {
    if (error) app.log.warn(`reserve-report-num.mjs --gc failed: ${error.message}`);
  });
}

try {
  prepare();
  await app.listen({ host: defaultConfig.host, port });
  app.log.info(`Job Search Console on http://${defaultConfig.host}:${port}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    app.close().then(() => process.exit(0));
  });
}
