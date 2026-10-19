"""Plants for the pipeline features: bake-and-cases (BK), benchmark-0-4 (EN), benchmark-artifact (BA) and
non-circularity (NC), one planted defect per requirement (template 0.08.002 guard check 4, ADR-0075).

Each requirement's test plants the defect its requirement forbids in a throwaway copy of the committed documents or of the
pipeline's source, runs the requirement's OWN gate on the copy (the named test of ``tests/test_pipeline.py`` or
``tests/test_guards.py``, run as a pytest subprocess whose ROOT is the copy, or the release gate script
``scripts/check_artifacts.py``) and asserts that the gate fails AND that its failure text names what was planted. The clean
copy passes every one of these gates (``test_every_pipeline_gate_passes_on_the_clean_copy``), so a failure is the plant's.

Cost (ADR-0074): a gate is a pytest subprocess that imports the engine (0.5 s), so the plants that cannot disturb one
another's gates share a copy and one run, and each test asserts its own gates in that run (the ``batch`` world: documents
read by disjoint gates; the ``apart`` world: the plants in source files; the ``digest`` world: the two plants that keep a
file's size). A plant is chosen so that no other plant of its world changes what its gates read, and each test requires the
failure text of its gate to name its own plant, so a gate that failed for another plant's sake fails the test. The plants
that re-bake (BK-013) run alone.

A plant that needs the engine (numpy, blastfrag) skips where it is absent, as the CI checks job does: a precondition, never
a bake. No plant bakes: the two that re-bake (BK-013) re-bake one case into the sandbox, as the gate does. The two
frontend gates (EN-002, EN-003) need node and ``npm ci`` and are local-only; the browser gate (EN-008) also needs a
Playwright browser and a build, and is local-only.

Every JSON plant rewrites a parsed document, so a plant never depends on the formatting of the baked files; a plant that
plants nothing fails its own assertion, never passes quietly."""
from __future__ import annotations

import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

import pytest
from planting import edit, guard
from webtools import NODE, NODE_MODULES, SHELL_INSTALLED, link_node_modules, unlink_node_modules

# The engine and numpy are pinned (requirements-precompute.txt) but CI's checks job installs only pytest: there the module is a
# precondition skip, never a bake; locally every test below runs.
pytest.importorskip("blastfrag")
needs_node = pytest.mark.skipif(
    NODE is None or not SHELL_INSTALLED or not (NODE_MODULES / "tsx").is_dir(),
    reason="local-only: needs node and `npm ci` in frontend/",
)

PIPELINE = "tests/test_pipeline.py::"
GUARDS = "tests/test_guards.py::"
DERIVED = "data/derived"
INDEX = f"{DERIVED}/manifests/index.json"
BENCHMARK = f"{DERIVED}/benchmark.json"
REGISTRY = "data-pipeline/pipeline/cases/fragmenta_cases.py"

