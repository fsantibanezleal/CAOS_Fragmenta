# Design: the benchmark artifact

Retroactive. `data-pipeline/pipeline/stages/benchmark.py` calls the engine's `run_benchmark` over `default_arms()`
and serialises it: per protocol and arm, the headline score, the spread of the repeated draws, the two supports
with intervals, the per-site errors and the out-of-fold predictions; the verdict; each arm's provenance; the
published reproductions; the network seed sweep; the site metadata; the diagnostics; and the rows behind the
pooled scores, so the browser can draw and re-score them. Non-finite numbers become null. The generated wiki pages
(`docs/results/`) and the fact blocks are rendered from it by `scripts/build_docs_results.py`.
