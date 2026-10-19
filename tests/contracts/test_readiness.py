"""Catalog row readiness 1.0.0 (producer side): data-pipeline/pipeline/core/readiness.py computes every
row's declared state from docs/contracts/catalog.md and the repository. One test per state, each reached
through the real ``compute`` on a temporary copy of the repository inputs; each document is checked
against the schema and each reason against the catalog's own Missing-data table (parsed here, never
copied)."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest
from contract_schemas import ROOT, errors
from pipeline.core import readiness
from pipeline.core.jsonio import write_json

CATALOG = ROOT / "docs" / "contracts" / "catalog.md"
VERSION = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
OLDER = VERSION.rsplit(".", 1)[0] + ".999"  # a product version that is not VERSION
BAKED = (
    "case-index",
    "case-manifest",
    "case-artifact",
    "models-file",
    "benchmark",
)  # the rows the index gates
NO_TRAINING_STACK = (
    "import sys, runpy; sys.modules['numpy'] = None; sys.modules['blastfrag'] = None; "
    "sys.modules['sklearn'] = None; path = sys.argv[1]; sys.argv = sys.argv[1:]; "
    "runpy.run_path(path, run_name='__main__')"
)


def _table(section: str) -> list[list[str]]:
    text = CATALOG.read_text(encoding="utf-8").replace("\r\n", "\n")
    body = text.split(f"## {section}\n", 1)[1].split("\n## ", 1)[0]
    rows = [
        [c.strip() for c in ln.strip().strip("|").split("|")]
        for ln in body.splitlines()
        if ln.startswith("|")
    ]
    return rows[2:]  # the header and the separator


def template(condition: str) -> tuple[str, str]:
    """The English and Spanish reason of the Missing-data row whose condition contains ``condition``."""
    for cells in _table("Missing-data states"):
        if len(cells) == 6 and condition in cells[1]:
            return cells[4], cells[5]
    raise AssertionError(f"no Missing-data row mentions {condition!r}")


def fill(tpl: tuple[str, str], **vals: object) -> dict:
    out = {}
    for lang, text in zip(("en", "es"), tpl):
        for k, v in vals.items():
            text = text.replace("{" + k + "}", str(v))
        out[lang] = text
    return out


@pytest.fixture()
def repo(tmp_path: Path) -> Path:
    """A temporary repository: the catalog, VERSION and the committed bake."""
    r = tmp_path / "repo"
    (r / "docs" / "contracts").mkdir(parents=True)
    shutil.copy(CATALOG, r / "docs" / "contracts" / "catalog.md")
    shutil.copy(ROOT / "VERSION", r / "VERSION")
    shutil.copytree(
        ROOT / "data" / "derived", r / "data" / "derived", ignore=shutil.ignore_patterns("readiness.json")
    )
    return r


def run(r: Path) -> dict:
    doc = readiness.compute(repo_root=r, derived_root=r / "data" / "derived", models_dir=r / "models")
    assert errors("readiness", doc) == []
    return doc


def entry(doc: dict, row: str) -> dict:
    return next(e for e in doc["contracts"] if e["id"] == row)


def index_of(r: Path) -> dict:
    return json.loads((r / "data" / "derived" / "manifests" / "index.json").read_text(encoding="utf-8"))


def test_committed_readiness_is_current(tmp_path):
    doc = readiness.compute(
        repo_root=ROOT, derived_root=ROOT / "data" / "derived", models_dir=ROOT / "models"
    )
    out = tmp_path / "derived"
    readiness.write(out, doc)
    assert (out / "readiness.json").read_bytes() == (
        ROOT / "data" / "derived" / "readiness.json"
    ).read_bytes()


def test_catalog_rows_in_order_without_readiness():
    rows = readiness.parse_catalog(CATALOG.read_text(encoding="utf-8"))
    assert [r["id"] for r in rows] == [
        "blast-record",
        "case-index",
        "case-manifest",
        "case-artifact",
        "models-file",
        "benchmark",
        "readiness",
        "api",
    ]
    assert {"id", "version", "status", "provider"} <= set(rows[0])
    doc = readiness.compute(
        repo_root=ROOT, derived_root=ROOT / "data" / "derived", models_dir=ROOT / "models"
    )
    assert [e["id"] for e in doc["contracts"]] == [r["id"] for r in rows if r["id"] != "readiness"]
    assert doc["product_version"] == VERSION


def test_state_available(repo):
    doc = run(repo)
    for e in doc["contracts"]:
        if e["id"] != "api":
            assert (e["state"], e["provenance"], e["reason"], e["missing"]) == (
                "available",
                "real",
                None,
                [],
            ), e["id"]
    api = entry(doc, "api")
    assert (api["state"], api["provenance"]) == ("missing", None)
    assert api["reason"] == fill(template("always, in the static document"))


def test_adversarial_state_missing_without_an_index(repo):
    (repo / "data" / "derived" / "manifests" / "index.json").unlink()
    doc = run(repo)
    for row in BAKED:
        e = entry(doc, row)
        assert (e["state"], e["provenance"], e["missing"]) == ("missing", None, []), row
        assert e["reason"] == fill(template("`data/derived/manifests/index.json` is absent")), row
    assert entry(doc, "blast-record")["state"] == "available"  # the corpus is the engine's, not the bake's


def test_adversarial_state_partial_manifests(repo):
    (repo / "data" / "derived" / "manifests" / "real-murgul.json").unlink()
    doc = run(repo)
    e = entry(doc, "case-manifest")
    assert (e["state"], e["provenance"]) == ("partial", "real")
    assert e["reason"] == fill(template("a manifest the index lists is absent"), n=1, total=16)
    assert e["missing"] == ["manifests/real-murgul.json"]
    assert (
        entry(doc, "case-artifact")["state"] == "available"
    )  # the artifact is listed by the index and is there


def test_state_partial_artifacts(repo):
    (repo / "data" / "derived" / "real-soma" / "case.json").unlink()
    (repo / "data" / "derived" / "ctrl-oracle" / "case.json").unlink()
    doc = run(repo)
    e = entry(doc, "case-artifact")
    assert (e["state"], e["provenance"]) == ("partial", "real")
    assert e["reason"] == fill(template("an artifact the index lists is absent"), n=2, total=16)
    assert e["missing"] == ["ctrl-oracle/case.json", "real-soma/case.json"]
    assert entry(doc, "case-manifest")["state"] == "available"


def test_state_partial_models(repo):
    (repo / "data" / "derived" / "models" / "Soma.json").unlink()
    doc = run(repo)
    e = entry(doc, "models-file")
    assert (e["state"], e["provenance"]) == ("partial", "real")
    assert e["reason"] == fill(template("a models file the index lists is absent"), n=1, total=11)
    assert e["missing"] == ["models/Soma.json"]


def test_adversarial_state_missing_benchmark(repo):
    (repo / "data" / "derived" / "benchmark.json").unlink()
    doc = run(repo)
    e = entry(doc, "benchmark")
    assert (e["state"], e["provenance"], e["missing"]) == ("missing", None, [])
    assert e["reason"] == fill(template("`data/derived/benchmark.json` is absent"))
    assert entry(doc, "case-index")["state"] == "available"


def test_adversarial_state_stale(repo):
    idx = repo / "data" / "derived" / "manifests" / "index.json"
    doc = index_of(repo)
    doc["app_version"] = OLDER
    write_json(idx, doc)
    out = run(repo)
    for row in BAKED:
        e = entry(out, row)
        assert (e["state"], e["provenance"]) == ("stale", "real"), row
        assert e["reason"] == fill(template("differs from `VERSION`"), app_version=OLDER, version=VERSION)
        assert e["missing"] == []
    assert entry(out, "blast-record")["state"] == "available"


def test_stale_reads_the_product_version_not_the_engine_version(repo):
    """The index carries engine_version (the pinned blastfrag) and app_version (the product that baked it):
    only the second is compared with VERSION, so the pinned engine never makes a bake stale."""
    doc = index_of(repo)
    assert doc["engine_version"] != VERSION and doc["app_version"] == VERSION
    assert entry(run(repo), "case-index")["state"] == "available"


def test_first_matching_rule_wins(repo):
    """A bake that is both partial and stale reports partial where partial applies (the catalog's order)."""
    idx = repo / "data" / "derived" / "manifests" / "index.json"
    doc = index_of(repo)
    doc["app_version"] = OLDER
    write_json(idx, doc)
    (repo / "data" / "derived" / "manifests" / "real-murgul.json").unlink()
    out = run(repo)
    assert entry(out, "case-manifest")["state"] == "partial"
    assert entry(out, "case-index")["state"] == "stale"


def set_status(r: Path, row_id: str, status: str) -> None:
    """Rewrite the status cell of catalog row ``row_id`` in the repository copy ``r``."""
    cat = r / "docs" / "contracts" / "catalog.md"
    text = cat.read_text(encoding="utf-8")
    row = next(ln for ln in text.splitlines() if ln.startswith(f"| {row_id} |"))
    cells = row.split("|")
    cells[-2] = f" {status} "
    cat.write_text(text.replace(row, "|".join(cells)), encoding="utf-8")


def test_adversarial_state_provider_through_a_catalog_copy(repo):
    set_status(repo, "case-index", "active")
    doc = run(repo)
    e = entry(doc, "case-index")
    provider = next(
        r["provider"]
        for r in readiness.parse_catalog(CATALOG.read_text(encoding="utf-8"))
        if r["id"] == "case-index"
    )
    assert (e["state"], e["status"], e["provenance"]) == ("provider", "active", "fixture")
    assert e["reason"] == fill(
        template("the catalog `status` is `active`"), provider=provider.replace("`", "")
    )
    assert entry(doc, "case-manifest")["state"] == "available"
    ref = readiness.compute(
        repo_root=ROOT, derived_root=ROOT / "data" / "derived", models_dir=ROOT / "models"
    )
    assert doc["catalog_sha256"] != ref["catalog_sha256"]


@pytest.mark.parametrize("bad", ["stub", "live", "Active", "REAL", "real extra", "baseline", ""])
def test_a_status_other_than_real_or_active_fails(repo, bad):
    set_status(repo, "case-index", bad)
    with pytest.raises(ValueError) as exc:
        readiness.compute(repo_root=repo, derived_root=repo / "data" / "derived", models_dir=repo / "models")
    assert "case-index" in str(exc.value) and "real" in str(exc.value) and "active" in str(exc.value)


def test_table_padding_is_formatting_not_a_status(repo):
    set_status(repo, "case-index", "   real   ")
    assert entry(run(repo), "case-index")["state"] == "available"


def test_unknown_row_gets_only_the_generic_rules(repo):
    cat = repo / "docs" / "contracts" / "catalog.md"
    text = cat.read_text(encoding="utf-8")
    row = next(ln for ln in text.splitlines() if ln.startswith("| blast-record |"))
    own = row.replace("| blast-record |", "| my-own-row |", 1)
    cat.write_text(text.replace(row, row + "\n" + own), encoding="utf-8")
    assert entry(run(repo), "my-own-row")["state"] == "available"
    own_active = own.split("|")
    own_active[-2] = " active "
    cat.write_text(text.replace(row, row + "\n" + "|".join(own_active)), encoding="utf-8")
    assert entry(run(repo), "my-own-row")["state"] == "provider"


def test_determinism_and_normalised_hash(repo):
    a, b = run(repo), run(repo)
    assert a == b
    cat = repo / "docs" / "contracts" / "catalog.md"
    cat.write_bytes(cat.read_bytes().replace(b"\r\n", b"\n").replace(b"\n", b"\r\n"))
    assert run(repo)["catalog_sha256"] == a["catalog_sha256"]


def _check(root: Path | None = None, *, no_stack: bool = False) -> subprocess.CompletedProcess:
    script = str(ROOT / "scripts" / "check_readiness.py")
    args = [str(root)] if root else []
    cmd = (
        [sys.executable, "-c", NO_TRAINING_STACK, script, *args]
        if no_stack
        else [sys.executable, script, *args]
    )
    return subprocess.run(cmd, capture_output=True, text=True, cwd=ROOT)


def test_check_readiness_passes_on_the_repository():
    p = _check()
    assert p.returncode == 0, p.stdout + p.stderr
    assert "readiness: current" in p.stdout


def test_adversarial_check_readiness_runs_without_the_training_stack():
    p = _check(no_stack=True)
    assert p.returncode == 0, p.stdout + p.stderr
    assert "readiness: current" in p.stdout


def test_adversarial_check_readiness_reports_an_unknown_status(repo):
    set_status(repo, "case-index", "stub")
    p = _check(repo)
    assert p.returncode == 1, p.stdout + p.stderr
    assert "case-index" in p.stdout and "real" in p.stdout and "active" in p.stdout
    assert "Traceback" not in p.stdout + p.stderr


def test_adversarial_check_readiness_fails_on_a_changed_catalog_and_passes_after_the_command(repo):
    """The brief's refutation: the catalog changes and the readiness is not regenerated -> fail; then
    ``run.py readiness`` -> pass."""
    (repo / "data" / "derived" / "readiness.json").write_bytes(
        (ROOT / "data" / "derived" / "readiness.json").read_bytes()
    )
    assert _check(repo).returncode == 0
    cat = repo / "docs" / "contracts" / "catalog.md"
    cat.write_text(
        CATALOG.read_text(encoding="utf-8").replace("One row per", "One Row per", 1), encoding="utf-8"
    )
    p = _check(repo)
    assert p.returncode == 1, p.stdout + p.stderr
    assert "catalog_sha256" in p.stdout
    assert "python data-pipeline/run.py readiness" in p.stdout
    regen = subprocess.run(
        [
            sys.executable,
            "-c",
            NO_TRAINING_STACK,
            str(ROOT / "data-pipeline" / "run.py"),
            "readiness",
            "--repo-root",
            str(repo),
        ],
        capture_output=True,
        text=True,
        cwd=ROOT,
    )
    assert regen.returncode == 0, regen.stdout + regen.stderr
    p = _check(repo)
    assert p.returncode == 0, p.stdout + p.stderr


def test_run_py_readiness_writes_the_committed_bytes(repo, tmp_path):
    out = subprocess.run(
        [
            sys.executable,
            "-c",
            NO_TRAINING_STACK,
            str(ROOT / "data-pipeline" / "run.py"),
            "readiness",
            "--repo-root",
            str(repo),
        ],
        capture_output=True,
        text=True,
        cwd=ROOT,
    )
    assert out.returncode == 0, out.stdout + out.stderr
    written = repo / "data" / "derived" / "readiness.json"
    assert written.read_bytes() == (ROOT / "data" / "derived" / "readiness.json").read_bytes()
    assert errors("readiness", json.loads(written.read_text(encoding="utf-8"))) == []