# every pytest gate the four features name, by requirement (the heavy ones are marked HEAVY: they train or re-bake)
GATES: dict[str, tuple[str, ...]] = {
    "BK-001": (PIPELINE + "test_the_committed_bake_passes_its_own_release_gate", PIPELINE + "test_every_artifact_digest_matches_its_content"),
    "BK-002": (PIPELINE + "test_the_release_gate_rejects_an_edited_benchmark",),
    "BK-003": (PIPELINE + "test_the_bake_was_made_from_the_installed_corpus",),
    "BK-004": (PIPELINE + "test_sixteen_cases_across_six_categories", PIPELINE + "test_every_case_is_bilingual",
               PIPELINE + "test_every_case_states_why_it_is_in_the_matrix", PIPELINE + "test_every_case_carries_at_least_six_variants"),
    "BK-005": (PIPELINE + "test_the_method_by_case_matrix_has_no_holes", PIPELINE + "test_every_prediction_cell_has_a_value_or_a_reason"),
    "BK-006": (PIPELINE + "test_the_geometry_negative_control_fires_and_passes", PIPELINE + "test_the_degenerate_negative_control_is_refused_by_every_arm",
               PIPELINE + "test_the_positive_control_recovers_its_own_truth_exactly", PIPELINE + "test_the_extrapolation_control_stamps_every_prediction"),
    "BK-007": (PIPELINE + "test_a_control_that_never_fires_would_be_caught",),
    "BK-008": (PIPELINE + "test_every_real_campaign_withheld_its_own_site_from_the_learned_arms", PIPELINE + "test_the_leakage_assertion_actually_fails_when_violated"),
    "BK-009": (PIPELINE + "test_the_geometry_report_is_baked_for_every_real_campaign", PIPELINE + "test_every_reconstructable_blast_carries_its_absolute_pattern"),
    "BK-010": (PIPELINE + "test_no_score_block_reports_a_bare_variance_figure", PIPELINE + "test_every_scoreable_case_carries_a_null_model"),
    "BK-011": (PIPELINE + "test_a_case_with_no_measurements_says_so_rather_than_scoring_zero",),
    "BK-012": (PIPELINE + "test_the_variant_curves_move_in_the_physically_correct_direction",),
    "BK-013": (PIPELINE + "test_rebaking_the_same_case_twice_here_is_byte_identical", PIPELINE + "test_rebaking_reproduces_the_committed_numbers_to_tolerance"),
    "BK-014": (PIPELINE + "test_there_is_one_model_file_per_campaign_plus_the_corpus", PIPELINE + "test_every_case_points_at_the_model_file_of_its_own_training_scope",
               PIPELINE + "test_the_portable_models_reproduce_the_fitted_models_at_every_fixture"),
    "EN-001": (PIPELINE + "test_the_capped_arm_is_benchmarked_with_its_declared_provenance",),
    "EN-004": (PIPELINE + "test_every_arm_carries_its_common_support_score",),
    "EN-005": (PIPELINE + "test_the_width_sweep_is_baked_beside_the_published_widths",),
    "EN-006": (PIPELINE + "test_the_bake_pins_blas_to_one_thread",),
    "EN-007": (GUARDS + "test_the_results_pages_report_the_cap_common_support_and_the_width_sweep",),
    "BA-001": (PIPELINE + "test_the_benchmark_carries_the_verdict_and_the_criterion",),
    "BA-002": (PIPELINE + "test_the_benchmark_reports_all_three_protocols", PIPELINE + "test_the_random_protocols_are_baked_as_a_spread_not_a_draw"),
    "BA-003": (PIPELINE + "test_every_site_held_out_score_carries_both_supports_and_an_interval",),
    "BA-004": (PIPELINE + "test_the_verdict_reports_that_it_depends_on_the_row_set",),
    "BA-005": (PIPELINE + "test_the_transfer_rung_is_benchmarked_and_reported_per_case",),
    "BA-006": (PIPELINE + "test_the_published_reproduction_gain_is_baked", PIPELINE + "test_the_seed_sweep_is_baked_with_its_range"),
    "BA-007": (PIPELINE + "test_the_benchmark_names_the_sites_and_their_sizes", PIPELINE + "test_the_site_metadata_states_measurement_only_where_the_source_does"),
    "BA-008": (PIPELINE + "test_the_duplicate_groups_are_baked", PIPELINE + "test_the_diagnostics_are_baked_and_report_without_filtering"),
    "BA-009": (PIPELINE + "test_the_case_predictions_are_what_the_shipped_models_return",),
    "NC-001": (PIPELINE + "test_no_synthetic_design_carries_a_measured_size_or_a_score",),
    "NC-002": (PIPELINE + "test_no_synthetic_blast_enters_the_benchmark",),
    "NC-003": (PIPELINE + "test_the_synthetic_designs_do_not_depend_on_any_arm",),
    "NC-004": (PIPELINE + "test_the_positive_control_is_circular_by_design_and_says_so",),
}




# ---------------------------------------------------------------- helpers

def run_gates(repo: Path, *gates: str) -> tuple[dict[str, str], str]:
    """Run the named gates (``file::test``) in the copy, as one pytest subprocess whose ROOT is the copy; return the outcome
    of each (``PASSED``, ``FAILED``, ``ERROR``) and the output. A gate that did not run is an error of the test, never a pass."""
    r = subprocess.run([sys.executable, "-m", "pytest", *gates, "-q", "-rA", "-p", "no:cacheprovider", "--no-header", "--color=no"],
                       capture_output=True, encoding="utf-8", errors="replace", cwd=repo, timeout=300)
    outcomes: dict[str, str] = {}
    for line in r.stdout.splitlines():
        m = re.match(r"(PASSED|FAILED|ERROR) (\S+)", line)
        if m:
            outcomes[m.group(2)] = m.group(1)
    missing = [g for g in gates if g not in outcomes]
    assert not missing, f"the gate never ran: {missing}\n{r.stdout[-1500:]}\n{r.stderr[-500:]}"
    return outcomes, r.stdout


@dataclass
class Run:
    """The gates run once on a planted copy: each gate's outcome and the output they printed."""
    outcomes: dict[str, str]
    out: str

    def failure_of(self, gate: str) -> str:
        """The failure report pytest printed for ``gate`` (its section of the output)."""
        name = gate.split("::")[-1]
        parts = re.split(r"^_+ (\S+) _+$", self.out, flags=re.MULTILINE)
        for header, body in zip(parts[1::2], parts[2::2]):
            if header == name:
                return body
        return ""

    def must_fail(self, gate: str, *says: str) -> None:
        """The gate fails (not errors, not passes) and its failure names what the test planted."""
        assert self.outcomes[gate] == "FAILED", f"{gate} is {self.outcomes[gate]} on the planted copy:\n{self.out[-2000:]}"
        report = self.failure_of(gate)
        assert report, f"no failure report of {gate} in the output:\n{self.out[-2000:]}"
        for text in says:
            assert text in report, f"{gate} failed, but not on {text!r} (another plant's, or a gate that no longer reads it):\n{report[-2500:]}"


def solo(repo: Path, plant: Callable[[Path], None], gate: str, *says: str) -> None:
    """Plant one defect in the copy, run one gate, require its failure to name the plant."""
    plant(repo)
    outcomes, out = run_gates(repo, gate)
    Run(outcomes, out).must_fail(gate, *says)


def load(repo: Path, rel: str) -> dict:
    return json.loads((repo / rel).read_bytes().decode("utf-8"))


