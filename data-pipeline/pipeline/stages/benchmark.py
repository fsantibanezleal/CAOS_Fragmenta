"""The cross-case bake: the protocol sweep, the published reproductions, and the seed sweep.

This artifact is what the Benchmark and Experiments pages read. It is deliberately separate from the
per-case artifacts: a case answers "what does each model say about THIS blast", and this answers
"across every blast we have, which model is actually worth trusting", and mixing the two on one
screen is how a workbench turns into a summary table.
"""

from __future__ import annotations

import json
from pathlib import Path

import blastfrag as bf

from .. import __version__
from .export import digest

__all__ = ["BENCHMARK_SCHEMA", "build", "write"]

BENCHMARK_SCHEMA = "fragmenta.benchmark/v1"


def _score_block(result: bf.Score) -> dict:
    return {
        "n_scored": result.n_scored,
        "n_abstained": result.n_abstained,
        "pearson_r2": result.pearson_r2,
        "r2_identity": result.r2_identity,
        "rmse_m": result.rmse_m,
        "mae_m": result.mae_m,
        "mape_pct": result.mape_pct,
        "bias_m": result.bias_m,
    }


def build(*, seed: int = 0, n_seeds: int = 12) -> dict:
    """Run every cross-case experiment the product reports.

    ``n_seeds`` controls the network reproduction sweep. Twelve is enough to establish the range
    without making a bake take an hour; the package's own test runs thirty.
    """
    corpus = bf.load_training_corpus()
    arms = bf.default_arms()

    sweep = bf.run_benchmark(corpus, arms, seed=seed)

    protocols = {}
    for protocol in sweep.protocols:
        protocols[protocol.protocol] = {
            "n_folds": protocol.n_folds,
            "arms": {
                row.arm: {"tier": row.tier, **_score_block(row.score)}
                for row in protocol.arms
            },
        }

    published = _published_reproduction()
    seeds = _network_seed_sweep(corpus, n_seeds=n_seeds)

    payload = {
        "schema": BENCHMARK_SCHEMA,
        "app_version": __version__,
        "engine_version": bf.__version__,
        "corpus_digest": sweep.dataset_digest,
        "seed": seed,
        "kill_criterion": bf.KILL_CRITERION,
        "verdict": _serialisable(sweep.verdict),
        "protocols": protocols,
        "published_reproduction": published,
        "network_seed_sweep": seeds,
        "duplicate_groups": bf.duplicate_groups(corpus),
        "sites": sorted({b.site for b in corpus}),
        "site_counts": {
            site: sum(1 for b in corpus if b.site == site)
            for site in sorted({b.site for b in corpus})
        },
    }
    payload["digest"] = digest(payload)
    return payload


def _published_reproduction() -> dict:
    """Score the published prediction columns against our recomputation, on the same rows.

    The finding this produces: applying the published equation correctly outperforms the numbers the
    papers tabulated for it, on both of their own hold-outs.
    """
    arm = bf.PublishedRegression()
    out: dict[str, dict] = {}
    for label, column in (
        ("2010", "regression_2010"),
        ("2012", "regression_2012"),
    ):
        rows = [
            b
            for b in bf.load_holdout(protocol="union")
            if b.meta["published"][column] is not None
        ]
        as_published = bf.score(
            rows,
            [
                bf.Prediction(method="published", blast_id=b.blast_id, x50_m=b.meta["published"][column])
                for b in rows
            ],
            method="as-published",
        )
        recomputed = bf.score(rows, arm.predict(rows), method="recomputed")
        out[label] = {
            "n_rows": len(rows),
            "as_published": _score_block(as_published),
            "recomputed": _score_block(recomputed),
            "gain_in_r2_identity": recomputed.r2_identity - as_published.r2_identity,
        }

    # The three published arms on the fixed twelve-blast hold-out, plus a null.
    holdout = bf.load_holdout(protocol="2012")
    arms: dict[str, dict] = {}
    for label, column in (
        ("classical", "kuzram_2012"),
        ("regression", "regression_2012"),
        ("neural-net", "nn_mean_2012"),
    ):
        arms[label] = _score_block(
            bf.score(
                holdout,
                [
                    bf.Prediction(method=label, blast_id=b.blast_id, x50_m=b.meta["published"][column])
                    for b in holdout
                ],
                method=label,
            )
        )
    arms["null"] = _score_block(
        bf.null_model_score(holdout, training_mean_m=bf.training_mean(bf.load_training_corpus()))
    )
    out["published_holdout_arms"] = arms

    # And the leakage measurement: the same three arms with the one leaked row removed.
    clean = [b for b in holdout if not b.meta["in_training_table"]]
    out["without_the_leaked_row"] = {
        label: _score_block(
            bf.score(
                clean,
                [
                    bf.Prediction(method=label, blast_id=b.blast_id, x50_m=b.meta["published"][column])
                    for b in clean
                ],
                method=label,
            )
        )
        for label, column in (
            ("classical", "kuzram_2012"),
            ("regression", "regression_2012"),
            ("neural-net", "nn_mean_2012"),
        )
    }
    return out


def _network_seed_sweep(corpus, *, n_seeds: int) -> dict:
    """Retrain the published network under many seeds and record where its score lands.

    The published figure sits above every seed in the recorded run. Baking the distribution rather
    than the claim is what lets the page show a range instead of an assertion.
    """
    from blastfrag.learned import PublishedNeuralNetwork

    holdout = bf.load_holdout(protocol="2012")
    values: list[float] = []
    per_blast: dict[str, list[float]] = {b.blast_id: [] for b in holdout}
    for seed in range(n_seeds):
        arm = PublishedNeuralNetwork(seed=seed).fit(corpus)
        predictions = arm.predict(holdout)
        result = bf.score(holdout, predictions)
        if result.r2_identity is not None:
            values.append(result.r2_identity)
        for prediction in predictions:
            if prediction.x50_m is not None:
                per_blast[prediction.blast_id].append(prediction.x50_m)

    values.sort()
    published = bf.score(
        holdout,
        [
            bf.Prediction(method="pub", blast_id=b.blast_id, x50_m=b.meta["published"]["nn_mean_2012"])
            for b in holdout
        ],
    ).r2_identity
    return {
        "n_seeds": n_seeds,
        "r2_identity": values,
        "min": values[0] if values else None,
        "median": values[len(values) // 2] if values else None,
        "max": values[-1] if values else None,
        "published": published,
        "published_above_every_seed": bool(values) and published > values[-1],
        "per_blast": {
            blast_id: {
                "measured_m": next(b.x50_m for b in holdout if b.blast_id == blast_id),
                "published_m": next(
                    b.meta["published"]["nn_mean_2012"] for b in holdout if b.blast_id == blast_id
                ),
                "min_m": min(vals) if vals else None,
                "max_m": max(vals) if vals else None,
            }
            for blast_id, vals in per_blast.items()
        },
    }


def _serialisable(value):
    if isinstance(value, dict):
        return {str(k): _serialisable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_serialisable(v) for v in value]
    return value


def write(root: Path, payload: dict) -> tuple[Path, int]:
    root.mkdir(parents=True, exist_ok=True)
    path = root / "benchmark.json"
    text = json.dumps(payload, indent=1, sort_keys=True, default=str)
    path.write_text(text, encoding="utf-8")
    return path, len(text.encode("utf-8"))
