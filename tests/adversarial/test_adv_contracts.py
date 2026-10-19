"""Plants for the contract guards (template 0.08.002 suite, adapted to Fragmenta's catalog): check_contracts,
check_readiness, check_skeleton and the offline half of check_contract_versions. Each test copies the repository's files,
plants one defect in the catalog or a schema, runs the real guard as a subprocess and asserts exit 1 (exit 2 where the
guard says so) with the message that names the defect; the clean copy of every guard passes.

The `benchmark` row is the one the plants edit: it is a real row with a baked document, so a plant that touches it
cannot pass by editing something no guard reads."""
from __future__ import annotations

import re
from pathlib import Path

from planting import edit, guard, set_cell

CATALOG = "docs/contracts/catalog.md"
# column of the contract table: id 0, version 1, owner 2, schema 3, example 4, producer test 5, consumer test 6,
# missing-data behavior 7, provider 8, model io 9, swap test 10, status 11
SCHEMA, PRODUCER, PROVIDER, MODEL_IO, STATUS = 3, 5, 8, 9, 11


def test_every_contract_guard_passes_on_the_clean_copy(repo: Path) -> None:
    for script, marker in (("check_contract_versions.py", "check_contract_versions: OK"),
                           ("check_readiness.py", "readiness: current")):
        r = guard(repo, script, ok_marker=marker)
        assert r.returncode == 0 and marker in r.stdout, f"{script}: {r.stdout}"
    r = guard(repo, "check_contracts.py", CATALOG, "--repo-root", ".")
    assert r.returncode == 0 and "OK:" in r.stdout, r.stdout
    r = guard(repo, "check_skeleton.py", CATALOG)
    assert r.returncode == 0 and "every boundary is real" in r.stdout, r.stdout


# ---------------------------------------------------------------- check_contract_versions

def test_versions_a_schema_edited_without_a_version_bump(repo: Path) -> None:
    edit(repo, "docs/contracts/schemas/benchmark.schema.json", '"type"', '"type"  ')  # whitespace is a change
    r = guard(repo, "check_contract_versions.py")
    assert r.returncode == 1 and "benchmark" in r.stdout and "without a version bump" in r.stdout, r.stdout


def test_versions_a_version_lowered_in_the_catalog(repo: Path) -> None:
    set_cell(repo, CATALOG, "case-index", 1, "0.9.0")
    r = guard(repo, "check_contract_versions.py")
    assert r.returncode == 1 and "case-index" in r.stdout and "goes down" in r.stdout, r.stdout


def test_versions_a_bump_without_a_history_row(repo: Path) -> None:
    set_cell(repo, CATALOG, "blast-record", 1, "1.1.0")
    r = guard(repo, "check_contract_versions.py")
    assert r.returncode == 1 and "no History entry for its current version 1.1.0" in r.stdout, r.stdout


def test_versions_a_contract_row_removed_from_the_catalog_but_kept_in_the_lock(repo: Path) -> None:
    text = (repo / CATALOG).read_bytes().decode("utf-8")
    row = next(ln for ln in text.split("\n") if ln.startswith("| readiness | 1.0.0 | data-pipeline"))
    edit(repo, CATALOG, row + "\n", "")  # the contract row only; the History row of the same id stays
    r = guard(repo, "check_contract_versions.py")
    assert r.returncode == 1 and "readiness" in r.stdout, r.stdout


# ---------------------------------------------------------------- check_contracts

def test_contracts_a_model_slot_without_a_baseline_provider(repo: Path) -> None:
    set_cell(repo, CATALOG, "benchmark", MODEL_IO, "benchmark-io")
    r = guard(repo, "check_contracts.py", CATALOG, "--repo-root", ".")
    assert r.returncode == 1 and "benchmark" in r.stdout and "baseline" in r.stdout, r.stdout


def test_contracts_a_schema_file_that_does_not_exist(repo: Path) -> None:
    set_cell(repo, CATALOG, "case-index", SCHEMA, "docs/contracts/schemas/gone.json")
    r = guard(repo, "check_contracts.py", CATALOG, "--repo-root", ".")
    assert r.returncode == 1 and "gone.json" in r.stdout, r.stdout


def test_contracts_a_producer_test_that_does_not_exist_and_a_provider_of_no_known_kind(repo: Path) -> None:
    set_cell(repo, CATALOG, "benchmark", PRODUCER, "tests/contracts/test_gone.py::test_nothing")
    set_cell(repo, CATALOG, "case-manifest", PROVIDER, "mock:docs/contracts/examples/blast-record.json")
    r = guard(repo, "check_contracts.py", CATALOG, "--repo-root", ".")
    assert r.returncode == 1 and "test_gone.py" in r.stdout and "mock" in r.stdout, r.stdout


def test_contracts_an_id_that_appears_twice(repo: Path) -> None:
    text = (repo / CATALOG).read_bytes().decode("utf-8")
    row = next(ln for ln in text.split("\n") if re.match(r"\| benchmark \| \d+\.\d+\.\d+ \| data-pipeline", ln))
    edit(repo, CATALOG, row, row + "\n" + row)
    r = guard(repo, "check_contracts.py", CATALOG, "--repo-root", ".")
    assert r.returncode == 1 and "benchmark: duplicate id" in r.stdout, r.stdout


# ---------------------------------------------------------------- check_readiness

def test_readiness_a_catalog_edited_without_recomputing_the_document(repo: Path) -> None:
    edit(repo, CATALOG, "Phase 2 of contract-first parallel delivery", "Phase 2 of the contract-first parallel delivery")
    r = guard(repo, "check_readiness.py")
    assert r.returncode == 1 and "readiness: stale" in r.stdout and "python data-pipeline/run.py readiness" in r.stdout, r.stdout


def test_readiness_a_row_whose_status_the_rules_do_not_know(repo: Path) -> None:
    set_cell(repo, CATALOG, "benchmark", STATUS, "done")
    r = guard(repo, "check_readiness.py")
    assert r.returncode == 1 and "invalid catalog" in r.stdout and "done" in r.stdout, r.stdout


# ---------------------------------------------------------------- check_skeleton

def test_skeleton_a_row_still_served_by_a_provider_is_listed_with_exit_2(repo: Path) -> None:
    """The CI step turns exit 2 into a failure on main (ci.yml, 'Rows still served by a provider')."""
    set_cell(repo, CATALOG, "benchmark", STATUS, "active")
    r = guard(repo, "check_skeleton.py", CATALOG)
    assert r.returncode == 2 and "benchmark" in r.stdout and "still served by a provider" in r.stdout, r.stdout
    ci = (repo / ".github/workflows/ci.yml").read_text(encoding="utf-8")
    assert re.search(r'-eq 2 \] && \[ "\$GITHUB_REF" = "refs/heads/main" \]', ci), "the CI step no longer fails main on exit 2"


def test_skeleton_a_status_the_vocabulary_does_not_know_is_malformed(repo: Path) -> None:
    set_cell(repo, CATALOG, "benchmark", STATUS, "finished")
    r = guard(repo, "check_skeleton.py", CATALOG)
    assert r.returncode == 1 and "finished" in r.stdout, r.stdout
