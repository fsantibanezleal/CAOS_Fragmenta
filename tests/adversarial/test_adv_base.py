"""Plants for the requirements of `docs-and-guards`, `workbench-on-the-base` and the nine rows of `base-0-08` that had no
adversarial gate (CAOS_Fragmenta#33, unit V3). Each test plants the exact defect its requirement forbids in a throwaway
copy of the repository's files, runs the requirement's own gate on the copy and asserts that the planted copy fails with
the message that names the defect; the gates are run on the clean copy too (once per gate). Nothing here writes into the
real tree.

Three kinds of gate are run:
  - a guard script of `scripts/` (a subprocess, as CI runs it);
  - a Python test of `tests/test_guards.py` or `tests/test_bilingual_reasons.py`, run by pytest inside the copy;
  - a Node test of `frontend/test/` or `frontend/src/`, or the shell gate / the product's browser gate, run on the copy
    with the installed packages linked in (local-only: the checks job installs no node).
The characters the content guard bans are written as escapes here, so this file passes the guard it tests."""
from __future__ import annotations

import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

import pytest
from planting import ROOT, edit, guard
from webtools import NODE, NODE_MODULES, SHELL_INSTALLED, link_node_modules, unlink_node_modules

EM_DASH = chr(0x2014)
EMOJI = chr(0x1F600)
PLANTED_VERSION = ".".join(("9", "99", "999"))  # written in parts: the version guard reads a literal in code
needs_web = pytest.mark.skipif(NODE is None or not SHELL_INSTALLED, reason="needs node and `npm ci` in frontend/")
needs_engine = pytest.mark.skipif(importlib.util.find_spec("numpy") is None or importlib.util.find_spec("blastfrag") is None,
                                  reason="needs numpy and blastfrag (the deploy installs them; CI's guards job does not)")


@pytest.fixture(autouse=True)
def _utf8_output(monkeypatch: pytest.MonkeyPatch) -> None:
    """The guards print Spanish text and the planted glyphs; a Windows pipe would encode them in the ANSI code page."""
    monkeypatch.setenv("PYTHONUTF8", "1")


# ---------------------------------------------------------------- helpers

def put(repo: Path, rel: str, text: str | bytes) -> None:
    path = repo / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(text.encode("utf-8") if isinstance(text, str) else text)


def track(repo: Path, *forced: str) -> Path:
    """Make the copy a git repository with every file staged: the base guards read `git ls-files`. A plant in a path the
    repository ignores (a real `.env`, a `venv/`) is named in ``forced`` and staged with -f."""
    subprocess.run(["git", "init", "-q"], cwd=repo, check=True)
    subprocess.run(["git", "add", "-A"], cwd=repo, check=True, capture_output=True)
    for rel in forced:
        subprocess.run(["git", "add", "-f", rel], cwd=repo, check=True, capture_output=True)
    return repo


def bump_digit(repo: Path, rel: str, pattern: str) -> None:
    """Change the last digit of the first match of ``pattern`` in a file of the copy: a number that no longer follows its
    source. Fails when the pattern is absent (a plant that plants nothing)."""
    path = repo / rel
    text = path.read_bytes().decode("utf-8")
    m = re.search(pattern, text)
    assert m, f"{rel} has no match for {pattern!r}: the plant would change nothing"
    old = m.group(0)
    new = old[:-1] + ("7" if old[-1] != "7" else "3")
    path.write_bytes((text[:m.start()] + new + text[m.end():]).encode("utf-8"))


_clean_gates: dict[str, str] = {}


def pytest_gate(repo: Path, nodeid: str) -> subprocess.CompletedProcess:
    """Run one Python test of the copy with pytest, as the suite runs it: the root conftest is left out (it imports the
    pipeline; these gates read files), and the run is proven by the exit code and the summary line."""
    if not (repo / ".git").exists():
        track(repo)  # the spanish guard reads `git ls-files`
    r = subprocess.run([sys.executable, "-m", "pytest", "--noconftest", "-p", "no:cacheprovider", nodeid], cwd=repo,
                       capture_output=True, encoding="utf-8", errors="replace", timeout=600,
                       env={**os.environ, "PYTHONUTF8": "1"})
    assert isinstance(r.returncode, int) and ("passed" in r.stdout or "failed" in r.stdout or "error" in r.stdout), r.stdout + r.stderr
    return r


