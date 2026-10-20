# Software design document: Fragmenta

ADR-0075 asks for this document before the code. **For everything up to 0.05.001 it was written afterwards, on
2026-10-05**, from the code, the tests, the plan and the research dossiers that preceded them, and it says so:
each retroactive requirement in `features/` names the test or gate that already held it, and its convergence
was checked by running it. The units of the 2026-10-05 gap cycle (`features/benchmark-0-4/`,
`features/non-circularity/`, `features/hygiene/`, `features/workbench-on-the-base/`,
`features/response-surface/`) were designed here before their code. **Release 0.08.000 (shell 0.15.0, template
0.08.002) was designed from its sizing and its contract catalog before its units were built; this document and its
feature folder `features/base-0-08/` were completed after them, on 2026-10-18, from the code, the tests, the catalog
and the measurements, and say so where it matters.** Release 0.09.000 (shell 0.18.0, template 0.10.000) was planned before its
units in CAOS_MANAGE `plans/fragmenta/plan.md` section 11 (every dependency at its current release, the charts on the shell's
`UPlotChart`, the notebooks and the README by areas); the base changes it needed were made in the shell first (0.17.0, 0.18.0). The science is designed in the engine's own SDD
(`docs/design/SDD.md` in CAOS_BlastFrag). The layout of this area is in [`README.md`](README.md).

## Problem and non-goals

Fragmenta answers what a prediction of the mean fragment size `x50` of a bench blast is worth at a mine the model
has not seen. It runs the published predictors, from the 1973 classical equation to the 2025 stacking ensemble,
over sixteen cases built on 97 published bench blasts, and scores them under the protocol the literature reports
and under protocols that hold out whole campaigns. The reader is a blast engineer deciding how far to trust a
prediction, or a researcher comparing a predictor on this corpus.

Non-goals, each something a reader could reasonably assume:

- **A mechanistic blast simulator**: no discrete-element, grain-based or hybrid stress model.
- **A production design tool**: no predictor here is validated for a new mine; with ten sites no arm fitted
  without the corpus has a site-resampled interval above zero.
- **A validated passing curve**: no available dataset carries a measured size distribution.
- **Timing physics**: the initiation sequence of the bench view (the Design group) is drawn and enters no
  prediction; the timing factor of the modified classical model is a scalar.
