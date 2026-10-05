"""Stage 9, validate: the release gate.

Re-reads what was written, re-checks every hash, re-runs the control assertions, and confirms that
no predicted cell abstained without saying why. A bake that does not pass this is not a release
candidate.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

import blastfrag as bf

from .export import digest

__all__ = ["ValidationReport", "run"]


@dataclass(frozen=True, slots=True)
class ValidationReport:
    ok: bool
    n_cases: int
    problems: list[str] = field(default_factory=list)
    summary: dict = field(default_factory=dict)


def run(root: Path) -> ValidationReport:
    manifests = root / "manifests"
    index_path = manifests / "index.json"
    problems: list[str] = []

    if not index_path.exists():
        return ValidationReport(ok=False, n_cases=0, problems=["no index.json was written"])

    index = json.loads(index_path.read_text(encoding="utf-8"))
    if index.get("corpus_digest") != bf.datasets.DATASET_DIGEST:
        problems.append(
            "the index was baked from a different corpus than the one installed: "
            f"{index.get('corpus_digest')} against {bf.datasets.DATASET_DIGEST}"
        )

    controls = {"passed": 0, "failed": 0}
    lanes: dict[str, int] = {}
    total_bytes = 0
    n_abstentions = 0

    for entry in index.get("cases", []):
        case_id = entry["case_id"]
        artifact_path = root / entry["artifact_path"]
        if not artifact_path.exists():
            problems.append(f"{case_id}: the artifact its index entry points at does not exist")
            continue

        raw = artifact_path.read_text(encoding="utf-8")
        # A browser cannot read NaN or Infinity, and Python writes both without complaint. One of
        # them anywhere makes the artifact unparseable and the symptom is a blank page.
        for token in ("NaN", "Infinity", "-Infinity"):
            if token in raw:
                problems.append(
                    f"{case_id}: the artifact contains {token}, which is not valid JSON and which "
                    "no browser can parse"
                )
        payload = json.loads(raw)
        stored = payload.pop("digest", None)
        if stored != digest(payload):
            problems.append(f"{case_id}: content digest does not match, the artifact was edited")
        if stored != entry.get("digest"):
            problems.append(f"{case_id}: the index digest disagrees with the artifact's own")

        total_bytes += entry.get("bytes", 0)
        lanes[entry.get("lane", "?")] = lanes.get(entry.get("lane", "?"), 0) + 1

        manifest_path = root / entry["manifest_path"]
        if not manifest_path.exists():
            problems.append(f"{case_id}: no manifest")
            continue
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

        for name, block in (manifest.get("controls") or {}).items():
            if isinstance(block, dict) and "passed" in block:
                controls["passed" if block["passed"] else "failed"] += 1
                if not block["passed"]:
                    problems.append(f"{case_id}: the {name} control FAILED")

        # A learned arm shown on a real campaign must have been trained without that campaign.
        if manifest.get("held_out_site") and manifest["held_out_site"] != entry.get("site"):
            problems.append(
                f"{case_id}: the held-out site {manifest['held_out_site']!r} is not the case's own "
                f"site {entry.get('site')!r}"
            )

        # Every predicted cell carries either a number or a reason. Never neither.
        for arm, row in payload.get("predictions", {}).items():
            for blast_id, cell in row.items():
                if cell["x50_m"] is None:
                    n_abstentions += 1
                    if not cell.get("reason"):
                        problems.append(
                            f"{case_id}/{arm}/{blast_id}: abstained with no reason given"
                        )

    # The benchmark: the cross-case evidence every documentation page reads. Until 0.05.000 this gate
    # re-read the cases and the models and never the benchmark, so an edited benchmark.json, the one
    # file the verdict comes from, would have passed it.
    bench_entry = index.get("benchmark")
    if bench_entry:
        bench_path = root / bench_entry["path"]
        if not bench_path.exists():
            problems.append("benchmark: listed in the index but not on disk")
        else:
            raw = bench_path.read_text(encoding="utf-8")
            for token in ("NaN", "Infinity"):
                if token in raw:
                    problems.append(f"benchmark: contains {token}, which no browser can parse")
            payload = json.loads(raw)
            stored = payload.pop("digest", None)
            if stored != digest(payload):
                problems.append("benchmark: content digest does not match, the artifact was edited")
            if stored != bench_entry.get("digest"):
                problems.append("benchmark: the index digest disagrees with the artifact's own")
            if payload.get("corpus_digest") != bf.datasets.DATASET_DIGEST:
                problems.append("benchmark: baked from a different corpus than the one installed")

    # The fitted models the browser runs: present, readable by a browser, unedited, and the ones the
    # cases point at.
    listed = {entry["scope"]: entry for entry in index.get("models", [])}
    model_bytes = 0
    for scope, entry in listed.items():
        path = root / entry["path"]
        if not path.exists():
            problems.append(f"models/{scope}: listed in the index but not on disk")
            continue
        raw = path.read_text(encoding="utf-8")
        for token in ("NaN", "Infinity"):
            if token in raw:
                problems.append(f"models/{scope}: contains {token}, which no browser can parse")
        payload = json.loads(raw)
        stored = payload.pop("digest", None)
        if stored != digest(payload) or stored != entry.get("digest"):
            problems.append(f"models/{scope}: digest does not match its content or its index entry")
        model_bytes += path.stat().st_size
    for entry in index.get("cases", []):
        artifact_path = root / entry["artifact_path"]
        if not artifact_path.exists():
            continue
        live = json.loads(artifact_path.read_text(encoding="utf-8")).get("live_models")
        if not live:
            problems.append(f"{entry['case_id']}: carries no live_models block")
        elif live.get("scope") not in listed:
            problems.append(f"{entry['case_id']}: points at models scope {live.get('scope')!r}, not listed")
        elif live.get("digest") != listed[live["scope"]].get("digest"):
            problems.append(f"{entry['case_id']}: its models digest disagrees with the index")

    return ValidationReport(
        ok=not problems,
        n_cases=len(index.get("cases", [])),
        problems=problems,
        summary={
            "total_artifact_bytes": total_bytes,
            "lanes": lanes,
            "controls": controls,
            "n_abstentions": n_abstentions,
            "engine_version": index.get("engine_version"),
            "model_scopes": len(listed),
            "model_bytes": model_bytes,
            "app_version": index.get("app_version"),
        },
    )
