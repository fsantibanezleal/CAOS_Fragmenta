"""Stage 3, dataset and split: the three protocols, with the leakage guards asserted in code.

The protocols themselves live in `blastfrag`. This stage is where the product decides which one a
given surface reports, and it is deliberately the only place that decision is made.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

import blastfrag as bf

__all__ = ["PROTOCOL_LABELS", "SplitPlan", "run"]

PROTOCOL_LABELS: dict[str, tuple[str, str]] = {
    "random-8020": (
        "Random 80/20, the published protocol",
        "Aleatorio 80/20, el protocolo publicado",
    ),
    "dedup-random": (
        "Deduplicated, then random",
        "Deduplicado y luego aleatorio",
    ),
    "leave-one-site-out": (
        "Leave one site out, an unseen site in every fold",
        "Dejar un sitio fuera, un sitio no visto en cada partición",
    ),
}


@dataclass(frozen=True, slots=True)
class SplitPlan:
    protocols: dict[str, list[bf.Split]]
    duplicate_groups: list[list[str]]
    n_duplicate_rows: int


def run(blasts: Sequence[bf.Blast], *, seed: int = 0) -> SplitPlan:
    groups = bf.duplicate_groups(blasts)
    plan = SplitPlan(
        protocols=bf.all_protocols(blasts, seed=seed),
        duplicate_groups=groups,
        n_duplicate_rows=sum(len(g) for g in groups),
    )
    # Every split is guarded at construction inside the engine. Re-asserting here is not redundant:
    # it is the product stating, in its own code, which invariant it depends on.
    for name, splits in plan.protocols.items():
        for split in splits:
            bf.splits.assert_no_leakage(split, allow_duplicate_features=(name == "random-8020"))
    return plan
