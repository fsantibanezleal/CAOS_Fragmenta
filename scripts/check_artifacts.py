#!/usr/bin/env python3
# Merged on 2026-10-16 from two sources, so that no check of either is lost.
#   From Fragmenta (this file before the merge): the pipeline's own release gate,
#   pipeline.stages.validate.run, which re-reads every artifact, models file and the benchmark,
#   re-checks every content digest and the corpus digest, re-runs the control assertions, and confirms
#   that no abstention is without a reason. The deploy runs this file on the engine and numpy only, so
#   the gate is imported, never re-implemented.
#   From fsantibanezleal/CAOS_PRODUCT_TEMPLATE at tag v0.08.002, scripts/check_artifacts.py: the stdlib
#   walk of contract 2 (the index lists every case; each manifest and artifact exists, is non-empty and
#   its byte size matches; each lane matches its gate verdict), the optional repository-root argument,
#   and the partial-bake rule: a manifest, an artifact or a models file the readiness document lists in
#   the missing of a partial row is a warning, any other absence is drift. The template's walk reads the
#   index of Fragmenta (artifact_path, models, benchmark) rather than a manifest's artifacts list, which
#   Fragmenta does not use.
"""Verify the committed artifacts without rebaking them.

Two layers over ``<root>/data/derived``: the stdlib walk of contract 2 (the index, each manifest and
artifact,
the byte sizes, lane against gate verdict), then the pipeline's own release gate (digests, controls,
abstentions). A path the readiness document declares absent (a ``partial`` bake) is tolerated by both and
reported as a warning; any other absence stops the check. Exit non-zero on any drift.

Usage: python scripts/check_artifacts.py [repo_root]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else HERE
DERIVED = ROOT / "data" / "derived"
MANIFESTS = DERIVED / "manifests"
sys.path.insert(0, str(HERE / "data-pipeline"))

from pipeline.stages import validate  # noqa: E402


def declared_absent() -> set[str]:
    """The paths the readiness document declares absent: the ``missing`` of every ``partial`` row.

    See the catalog, Missing-data states. Empty when the document is absent or unreadable: nothing is
    tolerated
    then.
    """
    try:
        rows = json.loads((DERIVED / "readiness.json").read_text(encoding="utf-8")).get("contracts", [])
        return {
            m
            for r in rows
            if isinstance(r, dict) and r.get("state") == "partial"
            for m in r.get("missing", [])
            if isinstance(m, str)
        }
    except (OSError, ValueError, AttributeError):
        return set()


def gate_problems_for_absent(index: dict, tolerated: set[str]) -> set[str]:
    """The messages the release gate raises for a path that is declared absent, so they are not drift."""
    out: set[str] = set()
    for entry in index.get("cases", []):
        if entry["artifact_path"] in tolerated:
            out.add(f"{entry['case_id']}: the artifact its index entry points at does not exist")
        if entry["manifest_path"] in tolerated:
            out.add(f"{entry['case_id']}: no manifest")
    for entry in index.get("models", []):
        if entry["path"] in tolerated:
            out.add(f"models/{entry['scope']}: listed in the index but not on disk")
    bench = index.get("benchmark")
    if bench and bench["path"] in tolerated:
        out.add("benchmark: listed in the index but not on disk")
    return out


def main() -> int:
    idx_path = MANIFESTS / "index.json"
    if not idx_path.exists():
        print(f"FAIL: missing {idx_path} (run scripts/precompute.sh first)")
        return 1
    index = json.loads(idx_path.read_text(encoding="utf-8"))
    errs: list[str] = []
    tolerated = declared_absent()
    n_declared_absent = 0

    def absent(rel: str, what: str, path: Path) -> None:
        """A declared-absent path is a warning (a partial bake builds); any other absence is drift."""
        nonlocal n_declared_absent
        if rel in tolerated:
            n_declared_absent += 1
            print(f"WARN: {what} {rel} is absent, as readiness.json declares (partial)")
        else:
            errs.append(f"missing {what}: {path}")

    n_art = 0
    for entry in index.get("cases", []):
        mp = DERIVED / entry["manifest_path"]
        if not mp.exists():
            absent(entry["manifest_path"], "manifest", mp)
        else:
            m = json.loads(mp.read_text(encoding="utf-8"))
            if (m.get("gate") or {}).get("lane") != m.get("lane"):
                errs.append(f"lane/gate mismatch: {entry['case_id']} {entry['artifact_path']}")
            if m.get("artifact", {}).get("path") != entry["artifact_path"]:
                errs.append(f"{entry['case_id']}: the manifest and the index name different artifacts")
        art = DERIVED / entry["artifact_path"]
        if not art.exists():
            absent(entry["artifact_path"], "artifact", art)
            continue
        n_art += 1
        size = art.stat().st_size
        if size == 0:
            errs.append(f"empty artifact: {art}")
        if size != entry.get("bytes"):
            errs.append(f"byte drift {art}: index={entry.get('bytes')} disk={size}")
    for entry in index.get("models", []):
        path = DERIVED / entry["path"]
        if not path.exists():
            absent(entry["path"], "models file", path)
        elif path.stat().st_size != entry.get("bytes"):
            errs.append(f"byte drift {path}: index={entry.get('bytes')} disk={path.stat().st_size}")
    bench = index.get("benchmark")
    if bench:
        path = DERIVED / bench["path"]
        if not path.exists():
            absent(bench["path"], "benchmark", path)
        elif path.stat().st_size != bench.get("bytes"):
            errs.append(f"byte drift {path}: index={bench.get('bytes')} disk={path.stat().st_size}")
    if errs:
        print("CONTRACT 2 DRIFT:")
        for e in errs:
            print("  -", e)
        return 1
    print(
        f"CONTRACT 2 OK: {len(index.get('cases', []))} cases, {n_art} artifacts, "
        "manifests <-> artifacts consistent"
        + (f" ({n_declared_absent} declared absent)." if n_declared_absent else ".")
    )

    report = validate.run(DERIVED)
    ignored = gate_problems_for_absent(index, tolerated)
    problems = [p for p in report.problems if p not in ignored]
    ok = not problems
    print(f"artifacts: {'OK' if ok else 'FAILED'} over {report.n_cases} cases")
    for key, value in report.summary.items():
        print(f"  {key}: {value}")
    for problem in problems:
        print(f"  PROBLEM {problem}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
