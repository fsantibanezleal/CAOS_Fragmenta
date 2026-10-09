# Requirements: the wiki and the guards

Retroactive (written 2026-10-05; the code is 0.01.000 to 0.05.001). EARS.

| ID | Requirement | Gate |
|---|---|---|
| DG-001 | THE results pages and every fact block in a hand-written page SHALL be generated from the committed benchmark, and SHALL fail the suite when stale. | `tests/test_guards.py::test_the_docs_results_and_fact_blocks_are_generated_from_the_committed_benchmark` |
| DG-002 | THE architecture drawings SHALL be generated from the committed artifacts. | `tests/test_guards.py::test_the_architecture_drawings_are_generated_from_the_committed_artifacts` |
| DG-003 | THE framework examples in the wiki SHALL run and agree with the engine. | `tests/test_guards.py::test_the_framework_examples_in_the_docs_run_and_agree_with_the_engine` |
| DG-004 | IF a source article, a real environment file, a binary or an internal package is tracked, THEN THE guards SHALL fail. | `tests/test_guards.py::test_the_copyright_guard_rejects_a_source_article`, `tests/test_guards.py::test_the_env_guard_rejects_a_real_env`, `tests/test_guards.py::test_the_binary_guard_rejects_environments_and_native_artifacts`, `tests/test_guards.py::test_the_package_guard_rejects_an_internal_lab` |
| DG-005 | THE Spanish surface SHALL carry its accents, and THE guard SHALL reject a decomposed or mis-encoded accent. | `tests/test_guards.py::test_the_accent_guard_catches_a_word_that_shipped_wrong`, `tests/test_guards.py::test_the_accent_guard_rejects_a_decomposed_accent`, `tests/test_guards.py::test_the_accent_guard_rejects_a_mis_encoded_string` |
| DG-006 | THE tracked content SHALL carry no em-dash and no emoji. | `scripts/check_content_standards.py` |
| DG-007 | THE CI SHALL stay within its budget: trunk-only triggers, no training, no bake. | `scripts/check_ci_budget.py` |
| DG-008 | EVERY requirement of this product SHALL name a gate that exists. | `scripts/check_sdd.py` |
