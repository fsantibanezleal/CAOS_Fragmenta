"""Stage 4, feature extraction: the seven published ratios and the derived absolute quantities.

Two normalisations exist in this domain and they are NOT interchangeable. The published network uses
min-max; the 2025 ensembles use a standard score. Silently unifying them would change every learned
number, so each arm carries its own inside `blastfrag` and this stage never imposes one.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

import blastfrag as bf

from .preprocess import PreparedBlast

__all__ = ["FeatureTable", "feature_names", "run"]


@dataclass(frozen=True, slots=True)
class FeatureTable:
    blast_ids: tuple[str, ...]
    #: The seven published ratios, in the order every published equation uses.
    ratios: tuple[tuple[float, ...], ...]
    #: Absolute quantities, present only where the geometry resolved.
    absolutes: dict[str, dict[str, float]]
    targets: tuple[float | None, ...]

    @property
    def n_with_absolutes(self) -> int:
        return len(self.absolutes)


def run(prepared: Sequence[PreparedBlast]) -> FeatureTable:
    absolutes: dict[str, dict[str, float]] = {}
    for item in prepared:
        if item.pattern is None:
            continue
        absolutes[item.blast.blast_id] = {
            "burden_m": item.pattern.burden_m,
            "spacing_m": item.pattern.spacing_m,
            "bench_height_m": item.pattern.bench_height_m,
            "stemming_m": item.pattern.stemming_m,
            "hole_diameter_mm": item.pattern.hole_diameter_mm,
            "charge_length_m": item.pattern.charge_length_m,
            "rock_volume_m3": item.pattern.rock_volume_m3,
            "charge_mass_kg": item.pattern.charge_mass_kg,
            "stiffness_ratio": item.pattern.stiffness_ratio,
        }
    return FeatureTable(
        blast_ids=tuple(p.blast.blast_id for p in prepared),
        ratios=tuple(p.blast.features() for p in prepared),
        absolutes=absolutes,
        targets=tuple(p.blast.x50_m for p in prepared),
    )


def feature_names() -> tuple[str, ...]:
    return bf.FEATURES
