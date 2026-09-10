# data-pipeline/

The offline bake. Plain scripts, invoked by path, never installed.

```bash
python data-pipeline/run.py            # bake every case plus the benchmark
python data-pipeline/run.py --validate # re-check what is on disk, bake nothing
```

This directory is **not a package**. This repo has no `[project]` block, no build backend and nothing
to `pip install -e`. A product declares no package of its own; the reusable science is the separate
published `blastfrag` repo, which this pipeline consumes as a pinned dependency. A CI guard fails the
build if a package declaration ever appears here.

## Layout

| | |
|---|---|
| `run.py` | the entry point |
| `pipeline/pipeline.py` | the orchestrator, and the release gate that can refuse a bake |
| `pipeline/registry.py` | the sixteen cases, grouped by category |
| `pipeline/cases/` | what each case is and why it is in the matrix, in both languages |
| `pipeline/model/` | the only code shared across lanes: cases to blasts, and the degenerate-design guard |
| `pipeline/io/contract.py` | contract 1, ingestion |
| `pipeline/core/` | the manifest schema, the lane gate, seeded randomness |
| `pipeline/stages/` | the nine stages |

## The stages

`ingest`, `preprocess`, `dataset`, `feature_extraction`, `train`, `infer`, `evaluate`, `export`,
`validate`.

None of them is a no-op. Each is deterministic, typed and seeded, and each writes a typed result the
next one consumes. The full account is in
[`docs/architecture/01_the-bake.md`](../docs/architecture/01_the-bake.md).

Two of them carry the product honesty.

`train` fits every learned model on the corpus **minus the case own campaign**, and then asserts it:
the bake fails if any of the case blasts appear in its training rows. Without that, the App would
show a model predicting blasts it was fitted on.

`infer` makes a model **abstain with a reason** rather than answer where it cannot. A blast with no
resolvable geometry, a design with no charge column, a prediction that leaves the physical range:
each produces a refusal that says which and why, and the refusal reaches the screen.

## Determinism

A bake is a pure function of the case registry, the pinned engine version and the seed. Re-running it
on an unchanged tree produces byte-identical artifacts and leaves git clean, and a CI job asserts
that by re-baking one case into a sandbox and comparing digests.

The sandbox is not incidental. A test that can overwrite the canonical artifacts can silently make
itself pass.
