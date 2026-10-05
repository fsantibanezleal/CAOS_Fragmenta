# Requirements: the App on the shared base

Status: planned

Designed 2026-10-05, before its code (ADR-0075), for backlog items BL-031 and BL-034 and issue #14: adopt the shell's
workbench (ADR-0078 s5), pinned exactly, and meet ADR-0071 rule 8 as the base measures it. EARS.

| ID | Requirement | Gate |
|---|---|---|
| WB-001 | THE frontend SHALL pin the shell to one exact version and SHALL record the template version the product follows in `.template-version`. | `tests/test_guards.py::test_the_shell_is_pinned_exactly_and_the_template_version_is_recorded` |
| WB-002 | THE App route SHALL be one `CaseWorkbench`: the case picker, the variants and the product's controls in the rail, and at most six question groups in the instrument. | `frontend/scripts/gate.mjs` |
| WB-003 | WHILE the App route is open at 1280x800 or larger, THE drawn views of every group SHALL cover at least half of the viewport. | `frontend/scripts/gate.mjs` |
| WB-004 | WHEN any registered control changes, THE selection key SHALL change, and no view SHALL keep showing an earlier key. | `frontend/scripts/gate.mjs` |
| WB-005 | EVERY view and readout SHALL declare its lane and its provenance. | `frontend/scripts/gate.mjs` |
| WB-006 | THE product SHALL remove every local override of a shell defect the pinned shell carries, and SHALL keep each remaining override beside the open defect entry it answers. | `tests/test_guards.py::test_every_shell_override_names_an_open_defect` |
| WB-007 | THE product's own browser gate SHALL keep passing on every route in both font sets. | `frontend/gates/browser-gate.mjs` |
| WB-008 | THE version SHALL have one source, VERSION, which every other statement of it follows. | `scripts/check_version_coherence.py` |
| WB-009 | THE views SHALL use only defined tokens and styled classes, SHALL format numbers through the shell, and SHALL run no animation loop outside the shell's paused loop. | `scripts/check_web_baseline.py` |
| WB-010 | THE product SHALL carry the files of one deploy place, GitHub Pages, and none of another. | `scripts/check_deploy_place.py` |
