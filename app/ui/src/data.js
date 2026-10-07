/**
 * data.js — the server's read endpoints as shared, self-refreshing resources.
 *
 * Several surfaces show the same data (the top bar's counts, Today's cards, a
 * page's list), and they must agree. Each resource is fetched once when the
 * first component asks for it, and fetched again when the server's file
 * watcher says one of its files changed (`changed` on /api/events) — whether
 * the app, an upstream script or a Claude Code session wrote it. Nothing
 * polls.
 */

import { useEffect, useSyncExternalStore } from 'react';

import * as api from './api.js';

/** name → how to fetch it, and which changed paths make it stale. */
const RESOURCES = {
  pipeline: { fetch: api.fetchPipeline, on: /^(data\/applications\.md|data\/pdf-index\.tsv|data\/status-log\.tsv|reports\/|output\/)/ },
  reports: { fetch: api.fetchReports, on: /^(reports\/|data\/applications\.md)/ },
  workspace: { fetch: api.fetchWorkspace, on: /^(cv\.md|portals\.yml|config\/|data\/|reports\/|output\/|voice-dna\.md)/ },
  inbox: { fetch: api.fetchInbox, on: /^data\/(pipeline\.md|scan-)/ },
  portals: { fetch: api.fetchPortals, on: /^(portals\.yml|data\/portal-health\.tsv)/ },
  today: { fetch: api.fetchToday, on: null },
  cv: { fetch: api.fetchCvContent, on: /^cv\.md$/ },
  profile: { fetch: api.fetchProfile, on: /^config\/profile\.yml$/ },
  voice: { fetch: api.fetchVoice, on: /^voice-dna\.md$/ },
  samples: { fetch: api.fetchWritingSamples, on: /^writing-samples\// },
  style: { fetch: api.fetchCvStyle, on: /^config\/(cv\/|profile\.yml)/ },
  documents: { fetch: api.fetchCvDocuments, on: /^(output\/|data\/pdf-index\.tsv)/ },
  skipList: { fetch: api.fetchSkipList, on: /^data\/blacklist\.md$/ },
  templates: { fetch: api.fetchCvTemplates, on: /^config\/cv\/templates\// },
  design: { fetch: api.fetchDesignCheck, on: /^(config\/cv\/|output\/)/ },
  skills: { fetch: api.fetchSkills, on: /^(data\/skills\/|cv\.md$|reports\/)/ },
  agent: { fetch: api.fetchAgentStatus, on: /^(cv\.md|config\/profile\.yml|voice-dna\.md)$/ },
};

/** name → {data, error, loading, at} */
const state = new Map();
const listeners = new Set();
const users = new Map();
const inflight = new Map();

const emit = () => listeners.forEach((fn) => fn());
const snapshot = (name) => state.get(name) ?? EMPTY;
const EMPTY = Object.freeze({ data: null, error: null, loading: true, at: 0 });

/** Fetch (or refetch) a resource. Concurrent calls share one request. */
export function reload(name) {
  const def = RESOURCES[name];
  if (!def) throw new Error(`unknown resource ${name}`);
  if (inflight.has(name)) return inflight.get(name);
  const before = snapshot(name);
  if (!before.data) {
    state.set(name, { ...before, loading: true });
    emit();
  }
  const promise = def
    .fetch()
    .then((data) => {
      state.set(name, { data, error: null, loading: false, at: Date.now() });
    })
    .catch((error) => {
      state.set(name, { ...snapshot(name), error, loading: false });
    })
    .finally(() => {
      inflight.delete(name);
      emit();
    });
  inflight.set(name, promise);
  return promise;
}

/** Refetch everything in use whose files changed; the rest is marked stale. */
export function filesChanged(paths) {
  for (const [name, def] of Object.entries(RESOURCES)) {
    if (!def.on || !paths.some((p) => def.on.test(p))) continue;
    if (users.get(name)) reload(name);
    else state.delete(name);
  }
}

/** Write a value we already know (e.g. the response to a save) without a refetch. */
export function setResource(name, data) {
  state.set(name, { data, error: null, loading: false, at: Date.now() });
  emit();
}

/**
 * @param {keyof typeof RESOURCES} name
 * @returns {{data: any, error: Error|null, loading: boolean, reload: () => Promise<void>}}
 */
export function useResource(name) {
  const value = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => snapshot(name),
  );
  useEffect(() => {
    users.set(name, (users.get(name) ?? 0) + 1);
    if (!state.has(name)) reload(name);
    return () => users.set(name, users.get(name) - 1);
  }, [name]);
  return { ...value, reload: () => reload(name) };
}
