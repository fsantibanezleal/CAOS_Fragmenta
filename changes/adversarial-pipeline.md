- Every requirement of the pipeline features has an adversarial validation row: `bake-and-cases` (14), `benchmark-0-4` (8),
  `benchmark-artifact` (9) and `non-circularity` (4), each in its feature's `validation.md`, naming a test of
  `tests/adversarial/test_adv_pipeline.py` that plants the forbidden defect in a throwaway copy of the committed tree, runs
  the requirement's own gate on the copy and asserts that the gate fails with a message naming the plant. The same gates pass
  on the clean copy. The plants never write into the real tree and never bake (the two that re-bake, BK-013, re-bake one case
  into a sandbox, as their gates do).
- The plants that cannot disturb one another's gates share a copy and one gate run (documents read by disjoint gates, the
  pipeline's source files, the two digest plants that keep a file's size), so the module costs seconds; each test still
  requires its own gate's failure text to name its own plant. The module is a precondition skip where the pinned engine is
  absent (CI's checks job). EN-002, EN-003 and EN-008 need node and `npm ci`, and EN-008 also a Playwright browser and a
  production build served on port 4190; EN-006 needs more than one core: their rows say `local-only`.
