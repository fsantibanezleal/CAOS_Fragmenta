"""The orchestrator: ingest, preprocess, split, train, infer, evaluate, export, validate.

Idempotent, deterministic and offline. A bake is a pure function of the case registry, the pinned
engine version and the seed, so re-running it on an unchanged tree produces byte-identical artifacts
and leaves git clean.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

import blastfrag as bf

from . import __version__
from .cases.fragmenta_cases import Case
from .core.gate import classify_lane
from .core.jsonio import write_json
from .registry import list_cases
from .stages import benchmark, evaluate, export, infer, ingest, preprocess, train, validate

__all__ = ["STAGES", "BakeResult", "bake_all", "bake_case"]

STAGES = (
    "ingest",
    "preprocess",
    "dataset",
    "feature_extraction",
    "train",
    "infer",
    "evaluate",
    "export",
    "validate",
)

DATA_ROOT = Path(__file__).resolve().parents[2] / "data" / "derived"
MANIFEST_ROOT = DATA_ROOT / "manifests"


@dataclass(frozen=True, slots=True)
class BakeResult:
    case_id: str
    artifact_path: Path
    manifest_path: Path
    bytes_written: int
    lane: str
    digest: str
    controls_passed: bool


def bake_case(case: Case, *, seed: int = 0, root: Path | None = None) -> BakeResult:
    """Run every stage for one case and write its artifact and manifest."""
    root = root or DATA_ROOT

    ingested = ingest.run(case)
    prepared = preprocess.run(case, ingested)

    trained = train.run(case, seed=seed)
    train.leakage_assertions(case, trained, [p.blast for p in prepared.prepared])

    inferred = infer.run(case, prepared, trained.arms)
    evaluation = evaluate.run(case, prepared, inferred)

    payload = export.build_case_artifact(
        case,
        prepared,
        inferred,
        evaluation,
        held_out_site=trained.held_out_site,
        n_training_rows=trained.n_training_rows,
        engine_version=bf.__version__,
        app_version=__version__,
    )
    artifact_path, size = export.write_artifact(root, case.id, payload)

    # The lane is a MEASUREMENT. Every arm in this product is closed form or a small exported model,
    # so the browser can run them; the gate records the numbers that make that true rather than
    # asserting it.
    gate = classify_lane(
        pure_python=True,
        wheels={"numpy"},
        run_ms=_measure_live_cost(prepared),
        trace_bytes=size,
    )

    manifest = {
        "schema": "fragmenta.manifest/v1",
        "case_id": case.id,
        "category": case.category,
        "real_or_synthetic": case.real_or_synthetic,
        "expected_band": case.expected_band,
        "engine": {"package": "blastfrag", "version": bf.__version__},
        "app_version": __version__,
        "seed": seed,
        "artifact": {"path": f"{case.id}/case.json", "format": "json", "bytes": size},
        "digest": payload["digest"],
        "lane": gate["lane"],
        "gate": gate,
        "flags": list(ingested.flags),
        "provenance": ingested.provenance,
        "held_out_site": trained.held_out_site,
        "n_training_rows": trained.n_training_rows,
        "arms_that_failed_to_fit": trained.failed,
        "controls": evaluation.controls,
        "n_scoreable": evaluation.n_scoreable,
    }
    # The manifest lives beside the artifact it describes, under the same root: a sandbox bake
    # (scripts/compare_bakes.py) must never write into the canonical data/derived/manifests.
    manifest_path = root / "manifests" / f"{case.id}.json"
    write_json(manifest_path, manifest)

    controls_passed = all(
        block.get("passed", True)
        for block in evaluation.controls.values()
        if isinstance(block, dict)
    )
    return BakeResult(
        case_id=case.id,
        artifact_path=artifact_path,
        manifest_path=manifest_path,
        bytes_written=size,
        lane=gate["lane"],
        digest=payload["digest"],
        controls_passed=controls_passed,
    )


def _measure_live_cost(prepared: preprocess.PreprocessResult) -> float:
    """Time the closed-form arms on this case's blasts, which is what the browser will run."""
    import time

    arms = [bf.Kuznetsov(), bf.PublishedRegression(), bf.KuzRam()]
    blasts = [p.blast for p in prepared.prepared]
    started = time.perf_counter()
    for arm in arms:
        arm.predict(blasts)
    return (time.perf_counter() - started) * 1000.0


def bake_all(
    *, seed: int = 0, cases: Sequence[Case] | None = None, with_benchmark: bool = True,
    n_seeds: int = 12,
) -> list[BakeResult]:
    """Bake every case, the cross-case benchmark, then the index the web reads first.

    The benchmark is a separate artifact on purpose. A case answers what each model says about ONE
    blast; the benchmark answers which model is worth trusting across every blast there is. Putting
    both on one screen is how a workbench becomes a summary table.
    """
    selected = list(cases) if cases is not None else list_cases()
    results = [bake_case(case, seed=seed) for case in selected]

    index = {
        "schema": "fragmenta.index/v1",
        "app_version": __version__,
        "engine_version": bf.__version__,
        "corpus_digest": bf.datasets.DATASET_DIGEST,
        "n_cases": len(results),
        "cases": sorted(
            (
                {
                    "case_id": r.case_id,
                    "category": case.category,
                    "real_or_synthetic": case.real_or_synthetic,
                    "site": case.site,
                    "title": {"en": case.title_en, "es": case.title_es},
                    "manifest_path": f"manifests/{r.case_id}.json",
                    "artifact_path": f"{r.case_id}/case.json",
                    "lane": r.lane,
                    "bytes": r.bytes_written,
                    "digest": r.digest,
                    "controls_passed": r.controls_passed,
                }
                for r, case in zip(results, selected)
            ),
            key=lambda entry: entry["case_id"],
        ),
    }
    if with_benchmark:
        payload = benchmark.build(seed=seed, n_seeds=n_seeds)
        _, benchmark_bytes = benchmark.write(DATA_ROOT, payload)
        index["benchmark"] = {
            "path": "benchmark.json",
            "bytes": benchmark_bytes,
            "digest": payload["digest"],
            "verdict": payload["verdict"]["outcome"],
        }

    write_json(MANIFEST_ROOT / "index.json", index)

    report = validate.run(DATA_ROOT)
    if not report.ok:
        joined = "\n  ".join(report.problems)
        raise AssertionError(f"the bake did not pass its own release gate:\n  {joined}")
    return results
