#!/usr/bin/env bash
# Bake every case plus the cross-case benchmark.
#
# This is the heavy lane and it is a deliberate, versioned operation. It is never run at deploy time.
set -euo pipefail
cd "$(dirname "$0")/.."
python data-pipeline/run.py "$@"
