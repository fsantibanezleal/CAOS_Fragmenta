"""The pipeline: every stage real, every control firing, and no silent hole in the matrix.

These tests run against the COMMITTED artifacts rather than re-baking, because that is what the web
actually reads. A test that passes against a fresh in-memory bake and not against what shipped is
testing the wrong object.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))
# The reproducibility check is a script a developer runs by hand as well as a gate. The test imports
# the same code rather than restating it, so the two cannot drift apart.
sys.path.insert(0, str(ROOT / "scripts"))

import blastfrag as bf  # noqa: E402
from pipeline.registry import get_case, list_cases  # noqa: E402
from pipeline.stages import export, validate  # noqa: E402

DERIVED = ROOT / "data" / "derived"


@pytest.fixture(scope="module")
def index():
    return json.loads((DERIVED / "manifests" / "index.json").read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def artifacts(index):
    return {
        entry["case_id"]: json.loads((DERIVED / entry["artifact_path"]).read_text(encoding="utf-8"))
        for entry in index["cases"]
    }


@pytest.fixture(scope="module")
def benchmark():
    return json.loads((DERIVED / "benchmark.json").read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------------------------
# The release gate
# ---------------------------------------------------------------------------------------------

def test_the_committed_bake_passes_its_own_release_gate():
    report = validate.run(DERIVED)
    assert report.ok, report.problems


def test_every_artifact_digest_matches_its_content(artifacts):
    """An artifact edited by hand would pass every other test and be wrong."""
    for case_id, payload in artifacts.items():
        copy = dict(payload)
        stored = copy.pop("digest")
        assert stored == export.digest(copy), case_id


def test_the_bake_was_made_from_the_installed_corpus(index):
    assert index["corpus_digest"] == bf.datasets.DATASET_DIGEST


def test_the_release_gate_rejects_an_edited_benchmark(tmp_path):
    """The benchmark is the file the verdict comes from; until 0.05.000 the gate never read it.

    The check runs on a copy, so the test cannot rewrite the artifact it is checking.
    """
    import shutil

    shutil.copytree(DERIVED, tmp_path / "derived")
    path = tmp_path / "derived" / "benchmark.json"
    text = path.read_text(encoding="utf-8")
    assert '"n_boot": 2000' in text
    path.write_text(text.replace('"n_boot": 2000', '"n_boot": 2001'), encoding="utf-8", newline="")
    report = validate.run(tmp_path / "derived")
    assert not report.ok
    assert any(p.startswith("benchmark: content digest") for p in report.problems)


# ---------------------------------------------------------------------------------------------
# The case matrix
# ---------------------------------------------------------------------------------------------

def test_sixteen_cases_across_six_categories(index):
    assert index["n_cases"] == 16
    categories = {entry["category"] for entry in index["cases"]}
    assert categories == {
        "real-campaign",
        "extrapolation-control",
        "parameter-sweep",
        "structural-control",
        "negative-control",
        "positive-control",
    }


def test_every_case_carries_at_least_six_variants(artifacts):
    for case_id, payload in artifacts.items():
        assert len(payload["variants"]) >= 6, case_id


def test_every_case_states_why_it_is_in_the_matrix(artifacts):
    """A case without a scientific reason is padding, so the reason is a required field."""
    for case_id, payload in artifacts.items():
        for language in ("en", "es"):
            reason = payload["case"]["reason"][language]
            assert len(reason) > 80, f"{case_id}: the {language} reason is too thin to be one"


def test_every_case_is_bilingual(artifacts):
    for case_id, payload in artifacts.items():
        assert payload["case"]["title"]["en"] and payload["case"]["title"]["es"], case_id
        for variant in payload["variants"]:
            assert variant["label"]["en"] and variant["label"]["es"], case_id


def test_the_method_by_case_matrix_has_no_holes(artifacts):
    """Every arm appears on every case, either with a number or with a refusal."""
    arms_per_case = {case_id: set(p["predictions"]) for case_id, p in artifacts.items()}
    expected = set.union(*arms_per_case.values())
    assert len(expected) >= 12, f"only {len(expected)} arms shipped: {sorted(expected)}"
    for case_id, arms in arms_per_case.items():
        assert arms == expected, f"{case_id} is missing {sorted(expected - arms)}"


def test_every_prediction_cell_has_a_value_or_a_reason(artifacts):
    for case_id, payload in artifacts.items():
        for arm, row in payload["predictions"].items():
            for blast_id, cell in row.items():
                if cell["x50_m"] is None:
                    assert cell["reason"], f"{case_id}/{arm}/{blast_id} refused without saying why"
                else:
                    assert not cell["abstained"], f"{case_id}/{arm}/{blast_id}"


# ---------------------------------------------------------------------------------------------
# The controls, which are the reason to believe anything else
# ---------------------------------------------------------------------------------------------

def test_the_geometry_negative_control_fires_and_passes(artifacts):
    """Six blasts whose absolute scale is unpublished. No arm that needs a volume may answer."""
    control = artifacts["real-miami"]["controls"]["geometry_negative_control"]
    assert control["n_without_geometry"] == 6
    assert control["n_answered_anyway"] == 0
    assert control["passed"] is True

    for arm in ("kuznetsov", "kuz-ram", "swebrec", "crush-zone"):
        row = artifacts["real-miami"]["predictions"][arm]
        assert all(cell["x50_m"] is None for cell in row.values()), arm
        assert all("hole diameter" in cell["reason"] for cell in row.values()), arm


def test_the_degenerate_negative_control_is_refused_by_every_arm(artifacts):
    """A hole with no charge column is not a blast, and EVERY arm must say so."""
    payload = artifacts["ctrl-degenerate"]
    control = payload["controls"]["degenerate_negative_control"]
    assert control["n_degenerate"] == 6
    assert control["n_answered_anyway"] == 0
    assert control["answered_by"] == []

    for arm, row in payload["predictions"].items():
        assert all(cell["x50_m"] is None for cell in row.values()), arm
        assert all("not a blast" in cell["reason"] for cell in row.values()), arm


def test_the_positive_control_recovers_its_own_truth_exactly(artifacts):
    control = artifacts["ctrl-oracle"]["controls"]["positive_control"]
    assert control["n_checked"] == 8
    assert control["max_abs_error_m"] < 1e-9
    assert control["passed"] is True


# ---------------------------------------------------------------------------------------------
# The synthetic cases are not circular (docs/design/features/non-circularity/)
# ---------------------------------------------------------------------------------------------

SYNTHETIC_DESIGNS = ("synth-sweep-burden", "synth-sweep-powder", "synth-ibsd-capped", "ctrl-degenerate")


def test_no_synthetic_design_carries_a_measured_size_or_a_score(artifacts):
    for case_id in SYNTHETIC_DESIGNS:
        payload = artifacts[case_id]
        assert payload["case"]["real_or_synthetic"] == "synthetic", case_id
        assert all(b["x50_measured_m"] is None for b in payload["blasts"]), case_id
        assert not any(score["scoreable"] for score in payload["scores"].values()), case_id


def test_no_synthetic_blast_enters_the_benchmark(benchmark):
    corpus_ids = {b.blast_id for b in bf.load_training_corpus()}
    assert {row["blast_id"] for row in benchmark["corpus_rows"]} == corpus_ids
    held_out = benchmark["protocols"]["leave-one-site-out"]["arms"]
    assert all(set(arm["predictions"]) <= corpus_ids for arm in held_out.values())


def test_the_synthetic_designs_do_not_depend_on_any_arm(monkeypatch):
    """Rebuild every synthetic design with every arm's prediction disabled: none may need one."""
    from pipeline.model.blasts import synthetic_sweep

    def snapshot():
        return {
            case_id: [(b.blast_id, b.features(), b.x50_m) for b in synthetic_sweep(get_case(case_id))]
            for case_id in SYNTHETIC_DESIGNS
        }

    before = snapshot()

    def refuse(*_args, **_kwargs):
        raise AssertionError("a synthetic design asked an arm for a prediction")

    def subclasses(cls):
        for sub in cls.__subclasses__():
            yield sub
            yield from subclasses(sub)

    import blastfrag.learned  # noqa: F401  (registers the learned arms as subclasses)

    for arm_class in [bf.Arm, *subclasses(bf.Arm)]:
        monkeypatch.setattr(arm_class, "predict_one", refuse, raising=False)
        monkeypatch.setattr(arm_class, "predict", refuse, raising=False)
    assert snapshot() == before
    assert all(x50 is None for rows in before.values() for _id, _features, x50 in rows)