def refute_pytest(repo: Path, nodeid: str, plant, message: str) -> None:
    """The clean copy passes the gate, the planted copy fails it and the output names ``message``."""
    if nodeid not in _clean_gates:
        clean = pytest_gate(repo, nodeid)
        assert clean.returncode == 0, clean.stdout[-1500:]
        _clean_gates[nodeid] = "ok"
    plant(repo)
    bad = pytest_gate(repo, nodeid)
    assert bad.returncode == 1 and "1 failed" in bad.stdout and message in bad.stdout, bad.stdout[-2500:]


# ---------------------------------------------------------------- DG: the wiki and the guards

def test_dg001_a_number_changed_in_a_results_page_and_in_a_fact_block_is_stale(repo: Path) -> None:
    ok = guard(repo, "build_docs_results.py", "--check")
    assert ok.returncode == 0 and "docs results: up to date" in ok.stdout, ok.stdout
    original = (repo / "docs" / "results" / "01_verdict.md").read_bytes()
    bump_digit(repo, "docs/results/01_verdict.md", r"\d\.\d{3}")
    r = guard(repo, "build_docs_results.py", "--check")
    assert r.returncode == 1 and "out of date" in r.stdout and "01_verdict.md" in r.stdout, r.stdout
    (repo / "docs" / "results" / "01_verdict.md").write_bytes(original)
    bump_digit(repo, "docs/relevance.md", r"median 0\.\d{3}")  # inside the arm-kuznetsov fact block
    r = guard(repo, "build_docs_results.py", "--check")
    assert r.returncode == 1 and "out of date" in r.stdout and "relevance.md" in r.stdout, r.stdout


def test_dg002_a_number_changed_in_an_architecture_drawing_is_stale(repo: Path) -> None:
    ok = guard(repo, "build_architecture_svgs.py", "--check")
    assert ok.returncode == 0 and "up to date" in ok.stdout, ok.stdout
    drawing = repo / "frontend" / "src" / "architecture" / "04-the-science.svg"
    text = drawing.read_bytes().decode("utf-8")
    assert re.search(r"\d", text)
    drawing.write_bytes(re.sub(r"(\d)", lambda m: str((int(m.group(1)) + 1) % 10), text, count=1).encode("utf-8"))
    r = guard(repo, "build_architecture_svgs.py", "--check")
    assert r.returncode == 1 and "out of date" in r.stdout and "04-the-science.svg" in r.stdout, r.stdout


@needs_engine
def test_dg003_an_example_that_no_longer_agrees_with_the_engine_fails_the_framework_gate(repo: Path) -> None:
    """(local-only: the examples fit small models on the engine, which the checks job does not install)"""
    refute_pytest(repo, "tests/test_guards.py::test_the_framework_examples_in_the_docs_run_and_agree_with_the_engine",
                  lambda r: edit(r, "docs/frameworks/04_numpy/example.py", "[0, 1] ** 2)", "[0, 1] ** 3)"),
                  "squared correlation 0.570")


def test_dg004_a_source_article_a_real_env_a_binary_and_an_internal_package_are_each_found(repo: Path) -> None:
    track(repo)
    ok = guard(repo, "check_guards.py", ok_marker="guards: OK")
    assert ok.returncode == 0, ok.stdout
    put(repo, "docs/refs/Paper2012.pdf", b"%PDF")
    put(repo, ".env", "TOKEN=real\n")
    put(repo, "venv/lib/x.py", "x = 1\n")
    put(repo, "data/model.pth", b"\x00")
    put(repo, "data-pipeline/blastlab/__init__.py", "")
    edit(repo, "pyproject.toml", "[tool.pytest.ini_options]", '[project]\nname = "x"\n\n[tool.pytest.ini_options]')
    r = guard(track(repo, ".env", "venv/lib/x.py", "data/model.pth"), "check_guards.py")
    out = r.stdout
    assert r.returncode == 1, out
    for message in ("a source document is tracked: docs/refs/Paper2012.pdf", "a real environment file is tracked: .env",
                    "an environment or a native binary is tracked: venv/lib/x.py", "data/model.pth",
                    "an internal lab package appeared", "pyproject.toml declares a package"):
        assert message in out, f"{message!r} not found in {out}"


def test_dg005_an_unaccented_a_decomposed_and_a_mis_encoded_spanish_string_are_each_found(repo: Path) -> None:
    ok = guard(track(repo), "check_spanish_accents.py", ok_marker="spanish accents: OK")
    assert ok.returncode == 0, ok.stdout
    template = "export const text = {{ es: '{es}' }};\n"
    put(repo, "frontend/src/plant.ts", template.format(es="la campana de voladura") + template.format(es="fragmentacio" + chr(0x301) + "n")
        + template.format(es="fragmentaci" + chr(0xFFFD) + "n"))
    r = guard(track(repo), "check_spanish_accents.py")
    out = r.stdout
    assert r.returncode == 1 and "frontend/src/plant.ts:1: 'campana' should be 'campaña'" in out, out
    assert "frontend/src/plant.ts:2" in out and "a decomposed accent" in out, out
    assert "frontend/src/plant.ts:3" in out, out


