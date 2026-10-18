"""Plants for every other guard CI runs on Fragmenta, in the form of the template suite: a throwaway copy of the
repository's files, one planted defect, the real script run on it as a subprocess, exit 1 and the message that names the
defect; the clean copy of each guard passes. Nothing here edits the repository itself.

Covers the guards Fragmenta carries beyond the spec-area ones: check_guards, check_doc_paths, check_content_standards,
check_spanish_accents, check_deploy_place, check_version_coherence, check_web_baseline, check_documents, check_artifacts.
The characters the content guard bans are written as escapes here, so this file passes the guard it tests."""
from __future__ import annotations

import importlib.util
import json
import subprocess
from pathlib import Path

import pytest
from planting import edit, guard
from webtools import NODE, SHELL_INSTALLED, link_node_modules, unlink_node_modules

EM_DASH = chr(0x2014)
EMOJI = chr(0x1F600)
needs_web = pytest.mark.skipif(NODE is None or not SHELL_INSTALLED, reason="needs node and `npm ci` in frontend/")
needs_engine = pytest.mark.skipif(importlib.util.find_spec("numpy") is None or importlib.util.find_spec("blastfrag") is None,
                                  reason="needs numpy and blastfrag (the deploy installs them; CI's guards job does not)")


def track(repo: Path, *forced: str) -> Path:
    """Make the copy a git repository with every file staged: these guards read `git ls-files`. A plant that sits in a
    path the repository ignores (a real `.env`, a `venv/`) is named in ``forced`` and staged with -f."""
    subprocess.run(["git", "init", "-q"], cwd=repo, check=True)
    subprocess.run(["git", "add", "-A"], cwd=repo, check=True, capture_output=True)
    for rel in forced:
        subprocess.run(["git", "add", "-f", rel], cwd=repo, check=True, capture_output=True)
    return repo


@pytest.fixture(autouse=True)
def _utf8_output(monkeypatch: pytest.MonkeyPatch) -> None:
    """The guards print Spanish text and the planted glyphs; a Windows pipe would encode them in the ANSI code page."""
    monkeypatch.setenv("PYTHONUTF8", "1")


def put(repo: Path, rel: str, text: str | bytes) -> None:
    path = repo / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(text.encode("utf-8") if isinstance(text, str) else text)


# ---------------------------------------------------------------- the clean copy of every guard passes

def test_every_guard_passes_on_the_clean_copy(repo: Path) -> None:
    track(repo)
    for script, marker in (("check_guards.py", "guards: OK"), ("check_doc_paths.py", "doc paths: OK"),
                           ("check_deploy_place.py", "deploy place: OK"), ("check_documents.py", "documents:"),
                           ("check_spanish_accents.py", "spanish accents: OK"),
                           ("check_version_coherence.py", "version: OK")):
        r = guard(repo, script)
        assert r.returncode == 0 and marker in r.stdout, f"{script}: {r.stdout}"


# ---------------------------------------------------------------- check_guards

def test_guards_a_tracked_real_env_file(repo: Path) -> None:
    put(repo, ".env", "TOKEN=real\n")
    r = guard(track(repo, ".env"), "check_guards.py")
    assert r.returncode == 1 and "a real environment file is tracked: .env" in r.stdout, r.stdout


def test_guards_no_env_example_left(repo: Path) -> None:
    (repo / ".env.example").unlink()
    r = guard(track(repo), "check_guards.py")
    assert r.returncode == 1 and "no .env.example is tracked" in r.stdout, r.stdout


def test_guards_a_tracked_environment_and_a_native_binary(repo: Path) -> None:
    put(repo, "venv/lib/x.py", "x = 1\n")
    put(repo, "data/model.pth", b"\x00")
    r = guard(track(repo, "venv/lib/x.py", "data/model.pth"), "check_guards.py")
    assert r.returncode == 1 and "venv/lib/x.py" in r.stdout and "data/model.pth" in r.stdout, r.stdout