def test_the_positive_control_is_circular_by_design_and_says_so(artifacts):
    from pipeline.model.blasts import oracle_truth

    truth = oracle_truth()
    assert len(truth) == 8
    regression = bf.PublishedRegression()
    assert all(b.x50_m == regression.predict_one(b).x50_m and b.meta["oracle"] for b in truth)
    case = get_case("ctrl-oracle")
    assert case.category == "positive-control"
    assert "tests the harness rather than the science" in case.reason_en
    assert "Prueba el andamiaje, no la ciencia" in case.reason_es
    assert artifacts["ctrl-oracle"]["controls"]["positive_control"]["passed"] is True


def test_the_extrapolation_control_stamps_every_prediction(artifacts):
    control = artifacts["real-granite-ne"]["controls"]["extrapolation_control"]
    assert control["n_predictions"] > 20
    assert control["n_unstamped"] == 0

    payload = artifacts["real-granite-ne"]
    answered = [
        cell for row in payload["predictions"].values() for cell in row.values() if cell["x50_m"] is not None
    ]
    assert answered, "nothing answered, so the stamp check proves nothing"
    assert all(cell["extrapolated"] for cell in answered)


def test_a_control_that_never_fires_would_be_caught():
    """The controls must be attached to the cases that can trigger them, not to all of them.

    A control block on every case would look thorough and mean nothing.
    """
    cases = {c.id: c for c in list_cases()}
    assert cases["real-miami"].category == "negative-control"
    assert cases["ctrl-degenerate"].category == "negative-control"
    assert cases["ctrl-oracle"].category == "positive-control"
    assert cases["real-granite-ne"].category == "extrapolation-control"