def test_dg006_an_em_dash_and_an_emoji_in_tracked_content_are_found(repo: Path) -> None:
    ok = guard(track(repo), "check_content_standards.py")
    assert ok.returncode == 0 and "OK" in ok.stdout, ok.stdout
    put(repo, "docs/plant.md", f"A sentence {EM_DASH} with a dash.\n")
    put(repo, "frontend/src/plant.ts", f"export const x = 'ok {EMOJI}';\n")
    r = guard(track(repo), "check_content_standards.py")
    out = r.stdout
    assert r.returncode == 1 and "docs/plant.md:1" in out and "em-dash" in out and "frontend/src/plant.ts:1" in out, out


def test_dg007_a_pull_request_trigger_a_training_step_and_the_whole_suite_break_the_ci_budget(repo: Path) -> None:
    ok = guard(repo, "check_ci_budget.py", ok_marker="ci budget: OK")
    assert ok.returncode == 0, ok.stdout
    workflow = ".github/workflows/ci.yml"
    text = (repo / workflow).read_text(encoding="utf-8")
    assert "run: pip install pytest==" in text, "the workflow holds no allowed test step to widen"
    trigger = "on:" + chr(10) + "  push:"
    edit(repo, workflow, trigger, "on:" + chr(10) + "  pull_request:" + chr(10) + "  push:")  # a trigger on every pull request
    r = guard(repo, "check_ci_budget.py")
    assert r.returncode == 1 and "pull_request" in r.stdout, r.stdout
    edit(repo, workflow, "on:" + chr(10) + "  pull_request:" + chr(10) + "  push:", trigger)
    edit(repo, workflow, "python -m pytest tests/adversarial -q", "python -m pytest tests -q")  # the whole suite in CI
    r = guard(repo, "check_ci_budget.py")
    assert r.returncode == 1 and "tests run locally" in r.stdout, r.stdout
    edit(repo, workflow, "python -m pytest tests -q", "python -m pytest tests/adversarial -q")
    edit(repo, workflow, "run: pip install pytest==", "run: python data-pipeline/run_all.py && pip install pytest==")  # a bake
    r = guard(repo, "check_ci_budget.py")
    assert r.returncode == 1 and "trains, bakes or runs the pipeline" in r.stdout, r.stdout


def test_dg008_a_requirement_whose_gate_does_not_exist_is_named_by_the_design_guard(repo: Path) -> None:
    clean = guard(repo, "check_sdd.py")
    row = ("| DG-009 | THE planted requirement SHALL name a gate that does not exist. "
           "| `tests/test_nothing_planted.py::test_imaginary` |\n")
    path = repo / "docs" / "design" / "features" / "docs-and-guards" / "requirements.md"
    text = path.read_bytes().decode("utf-8")
    path.write_bytes((text.rstrip("\n") + "\n" + row).encode("utf-8"))
    r = guard(repo, "check_sdd.py")
    assert r.returncode == 1, r.stdout
    assert "DG-009" in r.stdout and "test_nothing_planted.py" in r.stdout, r.stdout
    assert "DG-009" not in clean.stdout, clean.stdout


# ---------------------------------------------------------------- WB: the app on the shared base (Python gates)

def test_wb001_a_shell_range_and_a_malformed_template_version_fail_the_pin_test(repo: Path) -> None:
    node = "tests/test_guards.py::test_the_shell_is_pinned_exactly_and_the_template_version_is_recorded"
    pkg = json.loads((repo / "frontend" / "package.json").read_text(encoding="utf-8"))
    pin = pkg["dependencies"]["@fasl-work/caos-app-shell"]
    refute_pytest(repo, node, lambda r: edit(r, "frontend/package.json", f'"@fasl-work/caos-app-shell": "{pin}"',
                                             f'"@fasl-work/caos-app-shell": "^{pin}"'), "not to one exact version")
    edit(repo, "frontend/package.json", f'"@fasl-work/caos-app-shell": "^{pin}"', f'"@fasl-work/caos-app-shell": "{pin}"')
    (repo / ".template-version").write_text("template whatever\n", encoding="utf-8")
    bad = pytest_gate(repo, node)
    assert bad.returncode == 1 and "template whatever" in bad.stdout, bad.stdout[-1500:]


