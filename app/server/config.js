/**
 * Server configuration defaults.
 *
 * `host` is not a preference. PROJECT_PLAN.md §9.2 makes local-only binding a
 * non-negotiable constraint: this is a single-user tool holding the user's CV and
 * job-search history, and it must never be reachable from the network. Anything
 * that widens this bind address is a bug, and config.test.js exists to say so.
 */
export const defaultConfig = Object.freeze({
  host: '127.0.0.1',
  port: 4317,
});
