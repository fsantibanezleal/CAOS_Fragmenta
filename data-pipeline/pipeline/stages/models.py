"""Stage 5b, models: the fitted arms of each training scope, written for the browser.

When a reader changes a design on the App, the closed-form arms recompute in TypeScript. The fitted
arms (the published network, the radial support-vector arm, the random forest, gradient boosting, the
stacked model, the refitted power law and the transfer form of the classical equation) recompute too,
from this file: the engine's portable export of the models the train stage fitted for the case.

A **scope** is the set of training rows a model saw. A real campaign's scope is the corpus minus that
campaign, named by the withheld site, so a model shown predicting a campaign never saw it. Every other
case trains on the whole corpus, scope ``corpus``. Cases that share a scope share one file.

Two details keep the file honest and small:

* **Fixtures.** For every arm, the prediction of the ORIGINAL fitted model (not of the portable reader)
  at each of the 116 shipped blasts, at full precision. The TypeScript walker is tested against these,
  so a port that drifts from the fitted model fails the build even if it agrees with the reader.
* **The stacked model's base learners are stored by reference.** With the published parameters they
  are the same forest and the same boosting model as the standalone arms, fitted on the same rows; the
  stage asserts the trees are identical before replacing them with a reference, and refuses otherwise.
"""

from __future__ import annotations

from collections.abc import Sequence
from pathlib import Path

import blastfrag as bf

from .. import __version__
from ..core.jsonio import write_json
from .export import _serialisable, digest
from .train import TrainedArms

__all__ = ["MODELS_SCHEMA", "LIVE_ARMS", "scope_of", "build", "write"]

MODELS_SCHEMA = "fragmenta.models/v1"

LIVE_ARMS: tuple[str, ...] = (
    "published-neural-net",
    "svr-rbf",
    "random-forest",
    "xgboost",
    "stacking",
    "refitted-regression",
    "kuznetsov-transfer",
)


def scope_of(trained: TrainedArms) -> str:
    """The name of the training rows these arms saw: the withheld site, or the whole corpus."""
    return trained.held_out_site or "corpus"


def _fixture_blasts() -> list[bf.Blast]:
    """Every blast the product ships: the corpus, the union hold-out and the field hold-out."""
    return (
        list(bf.load_training_corpus())
        + list(bf.load_holdout(protocol="union"))
        + list(bf.load_field_holdout())
    )


def _fixture_value(name: str, arm: bf.Arm, blast: bf.Blast) -> float | None:
    if name == "kuznetsov-transfer":
        # The portable reader returns the rock factor for this arm; the size needs absolute
        # geometry, which the browser's own classical implementation supplies.
        return arm.rock_factor_for(blast.E_GPa)
    return arm.predict_one(blast).x50_m


def build(trained: TrainedArms) -> dict:
    """The models document for one training scope."""
    arms: dict[str, dict] = {}
    for name in LIVE_ARMS:
        arm = trained.arms.get(name)
        if arm is None or name in trained.failed:
            continue
        arms[name] = bf.export_arm(arm)

    stack = arms.get("stacking")
    if stack is not None:
        forest, boosting = arms.get("random-forest"), arms.get("xgboost")
        same_forest = forest is not None and stack["forest"]["trees"] == forest["trees"]
        same_boosting = boosting is not None and (
            stack["boosting"]["trees"] == boosting["trees"]
            and stack["boosting"]["base_score"] == boosting["base_score"]
        )
        same_scaling = forest is not None and stack["standardise"] == forest["standardise"]
        if not (same_forest and same_boosting and same_scaling):
            raise AssertionError(
                f"{scope_of(trained)}: the stacked model's base learners differ from the standalone "
                "arms, so they cannot be stored by reference"
            )
        stack["forest"] = {"ref": "random-forest"}
        stack["boosting"] = {"ref": "xgboost"}

    blasts = _fixture_blasts()
    fixtures = {
        "inputs": [
            {"blast_id": b.blast_id, "site": b.site, "features": list(b.features())}
            for b in blasts
        ],
        "expected": {
            name: [_fixture_value(name, trained.arms[name], b) for b in blasts] for name in arms
        },
        "note": (
            "predictions of the original fitted models at full precision; for "
            "kuznetsov-transfer the value is the rock factor"
        ),
    }

    payload = {
        "schema": MODELS_SCHEMA,
        "scope": scope_of(trained),
        "held_out_site": trained.held_out_site,
        "n_training_rows": trained.n_training_rows,
        "engine": {"package": "blastfrag", "version": bf.__version__},
        "app_version": __version__,
        "portable_schema": bf.PORTABLE_SCHEMA,
        "arms": arms,
        "fixtures": fixtures,
    }
    payload = _serialisable(payload)
    payload["digest"] = digest(payload)
    return payload


def write(root: Path, payload: dict) -> tuple[Path, int]:
    path = root / "models" / f"{payload['scope']}.json"
    return path, write_json(path, payload, compact=True)


def listing(root: Path, scopes: Sequence[str]) -> list[dict]:
    """Index entries for the models files a bake wrote."""
    import json

    out = []
    for scope in sorted(set(scopes)):
        path = root / "models" / f"{scope}.json"
        payload = json.loads(path.read_text(encoding="utf-8"))
        out.append(
            {
                "scope": scope,
                "path": f"models/{scope}.json",
                "bytes": path.stat().st_size,
                "digest": payload["digest"],
                "arms": sorted(payload["arms"]),
            }
        )
    return out
