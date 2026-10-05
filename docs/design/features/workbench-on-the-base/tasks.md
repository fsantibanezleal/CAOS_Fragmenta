# Tasks: the App on the shared base

1. Pin shell 0.7.2 exactly and record `.template-version` (WB-001).
2. Migrate the shell API: licence and visibility, `contain`, architecture SVGs inline, `BiText` citations, controlled
   tabs (WB-002).
3. Remove the three overrides the pinned shell carries (defects 1, 4, 14) and add their guard (WB-006).
4. The template's guards: version coherence, the web baseline (the number formatter in every view, the bench's loop
   on `usePausedViz`), the deploy place with the VPS residue removed (WB-008 to WB-010).
5. Recompose the App as `CaseWorkbench` with the groups above, every view a `PlotCard` with lane and provenance and a
   filling `Stage` (WB-002, WB-003, WB-005).
6. The rail as registered controls and readouts; the selection key (WB-004).
7. `frontend/scripts/gate.mjs` on `caos-shell-gate`; the product gate follows the groups and stays green in both font
   sets (WB-003, WB-004, WB-007).
