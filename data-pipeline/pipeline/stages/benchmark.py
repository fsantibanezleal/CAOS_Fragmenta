"""The cross-case bake: the protocol sweep, the published reproductions, the seed sweep, diagnostics.

This artifact is what the Benchmark and Experiments pages read. It is deliberately separate from the
per-case artifacts: a case answers "what does each model say about THIS blast", and this answers
"across every blast we have, which model is actually worth trusting", and mixing the two on one
screen is how a workbench turns into a summary table.

Schema v2 (0.05.000) carries what the engine's 0.3.0 benchmark measures: the spread of 100 random
draws per arm, every leave-one-site-out score on two supports with a site-resampled interval, the
error on each held-out site, every out-of-fold prediction, what each arm was fitted on, and the
diagnostics. Every number a page shows about the corpus as a whole comes from here.
"""

from __future__ import annotations

from pathlib import Path

import blastfrag as bf

from .. import __version__
from ..core.jsonio import write_json
from .export import digest

__all__ = ["BENCHMARK_SCHEMA", "SITE_MEASUREMENT", "build", "write"]

BENCHMARK_SCHEMA = "fragmenta.benchmark/v2"

#: How each campaign measured its fragment sizes, ONLY where the source says so. Hudaverdi,
#: Kulatilake and Kuzu 2010 section 3 states it for the two Istanbul quarries and for Soma; for the
#: other campaigns the corpus reuses sizes from the original studies without restating the method.
SITE_MEASUREMENT: dict[str, str] = {
    "Akdaglar": "Wipfrag image analysis, multiple images per muckpile (stated)",
    "Ozmert": "Wipfrag image analysis, multiple images per muckpile (stated)",
    "Soma": "image analysis software (stated)",
}


def _score_block(result: bf.Score) -> dict:
    return result.as_dict()


def build(*, seed: int = 0, n_seeds: int = 30, n_repeats: int = 100, n_boot: int = 2000) -> dict:
    """Run every cross-case experiment the product reports.

    ``n_seeds`` is the width of the network reproduction sweep: thirty, the width the engine's own
    test pins, so the figure a page quotes and the figure the package asserts are the same run.
    """
    from blastfrag.diagnostics import (
        PUBLISHED_IMPORTANCE,
        grouped_resampling_importance,
        native_importance,
        outlier_screen,
    )

    corpus = bf.load_training_corpus()
    arms = bf.default_arms()
    sweep = bf.run_benchmark(corpus, arms, seed=seed, n_repeats=n_repeats, n_boot=n_boot)

    protocols: dict[str, dict] = {}
    for protocol in sweep.protocols:
        block: dict = {"n_folds": protocol.n_folds, "repeated": protocol.repeated, "arms": {}}
        for row in protocol.arms:
            if protocol.repeated:
                block["arms"][row.arm] = {
                    "tier": row.tier,
                    # The figure to quote for a repeated protocol is the median draw.
                    "r2_identity": row.headline_r2(),
                    "seed0": _score_block(row.score),
                    "repeats": row.detail["repeats"],
                    "rmse_repeats": row.detail["rmse_repeats"],
                    "draws": row.detail["draws_r2_identity"],
                }
            else:
                block["arms"][row.arm] = {
                    "tier": row.tier,
                    **_score_block(row.score),
                    "supports": row.detail["supports"],
                    "per_site": row.detail["per_site"],
                    "predictions": row.detail["predictions"],
                }
        protocols[protocol.protocol] = block

    transfer = bf.KuznetsovTransfer().fit(corpus)
    sites = sorted({b.site for b in corpus})
    site_meta = {}
    for site in sites:
        rows = [b for b in corpus if b.site == site]
        geometry = bf.SITE_GEOMETRY.get(site)
        site_meta[site] = {
            "n_blasts": len(rows),
            "mean_x50_m": sum(b.x50_m for b in rows) / len(rows),
            "E_GPa": sorted({b.E_GPa for b in rows}),
            "mine": geometry.mine if geometry else None,
            "rock": geometry.rock if geometry else None,
            "hole_diameter_mm": geometry.hole_diameter_mm if geometry else None,
            "rock_factor_recovered": bf.SITE_ROCK_FACTOR.get(site),
            "rock_factor_transfer": transfer.rock_factor_for(rows[0].E_GPa),
            "measurement": SITE_MEASUREMENT.get(site),
        }

    fitted = {name: arms[name]().fit(corpus) for name in ("random-forest", "xgboost")}
    diagnostics = {
        "outliers": outlier_screen(corpus),
        "native_importance": {name: native_importance(arm) for name, arm in fitted.items()},
        "published_importance": PUBLISHED_IMPORTANCE,
        "resampling_importance": {
            name: grouped_resampling_importance(arms[name], corpus, n_repeats=10, seed=seed)
            for name in (
                "xgboost",
                "random-forest",
                "published-neural-net",
                "kuznetsov-transfer",
                "published-regression",
            )
        },
        "transfer_fit": {
            "intercept": transfer.intercept,
            "slope": transfer.slope,
            "fit_sites": list(transfer.fit_sites),
            "form": "ln A = intercept + slope * ln E, one point per site",
        },
    }

    payload = {
        "schema": BENCHMARK_SCHEMA,
        "app_version": __version__,
        "engine_version": bf.__version__,
        "corpus_digest": sweep.dataset_digest,
        "seed": seed,
        "n_repeats": n_repeats,
        "n_boot": n_boot,
        "kill_criterion": bf.KILL_CRITERION,
        "verdict": _serialisable(sweep.verdict),
        "provenance": sweep.provenance,
        "protocols": protocols,
        "published_reproduction": _published_reproduction(),
        "network_seed_sweep": _network_seed_sweep(corpus, n_seeds=n_seeds),
        "duplicate_groups": bf.duplicate_groups(corpus),
        "sites": sites,
        "site_counts": {site: site_meta[site]["n_blasts"] for site in sites},
        "site_meta": site_meta,
        "diagnostics": diagnostics,
    }
    payload = _serialisable(payload)
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
    """Retrain the published network under many seeds and record where its score lands."""
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
    summary = bf.summarise_draws(values)
    return {
        "n_seeds": n_seeds,
        "r2_identity": values,
        "min": values[0] if values else None,
        "median": summary.get("median"),
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
    """Same contract as the case exporter: a non-finite float becomes null, never NaN."""
    import math

    if isinstance(value, dict):
        return {str(k): _serialisable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_serialisable(v) for v in value]
    if isinstance(value, float) and not math.isfinite(value):
        return None
    return value


def write(root: Path, payload: dict) -> tuple[Path, int]:
    path = root / "benchmark.json"
    return path, write_json(path, payload)