- **Flyrock, vibration, comminution**: none is modelled; the crusher comparison (Distribution, "Against a
  target") is a labelled proxy.
- **A package**: the product declares none (ADR-0057); the engine is `blastfrag` on PyPI, pinned exactly.

## Executive brief

The executive view of the Introduction is data, kept apart from this document. One file frames the problem space of
blast fragmentation for a decision maker, in English and Spanish, with a linked source for every figure and claim.
It was written from the problem-context research before the view was built, is valid against the shell's
`executive.schema.json` 2.0.0, and is rendered by the shell as the first view of the Introduction, where the product
lands. This document names the file and restates nothing of it.

Data file: content/executive.json

## Research basis

Done before the plan, and kept here so a reader can re-check it (ADR-0075). The research is five dossiers on the
method survey, the datasets, the pipelines, the validation and the visualization (2026-09-09), and one on the problem
context of the executive view (2026-10-16); this table is their decisions claim by claim, each with its source. A
figure stated here was read at its source or measured on the shipped data in the dossier that records it.

| decision | what the research found | source |
|---|---|---|
| The classical rung is the Kuznetsov mean size with the Cunningham strength factor, exponent 19/30 on the relative weight strength | Two published forms of the factor disagree (19/30 and 19/20); back-solving the rock factor from the published Kuz-Ram column with 19/30 and a relative weight strength of 100 returns a value near constant within each site, within 0.6% to 3% | Hudaverdi, Kulatilake and Kuzu 2010, https://doi.org/10.1002/nag.957; Amoako, Jha and Zhong 2022, https://doi.org/10.3390/mining2020013 |
| The rock factor ships as three named schemes side by side, never one | The two published Lilly rating tables differ in the strength term (0.05 UCS against UCS/3 or UCS/5), which moves the factor by up to 0.85 on the same rock | Hudaverdi et al. 2010, https://doi.org/10.1002/nag.957; Babaeian et al. 2019, https://doi.org/10.1016/j.jrmge.2018.11.006 |
| The size distribution ships Rosin-Rammler, Swebrec and a two-branch crush-zone composition, with Swebrec not presented as strictly better | Swebrec has three parameters and fixes both tails, and a 24-blast bauxite site fitted Rosin-Rammler closer to image analysis than Swebrec | Ouchterlony 2005, https://doi.org/10.1179/037178405x44539; Babaeian et al. 2019, https://doi.org/10.1016/j.jrmge.2018.11.006 |
| The timing factor is a user-set scalar on the mean size, and the initiation sequence of the bench view is drawn and enters no prediction | The functional forms of the timing factor and the crush-zone branch constants are not printed in the source held; only the aggregate inter-hole delay moves the number | Amoako et al. 2022, https://doi.org/10.3390/mining2020013 |
| The statistical rung is the group discriminant and the two group regressions, entered as published | 97 blasts split into 35 (high modulus) and 62 (low modulus) by clustering; the modulus is the dominant discriminator | Hudaverdi et al. 2010, https://doi.org/10.1002/nag.957; Kulatilake, Hudaverdi and Wu 2012, https://doi.org/10.1007/s10706-012-9496-3 |
| The back-propagation network is 7-N-1, Levenberg-Marquardt, one per group, with the width swept from 6 to 15 and 8 simulations per width | The source fully specifies it, with optima N = 9 for group 1 and N = 7 for group 2 | Kulatilake et al. 2012, https://doi.org/10.1007/s10706-012-9496-3 |
| Support vector regression ships with both published kernels | The two studies on the same 97 blasts reach opposite kernel conclusions (rbf with C = 5.25 and epsilon = 0.04; polynomial of degree 5 with C = 1) | Amoako et al. 2022, https://doi.org/10.3390/mining2020013; Sui et al. 2025, https://doi.org/10.3390/app15031254 |
| The ensemble is random forest and XGBoost under a linear meta-learner, as published | The published split is random 80/20 and reports a variance explained of 0.943; cross-validation was tried and removed by the authors | Sui et al. 2025, https://doi.org/10.3390/app15031254 |
| The corpus is the 97 published blasts at ten sites, checked against the source's own descriptive statistics at ingest | Five transcription defects were found in a vault copy (two on the regression target) by comparing every cell with the paper's tables | Hudaverdi et al. 2010, https://doi.org/10.1002/nag.957 |
| Absolute geometry is reconstructed for 91 of the 97 blasts, and the six Miami blasts abstain on every arm that needs a volume or a charge | The site narratives give a diameter for eight of ten sites; the Murgul narrative constraints (three) are reproduced exactly by one rule; Soma carries one recorded burden conflict | Hudaverdi et al. 2010, https://doi.org/10.1002/nag.957 |
| Every figure carries the name of its statistic; the Pearson r2 and the variance explained about the identity line are never written as a bare R2 | On the published 12-blast hold-out the Kuz-Ram parity fit is 0.5698 (the paper reports 0.5697) while its variance explained about the identity line is 0.2318 | Kulatilake et al. 2012, https://doi.org/10.1007/s10706-012-9496-3 |
| Every learned arm is scored under three protocols (random, deduplicated random, held out by site), and the held-out-by-site score leads | 17 of the 97 rows duplicate another row's feature vector (7 vectors), a hold-out blast (En13) has the inputs of a training blast (En4), and one blast (Rc1) sits in both sets; a random split places duplicates on both sides | Kulatilake et al. 2012, https://doi.org/10.1007/s10706-012-9496-3; Sui et al. 2025, https://doi.org/10.3390/app15031254 |
| The resampling unit of an interval is the site under the grouped protocol | Cross-validation that ignores dependence in the data can seriously underestimate prediction error | Roberts et al. 2017, https://doi.org/10.1111/ecog.02881 |
| Five field blasts from a granite mine are a third hold-out, stamped as an extrapolation | Their modulus (5.6 GPa) is below the training minimum (9.57 GPa); the values are numeric facts from an open-access article | Sui et al. 2025, https://doi.org/10.3390/app15031254 |
| The executive view states that concentrators take 53.2 percent of the electricity of Chilean copper mining in 2023, with the unit electricity per tonne of fine copper up 113.9 percent from 2001 to 2023 | The report prints 53.2 percent in its section 4.2 and in its own totals (a misprint of 55.2 elsewhere in the report was corrected in the executive review) | Cochilco 2024, https://www.cochilco.cl/web/download/816/2024/13426/informe-de-consumo-de-energia-al-2023.pdf |
| Drilling and blasting are 12 to 15 percent of total mining costs while downstream gains are reported by the plant | Integrated blasting and comminution programmes report about 5 to 20 percent higher concentrator throughput at many operations | AusIMM 2008, https://onemine.org/documents/the-use-of-electronic-detonators-as-a-key-to-reducing-overall-mining-costs; Esen et al. 2007, https://ausimm.com/publications/conference-proceedings/explo-2007/integration-and-optimisation-of-blasting-and-comminution-processes |
| The post-blast Bond work index falls as the specific charge rises, so the effect on the plant depends on the site | Seven blasts of a limestone quarry, 0.33 to 0.49 kilograms per cubic metre and 7.8 to 13.8 kilowatt-hours per tonne; the study states the index decreased as the charge increased | Ongen 2025, https://www.irsm.cas.cz/materialy/acta_content/2025_doi/Ongen_AGG_2025_0005.pdf |
| The mine and the plant run on separate budgets and indicators, so the decision is taken without the downstream value | The abstract states that the separate indicators often reduce each other's output | Cebrian and Carrasco 2014, https://www.onemine.org/documents/mining-and-fragmentation-proposal-for-a-more-efficient-mine-management |
| Learned predictors are tested here on whole held-out sites, because the published ones are single-site | The abstracts of the learned-predictor studies do not say that a whole mine was held out | Chen et al. 2025, https://doi.org/10.1007/s00521-025-11321-3; Gebretsadik et al. 2024, https://doi.org/10.1007/s42452-024-05888-0 |
| Requirements are written in EARS form, each with its gate | The five EARS patterns used in the requirements files | Mavin et al. 2009, https://doi.org/10.1109/RE.2009.9 |

Choices with no source because they are the product's own: the kill criterion (the learned tier generalises across
sites only if the best learned arm's variance explained held out by site is positive and at least 0.10 above the
null's, declared and hash-pinned in the engine before the run), the sixteen cases, the six question groups of the App
(grouped by the question, not by the method list, to stay at six peers), and the choice of one theme-aware inline SVG
per figure.

UNVERIFIED: the primary texts of Cunningham 1983, 1987 and 2005 and of the 1999 crush-zone and two-component papers
were not held; the preference for the exponent 19/30 is confirmed on this corpus by the back-solved rock factors, not
against Cunningham's own text, and the timing and crush-zone constants are user-set for that reason.

UNVERIFIED: which burden the authors of the Soma narrative intended (5 m with a 175 mm hole, or 6 m with a 210 mm
hole); the product uses 210 mm and carries the discrepancy as a note of the case.

UNVERIFIED: the DOIs and URLs above were not resolved again by this unit; they are as the dossiers recorded them when
the sources were opened (2026-09-09 and 2026-10-16). For the 2007, 2008 and 2014 conference works only the abstracts
were read (the full texts are paywalled), so their rows restate what the abstract states.

## Sizing and contracts

The design rests on two artifacts of contract-first parallel delivery (ADR-0080): the sizing, kept with the
coordination records outside the product (for this release: the repositories, the components, the modules with their
owner units, ten boundaries, the technology versions verified on primary sources on 2026-10-16, the machine limits and
the parallel units with disjoint write scopes), and the contract catalog kept here,
[`docs/contracts/catalog.md`](../contracts/catalog.md). Of the ten boundaries, eight are catalog rows; the other two
are the parity of the browser's closed forms and walker with the committed documents
(`frontend/test/parity.test.ts`) and the executive file against the shell's schema (`scripts/check_sdd.py`). Every
catalog row has one schema file, an example, a producer test and a consumer test, its missing-data behavior, a
provider and a swap test.

| id | version | boundary | schema file |
|---|---|---|---|
| blast-record | 1.0.0 | contract 1, ingestion: one corpus row, the seven features within the engine's bounds (`data-pipeline/pipeline/io/contract.py`) | `docs/contracts/schemas/blast-record.schema.json` |
| case-index | 1.0.0 | `data/derived/manifests/index.json` (`fragmenta.index/v1`), the cases, the models files and the benchmark | `docs/contracts/schemas/case-index.schema.json` |
| case-manifest | 1.0.0 | one manifest per case (`fragmenta.manifest/v1`): lane verdict, controls, flags | `docs/contracts/schemas/case-manifest.schema.json` |
| case-artifact | 2.0.0 | one artifact per case (`fragmenta.case/v1`): blasts, predictions of 14 arms, scores, distributions, controls; every reason a bilingual `{en, es}` text since 2.0.0 | `docs/contracts/schemas/case-artifact.schema.json` |
| models-file | 1.0.0 | the fitted arms of one training scope in the engine's portable format (`fragmenta.models/v1`) | `docs/contracts/schemas/models-file.schema.json` |
| benchmark | 2.0.0 | the cross-case benchmark (`fragmenta.benchmark/v3`); the per-site abstention reason a bilingual text since 2.0.0 | `docs/contracts/schemas/benchmark.schema.json` |
| readiness | 1.0.0 | `data/derived/readiness.json` (`fragmenta.readiness/v1`): what is real in a build, row by row | `docs/contracts/schemas/readiness.schema.json` |
| api | 1.0.0 | the dormant read-only API (`app/`), GET only | `docs/contracts/api.openapi.json` |

Each document is content-addressed (SHA-256 over a sorted-key serialisation) and carries the app and engine versions
and the corpus digest. The web's types are generated from the schemas through the OpenAPI document
(`frontend/src/lib/contract.gen.ts`; `npm run build` fails when it is not current), and
`frontend/src/lib/contract.test.ts` reads every committed document and the provider tree against them. The producers
validate against the same schema files before they write (`data-pipeline/pipeline/stages/export.py`), and the release
gate (`data-pipeline/pipeline/stages/validate.py`, `scripts/check_artifacts.py`) re-reads every artifact, recomputes
each digest against its own and the index's, and refuses non-finite numbers. A contract is versioned by semver, and
`docs/contracts/versions.lock.json` with `scripts/check_contract_versions.py` holds each schema to its version.

Missing-data behavior is one vocabulary of six declared states (`available`, `partial`, `stale`, `provider`,
`training`, `missing`), computed from the catalog by `data-pipeline/pipeline/core/readiness.py` into the readiness
document, in this order, first match wins:

- Provider: a row whose catalog status is `active` is served by its provider and says so on every surface.
- Missing: no index (the site build stops at copy-data, the API answers 503), no benchmark (the Benchmark page and
  the facts say not available yet with the reason, never an empty chart).
- Partial: a manifest, an artifact or a models file the index lists is absent; the readiness document lists the path,
  the case selector marks that case not available yet, the other cases work, and the API answers 404 for it. A
  partial bake builds only for the paths the document lists (`frontend/copy-data.mjs`, `scripts/check_artifacts.py`).
- Stale: the index's `app_version` differs from `VERSION`; the views show the version that baked it.
- Training: Fragmenta has no model slot, so no row takes this state.
- Ingestion keeps the corpus rule: a row outside a contract bound or missing a column is rejected with its reason and
  never clipped, and the bake goes on with the accepted rows.

The dormant API (`app/`, `requirements-api.txt`) is never deployed; it serves the committed documents and answers 503
with the declared state when one is absent, and its contract tests run in the product's test suite.

## Technology and versions

Every pinned dependency of `requirements.txt`, `requirements-precompute.txt`, `requirements-api.txt`,
`requirements-dev.txt` and `frontend/package.json`, with the version actually installed; `scripts/check_tech_matrix.py`
fails when a pin and this table disagree. A package.json range is recorded at the version `frontend/package-lock.json`
resolves it to. The runtimes are Python 3.13 and Node 22 in CI (`.github/workflows/ci.yml`), and Python 3.13.14 and
Node 24.14.1 on the development workstation (`measured-resources.md`). The alternative column names the newer version
the technology check of 2026-10-16 found and the product did not adopt, or the alternative a dossier settled against;
where none is recorded it says so.

| component | package | version | use | alternative considered |
|---|---|---|---|---|
| engine | blastfrag | 0.4.0 | the predictors, the protocols, the benchmark and the portable model export, a separate PyPI package (ADR-0057) | none: the product declares no package of its own |
| engine | numpy | 2.5.4 | arrays in the bake and in the runtime lane | none recorded |
| engine | scikit-learn | 1.9.1 | the learned arms fitted in the bake | none recorded |
| engine | xgboost | 3.4.1 | the gradient-boosted arm and the stacking base learner | none recorded |
| notebooks | matplotlib | 3.11.2 | the figures of the didactic notebooks (`notebooks/`, local only) | none recorded |
| notebooks | nbclient | 0.11.0 | executes each notebook in a fresh kernel (`scripts/run_notebooks.py`, the template's) | none: the template's runner |
| notebooks | nbformat | 5.11.1 | reads and writes the notebooks for the runner | none: the template's runner |
| notebooks | ipykernel | 7.4.0 | the Python kernel the runner starts | none recorded |
| tests | pytest | 9.1.1 | the pipeline, contract, guard and planted-defect tests | none recorded |
| lint | ruff | 0.17.1 | lint of data-pipeline, tests, scripts and app | none recorded |
| contracts | jsonschema | 4.26.0 | validates every document against its schema file | none: the template's pin |
| contracts | openapi-spec-validator | 0.9.0 | validates `docs/contracts/api.openapi.json` | none recorded |
| API | fastapi | 0.156.1 | the dormant `app/`, run by the API contract tests | none recorded |
| API | pydantic | 2.14.1 | the dormant API's models | none recorded |
| API | uvicorn | 0.54.0 | the server the dormant API would use, never deployed | none recorded |
| API | httpx | 0.28.1 | the test client of the dormant API | none recorded |
| shell | @fasl-work/caos-app-shell | 0.18.0 | the shared app shell, pinned exactly (ADR-0078) | a hand-rolled shell, forbidden by ADR-0078 |
| web | react | 19.3.1 | the UI | none recorded |
| web | react-dom | 19.3.1 | the UI renderer | none recorded |
| web | react-router | 8.5.0 | the routes | none recorded |
| web | zustand | 5.0.15 | the workbench selection store | none recorded |
| web | katex | 0.19.0 | typeset equations on the pages | none recorded (shell 0.17.0 widened its peer range to 0.16 through 0.19) |
| web | lucide-react | 1.60.0 | icons | none recorded |
| web | uplot | 1.6.32 | the interactive curves: parity, residual, distribution, slope | a static chart image, rejected: every view reads values at the cursor (visualization dossier) |
| web | three | 0.186.1 | the 3D bench, whose geometry is three-dimensional | a 2D plan dot grid, rejected: the stiffness ratio and the free face are three-dimensional |
| build | vite | 8.3.4 | bundler and dev server | none recorded |
| build | @vitejs/plugin-react | 6.1.2 | the React transform for vite | none recorded |
| build | typescript | 7.0.2 | native type check of the web (no compiler API) | none recorded |
| build | zz-typescript5 | 5.9.3 | TypeScript 5 compiler API for the contract generator (`openapi-typescript` needs `ts.factory`), under an npm alias | typescript 7.0.2 for the generator, rejected: it has no compiler API |
| build | openapi-typescript | 7.13.0 | generates `contract.gen.ts` from the OpenAPI document | the former hand-kept mirror of 544 lines, replaced: it drifted from the documents |
| build | tsx | 4.23.15 | runs the TypeScript tests and scripts under Node | none recorded |
| build | wait-on | 9.5.1 | waits for the preview server before the browser gate | none recorded |
| build | @types/node | 24.19.2 | types of the build scripts | none: matches Node 24, which the product runs |
| build | @types/react | 19.3.0 | types of React | none recorded |
| build | @types/react-dom | 19.3.0 | types of React DOM | none recorded |
| build | @types/three | 0.186.0 | types of three | none recorded |
| gate | playwright | 1.64.1 | the measured browser gate (`npm run gate:browser`), local and in the deploy | none recorded |

## Resources

What each stage needs on the development workstation (Windows 11, Intel Core i9-14900HX with 32 logical processors,
47.7 GB of memory, 2026-10-18; the peak is the largest working set of the stage's main process, polled every 50 ms; the
commands, the scripts and the outputs are in [`measured-resources.md`](measured-resources.md)). No stage uses a GPU or a
network after the install. Training is not a stage of its own: the learned arms are fitted inside the bake.

| stage | memory | disk | time | where it runs |
|---|---|---|---|---|
| bake (`data-pipeline/run.py`, sixteen cases, the benchmark, the learned arms, BLAS on one thread) | 258 MB peak working set | 4,168,041 bytes in 48 files under `data/derived`, byte-identical to the committed artifacts | 677.5 s | workstation, never CI (ADR-0074) |
| tests (`python -m pytest`, the whole suite with the planted-defect suite, 610 passed and 2 expected failures at the measurement) | 315 MB peak in the pytest process | temporary copies of the files each plant reads | 222 s (the planted-defect suite alone, 441 passed: 128 s) | workstation; the planted-defect suite alone also runs in CI |
| install (`npm ci`) | not measured | 191 MB in `node_modules` (131 packages, 13,146 files) | 10.9 s with a warm cache | workstation, CI and the deploy |
| build (`npm run build`, the type check included) | not measured | 7,089,412 bytes in `frontend/dist` (122 files) | 5.8 s | workstation, CI and the deploy |
| web unit tests (`npm test`, 141 tests at the measurement) | not measured | none | 1.1 s | workstation, CI |
| deploy payload (GitHub Pages: `frontend/dist`, 2,921,371 bytes of site and 4,168,041 of artifacts) | none (static files) | 7,089,412 bytes uploaded | the product browser gate before it took 11 m 43 s locally on 2026-10-18; the Pages publish itself was not timed | CI after main, the browser gate on the artifact it publishes |

## Lanes

- **Offline**: `data-pipeline/run.py` bakes sixteen cases, eleven models files and the benchmark against exact pins
  (numpy 2.5.4, scikit-learn 1.9.1, xgboost 3.4.1). The benchmark's 100-draw protocols and the network's
  Levenberg-Marquardt fits put it offline; it never runs in CI (ADR-0074). It pins BLAS to one thread before numpy
  loads: on the network's small matrices a multi-threaded BLAS spun, and one fit at width 15 took more than six
  minutes on a loaded workstation against about two seconds on one thread. The full bake took 745 s at 0.06.000
  and 347 to 678 s in the three bakes of 0.07.000 on the development workstation, the same day and with the same
  pipeline (2026-10-05): the time follows the machine's load.
- **Replayed**: the committed artifacts, copied into the site and fetched with the version in the address. Their
  size, measured on the committed files:

<!-- facts:payload -->
The committed artifacts come to about 4.2 MB: 2.7 MB of portable models, 370 kB of benchmark, 1.1 MB of cases and the manifests.
<!-- /facts -->

- **Live, closed forms**: `frontend/src/engine/live.ts` recomputes the classical mean size, the regressions, the
  router and the curves on a design the reader changes; a parity test holds them to the baked numbers.
- **Live, learned**: `frontend/src/engine/learned.ts` walks the exported models of the case's training scope,
  exactly for the trees and to 1e-12 for the network and the kernels, held by fixtures of the original models.
  The measured basis for running them in the browser is that walk: a tree ensemble of a few hundred trees on
  seven inputs is a few thousand comparisons per blast.
- **Live, on a grid**: the Design group's response surface (`frontend/src/engine/surface.ts`) evaluates
  `answerOnDesign` (`frontend/src/engine/design.ts`) on 41 by 41 designs over the corpus envelope of
  burden-to-diameter and spacing-to-burden; the every-model view runs the same function, so the two cannot
  disagree. One full surface of 1681 designs took 13 to 19 ms per model in Node 24 on the development
  workstation (2026-10-05), and at most 24 ms on the first call, which reads the models into the walk's cache;
  so it recomputes on every change, with no worker.

## Method ladder

The ladder and one acceptance criterion per method are the engine's (its `features/ladder/`). The product's
criterion per method is that it appears on every case with a number or a stated reason
(`features/bake-and-cases/`), that its live lane matches the bake (`features/live-lanes/`), and that its
benchmark entry carries its provenance (`features/benchmark-artifact/`). Three arms reuse the classical mean size
and add only a curve shape (Kuz-Ram, Swebrec, the crush zone); they are counted once.

## Cases

Sixteen cases in six categories, each with its reason in the registry:

| Category | Cases | Why it exists |
|---|---|---|
| real campaign | nine, one per corpus site with resolvable geometry | the transfer question, each site held out from the learned arms |
| geometry negative control | `real-miami` | no hole diameter is published: every arm that needs a scale must abstain |
| extrapolation control | `real-granite-ne` | five field blasts below the training modulus: every prediction is stamped |
| degenerate negative control | `ctrl-degenerate` | designs that are not blasts: every arm must refuse |
| positive control | `ctrl-oracle` | the harness must recover a known truth exactly |
| parameter sweep and structural control | `synth-sweep-burden`, `synth-sweep-powder`, `synth-ibsd-capped` | designs, not measurements: the response of every arm to one lever, and to large in-situ blocks |

## Oracles

None of these is a model judging a model: the source's own descriptive statistics and narrative constraints
(through the engine), the published predictions, the measured sizes of the corpus and the hold-outs, the null and
the oracle bracketing every protocol, the controls that must fire, and the Python engine as the reference for the
browser's live lanes.

## Deploy driver

GitHub Pages at `fragmenta.fasl-work.com`: a static site with every artifact committed, no server state, no
secret and no request-time compute (ADR-0002 does not trigger). The measurement is the payload stated under Lanes
and the live lanes running in the reader's browser. The deploy verifies the artifacts, tests and builds
the site, runs the browser gate on the artifact it is about to publish (on Linux, where text is set in DejaVu
Sans), and only then publishes.

## Risks and kill criteria

- **The kill criterion** is the engine's, declared and hash-pinned: the learned tier generalises across sites only
  if the best learned arm's variance explained held out by site is both positive and at least 0.10 above the
  null's. The product reports its outcome on both row sets, and that it depends on six Miami blasts.
- **A green gate measuring the wrong thing**: the gates read the built site's DOM and measure geometry, and each
  new check was first confirmed to fail on the defective build.
- **The artifacts drift from the engine**: the re-bake test compares numbers to a named tolerance; the release gate
  recomputes every digest.
- **The two lanes drift**: the parity and fixture tests fail the frontend suite.
- **The site renders on Windows and breaks on Linux**: `GATE_FONTS=dejavu` runs the gate with the runner's fonts.

## ADR fit

| ADR | Rule | Fits here | Where it does not, and the amendment |
|---|---|---|---|
| ADR-0057 | two contracts, named stages, no internal package | yes: `data-pipeline/`, the contract catalog, the engine on PyPI | none |
| ADR-0069 | method vertical with its acceptance criterion | yes, split with the engine | none |
| ADR-0016, ADR-0017 | routes on the shared shell; documentation depth | yes, on shell 0.18.0 pinned exactly: the landing on the Introduction (executive view first), the App at `/app`, five documentation pages declaring their areas (`features/base-0-08/`) | none |
| ADR-0056 | the `docs/` wiki | yes | none |
| ADR-0058 | architecture modal, five themed bilingual tabs | yes, generated from the artifacts | none |
| ADR-0070 | Focus mode for the App: the open group in the full viewport, `?focus=1`, Escape or the exit button returns | yes: the App sets the shell's `focus`, an old `/focus/<id>` link forwards, and the shell gate runs with `--require-focus` (`features/base-0-08/`) | none |
| ADR-0071 | the page is the viewport; one nav row; instrument at least half the App route | yes: rules 1 to 7 and 9 by the product's gate, rule 8 by the base's (G6) | none |
| ADR-0074 | CI runs cheap checks only | yes: `scripts/check_ci_budget.py`; the one pytest command CI runs is the planted-defect suite | none |
| ADR-0075 | design before code, every requirement gated | from 0.06.000, retroactively before; 0.08.000 designed from its sizing and catalog, this document completed after its units | `scripts/check_sdd.py`, `scripts/check_tech_matrix.py`, `scripts/check_notebooks.py` and `scripts/check_readme_areas.py` (template 0.10.000, verbatim) in the guards job |
| ADR-0078 | rules live in the base | yes: the App is the base's `CaseWorkbench`, measured by `caos-shell-gate`; the template's guards run in CI | `.template-version` reads 0.10.000 (the base-integrity, documents, contracts, content-standards, residue, SDD, technology-table, notebooks and README-areas guards, the notebook runner and the gate runner taken verbatim) |
| ADR-0080 | contract-first parallel delivery: catalog, one schema per boundary, providers, declared states, readiness | yes: `docs/contracts/`, `tests/contracts/`, `frontend/src/readiness/`, the template's contract guards | none |
| ADR-0067 | no em-dash, no emoji | yes: `scripts/check_content_standards.py` | none |

## Beyond the state of the art

Each claim names what the product adds, the evidence that can be re-run (a level 4 notebook in each language under `notebooks/`) and the source it goes beyond.

| id | claim | evidence | goes beyond |
|---|---|---|---|
| BS-1 | The learned tier is judged by whole campaigns held out, with intervals that resample campaigns and a criterion declared before the run and pinned by a hash. | `notebooks/en/04-benchmark-protocol/04-the-site-held-out-protocol-and-its-pre-declared-criterion.ipynb`: every learned arm loses most of its random-split score (a median gap of 0.984) and no arm outside the in-sample ones has an interval above zero. | Sui et al. 2025, https://doi.org/10.3390/app15031254 (one random 80/20 split) and Roberts et al. 2017, https://doi.org/10.1111/ecog.02881 |
| BS-2 | Refusal is a first-class result: the geometry is reconstructed or refused, and a guard refuses designs that are not blasts. | `notebooks/en/01-the-data/03-integrity-gate-and-negative-controls.ipynb`: the two negative controls (six blasts with no scale, six degenerate designs) pass in the committed artifacts. | Amoako, Jha and Zhong 2022, https://doi.org/10.3390/mining2020013 and Sui et al. 2025, https://doi.org/10.3390/app15031254 (predictors that return a number for any input vector) |
| BS-3 | The corpus is held to the paper at every load: its printed statistics and a pinned digest are reproduced. | `notebooks/en/01-the-data/03-integrity-gate-and-negative-controls.ipynb`: four planted defects, the statistics catch two and the digest catches all four. | Hudaverdi, Kulatilake and Kuzu 2010, https://doi.org/10.1002/nag.957 (a table reused as given) |
| BS-4 | A rock factor predicted from the Young modulus over the other sites, so the classical score uses nothing from the held-out site. | `notebooks/en/02-classical-prediction/04-a-rock-factor-that-uses-nothing-from-the-target-site.ipynb`: the score moves by 0.013 and both intervals span zero. | Kulatilake, Hudaverdi and Wu 2012, https://doi.org/10.1007/s10706-012-9496-3 (the factor estimated for each blast) |
| BS-5 | Learned arms exported to portable documents that a browser evaluates, with fixtures and a content address. | `notebooks/en/06-design-response/03-learned-arms-served-live-from-a-portable-document.ipynb`: parity with a fresh fit to floating-point rounding. | Sui et al. 2025, https://doi.org/10.3390/app15031254 and Kulatilake et al. 2012, https://doi.org/10.1007/s10706-012-9496-3 (parameters and scores, no runnable form) |