def save(repo: Path, rel: str, document: dict) -> None:
    (repo / rel).write_bytes(json.dumps(document, ensure_ascii=False).encode("utf-8"))


def mutate(repo: Path, rel: str, plant: Callable[[dict], None]) -> None:
    """Parse a committed document of the copy, plant a defect in it, write it back."""
    document = load(repo, rel)
    plant(document)
    save(repo, rel, document)


def case_path(case_id: str) -> str:
    return f"{DERIVED}/{case_id}/case.json"


def first_answered(cells: dict) -> str:
    return next(blast_id for blast_id, cell in cells.items() if cell["x50_m"] is not None)


def swap_two_digits(repo: Path, rel: str, after: str) -> None:
    """Swap two adjacent different digits of one number after ``after``: the same length, another content."""
    path = repo / rel
    raw = path.read_bytes()
    start = raw.index(after.encode())
    i = next(k for k in range(start, len(raw) - 2)
             if raw[k:k + 1].isdigit() and raw[k + 1:k + 2].isdigit() and raw[k:k + 1] != raw[k + 1:k + 2])
    path.write_bytes(raw[:i] + raw[i + 1:i + 2] + raw[i:i + 1] + raw[i + 2:])


def planted_copy(base_copy: Path, factory: pytest.TempPathFactory, name: str) -> Path:
    repo = factory.mktemp(name) / "repo"
    shutil.copytree(base_copy, repo)
    return repo


# ---------------------------------------------------------------- the clean copy

HEAVY = {GATES["BK-008"][1], *GATES["BK-013"]}  # they train or re-bake (seconds each): their plants fail with their own text


def test_every_pipeline_gate_passes_on_the_clean_copy(repo: Path) -> None:
    """The baseline of every plant below: the same gates, unplanted, all pass (so a failure is the plant's, not the copy's).
    The three gates that train or re-bake (BK-008's leakage assertion, both BK-013 gates) are the repository's own
    ``pytest -q``; their plants fail with the gate's own message, which the plants' tests require."""
    gates = tuple(g for names in GATES.values() for g in names if g not in HEAVY)
    outcomes, out = run_gates(repo, *gates)
    failing = {g: o for g, o in outcomes.items() if g in gates and o != "PASSED"}
    assert not failing, f"{failing}\n{out[-2500:]}"
    r = guard(repo, "check_artifacts.py")
    assert r.returncode == 0 and "CONTRACT 2 OK" in r.stdout and "artifacts: OK over" in r.stdout, r.stdout


# ---------------------------------------------------------------- the digest world: plants that keep a file's size

@pytest.fixture(scope="module")
def digest(base_copy: Path, tmp_path_factory: pytest.TempPathFactory) -> tuple[Run, subprocess.CompletedProcess]:
    """BK-001 and BK-002: one digit swapped in a case artifact, and the benchmark's bootstrap width edited. Both keep the
    file's size, so the stdlib walk of contract 2 passes and only the release gate's digests find them."""
    repo = planted_copy(base_copy, tmp_path_factory, "digest")
    swap_two_digits(repo, case_path("real-murgul"), '"x50_measured_m"')
    edit(repo, BENCHMARK, '"n_boot": 2000', '"n_boot": 2001')
    outcomes, out = run_gates(repo, *GATES["BK-001"])
    return Run(outcomes, out), guard(repo, "check_artifacts.py")


def test_bk001_one_digit_of_a_case_artifact_swapped_fails_the_release_gate_and_its_digest_test(digest) -> None:
    run, script = digest
    for gate in GATES["BK-001"]:
        run.must_fail(gate, "real-murgul")
    assert script.returncode == 1 and "CONTRACT 2 OK" in script.stdout, script.stdout
    assert "real-murgul: content digest does not match" in script.stdout, script.stdout


def test_bk002_a_benchmark_edited_after_the_bake_is_rejected_by_the_release_gate(digest) -> None:
    """The edit keeps the file's size, so only the digest of the release gate finds it."""
    _, script = digest
    assert script.returncode == 1 and "CONTRACT 2 OK" in script.stdout, script.stdout
    assert "benchmark: content digest does not match" in script.stdout, script.stdout


# ---------------------------------------------------------------- the batch world: documents read by disjoint gates

def _bk003(repo: Path) -> None:
    def plant(index: dict) -> None:
        digest = index["corpus_digest"]
        index["corpus_digest"] = ("0" if digest[0] != "0" else "1") + digest[1:]

    mutate(repo, INDEX, plant)


def _bk004(repo: Path) -> None:
    def title(a: dict) -> None:
        a["case"]["title"]["es"] = ""

    def reason(a: dict) -> None:
        a["case"]["reason"]["en"] = "A case that pads the matrix."

    def variants(a: dict) -> None:
        del a["variants"][5:]

    mutate(repo, INDEX, lambda index: index.__setitem__("n_cases", 15))
    mutate(repo, case_path("ctrl-oracle"), title)
    mutate(repo, case_path("synth-sweep-powder"), reason)
    mutate(repo, case_path("real-akdaglar"), variants)


