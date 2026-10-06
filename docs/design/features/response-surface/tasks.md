# Tasks: the design response surface

1. The grid evaluation for both lanes, with the empty cells and their reasons (RS-001, RS-003, RS-006).
2. Marching squares for the two iso-lines (RS-002).
3. The canvas view in a `Stage`, the hover readout, the draggable marker wired to the rail (RS-004).
4. The declared grid and cells for the gate (RS-005).
5. The wiki: a section in `docs/guides/04_what-if.md`, and the CHANGELOG entry.

## Convergence, 2026-10-05

| Requirement | Gate | Result |
|---|---|---|
| RS-001 to RS-003, RS-006 | `frontend/test/surface.test.ts` | passed, in a suite of 35 |
| RS-004, RS-005 | `frontend/gates/browser-gate.mjs` | passed in every mode, 420 of 420 checks with the native fonts and 420 of 420 with DejaVu Sans: the surface declares 1681 drawn cells on 41 by 41 on the Murgul case, and four arrow-key steps of the marker move the Distribution group's percentiles |

As built, the surface maps the selected model when it predicts a size from a design and the classical mean size
otherwise, with every input but burden and spacing held at the design in the rail (which starts as the blast as
fired, or as the selected variant). One full surface of 1681 designs took 13 to 19 ms per model in Node 24 on the
development workstation, so it recomputes on every change.

The product gate's first run of RS-005 failed in every mode: the Design group keeps its open sub-tab, and the walk
before the check had left it on the bench. The check now opens the surface sub-tab itself.

