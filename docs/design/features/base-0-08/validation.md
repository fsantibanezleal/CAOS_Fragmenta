# Adversarial validation: release 0.08.000

For each requirement of [`requirements.md`](requirements.md), the check that tries to break it: what was planted or
refuted, and the test that plants it. A requirement whose gate is an ordinary test, with no planted defect in the
repository, has no row yet and `scripts/check_sdd.py` says so: RT-001 to RT-003, EV-002, EV-003, PG-001, PG-002,
CT-003 and BR-001 (their gates prove the requirement passes, not that it can fail).

| requirement | adversarial check | gate |
|---|---|---|
| RT-004 | the gate runner is run against a stub shell gate and must always hand `--require-focus` to it, so an App without its Focus control cannot pass unnoticed (local-only: needs node and the installed frontend, which the checks job does not install) | `tests/adversarial/test_animation_and_focus.py::test_the_gate_runner_always_passes_require_focus_to_the_shell_gate` |
| EV-001 | a value breaking the schema (a wrong type, an extra key, a missing field) in a copy of the data file fails the guard and names the field path | `tests/adversarial/test_spec_guards.py::test_view_a_file_that_breaks_the_schema_names_the_field_path` |
| CT-001 | an absent document is a failure that names its path, and a field the schema does not name fails at the top and two levels down | `frontend/src/lib/contract.test.ts::adversarial: an absent document is a failure naming its path` |
| CT-002 | a broken artifact handed to the export stops the bake with the path of the field, and nothing is written | `tests/contracts/test_export_validation.py::test_adversarial_a_broken_artifact_stops_the_bake_with_the_path_of_the_field` |
| CT-004 | the states are planted one by one (missing index, partial manifests, missing benchmark, stale version) and each row takes the state the rules give, the most severe winning | `tests/contracts/test_readiness.py::test_adversarial_state_stale` |
| CT-005 | a schema edited without a version bump fails the version guard | `tests/adversarial/test_adv_contracts.py::test_versions_a_schema_edited_without_a_version_bump` |
| GD-001 | a copy of the design document without one of its sections fails the SDD guard naming the section | `tests/adversarial/test_spec_guards.py::test_sdd_missing_new_section_is_named` |
| GD-002 | the guards run on the clean copy pass, and each planted copy fails with its message (the rest of the file) | `tests/adversarial/test_adv_fragmenta_guards.py::test_every_guard_passes_on_the_clean_copy` |
