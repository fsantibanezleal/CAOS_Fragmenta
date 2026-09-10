# Running the bake

```bash
python -m venv .venv
.venv/bin/pip install -r requirements-precompute.txt

python data-pipeline/run.py                  # every case plus the cross-case benchmark
python data-pipeline/run.py --case real-murgul   # one case, for a fast loop
python data-pipeline/run.py --no-benchmark   # cases only, skipping the slow sweep
python data-pipeline/run.py --validate       # re-check what is already on disk, bake nothing
```

A full bake takes about two minutes on a laptop. Most of it is the learned tier: every real campaign
retrains six models on the corpus minus that campaign, which is nine separate fits of each.

## What it writes

| | |
|---|---|
| `data/derived/<case>/case.json` | one per case, content-addressed |
| `data/derived/manifests/<case>.json` | provenance, flags, the lane verdict, the controls |
| `data/derived/manifests/index.json` | what the web reads first |
| `data/derived/benchmark.json` | the protocol sweep, the reproductions, the seed sweep |

All of it is committed. The web reads only these files.

## It fails rather than shipping something wrong

The last thing `bake_all` does is run the release gate, and it raises if the gate fails. So a bake
either produces a complete, hashed, self-consistent set of artifacts or it produces an error.

Things that stop it:

- a corpus that no longer reproduces its source paper descriptive statistics, or whose digest moved;
- a reconstructed dimension outside the range the source states for that site;
- a learned model whose training rows contain the case it is about to predict;
- a control that did not pass;
- an abstaining cell with no reason;
- a non-finite float anywhere in an artifact.

## Determinism

A bake is a pure function of the case registry, the pinned engine version and the seed. Re-running it
on an unchanged tree produces byte-identical artifacts and leaves git clean.

If it does not, something is reading a wall clock, iterating a set, or stopping on a time limit.
A CI job re-bakes one case into a temporary directory and compares its digest, so this cannot rot
silently.

The temporary directory is not incidental. A test that can overwrite the canonical artifacts can
silently make itself pass.

## Changing the engine version

The engine is pinned by git tag in `requirements-precompute.txt`. Bumping it means:

1. change the pin;
2. re-run the full bake, because every number in every artifact came from that engine;
3. commit the artifacts along with the pin, so the two cannot disagree.

The release gate checks that the artifacts and the installed engine agree on the corpus digest, which
catches the case where the pin moved and the bake did not.
