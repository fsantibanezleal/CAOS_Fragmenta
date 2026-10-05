# Design: the wiki and the guards

Retroactive. `scripts/build_docs_results.py` renders `docs/results/` and fills every `<!-- facts:key -->` block from
`data/derived/benchmark.json`; its `--check` mode is run by a test. `scripts/build_architecture_svgs.py` draws the
modal's five architecture drawings and the wiki's copies from the artifacts. The four Python examples under
`docs/frameworks/` run in the suite against the installed engine. The guards (`scripts/check_*.py`) run in CI;
`scripts/check_sdd.py`, the template's, holds this design document to its gates.
