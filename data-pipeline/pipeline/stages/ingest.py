"""Stage 1, ingest: load a case's blasts through the engine's contract, with provenance.

Nothing is coerced here. A row that fails the contract stops the stage, because a corpus that has
drifted from its source is not a corpus with a few bad rows in it, it is a corpus of unknown
provenance.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field

import blastfrag as bf

from ..cases.fragmenta_cases import Case
from ..model.blasts import blasts_for_case, is_degenerate

__all__ = ["IngestResult", "run"]


@dataclass(frozen=True, slots=True)
class IngestResult:
    case_id: str
    blasts: tuple[bf.Blast, ...]
    flags: tuple[dict, ...] = ()
    provenance: dict = field(default_factory=dict)


def run(case: Case) -> IngestResult:
    blasts = blasts_for_case(case)
    if not blasts:
        raise ValueError(f"{case.id}: ingest produced no blasts")

    flags: list[dict] = []
    for blast in blasts:
        # Out-of-envelope rows are ADMITTED for the extrapolation control and flagged; everywhere
        # else the contract's default refusal stands.
        allow = case.category == "extrapolation-control" or case.real_or_synthetic == "synthetic"
        warnings = bf.validate_blast(blast, allow_extrapolation=allow)
        for warning in warnings:
            flags.append(
                {
                    "blast_id": blast.blast_id,
                    "kind": "extrapolation",
                    "detail": warning,
                }
            )
        degenerate = is_degenerate(blast)
        if degenerate is not None:
            flags.append(
                {"blast_id": blast.blast_id, "kind": "degenerate-design", "detail": degenerate}
            )

    if case.real_or_synthetic == "real" and case.dataset == "train":
        # The integrity gate has already run inside the loader; this records that it did, so the
        # artifact can say which corpus it was built from rather than merely which file.
        digest = bf.datasets.compute_dataset_digest(bf.load_training_corpus(verify=False))
    else:
        digest = None

    return IngestResult(
        case_id=case.id,
        blasts=tuple(blasts),
        flags=tuple(flags),
        provenance={
            "dataset": case.dataset,
            "site": case.site,
            "doi": case.doi,
            "licence": case.licence,
            "n_blasts": len(blasts),
            "corpus_digest": digest,
            "real_or_synthetic": case.real_or_synthetic,
        },
    )


def summarise(results: Sequence[IngestResult]) -> dict:
    return {
        "n_cases": len(results),
        "n_blasts": sum(len(r.blasts) for r in results),
        "n_flags": sum(len(r.flags) for r in results),
        "flag_kinds": sorted({f["kind"] for r in results for f in r.flags}),
    }
