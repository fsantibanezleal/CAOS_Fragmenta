#!/usr/bin/env bash
# Isolated environments only: a Python venv here and a local node_modules there. Never global.
set -euo pipefail
cd "$(dirname "$0")/.."
python -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements-precompute.txt -r requirements-dev.txt
(cd frontend && npm ci)
echo "ready: python data-pipeline/run.py --validate, then scripts/dev.sh"
