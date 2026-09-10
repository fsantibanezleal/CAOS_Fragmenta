"""The shared core: turning a case into blasts, and a variant into a perturbed blast.

This is the only module imported by more than one lane. It holds no science of its own; the science
is in `blastfrag`, which this product consumes as a pinned dependency and never re-implements.
"""

from __future__ import annotations

import dataclasses
from collections.abc import Sequence

import blastfrag as bf

from ..cases.fragmenta_cases import Case, Variant

__all__ = [
    "DegenerateDesign",
    "apply_variant",
    "blasts_for_case",
    "oracle_truth",
    "synthetic_sweep",
]


#: The synthetic cases are DESIGNS, so their hole diameter is a choice this product makes rather than
#: a measurement it recovers. It is registered here, in the product, rather than in the engine, and
#: it is stated as chosen: 165 mm is the most common diameter in the corpus, used at two of its ten
#: sites, so a synthetic sweep sits in familiar territory instead of inventing a drill.
#:
#: Without this the classical arms would abstain on every synthetic case, and five of sixteen cases
#: would silently lose the whole classical tier. Abstention is correct where the scale is UNKNOWN;
#: here it is known, because we chose it.
SYNTHETIC_SITE = bf.geometry.SiteGeometry(
    site="Synthetic",
    mine="synthetic design study, not a mine",
    rock="parameterised, at the corpus centre unless the case sweeps it",
    hole_diameter_mm=165.0,
    diameter_source=(
        "CHOSEN by this product, not recovered from a source. 165 mm is the most common diameter in "
        "the published corpus, used at two of its ten sites."
    ),
    narrative=(),
    note="a design study; every number here is synthetic and labelled as such",
)
bf.SITE_GEOMETRY.setdefault("Synthetic", SYNTHETIC_SITE)


class DegenerateDesign(ValueError):
    """Raised for a design that is not a blast, so no arm can be asked to price it."""


def blasts_for_case(case: Case) -> list[bf.Blast]:
    """Every blast a case carries, in a stable order."""
    if case.dataset == "field":
        return bf.load_field_holdout()
    if case.dataset == "synthetic":
        return synthetic_sweep(case)
    if case.site is None:
        raise ValueError(f"{case.id}: a real case must name a site")
    return [b for b in bf.load_training_corpus() if b.site == case.site]


def apply_variant(blast: bf.Blast, variant: Variant) -> bf.Blast:
    """Perturb one blast by one variant.

    A variant moves a single field by a multiplier, so the response to that lever is isolated. The
    measured size is dropped, because a perturbed design has not been fired and carrying the
    original measurement forward would invite scoring a prediction against the wrong blast.
    """
    if variant.field == "none":
        return blast
    current = getattr(blast, variant.field)
    return dataclasses.replace(
        blast,
        **{variant.field: current * variant.factor},
        blast_id=f"{blast.blast_id}~{variant.id}",
        x50_m=None,
        meta=blast.meta | {"variant": variant.id, "variant_of": blast.blast_id},
    )


# The synthetic sweeps live inside the real corpus envelope, so a synthetic case is a design that
# COULD have been fired rather than an arbitrary point. Centres are the corpus means.
_CENTRE = {
    "S_over_B": 1.19,
    "H_over_B": 3.34,
    "B_over_D": 27.35,
    "T_over_B": 1.26,
    "Pf_kg_m3": 0.53,
    "XB_m": 1.10,
    "E_GPa": 29.46,
}


def _base_blast(blast_id: str, site: str, **overrides) -> bf.Blast:
    values = dict(_CENTRE) | overrides
    return bf.Blast(
        blast_id=blast_id,
        site=site,
        meta={"synthetic": True},
        **values,
    )


def synthetic_sweep(case: Case) -> list[bf.Blast]:
    """Build a synthetic case's blasts.

    Every synthetic blast is labelled synthetic in its own metadata and carries no measured size
    unless the case is the positive control, whose truth is generated deliberately.
    """
    site = "Synthetic"
    if case.id == "synth-sweep-burden":
        return [
            _base_blast(f"SB{i:02d}", site, B_over_D=value)
            for i, value in enumerate(_linspace(18.0, 39.0, 12), start=1)
        ]
    if case.id == "synth-sweep-powder":
        return [
            _base_blast(f"SP{i:02d}", site, Pf_kg_m3=value)
            for i, value in enumerate(_linspace(0.22, 1.26, 12), start=1)
        ]
    if case.id == "synth-ibsd-capped":
        return [
            _base_blast(f"SI{i:02d}", site, XB_m=value, Pf_kg_m3=0.95)
            for i, value in enumerate(_linspace(0.10, 2.35, 12), start=1)
        ]
    if case.id == "ctrl-degenerate":
        # Stemming longer than the whole bench: there is no charge column left. The ratio arms will
        # still return arithmetic, which is exactly why the guard has to be at the pattern level.
        return [
            _base_blast(f"DG{i:02d}", site, T_over_B=4.60, H_over_B=1.40, Pf_kg_m3=0.22)
            for i in range(1, 7)
        ]
    if case.id == "ctrl-oracle":
        return oracle_truth()
    raise ValueError(f"{case.id}: no synthetic generator")


def oracle_truth() -> list[bf.Blast]:
    """Blasts whose measured size was generated by the published regression itself.

    The positive control. The arm that produced these numbers must recover them exactly, and if it
    cannot the harness is broken rather than the science. Generated from the published equation
    rather than from a random draw, so the recovery target is exact and not statistical.
    """
    arm = bf.PublishedRegression()
    out: list[bf.Blast] = []
    for i, factor in enumerate(_linspace(0.80, 1.25, 8), start=1):
        blast = _base_blast(
            f"OR{i:02d}", "Synthetic", Pf_kg_m3=_CENTRE["Pf_kg_m3"] * factor
        )
        truth = arm.predict_one(blast).x50_m
        if truth is None:
            continue
        out.append(dataclasses.replace(blast, x50_m=truth, meta=blast.meta | {"oracle": True}))
    return out


def is_degenerate(blast: bf.Blast) -> str | None:
    """Why this design is not a blast, or None if it is one.

    Checked at the design level rather than at the number level, because a ratio-only model will
    happily price a hole with no charge in it: nothing in a power law over seven ratios knows that
    the stemming has swallowed the bench.
    """
    if blast.T_over_B >= blast.H_over_B:
        return (
            f"the stemming is {blast.T_over_B:.2f} burdens in a bench {blast.H_over_B:.2f} burdens "
            "tall, so there is no charge column. This is not a blast."
        )
    charged_fraction = 1.0 - blast.T_over_B / blast.H_over_B
    if charged_fraction < 0.05:
        return (
            f"only {charged_fraction:.1%} of the hole carries explosive after stemming, which is "
            "below any practical charge. This is not a blast."
        )
    return None


def _linspace(low: float, high: float, n: int) -> list[float]:
    if n < 2:
        return [low]
    step = (high - low) / (n - 1)
    return [low + i * step for i in range(n)]


def case_blast_ids(blasts: Sequence[bf.Blast]) -> list[str]:
    return [b.blast_id for b in blasts]
