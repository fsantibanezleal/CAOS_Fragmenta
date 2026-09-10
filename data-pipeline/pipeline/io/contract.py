"""CONTRACT 1, ingestion: the bring-your-own-data gate.

Declares what a blast record must contain, in what units and within what ranges, and what happens to
a row that does not comply. A row is ACCEPTED only if it passes; a bad row is REJECTED with a reason
rather than silently coerced; a plausible-but-unusual row is FLAGGED, accepted, and recorded in the
manifest.

The ranges themselves live in `blastfrag`, because they are properties of the published corpus rather
than of this product, and because a model and its admissible inputs should not be able to drift apart.
Two bands, and they are not the same band:

- **contract bounds** are rejection. A modulus of 60000 is a unit error, not an unusual blast.
- **the fitted envelope** is the corpus's own range. A row outside it is an EXTRAPOLATION, admitted
  only on an explicit opt-in, and every prediction made on it is stamped.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import blastfrag as bf

REQUIRED_COLUMNS: tuple[str, ...] = ("blast_id", "site") + bf.FEATURES

#: name -> (min, max, unit). Outside this is a rejection, not an unusual blast.
RANGES: dict[str, tuple[float, float, str]] = {
    "S_over_B": (0.5, 3.0, "dimensionless (spacing / burden)"),
    "H_over_B": (0.5, 15.0, "dimensionless (bench height / burden)"),
    "B_over_D": (5.0, 80.0, "dimensionless (burden / hole diameter)"),
    "T_over_B": (0.1, 8.0, "dimensionless (stemming / burden)"),
    "Pf_kg_m3": (0.05, 3.0, "kg/m3 (powder factor)"),
    "XB_m": (0.005, 10.0, "m (in situ block size)"),
    "E_GPa": (0.5, 150.0, "GPa (Young modulus)"),
}

OUTLIER_POLICY = (
    "REJECT outside the contract range, because that is a unit or entry error rather than an unusual "
    "blast. FLAG and accept outside the fitted envelope, but only when the caller has opted in with "
    "allow_extrapolation, and stamp every prediction made on such a row. NEVER clip: a clipped input "
    "produces a confident prediction for a design nobody entered."
)


@dataclass(frozen=True, slots=True)
class Rejection:
    blast_id: str
    column: str
    value: Any
    reason: str


def validate_row(row: dict) -> list[Rejection]:
    """Check one raw row against the contract. Empty list means accepted."""
    problems: list[Rejection] = []
    for column in REQUIRED_COLUMNS:
        if column not in row:
            problems.append(Rejection(row.get("blast_id", "?"), column, None, "column missing"))
    for column, (low, high, unit) in RANGES.items():
        if column not in row:
            continue
        try:
            value = float(row[column])
        except (TypeError, ValueError):
            problems.append(Rejection(row.get("blast_id", "?"), column, row[column], "not a number"))
            continue
        if not low <= value <= high:
            problems.append(
                Rejection(
                    row.get("blast_id", "?"),
                    column,
                    value,
                    f"outside the contract range [{low}, {high}] {unit}",
                )
            )
    return problems


def envelope() -> dict[str, tuple[float, float]]:
    """The fitted envelope, from the engine. Outside it is an extrapolation, not a rejection."""
    return dict(bf.TRAINING_ENVELOPE)
