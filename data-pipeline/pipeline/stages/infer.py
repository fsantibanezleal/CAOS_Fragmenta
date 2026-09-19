"""Stage 6, infer: every arm over every blast and every variant, into one shared schema.

Two rules make this stage the part of the product that can refuse, rather than a table generator.

An arm that cannot answer **abstains with a reason**, and the abstention is carried through to the
artifact and onto the screen. A blast with no resolvable geometry, a design with no charge column,
a prediction that leaves the physical range: each produces a refusal that says which and why.

A variant has **no measured size**, because a perturbed design has not been fired. Predictions on
variants are shown as a response curve and never scored against the original blast's measurement.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass

import blastfrag as bf

from ..cases.fragmenta_cases import Case
from ..model.blasts import apply_variant, is_degenerate
from .preprocess import PreprocessResult

__all__ = ["DISTRIBUTION_ARMS", "InferResult", "arm_catalogue", "run"]


#: Arms that produce a whole size distribution, not only a mean size.
DISTRIBUTION_ARMS = ("kuz-ram", "swebrec", "crush-zone")


def arm_catalogue(
    trained: dict[str, bf.Arm] | None = None,
    rock_factors: dict[str, float] | None = None,
) -> dict[str, bf.Arm]:
    """Every arm the product ships, ready to predict.

    The learned arms arrive pre-trained from the train stage; the rest need no fitting. Keeping them
    in one mapping is what lets the App show them side by side under one selector.

    ``rock_factors`` extends the engine's recovered per-site table with whatever this case supplies.
    A synthetic case supplies one because its rock is a design choice; a real site with no recovered
    factor supplies nothing, and the classical arms then abstain there rather than borrowing.
    """
    factors = dict(bf.SITE_ROCK_FACTOR) | dict(rock_factors or {})
    catalogue: dict[str, bf.Arm] = {
        "kuznetsov": bf.Kuznetsov(factors),
        "kuz-ram": bf.KuzRam(factors),
        "swebrec": bf.Swebrec(factors),
        "crush-zone": bf.CrushZone(factors),
        "group-discriminant": bf.GroupDiscriminant(),
        "published-regression": bf.PublishedRegression(),
    }
    if trained:
        catalogue.update(trained)
    return catalogue


@dataclass(frozen=True, slots=True)
class InferResult:
    case_id: str
    #: predictions[arm][blast_id] for the case's own blasts, measured where a measurement exists.
    predictions: dict[str, dict[str, bf.Prediction]]
    #: variant_curves[arm][variant_id] is the mean predicted size over the case's blasts.
    variant_curves: dict[str, dict[str, float | None]]
    #: distributions[arm] for the case's representative blast, as a passing curve.
    distributions: dict[str, dict]
    representative_blast_id: str | None


def _degenerate_prediction(arm_name: str, blast: bf.Blast, reason: str) -> bf.Prediction:
    return bf.Prediction(
        method=arm_name,
        blast_id=blast.blast_id,
        x50_m=None,
        abstain_reason=f"this design is not a blast: {reason}",
    )


def run(
    case: Case,
    prepared: PreprocessResult,
    trained: dict[str, bf.Arm] | None = None,
) -> InferResult:
    # Rock factors this case supplies for sites the engine has none for. A synthetic case names one
    # because its rock is a design choice; a real site with no recovered factor supplies nothing and
    # the classical arms abstain there rather than borrowing a neighbour's.
    case_factors = {
        item.blast.site: item.rock_factor
        for item in prepared.prepared
        if item.rock_factor is not None and item.blast.site not in bf.SITE_ROCK_FACTOR
    }
    arms = arm_catalogue(trained, case_factors)
    blasts = [p.blast for p in prepared.prepared]

    predictions: dict[str, dict[str, bf.Prediction]] = {}
    for name, arm in arms.items():
        row: dict[str, bf.Prediction] = {}
        for blast in blasts:
            reason = is_degenerate(blast)
            if reason is not None:
                # The design-level guard fires BEFORE any arm runs. A ratio-only model would happily
                # price a hole with no charge in it; nothing in a power law over seven ratios knows
                # that the stemming has swallowed the bench.
                row[blast.blast_id] = _degenerate_prediction(name, blast, reason)
                continue
            prediction = arm.predict_one(blast)
            if blast.meta.get("extrapolated") or case.category == "extrapolation-control":
                prediction = _stamp_extrapolated(prediction)
            row[blast.blast_id] = prediction
        predictions[name] = row

    variant_curves = _variant_response(case, blasts, arms)
    representative = _representative(prepared)
    distributions = _distributions(representative, case_factors)

    return InferResult(
        case_id=case.id,
        predictions=predictions,
        variant_curves=variant_curves,
        distributions=distributions,
        representative_blast_id=representative.blast.blast_id if representative else None,
    )


def _stamp_extrapolated(prediction: bf.Prediction) -> bf.Prediction:
    import dataclasses

    return dataclasses.replace(prediction, extrapolated=True)


def _variant_response(
    case: Case, blasts: Sequence[bf.Blast], arms: dict[str, bf.Arm]
) -> dict[str, dict[str, float | None]]:
    """The mean predicted size per arm per variant, which is the case's response curve.

    Averaged over the case's own blasts rather than computed on one of them, so a campaign's spread
    is carried into the curve instead of being replaced by whichever blast happened to be first.
    """
    curves: dict[str, dict[str, float | None]] = {}
    for name, arm in arms.items():
        row: dict[str, float | None] = {}
        for variant in case.variants:
            values: list[float] = []
            for blast in blasts:
                perturbed = apply_variant(blast, variant)
                if is_degenerate(perturbed) is not None:
                    continue
                prediction = arm.predict_one(perturbed)
                if prediction.x50_m is not None:
                    values.append(prediction.x50_m)
            row[variant.id] = sum(values) / len(values) if values else None
        curves[name] = row
    return curves


def _representative(prepared: PreprocessResult):
    """The blast the App opens on: the first one that has geometry and is not degenerate.

    Falling back to the first blast when none qualifies, so a case whose whole point is refusal
    still has something to show, and what it shows is the refusal.
    """
    for candidate in prepared.prepared:
        if candidate.has_geometry and candidate.usable:
            return candidate
    return prepared.prepared[0] if prepared.prepared else None


def _distributions(prepared, case_factors: dict[str, float] | None = None) -> dict[str, dict]:
    """Full passing curves for the representative blast, for every distribution arm."""
    if prepared is None or not prepared.usable:
        return {}
    factors = dict(bf.SITE_ROCK_FACTOR) | dict(case_factors or {})
    out: dict[str, dict] = {}
    builders: dict[str, Callable[[bf.Blast], object]] = {
        "kuz-ram": bf.KuzRam(factors).distribution,
        "swebrec": bf.Swebrec(factors).distribution,
        "crush-zone": bf.CrushZone(factors).distribution,
    }
    for name, build in builders.items():
        distribution = build(prepared.blast)
        if distribution is None:
            continue
        out[name] = {
            "sizes_m": [round(s, 6) for s in distribution.sizes_m],
            "passing": [round(p, 6) for p in distribution.passing],
            "x50_m": distribution.x50_m,
            "p20_m": distribution.percentile_m(0.2),
            "p80_m": distribution.percentile_m(0.8),
            "constants_published": bool(distribution.detail.get("constants_are_published", True)),
        }
    return out
