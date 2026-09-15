/**
 * assemble.js — build the self-contained system prompt for one headless run.
 *
 * Upstream's modes are written for an interactive session that has already
 * loaded `AGENTS.md` and can ask the user questions. A `claude -p` worker has
 * neither, so — exactly as `batch/batch-runner.sh` does for batch evaluations —
 * the prompt is assembled here from the same files the skill router loads
 * (`.agents/skills/career-ops/SKILL.md` "Context Loading by Mode"):
 *
 *   language directive → modes/_shared.md → modes/_profile.md → modes/_custom.md
 *   → modes/<mode>.md → config/profile.yml (fenced) → the fork's headless overlay
 *   → voice-dna.md (pdf and cover only)
 *
 * The overlay (`prompts/<mode>.md`) is the only fork-authored prose. It tells
 * the mode what is different when nobody is watching: which questions not to
 * ask, that the report number is already reserved, and which fork-owned render
 * command replaces upstream's. The mode files themselves are read verbatim
 * (PROJECT_PLAN.md §4: never edited), so an upstream improvement to a mode
 * reaches headless runs on the next merge with no work here.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { outputLanguageInstruction, parseOutputLanguage } from '../../../../profile-language.mjs';
import { readProfile } from '../profile.js';

const here = dirname(fileURLToPath(import.meta.url));

/** Upstream mode file behind each run kind, and which context files it loads. */
export const MODES = Object.freeze({
  evaluate: { mode: 'oferta', shared: true, voice: false },
  pdf: { mode: 'pdf', shared: true, voice: true },
  cover: { mode: 'cover', shared: false, voice: true },
});

export class PromptError extends Error {
  constructor(message, { code, status = 500 } = {}) {
    super(message);
    this.name = 'PromptError';
    this.code = code;
    this.status = status;
  }
}

const read = (path) => (existsSync(path) ? readFileSync(path, 'utf-8') : null);

/** Substitute `{{NAME}}` placeholders; any left over is a bug, not a prompt. */
export function fillTemplate(template, vars) {
  const out = template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, name) => {
    if (!(name in vars) || vars[name] === undefined || vars[name] === null) return match;
    return String(vars[name]);
  });
  const left = out.match(/\{\{[A-Z0-9_]+\}\}/g);
  if (left) {
    throw new PromptError(`Prompt overlay has unfilled placeholders: ${[...new Set(left)].join(', ')}`, {
      code: 'prompt-placeholder',
    });
  }
  return out;
}

/** A markdown section wrapping a file's contents, with its path as the heading. */
const section = (title, body) => `\n\n---\n\n## ${title}\n\n${body.trim()}\n`;

/**
 * @param {object} options
 * @param {'evaluate'|'pdf'|'cover'} options.mode
 * @param {string} options.repoRoot - Where upstream's `modes/` live.
 * @param {string} options.root - The data root (profile.yml, voice-dna.md).
 * @param {object} options.vars - Overlay placeholders.
 * @returns {{system: string, sections: string[], warnings: string[]}}
 */
export function assemblePrompt({ mode, repoRoot, root, vars }) {
  const def = MODES[mode];
  if (!def) throw new PromptError(`No prompt for mode "${mode}"`, { code: 'mode-unknown', status: 400 });

  const profile = readProfile({ root });
  const sections = [];
  const warnings = [];
  const parts = [];

  parts.push(`# Headless ${def.mode} run\n\n${outputLanguageInstruction(parseOutputLanguage(profile.yaml ?? ''))}`);
  sections.push('language');

  const modesDir = join(repoRoot, 'modes');
  const include = (relative, { required = false } = {}) => {
    const text = read(join(modesDir, relative));
    if (text === null) {
      if (required) throw new PromptError(`Missing upstream mode file modes/${relative}`, { code: 'mode-missing' });
      return;
    }
    parts.push(section(`modes/${relative}`, text));
    sections.push(`modes/${relative}`);
  };

  if (def.shared) include('_shared.md', { required: true });
  include('_profile.md');
  include('_custom.md');
  if (def.voice) include('_writing.md');

  // A localized mode (`language.modes_dir`, e.g. modes/es/oferta.md) replaces
  // the English one when it exists; the directive above still fixes the output language.
  const localized = profile.modesDir ? `${profile.modesDir}/${def.mode}.md` : null;
  if (localized && existsSync(join(modesDir, localized))) include(localized, { required: true });
  else include(`${def.mode}.md`, { required: true });

  if (profile.yaml) {
    parts.push(section('Runtime personalization: config/profile.yml', `\`\`\`yaml\n${profile.yaml.trim()}\n\`\`\``));
    sections.push('config/profile.yml');
  } else {
    warnings.push('config/profile.yml is missing — the mode will run with no candidate profile');
  }
  if (profile.error) warnings.push(profile.error);

  const overlay = read(join(here, `${mode}.md`));
  if (overlay === null) throw new PromptError(`Missing overlay prompts/${mode}.md`, { code: 'overlay-missing' });
  parts.push(section(`Headless run: what is different (job-search-console)`, fillTemplate(overlay, vars)));
  sections.push(`overlay:${mode}`);

  if (def.voice) {
    const voice = read(join(root, 'voice-dna.md'));
    if (voice) {
      parts.push(
        section(
          'Voice DNA (apply)',
          `The user's \`voice-dna.md\`, reproduced here so you do not have to read it. Apply it as \`modes/_writing.md\` describes: Tier 1 everywhere, Tier 2 only to letters.\n\n${voice}`,
        ),
      );
      sections.push('voice-dna.md');
    }
  }

  return { system: parts.join(''), sections, warnings };
}

/** Persist the assembled prompt where the CLI can read it and a human can inspect it. */
export function writePromptFile({ root, runId, text }) {
  const dir = join(root, 'data', 'jsc', 'prompts');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${runId}.md`);
  writeFileSync(path, text, 'utf-8');
  return path;
}
