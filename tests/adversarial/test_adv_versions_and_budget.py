"""Plants for the version guard and the CI budget guard (template 0.08.002 suite, adapted to Fragmenta's contracts): each
test copies only the inputs its guard reads, plants one defect, runs the real guard as a subprocess and asserts exit 1
with the message that names the defect. The contract the plants edit is `case-index`, whose schema, catalog row,
History row and lock entry are Fragmenta's own. Every plant asserts the guard printed, so a guard that never ran cannot
pass; the clean copy of each guard passes."""
from __future__ import annotations

import json
import re
from pathlib import Path

import pytest
from planting import edit, git_commit, guard, make_tree

VERSIONS_INPUTS = ("scripts/*.py", "docs/contracts")
BUDGET_INPUTS = ("scripts/check_ci_budget.py", ".github", "requirements-precompute.txt")

TRACE = "docs/contracts/schemas/case-index.schema.json"
CONTRACT = "case-index"
CATALOG = "docs/contracts/catalog.md"
LOCK = "docs/contracts/versions.lock.json"


@pytest.fixture
def versions_repo(tmp_path: Path) -> tuple[Path, str]:
    repo = make_tree(tmp_path / "repo", *VERSIONS_INPUTS)
    return repo, git_commit(repo)


def _schema(repo: Path) -> dict:
    return json.loads((repo / TRACE).read_text(encoding="utf-8"))


def _write_schema(repo: Path, doc: dict) -> None:
    (repo / TRACE).write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8", newline="\n")


def _bump(repo: Path, new: str, kind: str) -> None:
    edit(repo, CATALOG, "| case-index | 1.0.0 |", f"| case-index | {new} |")
    anchor = "| case-manifest | 1.0.0 | 2026-10-16 |"  # the History row after case-index's own: the new row goes between
    edit(repo, CATALOG, anchor, f"| case-index | {new} | 2026-10-17 | planted | {kind} |\n{anchor}")
    guard(repo, "check_contract_versions.py", "--update")  # writes the lock, then reports: exit 1 when the History kind is wrong


def test_versions_the_base_is_the_branchs_own_unmodified_state(versions_repo) -> None:
    repo, base = versions_repo
    r = guard(repo, "check_contract_versions.py", "--base", base, ok_marker="check_contract_versions: OK")
    assert r.returncode == 0, r.stdout


def test_versions_c4_the_lock_edited_by_hand_to_match_a_schema_change(versions_repo) -> None:
    repo, base = versions_repo
    doc = _schema(repo)
    doc["required"] = [k for k in doc["required"] if k != "corpus_digest"]
    _write_schema(repo, doc)
    lock = json.loads((repo / LOCK).read_text(encoding="utf-8"))
    import hashlib
    lock[CONTRACT]["sha256"] = hashlib.sha256((repo / TRACE).read_bytes().replace(b"\r\n", b"\n")).hexdigest()
    (repo / LOCK).write_text(json.dumps(lock, indent=2) + "\n", encoding="utf-8")
    assert guard(repo, "check_contract_versions.py").returncode == 0  # offline, the lock alone is trusted (the known limit)
    r = guard(repo, "check_contract_versions.py", "--base", base)
    assert r.returncode == 1 and CONTRACT in r.stdout and "base" in r.stdout, r.stdout


def test_versions_c3_a_removed_property_bumped_as_minor(versions_repo) -> None:
    repo, base = versions_repo
    doc = _schema(repo)
    assert "corpus_digest" in doc["properties"]
    del doc["properties"]["corpus_digest"]
    doc["required"] = [k for k in doc["required"] if k != "corpus_digest"]
    _write_schema(repo, doc)
    _bump(repo, "1.1.0", "minor")
    r = guard(repo, "check_contract_versions.py", "--base", base)
    assert r.returncode == 1 and CONTRACT in r.stdout and "major" in r.stdout, r.stdout


