- Base adoption (release 0.09.000, unit F4): the shell is pinned at 0.17.0 (exact, lock file included) and the template at 0.09.000
  (`.template-version`); `product.json` records the App as a workbench (`"app": "workbench"`).
- The template's guards taken verbatim from v0.09.000: `scripts/check_sdd.py`, `check_tech_matrix.py`, `check_documents.py`,
  `check_contracts.py`, `check_base_integrity.py`, `check_content_standards.py`, `scripts/.content_standards_allow` and
  `frontend/scripts/gate.mjs`; the guards job runs `check_base_integrity.py` beside the product's own `check_guards.py`.
- The contract catalog gains the `documents` column (which committed files each row's schema governs); `check_documents.py` no
  longer names a document, and the readiness document and the fixture tree are recomputed for the changed catalog.
- Three comments of `.gitignore` carried an em-dash, which the content-standards guard now finds; they read with a colon or a comma.
- The size distribution, the parity plot and the lines of the documentation pages are drawn by the shell's `UPlotChart` (log x
  axis, parity form, reference lines, points on their own x), through `viz/plots.tsx`; the product's own uPlot wrapper
  (`viz/Charts.tsx`) is removed (BL-042). The case select is no longer cut beside the Focus control (shell 0.17.0, BL-074).
