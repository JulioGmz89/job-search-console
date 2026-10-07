#!/usr/bin/env node

/**
 * pair.mjs — one simulated persona run of the M8 re-measure (§12.2 method 5).
 *
 *   node app/ux/m8/pair.mjs start  --persona P2 --task T1 [--port 4460]
 *   node app/ux/m8/pair.mjs finish --persona P2 --task T1
 *
 * `start` launches a fresh sandbox in the task's state (persona-prompt.mjs
 * --state decides state, delay and scenario), waits for SANDBOX_READY, and
 * writes app/ux/m8/runs/<P-T>/brief.md (the exact blind brief) and
 * sandbox.json. The sandbox keeps running in the background.
 *
 * `finish` runs check-task.mjs against that sandbox with the tester's
 * transcript, writes verdict.md beside it, and stops the sandbox.
 */

import { execFileSync, spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const here = dirname(fileURLToPath(import.meta.url));
const ux = resolve(here, '..');
const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: { persona: { type: 'string' }, task: { type: 'string' }, port: { type: 'string', default: '4460' } },
});
const [command] = positionals;
const id = `${opts.persona}-${opts.task}`;
const dir = join(here, 'runs', id);
const node = (script, args) => execFileSync(process.execPath, [join(ux, script), ...args], { encoding: 'utf-8' });

async function start() {
  mkdirSync(dir, { recursive: true });
  const flags = JSON.parse(node('persona-prompt.mjs', ['--task', opts.task, '--state']));
  const log = join(dir, 'sandbox.log');
  const out = openSync(log, 'w');
  const child = spawn(
    process.execPath,
    [join(ux, 'sandbox.mjs'), '--state', flags.state, '--port', opts.port, '--delay', String(flags.delay), '--scenario', flags.scenario],
    { detached: true, stdio: ['ignore', out, out], windowsHide: true },
  );
  child.unref();
  closeSync(out);
  for (let i = 0; i < 120; i++) {
    const ready = /SANDBOX_READY (.+)/.exec(readFileSync(log, 'utf-8'))?.[1];
    if (ready) {
      const info = JSON.parse(ready);
      writeFileSync(join(dir, 'sandbox.json'), `${JSON.stringify({ ...info, pid: child.pid, flags }, null, 2)}\n`);
      // The M6 brief, word for word, except where the run's files go: M8's go
      // under app/ux/m8/runs/, and the tester writes its own transcript there.
      const brief = node('persona-prompt.mjs', ['--persona', opts.persona, '--task', opts.task, '--url', info.url])
        .replace(`save your screenshots under app/ux/runs/${id}/`, `save your screenshots under app/ux/m8/runs/${id}/`)
        .replace(
          'and return your complete transcript as your final reply.',
          `write your complete transcript (in the format your instructions give) to app/ux/m8/runs/${id}/transcript.md, and reply with only its Outcome and Single Ease Question lines.`,
        );
      writeFileSync(join(dir, 'brief.md'), brief);
      console.log(JSON.stringify({ id, url: info.url, state: info.state, budget: flags.budget }));
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`sandbox for ${id} did not start; see ${log}`);
}

function finish() {
  const info = JSON.parse(readFileSync(join(dir, 'sandbox.json'), 'utf-8'));
  const transcript = join(dir, 'transcript.md');
  const args = ['--task', opts.task, '--url', info.url, '--info', JSON.stringify(info), '--out', join(dir, 'verdict.md')];
  if (existsSync(transcript)) args.push('--answer-file', transcript);
  const verdict = node('check-task.mjs', args);
  console.log(/\*\*Verified outcome:\*\* (\w+)/.exec(verdict)?.[0] ?? verdict);
  try {
    if (process.platform === 'win32') execFileSync('taskkill', ['/pid', String(info.pid), '/T', '/F'], { stdio: 'ignore' });
    else process.kill(-info.pid);
  } catch {
    // Already gone.
  }
}

if (command === 'start') await start();
else if (command === 'finish') finish();
else {
  console.error('Usage: node app/ux/m8/pair.mjs start|finish --persona P1 --task T1 [--port 4460]');
  process.exit(2);
}
