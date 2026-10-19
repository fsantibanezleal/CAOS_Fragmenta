# React and the shell: how this product uses them

## Routes

| Route | Page | Inside the shell |
|---|---|---|
| `/` | the shell's landing, which opens `/introduction` on its executive view | yes |
| `/app` | `workbench/Workbench.tsx`: one shell `CaseWorkbench` for the selected case (Predict, Distribution, Design, Rock, Compare the variants, The case) | yes |
| `/introduction` | `pages/Introduction.tsx` (two views: the executive view from `content/executive.json`, then the technical view) | yes |
| `/methodology` | `pages/Methodology.tsx` (six method topics) | yes |
| `/implementation` | `pages/Implementation.tsx` (twelve topics in four groups) | yes |
| `/experiments` | `pages/Experiments.tsx` (topics in groups of at most six) | yes |
| `/benchmark` | `pages/Benchmark.tsx` (six topics) | yes |
| `/focus/:caseId` | not a page: it forwards to `/app?case=<id>&focus=1`; Focus mode is the shell workbench's `focus` property | no |

## Shell components used

| Component | Where |
|---|---|
| `AppShell` (header, footer, theme, language, architecture modal) | `main.tsx`, configured with the routes, the footer provenance line and `architecture.ts` |
| `SubTabs` (vertical) | the four documentation pages with sections |
| `Tabs`, `CaseSelector` | the workbench |
| `Callout`, `Equation`, `InlineMath`, `Cite`, `Refs` | every documentation page; citations come from `frontend/src/data/citations.ts` (composed from one file per page in `frontend/src/data/citations/`), scoped per section by `SECTION_REFS` |
| `useShellLang` | every bilingual component |

## How the pages get their numbers

`lib/facts.ts` loads the benchmark, the index and a models file once and exposes typed helpers
(`facts(b).site('kuznetsov')`, `f()`, `iv()`). No page types a number that moves with a bake; the browser
gate and the docs generator read the same artifact.

## The footer

One row at every width the gate tests, by a budget measured in pixels (344 px of provenance in English,
259 in Spanish): `Engine: blastfrag (MIT)`, the version, the author, the repository link, the licence and
"Research use only". The gate fails a footer that wraps.
