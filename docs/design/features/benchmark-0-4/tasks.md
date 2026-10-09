# Tasks: the product on blastfrag 0.4.0

1. Pin the engine and BLAS (EN-006).
2. The capped arm in the cases, the browser port and the catalogue (EN-001 to EN-003).
3. The v3 benchmark: common support and the width sweep, mirrored in the contract (EN-004, EN-005).
4. The re-bake and the diff against 0.05.001.
5. The pages, the generated wiki and the method pages (EN-007, EN-008).

## Convergence, 2026-10-05

| Requirement | Gate | Result |
|---|---|---|
| EN-001, EN-004 to EN-007 | `tests/test_pipeline.py` (the schema v3 block), `tests/test_guards.py` | passed, in a suite of 77 |
| EN-002, EN-003 | `frontend/test/parity.test.ts` | passed, in a suite of 26 |
| EN-008 | `frontend/gates/browser-gate.mjs` | passed: the published-network sub-tab declares ten widths drawn, in both languages and themes at the reading width; a renamed sub-tab now fails the gate instead of skipping the check |

The release checks of task 4:

- **Against 0.05.001**, field by field: only the added keys (the capped arm, `common`, `network_width_sweep`), the
  file sizes, the versions, the verdict lists that name arms and the Spanish reasons changed; no score,
  prediction or interval of 0.05.001 moved.
- **The final bake against the one before the version bump**: 45 files and 423,793 numbers, none different; only the
  45 version stamps and 88 digests changed. The bake took 747 s.
- **Across environments**, `scripts/compare_bakes.py` on Ubuntu 24.04 under WSL2 against the artifacts baked on
  Windows 11: every case and its models file within the tolerance, the worst 2.7e-08 in a case and 7.0e-07 in a
  models file, on a near-zero network weight. The first run failed every case on the digest of its models file,
  compared as a string with every number within tolerance; the tool now compares the numbers that digest covers
  (`tests/test_pipeline.py::test_the_bake_comparison_skips_only_the_digests_computed_over_numbers`).
