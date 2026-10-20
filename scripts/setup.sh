#!/usr/bin/env bash
# Isolated environments only: a Python venv here and a local node_modules there. Never global. With --notebooks it builds
# the notebook environment instead, .venv-notebooks from notebooks/requirements.txt (scripts/run_notebooks.py runs in it).
set -euo pipefail
cd "$(dirname "$0")/.."
PY="${PYTHON:-python}"

NOTEBOOKS=0
for arg in "$@"; do
  case "$arg" in
    --notebooks) NOTEBOOKS=1 ;;
    *) echo "setup: unknown option $arg (only --notebooks)"; exit 2 ;;
  esac
done

venvpy() { local p="$1/bin/python"; [ -x "$p" ] || p="$1/Scripts/python.exe"; echo "$p"; }

if [ "$NOTEBOOKS" -eq 1 ]; then
  echo "[setup] .venv-notebooks (the notebook environment)"
  [ -d .venv-notebooks ] || "$PY" -m venv .venv-notebooks
  VN="$(venvpy .venv-notebooks)"
  "$VN" -m pip install --upgrade pip -q
  "$VN" -m pip install -q -r notebooks/requirements.txt
  echo "[setup] .venv-notebooks ready. Next: python scripts/run_notebooks.py --check"
  exit 0
fi

"$PY" -m venv .venv
VP="$(venvpy .venv)"
"$VP" -m pip install --upgrade pip
"$VP" -m pip install -r requirements-precompute.txt -r requirements-dev.txt
(cd frontend && npm ci)
echo "ready: python data-pipeline/run.py --validate, then scripts/dev.sh"
