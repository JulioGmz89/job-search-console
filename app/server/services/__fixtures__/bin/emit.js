#!/usr/bin/env node

/**
 * A stand-in for an upstream script, so `queue/runner.test.js` can assert the
 * runner's behaviour — line splitting, buffering, exit codes, cancellation —
 * without spawning a real scan.
 *
 * Usage: emit.js [--lines N] [--exit N] [--stderr TEXT] [--split] [--hang]
 */

const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i === -1 ? fallback : args[i + 1];
};

const lines = Number(value('--lines', '3'));
const exitCode = Number(value('--exit', '0'));

if (args.includes('--split')) {
  // Two writes that together form one line, then a line with no trailing
  // newline: the two cases a naive `chunk.split('\n')` gets wrong.
  process.stdout.write('first half ');
  process.stdout.write('second half\ntrailing without newline');
} else {
  for (let i = 1; i <= lines; i++) process.stdout.write(`line ${i}\n`);
}

const err = value('--stderr', null);
if (err) process.stderr.write(`${err}\n`);

if (args.includes('--hang')) {
  setInterval(() => {}, 1000);
} else {
  process.exit(exitCode);
}