# ---------------------------------------------------------------------------------------------
# Leakage
# ---------------------------------------------------------------------------------------------

def test_every_real_campaign_withheld_its_own_site_from_the_learned_arms(index, artifacts):
    """The single most important provenance field on this product.

    A learned prediction shown for a campaign must have been made by a model that never saw that
    campaign, or the App is showing a memory rather than a prediction.
    """
    checked = 0
    for entry in index["cases"]:
        if entry["category"] != "real-campaign":
            continue
        provenance = artifacts[entry["case_id"]]["provenance"]
        assert provenance["held_out_site"] == entry["site"], entry["case_id"]
        assert provenance["n_training_rows"] < 97, entry["case_id"]
        assert entry["site"] in provenance["leakage_note"]
        checked += 1
    assert checked == 9


def test_a_case_that_is_not_in_the_corpus_withholds_nothing_and_says_so(artifacts):
    for case_id in ("real-granite-ne", "synth-sweep-burden", "ctrl-oracle"):
        provenance = artifacts[case_id]["provenance"]
        assert provenance["held_out_site"] is None, case_id
        assert "nothing was withheld" in provenance["leakage_note"], case_id


def test_the_leakage_assertion_actually_fails_when_violated():
    """The guard must fail on a violation, or it is decoration."""
    from pipeline.stages import train

    case = get_case("real-murgul")
    trained = train.run(case, seed=0)
    corpus = bf.load_training_corpus()
    murgul = [b for b in corpus if b.site == "Murgul"]
    with pytest.raises(AssertionError, match="are in its training rows"):
        # Pretend the case's blasts are ones the model DID see, which is the failure being guarded.
        train.leakage_assertions(case, trained, [b for b in corpus if b.site != "Murgul"][:3])
    train.leakage_assertions(case, trained, murgul)


# ---------------------------------------------------------------------------------------------
# The geometry, asserted at bake time
# ---------------------------------------------------------------------------------------------

