# Changelog

All notable changes to this project. Format follows Keep a Changelog; newest on top.

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