def test_wb006_an_override_that_names_a_shell_defect_the_pinned_shell_no_longer_carries_fails(repo: Path) -> None:
    refute_pytest(repo, "tests/test_guards.py::test_every_shell_override_names_an_open_defect",
                  lambda r: put(r, "frontend/src/fragmenta.css", (r / "frontend/src/fragmenta.css").read_text(encoding="utf-8")
                                + "\n/* answers shell defect 7 */\n"), "defect 7")


def test_wb008_a_version_that_one_file_does_not_follow_fails_the_version_test_and_the_guard(repo: Path) -> None:
    node = "tests/test_guards.py::test_the_version_has_one_source_and_every_statement_of_it_follows"
    refute_pytest(repo, node, lambda r: (r / "VERSION").write_text(PLANTED_VERSION + "\n", encoding="utf-8"), "package.json says")
    r = guard(repo, "check_version_coherence.py")
    assert r.returncode == 1 and PLANTED_VERSION in r.stdout, r.stdout


@needs_web
def test_wb009_an_undefined_token_a_format_call_and_an_animation_loop_outside_the_shell_are_found(repo: Path) -> None:
    """(local-only: the baseline guard reads the shell's stylesheet, which only an installed frontend has)"""
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


def test_wb010_a_vps_unit_file_and_a_missing_pages_workflow_are_found(repo: Path) -> None:
    ok = guard(repo, "check_deploy_place.py", ok_marker="deploy place: OK")
    assert ok.returncode == 0, ok.stdout
    put(repo, "deploy/fragmenta.service", "[Unit]\n")
    r = guard(repo, "check_deploy_place.py")
    assert r.returncode == 1 and "the target is pages and VPS files remain: fragmenta.service" in r.stdout, r.stdout
    (repo / "deploy" / "fragmenta.service").unlink()
    (repo / ".github" / "workflows" / "deploy-pages.yml").unlink()
    r = guard(repo, "check_deploy_place.py")
    assert r.returncode == 1 and "deploy-pages.yml is missing" in r.stdout, r.stdout


def test_wb013_a_spanish_expected_band_with_a_decimal_point_fails_the_bake_composed_test(repo: Path) -> None:
    def plant(r: Path) -> None:
        for case in sorted((r / "data" / "derived").glob("*/case.json")):
            data = json.loads(case.read_text(encoding="utf-8"))
            if isinstance(data["case"].get("expected_band"), dict):
                data["case"]["expected_band"]["es"] += " de 0.311"
                case.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
                return
        raise AssertionError("no case carries a bilingual expected band: the plant would change nothing")

    refute_pytest(repo, "tests/test_guards.py::test_the_spanish_guard_reads_what_the_bake_composed", plant, "0.311")


# ---------------------------------------------------------------- the nine rows of base-0-08 without an adversarial gate (Python side)

@needs_engine
def test_br001_a_reason_without_its_spanish_text_fails_the_bilingual_test(repo: Path) -> None:
    """(local-only: the test imports the engine and the pipeline, which the checks job does not install)"""
    def plant(r: Path) -> None:
        for case in sorted((r / "data" / "derived").glob("*/case.json")):
            data = json.loads(case.read_text(encoding="utf-8"))
            for row in data["predictions"].values():
                for cell in row.values():
                    if isinstance(cell.get("reason"), dict):
                        cell["reason"]["es"] = ""
                        case.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
                        return
        raise AssertionError("no prediction carries a bilingual reason: the plant would change nothing")

    refute_pytest(repo, "tests/test_bilingual_reasons.py::test_every_reason_of_every_case_is_bilingual_and_non_empty", plant,
                  "is not an en/es pair")


# ---------------------------------------------------------------- Node gates: the frontend's own tests, run on the copy

needs_node_tests = needs_web
_clean_node: dict[str, str] = {}


def node_run(repo: Path, *args: str) -> subprocess.CompletedProcess:
    """Run ``node <args>`` in the copy's frontend with the installed packages linked in (a junction or a symlink that is
    removed again)."""
    link_node_modules(repo / "frontend")
    try:
        r = subprocess.run([NODE, *args], cwd=repo / "frontend", capture_output=True, encoding="utf-8", errors="replace", timeout=600)
    finally:
        unlink_node_modules(repo / "frontend")
    assert isinstance(r.returncode, int)  # a clean type check prints nothing; a failing run is judged by its message
    return r


