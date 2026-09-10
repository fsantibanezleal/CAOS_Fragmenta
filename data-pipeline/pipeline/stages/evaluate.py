"""Stage 7, evaluate: score every arm on every case, with the statistic named and a null beside it.

Two things this stage refuses to do, and both are the reason it exists.

It does not report a bare variance figure. Two different quantities are called that in this
literature and they differ by a factor of two and a half on the same twelve blasts.

It does not average an abstention away. A missing cell fails the completeness check; a refusal is
counted and reported as a refusal.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

import blastfrag as bf

from ..cases.fragmenta_cases import Case
from .infer import InferResult
from .preprocess import PreprocessResult

__all__ = ["CaseEvaluation", "completeness", "run"]


@dataclass(frozen=True, slots=True)
class CaseEvaluation:
    case_id: str
    #: arm -> the metric block, or a note saying why the case is not scoreable.
    scores: dict[str, dict]
    null_mean_m: float
    n_scoreable: int
    controls: dict


def run(case: Case, prepared: PreprocessResult, inferred: InferResult) -> CaseEvaluation:
    blasts = [p.blast for p in prepared.prepared]
    measured = [b for b in blasts if b.x50_m is not None]
    null_mean = bf.training_mean(bf.load_training_corpus())

    scores: dict[str, dict] = {}
    for arm_name, per_blast in inferred.predictions.items():
        predictions = [per_blast[b.blast_id] for b in blasts]
        if len(measured) < 2:
            # A case with no measurements is not a failure of the arm; it is a design study. Say so
            # rather than emitting a null-shaped metric block that reads as a score of zero.
            scores[arm_name] = {
                "scoreable": False,
                "reason": (
                    "this case carries no measured fragment sizes, so it shows a response rather "
                    "than a score"
                ),
                "n_abstained": sum(1 for p in predictions if p.abstained),
                "abstain_reasons": sorted(
                    {p.abstain_reason for p in predictions if p.abstain_reason}
                )[:3],
            }
            continue

        result = bf.score(measured, [per_blast[b.blast_id] for b in measured], method=arm_name)
        scores[arm_name] = _metric_block(result, measured, [per_blast[b.blast_id] for b in measured])

    null_predictions = [
        bf.Prediction(method="null", blast_id=b.blast_id, x50_m=null_mean) for b in measured
    ]
    if len(measured) >= 2:
        scores["null"] = _metric_block(
            bf.score(measured, null_predictions, method="null"), measured, null_predictions
        )

    return CaseEvaluation(
        case_id=case.id,
        scores=scores,
        null_mean_m=null_mean,
        n_scoreable=len(measured),
        controls=_controls(case, prepared, inferred, measured),
    )


def _metric_block(result: bf.Score, measured, predictions) -> dict:
    block: dict = {
        "scoreable": True,
        "n_scored": result.n_scored,
        "n_abstained": result.n_abstained,
        "n_extrapolated": result.n_extrapolated,
        # Both statistics, always, each under its own name. Never a bare one.
        "pearson_r2": result.pearson_r2,
        "r2_identity": result.r2_identity,
        "rmse_m": result.rmse_m,
        "mae_m": result.mae_m,
        "mape_pct": result.mape_pct,
        "bias_m": result.bias_m,
        "worst_rows": bf.worst_rows(measured, predictions, n=3),
    }
    if result.n_scored >= 4:
        try:
            point, low, high = bf.bootstrap_interval(
                measured, predictions, "r2_identity", n_boot=800, unit="blast"
            )
            block["r2_identity_interval"] = [low, high]
            block["r2_identity_point"] = point
        except ValueError:
            block["r2_identity_interval"] = None
    return block


def _controls(case: Case, prepared: PreprocessResult, inferred: InferResult, measured) -> dict:
    """The two control checks, run on every case rather than only where they are expected to fire."""
    predictions = inferred.predictions
    controls: dict = {}

    # The geometry negative control: every arm that needs a rock volume must abstain where none is
    # resolvable, and none may answer.
    without_geometry = [p.blast.blast_id for p in prepared.prepared if not p.has_geometry]
    if without_geometry:
        answered = [
            blast_id
            for blast_id in without_geometry
            if not predictions.get("kuznetsov", {}).get(blast_id, bf.Prediction("x", blast_id, None, "n/a")).abstained
        ]
        controls["geometry_negative_control"] = {
            "n_without_geometry": len(without_geometry),
            "n_answered_anyway": len(answered),
            "passed": not answered,
        }

    # The degenerate negative control: a design that is not a blast must be refused by EVERY arm.
    degenerate = [p.blast.blast_id for p in prepared.prepared if not p.usable]
    if degenerate:
        answered = [
            (arm, blast_id)
            for arm, row in predictions.items()
            for blast_id in degenerate
            if blast_id in row and not row[blast_id].abstained
        ]
        controls["degenerate_negative_control"] = {
            "n_degenerate": len(degenerate),
            "n_answered_anyway": len(answered),
            "answered_by": sorted({arm for arm, _ in answered}),
            "passed": not answered,
        }

    # The extrapolation control: every prediction on an out-of-envelope case must be STAMPED, or
    # the badge that tells a reader "this is outside the data" never reaches the screen.
    if case.category == "extrapolation-control":
        answered = [
            cell
            for row in predictions.values()
            for cell in row.values()
            if not cell.abstained
        ]
        unstamped = [cell.blast_id for cell in answered if not cell.extrapolated]
        controls["extrapolation_control"] = {
            "n_predictions": len(answered),
            "n_unstamped": len(unstamped),
            "unstamped": sorted(set(unstamped))[:5],
            "passed": not unstamped,
        }

    # The positive control: the arm that generated the truth must recover it.
    if case.category == "positive-control" and measured:
        recovered = predictions.get("published-regression", {})
        errors = [
            abs(recovered[b.blast_id].x50_m - b.x50_m)
            for b in measured
            if b.blast_id in recovered and recovered[b.blast_id].x50_m is not None
        ]
        controls["positive_control"] = {
            "n_checked": len(errors),
            "max_abs_error_m": max(errors) if errors else None,
            "passed": bool(errors) and max(errors) < 1e-9,
        }
    return controls


def completeness(evaluations: Sequence[CaseEvaluation], expected_arms: Sequence[str]) -> dict:
    """Assert the method-by-case matrix has no silent holes.

    A cell is complete when it carries either a score or a recorded abstention. A cell that is simply
    absent is a hole, and holes fail the gate rather than being averaged over.
    """
    holes: list[str] = []
    for evaluation in evaluations:
        for arm in expected_arms:
            if arm not in evaluation.scores:
                holes.append(f"{evaluation.case_id}/{arm}")
    return {
        "n_cases": len(evaluations),
        "n_arms": len(expected_arms),
        "expected_cells": len(evaluations) * len(expected_arms),
        "holes": holes,
        "complete": not holes,
    }
