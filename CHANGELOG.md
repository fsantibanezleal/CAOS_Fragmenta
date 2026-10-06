# Changelog

All notable changes to this project. Format follows Keep a Changelog; newest on top.

## [0.07.000] - 2026-10-05

The App moves onto the shared base: one `CaseWorkbench` of `@fasl-work/caos-app-shell`, pinned to 0.7.2
exactly, measured by the base's own gate. The What if tab becomes the Design group, whose first view is a
response surface over burden and spacing. The engine is still `blastfrag==0.4.0`. The re-bake changed none
of the 423,793 numbers in the 45 artifacts: only their version stamps, the 88 digests over them, and 25
Spanish strings that take the decimal comma (five case reasons, and the expected band of ten real campaigns,
in each case and in its manifest). (#14)

### Added

- The response surface (Design group): the selected model's P80, or mean size x50, on a 41 by 41 grid of
  burden-to-diameter (17.98 to 39.47) and spacing-to-burden (1.0 to 1.75) ratios, the corpus envelope,
  with the other ratios and the hole diameter held at the design in the rail. Iso-lines at the crusher's
  target P80 and the oversize limit (for x50, at the measured size of the blast as fired), traced by
  marching squares. A cell that is not a blast, or whose prediction leaves 0.001 to 3 m, is hatched and
  gives its reason on hover. The design is a marker that moves by pointer or by the arrow keys, and the
  Distribution group's curves and percentiles follow it. Every cell is the same function as the
  every-model view, so a learned model's surface walks the models fitted without the case's campaign.
  The P80 of a cell takes Cunningham's uniformity index of its pattern, a declared choice for the
  learned models, which predict a mean size and no curve.
- The base's measured gate: `npm run gate` runs `caos-shell-gate` on the build at five sizes (390x844 to
  2560x1440), both themes and both languages. On this release it measured 820 states and failed none;
  the smallest share of the viewport drawn was 0.578 (the floor is 0.5) and the smallest stage fill
  0.34 (the floor is 0.3).
- The product gate measures every drawn view of the App as it measures the documentation figures (no
  label outside its drawing, none on another), and runs the App again at 390 and 768 px in both
  languages: no table cut, no text cut without a title, no label fault.
- The template's web-baseline guard, verbatim, in CI: defined tokens, styled classes, numbers through
  the shell's formatter, no reserved shell class restyled, no animation loop outside the shell's
  paused loop. And the deploy-place guard (one deploy place, GitHub Pages).
- Tests that the shell is pinned to one exact version, that every remaining override names an open
  shell defect, and that VERSION is read by the pipeline, the dormant API and the build, and stamped on
  every committed artifact.

### Changed

- The App is one workbench of six slots named by the question a reader asks: Predict, Distribution
  (the curves, and "Against a target", which was the Decide tab), Design (the response surface, every
  model on the design, which was the What if tab, and the bench), Rock, Compare the variants, and The
  case. The rail holds the case picker, the case's design variants ("Burden -15%"), the model and the
  blast, and only the controls of the open group: a control is shown with the views it moves.
- A group or sub-tab is offered only where it has something to draw. A case without an absolute
  geometry or a rock factor has no Distribution group; "Against a target" needs the selected model's
  size on the blast as fired. A design study, which has no measurement to score against, draws every
  model's prediction design by design; the degenerate control draws why every model refuses.
- Rock is one view: the two rating schemes' factors drawn beside their tables.
- The documentation pages carry at most six sub-tabs (the shell reports more as an error): the rock
  factor joins the classical mean size, geometry joins the data and the gate, the two live lanes share
  one, the metrics join the questions they answer, and the published hold-outs and the network become
  "Published reproductions". Nothing was cut.
- Every number is written in the interface language: in Spanish with the decimal comma, 0,311 where the
  pages printed 0.311, and an absent value as the shell writes it. The Spanish guard now fails a
  decimal point in Spanish text, reads every Spanish field of the committed artifacts (a string the bake
  composes is read as it ships), and no longer excuses a number that ends a sentence.
- The drawn views fit their labels in the font the page renders: a label is measured, broken over two
  lines where it is too long for its column, and shortened with an ellipsis only after that, with its
  whole text as a title. The axes of the model and variant views tick at round values and name their
  quantity. A chart with more series than the palette has colours draws the repeats dashed, in the plot
  and in its key, and a distribution with several curves says which is which before the pointer asks.
- "Against a target" sets the decision beside the curve where the view is wide, so the curve keeps the
  view's height; on a phone the curve and the decision scroll inside the view.
- The shell is pinned to 0.7.2 exactly (it was `^0.6.0`), with its peer `zustand` declared; the
  architecture drawings are inline, and the shell's configuration states the licence, the visibility
  and the build.