def refute_node_test(repo: Path, rel: str, plant, message: str) -> None:
    """A Node test file of the frontend: the clean copy passes, the planted copy fails and the output names ``message``
    (the title of the test that failed, or what it said)."""
    if rel not in _clean_node:
        clean = node_run(repo, "--import", "tsx", "--test", rel)
        assert clean.returncode == 0, (clean.stdout + clean.stderr)[-2000:]
        _clean_node[rel] = "ok"
    plant(repo)
    bad = node_run(repo, "--import", "tsx", "--test", rel)
    out = bad.stdout + bad.stderr
    assert bad.returncode != 0 and message in out, out[-2500:]


def edit_all(repo: Path, rel: str, old: str, new: str) -> None:
    edit(repo, rel, old, new, count=-1)


@needs_node_tests
def test_rt001_a_root_that_renders_the_app_instead_of_the_landing_fails_the_route_test(repo: Path) -> None:
    """(local-only: needs node and the installed frontend, which the checks job does not install)"""
    refute_node_test(repo, "test/routes.test.ts", lambda r: edit(r, "frontend/src/routes.ts", "{ path: '/', page: 'landing' }",
                                                                 "{ path: '/', page: 'app' }"),
                     "the root and an unknown path render the landing")


@needs_node_tests
def test_rt002_an_app_moved_off_app_fails_the_route_tests(repo: Path) -> None:
    """(local-only: needs node and the installed frontend, which the checks job does not install)"""
    refute_node_test(repo, "test/routes.test.ts", lambda r: edit(r, "frontend/src/routes.ts", "{ path: '/app', page: 'app' }",
                                                                 "{ path: '/workbench', page: 'app' }"),
                     "every standard route has its own entry in the table, and the App is /app")


@needs_node_tests
def test_rt003_a_focus_forward_that_does_not_encode_the_case_id_fails_the_route_test(repo: Path) -> None:
    """(local-only: needs node and the installed frontend, which the checks job does not install)"""
    refute_node_test(repo, "test/routes.test.ts", lambda r: edit(r, "frontend/src/routes.ts", "case=${encodeURIComponent(caseId)}",
                                                                 "case=${caseId}"),
                     "a case id is encoded, so an odd id cannot add a parameter")


@needs_node_tests
def test_ev002_an_illustration_with_a_hard_coded_colour_and_a_moved_slot_fail_the_illustration_tests(repo: Path) -> None:
    """(local-only: needs node and the installed frontend, which the checks job does not install)"""
    rel = "test/illustrations.test.ts"
    refute_node_test(repo, rel, lambda r: edit(r, "frontend/public/executive/pain.svg", 'fill="var(--color-accent)"', 'fill="#ff0000"'),
                     "every fill, stroke and stop-color is a theme token")
    edit(repo, "frontend/public/executive/pain.svg", 'fill="#ff0000"', 'fill="var(--color-accent)"')
    edit(repo, "frontend/public/executive/proposal.svg", 'data-slot="rig"', 'data-slot="rig" data-moved="1"')
    bad = node_run(repo, "--import", "tsx", "--test", rel)
    assert bad.returncode != 0 and "pain and proposal share one layout" in bad.stdout + bad.stderr, (bad.stdout + bad.stderr)[-2000:]


@needs_node_tests
def test_pg001_a_methodology_page_with_a_topic_removed_fails_the_floor_test(repo: Path) -> None:
    """(local-only: needs node and the installed frontend, which the checks job does not install)"""
    path = repo / "frontend" / "src" / "pages" / "methodology" / "index.ts"
    lines = path.read_bytes().decode("utf-8").split("\n")
    kept = [ln for ln in lines if "id: 'ensembles'" not in ln]
    assert len(kept) == len(lines) - 1, "the topic row is absent: the plant would change nothing"
    refute_node_test(repo, "test/methodology.test.ts", lambda r: path.write_bytes("\n".join(kept).encode("utf-8")),
                     "the page has the six method topics of the mapping")


@needs_node_tests
def test_pg002_a_citation_that_is_not_defined_fails_the_citation_test(repo: Path) -> None:
    """(local-only: needs node and the installed frontend, which the checks job does not install)"""
    refute_node_test(repo, "test/citations.test.ts",
                     lambda r: edit(r, "frontend/src/pages/methodology/Distributions.tsx", '<Cite id="hudaverdi2010" />',
                                    '<Cite id="source-that-nobody-defined" />'),
                     "every id a section lists, and every inline Cite, is defined")


