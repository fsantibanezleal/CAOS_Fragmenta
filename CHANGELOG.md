# Changelog

All notable changes to this project. Format follows Keep a Changelog; newest on top.

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
