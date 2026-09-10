"""Stage 5, train: fit the learned arms, once, on the leakage-safe training rows.

The rows used here are the whole published corpus MINUS the case's own site when the case is a real
campaign. That is the leave-one-site-out protocol applied at bake time, and it is the only honest way
to show a learned prediction on a case whose blasts the model could otherwise have memorised.

The benchmark stage runs the full protocol sweep separately. This stage exists so that what the App
shows for a case is a prediction the model made without having seen that case.
"""

from __future__ import annotations

import time
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field

import blastfrag as bf

from ..cases.fragmenta_cases import Case

__all__ = ["LEARNED_FACTORIES", "TrainedArms", "run"]


LEARNED_FACTORIES: dict[str, Callable[[], bf.Arm]] = {}


def _factories() -> dict[str, Callable[[], bf.Arm]]:
    if LEARNED_FACTORIES:
        return LEARNED_FACTORIES
    from blastfrag.learned import (
        GradientBoosting,
        PublishedNeuralNetwork,
        RandomForest,
        StackingEnsemble,
        SupportVectorRegression,
    )

    LEARNED_FACTORIES.update(
        {
            "published-neural-net": PublishedNeuralNetwork,
            "svr-rbf": lambda: SupportVectorRegression(variant="rbf-amoako"),
            "random-forest": RandomForest,
            "xgboost": GradientBoosting,
            "stacking": StackingEnsemble,
            "refitted-regression": bf.RefittedRegression,
        }
    )
    return LEARNED_FACTORIES


@dataclass(frozen=True, slots=True)
class TrainedArms:
    case_id: str
    arms: dict[str, bf.Arm]
    held_out_site: str | None
    n_training_rows: int
    fit_seconds: dict[str, float] = field(default_factory=dict)
    failed: dict[str, str] = field(default_factory=dict)


def training_rows(case: Case) -> tuple[list[bf.Blast], str | None]:
    """The rows a learned arm may see for this case, and which site was withheld.

    For a real campaign, the case's own site is withheld. For everything else the whole corpus is
    available, because a synthetic design and an out-of-envelope field set are not in the corpus at
    all and there is nothing to leak.
    """
    corpus = bf.load_training_corpus()
    if case.real_or_synthetic == "real" and case.dataset == "train" and case.site:
        return [b for b in corpus if b.site != case.site], case.site
    return corpus, None


def run(case: Case, *, seed: int = 0) -> TrainedArms:
    rows, held_out = training_rows(case)
    arms: dict[str, bf.Arm] = {}
    seconds: dict[str, float] = {}
    failed: dict[str, str] = {}

    for name, factory in _factories().items():
        arm = factory()
        started = time.perf_counter()
        try:
            arm.fit(rows)
        except (ValueError, ImportError) as exc:
            # A fold that cannot support an arm is recorded, not skipped. The arm will abstain on
            # every blast in the case and the reason will reach the artifact.
            failed[name] = str(exc)
            arms[name] = arm
            continue
        seconds[name] = time.perf_counter() - started
        arms[name] = arm

    return TrainedArms(
        case_id=case.id,
        arms=arms,
        held_out_site=held_out,
        n_training_rows=len(rows),
        fit_seconds=seconds,
        failed=failed,
    )


def leakage_assertions(case: Case, trained: TrainedArms, case_blasts: Sequence[bf.Blast]) -> None:
    """Fail the bake if a learned arm for this case could have seen the case's own blasts.

    This is the guard the whole train stage exists for, and it is asserted rather than trusted.
    """
    if trained.held_out_site is None:
        return
    rows, _ = training_rows(case)
    training_ids = {b.blast_id for b in rows}
    training_sites = {b.site for b in rows}
    overlap = training_ids & {b.blast_id for b in case_blasts}
    if overlap:
        raise AssertionError(
            f"{case.id}: {len(overlap)} of the case's own blasts are in its training rows: "
            f"{sorted(overlap)}"
        )
    if trained.held_out_site in training_sites:
        raise AssertionError(
            f"{case.id}: the held-out site {trained.held_out_site!r} is still in the training rows"
        )
