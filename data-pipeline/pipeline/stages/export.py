"""Stage 8, export: the compact, content-addressed artifact the web replays.

The web reads only what this stage writes. Nothing on a screen is computed at deploy time and
nothing is recomputed in a browser except the live closed-form arms, whose parity against these
numbers is a gate.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import blastfrag as bf

from ..cases.fragmenta_cases import Case
from .evaluate import CaseEvaluation
from .infer import InferResult
from .preprocess import PreprocessResult

__all__ = ["ARTIFACT_SCHEMA", "build_case_artifact", "digest", "write_artifact"]

ARTIFACT_SCHEMA = "fragmenta.case/v1"


def digest(payload: Any) -> str:
    """Content address for an artifact: a hash of its canonical serialisation.

    Sorted keys and fixed separators, so the same numbers always produce the same address regardless
    of dictionary ordering.
    """
    text = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _prediction_row(prediction: bf.Prediction) -> dict:
    return {
        "x50_m": None if prediction.x50_m is None else round(prediction.x50_m, 6),
        "abstained": prediction.abstained,
        "reason": prediction.abstain_reason,
        "extrapolated": prediction.extrapolated,
        "group": prediction.group,
        # The network's simulation spread is the honest uncertainty on a learned prediction, and it
        # reaches the screen only if it is exported here.
        "cv": prediction.detail.get("coefficient_of_variation"),
        "n_simulations": prediction.detail.get("n_simulations"),
    }


def build_case_artifact(
    case: Case,
    prepared: PreprocessResult,
    inferred: InferResult,
    evaluation: CaseEvaluation,
    *,
    held_out_site: str | None,
    n_training_rows: int,
    engine_version: str,
    app_version: str,
) -> dict:
    blasts = []
    for item in prepared.prepared:
        blast = item.blast
        row: dict = {
            "blast_id": blast.blast_id,
            "site": blast.site,
            "group": blast.group,
            "features": {name: getattr(blast, name) for name in bf.FEATURES},
            "x50_measured_m": blast.x50_m,
            "has_geometry": item.has_geometry,
            "usable": item.usable,
            "rock_factor": item.rock_factor,
        }
        if item.pattern is not None:
            row["pattern"] = {
                "burden_m": round(item.pattern.burden_m, 4),
                "spacing_m": round(item.pattern.spacing_m, 4),
                "bench_height_m": round(item.pattern.bench_height_m, 4),
                "stemming_m": round(item.pattern.stemming_m, 4),
                "hole_diameter_mm": item.pattern.hole_diameter_mm,
                "charge_length_m": round(item.pattern.charge_length_m, 4),
                "rock_volume_m3": round(item.pattern.rock_volume_m3, 3),
                "charge_mass_kg": round(item.pattern.charge_mass_kg, 3),
            }
        if item.geometry_reason:
            row["geometry_reason"] = item.geometry_reason
        if item.degenerate_reason:
            row["degenerate_reason"] = item.degenerate_reason
        blasts.append(row)

    payload = {
        "schema": ARTIFACT_SCHEMA,
        "case": {
            "id": case.id,
            "category": case.category,
            "real_or_synthetic": case.real_or_synthetic,
            "site": case.site,
            "title": {"en": case.title_en, "es": case.title_es},
            "reason": {"en": case.reason_en, "es": case.reason_es},
            "expected_band": case.expected_band,
            "licence": case.licence,
            "doi": case.doi,
        },
        "provenance": {
            "engine": {"package": "blastfrag", "version": engine_version},
            "app_version": app_version,
            "corpus_digest": bf.datasets.DATASET_DIGEST,
            # The single most important field for reading a learned number on this page.
            "held_out_site": held_out_site,
            "n_training_rows": n_training_rows,
            "leakage_note": (
                f"every learned arm on this case was trained WITHOUT any blast from {held_out_site}"
                if held_out_site
                else "this case is not in the training corpus, so nothing was withheld"
            ),
        },
        "blasts": blasts,
        "variants": [
            {"id": v.id, "label": {"en": v.label_en, "es": v.label_es}, "field": v.field, "factor": v.factor}
            for v in case.variants
        ],
        "predictions": {
            arm: {blast_id: _prediction_row(p) for blast_id, p in row.items()}
            for arm, row in inferred.predictions.items()
        },
        "variant_curves": inferred.variant_curves,
        "distributions": inferred.distributions,
        "representative_blast_id": inferred.representative_blast_id,
        "scores": evaluation.scores,
        "null_mean_m": evaluation.null_mean_m,
        "controls": evaluation.controls,
        "geometry_report": _serialisable(prepared.geometry_report),
    }
    payload["digest"] = digest(payload)
    return payload


def _serialisable(value: Any) -> Any:
    """Tuples become lists so the artifact round-trips through JSON unchanged."""
    if isinstance(value, dict):
        return {k: _serialisable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_serialisable(v) for v in value]
    return value


def write_artifact(root: Path, case_id: str, payload: dict) -> tuple[Path, int]:
    directory = root / case_id
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / "case.json"
    text = json.dumps(payload, indent=1, sort_keys=True, default=str)
    path.write_text(text, encoding="utf-8")
    return path, len(text.encode("utf-8"))