def test_the_geometry_report_is_baked_for_every_real_campaign(index, artifacts):
    for entry in index["cases"]:
        if entry["category"] != "real-campaign":
            continue
        report = artifacts[entry["case_id"]]["geometry_report"]
        assert report, entry["case_id"]
        checks = [c for site in report.values() for c in site["checks"]]
        assert all(c["ok"] for c in checks), entry["case_id"]


def test_murgul_carries_its_three_reproduced_constraints(artifacts):
    report = artifacts["real-murgul"]["geometry_report"]["Murgul"]
    quantities = {c["quantity"] for c in report["checks"]}
    assert quantities == {"bench_height_m", "burden_m", "spacing_m"}
    assert all(c["ok"] for c in report["checks"])


def test_every_reconstructable_blast_carries_its_absolute_pattern(artifacts):
    for case_id, payload in artifacts.items():
        for blast in payload["blasts"]:
            if blast["has_geometry"]:
                pattern = blast["pattern"]
                assert pattern["rock_volume_m3"] > 0, f"{case_id}/{blast['blast_id']}"
                assert pattern["charge_mass_kg"] > 0, f"{case_id}/{blast['blast_id']}"
            else:
                assert blast.get("geometry_reason"), f"{case_id}/{blast['blast_id']}"


# ---------------------------------------------------------------------------------------------
# Scores and the statistics they name
# ---------------------------------------------------------------------------------------------

def test_no_score_block_reports_a_bare_variance_figure(artifacts):
    """Both statistics, always, each under its own name."""
    for case_id, payload in artifacts.items():
        for arm, block in payload["scores"].items():
            if not block.get("scoreable"):
                continue
            assert "pearson_r2" in block and "r2_identity" in block, f"{case_id}/{arm}"


def test_every_scoreable_case_carries_a_null_model(artifacts):
    for case_id, payload in artifacts.items():
        scoreable = [b for b in payload["blasts"] if b["x50_measured_m"] is not None]
        if len(scoreable) >= 2:
            assert "null" in payload["scores"], case_id


def test_a_case_with_no_measurements_says_so_rather_than_scoring_zero(artifacts):
    """A design study is not a model failure, and a zero-shaped metric block would read as one."""
    payload = artifacts["synth-sweep-burden"]
    assert all(b["x50_measured_m"] is None for b in payload["blasts"])
    for arm, block in payload["scores"].items():
        assert block["scoreable"] is False
        assert "no measured fragment sizes" in block["reason"]


def test_the_variant_curves_move_in_the_physically_correct_direction(artifacts):
    """A higher powder factor must predict finer rock. If it does not, a sign is wrong somewhere."""
    curves = artifacts["real-murgul"]["variant_curves"]["published-regression"]
    assert curves["powder-up"] < curves["base"] < curves["powder-down"]
    # And a wider burden must predict coarser rock.
    assert curves["burden-tight"] < curves["base"] < curves["burden-wide"]


def test_the_distribution_arms_ship_a_full_curve_for_the_representative_blast(artifacts):
    payload = artifacts["real-murgul"]
    assert payload["representative_blast_id"]
    for arm in ("kuz-ram", "swebrec", "crush-zone"):
        distribution = payload["distributions"][arm]
        assert len(distribution["sizes_m"]) > 100
        passing = distribution["passing"]
        assert all(b >= a - 1e-9 for a, b in zip(passing, passing[1:])), arm
        assert passing[-1] > 0.95, arm
        assert distribution["p20_m"] < distribution["x50_m"] < distribution["p80_m"], arm


def test_swebrec_predicts_a_heavier_fines_tail_than_rosin_rammler(artifacts):
    """The reason the three-parameter form exists, visible on a shipped curve.

    At the finest sieve on the grid, 0.1 mm, the classical two-parameter distribution passes
    essentially nothing while Swebrec passes about 6 percent. That is the function doing what it was
    introduced to do, not a defect.

    It is also a reminder of a limit stated on the method card: the undulation parameter is a FITTED
    quantity in the literature and there is no published fit for it on this corpus, so the value used
    here is a caller default. How much dust Swebrec predicts is therefore a choice, and the product
    says so rather than presenting 6 percent as a measurement.
    """
    distributions = artifacts["real-murgul"]["distributions"]
    finest_classical = distributions["kuz-ram"]["passing"][0]
    finest_swebrec = distributions["swebrec"]["passing"][0]
    assert finest_classical < 1e-3
    assert finest_swebrec > 10 * max(finest_classical, 1e-6)


