# 01 · blastfrag

The engine: every model, the corpora with their integrity gate, the geometry reconstruction, the split
protocols, the metrics, the benchmark, the diagnostics and the portable export. A separate repository
([CAOS_BlastFrag](https://github.com/fsantibanezleal/CAOS_BlastFrag)), published on PyPI with trusted
publishing, MIT licence, pinned here at 0.3.0.

| | |
|---|---|
| Lane | offline (the bake) and the deploy's artifact check |
| Used by | every stage of `data-pipeline/`, `scripts/check_artifacts.py` |
| Hard dependency | numpy; the `learned` extra adds scikit-learn and xgboost |
| Pages | [installation](01_blastfrag/01_installation.md) · [usage here](01_blastfrag/02_usage.md) · [applying it](01_blastfrag/03_applying.md) · [example.py](01_blastfrag/example.py) |

## Why it is a separate package

A product declares no package of its own. Anything a third party could use to predict blast
fragmentation without caring about this application belongs in the engine, where it has its own tests,
documentation, versioning and release flow. Keeping the boundary strict keeps the science checkable by
anyone with `pip install blastfrag`, and keeps this repository from holding a private copy of it.

## What it decides here

Every number the site shows comes from an engine call made during the bake: the arms' predictions and
abstentions, the protocols and their intervals, the verdict, the diagnostics and the exported models.
The product decides which cases exist, how they are baked and checked, and how they are shown.

## What would replace it

Nothing else implements this ladder on this corpus. The pieces map to general libraries (scikit-learn
for the learned arms and grouped cross-validation, see [02](02_scikit-learn.md)), but the corpus with
its integrity gate, the geometry reconstruction, the recovered rock factors, the published models'
exact reproductions and the portable export are the engine's own.
