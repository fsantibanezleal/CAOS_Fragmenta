# Requirements: the product on blastfrag 0.4.0

Status: planned

Designed 2026-10-05, before its code (ADR-0075). The engine's 0.4.0 features are designed in its own SDD
(`features/in-situ-cap/`, `features/width-sweep/`, `features/common-support/` in CAOS_BlastFrag); this is what the
product bakes, mirrors and shows of them. EARS.

| ID | Requirement | Gate |
|---|---|---|
| EN-001 | THE benchmark SHALL include the capped classical arm, with provenance stating that the cap is a declared choice and which arm it caps. | `tests/test_pipeline.py::test_the_capped_arm_is_benchmarked_with_its_declared_provenance` |
| EN-002 | EVERY case SHALL carry the capped arm's predictions, and WHERE the cap binds on no blast of a case, ITS scores SHALL equal the classical arm's. | `frontend/test/parity.test.ts::the capped classical arm equals the classical arm wherever its cap does not bind` |
| EN-003 | THE browser's capped mean size SHALL match the baked value on every reconstructable blast. | `frontend/test/parity.test.ts::the capped classical mean size matches the baked value on every reconstructable blast` |
| EN-004 | EVERY arm under every protocol SHALL carry its common-support score, with the rows it was computed on. | `tests/test_pipeline.py::test_every_arm_carries_its_common_support_score` |
| EN-005 | THE benchmark SHALL carry the network width sweep: the source's protocol with its choice beside the published widths, and every width held out by site. | `tests/test_pipeline.py::test_the_width_sweep_is_baked_beside_the_published_widths` |
| EN-006 | THE bake SHALL pin BLAS to one thread, so a loaded machine cannot slow the network fits by orders of magnitude and the thread count cannot reorder a reduction. | `tests/test_pipeline.py::test_the_bake_pins_blas_to_one_thread` |
| EN-007 | THE generated results pages SHALL report the capped arm, the common-support scores and the width sweep. | `tests/test_guards.py::test_the_results_pages_report_the_cap_common_support_and_the_width_sweep` |
| EN-008 | THE Benchmark page SHALL draw the width sweep and declare what it drew. | `frontend/gates/browser-gate.mjs` |