@needs_node_tests
def test_ct003_a_schema_changed_without_regenerating_the_types_fails_the_currency_check(repo: Path) -> None:
    """(local-only: needs node and the installed frontend, which the checks job does not install)"""
    ok = node_run(repo, "scripts/gen-contract-types.mjs", "--check")
    assert ok.returncode == 0 and "contract types: current" in ok.stdout, ok.stdout + ok.stderr
    schema = repo / "docs" / "contracts" / "schemas" / "case-index.schema.json"
    original = schema.read_bytes()
    doc = json.loads(original.decode("utf-8"))
    doc["properties"]["planted_field"] = {"type": "string"}
    schema.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8", newline="\n")
    bad = node_run(repo, "scripts/gen-contract-types.mjs", "--check")
    assert bad.returncode == 1 and "contract.gen.ts is not current" in bad.stdout + bad.stderr, bad.stdout + bad.stderr
    # the other side: the generated file edited by hand to drop a field the schema names is caught by the same check
    schema.write_bytes(original)
    gen = repo / "frontend" / "src" / "lib" / "contract.gen.ts"
    text = gen.read_text(encoding="utf-8")
    assert "corpus_digest" in text
    gen.write_text(text.replace("corpus_digest", "corpus_digest_gone", 1), encoding="utf-8", newline="\n")
    bad = node_run(repo, "scripts/gen-contract-types.mjs", "--check")
    assert bad.returncode == 1 and "contract.gen.ts is not current" in bad.stdout + bad.stderr, bad.stdout + bad.stderr


# ---------------------------------------------------------------- the shell gate and the product's browser gate, on a built copy
#
# Local-only: they need node, the installed frontend, a Playwright browser (PLAYWRIGHT_BROWSERS_PATH) and take minutes. The
# plants are planted in the SOURCE of a copy, the copy is built with vite (as `npm run build` does, without the type
# check, which the plants do not break), and the gate is run on its dist. The requirements share three builds so that
# a gate runs as few times as possible; each test reads the output of the run that holds its plant. The clean copy of
# these gates is the product's release gate (run on the real tree in the unit's report); here the planted run is also
# required to name only the planted defects.

BROWSERS = Path(os.environ.get("PLAYWRIGHT_BROWSERS_PATH", ""))
GATE_READY = NODE is not None and SHELL_INSTALLED and (NODE_MODULES / "playwright").is_dir() and BROWSERS.is_dir() \
    and any(BROWSERS.glob("chromium*"))
needs_gate = pytest.mark.skipif(not GATE_READY, reason="needs node, the installed frontend, and a Playwright browser")
SHELL_ARGS = ["--sizes", "1280x800", "--themes", "light", "--langs", "en", "--no-wide-font", "--settle-ms", "2000", "--idle-ms", "1000"]


def build_site(site: Path) -> None:
    """Build the copy's frontend with vite, with the installed packages linked in (left linked: the caller unlinks)."""
    frontend = site / "frontend"
    link_node_modules(frontend)
    for args in (["copy-data.mjs"], [str(NODE_MODULES / "vite" / "bin" / "vite.js"), "build", "--logLevel", "error"], ["spa-404.mjs"]):
        r = subprocess.run([NODE, *args], cwd=frontend, capture_output=True, encoding="utf-8", errors="replace", timeout=300)
        assert r.returncode == 0, (r.stdout + r.stderr)[-2000:]
    assert (frontend / "dist" / "index.html").is_file()


def planted_site(base_copy: Path, tmp_path_factory: pytest.TempPathFactory, name: str, *plants) -> Path:
    site = tmp_path_factory.mktemp(name) / "repo"
    shutil.copytree(base_copy, site)
    for plant in plants:
        plant(site)
    return site


def shell_gate(site: Path, *args: str) -> str:
    """Build the planted copy and run the product's wrapper of the shell gate on it; returns stdout and stderr."""
    build_site(site)
    try:
        env = {**os.environ, "GATE_OUT": str(site / "gate-output")}
        r = subprocess.run([NODE, "scripts/gate.mjs", *args], cwd=site / "frontend", capture_output=True, encoding="utf-8",
                           errors="replace", timeout=1500, env=env)
    finally:
        unlink_node_modules(site / "frontend")
    out = r.stdout + r.stderr
    assert r.returncode == 1 and "FAIL [" in out, out[-2500:]
    return out


