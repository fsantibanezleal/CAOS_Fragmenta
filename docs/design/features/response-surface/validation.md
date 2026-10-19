# Adversarial validation: the design response surface

For each requirement of [`requirements.md`](requirements.md), the check that tries to break it. RS-001, RS-002, RS-003 and
RS-006 are held by the Node tests of `frontend/test/surface.test.ts`: a defect is planted in a throwaway copy of the engine or
of the committed data, the named test is run with Node on the copy and must fail, while it passes on the clean copy. RS-004
and RS-005 are held by the browser gate, run on a build of a copy with the defect planted.

| requirement | adversarial check | gate |
|---|---|---|
| RS-001 | every grid cell is evaluated at a burden 5 percent off its own, and the test that holds each cell to the live engine on the same design fails (local-only: needs node and npm ci in frontend) | `tests/adversarial/test_adv_web.py::test_rs001_a_cell_evaluated_on_a_shifted_burden_is_found` |
| RS-002 | one corner of the marching-squares classification is inverted, so a segment lands on an edge whose two ends are on the same side of the level, and the iso-line test fails (local-only: needs node and npm ci in frontend) | `tests/adversarial/test_adv_web.py::test_rs002_an_iso_line_that_misclassifies_one_corner_of_a_square_is_found` |
| RS-003 | an empty cell's reason is dropped, and the test that asks for "no charge column" in both languages on a design that is not a blast fails (local-only: needs node and npm ci in frontend) | `tests/adversarial/test_adv_web.py::test_rs003_an_empty_cell_that_loses_its_reason_is_found` |
| RS-004 | the marker handler no longer moves the design, so four arrow-key presses leave the distribution's percentiles as they were, and the browser gate reports it (local-only: needs node, the built site and a Playwright browser) | `tests/adversarial/test_adv_web.py::test_rs004_a_marker_that_no_longer_moves_the_design_is_found` |
| RS-005 | the surface declares one drawn cell more than it drew, so drawn plus empty no longer adds up to the grid, and the browser gate reports the declaration (local-only: needs node, the built site and a Playwright browser) | `tests/adversarial/test_adv_web.py::test_rs005_a_surface_declaring_cells_that_do_not_add_up_is_found` |
| RS-006 | the committed artifact of the held-out case is made to name the corpus models file instead of its own training scope, and the test that holds the surface to the case's own models fails (local-only: needs node and npm ci in frontend) | `tests/adversarial/test_adv_web.py::test_rs006_a_held_out_case_that_names_the_corpus_models_is_found` |
