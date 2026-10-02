/**
 * browser.js — one warm Chromium for the console's own renders.
 *
 * Upstream's `generate-pdf.mjs` launches a browser per PDF, which is right for
 * a final render and ~1–2 s too slow for a preview that follows every token
 * change (PROJECT_PLAN.md §7c: re-render in under a second). The pool keeps a
 * single browser open while CV Studio is being used, closes it after a quiet
 * spell, and hands out one fresh page at a time.
 *
 * Each page gets the isolation upstream's `renderInPage` gives a CV: its own
 * context with JavaScript off, and every request that is not `file:` or
 * `data:` aborted. The HTML is built from cv.md and a job posting, which are
 * not fully trusted (AGENTS.md), so an injected script cannot run and an
 * injected `<img src="https://…">` cannot beacon out.
 *
 * Renders are serialized: the shared font cache in generate-pdf.mjs and one
 * browser make parallel rendering a memory hazard for no real gain here.
 */

import { randomUUID } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const IDLE_MS = 2 * 60 * 1000;

/**
 * @param {{launch?: () => Promise<object>, idleMs?: number}} [options] - `launch`
 *   is injectable so tests never need Chromium.
 */
export function createBrowserPool({ launch = null, idleMs = IDLE_MS } = {}) {
  let browser = null;
  let launching = null;
  let idle = null;
  let chain = Promise.resolve();

  const doLaunch = async () => {
    if (launch) return launch();
    const { chromium } = await import('playwright');
    return chromium.launch({ headless: true });
  };

  const getBrowser = async () => {
    if (browser && browser.isConnected?.() !== false) return browser;
    if (!launching) {
      launching = doLaunch()
        .then((b) => {
          browser = b;
          b.on?.('disconnected', () => {
            if (browser === b) browser = null;
          });
          return b;
        })
        .finally(() => {
          launching = null;
        });
    }
    return launching;
  };

  const close = async () => {
    if (idle) clearTimeout(idle);
    idle = null;
    const b = browser;
    browser = null;
    if (b) await b.close().catch(() => {});
  };

  const touch = () => {
    if (idle) clearTimeout(idle);
    idle = setTimeout(() => {
      close();
    }, idleMs);
    idle.unref?.();
  };

  /**
   * Load `html` from a `file://` URL in `dir` (so relative resources resolve)
   * and hand the page to `fn`. Serialized with every other call.
   *
   * @template T
   * @param {string} html
   * @param {{dir: string}} where
   * @param {(page: object) => Promise<T>} fn
   * @returns {Promise<T>}
   */
  const withPage = (html, { dir }, fn) => {
    const task = chain.then(async () => {
      const b = await getBrowser();
      mkdirSync(dir, { recursive: true });
      const tmp = join(dir, `.jsc-render-${randomUUID()}.html`);
      writeFileSync(tmp, html, 'utf-8');
      let context = null;
      let page = null;
      try {
        context = b.newContext ? await b.newContext({ javaScriptEnabled: false }) : null;
        page = context ? await context.newPage() : await b.newPage();
        if (page.route) {
          await page.route('**/*', (route) => {
            const url = route.request().url();
            return url.startsWith('file:') || url.startsWith('data:') ? route.continue() : route.abort();
          });
        }
        await page.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
        // Runs in the page, where `document` exists.
        await page.evaluate?.(() => globalThis.document.fonts.ready);
        return await fn(page);
      } finally {
        await page?.close?.().catch(() => {});
        await context?.close?.().catch(() => {});
        rmSync(tmp, { force: true });
        touch();
      }
    });
    // A failed render must not poison the chain for the next one.
    chain = task.catch(() => {});
    return task;
  };

  return { withPage, close };
}

let shared = null;

/** The server's pool, created on first use. */
export function sharedBrowserPool() {
  shared ??= createBrowserPool();
  return shared;
}

export async function closeSharedBrowserPool() {
  if (shared) await shared.close();
}
