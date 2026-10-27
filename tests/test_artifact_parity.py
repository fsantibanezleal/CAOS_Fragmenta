"""Parity of the committed artifacts with a live run of the engine and the pipeline.

Five comparisons used to sit in the notebooks, each a cell that printed "equal to the committed value".
Checking an artifact is the test suite's job, not a lesson's, so they live here:

1. the Enusa case's `kuznetsov` predictions and score equal a live run of the predictor; 2. the transfer line
(`diagnostics.transfer_fit`) equals a live `KuznetsovTransfer().fit`, and the committed leave-one-site-out
score and interval of `kuznetsov`, `kuznetsov-transfer` and `null` equal a live run; 3. the
`published_reproduction` values of both validation sets (2010 and 2012) equal a live recomputation; 4. the
hold-out scores of the three printed columns (and the null) equal the committed `benchmark.json`; 5. the
committed variant curves of Akdaglar (notebook 06-01) equal a recomputation.

Each comparison is a function that returns the list of mismatches, so the same code runs twice: on the
committed artifact, where the list must be empty, and on a copy with one value changed, where it must not be.
A parity test that read nothing, or compared an artifact with itself, would pass the second run and fail it.

Exact where the bake writes the same float (plain arithmetic: scores, printed columns); the tolerance the
existing re-bake test uses (`compare_bakes.RELATIVE_TOLERANCE`) where a model is fitted, because two builds of
the same pins reduce a dot product in a different order.

`FRAGMENTA_PARITY_DERIVED` points the tests at another copy of `data/derived/`; it exists so a copy with one
value changed can be checked from outside (the unit's Red run). Unset, the tests read the committed artifacts.
"""

from __future__ import annotations

import copy
import json
import math
import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))
sys.path.insert(0, str(ROOT / "scripts"))

import blastfrag as bf  # noqa: E402
from compare_bakes import RELATIVE_TOLERANCE  # noqa: E402
from pipeline.model.blasts import apply_variant, blasts_for_case, is_degenerate  # noqa: E402
from pipeline.registry import get_case  # noqa: E402

DERIVED = Path(os.environ.get("FRAGMENTA_PARITY_DERIVED") or ROOT / "data" / "derived")

#: Plain arithmetic on the same rows: the bake writes the same float.
EXACT = 1e-12
#: A fitted model: the tolerance of the existing re-bake test.
FITTED = RELATIVE_TOLERANCE


