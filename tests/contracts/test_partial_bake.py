"""A partial bake builds, and only when the readiness document says so (catalog, Missing-data states).

scripts/check_artifacts.py accepts an absent manifest, artifact or models file when the readiness
document lists it in the ``missing`` of a ``partial`` row, and stops on any other absence.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest
from contract_schemas import ROOT
from pipeline.core import readiness


@pytest.fixture()
def repo(tmp_path: Path) -> Path:
    r = tmp_path / "repo"
    (r / "docs" / "contracts").mkdir(parents=True)
    shutil.copy(ROOT / "docs" / "contracts" / "catalog.md", r / "docs" / "contracts" / "catalog.md")
    shutil.copy(ROOT / "VERSION", r / "VERSION")
    shutil.copytree(ROOT / "data" / "derived", r / "data" / "derived")
    return r


def check(r: Path) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "check_artifacts.py"), str(r)],
        capture_output=True,
        text=True,
        check=False,
    )


def regenerate(r: Path) -> dict:
    doc = readiness.compute(repo_root=r, derived_root=r / "data" / "derived")
    readiness.write(r / "data" / "derived", doc)
    return doc


def test_the_committed_bake_passes_both_layers():
    p = check(ROOT)
    assert p.returncode == 0, p.stdout + p.stderr
    assert "CONTRACT 2 OK" in p.stdout and "artifacts: OK" in p.stdout


def test_adversarial_an_undeclared_absence_stops_the_check(repo):
    (repo / "data" / "derived" / "real-soma" / "case.json").unlink()
    p = check(repo)
    assert p.returncode == 1, p.stdout
    assert "missing artifact" in p.stdout and "real-soma" in p.stdout


def test_adversarial_a_declared_absence_builds_with_a_warning(repo):
    derived = repo / "data" / "derived"
    (derived / "manifests" / "real-murgul.json").unlink()
    (derived / "real-soma" / "case.json").unlink()
    (derived / "models" / "Soma.json").unlink()
    doc = regenerate(repo)
    states = {e["id"]: e["state"] for e in doc["contracts"]}
    assert states["case-manifest"] == states["case-artifact"] == states["models-file"] == "partial"
    p = check(repo)
    assert p.returncode == 0, p.stdout + p.stderr
    assert p.stdout.count("WARN:") == 3 and "3 declared absent" in p.stdout


def test_adversarial_only_the_declared_paths_are_tolerated(repo):
    derived = repo / "data" / "derived"
    (derived / "real-soma" / "case.json").unlink()
    regenerate(repo)
    (derived / "real-murgul" / "case.json").unlink()  # absent, and not declared
    p = check(repo)
    assert p.returncode == 1, p.stdout
    drift = p.stdout.split("DRIFT")[1]
    assert "real-murgul" in drift and "case.json" in drift and "real-soma" not in drift


def test_adversarial_a_changed_artifact_is_still_drift_on_a_partial_bake(repo):
    derived = repo / "data" / "derived"
    (derived / "models" / "Soma.json").unlink()
    regenerate(repo)
    path = derived / "real-murgul" / "case.json"
    doc = json.loads(path.read_text(encoding="utf-8"))
    doc["null_mean_m"] = doc["null_mean_m"] + 1
    path.write_text(json.dumps(doc), encoding="utf-8")
    p = check(repo)
    assert p.returncode == 1, p.stdout
    assert "byte drift" in p.stdout or "PROBLEM" in p.stdout
