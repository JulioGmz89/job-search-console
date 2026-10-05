#!/usr/bin/env node

/**
 * persona-prompt.mjs — the exact brief a blind persona-tester receives.
 *
 *   node app/ux/persona-prompt.mjs --persona P2 --task T1 --url http://127.0.0.1:4450/
 *   node app/ux/persona-prompt.mjs --task T1 --state     # prints the task's sandbox state and flags
 *
 * The brief is assembled only from personas.md (the persona card) and tasks.md
 * (the goal, verbatim, and the step budget), so every run of a pair — in M6 and
 * again in M8 — gets the same words, and nothing from the expected paths ever
 * reaches the tester.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const here = dirname(fileURLToPath(import.meta.url));
const { values: opts } = parseArgs({
  options: {
    persona: { type: 'string' },
    task: { type: 'string' },
    url: { type: 'string', default: 'http://127.0.0.1:4450/' },
    state: { type: 'boolean', default: false },
  },
});

/** The section of a markdown file from `## <id> ` to the next `## `. */
function section(file, id) {
  const text = readFileSync(join(here, file), 'utf-8');
  const start = text.search(new RegExp(`^## ${id}\\b`, 'm'));
  if (start === -1) throw new Error(`${id} not found in ${file}`);
  const rest = text.slice(start + 3);
  const end = rest.search(/^## /m);
  return end === -1 ? rest : rest.slice(0, end);
}

/** The blockquote that follows a marker line, with the `>` prefixes removed. */
function quoteAfter(text, marker) {
  const lines = text.split(/\r?\n/);
  const at = lines.findIndex((l) => marker.test(l));
  if (at === -1) throw new Error(`no ${marker} block`);
  const out = [];
  for (const line of lines.slice(at + 1)) {
    if (/^\s*>/.test(line)) out.push(line.replace(/^\s*> ?/, ''));
    else if (out.length) break;
  }
  return out.join('\n').trim();
}

const task = section('tasks.md', opts.task);
const budget = Number(/\*\*Step budget:\*\*\s*(\d+)/.exec(task)?.[1] ?? 40);
const startLine = /\*\*Start state:\*\*\s*(.+)/.exec(task)?.[1] ?? '';
const state = /`(empty|populated|broken)`/.exec(startLine)?.[1] ?? 'populated';
const delay = /--delay (\d+)/.exec(startLine)?.[1] ?? '8000';
const scenario = /--scenario (\S+?)`?[\s)]/.exec(startLine)?.[1] ?? 'auto';

if (opts.state) {
  console.log(JSON.stringify({ task: opts.task, state, delay: Number(delay), scenario, budget }));
  process.exit(0);
}

const card = quoteAfter(section('personas.md', opts.persona), /^### Persona card/);
const goal = quoteAfter(task, /\*\*Goal \(give verbatim\):\*\*/);
const runId = `${opts.persona}-${opts.task}`;

console.log(`Run id: ${runId}
URL: ${opts.url}
Step budget: ${budget} browser actions

Your persona card:

${card}

Your goal, in your own words:

${goal}

Follow your instructions: start by navigating to the URL above, work only from what the screen shows, save your screenshots under app/ux/runs/${runId}/, and return your complete transcript as your final reply. End the transcript's Steps with what you would tell a friend about the result (your answer to the goal, if it asks you to tell something).`);
