"""CONTRACT 2 helpers.

The per-case manifest and the index are built in `stages/export.py` and `pipeline.py`, beside the
artifacts they describe, because a manifest that is far from its artifact is a manifest that drifts
from it. What remains here is the schema identifiers the rest of the pipeline agrees on.

The TypeScript mirror in `frontend/src/lib/contract.types.ts` carries the same names.

An earlier version of this sentence claimed the web build fails on drift. It does not, and it cannot:
TypeScript is structural, so a JSON file carrying a field no interface declares type-checks
perfectly and the field is simply invisible to the app. One field had been invisible that way,
`best_learned_is_positive`, which is half of the benchmark's kill criterion. The check that makes
the claim true is a test, `frontend/test/parity.test.ts`, which walks every shipped artifact and
fails on any field name the mirror never mentions.
"""
from __future__ import annotations

MANIFEST_SCHEMA = "fragmenta.manifest/v1"
INDEX_SCHEMA = "fragmenta.index/v1"
ARTIFACT_SCHEMA = "fragmenta.case/v1"
BENCHMARK_SCHEMA = "fragmenta.benchmark/v1"

__all__ = ["MANIFEST_SCHEMA", "INDEX_SCHEMA", "ARTIFACT_SCHEMA", "BENCHMARK_SCHEMA"]
