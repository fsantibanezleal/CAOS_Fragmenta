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
- On 2026-10-07 and 08 the pin moved to `0.10.0` and `.template-version` to the template 0.03.001, the base release built
  from this product's own bridges (CAOS_MANAGE `plans/app-shell`, BL-026): the shell's `ViewsRow` with shares
  replaces the product's view columns (`.fr-viewcol`, the override for defect 23), and the shell's text kit
  (`textWidth`, `fitLabel`, `niceTicks`) replaces `src/viz/text.ts`. The template's version guard, which reads code
  and no longer reads history, joins CI.
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

## The rail, scoped to the open group

`CaseWorkbench` takes a controlled `group`, so the rail is composed for the group that is open. A control that moves
only some views is shown only with them (the 2026-06-21 review rule: a control's scope is what it affects). Always
in the rail: the case picker (a select with one group per category), the model picker (a select with one group per
tier) and the blast picker. With their group only:

| Group | Its controls, in the rail | Its readout |
|---|---|---|
| Predict | none beyond the global ones | the selected model's score on this case, in the rail |
| Distribution: the curves | undulation and fines fraction; the variants | P20, P50, P80, the uniformity index and the share passing 10 mm, live, under the curve they are read from |
| Distribution: against a target | the target P80 and the oversize limit; the variants | the P80, the oversize and the fines of the selected model, in the view |
| Design: the surface, with every model on the design beside it | Bench (bench height and stemming ratios, hole diameter) and Charge (powder factor, in-situ block, modulus, and what the map shows) as two rail sections; the variants | the hovered cell's design and size, or the iso-levels, under the map |
| Design: the bench | the tie-in and the inter-hole delay | none: the bench is the blast as fired |
| Rock | UCS, density and joint spacing | the two schemes' factors and the recovered one, in the rail |
| Compare the variants | the variants | none |

As built, three things differ from the plan above it. The readouts of the Distribution and Design views sit inside
the view, under the drawing they read, because in the rail they pushed the controls of a phone-sized rail out of
reach (G5). Burden and spacing are not knobs: they are the surface's axes, moved by its marker, by pointer or arrow
keys. The variants are shown only with the views a variant moves.

Every control is a shell `Knob` or `ChipGroup` (registered, so the gate can move it) or, for the three long
categorised choices, a select that writes `data-control`; every value enters the selection key through `controls`.

## The variants

A case's variants are design changes of its representative blast (burden 15 percent tighter, powder factor 30 percent
higher, and so on), each baked for every arm as `variant_curves`. The variant bar sets the design the Distribution,
Decide and Design views start from; Predict and Rock are about the measured blasts and the rock, so they do not move
with it. "Compare the variants" shows every variant for the selected model (the baked response, one lever at a time).

## Drawing what each group shows (rule 8)

The gate counts canvases, SVG drawings and tables. Rock had none (three rating cards and a definition list); it gains
a drawing of the factors side by side, and its tables are tables. The case write-up is prose and is the context slot,
which the gate reads as prose.