def _bk005(repo: Path) -> None:
    def hole(a: dict) -> None:
        del a["predictions"]["swebrec"]

    def silent(a: dict) -> None:
        cells = a["predictions"]["kuznetsov"]
        cells[next(iter(cells))].update(x50_m=None, reason=None)

    mutate(repo, case_path("real-soma"), hole)
    mutate(repo, case_path("real-enusa"), silent)


def _bk006(repo: Path) -> None:
    def answer(a: dict) -> None:
        cell = next(iter(a["predictions"]["kuznetsov"].values()))
        cell.update(x50_m=0.3, reason=None, abstained=False)

    def miss(a: dict) -> None:
        a["controls"]["positive_control"]["max_abs_error_m"] = 1e-6

    def unstamped(a: dict) -> None:
        arm = next(name for name, cells in a["predictions"].items() if any(c["x50_m"] is not None for c in cells.values()))
        cells = a["predictions"][arm]
        cells[first_answered(cells)]["extrapolated"] = False

    mutate(repo, case_path("real-miami"), answer)  # the geometry control answers anyway
    mutate(repo, case_path("ctrl-degenerate"), answer)  # a degenerate design is priced
    mutate(repo, case_path("ctrl-oracle"), miss)  # the positive control misses its own truth
    mutate(repo, case_path("real-granite-ne"), unstamped)  # an extrapolated prediction is left unstamped


def _bk008(repo: Path) -> None:
    def leak(a: dict) -> None:
        a["provenance"]["n_training_rows"] = 97
        a["provenance"]["held_out_site"] = "Murgul"

    mutate(repo, case_path("real-reocin"), leak)


def _bk009(repo: Path) -> None:
    def report(a: dict) -> None:
        a["geometry_report"]["Murgul"]["checks"][0]["ok"] = False

    def pattern(a: dict) -> None:
        next(b for b in a["blasts"] if b["has_geometry"])["pattern"]["rock_volume_m3"] = 0

    mutate(repo, case_path("real-murgul"), report)
    mutate(repo, case_path("real-soma"), pattern)


def _bk010(repo: Path) -> None:
    def bare(a: dict) -> None:
        del a["scores"]["kuznetsov"]["r2_identity"]

    mutate(repo, case_path("real-murgul"), bare)
    mutate(repo, case_path("real-soma"), lambda a: a["scores"].pop("null"))


def _bk011(repo: Path) -> None:
    def scores_zero(a: dict) -> None:
        a["scores"]["kuznetsov"] = {"scoreable": True, "r2_identity": 0.0, "pearson_r2": 0.0, "rmse_m": 0.0}

    mutate(repo, case_path("synth-sweep-burden"), scores_zero)


def _bk012(repo: Path) -> None:
    def flip(a: dict) -> None:
        curves = a["variant_curves"]["published-regression"]
        curves["powder-up"] = curves["base"] * 1.2  # more powder, coarser: the sign error

    mutate(repo, case_path("real-murgul"), flip)


def _bk014(repo: Path) -> None:
    def extra(index: dict) -> None:
        index["models"].append(dict(index["models"][0], scope="Atlantis", path="models/Atlantis.json"))

    def wrong_digest(a: dict) -> None:
        a["live_models"]["digest"] = "0" * 64

    def drift(model: dict) -> None:
        values = model["fixtures"]["expected"]["random-forest"]
        values[0] = values[0] * 1.5

    mutate(repo, INDEX, extra)
    shutil.copy2(repo / DERIVED / "models" / "corpus.json", repo / DERIVED / "models" / "Atlantis.json")
    mutate(repo, case_path("real-soma"), wrong_digest)
    mutate(repo, f"{DERIVED}/models/Akdaglar.json", drift)


def _benchmark(repo: Path) -> None:
    """The plants of the benchmark document, each in a key that only its own gate reads."""
    def plant(b: dict) -> None:
        b["provenance"]["kuznetsov-capped"]["declared_not_published"] = False  # EN-001
        del b["protocols"]["random-8020"]["arms"]["kuznetsov"]["common"]  # EN-004
        b["network_width_sweep"]["widths"] = list(range(6, 15))  # EN-005
        b["kill_criterion"] = "a criterion the artifact does not state"  # BA-001
        b["protocols"]["leave-one-site-out"]["n_folds"] = 9  # BA-002, the protocols
        draws = b["protocols"]["dedup-random"]["arms"]["random-forest"]["draws"]  # BA-002, the spread
        del draws[1:]
        b["verdict"]["depends_on_support"] = False  # BA-004
        b["published_reproduction"]["2012"]["gain_in_r2_identity"] = 0.01  # BA-006, the reproductions
        b["network_seed_sweep"]["n_seeds"] = 1  # BA-006, the seed sweep
        b["site_counts"]["Akdaglar"] = 21  # BA-007, the sizes
        b["site_meta"]["Murgul"]["measurement"] = "Wipfrag image analysis"  # BA-007, a method the source never gave
        del b["duplicate_groups"][0]  # BA-008, the groups
        b["diagnostics"]["outliers"]["applied_as_filter"] = True  # BA-008, the screen that filters
        b["corpus_rows"].append(dict(b["corpus_rows"][0], blast_id="SB01", site="Synthetic"))  # NC-002

    mutate(repo, BENCHMARK, plant)


