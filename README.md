# Fragmenta

[![CI](https://github.com/fsantibanezleal/CAOS_Fragmenta/actions/workflows/ci.yml/badge.svg)](https://github.com/fsantibanezleal/CAOS_Fragmenta/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Live](https://img.shields.io/badge/live-fragmenta.fasl--work.com-informational)](https://fragmenta.fasl-work.com)

Blast-fragmentation prediction on real measured blasts. Twelve competing models, three ways of
splitting the data, and the statistic named (variance explained, not squared correlation).

**[fragmenta.fasl-work.com](https://fragmenta.fasl-work.com)**

---

## The result

With a whole campaign held out, **not one of the six learned models explains any variance**. Every
one falls below predicting a constant. The only two models that hold up on a site they have never
seen are the two whose coefficients are **fixed rather than fitted**.

| Model | Random 80/20 | Deduplicated | Leave one site out |
|---|---|---|---|
| classical mean size | -0.027 | 0.116 | **0.311** |
| published regression | 0.632 | 0.861 | **0.802** |
| random forest | 0.649 | 0.859 | -0.231 |
| gradient boosting | 0.694 | 0.728 | -0.034 |
| stacking ensemble | 0.667 | 0.885 | -0.951 |
| null: predict the mean | -0.052 | -0.007 | -0.216 |

Variance explained about the identity line.

The classical model **improves** under the leave-one-site-out protocol, from negative on a random split to 0.311
with a site held out, because it has nothing to overfit. That inverts the usual reading of it as the
weak baseline.

Deduplication is not the explanation: collapsing the 17 duplicated feature vectors and splitting
randomly *raises* the learned scores. The shared **site** is what was holding them up.

## Why the protocol is the experiment

The 2025 state of the art on this corpus reports 0.943 from a random 80/20 split of 97 rows, 17 of
which duplicate another row's feature vector. The same paper records that cross-validation was tried
and removed because it "had a poor prediction effect on the test set", which is the symptom this
predicts.

Nothing in the literature reports what these models do under a split that does not leak. That is
what this product measures, with the kill criterion declared before the run.

## Four other findings

**The corpus had five transcription errors** against the published tables, two of them on the
variable being predicted. The tell was that the source paper prints its own descriptive statistics
and nothing was reading them. That check now runs on every load.

**The corpus is dimensionless, so the classical model could not run on it at all.** It needs a rock
volume and a charge mass per hole. The source's own prose gives a hole diameter for eight of its ten
sites, which closes the system, and the reconstruction is asserted against **fifteen** dimensional
constraints the same prose states. Nine sites reconstruct; the tenth publishes nothing absolute, so
its six blasts are the geometry negative control and every model that needs a volume abstains there.

**The rock factors both papers say they estimated were never printed.** Back-solving them recovers
values that are near constant within each site, which validates the reconstruction in turn.

**The published equation beats the numbers its own papers printed for it**, by 0.107 and 0.119 in
variance explained on their two hold-outs. Where the two papers disagree with each other, the
recomputation lands on the earlier one four times out of four.

## Running it

```bash
python -m venv .venv && .venv/bin/pip install -r requirements-precompute.txt
python data-pipeline/run.py            # bake every case plus the benchmark
python data-pipeline/run.py --validate # re-check what is already on disk
pytest                                 # tests run against the COMMITTED artifacts

cd frontend && npm ci
npm test                               # the parity gate between the two engines
npm run dev
```

The bake is a pure function of the case registry, the pinned engine version and the seed. Re-running
it in the same environment produces byte-identical artifacts. Re-running it on a different operating
system reproduces every published number to better than 3e-8 relative, measured across all sixteen
cases. Both halves are gated in CI, and the second is a measurement rather than a hope: see
[`docs/architecture/01_the-bake.md`](docs/architecture/01_the-bake.md).

## How it is built

The science lives in **[blastfrag](https://github.com/fsantibanezleal/CAOS_BlastFrag)**, a separately
published package this product pins and consumes. A product declares no package of its own: anything
a third party could use to predict fragmentation without caring about Fragmenta belongs upstream.

What is here is the product.

| | |
|---|---|
| `data-pipeline/` | the case registry and the nine staged bake, none of them a no-op |
| `data/derived/` | 16 content-addressed case artifacts plus a cross-case benchmark, 1.2 MB |
| `frontend/` | the six-route SPA, plus a TypeScript reimplementation of the closed-form models |
| `docs/` | the wiki |

**Nothing is computed at deploy time.** The web replays committed artifacts, and the browser
recomputes the closed forms only so that changing a design moves the curve. That the two engines
agree is a **gate**: 15 parity checks score the TypeScript against the baked numbers point for point
and fail the build on a divergence. It found a ship-blocker on its first run, where Python had
written `NaN` into JSON that no browser can parse.

## The case matrix

16 cases across six categories, each stating in both languages why it is in the matrix. Four exist so
the product **refuses** rather than answers, and they are the first ones to look at when judging
whether its refusals are right:

- **geometry negative control**, six blasts whose absolute scale no source publishes;
- **degenerate negative control**, six designs where the stemming exceeds the bench, refused by every
  model including the ratio-only ones, because the guard sits at the design level;
- **extrapolation control**, five field blasts below the corpus minimum on its most important feature,
  every prediction stamped;
- **positive control**, truth generated by a known model which recovers it at zero error.

Every learned model shown on a real campaign was trained on the corpus **minus that campaign**, and
the bake fails if any of the case's own blasts appear in its training rows.

## Data and licence

| Set | Rows | Source |
|---|---|---|
| training corpus | 97 | Hudaverdi, Kulatilake and Kuzu 2010, `doi:10.1002/nag.957` |
| published hold-out | 14 | the union of two published sets, `doi:10.1007/s10706-012-9496-3` |
| field hold-out | 5 | Sui et al. 2025, `doi:10.3390/app15031254`, CC BY |

Numeric values are experimental facts reused with citation. The source articles are not
redistributed, and a CI guard fails the build if one is ever committed.

## Scope

No mechanistic simulation: there is no discrete-element or hybrid stress blasting model here, and a
hand-rolled approximation under those names would be worse than nothing. No non-ideal detonics. No
flyrock, no ground vibration, no downstream comminution model.

**The initiation sequence is choreography.** The timing factor in the modified classical model is a
scalar with no spatial structure, so changing the tie-in moves the animation and moves no prediction.
The screen says so, permanently.

Model constants that no held source prints, including that timing factor and the crush-zone branch
parameters, are exposed as user-supplied values with documented ranges rather than invented.

## Licence

MIT. See [LICENSE](LICENSE).
