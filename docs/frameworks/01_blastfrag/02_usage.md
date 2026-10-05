# blastfrag: how this product uses it

Every engine call is made during the bake, from `data-pipeline/pipeline/`. The browser never imports
the engine; it reads what the bake wrote, plus the exported models.

| Stage (file) | Engine API | What for |
|---|---|---|
| `stages/ingest.py` | `load_training_corpus` (which runs the integrity gate), `validate_blast`, `datasets.compute_dataset_digest` | load the rows through contract 1; record the digest |
| `stages/preprocess.py` | `reconstruct_pattern`, `verify_reconstruction`, `SITE_ROCK_FACTOR`, `GeometryUnavailable` | the absolute pattern and its constraints; the recovered rock factor; Miami's refusal |
| `stages/dataset.py` | `all_protocols`, `duplicate_groups`, `splits.assert_no_leakage` | the splits, and the assertion that no test row is in training |
| `stages/train.py` | the engine's arm classes, `RefittedRegression`, `KuznetsovTransfer` | fit every arm on the case's training rows |
| `stages/infer.py` | `Kuznetsov`, `KuzRam`, `Swebrec`, `CrushZone`, `GroupDiscriminant`, `PublishedRegression`, `Arm.predict` | every arm on every blast and variant, and the curves |
| `stages/evaluate.py` | `score`, `bootstrap_interval`, `training_mean`, `worst_rows` | variance explained, correlation, the null, the case's intervals |
| `stages/models.py` | `export_arm`, `load_holdout`, `load_field_holdout` | the portable models, and fixtures of the original models at the 116 shipped blasts |
| `stages/benchmark.py` | `run_benchmark`, `default_arms`, `KILL_CRITERION`, `null_model_score`, `summarise_draws`, the diagnostics | the cross-case benchmark |
| `stages/validate.py` | `datasets.DATASET_DIGEST` | the release gate's corpus check |
| `scripts/check_artifacts.py` | (through `validate`) | the deploy's artifact check |

The engine's version is recorded in every artifact (`engine_version`) and in the footer, and the
release gate refuses an index baked from a corpus other than the installed engine's.

## What the product adds on top

- the case matrix (`pipeline/cases/fragmenta_cases.py`): sixteen cases with their reasons, variants and
  controls ([cases](../../cases.md));
- the leakage assertion per case, and the models file per training scope;
- the benchmark artifact's extra blocks: the published reproductions, the 30-seed network sweep, site
  metadata, and the rows the browser re-scores;
- the two contracts' product side (the writer, the typed mirror, the release gate) and the web.

## Upgrading the engine

Bump the pin in `requirements-precompute.txt`, re-run the full bake, run the Python and frontend tests,
regenerate the docs results and drawings, and commit the artifacts with the pin in one change: every
number in every artifact came from the pinned version.

```bash
python data-pipeline/run.py
pytest
python scripts/build_docs_results.py
python scripts/build_architecture_svgs.py
cd frontend && npm test
```