def test_the_crush_zone_adds_fines_to_the_classical_curve(artifacts):
    """Its whole purpose: the classical model's best-documented failure is under-predicting fines."""
    distributions = artifacts["real-murgul"]["distributions"]
    sizes = distributions["kuz-ram"]["sizes_m"]
    fine_index = next(i for i, s in enumerate(sizes) if s >= 0.005)
    assert (
        distributions["crush-zone"]["passing"][fine_index]
        > distributions["kuz-ram"]["passing"][fine_index]
    )


def test_the_crush_zone_says_its_constants_are_not_published(artifacts):
    assert artifacts["real-murgul"]["distributions"]["crush-zone"]["constants_published"] is False
    assert artifacts["real-murgul"]["distributions"]["kuz-ram"]["constants_published"] is True


# ---------------------------------------------------------------------------------------------
# The benchmark artifact
# ---------------------------------------------------------------------------------------------

def test_the_benchmark_carries_the_verdict_and_the_criterion(benchmark):
    assert "positive" in benchmark["kill_criterion"]
    # The top-level fields are the all-blasts support, the row set the criterion was first applied to.
    assert benchmark["verdict"]["generalises_across_sites"] is False
    assert benchmark["verdict"]["n_learned_arms_positive"] == 0


def test_the_benchmark_reports_all_three_protocols(benchmark):
    assert set(benchmark["protocols"]) == {"random-8020", "dedup-random", "leave-one-site-out"}
    assert benchmark["protocols"]["leave-one-site-out"]["n_folds"] == 10


def test_the_published_reproduction_gain_is_baked(benchmark):
    for label in ("2010", "2012"):
        block = benchmark["published_reproduction"][label]
        assert block["gain_in_r2_identity"] > 0.10


def test_the_seed_sweep_is_baked_with_its_range(benchmark):
    sweep = benchmark["network_seed_sweep"]
    # Thirty: the width the engine's own test pins, so the page and the package quote one run.
    assert sweep["n_seeds"] == 30
    assert sweep["published_above_every_seed"] is True
    assert sweep["min"] < sweep["median"] < sweep["max"] < sweep["published"]


def test_the_benchmark_names_the_sites_and_their_sizes(benchmark):
    """One quarry supplies 22 of 97 rows, which is why the protocol matters. It is on the artifact."""
    assert len(benchmark["sites"]) == 10
    assert benchmark["site_counts"]["Akdaglar"] == 22
    assert sum(benchmark["site_counts"].values()) == 97


def test_the_duplicate_groups_are_baked(benchmark):
    groups = benchmark["duplicate_groups"]
    assert len(groups) == 7
    assert sum(len(g) for g in groups) == 17


def test_the_random_protocols_are_baked_as_a_spread_not_a_draw(benchmark):
    """0.04.x baked one 19-row draw per random protocol and two page claims rested on it."""
    assert benchmark["n_repeats"] == 100
    for protocol in ("random-8020", "dedup-random"):
        block = benchmark["protocols"][protocol]
        assert block["repeated"] is True and block["n_folds"] == 100
        forest = block["arms"]["random-forest"]
        assert len(forest["draws"]) == 100
        assert forest["r2_identity"] == forest["repeats"]["median"]
        assert forest["repeats"]["p05"] < forest["repeats"]["median"] < forest["repeats"]["p95"]
    kuznetsov = benchmark["protocols"]["random-8020"]["arms"]["kuznetsov"]
    held_out = benchmark["protocols"]["leave-one-site-out"]["arms"]["kuznetsov"]["r2_identity"]
    assert abs(kuznetsov["r2_identity"] - held_out) < 0.02


