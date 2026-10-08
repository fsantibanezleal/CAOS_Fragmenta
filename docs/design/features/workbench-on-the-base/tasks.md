# Tasks: the App on the shared base

1. Pin shell 0.7.2 exactly and record `.template-version` (WB-001); 0.10.0 and the template 0.03.001 since 2026-10-08.
2. Migrate the shell API: licence and visibility, `contain`, architecture SVGs inline, `BiText` citations, controlled
   tabs (WB-002).
3. Remove the three overrides the pinned shell carries (defects 1, 4, 14) and add their guard (WB-006).
4. The template's guards: version coherence, the web baseline (the number formatter in every view, the bench's loop
   on `usePausedViz`), the deploy place with the VPS residue removed (WB-008 to WB-010).
5. Recompose the App as `CaseWorkbench` with the groups above, every view a `PlotCard` with lane and provenance and a
   filling `Stage` (WB-002, WB-003, WB-005).
6. The rail as registered controls and readouts; the selection key (WB-004).
7. `frontend/scripts/gate.mjs` on `caos-shell-gate`; the product gate follows the groups and stays green in both font
   sets (WB-003, WB-004, WB-007).

## Convergence, 2026-10-05

| Requirement | Gate | Result |
|---|---|---|
| WB-001, WB-006, WB-008 | `tests/test_guards.py` | passed, in a suite of 83; the WB-008 test failed on each statement in turn with VERSION moved ahead of the bake (the package, the changelog, then 45 artifacts) |
| WB-002 to WB-005 | `frontend/scripts/gate.mjs` (`caos-shell-gate`, shell 0.7.2) | passed: 0 failures in 820 states at 390x844, 768x1024, 1280x800, 1600x900 and 2560x1440, both themes, both languages; the smallest drawn share 0.578 (the floor 0.5, at 1280x800 on Design) and the smallest stage fill 0.46 (the floor 0.3) |
| WB-007, WB-011 | `frontend/gates/browser-gate.mjs` | passed: 420 of 420 with the native fonts and 420 of 420 with DejaVu Sans (`GATE_FONTS=dejavu`) |
| WB-009 | `scripts/check_web_baseline.py` | passed, in CI's frontend job |
| WB-010 | `scripts/check_deploy_place.py` | passed, in CI's guards job |
| WB-012 | `frontend/gates/browser-gate.mjs` | passed in both font sets, with the App's drawings measured at 1280, 1600 and 2560 px and again at 390 and 768 px; the check fails a label planted outside its drawing and two ticks planted on one another |
| WB-013 | `tests/test_guards.py::test_the_spanish_guard_reads_what_the_bake_composed` | passed, in a suite of 83; the guard reported 41 decimal points in the bake's Spanish before the fix |

Two things differ from the design. The readouts of the Distribution and Design views sit inside the views, under
the drawing each reads, because in the rail they pushed a phone-sized rail's controls out of reach (G5); and the
template's version guard is not adopted: as released it rejects the release history in comments
(CAOS_PRODUCT_TEMPLATE#19), so WB-008 is held by the product's own test until it is.

The base's gate failed 76 of 820 states on its first run, at sizes the product's gate never opened, and reached
zero in four rounds (findings F-20 in CAOS_MANAGE `plans/fragmenta/`). It also exposed two shell defects, recorded
in CAOS_MANAGE `conventions/shell-known-defects.md`: 23, a filling card takes its views row (CAOS_APP_SHELL#54;
the product wraps each view in a column of its own), and 24, the vertical sub-tab list scrolls away on a long
section (CAOS_APP_SHELL#55; the product's sticky rule restyled reserved classes and went with the web-baseline
guard, so the documentation pages carry the symptom until the shell fixes it).

The product gate in the deploy runner's fonts then caught what both had passed with the Windows fonts: in Spanish
at 1280x800 the model comparison ran 24 px out of its 464 px card, because every cell of a shell table keeps one
line and a long model name held its column at 265 px. The name column now wraps, as the shell's text column
(`caos-col-text`).

A review of every view's capture, in Spanish set in DejaVu Sans at 390, 768 and 1280 px, then found what all
three gates had passed: labels of the every-model view cut at the card's edge and its ticks printed over one
another; the rail's three section names cut ("Mod"); the target view's two marker labels on one another, its
curve running out of its frame onto the decision, and every canvas label a label's width left of where it was
meant to start (uPlot leaves the canvas right-aligned); the ranking of the models at five pixels on a phone; the
curves' key and percentiles cut by a phone's fixed view height; repeated palette colours with nothing to tell
them apart; and the expected bands, one case reason and five page sentences with the English decimal point.

The fixes are in the release, and so are the gates that would have caught them where a gate can (WB-012,
WB-013): the product gate measures the App's drawings as it measures the figures and runs the App again at 390
and 768 px, and the Spanish guard reads the artifacts and no longer excuses a number at the end of a sentence.
Both were planted with the faults they were written for: on the built site the drawing check passed clean and
failed on a label moved out of its drawing and on two ticks set on one another; the guard reported 46 decimal
points before the fix, 41 in the bake's Spanish and five in the pages. The canvas-drawn charts carry no text
elements, so their labels stay outside every gate and are read in the captures.

The release checks:

- **Against 0.06.000**, field by field over the 45 artifacts: none of 423,793 numbers changed; the 45 version
  stamps, the 88 digests over them and 25 Spanish strings did (the decimal comma: five case reasons, and the
  expected band of ten real campaigns in each case and its manifest).
- **The bake** ran three times for this release, 347, 599 and 678 s, against 745 s for 0.06.000 the same day with
  the same pipeline; the time follows the machine's load (the later two ran beside browser captures).


## On the base 0.03.001 (shell 0.10.0), 2026-10-08

| Requirement | Gate | Result |
|---|---|---|
| WB-001, WB-006, WB-008 | `tests/test_guards.py`; `scripts/check_version_coherence.py` in CI | passed, in a suite of 83; no shell override remains |
| WB-002 to WB-005 | `frontend/scripts/gate.mjs` (`caos-shell-gate`, shell 0.10.0) | passed: 0 failures in 890 states (the 820 of the first convergence and the wide-font pass at 390 and 1280 px); the smallest drawn share 0.578 and the smallest stage fill 0.46 |
| WB-007, WB-011, WB-012 | `frontend/gates/browser-gate.mjs` | passed: 420 of 420 with the native fonts and 420 of 420 with DejaVu Sans |
| WB-009 | `scripts/check_web_baseline.py` (the template's 0.03.000 guard: each rule judged by its subject, the exact pin) | passed |

The shell 0.9.0 gate failed 2,860 of 889 states on its first run here, most of them the gate's own (shell 0.9.1
fixed them); 384 remained, which were the product's: Spanish decimal points in the drawings' formulas, a table
and a value in scientific notation, labels cut in the wider font, a translucent clipped bar under the contrast
floor. The last, the Design rail scrolling by 24 px at 1280x800 in Spanish with the wider font, was the shell's:
its rail rule stacked every knob's value under its label (CAOS_APP_SHELL#77, fixed in 0.9.3). The parity
plot then moved onto the shell's chart (0.10.0, CAOS_APP_SHELL#84): its canvas had labelled one axis twice and the
other not at all, which no gate could read.
