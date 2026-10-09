# Requirements: the site, as measured in a browser

Retroactive (written 2026-10-05; the gate grew from 0.01.003 to 0.05.001). EARS. The gate is
`frontend/gates/browser-gate.mjs`: every route in both its forms, six workbench tabs, three viewports, both themes,
both languages, run before a push, by the deploy on the artifact it publishes, and against the deployed site.

| ID | Requirement | Gate |
|---|---|---|
| ST-001 | WHEN any route is opened directly, with or without a trailing slash, THE site SHALL render it with no console error and no failed request, and SHALL name the reason of any failure. | `frontend/gates/browser-gate.mjs` |
| ST-002 | WHEN a reader asks for a language or a theme, THE page SHALL render in it and SHALL declare the language on the document. | `frontend/gates/browser-gate.mjs` |
| ST-003 | THE document SHALL scroll on a page taller than the viewport, and no page SHALL scroll sideways. | `frontend/gates/browser-gate.mjs` |
| ST-004 | WHILE the App route is open, THE page itself SHALL not scroll, the rail's controls SHALL be above the fold, and the case control SHALL be a select with groups. | `frontend/gates/browser-gate.mjs` |
| ST-005 | THE tab strips SHALL hold one row and SHALL not be cut. | `frontend/gates/browser-gate.mjs` |
| ST-006 | EVERY chart SHALL declare a non-zero count of what it drew, at a readable size. | `frontend/gates/browser-gate.mjs` |
| ST-007 | ON every documentation route and in the architecture modal, THE figures SHALL have no text on text, no text leaving its box or the drawing, no text on a foreign box and no drawn line crossing text. | `frontend/gates/browser-gate.mjs` |
| ST-008 | ON every documentation route at 1600x900, THE footer SHALL hold one row with every separator between two items. | `frontend/gates/browser-gate.mjs` |
| ST-009 | THE pages SHALL not run citations together, SHALL not show a table wider than its container outside a declared scroller, and SHALL not cut text with an ellipsis unless the element carries its whole text as a title. | `frontend/gates/browser-gate.mjs` |
| ST-010 | THE model comparison SHALL not show two rows with identical scores. | `frontend/gates/browser-gate.mjs` |
| ST-011 | THE 3D bench SHALL make its charge columns visible, not only declare them, and SHALL keep its timing disclaimer. | `frontend/gates/browser-gate.mjs` |
| ST-012 | WHILE the page is idle, THE App SHALL not redraw. | `frontend/gates/browser-gate.mjs` |
| ST-013 | WHERE `GATE_FONTS=dejavu` is set, THE gate SHALL set the page in the deploy runner's fonts and fail if they did not apply. | `frontend/gates/browser-gate.mjs` |
