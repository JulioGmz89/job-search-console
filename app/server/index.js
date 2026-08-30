/**
 * index.js — the server entry point.
 *
 * Binding is not a preference. PROJECT_PLAN.md §9.2 makes loopback-only a
 * non-negotiable constraint, and config.js/config.test.js already enforce the
 * default; this file must not widen it. There is deliberately no --host flag.
 */

import { buildApp } from './app.js';
import { defaultConfig } from './config.js';

const port = Number.parseInt(process.env.PORT ?? '', 10) || defaultConfig.port;

const app = buildApp({ logger: { transport: { target: 'pino-pretty' } } });

try {
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
