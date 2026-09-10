"""Stage 2, preprocess: recover absolute geometry and resolve the rock factor.

The corpus is dimensionless, so this stage is what makes the classical arms runnable at all. It is
also where the product decides, per blast, whether a model that needs a rock volume may answer.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

import blastfrag as bf

from ..cases.fragmenta_cases import Case
from ..model.blasts import is_degenerate
from .ingest import IngestResult

__all__ = ["PreparedBlast", "PreprocessResult", "run"]


@dataclass(frozen=True, slots=True)
class PreparedBlast:
    """One blast with everything the downstream arms need, or an explicit note that it lacks it."""

    blast: bf.Blast
    pattern: bf.Pattern | None
    rock_factor: float | None
    geometry_reason: str | None
    degenerate_reason: str | None

    @property
    def has_geometry(self) -> bool:
        return self.pattern is not None

    @property
    def usable(self) -> bool:
        return self.degenerate_reason is None


@dataclass(frozen=True, slots=True)
class PreprocessResult:
    case_id: str
    prepared: tuple[PreparedBlast, ...]
    geometry_report: dict


def run(case: Case, ingested: IngestResult) -> PreprocessResult:
    prepared: list[PreparedBlast] = []

    for blast in ingested.blasts:
        degenerate = is_degenerate(blast)
        pattern: bf.Pattern | None = None
        reason: str | None = None
        try:
            pattern = bf.reconstruct_pattern(blast)
        except bf.GeometryUnavailable as exc:
            reason = str(exc)

        # A synthetic blast has no real site, so it gets the corpus-median rock factor and says so.
        factor = bf.SITE_ROCK_FACTOR.get(blast.site)
        if factor is None and blast.site == "Synthetic":
            values = sorted(bf.SITE_ROCK_FACTOR.values())
            factor = values[len(values) // 2]

        prepared.append(
            PreparedBlast(
                blast=blast,
                pattern=pattern,
                rock_factor=factor,
                geometry_reason=reason,
                degenerate_reason=degenerate,
            )
        )

    # The geometry assertions run on every real campaign case, so a change to a diameter or to the
    # arithmetic fails the bake rather than silently producing different numbers.
    report: dict = {}
    if case.real_or_synthetic == "real" and case.dataset == "train" and case.site:
        report = bf.verify_reconstruction([p.blast for p in prepared])

    return PreprocessResult(case_id=case.id, prepared=tuple(prepared), geometry_report=report)


def coverage(results: Sequence[PreprocessResult]) -> dict:
    """How much of the case matrix each capability actually reaches."""
    flat = [p for r in results for p in r.prepared]
    return {
        "n_blasts": len(flat),
        "n_with_geometry": sum(1 for p in flat if p.has_geometry),
        "n_without_geometry": sum(1 for p in flat if not p.has_geometry),
        "n_degenerate": sum(1 for p in flat if not p.usable),
        "n_with_rock_factor": sum(1 for p in flat if p.rock_factor is not None),
    }
