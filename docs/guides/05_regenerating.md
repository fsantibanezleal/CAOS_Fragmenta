# Regenerating the docs and the drawings

Four generated surfaces keep the wiki and the site in step with the artifacts. Each one has a check
that a test runs, so a stale page fails the suite instead of reaching a reader.

| What | Generator | Check | Inputs |
|---|---|---|---|
| `docs/results.md`, `docs/results/*.md` | `python scripts/build_docs_results.py` | `--check`, run by `tests/test_guards.py` | `data/derived/benchmark.json`, the index |
| the `<!-- facts:... -->` blocks in hand-written pages | the same script | the same | the same |
| `frontend/public/svg/tech/*.svg` (the architecture modal) and `docs/assets/arch-*.svg` | `python scripts/build_architecture_svgs.py` | `--check`, run by `tests/test_guards.py` | the benchmark and the index |
| `docs/assets/fig-*.svg` (the method figures) | `node frontend/gates/export-figures.mjs --url http://localhost:4173` | by eye, and the browser gate's figure measurement on the site | the built site |

## Fact blocks

A hand-written page can embed a number that moves with the bake:

    <!-- facts:arm-kuznetsov -->
    (the generator writes the evidence here)
    <!-- /facts -->

The generator fills the block from the benchmark and the check fails when the committed text differs.
The keys are the ones `blocks()` returns in `scripts/build_docs_results.py`: `verdict`, `arm-<arm id>`
for every benchmark arm, `cases`, `seed-sweep`, `width-sweep`, `cap`, `transfer-line`, `holdout-2012`,
`published-splits`, `rock-routes`, `campaigns`, `protocol-gap`, and two measured on the committed files
rather than read from the benchmark: `bake-output` (counts and sizes of what the bake writes) and
`payload` (the site's data). An unknown key, or a block not closed on its own line, fails the generator.

## The drawings

The architecture drawings are written by a Python generator that sizes every box from its text, in both
languages for the modal (two complete layouts, switched by the shell) and in English with fixed light
colours for the wiki, because a markdown image cannot read the page's CSS variables. The method figures
are React components (`frontend/src/viz/Diagrams.tsx`) that also size themselves; the export script
serialises them from the running site with their colours resolved.

## The order after a bake

```bash
python data-pipeline/run.py
python scripts/build_docs_results.py
python scripts/build_architecture_svgs.py
cd frontend && npm run build && npm run preview &   # then:
node gates/export-figures.mjs --url http://localhost:4173
npm run gate:browser -- --url http://localhost:4173
```

Commit the artifacts and everything regenerated in the same change.
