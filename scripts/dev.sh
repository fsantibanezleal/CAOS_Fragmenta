#!/usr/bin/env bash
# Run the site locally against the committed artifacts.
#
# copy-data.mjs overlays data/derived into frontend/public before vite starts, so the dev server
# reads exactly what the deployed site reads.
set -euo pipefail
cd "$(dirname "$0")/../frontend"
npm run dev