def test_guards_a_local_machine_path_written_into_a_file(repo: Path) -> None:
    put(repo, "docs/notes.md", "see " + "D:" + chr(92) + "_Repos" + chr(92) + "x\n")
    r = guard(track(repo), "check_guards.py")
    assert r.returncode == 1 and "a local machine path is written into docs/notes.md" in r.stdout, r.stdout


def test_guards_an_internal_package_and_a_source_pdf(repo: Path) -> None:
    put(repo, "data-pipeline/blastlab/__init__.py", "")
    put(repo, "docs/source.pdf", b"%PDF")
    edit(repo, "pyproject.toml", "[tool.pytest.ini_options]", '[project]\nname = "x"\n\n[tool.pytest.ini_options]')
    r = guard(track(repo), "check_guards.py")
    out = r.stdout
    assert r.returncode == 1 and "an internal lab package appeared" in out and "docs/source.pdf" in out and "declares a package" in out, out


# ---------------------------------------------------------------- check_doc_paths

def test_doc_paths_a_link_and_a_code_span_to_a_file_that_does_not_exist(repo: Path) -> None:
    put(repo, "docs/plant.md", "A [link](gone/file.md) and `scripts/not_a_script.py` and `docs/also-gone.md`.\n")
    r = guard(track(repo), "check_doc_paths.py")
    out = r.stdout
    assert r.returncode == 1 and "docs/plant.md:1: link to gone/file.md" in out and "names scripts/not_a_script.py" in out, out
    assert "names docs/also-gone.md" in out, out


def test_doc_paths_a_link_that_climbs_out_of_the_repository(repo: Path) -> None:
    put(repo, "docs/plant.md", "[out](../../../outside.md)\n")
    r = guard(track(repo), "check_doc_paths.py")
    assert r.returncode == 1 and "outside the repository" in r.stdout, r.stdout


# ---------------------------------------------------------------- check_content_standards

def test_content_standards_an_em_dash_and_an_emoji(repo: Path) -> None:
    put(repo, "docs/plant.md", f"A sentence {EM_DASH} with a dash.\n")
    put(repo, "frontend/src/plant.ts", f"export const x = 'ok {EMOJI}';\n")
    r = guard(track(repo), "check_content_standards.py")
    out = r.stdout
    assert r.returncode == 1 and "docs/plant.md:1" in out and "em-dash" in out and "frontend/src/plant.ts:1" in out, out


def test_content_standards_the_plant_is_the_only_new_finding(repo: Path) -> None:
    """The clean copy's output does not name the planted file and the planted copy's does: the guard reads the files."""
    track(repo)
    clean = guard(repo, "check_content_standards.py")
    put(repo, "docs/plant.md", f"x {EM_DASH} y\n")
    subprocess.run(["git", "add", "-A"], cwd=repo, check=True, capture_output=True)
    planted = guard(repo, "check_content_standards.py")
    assert planted.returncode == 1 and "docs/plant.md:1" in planted.stdout, planted.stdout
    assert "docs/plant.md" not in clean.stdout, clean.stdout


# ---------------------------------------------------------------- check_spanish_accents

SPANISH_TS = "export const text = {{ es: '{es}' }};\n"


def test_spanish_accents_an_unaccented_word_in_a_source_string(repo: Path) -> None:
    put(repo, "frontend/src/plant.ts", SPANISH_TS.format(es="la campana de voladura"))
    r = guard(track(repo), "check_spanish_accents.py")
    assert r.returncode == 1 and "frontend/src/plant.ts:1: 'campana' should be 'campaña'" in r.stdout, r.stdout


def test_spanish_accents_a_decomposed_accent_and_a_decimal_point(repo: Path) -> None:
    put(repo, "frontend/src/plant.ts", SPANISH_TS.format(es="fragmentacio" + chr(0x301) + "n") + SPANISH_TS.format(es="el valor fue 0.311"))
    r = guard(track(repo), "check_spanish_accents.py")
    out = r.stdout
    assert r.returncode == 1 and "a decomposed accent" in out and "'0.311' takes the decimal comma" in out, out