- The bench's animation runs on the shell's paused loop: paused when the view opens, halted on a hidden
  tab, started by its button.
- The size axis of a distribution labels its decades only, in mm, cm or m.

### Fixed

- The size axis printed "0mm" at every tick it does not label: uPlot passes null there, and each null
  was formatted.
- The dormant API announced 0.04.006, and its FastAPI application 0.01.000; it now reads VERSION.
- Spanish: the parity plot's hover, a rock card and the column of moduli were in English or printed raw.
- Spanish: the expected band of every real campaign ("media, 0.23 a 0.38 m medidos") kept the English
  decimal point, because the bake composes it from the English numbers and the guard read only the
  strings written in the registry; so did one case reason ("recuperado, 3.68.") and five sentences of the
  pages that end on a number, which the guard's pattern excused.
- The label of the in-situ block on the distribution chart ended where it was meant to start: uPlot
  leaves the canvas right-aligned after its y axis, so it sat a label's width left of its line, and the
  percentile labels ran into the axis. Labels on the canvas are now left-aligned, take a row of their
  own when two would touch, and carry a halo where a line crosses them.

### Removed

- The six-tab workbench and the What if tab (`pages/Tool.tsx`, `pages/WhatIf.tsx`).
- The overrides for shell defects 1, 4 and 14, which the pinned shell carries; the dormant VPS unit and
  nginx site of the old layout.

### Known limits

