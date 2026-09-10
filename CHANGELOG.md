# Changelog

All notable changes to this project. Format follows Keep a Changelog; newest on top.

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