def test_every_site_held_out_score_carries_both_supports_and_an_interval(benchmark):
    for arm, block in benchmark["protocols"]["leave-one-site-out"]["arms"].items():
        if arm in {"group-discriminant"}:
            continue
        for support in ("all", "geometry"):
            entry = block["supports"][support]
            assert entry["interval_95"] is None or entry["interval_95"][0] <= entry["interval_95"][1]
        assert set(block["per_site"]) == set(benchmark["sites"])
        assert len(block["predictions"]) == 97


def test_the_verdict_reports_that_it_depends_on_the_row_set(benchmark):
    verdict = benchmark["verdict"]
    assert verdict["depends_on_support"] is True
    assert verdict["supports"]["all"]["generalises_across_sites"] is False
    assert verdict["supports"]["geometry"]["generalises_across_sites"] is True
    assert verdict["sites_outside_geometry_support"] == ["Miami"]
    assert verdict["arms_with_interval_above_zero"] == []
    assert [row[0] for row in verdict["in_sample_arms"]] == ["published-regression"]
    assert "published-regression" not in dict(verdict["arms_with_positive_variance_explained_across_sites"])


# ---------------------------------------------------------------------------------------------
# Schema v3, the engine's 0.4.0 (docs/design/features/benchmark-0-4/)
# ---------------------------------------------------------------------------------------------

def test_the_capped_arm_is_benchmarked_with_its_declared_provenance(benchmark):
    provenance = benchmark["provenance"]["kuznetsov-capped"]
    assert provenance["declared_not_published"] is True and provenance["caps"] == "kuznetsov"
    assert provenance["uses_site_constant"] is True
    assert all("kuznetsov-capped" in p["arms"] for p in benchmark["protocols"].values())
    held_out = benchmark["protocols"]["leave-one-site-out"]["arms"]
    capped, classical = held_out["kuznetsov-capped"], held_out["kuznetsov"]
    moved = sorted(b for b, v in capped["predictions"].items() if v != classical["predictions"][b])
    assert moved == ["Rc1", "Rc2", "Rc3"]
    assert capped["r2_identity"] > classical["r2_identity"]


def test_every_arm_carries_its_common_support_score(benchmark):
    n = benchmark["n_repeats"]
    for name, protocol in benchmark["protocols"].items():
        for arm, block in protocol["arms"].items():
            common = block["common"]
            assert "group-discriminant" not in common["arms"] and "kuznetsov" in common["arms"], (name, arm)
            if protocol["repeated"]:
                assert len(common["draws_r2_identity"]) == n and common["n_rows"]["n"] == n, (name, arm)
            else:
                assert common["n_rows"] == 79 and common["n_sites"] == 9, arm
    # Reported beside the declared row sets, never deciding the verdict.
    assert set(benchmark["verdict"]["supports"]) == {"all", "geometry"}


def test_the_width_sweep_is_baked_beside_the_published_widths(benchmark):
    sweep = benchmark["network_width_sweep"]
    assert sweep["widths"] == list(range(6, 16)) and sweep["n_simulations"] == 8
    assert sweep["published_widths"] == {"1": 9, "2": 7}
    for group, entry in sweep["published_protocol"].items():
        assert entry["published_optimum"] == {"1": 9, "2": 7}[group]
        assert entry["best_hidden"] in sweep["widths"] and len(entry["table"]) == 10
    rows = sweep["leave_one_site_out"]
    published = [row for row in rows if row["published"]]
    assert len(rows) == 11 and len(published) == 1 and published[0]["hidden"] == {"1": 9, "2": 7}
    # The published pair is the network as the benchmark runs it, so the two agree.
    network = benchmark["protocols"]["leave-one-site-out"]["arms"]["published-neural-net"]
    assert published[0]["supports"]["all"]["r2_identity"] == pytest.approx(network["r2_identity"], abs=1e-9)


def test_the_bake_pins_blas_to_one_thread():
    """Set in run.py before numpy is imported, and in effect: the prefix alone leaves numpy on one thread."""
    import os
    import subprocess

    source = (ROOT / "data-pipeline" / "run.py").read_text(encoding="utf-8")
    prefix = source.split("\nimport argparse")[0]
    probe = prefix + (
        "\nimport numpy, threadpoolctl"
        "\nprint(max(p['num_threads'] for p in threadpoolctl.threadpool_info()))\n"
    )
    pinned = {"OPENBLAS_NUM_THREADS", "OMP_NUM_THREADS", "MKL_NUM_THREADS"}
    env = {k: v for k, v in os.environ.items() if k not in pinned}
    out = subprocess.run([sys.executable, "-c", probe], capture_output=True, text=True, env=env, check=True)
    assert out.stdout.strip() == "1", out.stdout + out.stderr