def _ba009(repo: Path) -> None:
    def plant(a: dict) -> None:
        cells = a["predictions"]["random-forest"]
        blast_id = next(b["blast_id"] for b in a["blasts"] if cells[b["blast_id"]]["x50_m"] is not None and not b.get("degenerate_reason"))
        cells[blast_id]["x50_m"] = round(cells[blast_id]["x50_m"] + 0.001, 6)

    mutate(repo, case_path("real-murgul"), plant)


BATCH = ("BK-003", "BK-004", "BK-005", "BK-006", "BK-008", "BK-009", "BK-010", "BK-011", "BK-012", "BK-014", "EN-001", "EN-004",
         "EN-005", "BA-001", "BA-002", "BA-004", "BA-006", "BA-007", "BA-008", "BA-009", "NC-002")


@pytest.fixture(scope="module")
def batch(base_copy: Path, tmp_path_factory: pytest.TempPathFactory) -> Run:
    repo = planted_copy(base_copy, tmp_path_factory, "batch")
    for plant in (_bk003, _bk004, _bk005, _bk006, _bk008, _bk009, _bk010, _bk011, _bk012, _bk014, _benchmark, _ba009):
        plant(repo)
    return Run(*run_gates(repo, *[g for rid in BATCH for g in GATES[rid] if g not in HEAVY]))


def test_bk003_an_index_baked_from_another_corpus_is_found(batch: Run) -> None:
    batch.must_fail(GATES["BK-003"][0], "corpus_digest")


def test_bk004_a_matrix_short_of_a_case_a_translation_a_reason_and_a_variant(batch: Run) -> None:
    """Four plants, one per gate, each in a place that only its own gate reads."""
    sixteen, bilingual, reasons, variants = GATES["BK-004"]
    batch.must_fail(sixteen, "n_cases")
    batch.must_fail(bilingual, "ctrl-oracle")
    batch.must_fail(reasons, "synth-sweep-powder")
    batch.must_fail(variants, "real-akdaglar")


def test_bk005_a_matrix_with_a_missing_arm_and_a_cell_with_neither_value_nor_reason(batch: Run) -> None:
    holes, cells = GATES["BK-005"]
    batch.must_fail(holes, "real-soma", "swebrec")
    batch.must_fail(cells, "real-enusa")


def test_bk006_every_control_that_stops_firing_is_found(batch: Run) -> None:
    """Four controls, each stopped in its own case: the geometry control answers anyway, a degenerate design is priced, the
    positive control misses its truth, an extrapolated prediction is left unstamped."""
    geometry, degenerate, positive, extrapolation = GATES["BK-006"]
    batch.must_fail(geometry, "x50_m")
    batch.must_fail(degenerate, "x50_m")
    batch.must_fail(positive, "max_abs_error_m")
    batch.must_fail(extrapolation, "extrapolated")


def test_bk008_a_real_campaign_that_kept_its_own_site_in_training_is_found(batch: Run) -> None:
    batch.must_fail(GATES["BK-008"][0], "real-reocin")


def test_bk009_a_geometry_report_that_fails_a_check_and_a_blast_with_an_empty_pattern(batch: Run) -> None:
    report, pattern = GATES["BK-009"]
    batch.must_fail(report, "real-murgul")
    batch.must_fail(pattern, "real-soma", "rock_volume_m3")


def test_bk010_a_score_block_with_a_bare_variance_figure_and_a_case_without_its_null(batch: Run) -> None:
    bare, null = GATES["BK-010"]
    batch.must_fail(bare, "real-murgul/kuznetsov")
    batch.must_fail(null, "real-soma")


def test_bk011_a_case_with_no_measurements_that_scores_instead_of_saying_so(batch: Run) -> None:
    batch.must_fail(GATES["BK-011"][0], "scoreable")


def test_bk012_a_variant_curve_with_the_sign_wrong(batch: Run) -> None:
    batch.must_fail(GATES["BK-012"][0], "powder-up")


def test_bk014_an_extra_models_file_a_case_with_the_wrong_digest_and_a_portable_model_that_drifts(batch: Run) -> None:
    files, points, portable = GATES["BK-014"]
    batch.must_fail(files, "Atlantis")
    batch.must_fail(points, "digest")
    batch.must_fail(portable, "Akdaglar", "random-forest")


def test_en001_a_capped_arm_whose_cap_is_not_declared_is_found(batch: Run) -> None:
    batch.must_fail(GATES["EN-001"][0], "declared_not_published")


def test_en004_an_arm_without_its_common_support_score_is_found(batch: Run) -> None:
    batch.must_fail(GATES["EN-004"][0], "common")


def test_en005_a_width_sweep_that_lost_a_width_is_found(batch: Run) -> None:
    batch.must_fail(GATES["EN-005"][0], "widths")


def test_ba001_a_benchmark_without_its_criterion_is_found(batch: Run) -> None:
    batch.must_fail(GATES["BA-001"][0], "kill_criterion")


def test_ba002_a_protocol_with_a_fold_short_and_a_random_protocol_baked_as_one_draw(batch: Run) -> None:
    protocols, spread = GATES["BA-002"]
    batch.must_fail(protocols, "n_folds")
    batch.must_fail(spread, "draws")


