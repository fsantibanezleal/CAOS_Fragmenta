# Adversarial validation: the wiki and the guards

For each requirement of [`requirements.md`](requirements.md), the check that tries to break it: what was planted, and the
test that plants it. Every test copies the repository's files into a throwaway tree, plants one defect, runs the
requirement's own gate on the copy and asserts that the planted copy fails with the message that names the defect (the
clean copy passes the gate, which each test also runs). Nothing is written into the real tree.

| requirement | adversarial check | gate |
|---|---|---|
| DG-001 | a number of a results page changed by one digit, and a number inside a fact block of a hand-written page changed by one digit, are each reported out of date by the generator in check mode, which names the page | `tests/adversarial/test_adv_base.py::test_dg001_a_number_changed_in_a_results_page_and_in_a_fact_block_is_stale` |
| DG-002 | a digit changed in a generated architecture drawing is reported out of date by the generator in check mode, which names the drawing | `tests/adversarial/test_adv_base.py::test_dg002_a_number_changed_in_an_architecture_drawing_is_stale` |
| DG-003 | the numpy example edited so that its squared correlation is cubed no longer prints the figure the framework test asserts, and the test fails naming it (local-only: the examples fit small models on the engine, which the checks job does not install) | `tests/adversarial/test_adv_base.py::test_dg003_an_example_that_no_longer_agrees_with_the_engine_fails_the_framework_gate` |
| DG-004 | a tracked source article, a tracked real `.env`, a tracked environment and native binary, and an internal lab package with a `[project]` table are all planted in one copy, and the base guard names each | `tests/adversarial/test_adv_base.py::test_dg004_a_source_article_a_real_env_a_binary_and_an_internal_package_are_each_found` |
| DG-005 | an unaccented Spanish word, a decomposed accent and a mis-encoded string in a source file are each found by the accent guard on their own line | `tests/adversarial/test_adv_base.py::test_dg005_an_unaccented_a_decomposed_and_a_mis_encoded_spanish_string_are_each_found` |
| DG-006 | an em-dash in a document and an emoji in a source file of a tracked copy are found by the content guard, which names both files and lines | `tests/adversarial/test_adv_base.py::test_dg006_an_em_dash_and_an_emoji_in_tracked_content_are_found` |
| DG-007 | a pull_request trigger, the whole test suite in the workflow and a bake step are each planted in the workflow, and the budget guard fails on each | `tests/adversarial/test_adv_base.py::test_dg007_a_pull_request_trigger_a_training_step_and_the_whole_suite_break_the_ci_budget` |
| DG-008 | a requirement added with a gate that names a test file that does not exist is named by the design guard, and the clean copy has no finding for it | `tests/adversarial/test_adv_base.py::test_dg008_a_requirement_whose_gate_does_not_exist_is_named_by_the_design_guard` |
