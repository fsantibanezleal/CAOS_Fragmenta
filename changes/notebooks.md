- Added the product notebooks, `notebooks/en/` and `notebooks/es/` with the same 19 notebooks each, in six topics from the data to the
  live design response (the data, the classical prediction, the size distribution, the benchmark protocol, the learned arms, the design
  response). Every notebook is executed in a fresh kernel on the committed artifacts and on the engine `blastfrag` 0.4.0, imports the
  methods and never re-implements them, and carries its sources, with a level (fundamentals, the method in practice, state of the art,
  beyond the state of the art) and the five beyond-the-state-of-the-art claims (BS-1 to BS-5) covered by a level 4 notebook in each language.
- Added `notebooks/requirements.txt` (the bake's exact pins plus the plotting library and the notebook runtime), `notebooks/README.md` and an index
  per language that lists every notebook and the reason a topic has no state-of-the-art notebook.
- Rewrote the README by areas: an `## Areas` section with one row per area (web, API, core pipelines, packages, notebooks, data, contracts,
  documentation, tests and gates, deploy), each with its folder, whether it is active or dormant, and what it holds.
