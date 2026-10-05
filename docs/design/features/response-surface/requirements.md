# Requirements: the design response surface

Status: planned

Designed 2026-10-05, before its code (ADR-0075), for backlog item BL-030 (research dossier on visualization,
section 1.6; audit item G-04): the What if tab moves one lever at a time, which cannot show the interaction that
makes blast design a design problem. EARS.

| ID | Requirement | Gate |
|---|---|---|
| RS-001 | THE Design group SHALL draw the selected arm's predicted mean size, or P80, over the burden and spacing plane at the case's fixed rock, diameter and powder factor, computed in the browser. | `frontend/test/surface.test.ts::the surface is the live engine evaluated on its grid` |
| RS-002 | THE surface SHALL draw iso-lines at the crusher's target P80 and at the oversize limit. | `frontend/test/surface.test.ts::the iso-lines separate the cells above their level from the cells below` |
| RS-003 | IF a grid cell is not a blast, or its prediction leaves the plausible range, THEN THE surface SHALL leave the cell empty and SHALL give the reason on hover. | `frontend/test/surface.test.ts::a cell that is not a blast is left empty with its reason` |
| RS-004 | WHEN the reader moves the design marker, THE distribution and the readouts SHALL update to the marked design. | `frontend/scripts/gate.mjs` |
| RS-005 | THE surface SHALL declare its grid, the cells it drew and the cells it left empty. | `frontend/gates/browser-gate.mjs` |
| RS-006 | WHERE the selected arm is a learned arm, THE surface SHALL walk the case's own training-scope models, so a held-out site's surface uses models fitted without it. | `frontend/test/surface.test.ts::a learned surface uses the models of the case's own training scope` |
