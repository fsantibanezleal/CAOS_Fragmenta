# Requirements: the hygiene items of issue #14

Designed 2026-10-05, before its code (ADR-0075), for backlog item BL-035, plus two classes of Spanish errors the
accent guard cannot see. EARS.

| ID | Requirement | Gate |
|---|---|---|
| HY-001 | THE model comparison and every table of sizes SHALL state one unit per column. | `frontend/gates/browser-gate.mjs` (`mixedUnits`); `frontend/test/parity.test.ts::every fragment size is stated in one unit, whatever its magnitude` |
| HY-002 | THE rail SHALL leave no gap above its last control larger than the gap between its other controls. | `frontend/gates/browser-gate.mjs` (`railGaps`) |
| HY-003 | THE Spanish text SHALL write the verb "está" where the sentence needs the verb, which a word list cannot decide. | `tests/test_guards.py::test_the_spanish_surface_writes_the_verb_esta_where_a_participle_follows` |
| HY-004 | THE Spanish text SHALL write the pronoun "él" where it stands before punctuation. | `tests/test_guards.py::test_the_spanish_surface_writes_the_pronoun_el_before_punctuation` |
