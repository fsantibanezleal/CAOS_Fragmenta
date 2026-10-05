# Design: the product on blastfrag 0.4.0

- **Pins.** `requirements-precompute.txt` moves to `blastfrag==0.4.0`; `data-pipeline/run.py` sets
  `OPENBLAS_NUM_THREADS`, `OMP_NUM_THREADS` and `MKL_NUM_THREADS` to 1 before numpy is imported. Measured on
  2026-10-05 on a loaded workstation: one fit of the published network at width 15 took more than six minutes
  multi-threaded and 1.9 s on one thread.
- **Cases.** `arm_catalogue` (`data-pipeline/pipeline/stages/infer.py`) gains
  `"kuznetsov-capped": bf.InSituCap(bf.Kuznetsov(factors))`. The browser port (`frontend/src/engine/live.ts`) gains
  the cap, `min(x50, XB)`, held by a parity test. The arm catalogue (`frontend/src/lib/artifacts.ts`) gains its
  entry with `cappedFrom: 'kuznetsov'`; the model comparison folds it into the classical row on a case where its
  scores are identical, and shows its own row where the cap binds (Reocin).
- **Benchmark.** Schema `fragmenta.benchmark/v3`. Each arm keeps the engine's `detail["common"]` as `common`;
  the payload gains `network_width_sweep`. The contract mirror (`frontend/src/lib/contract.types.ts`) declares both.
- **Pages.** Benchmark: a common-support column in the every-arm table and a width-sweep chart in the network-seeds
  tab (as built: the tab is renamed "The published network", and the chart carries the null as a reference line,
  because "no width does better than the null" should be read off the drawing). Methodology: the cap in the
  classical tab, the sweep in the network tab. Distribution tab: the in-situ block
  drawn on the curve. The wiki: `docs/results/` gains the sweep and the common-support column through the
  generator; `docs/methods/02_classical-mean-size.md` and `06_neural-network.md` gain their sections.
- **Release.** 0.06.000: the artifacts re-baked under the new engine; `scripts/compare_bakes.py` and a
  field-by-field diff against 0.05.001 show which numbers moved and why (the new arm and the new blocks only).
