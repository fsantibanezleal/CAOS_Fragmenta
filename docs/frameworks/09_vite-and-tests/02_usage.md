# Vite and the tests: how this product uses them

## The build

| Step | File | What it does |
|---|---|---|
| prebuild | `copy-data.mjs` | copies `data/derived/` into `public/data/`; fails if the index declares a case or a models file that is not on disk |
| type check | `tsc --noEmit` | the pages against the typed mirror of the artifacts (`lib/contract.types.ts`) |
| bundle | `vite.config.ts` | the SPA; the app version from `../VERSION` |
| postbuild | `spa-404.mjs` | a real `index.html` at every route path, read from the index, so deep links answer 200 |

## The tests

| File | What it holds |
|---|---|
| `test/parity.test.ts` | the TypeScript closed forms against the baked numbers on every blast of every case; the typed mirror against the fields the artifacts actually carry |
| `test/learned.test.ts` | the portable-model walker against the original models' fixtures in every models file; the replayed learned predictions against the shipped models; refusal of an implausible design |

They read the committed artifacts, not a fresh bake, because the committed artifacts are what the site
serves.
