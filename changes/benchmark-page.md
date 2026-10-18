- The Benchmark page is rebuilt on the shell's `DocPage` and `DocSection` (ADR-0017 section 2.1): six sub-tabs, one per topic,
  each in `frontend/src/pages/benchmark/`, and every area of the Benchmark table is present at its floor in both languages:
  `results` (the verdict, every arm and every campaign), `comparison` (the best learned arm against the classical arms on the
  common rows, and the published hold-outs), `robustness` (the sorted draws of a random protocol, and the published network
  across seeds and widths, both charts), `live` (the set and the arm are shell `ChipGroup` controls registered with the panel),
  `provenance` (two tables: where each row comes from and what each arm was fitted on) and `caveat` (the verdict callout,
  the page's only honest or strong callout).
- New on the page: the criterion as a captioned equation, the per-campaign RMSE table, the comparison on the common rows, the
  protocol gap with its equation and table, the MAPE and squared-correlation definitions, and a bar figure of the published
  hold-out and of the campaigns (`frontend/src/viz/figures/benchmark.tsx`). The verdict callout keeps its logic; the other
  callouts are plain notes.
- `frontend/test/benchmark.test.ts` holds the floors that can be counted without layout (areas per topic, tables, charts and
  controls, one honest or strong callout, captioned equations and figures, the lede, Spanish text, numbers read from the
  committed benchmark, references, content standards).
