#!/usr/bin/env bash
# Everything that decides whether this may ship, in the order it fails fastest.
set -euo pipefail
cd "$(dirname "$0")/.."
ruff check data-pipeline tests
pytest -q
python data-pipeline/run.py --validate
(cd frontend && npm test && npm run build)