def test_the_transfer_rung_is_benchmarked_and_reported_per_case(benchmark, artifacts):
    transfer = benchmark["protocols"]["leave-one-site-out"]["arms"]["kuznetsov-transfer"]
    assert transfer["r2_identity"] > 0.25
    fit = benchmark["diagnostics"]["transfer_fit"]
    assert fit["slope"] > 0 and len(fit["fit_sites"]) == 9
    for case_id, artifact in artifacts.items():
        assert "kuznetsov-transfer" in artifact["predictions"], case_id


def test_the_site_metadata_states_measurement_only_where_the_source_does(benchmark):
    meta = benchmark["site_meta"]
    assert meta["Akdaglar"]["measurement"].startswith("Wipfrag")
    assert meta["Murgul"]["measurement"] is None
    assert meta["Miami"]["hole_diameter_mm"] is None
    # The modulus is a site constant in this corpus, which the docs rely on.
    assert all(len(entry["E_GPa"]) == 1 for entry in meta.values())


def test_the_diagnostics_are_baked_and_report_without_filtering(benchmark):
    diagnostics = benchmark["diagnostics"]
    assert diagnostics["outliers"]["applied_as_filter"] is False
    assert len(diagnostics["outliers"]["flagged"]) == 5
    rf = diagnostics["native_importance"]["random-forest"]["values"]
    assert max(rf, key=rf.get) == "E_GPa"
    for name, report in diagnostics["resampling_importance"].items():
        shares = [v for v in report["share"].values() if v is not None]
        assert abs(sum(shares) - 1.0) < 1e-9, name


# ---------------------------------------------------------------------------------------------
# The fitted models the browser runs
# ---------------------------------------------------------------------------------------------

@pytest.fixture(scope="module")
def model_files(index):
    return {
        entry["scope"]: json.loads((DERIVED / entry["path"]).read_text(encoding="utf-8"))
        for entry in index["models"]
    }


def _resolve(document: dict, arms: dict) -> dict:
    """Undo the by-reference storage of the stacked model's base learners."""
    if document["kind"] != "stacking":
        return document
    forest, boosting = arms[document["forest"]["ref"]], arms[document["boosting"]["ref"]]
    return document | {
        "forest": {"trees": forest["trees"]},
        "boosting": {"base_score": boosting["base_score"], "trees": boosting["trees"]},
    }


def test_there_is_one_model_file_per_campaign_plus_the_corpus(index, model_files):
    assert set(model_files) == {b.site for b in bf.load_training_corpus()} | {"corpus"}
    for scope, payload in model_files.items():
        if scope == "corpus":
            assert payload["held_out_site"] is None and payload["n_training_rows"] == 97
        else:
            assert payload["held_out_site"] == scope
            assert payload["n_training_rows"] == 97 - sum(
                1 for b in bf.load_training_corpus() if b.site == scope
            )


def test_every_case_points_at_the_model_file_of_its_own_training_scope(artifacts, model_files):
    for case_id, artifact in artifacts.items():
        live = artifact["live_models"]
        held_out = artifact["provenance"]["held_out_site"]
        assert live["scope"] == (held_out or "corpus"), case_id
        assert live["digest"] == model_files[live["scope"]]["digest"]


def test_the_portable_models_reproduce_the_fitted_models_at_every_fixture(model_files):
    """The fixtures are the ORIGINAL fitted models' predictions; the reference reader must match them.

    The TypeScript walker is held to the same fixtures in the frontend tests, so a port cannot agree
    with the reader and still drift from the model.
    """
    for scope, payload in model_files.items():
        arms = payload["arms"]
        inputs = payload["fixtures"]["inputs"]
        for name, expected in payload["fixtures"]["expected"].items():
            document = _resolve(arms[name], arms)
            for row, value in zip(inputs, expected):
                got, _ = bf.predict_portable(document, row["features"])
                if value is None:
                    assert got is None, (scope, name, row["blast_id"])
                    continue
                exact = {"forest", "xgboost", "stacking", "power-law"}
                tolerance = 0.0 if document["kind"] in exact else 1e-12
                assert abs(got - value) <= tolerance * abs(value), (scope, name, row["blast_id"], got, value)


