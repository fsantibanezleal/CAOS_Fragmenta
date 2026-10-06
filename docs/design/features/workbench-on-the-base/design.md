# Design: the App on the shared base

## Why

ADR-0078 puts the workbench in the base: `CaseWorkbench`, `PlotCard`, `Stage`, `Readout`, `Knob` and the measured
gate `caos-shell-gate`. Fragmenta composes its own App on shell 0.6.x (`^0.6.0`, a range, against the exact pin
ADR-0078 asks for) and misses ADR-0071 rule 8: its square parity plot reaches 0.28 to 0.36 of the viewport. The
base's gate (G6) counts the views whose drawing fills at least 30% of its stage, tables included, and requires their
union to cover half the viewport on every workbench state at 1280 px and wider.

## The instrument

Six slots, the base's limit, in its order (instrument groups, then the variant comparison, then the write-up):

| Group | Views, side by side and filling | Lane |
|---|---|---|
| Predict | the parity plot (square) and the model comparison table | replay |
| Distribution | the passing curves with the in-situ block and the crusher target; the percentiles table; Decide (P80 against a crusher) as a sub-tab, where the curve it reads is | live |
| Design | the response surface over burden and spacing (`features/response-surface/`); every arm on the changed design (the What if views); the 3D bench as a sub-tab | live |
| Rock | the rock-factor schemes and the recovered and transfer factors | replay |
| Compare the variants | one lever at a time, every variant's predicted size | replay |
| The case | the write-up: the problem, the source, what each variant shows, how to read the views | prose |

The rail holds the case picker (select with categories), the variant bar, the model picker, the design knobs of the
What if views (`Knob`, registered controls), and the live readouts (the score on this case, the design's predicted
size and P80) as `Readout` with lane and provenance.

## Migration

- `@fasl-work/caos-app-shell` pinned to `0.7.2` exactly. The design first named 0.7.0; 0.7.1 (defects 14 to 18) and
  0.7.2 (defect 21, repeated integer ticks) reached npm on 2026-10-05, before this unit's code, so the pin is the
  release that carries every defect fix the product overrides. `.template-version` records the template release
  whose base the product follows; the template's `scripts/check_version_coherence.py` joins the guards.
- The shell API: `ShellConfig.license` and `visibility` are required, `build` prints the commit; `contain` makes
  every route the viewport; the architecture modal takes inline SVG strings (`?raw` imports; 0.7.0 removed the URL
  fetch); citations carry `BiText` labels; `Readout` items take a numeric value with a unit.
- Overrides: the product carries three, for shell defects 1 (the document cannot scroll), 4 (the document language)
  and 14 (the footer separator). 0.7.0 carries 1 and 4 and 0.7.1 carries 14, so all three go. A guard test reads the
  product's stylesheet and entry point and requires any override that remains to cite an entry of the shell-defects
  record that is still open (19 and 20 on 2026-10-05).
- The product's browser gate keeps its product checks (figures, footer, citations, comparison rows, size units,
  the rail gap, the bench's visible holes, the width sweep) and follows the new groups; `frontend/scripts/gate.mjs`
  runs `caos-shell-gate` for G1 to G9.

## The template's guards (ADR-0078 s5: a product adopts the base when it is next worked on)

- `scripts/check_version_coherence.py`: VERSION is the one source; `frontend/package.json` is its semver form, the top
  CHANGELOG entry is VERSION, no source file writes a version literal, VERSION is not behind the latest tag.
- `scripts/check_web_baseline.py`, against the installed shell: every `var(--x)` is defined, every class written has a
  rule, no app rule redefines a reserved shell class, numbers in a view go through the shell's formatter (no
  `toFixed`, no bare `toLocaleString`), no SVG behind an `<img>`, and no `requestAnimationFrame` outside
  `usePausedViz` (the 3D bench's loop moves onto it).
- `scripts/check_deploy_place.py` with `deploy/TARGET` = `pages`. The product still carries the dormant VPS unit and
  nginx site of the old frozen layout (`deploy/fasl-slug.service`, `deploy/domain.nginx`); a Pages product carries
  none, so they go.

## The documentation pages (WB-011)

Shell 0.7.x reports more than six peer sub-tabs as a console error (ADR-0071 rule 5), and four pages carry seven or
eight. Each is brought to six by putting related sections under one sub-tab, mirroring the wiki where it already
groups them, rather than by adding a second row of navigation:

| Page | Was | Now |
|---|---|---|
| Methodology | classical, rock factor, distributions, router and regressions, network, kernels and ensembles, protocols | the rock factor joins the classical mean size (it is that equation's A term) |
| Implementation | architecture, data and the gate, geometry, bake, leakage, live equations, live fitted models, deploy | geometry joins data and the gate (the reconstruction is how the data become usable); the two live lanes share one sub-tab |
| Experiments | questions and design, metrics, coverage, protocol sensitivity, by site, design response, diagnostics | the metrics join the questions and design (Methodology carries their equations) |
| Benchmark | verdict, every arm, published hold-outs, the published network, robustness, live check, provenance | the hold-outs and the network become "Published reproductions", as `docs/results/05_published-reproductions.md` already is |

Each merged sub-tab keeps every section it had, each with its own heading and its own sources; nothing is cut.