def test_versions_c3b_a_narrowed_type_bumped_as_patch(versions_repo) -> None:
    repo, base = versions_repo
    doc = _schema(repo)
    doc["properties"]["n_cases"]["maximum"] = 4
    _write_schema(repo, doc)
    _bump(repo, "1.0.1", "patch")
    r = guard(repo, "check_contract_versions.py", "--base", base)
    assert r.returncode == 1 and CONTRACT in r.stdout and "major" in r.stdout, r.stdout


def test_versions_c3c_the_same_narrowing_as_a_major_bump_passes(versions_repo) -> None:
    repo, base = versions_repo
    doc = _schema(repo)
    doc["properties"]["n_cases"]["maximum"] = 4
    _write_schema(repo, doc)
    _bump(repo, "2.0.0", "major")
    r = guard(repo, "check_contract_versions.py", "--base", base, ok_marker="check_contract_versions: OK")
    assert r.returncode == 0, r.stdout


def test_versions_a_history_kind_that_is_not_the_semver_step(versions_repo) -> None:
    repo, base = versions_repo
    doc = _schema(repo)
    doc["properties"]["planted"] = {"type": "number"}
    _write_schema(repo, doc)
    _bump(repo, "1.1.0", "patch")
    r = guard(repo, "check_contract_versions.py", "--base", base)
    assert r.returncode == 1 and "kind" in r.stdout and "minor" in r.stdout, r.stdout


def test_versions_c6_a_contract_that_escapes_the_lock_by_dropping_its_schema_cell(versions_repo) -> None:
    repo, base = versions_repo
    edit(repo, CATALOG, "| docs/contracts/schemas/case-index.schema.json |", "| - |")
    lock = json.loads((repo / LOCK).read_text(encoding="utf-8"))
    del lock[CONTRACT]
    (repo / LOCK).write_text(json.dumps(lock, indent=2) + "\n", encoding="utf-8")
    r = guard(repo, "check_contract_versions.py", "--base", base)
    assert r.returncode == 1 and CONTRACT in r.stdout and "major" in r.stdout, r.stdout


def test_versions_a_base_that_cannot_be_resolved_never_passes_silently(versions_repo) -> None:
    repo, _ = versions_repo
    r = guard(repo, "check_contract_versions.py", "--base", "origin/nowhere")
    assert r.returncode == 1 and "fetch-depth: 0" in r.stdout, r.stdout


# ---------------------------------------------------------------- check_tech_matrix (F-T1 to F-T5)


# ---------------------------------------------------------------- check_ci_budget (F-B1)

@pytest.fixture
def budget_repo(tmp_path: Path) -> Path:
    return make_tree(tmp_path / "repo", *BUDGET_INPUTS)


ALLOWED = "pip install pytest==9.1.1 && python -m pytest tests/adversarial -q"


def _step(repo: Path, command: str) -> None:
    edit(repo, ".github/workflows/ci.yml", f"run: {ALLOWED}", command)


def test_ci_budget_the_allowance_itself_passes(budget_repo: Path) -> None:
    r = guard(budget_repo, "check_ci_budget.py", ok_marker="ci budget: OK")
    assert r.returncode == 0, r.stdout


@pytest.mark.parametrize("plant,command", [
    ("B-1 the whole suite after the allowed path", "run: pip install pytest==9.1.1 && python -m pytest tests/adversarial tests/ -q"),
    ("B-2 a path that climbs out", "run: pip install pytest==9.1.1 && python -m pytest tests/adversarial/.. -q"),
    ("B-3 a second pytest on the line", "run: python -m pytest tests/adversarial -q; python -m pytest -q"),
    ("B-4 an extra test file", "run: python -m pytest tests/adversarial tests/test_pipeline_smoke.py -q"),
    ("B-7 a line continuation", "run: |\n          pip install pytest==9.1.1 && python -m pytest tests/adversarial \\\n          tests/"),
    ("B-8 config overrides and an extra file", "run: pip install pytest==9.1.1 && python -m pytest tests/adversarial -q --rootdir=. "
                                              "--override-ini=testpaths=tests -c pyproject.toml tests/test_pipeline_smoke.py"),
    ("B-9 pyargs", "run: python -m pytest tests/adversarial --pyargs pipeline"),
    ("B-9 a plugin", "run: python -m pytest tests/adversarial -p no:cacheprovider"),
    ("B-9 an and-chain", "run: python -m pytest tests/adversarial && python -m pytest tests"),
])
def test_ci_budget_an_allowance_that_is_broader_than_the_adversarial_suite(budget_repo: Path, plant: str, command: str) -> None:
    _step(budget_repo, command)
    r = guard(budget_repo, "check_ci_budget.py")
    assert r.returncode == 1 and "tests run locally" in r.stdout, r.stdout


