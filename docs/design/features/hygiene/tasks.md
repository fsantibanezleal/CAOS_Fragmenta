# Tasks: the hygiene items of issue #14

1. A fixed unit per size column, and the gate's unit check (HY-001).
2. The rail's last control at the rail's gap, and the gate's gap check (HY-002).
3. The "está" sweep and its guard test (HY-003).
4. The "él" sweep and its guard test (HY-004).

## Convergence, 2026-10-05

Each gate check was first run against the defective build, the live 0.05.001, with the same measurement code:

| Requirement | On 0.05.001 (live) | On 0.06.000 |
|---|---|---|
| HY-001 | fails: the model comparison's RMSE column reads "22 mm, 52 mm, 61 mm, 11.0 cm, ..." | passes on every route, sub-tab and workbench tab; `formatSize` pinned by its unit test |
| HY-002 | fails: 206 px of empty rail above the full-screen link on the default case, up to 243 px across the cases, against 10 px between the other controls | passes: 10 px above the last control on every case |
| HY-003 | three case reasons without the accent | the guard and its test pass on the whole Spanish surface |
| HY-004 | "sobre el." on the Distribution tab | the guard and its test pass on the whole Spanish surface |