def _read(relative: str) -> dict:
    path = DERIVED / relative
    assert path.is_file(), f"the committed artifact is missing: {path}"
    return json.loads(path.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def benchmark() -> dict:
    return _read("benchmark.json")


@pytest.fixture(scope="module")
def corpus() -> list:
    return bf.load_training_corpus()


def _differs(live, committed, relative: float, absolute: float | None = None) -> bool:
    """A live number against a stored one; the artifact stores an undefined number (NaN) as null."""
    if isinstance(live, float) and math.isnan(live):
        live = None
    if live is None or committed is None:
        return live is not committed
    return not math.isclose(
        live, committed, rel_tol=relative, abs_tol=relative if absolute is None else absolute
    )


def _compare(label: str, live: dict, committed: dict, relative: float, keys=None) -> list[str]:
    """The numbers of two flat dicts that differ; a key the committed side lacks is a mismatch too."""
    problems = []
    for key in keys if keys is not None else live:
        if key not in committed:
            problems.append(f"{label}.{key}: absent from the committed artifact")
        elif _differs(live[key], committed[key], relative):
            problems.append(f"{label}.{key}: live {live[key]!r}, committed {committed[key]!r}")
    return problems


SCORE_KEYS = (
    "bias_m",
    "mae_m",
    "mape_pct",
    "n_abstained",
    "n_extrapolated",
    "n_scored",
    "pearson_r2",
    "r2_identity",
    "rmse_m",
)


def _printed(rows, column: str, label: str) -> list:
    return [bf.Prediction(method=label, blast_id=b.blast_id, x50_m=b.meta["published"][column]) for b in rows]


# ---------------------------------------------------------------------------------------------
# 1. The Enusa artifact against a live run of the predictor
# ---------------------------------------------------------------------------------------------


def check_enusa_kuznetsov(artifact: dict, corpus: list) -> list[str]:
    enusa = [b for b in corpus if b.site == "Enusa"]
    predictions = bf.Kuznetsov().predict(enusa)
    problems = []
    for blast, prediction in zip(enusa, predictions):
        committed = artifact["predictions"]["kuznetsov"].get(blast.blast_id)
        if committed is None:
            problems.append(f"{blast.blast_id}: no committed prediction")
        # The case artifact stores a predicted size rounded to 6 decimals (micrometres):
        # half a unit of the last one.
        elif _differs(prediction.x50_m, committed["x50_m"], 0.0, absolute=5e-7):
            problems.append(f"{blast.blast_id}: live {prediction.x50_m!r}, committed {committed['x50_m']!r}")
    live = bf.score(enusa, predictions, method="kuznetsov").as_dict()
    problems += _compare("score", live, artifact["scores"]["kuznetsov"], EXACT, SCORE_KEYS)
    return problems


def test_the_enusa_artifact_equals_a_live_run_of_the_classical_predictor(corpus):
    assert check_enusa_kuznetsov(_read("real-enusa/case.json"), corpus) == []


def test_the_enusa_check_fails_on_an_altered_artifact(corpus):
    artifact = copy.deepcopy(_read("real-enusa/case.json"))
    artifact["predictions"]["kuznetsov"]["En1"]["x50_m"] += 0.001
    assert any("En1" in p for p in check_enusa_kuznetsov(artifact, corpus))
    artifact = copy.deepcopy(_read("real-enusa/case.json"))
    artifact["scores"]["kuznetsov"]["r2_identity"] += 0.001
    assert any("r2_identity" in p for p in check_enusa_kuznetsov(artifact, corpus))


# ---------------------------------------------------------------------------------------------
# 2. The transfer line and the leave-one-site-out scores of the classical arms
# ---------------------------------------------------------------------------------------------


@pytest.fixture(scope="module")
def live_loso(corpus) -> dict:
    """Per arm, the rows answered on the geometry support and their predictions, as the bake scores them."""
    tested, predictions = [], {"kuznetsov": [], "kuznetsov-transfer": [], "null": []}
    for split in bf.leave_one_site_out(corpus):
        predictions["kuznetsov"] += bf.Kuznetsov().fit(split.train).predict(split.test)
        predictions["kuznetsov-transfer"] += bf.KuznetsovTransfer().fit(split.train).predict(split.test)
        predictions["null"] += bf.NullModel().fit(split.train).predict(split.test)
        tested += list(split.test)
    out = {}
    for name, predicted in predictions.items():
        answered = [
            (b, p) for b, p in zip(tested, predicted) if p.x50_m is not None and bf.has_absolute_geometry(b)
        ]
        rows, preds = [a[0] for a in answered], [a[1] for a in answered]
        point, low, high = bf.bootstrap_interval(rows, preds, "r2_identity", n_boot=2000, unit="site", seed=0)
        out[name] = {"n": len(rows), "r2_identity": point, "interval_95": [low, high]}
    return out


def check_transfer_line(benchmark: dict, corpus: list) -> list[str]:
    transfer = bf.KuznetsovTransfer().fit(corpus)
    committed = benchmark["diagnostics"]["transfer_fit"]
    problems = _compare(
        "transfer_fit",
        {"intercept": transfer.intercept, "slope": transfer.slope},
        committed,
        FITTED,
    )
    if list(transfer.fit_sites) != committed["fit_sites"]:
        problems.append(
            f"transfer_fit.fit_sites: live {list(transfer.fit_sites)}, committed {committed['fit_sites']}"
        )
    return problems


def check_loso(benchmark: dict, live: dict) -> list[str]:
    problems = []
    for name, got in live.items():
        want = benchmark["protocols"]["leave-one-site-out"]["arms"][name]["supports"]["geometry"]
        if got["n"] != want["score"]["n_scored"]:
            problems.append(f"{name}.n: live {got['n']}, committed {want['score']['n_scored']}")
        problems += _compare(name, {"r2_identity": got["r2_identity"]}, want["score"], FITTED)
        for end, value, stored in zip(("low", "high"), got["interval_95"], want["interval_95"]):
            if _differs(value, stored, FITTED):
                problems.append(f"{name}.interval_95 {end}: live {value!r}, committed {stored!r}")
    return problems


def test_the_transfer_line_equals_a_live_fit(benchmark, corpus):
    assert check_transfer_line(benchmark, corpus) == []


def test_the_transfer_check_fails_on_an_altered_artifact(benchmark, corpus):
    for key in ("intercept", "slope"):
        altered = copy.deepcopy(benchmark)
        altered["diagnostics"]["transfer_fit"][key] += 0.01
        assert any(key in p for p in check_transfer_line(altered, corpus)), key
    altered = copy.deepcopy(benchmark)
    altered["diagnostics"]["transfer_fit"]["fit_sites"] = altered["diagnostics"]["transfer_fit"]["fit_sites"][
        :-1
    ]
    assert any("fit_sites" in p for p in check_transfer_line(altered, corpus))


def test_the_leave_one_site_out_scores_of_the_classical_arms_equal_a_live_run(benchmark, live_loso):
    assert set(live_loso) == {"kuznetsov", "kuznetsov-transfer", "null"}
    assert check_loso(benchmark, live_loso) == []


def test_the_leave_one_site_out_check_fails_on_an_altered_artifact(benchmark, live_loso):
    for name in live_loso:
        altered = copy.deepcopy(benchmark)
        arm = altered["protocols"]["leave-one-site-out"]["arms"][name]["supports"]["geometry"]
        arm["score"]["r2_identity"] += 0.001
        assert any(f"{name}.r2_identity" in p for p in check_loso(altered, live_loso)), name
        altered = copy.deepcopy(benchmark)
        altered["protocols"]["leave-one-site-out"]["arms"][name]["supports"]["geometry"]["interval_95"][
            1
        ] += 0.001
        assert any(f"{name}.interval_95 high" in p for p in check_loso(altered, live_loso)), name


# ---------------------------------------------------------------------------------------------
# 3. The published reproduction of both validation sets against a live recomputation
# ---------------------------------------------------------------------------------------------


def check_published_reproduction(benchmark: dict) -> list[str]:
    committed = benchmark["published_reproduction"]
    regression = bf.PublishedRegression()
    union = bf.load_holdout(protocol="union")
    problems = []
    for label, column in (("2010", "regression_2010"), ("2012", "regression_2012")):
        rows = [b for b in union if b.meta["published"][column] is not None]
        block = committed[label]
        if len(rows) != block["n_rows"]:
            problems.append(f"{label}.n_rows: live {len(rows)}, committed {block['n_rows']}")
        as_printed = bf.score(rows, _printed(rows, column, "as-published"), method="as-published")
        recomputed = bf.score(rows, regression.predict(rows), method="recomputed")
        problems += _compare(
            f"{label}.as_published", as_printed.as_dict(), block["as_published"], EXACT, SCORE_KEYS
        )
        problems += _compare(
            f"{label}.recomputed", recomputed.as_dict(), block["recomputed"], EXACT, SCORE_KEYS
        )
        gain = {"gain_in_r2_identity": recomputed.r2_identity - as_printed.r2_identity}
        problems += _compare(label, gain, block, EXACT)
    return problems


def test_the_published_reproduction_of_both_validation_sets_equals_a_live_recomputation(benchmark):
    assert check_published_reproduction(benchmark) == []


def test_the_published_reproduction_check_fails_on_an_altered_artifact(benchmark):
    for label in ("2010", "2012"):
        for side in ("as_published", "recomputed"):
            altered = copy.deepcopy(benchmark)
            altered["published_reproduction"][label][side]["r2_identity"] += 0.001
            assert any(f"{label}.{side}.r2_identity" in p for p in check_published_reproduction(altered)), (
                label,
                side,
            )
    altered = copy.deepcopy(benchmark)
    altered["published_reproduction"]["2012"]["n_rows"] += 1
    assert any("n_rows" in p for p in check_published_reproduction(altered))


# ---------------------------------------------------------------------------------------------
# 4. The scores of the printed columns on the 12-blast hold-out against the committed benchmark
# ---------------------------------------------------------------------------------------------

PRINTED = (("classical", "kuzram_2012"), ("regression", "regression_2012"), ("neural-net", "nn_mean_2012"))


def check_printed_columns(benchmark: dict, corpus: list) -> list[str]:
    committed = benchmark["published_reproduction"]
    holdout = bf.load_holdout(protocol="2012")
    clean = [b for b in holdout if not b.meta["in_training_table"]]
    problems = []
    for label, column in PRINTED:
        live = bf.score(holdout, _printed(holdout, column, label), method=label).as_dict()
        problems += _compare(
            f"published_holdout_arms.{label}",
            live,
            committed["published_holdout_arms"][label],
            EXACT,
            SCORE_KEYS,
        )
        live = bf.score(clean, _printed(clean, column, label), method=label).as_dict()
        problems += _compare(
            f"without_the_leaked_row.{label}",
            live,
            committed["without_the_leaked_row"][label],
            EXACT,
            SCORE_KEYS,
        )
    null = bf.null_model_score(holdout, training_mean_m=bf.training_mean(corpus)).as_dict()
    problems += _compare(
        "published_holdout_arms.null", null, committed["published_holdout_arms"]["null"], EXACT, SCORE_KEYS
    )
    return problems


def test_the_scores_of_the_printed_columns_equal_the_committed_benchmark(benchmark, corpus):
    assert check_printed_columns(benchmark, corpus) == []


def test_the_printed_columns_check_fails_on_an_altered_artifact(benchmark, corpus):
    for label, _ in PRINTED:
        for block in ("published_holdout_arms", "without_the_leaked_row"):
            altered = copy.deepcopy(benchmark)
            altered["published_reproduction"][block][label]["rmse_m"] += 0.001
            assert any(f"{block}.{label}.rmse_m" in p for p in check_printed_columns(altered, corpus)), (
                block,
                label,
            )
    altered = copy.deepcopy(benchmark)
    altered["published_reproduction"]["published_holdout_arms"]["null"]["r2_identity"] += 0.001
    assert any("null.r2_identity" in p for p in check_printed_columns(altered, corpus))


# ---------------------------------------------------------------------------------------------
# 5. The variant curves of the Akdaglar case (notebook 06-01) against a recomputation
# ---------------------------------------------------------------------------------------------


def check_variant_curves(artifact: dict, corpus: list) -> list[str]:
    case = get_case("real-akdaglar")
    blasts = blasts_for_case(case)
    arms = {
        "kuznetsov": bf.Kuznetsov(dict(bf.SITE_ROCK_FACTOR)),
        "published-regression": bf.PublishedRegression(),
        "xgboost": bf.default_arms()["xgboost"]().fit([b for b in corpus if b.site != case.site]),
    }
    problems = []
    for name, arm in arms.items():
        for variant in case.variants:
            sizes = []
            for blast in blasts:
                perturbed = apply_variant(blast, variant)
                if is_degenerate(perturbed) is not None:
                    continue
                prediction = arm.predict_one(perturbed)
                if prediction.x50_m is not None:
                    sizes.append(prediction.x50_m)
            live = sum(sizes) / len(sizes)
            committed = artifact["variant_curves"][name].get(variant.id)
            relative = FITTED if name == "xgboost" else EXACT
            if _differs(live, committed, relative):
                problems.append(f"{name}.{variant.id}: live {live!r}, committed {committed!r}")
    return problems


def test_the_akdaglar_variant_curves_equal_a_recomputation(corpus):
    assert check_variant_curves(_read("real-akdaglar/case.json"), corpus) == []


def test_the_variant_curve_check_fails_on_an_altered_artifact(corpus):
    for name in ("kuznetsov", "published-regression", "xgboost"):
        altered = copy.deepcopy(_read("real-akdaglar/case.json"))
        altered["variant_curves"][name]["burden-tight"] += 0.001
        assert any(f"{name}.burden-tight" in p for p in check_variant_curves(altered, corpus)), name