def test_the_case_predictions_are_what_the_shipped_models_return(artifacts, model_files):
    """What the App replays and what it computes live are the same model, to the replay's rounding."""
    checked = 0
    for case_id, artifact in artifacts.items():
        payload = model_files[artifact["live_models"]["scope"]]
        arms = payload["arms"]
        for name in ("random-forest", "xgboost", "published-neural-net", "svr-rbf"):
            if name not in arms:
                continue
            document = _resolve(arms[name], arms)
            for blast in artifact["blasts"]:
                cell = artifact["predictions"][name][blast["blast_id"]]
                if cell["x50_m"] is None or blast.get("degenerate_reason"):
                    continue
                features = [blast["features"][f] for f in bf.FEATURES]
                got, _ = bf.predict_portable(document, features)
                where = (case_id, name, blast["blast_id"])
                assert got is not None and abs(got - cell["x50_m"]) <= 5e-7, where
                checked += 1
    assert checked > 300


# ---------------------------------------------------------------------------------------------
# Determinism
# ---------------------------------------------------------------------------------------------

def test_rebaking_the_same_case_twice_here_is_byte_identical(tmp_path):
    """Within one environment the bake is a pure function of the registry, the seed and the pins.

    This is the half of reproducibility a hash can answer. If it ever fails, the pipeline is reading
    a wall clock, iterating a set, or stopping on a time limit.

    Written to a sandbox, never to the canonical tree, because a test that can overwrite the shipped
    artifacts can silently make itself pass.
    """
    from pipeline.pipeline import bake_case

    case = get_case("real-murgul")
    first = bake_case(case, seed=0, root=tmp_path / "a")
    second = bake_case(case, seed=0, root=tmp_path / "b")
    assert first.digest == second.digest
    assert (tmp_path / "a" / "real-murgul" / "case.json").read_bytes() == (
        tmp_path / "b" / "real-murgul" / "case.json"
    ).read_bytes()


def test_rebaking_reproduces_the_committed_numbers_to_tolerance(artifacts, tmp_path):
    """Across environments the artifact reproduces to a numeric tolerance, not to a hash.

    A content address is a discrete answer to a continuous question. Two builds of the same pinned
    numpy reduce a dot product in a different order and the last bits differ. Measured between
    Windows and Linux runners on identical pins, over all sixteen cases: the worst difference is
    2.7e-08 relative, most of it on the fitted arms, and the one case where every arm abstains comes
    out byte-identical.

    Asserting equal hashes here would therefore assert something false. Asserting nothing would let
    a changed model through. The tolerance sits between the two, five orders below the percent-scale
    move a different model would make and two orders above the measured floating-point noise.

    Written to a sandbox, for the same reason as the test above.
    """
    from compare_bakes import RELATIVE_TOLERANCE, compare
    from pipeline.pipeline import bake_case

    case = get_case("real-murgul")
    bake_case(case, seed=0, root=tmp_path)
    baked = json.loads((tmp_path / "real-murgul" / "case.json").read_text(encoding="utf-8"))

    committed = dict(artifacts["real-murgul"])
    baked.pop("digest", None)
    committed.pop("digest", None)

    problems, numeric = compare(baked, committed)
    assert not problems, problems
    worst = numeric[0] if numeric else None
    assert worst is None or worst[0] <= RELATIVE_TOLERANCE, (
        f"{worst[1]} re-baked as {worst[2]!r} against the committed {worst[3]!r}, "
        f"a relative difference of {worst[0]:.3e}. That is far above floating-point noise, so this "
        "is a different model rather than a different machine."
    )
    assert (DERIVED / "real-murgul" / "case.json").stat().st_size > 0