def test_ba004_a_verdict_that_hides_its_dependence_on_the_row_set(batch: Run) -> None:
    batch.must_fail(GATES["BA-004"][0], "depends_on_support")


def test_ba006_a_reproduction_that_gains_nothing_and_a_seed_sweep_without_its_width(batch: Run) -> None:
    gain, sweep = GATES["BA-006"]
    batch.must_fail(gain, "gain_in_r2_identity")
    batch.must_fail(sweep, "n_seeds")


def test_ba007_a_site_count_that_drifts_and_a_measurement_method_the_source_never_gave(batch: Run) -> None:
    sizes, measurement = GATES["BA-007"]
    batch.must_fail(sizes, "Akdaglar")
    batch.must_fail(measurement, "measurement")


def test_ba008_a_duplicate_group_dropped_and_an_outlier_screen_that_filters(batch: Run) -> None:
    groups, screen = GATES["BA-008"]
    batch.must_fail(groups, "duplicate_groups")
    batch.must_fail(screen, "applied_as_filter")


def test_ba009_a_case_prediction_the_shipped_model_does_not_return(batch: Run) -> None:
    batch.must_fail(GATES["BA-009"][0], "real-murgul", "random-forest")


def test_nc002_a_synthetic_blast_in_the_benchmark_rows(batch: Run) -> None:
    batch.must_fail(GATES["NC-002"][0], "corpus_rows")


# ---------------------------------------------------------------- the apart world: source files and the plants that cannot share a document

def _bk002_source(repo: Path) -> None:
    """The defect of 0.04: the release gate re-read the cases and the models and never the benchmark."""
    edit(repo, "data-pipeline/pipeline/stages/validate.py",
         'if stored != digest(payload):\n                problems.append("benchmark: content digest does not match, the artifact was edited")',
         "if False:\n                problems.append('benchmark: content digest does not match, the artifact was edited')")


def _bk007(repo: Path) -> None:
    """The geometry negative control moved onto a campaign that has geometry, where it can never fire."""
    edit(repo, REGISTRY, 'id="real-miami",\n            category="negative-control"', 'id="real-miami",\n            category="real-campaign"')


def _bk008_source(repo: Path) -> None:
    edit(repo, "data-pipeline/pipeline/stages/train.py", "    if trained.held_out_site is None:\n        return\n", "    return\n")


def _en006(repo: Path) -> None:
    edit(repo, "data-pipeline/run.py", '    os.environ[_variable] = "1"', "    pass")  # numpy then runs on every core


def _nc003(repo: Path) -> None:
    edit(repo, "data-pipeline/pipeline/model/blasts.py",
         '    return bf.Blast(\n        blast_id=blast_id,\n        site=site,\n        meta={"synthetic": True},\n        **values,\n    )',
         '    blast = bf.Blast(blast_id=blast_id, site=site, meta={"synthetic": True}, **values)\n    bf.PublishedRegression().predict_one(blast)\n    return blast')


def _nc004_truth(repo: Path) -> None:
    edit(repo, "data-pipeline/pipeline/model/blasts.py", "        truth = arm.predict_one(blast).x50_m\n",
         "        truth = arm.predict_one(blast).x50_m * 1.1\n")


def _ba003(repo: Path) -> None:
    def plant(b: dict) -> None:
        del b["protocols"]["leave-one-site-out"]["arms"]["xgboost"]["supports"]["geometry"]

    mutate(repo, BENCHMARK, plant)


def _ba005(repo: Path) -> None:
    mutate(repo, case_path("real-granite-ne"), lambda a: a["predictions"].pop("kuznetsov-transfer"))


def _nc001(repo: Path) -> None:
    mutate(repo, case_path("synth-ibsd-capped"), lambda a: a["blasts"][0].__setitem__("x50_measured_m", 0.3))


APART_GATES = (*GATES["BK-002"], *GATES["BK-007"], GATES["BK-008"][1], *GATES["EN-006"], *GATES["NC-003"], *GATES["NC-004"],
               *GATES["BA-003"], *GATES["BA-005"], *GATES["NC-001"])


@pytest.fixture(scope="module")
def apart(base_copy: Path, tmp_path_factory: pytest.TempPathFactory) -> Run:
    repo = planted_copy(base_copy, tmp_path_factory, "apart")
    for plant in (_bk002_source, _bk007, _bk008_source, _en006, _nc003, _nc004_truth, _ba003, _ba005, _nc001):
        plant(repo)
    return Run(*run_gates(repo, *APART_GATES))


def test_bk002_a_release_gate_that_never_reads_the_benchmark_is_caught_by_its_own_test(apart: Run) -> None:
    apart.must_fail(GATES["BK-002"][0], "benchmark")


def test_bk007_a_control_attached_to_a_case_that_cannot_trigger_it_is_caught(apart: Run) -> None:
    apart.must_fail(GATES["BK-007"][0], "real-miami")


def test_bk008_a_leakage_assertion_that_can_no_longer_fail_is_caught_by_its_own_test(apart: Run) -> None:
    apart.must_fail(GATES["BK-008"][1], "DID NOT RAISE")


