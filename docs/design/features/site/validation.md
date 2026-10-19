# Adversarial validation: the site, as measured in a browser

Every requirement of this feature is held by the browser gate, `frontend/scripts/browser-gate.mjs`. The gate is run on
builds of throwaway copies of the product with one defect planted per requirement, served on port 4191, and each test
asserts the gate's own failure message for its defect. A clean build passes the same gate
(`test_the_browser_gate_passes_on_the_clean_build`), so the messages are the plants' and not noise (for ST-013 the control is the clean build under GATE_FONTS=dejavu). The messages are
distinct, so many plants share one build. Two plants hide the checks after them in the gate's walk of the workbench (a console
error, and a wrapped tab strip), so they have builds of their own: ST-001 and ST-013 share the first, ST-005 has the second.

The copy's gate is cut to the 1600x900 viewport in the light theme and drops the phone and tablet sweep, so a run takes
minutes; the same rules are measured, at one size, and the full matrix (three viewports, both themes, the phone and the
tablet) is the deploy's and the pre-push run's. The whole gate on the clean tree, run once on this release, passed: 492
checks, 0 failed.

Every row is local-only for the same reason: the tests need node, the installed frontend, the built site and a Playwright
browser, none of which the checks job has.

| requirement | adversarial check | gate |
|---|---|---|
| ST-001 | a console error and a request for a file that is not there are planted at the start of the app, and the gate fails on every route and prints both reasons (local-only: needs node, the built site and a Playwright browser) | `tests/adversarial/test_adv_web.py::test_st001_a_console_error_and_a_failed_request_are_found_and_named` |
| ST-002 | the document is forced to declare English whatever was asked, and the gate fails in the Spanish run saying the page reads es while the document declares en (local-only: needs node, the built site and a Playwright browser) | `tests/adversarial/test_adv_web.py::test_st002_a_document_that_declares_the_wrong_language_is_found` |
| ST-003 | the body is made the scroller, which is shell defect 1, and a block 4000 px wide is added: the gate reports that the document cannot scroll and that the page is wider than the screen (local-only: needs node, the built site and a Playwright browser) | `tests/adversarial/test_adv_web.py::test_st003_a_document_that_cannot_scroll_and_a_page_wider_than_the_screen_are_found` |
| ST-004 | the case control is changed from a select to chips, the rail's controls are pushed below the fold and a block 3000 px high is added: the gate reports the missing optgroups, the controls below the fold and the page that scrolls (local-only: needs node, the built site and a Playwright browser) | `tests/adversarial/test_adv_web.py::test_st004_a_case_control_without_groups_controls_below_the_fold_and_a_page_that_scrolls_are_found` |
| ST-005 | every tab of a strip is laid out on a row of its own, and the gate reports the strip wrapped onto several rows (local-only: needs node, the built site and a Playwright browser) | `tests/adversarial/test_adv_web.py::test_st005_tab_strips_wrapped_onto_several_rows_are_found` |
| ST-006 | every chart's declaration of what it drew is written as zero, and the gate reports a chart that declared nothing drawn (local-only: needs node, the built site and a Playwright browser) | `tests/adversarial/test_adv_web.py::test_st006_a_chart_that_declares_nothing_drawn_is_found` |
| ST-007 | the axis title of the Benchmark figure is moved onto its tick labels, and the gate's measurement of the figure reports text overlapping text (local-only: needs node, the built site and a Playwright browser) | `tests/adversarial/test_adv_web.py::test_st007_text_on_text_in_a_figure_is_found` |
| ST-008 | the footer's meta line is held to a 220 px box, and the gate reports a footer on several rows at 1600x900 (local-only: needs node, the built site and a Playwright browser) | `tests/adversarial/test_adv_web.py::test_st008_a_footer_that_wraps_is_found` |
| ST-009 | three plants: two citations written back to back, a table of the App 3000 px wide outside any scroller, and the text of a documentation paragraph cut by an ellipsis with no title, each reported by the gate (local-only: needs node, the built site and a Playwright browser) | `tests/adversarial/test_adv_web.py::test_st009_citations_run_together_a_table_wider_than_its_container_and_text_cut_without_a_title_are_found` |
| ST-010 | the arms that share the classical mean size are given a row of their own in the comparison, and the gate reports comparison rows with identical scores (local-only: needs node, the built site and a Playwright browser) | `tests/adversarial/test_adv_web.py::test_st010_two_rows_with_identical_scores_are_found` |
| ST-011 | two plants: the bench block is made opaque, so no charge column can be seen though the view declares them, and the timing disclaimer's marker is removed, each reported by the gate (local-only: needs node, the built site and a Playwright browser) | `tests/adversarial/test_adv_web.py::test_st011_a_bench_without_visible_charge_columns_and_without_its_disclaimer_is_found` |
| ST-012 | an interval clears every 2D canvas every 150 ms, and the gate counts the redraws of a page nobody touches and fails (local-only: needs node, the built site and a Playwright browser) | `tests/adversarial/test_adv_web.py::test_st012_an_app_that_redraws_while_idle_is_found` |
| ST-013 | the body is given a font of its own with the highest priority while the gate is run with GATE_FONTS=dejavu, and the gate fails saying the page is not set in the runner's fonts, while the clean build under the same variable reports no font failure (local-only: needs node, the built site and a Playwright browser) | `tests/adversarial/test_adv_web.py::test_st013_a_page_that_ignores_the_runners_fonts_is_found` |