def free_port() -> int:
    import socket

    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def browser_gate(site: Path) -> str:
    """Build the planted copy, serve its dist on a free port (never a port another session holds) and run the product's own
    browser gate against it; the preview is always stopped."""
    build_site(site)
    port = free_port()
    preview = subprocess.Popen([NODE, str(NODE_MODULES / "vite" / "bin" / "vite.js"), "preview", "--port", str(port), "--strictPort",
                                "--host", "127.0.0.1"], cwd=site / "frontend", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        deadline = time.time() + 30
        while time.time() < deadline:
            try:
                import urllib.request

                urllib.request.urlopen(f"http://127.0.0.1:{port}/", timeout=2).close()
                break
            except OSError:
                time.sleep(0.5)
        else:
            raise AssertionError("the preview server did not start")
        r = subprocess.run([NODE, "scripts/browser-gate.mjs", "--url", f"http://127.0.0.1:{port}"], cwd=site / "frontend",
                           capture_output=True, encoding="utf-8", errors="replace", timeout=1800)
    finally:
        preview.terminate()
        try:
            preview.wait(timeout=15)
        except subprocess.TimeoutExpired:
            preview.kill()
        unlink_node_modules(site / "frontend")
    out = r.stdout + r.stderr
    assert r.returncode == 1 and "FRAGMENTA GATE FAILED" in out, out[-2500:]
    return out


def failures(out: str, check: str) -> list[str]:
    return [ln for ln in out.splitlines() if ln.startswith(f"FAIL [{check}]")]


# The three builds of the shell gate. A: the App with the Focus control removed, its instrument shrunk and its views stuck on
# one selection key (RT-004, WB-003, WB-004). B: a route that is not a workbench and an Introduction that opens on the technical
# view (WB-002, EV-003).

def _plant_focus_and_shrink(site: Path) -> None:
    edit(site, "frontend/src/workbench/Workbench.tsx", "        focus\n        group={shownGroup}", "        group={shownGroup}")
    path = site / "frontend" / "src" / "fragmenta.css"
    path.write_bytes(path.read_bytes() + b"\n[data-instrument] { max-width: 30vw !important; max-height: 30vh !important; overflow: hidden; }\n")


def _plant_stale_keys(site: Path) -> None:
    # the rock factor plot alone, which stays on the key of the first selection while the rail changes
    edit(site, "frontend/src/workbench/views.tsx", "dataKey={sel.stateKey}"+chr(10)+"      note={{"+chr(10)+"        en: 'Two primary sources publish",
         'dataKey="fixed"'+chr(10)+"      note={{"+chr(10)+"        en: 'Two primary sources publish")
    # and the same plot without its lane
    edit(site, "frontend/src/workbench/views.tsx", '      lane="live"'+chr(10)+'      provenance="published"'+chr(10)+'      dataKey="fixed"',
         '      provenance="published"'+chr(10)+'      dataKey="fixed"')


def _plant_not_a_workbench(site: Path) -> None:
    edit(site, "frontend/src/main.tsx", "app: <Workbench />,", "app: <div>The App is a plain page.</div>,")


def _plant_introduction_on_the_technical_view(site: Path) -> None:
    path = site / "frontend" / "src" / "pages" / "Introduction.tsx"
    lines = path.read_bytes().decode("utf-8").split("\n")
    i = next(k for k, ln in enumerate(lines) if "{ id: 'executive'" in ln)
    j = next(k for k, ln in enumerate(lines) if "{ id: 'technical'" in ln)
    assert j == i + 1, "the two views are not on consecutive lines: the plant would change nothing"
    lines[i], lines[j] = lines[j], lines[i]
    path.write_bytes("\n".join(lines).encode("utf-8"))


@pytest.fixture(scope="module")
def app_gate(base_copy: Path, tmp_path_factory: pytest.TempPathFactory) -> str:
    site = planted_site(base_copy, tmp_path_factory, "gate-app", _plant_focus_and_shrink)
    return shell_gate(site, "--routes", "/app", *SHELL_ARGS)


@pytest.fixture(scope="module")
def key_gate(base_copy: Path, tmp_path_factory: pytest.TempPathFactory) -> str:
    site = planted_site(base_copy, tmp_path_factory, "gate-key", _plant_stale_keys)
    return shell_gate(site, "--routes", "/app", *SHELL_ARGS)


@pytest.fixture(scope="module")
def structure_gate(base_copy: Path, tmp_path_factory: pytest.TempPathFactory) -> str:
    site = planted_site(base_copy, tmp_path_factory, "gate-structure", _plant_not_a_workbench, _plant_introduction_on_the_technical_view)
    return shell_gate(site, "--routes", "/app,/introduction", *SHELL_ARGS)


@needs_gate
def test_rt004_an_app_without_its_focus_control_fails_the_shell_gate_run_with_require_focus(app_gate: str) -> None:
    """(local-only: needs node, a built site and a Playwright browser, minutes per run; the build is shared with WB-003 and WB-004)"""
    assert any("the App offers no Focus control" in ln for ln in failures(app_gate, "G18")), app_gate[-2500:]


@needs_gate
def test_wb003_an_instrument_shrunk_below_half_the_viewport_fails_the_shell_gate(app_gate: str) -> None:
    """(local-only: shares the build and the run of the Focus plant)"""
    assert any("the drawn views cover" in ln and "floor 50% on the App route" in ln for ln in failures(app_gate, "G6")), app_gate[-2500:]


@needs_gate
def test_wb005_a_view_without_its_lane_fails_the_shell_gate(key_gate: str) -> None:
    """(local-only: needs node, a built site and a Playwright browser, shared build with the selection key plant)
    The shell reports a PlotCard that declares no lane or provenance as a console error, which the gate fails (G3)."""
    assert any("needs lane and provenance" in ln for ln in failures(key_gate, "G3")), key_gate[-2500:]


@needs_gate
def test_wb004_views_that_keep_an_earlier_selection_key_fail_the_shell_gate(key_gate: str) -> None:
    """(local-only: needs node, a built site and a Playwright browser, minutes per run)"""
    assert any("still show an earlier selection" in ln for ln in failures(key_gate, "G9")), key_gate[-2500:]


@needs_gate
def test_wb002_an_app_route_that_is_not_one_case_workbench_fails_the_shell_gate(structure_gate: str) -> None:
    """(local-only: needs node, a built site and a Playwright browser, minutes per run; the build is shared with EV-003)
    The gate measures that the route is one CaseWorkbench with a case control; it does not count the question groups."""
    assert any("no [data-case-workbench] on a workbench route" in ln for ln in failures(structure_gate, "G9")), structure_gate[-2500:]


@needs_gate
def test_ev003_an_introduction_that_opens_on_the_technical_view_fails_the_shell_gate(structure_gate: str) -> None:
    """(local-only: shares the build and the run of the plain App plant)"""
    assert any('opened the Introduction on the "technical" view' in ln for ln in failures(structure_gate, "G4")), structure_gate[-2500:]


@pytest.fixture(scope="module")
def browser_gate_run(base_copy: Path, tmp_path_factory: pytest.TempPathFactory) -> str:
    def overflow(site: Path) -> None:
        path = site / "frontend" / "src" / "fragmenta.css"
        path.write_bytes(path.read_bytes() + b"\nbody { min-width: 2400px; }\n")

    def overlapping_labels(site: Path) -> None:
        edit(site, "frontend/src/workbench/design.tsx", "data-chart-rows={DESIGN_ARMS.filter((a) => answers[a]?.value !== undefined).length}>",
             "data-chart-rows={DESIGN_ARMS.filter((a) => answers[a]?.value !== undefined).length}>"
             '<text x="12" y="24">overlap one</text><text x="12" y="24">overlap two</text>')

    def seventh_topic(site: Path) -> None:
        path = site / "frontend" / "src" / "pages" / "methodology" / "index.ts"
        lines = path.read_bytes().decode("utf-8").split(chr(10))
        i = next(k for k, ln in enumerate(lines) if "id: 'ensembles'" in ln)
        lines.insert(i + 1, lines[i].replace("id: 'ensembles'", "id: 'ensembles-again'"))
        path.write_bytes(chr(10).join(lines).encode("utf-8"))

    site = planted_site(base_copy, tmp_path_factory, "gate-browser", overflow, overlapping_labels, seventh_topic)
    return browser_gate(site)


@needs_gate
def test_wb007_a_route_that_scrolls_horizontally_fails_the_product_browser_gate(browser_gate_run: str) -> None:
    """(local-only: needs node, a built site and a Playwright browser, minutes per run; the build is shared with WB-012)"""
    assert "the document scrolls horizontally" in browser_gate_run, browser_gate_run[-2500:]


@needs_gate
def test_wb012_two_labels_on_one_another_in_a_drawn_view_fail_the_product_browser_gate(browser_gate_run: str) -> None:
    """(local-only: shares the build and the run of the horizontal overflow plant)"""
    assert "overlap one" in browser_gate_run and "overlaps" in browser_gate_run and "label fault" in browser_gate_run, browser_gate_run[-2500:]


@needs_gate
def test_wb011_a_seventh_peer_topic_on_a_documentation_page_fails_the_product_browser_gate(browser_gate_run: str) -> None:
    """(local-only: shares the build and the run of the overflow plant; the shell logs the peer tab count as a console error)"""
    assert "peer" in browser_gate_run and "at most 6" in browser_gate_run, browser_gate_run[-2500:]
