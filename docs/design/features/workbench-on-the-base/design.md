# Design: the App on the shared base

## Why

ADR-0078 puts the workbench in the base: `CaseWorkbench`, `PlotCard`, `Stage`, `Readout`, `Knob` and the measured
gate `caos-shell-gate`. Fragmenta composes its own App on shell 0.6.8 and misses ADR-0071 rule 8: its square parity
plot reaches 0.28 to 0.36 of the viewport. The base's gate (G6) counts the views whose drawing fills at least 30%
of its stage, tables included, and requires their union to cover half the viewport on every workbench state at
1280 px and wider.

## The instrument

Six slots, the base's limit, in its order (instrument groups, then the variant comparison, then the write-up):

| Group | Views, side by side and filling | Lane |
|---|---|---|
| Predict | the parity plot (square) and the model comparison table | replay |
| Distribution | the passing curves with the in-situ block and the crusher target; the percentiles table | live |
| Design | the response surface over burden and spacing (`features/response-surface/`); every arm on the changed design; the 3D bench as a sub-tab | live |
| Rock | the rock-factor schemes and the recovered and transfer factors | replay |
| Compare the variants | one lever at a time, every variant's predicted size | replay |
| The case | the write-up: the problem, the source, what each variant shows, how to read the views | prose |

The rail holds the case picker (select with categories), the variant bar, the model picker, the design knobs of the
What if tab (`Knob`, registered controls), and the live readouts (the score on this case, the design's predicted
size and P80) as `Readout` with lane and provenance. Decide (P80 against a crusher) becomes a sub-tab of
Distribution, where the curve it reads is.

## Migration

- `@fasl-work/caos-app-shell` pinned to `0.7.0` exactly; `.template-version` records the template release whose
  base the product follows; the template's `scripts/check_version_coherence.py` joins the guards.
- The architecture modal takes inline SVG strings (0.7.0 removed the URL fetch); citations carry `BiText` labels.
- Overrides: defect 1 (scroll) is carried by 0.7.0 and its override goes; 14 to 18 keep their overrides until 0.7.1
  is on npm. A guard test reads `frontend/src/fragmenta.css` and requires each remaining override to cite an open
  entry of the shell-defects record.
- The product's browser gate keeps its product checks (figures, footer, citations, comparison rows, the bench's
  visible holes); `frontend/scripts/gate.mjs` runs `caos-shell-gate` for G1 to G9.
