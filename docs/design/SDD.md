# Software design document: Fragmenta

ADR-0075 asks for this document before the code. **For everything up to 0.05.001 it was written afterwards, on
2026-10-05**, from the code, the tests, the plan and the research dossiers that preceded them, and it says so:
each retroactive requirement in `features/` names the test or gate that already held it, and its convergence
was checked by running it. The units of the 2026-10-05 gap cycle (`features/benchmark-0-4/`,
`features/non-circularity/`, `features/hygiene/`, `features/workbench-on-the-base/`,
`features/response-surface/`) were designed here before their code. The science is designed in the engine's own
SDD (`docs/design/SDD.md` in CAOS_BlastFrag).

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

## Contracts

- **Ingestion (contract 1)** is the engine's: `blastfrag.validate_blast` with the source-integrity gate on every
  corpus load. The product adds the case registry (`data-pipeline/pipeline/cases/fragmenta_cases.py`): every case
  states why it is in the matrix, in both languages, with at least six variants over a real physical family.
- **Artifacts (contract 2)**: `data/derived/<case>/case.json`, `data/derived/benchmark.json`
  (`fragmenta.benchmark/v3` from 0.06.000, which added the capped arm, every arm's common-support score and the
  network width sweep to v2), `data/derived/models/<scope>.json` (`fragmenta.models/v1`, the
  engine's portable export per training scope) and `data/derived/manifests/index.json`. Each is
  content-addressed (SHA-256 over a sorted-key serialisation) and carries the app and engine versions and the
  corpus digest. The web declares the same shapes in `frontend/src/lib/contract.types.ts`, and a parity test reads
  every committed artifact against them.
- **The release gate** (`data-pipeline/pipeline/stages/validate.py`, `scripts/check_artifacts.py`) re-reads every
  artifact, recomputes each digest against its own and the index's, and refuses non-finite numbers.

## Lanes

- **Offline**: `data-pipeline/run.py` bakes sixteen cases, eleven models files and the benchmark against exact pins
  (numpy 2.5.3, scikit-learn 1.9.0, xgboost 3.4.1). The benchmark's 100-draw protocols and the network's
  Levenberg-Marquardt fits put it offline; it never runs in CI (ADR-0074). It pins BLAS to one thread before numpy
  loads: on the network's small matrices a multi-threaded BLAS spun, and one fit at width 15 took more than six
  minutes on a loaded workstation against about two seconds on one thread. The full bake took 745 s at 0.06.000
  and 347 s at 0.07.000 on the development workstation, the same day and with the same pipeline (2026-10-05): the
  time follows the machine's load.
- **Replayed**: the committed artifacts, copied into the site and fetched with the version in the address. Their
  size, measured on the committed files:

<!-- facts:payload -->
The committed artifacts come to about 4.2 MB: 2.7 MB of portable models, 368 kB of benchmark, 1.1 MB of cases and the manifests.
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
| ADR-0057 | two contracts, named stages, no internal package | yes: `data-pipeline/`, the contract mirror, the engine on PyPI | none |
| ADR-0069 | method vertical with its acceptance criterion | yes, split with the engine | none |
| ADR-0016, ADR-0017 | six routes on the shared shell; documentation depth | yes, on shell 0.7.2 pinned exactly | none |
| ADR-0056 | the `docs/` wiki | yes | none |
| ADR-0058 | architecture modal, five themed bilingual tabs | yes, generated from the artifacts | none |
| ADR-0071 | the page is the viewport; one nav row; instrument at least half the App route | yes: rules 1 to 7 and 9 by the product's gate, rule 8 by the base's (G6), where the drawn views covered at least 0.578 of the viewport in every workbench state at 1280 px and wider on 0.07.000 | none |
| ADR-0074 | CI runs cheap checks only | yes: `scripts/check_ci_budget.py` | none |
| ADR-0075 | design before code, every requirement gated | from 0.06.000, retroactively before | this document; `scripts/check_sdd.py` in the guards job |
| ADR-0078 | rules live in the base | yes: the App is the base's `CaseWorkbench`, measured by `caos-shell-gate`; the template's web-baseline and deploy-place guards run in CI | one override, for shell defect 23 (a filling card takes its row); the template's version guard waits on CAOS_PRODUCT_TEMPLATE#19, and WB-008 is held by the product's own test meanwhile |
