# Fragmenta

**Live: [fragmenta.fasl-work.com](https://fragmenta.fasl-work.com)**

[![CI](https://github.com/fsantibanezleal/CAOS_Fragmenta/actions/workflows/ci.yml/badge.svg)](https://github.com/fsantibanezleal/CAOS_Fragmenta/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Fragmenta predicts the mean fragment size x50 of a bench blast from its design and its rock, with ten
published predictors from the 1973 classical equation to the 2025 stacking ensemble, and measures what
each prediction is worth at a mine the model has not seen. It is a test bench over 97 published bench
blasts from ten campaigns in five countries, with two published hold-outs and five field blasts outside
the corpus envelope, and a web application where every model, the learned ones included, recomputes
live on a design you change.

It is for blast engineers deciding how far to trust a fragmentation prediction, for researchers
comparing a predictor on this corpus, and for anyone citing one of the published scores. It is not a
mechanistic simulator and not a production design tool.

## The result

Every predictor runs under three protocols on the same rows: 100 random 80/20 draws (the protocol the
literature reports), 100 draws after collapsing repeated input vectors, and ten whole-campaign hold-outs
with intervals from resampling campaigns. The learned tier is judged by a fixed, test-pinned criterion:
positive variance explained under leave one site out, and at least 0.10 above the null.

<!-- facts:verdict -->
Over every blast (97), the best learned arm held out by site is gradient boosting at -0.034 (-2.23 to 0.42), and the criterion is not met. Over the 91 blasts with resolvable geometry it is stacking ensemble at 0.034 (-1.81 to 0.54), 0.266 above the null, and the criterion is met. The null's held-out predictions correlate with the measurements at -0.79.
<!-- /facts -->

<!-- facts:protocol-gap -->
Median over the learned arms of the random 80/20 median minus the site-held-out score: 0.984; per arm from 0.738 (stacking ensemble) to 4.940 (support vector, polynomial).
<!-- /facts -->

<!-- facts:published-splits -->
- stacking ensemble: published 0.943 on one random split; the reproduced draws have a median of 0.703, and 100 of 100 fall below the published figure.
- support vector, polynomial: published 0.578 on one random split; the reproduced draws have a median of 0.395, and 83 of 100 fall below the published figure.
<!-- /facts -->

What that supports, and what it does not:

- **The learned models lose most of their random-split score when a whole campaign is held out**, on
  both row sets and for every learned arm. Collapsing duplicated inputs does not explain the gap; the
  shared campaign does.
- **With ten campaigns, no arm that was not fitted on the corpus itself has a site-resampled interval
  above zero.** The classical equation scores about 0.30 under every protocol, and about the same with
  its rock factor predicted from the modulus over the other sites, so its score is not borrowed from the
  held-out site; its interval still spans zero.
- **The published regression's held-out score is in sample**: its source fitted it on these same 97
  blasts. Refitted without each site, the same functional form collapses.
- **Whether the learned tier meets the criterion depends on six blasts** (the Miami campaign, which has
  no recoverable geometry), and the product reports it that way.

The numbers in this section are rendered from the committed benchmark by
`scripts/build_docs_results.py`, and a test fails if they go stale. Every tool's role and evidence is
in [docs/relevance.md](docs/relevance.md); the full tables are in [docs/results.md](docs/results.md).

## Other findings

- **The corpus had five transcription errors** against the published tables, two on the measured size.
  The paper prints its own summary statistics; the integrity gate now reproduces them on every load.
- **The corpus is dimensionless, so the classical equation could not run on it.** The source prose gives
  a hole diameter for eight of ten campaigns, a ninth follows from its bench height, and the
  reconstruction holds against all fifteen dimensional constraints the same prose states.
- **The rock factors both papers say they estimated were never printed.** Back-solved from the published
  predictions, they barely vary within a site, which checks the reconstruction in turn.
- **The published equations beat their own papers' tables** on both published hold-outs; where the two
  papers disagree, the recomputation matches the 2010 figure on four of five rows.
- **The published network's hold-out score is not robust to the seed**: reproduced to its specification
  over 30 seeds, every seed falls below the published figure.

## The application

| Route | What it is |
|---|---|
| App | a workbench for one case: Predict, Distribution, Bench (the reconstructed bench in 3D), Rock, What if (every arm live on your design), Decide (P80 against a crusher specification) |
| Introduction | the problem, the relations, the question, the data, the scope |
| Methodology | every predictor term by term, with its source, and the protocols and metrics |
| Implementation | the data and the gate, the geometry, the bake, leakage control, the live lanes, the deploy |
| Experiments | the design, the metrics, coverage, protocol sensitivity, per site, the design response, diagnostics |
| Benchmark | the verdict, every arm, the published hold-outs, the network seeds, robustness, a live re-scoring in the browser, provenance and caveats |

English and Spanish, light and dark. Every number on the documentation pages is read from the committed
artifacts.

## Quick start

```bash
python -m venv .venv
.venv/Scripts/pip install -r requirements-precompute.txt -r requirements-dev.txt   # .venv/bin/ on Linux and macOS

python data-pipeline/run.py             # bake the cases, the models and the benchmark
python data-pipeline/run.py --validate  # re-check what is on disk
pytest                                  # tests against the committed artifacts

cd frontend && npm ci
npm test                                # parity of the browser engine and the portable models
npm run dev                             # http://localhost:5173
```

`scripts/setup.*`, `scripts/dev.*`, `scripts/precompute.*` and `scripts/smoke.*` wrap these for
PowerShell and bash. The engine is published separately: `pip install blastfrag`.

## Tests and gates

| Check | Command | Where it runs |
|---|---|---|
| Python tests (pipeline, contracts, docs generators, framework examples, guards) | `pytest` | before every push |
| parity and portable models | `cd frontend && npm test` | CI and the deploy |
| release gate on the artifacts | `python data-pipeline/run.py --validate` (`scripts/check_artifacts.py`) | after every bake, and in the deploy |
| browser gate (every route, tab, theme, language; figure and footer measurement) | `npm run gate:browser -- --url http://localhost:4173` | before a push, and in the deploy on the build it publishes |
| lint, guards, content standards, Spanish accents, CI budget | `ruff check data-pipeline tests scripts`, `python scripts/check_*.py` | CI |

CI never trains, bakes or runs the Python suite (ADR-0074); the deploy verifies and publishes the
committed artifacts.

## How it is built

The science lives in **[blastfrag](https://github.com/fsantibanezleal/CAOS_BlastFrag)**, a separately
published package this product pins exactly and consumes. This repository holds the product:

| | |
|---|---|
| `data-pipeline/` | the case registry and the staged bake: ingest, preprocess, dataset, features, train, infer, evaluate, export (with each scope's portable models), validate; then the benchmark |
| `data/derived/` | 16 case artifacts, 11 models files, the benchmark and the index, content-addressed |
| `frontend/` | the React application on the shared CAOS app shell, the TypeScript closed forms and the portable-model walker, the browser gate |
| `docs/` | the wiki |

Offline training and measurement, replay of committed artifacts, and two live lanes in the browser (the
closed forms, held to the bake by a parity test; the fitted models, walked exactly from their exported
form and held to the original models by fixtures). See [docs/architecture.md](docs/architecture.md).

## Data and licence

| Set | Rows | Source |
|---|---|---|
| training corpus | 97 | Hudaverdi, Kulatilake and Kuzu 2010, [doi:10.1002/nag.957](https://doi.org/10.1002/nag.957) |
| published hold-outs | 14 | two published sets, [doi:10.1002/nag.957](https://doi.org/10.1002/nag.957), [doi:10.1007/s10706-012-9496-3](https://doi.org/10.1007/s10706-012-9496-3) |
| field blasts | 5 | Sui et al. 2025, [doi:10.3390/app15031254](https://doi.org/10.3390/app15031254), CC BY 4.0 |

Numeric values are experimental facts reused with citation; the articles are not redistributed, and a
guard fails the build if one is committed. The data contract (fields, units, bounds, extrapolation,
missing values, outliers) is in [docs/data/04_data-contract.md](docs/data/04_data-contract.md).

## Scope

No mechanistic simulation (discrete-element, grain-based or hybrid stress models), no non-ideal
detonation, no flyrock, ground vibration or comminution model. The initiation sequence on the Bench tab
is drawn and enters no prediction: the timing factor of the modified classical model is a scalar.
Constants that no held source prints, such as that timing factor and the crush-zone branch, are user
parameters with stated ranges. No passing curve is validated here, because no available dataset carries
a measured one.

## Documentation

[docs/README.md](docs/README.md) is the index: methods, protocols, data, relevance, results,
architecture, frameworks (each with installation, usage and applying pages, and runnable examples),
cases and guides.

## Licence

MIT. See [LICENSE](LICENSE). The engine, blastfrag, is MIT as well.