def test_en006_a_bake_that_no_longer_pins_blas_is_found(apart: Run) -> None:
    """The pin loop removed from run.py: numpy then runs on every core. A one-core machine cannot show the plant."""
    if (os.cpu_count() or 1) < 2 or importlib.util.find_spec("threadpoolctl") is None:
        pytest.skip("precondition: needs more than one core and threadpoolctl (the gate's own probe)")
    apart.must_fail(GATES["EN-006"][0])


def test_nc003_a_synthetic_design_that_asks_an_arm_for_a_prediction(apart: Run) -> None:
    apart.must_fail(GATES["NC-003"][0], "a synthetic design asked an arm for a prediction")


def test_nc004_a_positive_control_whose_truth_is_not_the_published_regressions_output(apart: Run) -> None:
    apart.must_fail(GATES["NC-004"][0], "x50_m")


def test_ba003_a_site_held_out_score_without_its_geometry_row_set(apart: Run) -> None:
    apart.must_fail(GATES["BA-003"][0], "geometry")


def test_ba005_a_case_without_the_transfer_arm(apart: Run) -> None:
    apart.must_fail(GATES["BA-005"][0], "real-granite-ne")


def test_nc001_a_synthetic_design_with_a_measured_size(apart: Run) -> None:
    apart.must_fail(GATES["NC-001"][0], "synth-ibsd-capped")


# ---------------------------------------------------------------- plants that run alone

def test_ba003_an_interval_that_runs_backwards_is_found(repo: Path) -> None:
    def plant(root: Path) -> None:
        mutate(root, BENCHMARK, lambda b: b["protocols"]["leave-one-site-out"]["arms"]["xgboost"]["supports"]["all"].__setitem__("interval_95", [1.0, -1.0]))

    solo(repo, plant, GATES["BA-003"][0], "interval_95")


def test_nc004_a_positive_control_that_no_longer_says_it_tests_the_harness(repo: Path) -> None:
    def plant(root: Path) -> None:
        edit(root, REGISTRY, "It tests the harness rather than the science", "It tests the science")

    solo(repo, plant, GATES["NC-004"][0], "tests the harness rather than the science")


def test_bk013_a_bake_that_writes_a_clock_into_its_artifact_is_not_byte_identical(repo: Path) -> None:
    def plant(root: Path) -> None:
        edit(root, "data-pipeline/pipeline/stages/export.py",
             'f"every learned arm on this case was trained WITHOUT any blast from {held_out_site}"',
             'f"every learned arm on this case was trained WITHOUT any blast from {held_out_site} {__import__(\'time\').time_ns()}"')

    solo(repo, plant, GATES["BK-013"][0], "first.digest == second.digest")


def test_bk013_a_committed_number_moved_by_one_percent_is_not_reproduced_by_a_re_bake(repo: Path) -> None:
    def move(a: dict) -> None:
        cells = a["predictions"]["random-forest"]
        blast_id = first_answered(cells)
        cells[blast_id]["x50_m"] = round(cells[blast_id]["x50_m"] * 1.01, 6)

    solo(repo, lambda root: mutate(root, case_path("real-murgul"), move), GATES["BK-013"][1], "different model rather than a different machine")


def test_en007_a_results_page_that_stopped_reporting_what_the_benchmark_gained(repo: Path) -> None:
    """The three claims of the gate, each broken in turn on the same copy and restored before the next: the capped arm's
    label, the common-support section, the width sweep's section."""
    gate = GATES["EN-007"][0]
    for page, old, new, says in (("02_every-arm.md", "capped at the in-situ block (declared)", "capped", "capped at the in-situ block (declared)"),
                                 ("02_every-arm.md", "## On the rows every arm answers", "## Rows", "On the rows every arm answers"),
                                 ("05_published-reproductions.md", "## The network's hidden width", "## Hidden width", "hidden width")):
        rel = f"docs/results/{page}"
        edit(repo, rel, old, new, count=-1)
        outcomes, out = run_gates(repo, gate)
        Run(outcomes, out).must_fail(gate, says)
        edit(repo, rel, new, old, count=-1)
    outcomes, _ = run_gates(repo, gate)
    assert outcomes[gate] == "PASSED", "the restored copy no longer passes: a plant left something behind"


# ---------------------------------------------------------------- the frontend gates (local-only)

def run_parity(repo: Path, name: str) -> subprocess.CompletedProcess:
    """One test of the frontend parity suite, run by node on the copy (``node --import tsx --test``)."""
    return subprocess.run([NODE, "--import", "tsx", "--test", "--test-reporter=tap", f"--test-name-pattern=^{re.escape(name)}$", "test/parity.test.ts"],
                          capture_output=True, encoding="utf-8", errors="replace", cwd=repo / "frontend", timeout=300)


def parity_plant(repo: Path, name: str, plant: Callable[[Path], None]) -> str:
    """The parity test passes on the clean copy, the plant is made, and it fails on the planted copy; returns its output."""
    link_node_modules(repo / "frontend")
    try:
        clean = run_parity(repo, name)
        assert clean.returncode == 0 and "# pass 1" in clean.stdout, f"the clean copy fails {name!r}:\n{clean.stdout[-1500:]}"
        plant(repo)
        planted = run_parity(repo, name)
        assert planted.returncode != 0 and "# fail 1" in planted.stdout, f"the planted copy passes {name!r}:\n{planted.stdout[-1500:]}"
        return planted.stdout
    finally:
        unlink_node_modules(repo / "frontend")


