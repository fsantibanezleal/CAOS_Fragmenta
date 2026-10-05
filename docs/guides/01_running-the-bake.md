# Running the bake

```bash
python -m venv .venv
.venv/Scripts/pip install -r requirements-precompute.txt -r requirements-dev.txt   # .venv/bin/ elsewhere

python data-pipeline/run.py                        # every case, the models and the benchmark
python data-pipeline/run.py --case real-murgul     # one case, for a fast loop
python data-pipeline/run.py --no-benchmark         # cases and models only
python data-pipeline/run.py --validate             # re-check what is on disk, bake nothing
python data-pipeline/run.py --n-seeds 30           # the network seed sweep width (30 is the default)
```

`scripts/precompute.ps1` and `scripts/precompute.sh` wrap the full bake. Most of the time goes to the
benchmark (100 draws of two random protocols, ten site folds, and the 30-seed network sweep), and within
it to the network's Levenberg-Marquardt training; the engine measures its own benchmark at about two and
a half minutes on a desktop CPU.

## What it writes

| File | What it is |
|---|---|
| `data/derived/<case>/case.json` | one per case: blasts, patterns, predictions or abstentions, scores, curves, variants, controls, provenance |
| `data/derived/models/<scope>.json` | one per training scope: the fitted learned arms, exported, with fixtures |
| `data/derived/manifests/<case>.json` | the case's lane measurement, flags, controls and provenance |
| `data/derived/manifests/index.json` | what the web reads first: every file with its size and digest |
| `data/derived/benchmark.json` | the cross-case benchmark (`fragmenta.benchmark/v2`) |

All of it is committed; the web reads only these files.

## It fails rather than shipping something wrong

The last thing the bake does is run the release gate over everything it wrote, and it raises if the gate
fails. Things that stop it: a corpus that no longer reproduces its source's summary table or whose digest
moved; a reconstructed dimension outside the range the source states; a learned model whose training rows
contain the case it predicts; a control that did not pass; an abstention without a reason; a non-finite
float; a digest that does not match its file or the index; a case pointing at a models file that is not
its own scope's.

## After a bake

```bash
pytest                                   # against the committed artifacts
python scripts/build_docs_results.py     # the docs results pages and fact blocks
python scripts/build_architecture_svgs.py
cd frontend && npm test && npm run build
```

Then commit the artifacts, the regenerated docs and drawings together. The tests fail if the docs or the
drawings disagree with the artifacts ([05](05_regenerating.md)).

## Determinism

Run twice in the same environment, the bake writes byte-identical artifacts:

```bash
python scripts/compare_bakes.py real-murgul --repeat 2
```

If two bakes differ, something is reading a wall clock, iterating an unordered set, or stopping on a
time limit. On a different operating system the bake reproduces to a numeric tolerance instead, because
two builds of the same numpy can reduce in a different order; `python scripts/compare_bakes.py` compares
every number in every case and in its models file, and fails above a relative 1e-6. Measured at
0.06.000 between Windows and Linux: 2.7e-08 at worst in a case, 7.0e-07 in a models file, on a
near-zero network weight ([architecture/01](../architecture/01_the-bake.md)).
Both bake into a temporary directory, never the canonical tree. They run on a developer machine before a
release; CI does not bake (ADR-0074).

## Upgrading the engine or the training stack

1. change the exact pin in `requirements-precompute.txt`;
2. re-run the full bake, because every number came from the pinned versions;
3. run the tests and regenerate the docs and drawings;
4. commit the pin, the artifacts and the docs in one change.

The release gate checks that the artifacts and the installed engine agree on the corpus digest, which
catches a pin that moved without a bake.
