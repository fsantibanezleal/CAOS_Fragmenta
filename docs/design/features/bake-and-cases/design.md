# Design: the bake, the cases and the release gate

Retroactive. `data-pipeline/run.py` runs, per case, the stages in `data-pipeline/pipeline/stages/`: ingest,
preprocess, dataset, features, train, infer, evaluate, export and validate; then the benchmark. The case registry
is `data-pipeline/pipeline/cases/fragmenta_cases.py`. A real campaign trains the learned arms without its own site
(the scope is the withheld site; a case not in the corpus uses the whole corpus). Export writes the content-
addressed artifacts and the models files; validate (`scripts/check_artifacts.py` outside the bake) re-reads and
re-hashes them. The page is `docs/architecture/01_the-bake.md`.
