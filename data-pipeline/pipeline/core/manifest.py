"""CONTRACT 2 helpers.

The per-case manifest and the index are built in `stages/export.py` and `pipeline.py`, beside the
artifacts they describe, because a manifest that is far from its artifact is a manifest that drifts
from it. What remains here is the schema identifiers the rest of the pipeline agrees on.

The TypeScript mirror in `frontend/src/lib/contract.types.ts` carries the same names, and the web
build fails on drift.
"""
from __future__ import annotations

MANIFEST_SCHEMA = "fragmenta.manifest/v1"
INDEX_SCHEMA = "fragmenta.index/v1"
ARTIFACT_SCHEMA = "fragmenta.case/v1"
BENCHMARK_SCHEMA = "fragmenta.benchmark/v1"

__all__ = ["MANIFEST_SCHEMA", "INDEX_SCHEMA", "ARTIFACT_SCHEMA", "BENCHMARK_SCHEMA"]
