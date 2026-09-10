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
# Scores and honesty
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
    assert sweep["n_seeds"] >= 12
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