- One override remains, for shell defect 23 (CAOS_APP_SHELL#54): a filling card beside another view
  takes the whole row, so each view of a row sits in a column of the product's own.
- The vertical sub-tab list of a documentation page scrolls away on a long section. From 0.05.000 a
  product rule kept it in view; it restyled a reserved shell class, so it went with the web-baseline
  guard, and the fix is the shell's (shell defect 24, CAOS_APP_SHELL#55).
- The abstention reasons written at bake time are in English on the Spanish interface.
- The template's version guard joins when CAOS_PRODUCT_TEMPLATE#19 is released; as it stands it rejects
  the release history in comments. The product's own test holds the requirement meanwhile.

## [0.06.000] - 2026-10-05

Baked on `blastfrag==0.4.0`, which adds three things to the benchmark: the classical arm capped at
the in-situ block, every arm's score on the rows every size-predicting arm answers, and a sweep of the
published network's hidden width. Benchmark schema `fragmenta.benchmark/v3`. This is the first release
whose design document came before its code (ADR-0075); the document covers everything earlier
retroactively, and says so. (#14)

### Added

- `kuznetsov-capped`, the classical mean size capped at the in-situ block, `min(x50, XB)`, as its own
  arm. Its provenance says the cap is a declared choice, not a published relation, and which arm it
  caps. It binds on three corpus blasts (Rc1 to Rc3, where the classical prediction exceeds the
  0.68 m block) and moves the classical arm from 0.311 to 0.352 held out by site. It runs live on the
  Distribution tab, which draws the block on the curve, and in What if, and it appears in the
  Benchmark, Methodology and Experiments pages and in the wiki.
- Common support: on every protocol, each arm's score on the rows every size-predicting arm answers
  (79 blasts from nine sites held out by site), beside its own score. It is reported and never
  decides the verdict, because those rows are selected by the arms' own refusals.
- The network width sweep: hidden widths 6 to 15 on the source's protocol, which picks 8 and 11
  where the paper reports 9 and 7, and every width held out by site, where every one scores below
  zero. On the Benchmark's "The published network" sub-tab and in the network's method page.
- The software design document (`docs/design/SDD.md`) and its feature folders, each requirement in
  EARS form naming the test or gate that holds it; `scripts/check_sdd.py` checks that every named
  gate exists, in CI.
- Non-circularity tests: no synthetic design carries a measured size or a score, none enters the
  benchmark, the designs depend on no arm, and the positive control is circular by design and says so.
- Two Spanish guards a word list cannot provide: the verb "está" where a participle, a gerund or a
  preposition follows, and the pronoun "él" before punctuation.
- Three browser-gate checks: one unit per size column, no empty band above the rail's last control,
  and the width sweep drawn on its sub-tab. The first two were run against the live 0.05.001 first,
  where both fail.
- Generated fact blocks for the bake's output (counts and sizes) and the site's payload, in place of
  typed sizes that had gone stale.

### Changed

- Every fragment size is stated in centimetres to one decimal. The unit was picked by magnitude,
  which put "22 mm" above "11.0 cm" in the model comparison's RMSE column, and millimetres beside
  centimetres in a readout whenever its sizes straddled 10 cm.
- The rail's reading pane no longer grows to fill the rail. It pushed the full-screen link to the
  bottom of the screen under an empty band, up to 243 px at 1600x900 on the live site.
- The bake pins BLAS to one thread before numpy loads. A multi-threaded BLAS spun on the network's
  small matrices (one width-15 fit took more than six minutes on a loaded workstation against about
  two seconds on one thread). The full bake took 745 s, against about 18 minutes before, and the pin
  changed no number.

### Fixed

- The cross-environment bake comparison could not pass since 0.05.000: each case carries the digest
  of its models file, a hash that moves with the last bit of any number in the file, and
  `scripts/compare_bakes.py` compared it as a string. Re-measured on Ubuntu 24.04 under WSL2 against
  the Windows bake, every case failed with every number within tolerance. The tool now compares the
  numbers that digest covers, the case's and its models file's, and keeps comparing the corpus digest
  exactly. Every case and its models file reproduces: the worst difference is 2.745e-08 in a case and
  7.0e-07 in a models file, on a near-zero network weight. The re-bake test had the same blind spot
  and could pass only on the machine that baked.
- Spanish: "está" without its accent in three case reasons ("5.6 GPa está bajo el mínimo", "el
  producto está inventando números", "la instalación está rota"), and "sobre él" on the Distribution
  tab.
- The manifest module still declared the retired benchmark schema v1; the constant is gone.

## [0.05.001] - 2026-10-05

0.05.000 was tagged and never published: the deploy's browser gate, on the Linux runner, failed it on
36 checks that never failed on Windows. The shell sets text in the system font stack, which Linux
resolves to DejaVu Sans, wider than Segoe UI. A Linux visitor would have seen the same breaks. The
artifacts were re-baked under 0.05.001 for their version stamps: of 419,184 numbers across 45 files,
none differs from the 0.05.000 bake. (#25)

### Fixed

- The documentation footer wrapped onto two rows at 1600x900 under DejaVu Sans (its ADR-0016 items
  need 1157 px in English and 1243 px in Spanish against 1152 px). Every route now uses the App
  route's compact footer (0.74 rem, tighter gaps), with room to spare in both languages.
- The App's model comparison was 29 px (English) and 47 px (Spanish) wider than its 326 px column at
  1280x800 under DejaVu Sans. Its two variance headers are now the docs' notation, R²id and r², with
  the full names in the tooltip (in both languages, English-only before) and in the note below; and a
  score of magnitude 1000 or more prints as a power of ten (the refitted regression's -117792.670 on
  Murgul, which set the column's width, reads -1.2×10⁵).
- The parity plot's hint was cut by its ellipsis in Spanish at 1280x800 on every platform ("Haga clic
  para selecciona..."). It is shorter in both languages, every readout hint and the focus view's title
  carry their whole text as a title, and the gate fails on any text an ellipsis cuts without one.
- The Implementation page said the footer repeats the bake's application version; it now says what
  holds it there: a re-bake test that requires the same numbers and versions, so every release
  re-bakes its artifacts.

### Added

- `GATE_FONTS=dejavu` runs the browser gate with the runner's fonts on any machine, so a wrap that only
  Linux shows is caught before the deploy.

## [0.05.000] - 2026-10-05

An adversarial review of the implementation, the models, the data, the pipeline and the results. The
headline it replaces ("not one of the six learned models explains any variance with a campaign held
out; the classical equation improves when a site is held out") rested on one random draw per protocol
and on different row sets for the classical and the learned arms. The benchmark now repeats its random
protocols, reports every grouped score on two row sets with site-resampled intervals, and states what
each arm was fitted on. (#25)

### Changed

- Baked on `blastfrag==0.3.0`: 100 random and 100 deduplicated draws per arm (median and 5th to 95th
  percentiles instead of one draw), leave-one-site-out pooled on two row sets (all 97 blasts, and the 91
  with resolvable geometry), site-resampled 95 percent intervals (2000 resamples), arm provenance
  (`in_sample_corpus`, `router_in_sample`, `uses_site_constant`), per-site errors, diagnostics (an
  Isolation Forest screen, native and held-out-site resampling importance), and a 30-seed network sweep.
  Benchmark schema `fragmenta.benchmark/v2`.
- The verdict now depends on the row set and says so: over every blast the learned tier does not meet
  the criterion, over the 91 with geometry it does, by 0.034 against intervals that span zero.
- The stacked ensemble is built as published (meta-learner on in-sample predictions); the earlier
  out-of-fold construction, and its -0.951, are gone.
- A transfer arm, `kuznetsov-transfer`: the classical equation with its rock factor predicted from the
  modulus over the training sites only. It scores within about 0.01 of the site-factor arm, so the
  classical score is not borrowed from the held-out site.
- Every learned arm runs live in the browser: the bake exports each training scope's fitted models
  (`data/derived/models/<scope>.json`, `fragmenta.models/v1`) and `frontend/src/engine/learned.ts`
  walks them, exactly for the tree models and to a relative 1e-12 for the network and the kernel, held
  by fixtures of the original models at 116 blasts. A new App tab, What if, recomputes every arm on a
  changed design; the Benchmark page re-scores the published hold-out in the browser.
- The five documentation pages are rewritten from the artifacts (Introduction, Methodology,
  Implementation, Experiments, Benchmark), every corpus number read from the committed files, with
  Crossref-verified citations scoped per section.
- Every diagram sizes itself from its text, with notes below the drawing; the architecture drawings are
  generated from the artifacts in both languages.
- The footer fits one row at every tested width.

### Fixed

- The release gate never read the benchmark artifact, the file the verdict comes from; it now checks its
  digest against its own and the index's, its corpus digest, and non-finite tokens.
- The deploy workflow described an artifact check that did not exist; it now runs the release gate
  (`scripts/check_artifacts.py`) on the engine and numpy only, before building.
- The kill criterion's history is stated as it happened: written as a margin over the null, its
  positivity half added after the first run declared success for an arm worse than a constant.
- The Methodology page said the two papers disagree on four rows; they disagree on five, and the
  recomputation matches the 2010 figure on four.
- Overlays: a strike-through crossed the protocol figure's text, and an arrow crossed a box in the web
  flow drawing; the browser gate now also tests every drawn line and path against every text.
- The What if tab's variant chart overprinted its labels; variants are drawn as labelled rows.
- Adjacent citations rendered run together, "(Hudaverdi et al. 2010)(Amoako et al. 2022)", in 25 places
  over the five pages, because JSX drops whitespace that holds a newline; the browser gate now fails on
  two citations with nothing between them.
- The footer left a "·" alone before its gap (shared shell defect 14: the shell pushes the version
  right with an auto margin and keeps the separator before it on the left); hidden by an override, and
  the footer check now fails on any separator that is not between two items on its row.
- The browser gate reports why a request failed, not only which one.
- The App's model comparison listed the classical distribution, the three-parameter distribution and
  the two-branch crush zone as rows of their own, with the classical mean size's exact scores: four
  rows that read as four models agreeing. They reuse that mean size and add only a curve shape, so they
  are now one sentence under its row (`sharesMeanSizeWith` in the arm catalogue, as the engine's
  `shares_mean_size_with`); a parity test checks on every committed case that they predict the same
  mean size and score the same, and the browser gate fails on two comparison rows with identical scores.
- The comparison table was 41 px wider than its column at 1600x900 and cut its last column; the tier
  badge now sits under the model name and the headers wrap. The gate fails on any table wider than its
  container outside a declared scroller.
- The App's tab strip was squeezed on the Predict tab (28 of its 32 px shown, the active tab cut):
  the shell's tab list hides vertical overflow, which lets a flex column shrink it under a tall panel.
  It keeps its height now, and the gate fails on any tab strip whose content is cut.
- Lint on the Python 3.11 target (a nested-quote f-string), and the CI step that claimed to install the
  engine.

### Documentation

- The `docs/` wiki rebuilt to ADR-0056: methods (seven pages), protocols (four), data and the data
  contract (four), a relevance page (the role, decision, limits and evidence of every tool), generated
  results (six), architecture (five, including portable models), frameworks (ten nodes, each with
  installation, usage and applying pages, and four runnable Python examples), cases, and five guides.
- Numbers that move with a bake are generated: `scripts/build_docs_results.py` renders the results
  pages and fills `<!-- facts:... -->` blocks in hand-written pages and this README; tests run it, the
  drawing generator and the four examples in check mode.

### Not repeated

- The cross-platform determinism measurement (worst relative difference 2.7e-08 between Windows and
  Linux) was made at 0.04 and has not been repeated for this release.

## [0.04.006] - 2026-10-04

### Fixed

- The published regression's leave-one-site-out score was presented as transfer to an unseen site.
  Hudaverdi et al. fitted its coefficients on these same 97 blasts, so its 0.802 is its in-sample fit
  (0.8018 over all 97); refitted without each site, the same form scores -4.075. The README, the
  Introduction, the Benchmark and two guides now say that only the classical mean-size equation
  (0.311) holds up on a site it has never seen, and that the regression's out-of-sample evidence is
  the source papers' own hold-outs (0.854 and 0.827 on 13 and 12 blasts from the same sites). The
  regression is marked in sample wherever the cross-site result is shown, and is drawn dashed, as a
  reference, in the protocol chart. No number changed and nothing was re-baked; the engine's verdict
  list, which makes the same claim, is tracked in `blastfrag`. (#22)

## [0.04.005] - 2026-09-26

### Changed

- The engine is consumed from PyPI: `blastfrag==0.2.2` replaces the git tag pin (hard rule 0; the trusted publisher
  exists since 2026-09-26). The sixteen cases and the benchmark were re-baked under it: every number is identical
  (`scripts/compare_bakes.py`, worst relative error 0), only the provenance fields moved (engine 0.02.002, digests).

### Fixed

- `compare_bakes.py` wrote the per-case manifests into the canonical `data/derived/manifests` while baking into its
  sandbox, because the pipeline resolved the manifest path from a module constant instead of the bake root. The
  manifest now lives under the root it was baked in, and a sandbox comparison leaves the working tree untouched.

## [0.04.004] - 2026-09-26

### Fixed

- The derived artifacts are regenerated by the pipeline (engine `blastfrag` at the pinned
  `v0.02.000`, pipeline `0.04.004`), so their `app_version` and digests are the pipeline's own again.
  The 0.04.003 release had rewritten `app_version` in the committed artifacts by text substitution
  instead of regenerating them; the numbers were unchanged, the provenance fields were not the
  pipeline's. `data-pipeline/run.py` reproduces this tree byte for byte.

## [0.04.003] - 2026-09-26

### Fixed

- The document declares the language the interface shows (shell known defect 4, caos-app-shell
  0.6.x): a `DocumentLanguage` component above the routes writes `document.documentElement.lang`
  from the shell's language store, so a Spanish page is read, indexed and translated as Spanish. It
  is removed when a shell release writes the language itself.
- A favicon. The browser gate no longer exempts it, and a first visit no longer logs a 404.

### Changed

- The browser gate checks the document language, and runs on the installed Chrome when
  `GATE_CHANNEL=chrome` (machines without Playwright's pinned build). It leaves CI for the deploy,
  the one place a failure can stop a broken site from being published (ADR-0074 rule 6); a develop
  push is validated locally.

## [0.04.002] - 2026-09-19

### Changed

- The App (EN and ES), the page description, the pipeline, the docs wiki and a test comment no
  longer use the word "honest"; each passage says what it means. The leave-one-site-out label reads
  "an unseen site in every fold" ("un sitio no visto en cada partición"), the Introduction section
  is "Scope" ("Alcance"), the description names the statistic (variance explained, not squared
  correlation), and the controls are the cases to read when judging whether the refusals are right.
- The shared shell's callout style keeps its internal name; it is never rendered as text.
- Artifacts re-baked at 0.04.002: only `app_version` and each file's digest change; every number is
  identical.

## [0.04.001] - 2026-09-11

### Fixed

- The accent guard could not see TEMPLATE LITERALS, which is where a product puts the Spanish that
  carries numbers. Widening it turned up **70 unaccented words across five files**, 57 of them in
  the architecture modal, a whole user-facing surface that had passed every previous run because
  its content is written as backtick strings.
- The geometry table printed `check.quantity.replace(/_/g, ' ')`, so `bench_height_m` read as
  "bench height" under a Spanish heading. Turning underscores into spaces made an identifier look
  like prose and hid that it had never been translated. The quantities and the control names have
  labels now, and the ranges read "4.5 a 5 m" rather than "4.5 to 5 m".

### Changed

- The guard builds one pattern per string delimiter instead of one alternation carrying a
  backreference. The first attempt at adding backticks used a three-delimiter character class and
  hung the guard outright on catastrophic backtracking, which is a worse failure than the blind spot
  it was fixing.

## [0.04.000] - 2026-09-11

Felipe: the Bench tab is a block image without any information. It was, and for two reasons at once.

### Fixed

- **The holes were drawn inside an opaque box.** Every charge column and every stemming plug sits
  inside the rock by construction, because that is where a blasthole is, and the bench was rendered
  solid. All 36 of them existed, the renderer counted 18 holes and said so on the element, and not
  one pixel reached the screen. The bench is translucent now, with `depthWrite` off so the columns
  behind it are not discarded before blending, and its edges are drawn so the block keeps a
  silhouette.
- **The rock took its colour from a TEXT token**, `--color-fg-subtle`, which is near-black in the
  light theme, so the bench rendered as a dark slab on a white page. It is a neutral border token
  now, which also keeps it clear of the accent blue and the warn amber that mark charge and stemming.
- The free face was tinted at 0.18 opacity and invisible, so the block had no orientation. It is
  outlined as well as tinted.
- The columns were drawn true to scale. A 165 mm hole in a 12 m bench is 1.4% of the height, which
  antialiasing eats, so they are drawn thicker than life and the real diameter is printed beside the
  view. Exaggerating a dimension to make it visible is fine; doing it silently is not.
- The camera framed the block at about a third of the canvas.
- The whole component was English. The button, the dimension line, the disclaimer and the legend all
  read in the page's language now.

### Added

- **The dimensions are on the drawing**, in a colour-keyed legend: charge length and mass, stemming,
  free face, burden by spacing, bench height and hole diameter. They started as text sprites in the
  3D scene and that was wrong: the reader can orbit, and every placement that read well at the
  opening angle collided with something at another. A legend in a fixed corner cannot collide, and
  being HTML it goes through the normal translation path, which text painted into a canvas never
  does.
- `data-bench-holes-visible`, a raycast from the camera to each charge that reports how many are
  actually reachable by eye, and a gate assertion on it.

### The instrument the gate needed

The existing check read the declared hole count and passed while the tab was blank. Three pixel
heuristics were tried against the broken view and every one measured something adjacent to the
question:

| attempt | on the broken view |
|---|---|
| count distinct colours | 90 colours, passed: a shaded grey box has plenty |
| classify pixels by colour | passed in dark: the palette's blues sit close together |
| count transitions along a scanline | 59 against 56, passed: it was counting the dimension lines |

The raycast separates them exactly, 18 visible against 0, in both themes and at every size, because
it asks the scene the question the reader is asking.

## [0.03.002] - 2026-09-10

### Fixed

- Two things on the App route were still English while the page was Spanish, and both were English
  for the same reason: they were not where a translation pass looks.
  - The parity plot's axis labels and its null-model marker are painted INTO the canvas, so no
    amount of reading the JSX would have found them.
  - `expected_band` was the one user-facing field in the artifact that was a bare string rather than
    a bilingual record, so a Spanish label sat above an English value. It is `{en, es}` now. The
    formulaic bands compose their Spanish from the coarseness word and the range; anything that is
    not formulaic RAISES at bake time unless its Spanish is written out, so the next band cannot
    ship in English by default.

The contract-mirror test caught the new language map on its first run, which is what it is for.

## [0.03.001] - 2026-09-10

### Fixed

- The instrument floor in the browser gate was set at 0.26 from one machine and failed on the CI
  runner at 0.257: the same build at the same viewport, a couple of pixels of difference in text
  metrics on another operating system, and the pane is that much shorter. It is 0.25 now, which
  still sits above the 0.219 this route measured before 0.03.000, so a regression to the old layout
  fails it. A threshold with no headroom measures the runner rather than the thing it is checking,
  which is the same lesson the bake's numeric tolerance taught earlier today.

## [0.03.000] - 2026-09-10

The App route did not follow the frontend ADRs. Felipe said so about the left rail, and an audit
against the quantified floors found the rail was the visible part of a layout that never composed
the shared shell at all.

### Changed

- Every route now composes the shell's own containers. The doc routes are `.page-body prose` and the
  App route is `.page-body wide`, instead of the product's own `.fr-prose { max-width: 78ch }` root
  and a bare `.fr-layout`. Picking a width the shell already owns is the divergence ADR-0017 section
  1.3 bans by name, and it is why nothing else about the sizing worked.
- The App route runs in the shell's `fixed` mode, so it is locked to the viewport and the rail can be
  bounded at all. Measured before: the rail was **1717px tall in an 800px viewport**, so 917px of
  controls sat below the fold on first paint. It now ends at 668px of 800.
- The case control is a `select` with one optgroup per category instead of sixteen chips under six
  headings (ADR-0071 rule 7).
- The rail is SPLIT rather than scrolled (rule 6): the case and model selectors are always visible
  because they steer every tab, and the case description and the provenance take turns in a pane
  below them.
- The full arm ranking moved out of the instrument's stage and in beside the score panel, which is
  the same question it answers. While it was in the stage it took 520 of the stage's 620 pixels and
  left the parity plot 58.
- The footer is one line again, as ADR-0016 section 2 asks. It had grown to 116px, and on a route
  locked to the viewport that is 13% of a 900px screen taken from the instrument permanently.
- The focus route's chart fills its stage: 747px square at 1600x900 where it was 640px.

### Fixed

- The chart measured its own canvas to choose its size, which is circular: the canvas then set that
  size as the container's height. The number never moved off 520px at any viewport from 1280 to
  2560. The measured host is out of flow now, and the chart scales with the window.
- The per-tab error boundary was a plain `<div>`, which is `display: block` with `min-height: auto`,
  and that one element broke the height chain the whole App route depends on.
- The layout was language-dependent: the Spanish footer wrapped an extra line and the Spanish
  readout hint wrapped, and between them the instrument measured 0.257 of the viewport in Spanish
  against 0.280 in English. The same screen gives the picture the same space in both languages now.
- The browser gate counted the distinct row positions of every `[role="tab"]` on the page, so adding
  a second tablist in the rail made it report that the tab strip had wrapped onto two rows when both
  strips were on one. It counts per tablist now.

### Known deviation, measured rather than hidden

ADR-0071 rule 8 asks the instrument to occupy at least **0.50** of the viewport on an App route.
This product reaches **0.28** at 1600x900 and **0.36** at 2560x1440, and cannot reach 0.50: the
instrument is a parity plot, which has to be square, and a square's area is capped by the pane
HEIGHT. At 1600x900 the pane is about 680px after the header, footer, tab strip and padding, so the
largest honest square is about 0.32 of the screen. 0.50 would need a side of 848px in a 680px pane.
Closing it means changing which chart lands on the App route, which is a product decision rather
than a layout fix. The gate asserts the achievable floor and names the shortfall.

## [0.02.002] - 2026-09-10

### Fixed

- Two words in the Spanish strings written for 0.02.001 were themselves unaccented, "puntua" in the
  verdict and "grafico" in a chart hint. Both are on the accent guard's list now, which is how that
  list is meant to grow: an entry earns its place by having shipped wrong once.

## [0.02.001] - 2026-09-10

### Fixed

- The verdict, which is the single most important sentence this product prints, was rendering in
  English to Spanish readers. The engine writes one English sentence and that stays the canonical
  record in the artifact, shown verbatim so the page and the file can never disagree; the Spanish is
  now composed in the product from the same structured fields, so it derives from the numbers rather
  than from prose and the two cannot drift apart.
- All three chart hints were hardcoded English, so a Spanish reader was told in English how to use
  the only interactive element on the page.
- The browser gate was setting `caos-lang` and `caos-theme` with hyphens. The shell stores them as
  `caos.lang` and `caos.theme`, so every run the gate labelled "es" was rendering English and it was
  reporting passing checks in a language it had never displayed. The keys are right now, and the
  gate ASSERTS the page came back in the language and theme it asked for rather than assuming it.
- The last tick on the collapse chart was clipped by the plot edge; the x scale is widened past the
  data so an end label has room.
- `best_learned_is_positive` was in every benchmark artifact and in no TypeScript interface.

### Added

- A test that walks every shipped artifact and fails on any field name the contract mirror never
  mentions. The comment in the pipeline claimed the web build fails on contract drift; it does not
  and cannot, because TypeScript is structural and an undeclared field type-checks perfectly while
  being invisible to the app. That comment is corrected and the check now exists. Confirmed by
  deleting a field from the mirror and watching the test name it.

## [0.02.000] - 2026-09-10

### Added

- The Benchmark page opens with the finding as a picture. One line per model across the three
  protocols puts the collapse on a slope: the fitted arms fall off a cliff at the third column, the
  two with fixed coefficients do not, and the null sits flat underneath. A table asked the reader to
  do that subtraction themselves.
- Line charts take a legend whose entries solo a series on click, dimming the rest rather than
  hiding them so the context stays. Past about four lines a hover readout is not enough.
- Line charts take pinned x ticks. Without them uPlot fills a categorical axis with its own ticks,
  every one of which rounds to the same label, and the axis reads as the same two words printed
  twenty times. It did.

### Fixed

- Two arms had no entry in the interface's arm catalogue and rendered as bare slugs beside properly
  named models: `svr-poly`, the polynomial kernel a second study chose and then reported as its own
  worst model, and `oracle`, the ceiling that proves the scoring harness is wired correctly. Both
  are described now, in both languages, and a test asserts that every arm in every shipped artifact
  has a catalogue entry.
- The parity plot is drawn at 520px rather than 340px, so the square uses the panel it sits in.
- `artifacts.ts` guards `import.meta.env`, which the bundler injects and plain Node does not have.
  That is what makes the module importable from the tests that now read its catalogue.

## [0.01.003] - 2026-09-10

### Fixed

- Every artifact URL was relative, so on any route but the landing page the app fetched its data
  from under that route and got a 404. GitHub Pages serves a route as a directory and redirects
  `/benchmark` to `/benchmark/`, which puts a path segment in the page's base URL, and
  `data/benchmark.json` then resolves to `/benchmark/data/benchmark.json`. A local preview server
  does not redirect, so the base URL stays at the root, the same code works, and the bug exists only
  in production. The paths are root-absolute now.

### Changed

- The browser gate visits both `/route` and `/route/`, because the trailing-slash form is the one
  the host actually serves and it is the only form in which the bug above is visible. It also checks
  the status of every response and, for an artifact URL, that what came back is JSON rather than the
  single-page fallback with a 200. Confirmed by reverting the fix: the gate fails on four routes,
  then passes when it is restored. 192 checks.
- The deploy workflow runs the browser gate against the artifact it is about to publish. Publishing
  a site that does not render is worse than not publishing, because it looks deployed.
- A unit test asserts the loader paths start with a slash, read from the source, because the
  behaviour needs the host to reproduce and the source does not.

## [0.01.002] - 2026-09-10

### Fixed

- The deployed site rendered a completely blank page on every route, and had done since it was
  first published. Two copies of react-router were installed: the shell declares a peer dependency
  on `react-router` and npm hoisted 8.3.1 to satisfy it, while `react-router-dom` 7.18.3 pinned its
  own nested 7.18.3. Two module instances mean two React contexts, so the shell's `useLocation` saw
  no Router and every route threw before painting a character. The app now depends on
  `react-router` directly and imports from it, which is what react-router 7 expects anyway, and
  there is exactly one copy.
- A chart handed uPlot `hooks.draw: undefined` when it had no zero line to draw. uPlot copies the
  keys it finds straight onto its hook table, so `draw` existed holding undefined and the next
  `fire('draw')` called `.forEach` on it. That took the Experiments route and the Explain and Decide
  tabs to a blank page. The key is now omitted rather than set to undefined.

### Added

- `frontend/gates/browser-gate.mjs`, run in CI against the built site: every route, six workbench
  tabs, three viewports, both themes, both languages. It asserts no console error, no horizontal
  overflow, no panel in its error boundary, a tab strip that has not wrapped, an idle page at rest,
  and that every chart DECLARES what it drew with a non-zero count. 156 checks.
- Charts declare their own content on the element, `data-chart` and `data-chart-*`, the way the 3D
  bench already declared its hole count. Sampling pixels cannot tell an empty canvas from a canvas
  that never mounted; a renderer saying what it drew can.
- Per-panel and per-tab error boundaries. One panel that throws now keeps its heading and prints
  what went wrong, and the rest of the tab stays usable, instead of unmounting the route into a
  white screen that is indistinguishable from a page that chose to show nothing.

## [0.01.001] - 2026-09-10

### Fixed

- The whole Spanish surface was shipping unaccented while the product's own navigation read
  "Introduccion" correctly, so the two halves of the same page disagreed. To a Spanish reader that
  is not a typo: "campana" is a bell, not a campaign, and "tamano" is not a word. Every Spanish
  string on every route and in the case registry now carries its accents, decided one occurrence at
  a time where the unaccented form is also a real word, which "mas", "esta", "si" and "solo" all are.
- The claim that re-running the bake produces byte-identical artifacts was true within one
  environment and false across machines, and it was written in six places including the App. Two
  builds of the same pinned numpy reduce a dot product in a different order, and no version pin
  removes that. Measured across all sixteen cases between Windows and Linux, the worst difference is
  2.7e-08 relative and the one case where every arm abstains is byte-identical. All six statements
  now say what was measured, and the cross-environment gate compares numbers against a named
  tolerance instead of comparing hashes.
- The heavy requirements carried version RANGES, so a bake on another machine installed different
  libraries and produced different numbers with every gate still green. Pinned exactly, with both
  workflows on the Python the canonical bake ran on.
- Every file the pipeline writes now goes through one writer that fixes the line ending at LF.
  `Path.write_text` translates newlines on Windows, so the same bake wrote the same numbers into
  files whose bytes differed by platform, and the byte size the manifest declared was wrong on one
  of them.
- The base-integrity guard meant to reject a real `.env` also matched `.env.example`, so it failed on
  the file the conventions require the repo to carry.

### Added

- `scripts/compare_bakes.py`, which re-bakes into a sandbox and reports the worst relative
  difference with its JSON path and its arm, so a reproducibility failure says how far off rather
  than only that two hashes differ.
- `scripts/check_guards.py` and `scripts/check_spanish_accents.py`, both runnable before pushing,
  both with tests that feed them the cases they exist to catch.

## [0.01.000] - 2026-09-10

### Added

- Sixteen cases across six categories, each stating in both languages why it is in the matrix, with
  eight variants apiece over families a blast engineer actually moves.
- Four controls, each attached only to the cases that can trigger it: a geometry negative control
  where six blasts have no publishable scale, a degenerate negative control where six designs have
  no charge column, an extrapolation control on five out-of-envelope field blasts, and a positive
  control whose truth a known model recovers at zero error.
- The nine-stage offline bake, none of them a no-op, ending in a release gate that re-reads what was
  written, re-checks every hash and fails on a single unexplained abstention.
- Leakage as a bake-time assertion: every learned model shown on a real campaign was trained on the
  corpus minus that campaign, and the bake fails if the case's own blasts are in its training rows.
- The web surface: six routes, a full-screen focus route outside the shell, a workbench with six
  tabs grouped by question, twelve interactive views, EN and ES, light and dark, and the in-app
  architecture modal with five hand-authored theme-aware SVGs.
- A TypeScript reimplementation of the closed-form models so the workbench is live, gated by 15
  parity checks against the baked numbers.

### Fixed

- Non-finite floats reaching the artifacts. Python writes `NaN` into JSON without complaint and no
  browser can parse it, so one of them anywhere made a whole artifact unreadable and the symptom
  would have been a blank page. Found by the parity gate on its first run. Now: they serialise as
  null, the writer raises rather than emitting invalid JSON, and the release gate greps for them.
