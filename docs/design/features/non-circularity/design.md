# Design: the synthetic cases are not circular

`data-pipeline/pipeline/model/blasts.py` builds the synthetic designs from `_base_blast` (the corpus centre) and a
lever swept over the corpus envelope (`synth-sweep-burden`, `synth-sweep-powder`, `synth-ibsd-capped`,
`ctrl-degenerate`). None reads a prediction. `oracle_truth` is the one place an arm generates data: the published
regression's output becomes the positive control's measured size, which that arm must recover exactly; it tests
the harness. The tests disable every arm and rebuild the designs, check that no design carries a measurement or a
score, check the benchmark's rows against the corpus, and check the oracle's truth and its stated reason.
