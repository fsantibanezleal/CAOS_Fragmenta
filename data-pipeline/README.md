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

Two of them carry the product's guarantees.

`train` fits every learned model on the corpus **minus the case own campaign**, and then asserts it:
the bake fails if any of the case blasts appear in its training rows. Without that, the App would
show a model predicting blasts it was fitted on.

`infer` makes a model **abstain with a reason** rather than answer where it cannot. A blast with no
resolvable geometry, a design with no charge column, a prediction that leaves the physical range:
each produces a refusal that says which and why, and the refusal reaches the screen.

## Determinism

A bake is a pure function of the case registry, the pinned engine version and the seed. In the same
environment it produces byte-identical artifacts and leaves git clean, and a CI job asserts that by
baking one case twice into a sandbox and comparing digests.

Across operating systems the artifact reproduces to a numeric tolerance rather than to a hash, and
the gate compares numbers accordingly. The reason, and the measurement behind the tolerance, are in
[`docs/architecture/01_the-bake.md`](../docs/architecture/01_the-bake.md).

    python scripts/compare_bakes.py            # every case, against what is committed
    python scripts/compare_bakes.py real-murgul --repeat 2

The sandbox is not incidental. A test that can overwrite the canonical artifacts can silently make
itself pass.
