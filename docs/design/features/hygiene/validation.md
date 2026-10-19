# Adversarial validation: the hygiene items of issue #14

For each requirement of [`requirements.md`](requirements.md), the check that tries to break it. HY-001 and HY-002 are held by
the browser gate, which the test runs on a build of a throwaway copy with the defect planted; HY-003 and HY-004 are held by
the Spanish guard tests of `tests/test_guards.py`, which the test runs on a copy with an offending Spanish string planted
(these two run in CI, without node).

| requirement | adversarial check | gate |
|---|---|---|
| HY-001 | two plants: the size formatter is changed to write millimetres below ten centimetres, and the unit test of the formatter fails by name; the same change in a build makes the browser gate report that a size column mixes units (local-only: needs node and npm ci in frontend, and for the build a Playwright browser) | `tests/adversarial/test_adv_web.py::test_hy001_a_size_stated_in_millimetres_below_ten_centimetres_is_found_by_the_unit_test`, `tests/adversarial/test_adv_web.py::test_hy001_sizes_in_two_units_in_one_column_are_found_by_the_browser_gate` |
| HY-002 | a margin of 90 px is planted above the rail's last child, and the browser gate reports the empty rail above its last control against the gap between the others (local-only: needs node, the built site and a Playwright browser) | `tests/adversarial/test_adv_web.py::test_hy002_a_band_of_empty_rail_above_the_last_control_is_found` |
| HY-003 | the Spanish string "la instalación esta rota" is planted in a source file of the copy, and the guard test, run there, fails with "needs the verb"; the clean copy passes | `tests/adversarial/test_adv_web.py::test_hy003_a_participle_after_the_unaccented_esta_in_a_spanish_string_is_found` |
| HY-004 | the Spanish string "ningún modelo puede correr sobre el." is planted in a source file of the copy, and the guard test, run there, fails with "needs the pronoun"; the clean copy passes | `tests/adversarial/test_adv_web.py::test_hy004_the_unaccented_pronoun_before_a_full_stop_in_a_spanish_string_is_found` |