def test_spanish_accents_a_spanish_field_of_a_committed_artifact(repo: Path) -> None:
    path = repo / "data" / "derived" / "benchmark.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    data["planted"] = {"es": "una afirmacion sin tilde"}
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    r = guard(track(repo), "check_spanish_accents.py")
    assert r.returncode == 1 and "data/derived/benchmark.json/planted" in r.stdout and "afirmación" in r.stdout, r.stdout


# ---------------------------------------------------------------- check_deploy_place

def test_deploy_place_a_pages_product_with_a_vps_unit_file(repo: Path) -> None:
    put(repo, "deploy/fragmenta.service", "[Unit]\n")
    r = guard(repo, "check_deploy_place.py")
    assert r.returncode == 1 and "the target is pages and VPS files remain: fragmenta.service" in r.stdout, r.stdout


def test_deploy_place_a_pages_product_without_its_workflow_and_an_unknown_target(repo: Path) -> None:
    (repo / ".github" / "workflows" / "deploy-pages.yml").unlink()
    r = guard(repo, "check_deploy_place.py")
    assert r.returncode == 1 and "deploy-pages.yml is missing" in r.stdout, r.stdout
    (repo / "deploy" / "TARGET").write_text("both\n", encoding="utf-8")
    r = guard(repo, "check_deploy_place.py")
    assert r.returncode == 1 and "not pages or vps" in r.stdout, r.stdout


# ---------------------------------------------------------------- check_version_coherence

def test_version_coherence_a_version_stated_twice_and_disagreeing(repo: Path) -> None:
    current = json.loads((repo / "frontend" / "package.json").read_text(encoding="utf-8"))["version"]
    edit(repo, "frontend/package.json", f'"version": "{current}"', '"version": "9.9.9"')
    r = guard(repo, "check_version_coherence.py")
    assert r.returncode == 1 and "9.9.9" in r.stdout, r.stdout


def test_version_coherence_a_version_literal_in_code_and_a_malformed_version_file(repo: Path) -> None:
    put(repo, "app/plant.py", 'VERSION_LITERAL = "' + ".".join(("1", "23", "456")) + '"\n')
    r = guard(repo, "check_version_coherence.py")
    assert r.returncode == 1 and "app/plant.py:1: a version literal in code" in r.stdout, r.stdout
    (repo / "app" / "plant.py").unlink()
    (repo / "VERSION").write_text("1.2\n", encoding="utf-8")
    r = guard(repo, "check_version_coherence.py")
    assert r.returncode == 1 and "is not X.XX.XXX" in r.stdout, r.stdout


# ---------------------------------------------------------------- check_documents

def test_documents_an_index_without_a_required_field(repo: Path) -> None:
    index = repo / "data" / "derived" / "manifests" / "index.json"
    data = json.loads(index.read_text(encoding="utf-8"))
    del data["corpus_digest"]
    index.write_text(json.dumps(data), encoding="utf-8")
    r = guard(repo, "check_documents.py")
    assert r.returncode == 1 and "documents: INVALID" in r.stdout and "corpus_digest" in r.stdout, r.stdout


def test_documents_a_benchmark_with_a_schema_tag_the_contract_does_not_know(repo: Path) -> None:
    path = repo / "data" / "derived" / "benchmark.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    data["schema"] = "fragmenta.benchmark/v0"
    path.write_text(json.dumps(data), encoding="utf-8")
    r = guard(repo, "check_documents.py")
    assert r.returncode == 1 and "documents: INVALID" in r.stdout and "benchmark.json" in r.stdout, r.stdout


# ---------------------------------------------------------------- check_web_baseline

