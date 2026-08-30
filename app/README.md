# `app/` — the Job Search Console application

Everything this fork owns lives here: the Node backend, the headless agent runner, the
skills-gap layer, and the web UI. Nothing upstream touches this directory, which is what
keeps merges from [career-ops](https://github.com/santifer/career-ops) cheap. See
[PROJECT_PLAN.md §5](../PROJECT_PLAN.md) for the target layout.

It is a **separate npm package** with its own lockfile — the same pattern upstream uses
for `web/` — so the root `package.json` stays mergeable. Source files are `.js`, not
`.mjs`, so upstream's root `npm run lint` (which syntax-checks every `.mjs` in the
repository) never reaches into this tree.

```sh
npm install
npm run lint     # eslint, flat config
npm test         # node --test
```

CI (`.github/workflows/app-ci.yml`) runs both on Node 22 and 24 for any PR touching
`app/**`.

Currently a skeleton: `server/config.js` holds the loopback-only bind address that
[PROJECT_PLAN.md §9.2](../PROJECT_PLAN.md) requires. The server itself arrives with M1.
