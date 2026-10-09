# React and the shell: how this product uses them

## Routes

| Route | Page | Inside the shell |
|---|---|---|
| `/`, `/app` | `workbench/Workbench.tsx`: one shell `CaseWorkbench` for the selected case (Predict, Distribution, Design, Rock, Compare the variants, The case) | yes |
| `/introduction` | `pages/Introduction.tsx` | yes |
| `/methodology` | `pages/Methodology.tsx` (six vertical sub-tabs) | yes |
| `/implementation` | `pages/Implementation.tsx` (eight) | yes |
| `/experiments` | `pages/Experiments.tsx` (seven) | yes |
| `/benchmark` | `pages/Benchmark.tsx` (seven) | yes |
| `/focus/:caseId` | `pages/Focus.tsx`: one case full screen | no: it applies the theme itself |

## Shell components used

| Component | Where |
|---|---|
| `AppShell` (header, footer, theme, language, architecture modal) | `main.tsx`, configured with the routes, the footer provenance line and `architecture.ts` |
| `SubTabs` (vertical) | the four documentation pages with sections |
| `Tabs`, `CaseSelector` | the workbench |
| `Callout`, `Equation`, `InlineMath`, `Cite`, `Refs` | every documentation page; citations come from `data/citations.ts`, scoped per section by `SECTION_REFS` |
| `useShellLang`, `applyTheme`, `readTheme` | every bilingual component; the focus view's own theme |

## How the pages get their numbers

`lib/facts.ts` loads the benchmark, the index and a models file once and exposes typed helpers
(`facts(b).site('kuznetsov')`, `f()`, `iv()`). No page types a number that moves with a bake; the browser
gate and the docs generator read the same artifact.

## The footer

One row at every width the gate tests, by a budget measured in pixels (344 px of provenance in English,
259 in Spanish): `Engine: blastfrag (MIT)`, the version, the author, the repository link, the licence and
"Research use only". The gate fails a footer that wraps.