@needs_web
def test_web_baseline_the_clean_copy_passes_and_each_plant_is_named(repo: Path) -> None:
    link_node_modules(repo / "frontend")
    try:
        ok = guard(repo, "check_web_baseline.py", ok_marker="web baseline: OK")
        assert ok.returncode == 0, ok.stdout
        put(repo, "frontend/src/plant.tsx",
            "export const View = ({ v }: { v: number }) => <span className=\"plant-x\" style={{ color: 'var(--no-such-token)' }}>"
            "{v.toFixed(2)}{v.toLocaleString()}</span>;\n"
            "const loop = () => requestAnimationFrame(loop);\n")
        r = guard(repo, "check_web_baseline.py")
        out = r.stdout
        assert r.returncode == 1 and "--no-such-token" in out and "toFixed() in a view" in out, out
        assert "toLocaleString() without a locale" in out and "requestAnimationFrame outside usePausedViz" in out, out
    finally:
        unlink_node_modules(repo / "frontend")


@needs_web
def test_web_baseline_a_shell_range_instead_of_the_exact_pin(repo: Path) -> None:
    link_node_modules(repo / "frontend")
    try:
        pkg = json.loads((repo / "frontend" / "package.json").read_text(encoding="utf-8"))
        shell = pkg["dependencies"]["@fasl-work/caos-app-shell"]
        edit(repo, "frontend/package.json", f'"@fasl-work/caos-app-shell": "{shell}"', f'"@fasl-work/caos-app-shell": "^{shell}"')
        r = guard(repo, "check_web_baseline.py")
        assert r.returncode == 1 and "pin it exactly" in r.stdout, r.stdout
    finally:
        unlink_node_modules(repo / "frontend")


# ---------------------------------------------------------------- check_artifacts (merged: the template's walk and the pipeline's release gate)

@needs_engine
def test_artifacts_the_clean_copy_passes(repo: Path) -> None:
    r = guard(repo, "check_artifacts.py")
    assert r.returncode == 0 and "CONTRACT 2 OK" in r.stdout and "artifacts: OK over" in r.stdout, r.stdout


@needs_engine
def test_artifacts_a_byte_drift_a_missing_artifact_and_an_empty_one(repo: Path) -> None:
    derived = repo / "data" / "derived"
    index = json.loads((derived / "manifests" / "index.json").read_text(encoding="utf-8"))
    paths = [entry["artifact_path"] for entry in index["cases"][:3]]
    (derived / paths[0]).write_bytes((derived / paths[0]).read_bytes() + b" ")
    (derived / paths[1]).unlink()
    (derived / paths[2]).write_bytes(b"")
    r = guard(repo, "check_artifacts.py")
    out = r.stdout
    assert r.returncode == 1 and "CONTRACT 2 DRIFT" in out, out
    assert "byte drift" in out and "missing artifact" in out and "empty artifact" in out, out


@needs_engine
def test_artifacts_one_changed_value_of_the_same_size_fails_the_release_gate_digest(repo: Path) -> None:
    """The byte size matches, so the walk of contract 2 passes; only the pipeline's own gate re-computes the digest."""
    path = repo / "data" / "derived" / "benchmark.json"
    raw = path.read_bytes()
    marker = b'"verdict"'
    assert marker in raw
    # swap two different adjacent digits of one number in place: same length, different content
    i = next(k for k in range(raw.index(marker), len(raw) - 2)
             if raw[k:k + 1].isdigit() and raw[k + 1:k + 2].isdigit() and raw[k:k + 1] != raw[k + 1:k + 2])
    path.write_bytes(raw[:i] + raw[i + 1:i + 2] + raw[i:i + 1] + raw[i + 2:])
    r = guard(repo, "check_artifacts.py")
    assert r.returncode == 1 and "CONTRACT 2 OK" in r.stdout and "digest" in r.stdout.lower(), r.stdout


@needs_engine
def test_artifacts_an_undeclared_absence_is_drift(repo: Path) -> None:
    derived = repo / "data" / "derived"
    index = json.loads((derived / "manifests" / "index.json").read_text(encoding="utf-8"))
    (derived / index["models"][0]["path"]).unlink()
    r = guard(repo, "check_artifacts.py")
    assert r.returncode == 1 and "missing models file" in r.stdout, r.stdout