@needs_node
def test_en002_a_capped_score_that_differs_where_the_cap_binds_nowhere_is_found(repo: Path) -> None:
    """(local-only: needs node and `npm ci`.) A case whose cap binds on no blast, with its capped RMSE moved."""
    def plant(root: Path) -> None:
        for entry in load(root, INDEX)["cases"]:
            rel = f"{DERIVED}/{entry['artifact_path']}"
            a = load(root, rel)
            base = a["predictions"]["kuznetsov"]
            if a["scores"].get("kuznetsov-capped", {}).get("rmse_m") is None:
                continue
            if any((base[b["blast_id"]]["x50_m"] or -1) > b["features"]["XB_m"] for b in a["blasts"]):
                continue
            a["scores"]["kuznetsov-capped"]["rmse_m"] += 0.5
            save(root, rel, a)
            return
        raise AssertionError("no case has a cap that binds nowhere, so the plant plants nothing")

    out = parity_plant(repo, "the capped classical arm equals the classical arm wherever its cap does not bind", plant)
    assert "rmse_m" in out, out[-1500:]


@needs_node
def test_en003_a_capped_mean_size_the_browser_cannot_reproduce_is_found(repo: Path) -> None:
    """(local-only: needs node and `npm ci`.) One baked capped prediction moved by 1 cm on a reconstructable blast."""
    def plant(root: Path) -> None:
        for entry in load(root, INDEX)["cases"]:
            rel = f"{DERIVED}/{entry['artifact_path']}"
            a = load(root, rel)
            row = a["predictions"].get("kuznetsov-capped", {})
            for blast in a["blasts"]:
                cell = row.get(blast["blast_id"])
                if cell and cell["x50_m"] is not None and blast.get("pattern") and blast.get("rock_factor") is not None:
                    cell["x50_m"] += 0.01
                    save(root, rel, a)
                    return
        raise AssertionError("no reconstructable blast carries a capped prediction, so the plant plants nothing")

    out = parity_plant(repo, "the capped classical mean size matches the baked value on every reconstructable blast", plant)
    assert "TypeScript" in out, out[-1500:]


BROWSERS = os.environ.get("PLAYWRIGHT_BROWSERS_PATH", "D:/_Temp/ms-playwright")  # the temp root's browsers (the disks rule)
NEEDS_BROWSER = pytest.mark.skipif(
    NODE is None or not SHELL_INSTALLED or not (NODE_MODULES / "playwright").is_dir() or not list(Path(BROWSERS).glob("chromium*")),
    reason="local-only: needs node, `npm ci` in frontend/ and a Playwright chromium (PLAYWRIGHT_BROWSERS_PATH)",
)


def browser_gate(root: Path, port: int) -> subprocess.CompletedProcess:
    """Build the copy and run the browser gate against ``vite preview`` of it; the server is always stopped."""
    frontend = root / "frontend"
    npm = shutil.which("npm") or "npm"
    built = subprocess.run([npm, "run", "build"], capture_output=True, encoding="utf-8", errors="replace", cwd=frontend, timeout=500)
    assert built.returncode == 0, built.stdout[-1500:] + built.stderr[-800:]
    vite = subprocess.Popen([NODE, str(frontend / "node_modules" / "vite" / "bin" / "vite.js"), "preview", "--port", str(port), "--strictPort"],
                            cwd=frontend, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        subprocess.run([NODE, str(frontend / "node_modules" / "wait-on" / "bin" / "wait-on"), f"http-get://localhost:{port}/", "--timeout", "30000"],
                       check=True, capture_output=True, cwd=frontend, timeout=60)
        return subprocess.run([NODE, "scripts/browser-gate.mjs", "--url", f"http://localhost:{port}"], capture_output=True,
                              encoding="utf-8", errors="replace", cwd=frontend, timeout=1500,
                              env={**os.environ, "PLAYWRIGHT_BROWSERS_PATH": BROWSERS})
    finally:
        vite.terminate()
        try:
            vite.wait(timeout=20)
        except subprocess.TimeoutExpired:
            vite.kill()


@NEEDS_BROWSER
def test_en008_a_benchmark_page_that_draws_no_width_sweep_fails_the_browser_gate(repo: Path) -> None:
    """(local-only: needs node, `npm ci` and a Playwright browser; builds the copy and serves it on port 4190.) The baked width
    sweep emptied of its widths: the page then draws none and declares none, and the browser gate says so."""
    def plant(b: dict) -> None:
        b["network_width_sweep"]["widths"] = []
        b["network_width_sweep"]["leave_one_site_out"] = []
        for entry in b["network_width_sweep"]["published_protocol"].values():
            entry["table"] = []

    mutate(repo, BENCHMARK, plant)
    link_node_modules(repo / "frontend")
    try:
        r = browser_gate(repo, 4190)
    finally:
        unlink_node_modules(repo / "frontend")
    assert r.returncode != 0 and "width sweep" in r.stdout + r.stderr, (r.stdout + r.stderr)[-3000:]