def test_ci_budget_a_pytest_install_on_its_own_line_is_not_a_test_run(budget_repo: Path) -> None:
    _step(budget_repo, "run: |\n          pip install pytest==9.1.1\n          python -m pytest tests/adversarial -q")
    r = guard(budget_repo, "check_ci_budget.py", ok_marker="ci budget: OK")
    assert r.returncode == 0, r.stdout


# ---------------------------------------------------------------- the CRLF test must prove the copy was hashed (F-A1)

def test_versions_crlf_copy_is_hashed_and_a_real_byte_still_fails(tmp_path: Path) -> None:
    repo = make_tree(tmp_path / "repo", *VERSIONS_INPUTS)
    for schema in (repo / "docs/contracts/schemas").glob("*.json"):
        schema.write_bytes(schema.read_bytes().replace(b"\r\n", b"\n").replace(b"\n", b"\r\n"))
    assert guard(repo, "check_contract_versions.py", ok_marker="check_contract_versions: OK").returncode == 0
    path = repo / TRACE
    raw = path.read_bytes()
    assert b"Present when the bake ran the benchmark." in raw and b"\r\n" in raw
    path.write_bytes(raw.replace(b"Present when the bake ran the benchmark.", b"Present when the bake ran the full benchmark.", 1))
    r = guard(repo, "check_contract_versions.py")
    assert r.returncode == 1 and "without a version bump" in r.stdout, r.stdout
    assert re.search(CONTRACT, r.stdout)


# ---- check_ci_budget: what YAML reads is what is judged (M10a-d)

@pytest.mark.parametrize("plant,command", [
    ("M10a a plain scalar continued on the next line", "run: python -m pytest tests/adversarial\n          tests/"),
    ("M10b a folded block", "run: >\n          python -m pytest tests/adversarial\n          tests/"),
    ("M10c a literal block indented by nine spaces", "run: |\n         pip install pytest==9.1.1\n         python -m pytest -q"),
    ("M10d PYTEST_ADDOPTS on the step", "env:\n          PYTEST_ADDOPTS: \"tests --override-ini=addopts=\"\n        run: " + ALLOWED),
    ("M10d PYTEST_ADDOPTS exported in the command", "run: export PYTEST_ADDOPTS=tests && python -m pytest tests/adversarial"),
])
def test_ci_budget_rereview_an_allowance_broader_than_the_yaml_shows(budget_repo: Path, plant: str, command: str) -> None:
    _step(budget_repo, command)
    r = guard(budget_repo, "check_ci_budget.py")
    assert r.returncode == 1 and ("tests run locally" in r.stdout or "PYTEST_" in r.stdout), r.stdout


def test_ci_budget_rereview_pytest_addopts_at_the_top_of_the_workflow(budget_repo: Path) -> None:
    edit(budget_repo, ".github/workflows/ci.yml", "\nconcurrency:\n", "\nenv:\n  PYTEST_ADDOPTS: tests\nconcurrency:\n")
    r = guard(budget_repo, "check_ci_budget.py")
    assert r.returncode == 1 and "PYTEST_ADDOPTS" in r.stdout, r.stdout


def test_ci_budget_rereview_m10f_the_allowance_as_a_folded_block_passes(budget_repo: Path) -> None:
    _step(budget_repo, "run: >\n          pip install pytest==9.1.1 &&\n          python -m pytest tests/adversarial -q")
    r = guard(budget_repo, "check_ci_budget.py", ok_marker="ci budget: OK")
    assert r.returncode == 0, r.stdout
