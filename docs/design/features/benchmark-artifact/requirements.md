# Requirements: the benchmark artifact

Retroactive (written 2026-10-05; the code is 0.01.003 to 0.05.001). EARS. The 0.06.000 additions (the capped
arm, common support, the width sweep) are `features/benchmark-0-4/`.

| ID | Requirement | Gate |
|---|---|---|
| BA-001 | THE benchmark artifact SHALL carry the verdict and the declared criterion verbatim. | `tests/test_pipeline.py::test_the_benchmark_carries_the_verdict_and_the_criterion` |
| BA-002 | THE benchmark SHALL report all three protocols, the random ones as a spread over their draws, not one draw. | `tests/test_pipeline.py::test_the_benchmark_reports_all_three_protocols`, `tests/test_pipeline.py::test_the_random_protocols_are_baked_as_a_spread_not_a_draw` |
| BA-003 | EVERY site-held-out score SHALL carry both row sets and a site-resampled interval. | `tests/test_pipeline.py::test_every_site_held_out_score_carries_both_supports_and_an_interval` |
| BA-004 | WHEN the criterion's outcome differs between the row sets, THE artifact SHALL say that the verdict depends on the row set. | `tests/test_pipeline.py::test_the_verdict_reports_that_it_depends_on_the_row_set` |
| BA-005 | THE transfer arm SHALL be benchmarked and reported per case. | `tests/test_pipeline.py::test_the_transfer_rung_is_benchmarked_and_reported_per_case` |
| BA-006 | THE published reproductions and the network seed sweep SHALL be baked with their ranges. | `tests/test_pipeline.py::test_the_published_reproduction_gain_is_baked`, `tests/test_pipeline.py::test_the_seed_sweep_is_baked_with_its_range` |
| BA-007 | THE artifact SHALL name the sites with their sizes and state a measurement method only where the source does. | `tests/test_pipeline.py::test_the_benchmark_names_the_sites_and_their_sizes`, `tests/test_pipeline.py::test_the_site_metadata_states_measurement_only_where_the_source_does` |
| BA-008 | THE duplicate groups and the diagnostics SHALL be baked, the outlier screen reporting without filtering. | `tests/test_pipeline.py::test_the_duplicate_groups_are_baked`, `tests/test_pipeline.py::test_the_diagnostics_are_baked_and_report_without_filtering` |
| BA-009 | THE case predictions SHALL be what the shipped models return. | `tests/test_pipeline.py::test_the_case_predictions_are_what_the_shipped_models_return` |
