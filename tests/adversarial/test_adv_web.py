"""Adversarial checks of the web features (live-lanes, hygiene, response-surface, site): one planted defect per
requirement, in a throwaway copy of the repository, and the requirement's own gate run on the copy.

Three kinds of gate are held here:

* the Node tests of ``frontend/test`` and ``frontend/src/lib`` (live-lanes, the response surface and the size unit):
  a defect is planted in the copy of the frontend source or of the committed data, the named test is run with Node
  on the copy (the real ``node_modules`` is linked in, see ``webtools.py``), and it must fail by name, while the same
  test passes on the clean copy;
* the Spanish guards of ``tests/test_guards.py`` (HY-003, HY-004): a Spanish string with the error is planted in a copy
  of the source and the guard's own test is run there;
* the browser gate ``frontend/scripts/browser-gate.mjs`` (the rest of hygiene, the response surface's marker and
  declaration, and all of the site): the planted source is built and served on port 4191, the gate runs against it,
  and every requirement's failure message must be in its output, while a clean build passes the same gate. One build
  carries many plants (the messages are distinct), so the gate runs five times in all: the clean control, the planted
  build, two builds for the plants that would hide the others (a console error with the font plant, and a wrapped tab
  strip) and the clean build under the runner's fonts (the control of the font plant).

The Node tests need node and ``npm ci`` in ``frontend/``; the browser tests need, besides, a Playwright browser. Each
skips with that precondition when it is absent (CI's checks job has none of them; the template allows it). To keep a
run affordable the gate copy is cut to the 1600x900 viewport in the light theme and drops the phone and tablet sweep
(``subset_gate``); the rules are measured at that size and the full matrix is the deploy's. Nothing here writes into
the real tree."""
from __future__ import annotations

import json
import os
import re
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path

import pytest
from planting import edit
from webtools import NODE, NODE_MODULES, SHELL_INSTALLED, link_node_modules, unlink_node_modules

needs_node = pytest.mark.skipif(NODE is None or not SHELL_INSTALLED, reason="needs node and `npm ci` in frontend/")

TAP_RESULT = re.compile(r"^\s*(not ok|ok) \d+ - (.*?)(?: # (?:SKIP|TODO).*)?$")


@pytest.fixture(autouse=True)
def _utf8_output(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PYTHONUTF8", "1")


@pytest.fixture
def web(repo: Path):
    """The copy with the real node_modules linked into its frontend; the link is removed before the copy goes."""
    link_node_modules(repo / "frontend")
    try:
        yield repo
    finally:
        unlink_node_modules(repo / "frontend")


def run_node(repo: Path, files: str | list[str], names: list[str]) -> tuple[int, dict[str, bool], str]:
    """Run the named Node tests of ``files`` (paths under ``frontend/``) on the copy; returns the exit code, the result of
    each test that ran (True for ok) and the output. A name is matched whole, so a test with a longer name does not run."""
    cmd = [NODE, "--import", "tsx", "--test", "--test-reporter=tap"]
    cmd += [f"--test-name-pattern=^{re.escape(n)}$" for n in names]
    cmd += [files] if isinstance(files, str) else files
    r = subprocess.run(cmd, cwd=repo / "frontend", capture_output=True, encoding="utf-8", errors="replace", timeout=300)
    results: dict[str, bool] = {}
    for line in r.stdout.splitlines():
        m = TAP_RESULT.match(line)
        if m:
            results[m.group(2)] = m.group(1) == "ok"
    return r.returncode, results, r.stdout + r.stderr


def assert_clean(repo: Path, files: str | list[str], names: list[str]) -> None:
    code, results, out = run_node(repo, files, names)
    assert code == 0, out[-1500:]
    missing = [n for n in names if results.get(n) is not True]
    assert not missing, f"these gates did not run and pass on the clean copy: {missing}\n{out[-1500:]}"


def assert_caught(repo: Path, files: str | list[str], names: list[str]) -> None:
    """The planted copy: the gate exits non-zero and every named test ran and failed (a plant that failed only a neighbour
    does not count)."""
    code, results, out = run_node(repo, files, names)
    assert code != 0, f"the gate passed on the planted copy:\n{out[-1500:]}"
    survived = [n for n in names if results.get(n) is not False]
    assert not survived, f"these gates did not fail on the plant: {survived}\n{out[-2500:]}"


PARITY = "test/parity.test.ts"
LEARNED = "test/learned.test.ts"
SURFACE = "test/surface.test.ts"
CONTRACT = "src/lib/contract.test.ts"
LIVE = "src/engine/live.ts"
LEARNED_SRC = "src/engine/learned.ts"
SURFACE_SRC = "src/engine/surface.ts"
ARTIFACTS = "src/lib/artifacts.ts"


def fe(rel: str) -> str:
    return f"frontend/{rel}"


# ---------------------------------------------------------------- the clean copy passes every Node gate used below

LV001 = ["the classical mean size matches the baked value on every reconstructable blast"]
LV002 = ["the published regression matches the baked value on every blast", "the group router agrees with the baked group on every blast",
         "the two published groups stay perfectly separated by the discriminant"]
LV003 = ["the distribution curves match the baked ones point for point", "the three-parameter curve matches the baked one",
         "the percentiles the artifact carries are reproduced in the browser", "the sieve grid is the same one the bake used"]
LV004 = ["the geometry reconstruction matches the baked pattern"]
LV005 = ["the browser refuses exactly the designs the bake refused as not a blast", "a normal blast is not flagged as degenerate"]
LV006 = ["the plausible range agrees with the engine that baked the artifacts"]
LV007 = ["the walker reproduces every fitted model at every fixture", "the learned predictions the App replays are what the shipped models return"]
LV008 = ["a design outside the physical range is refused, not drawn"]
LV009_FIELDS = "every field in every shipped artifact is named in the generated TypeScript types"
LV009_GEN = "contract.gen.ts names every property of every schema (the field-name check of the former mirror, on the generated file)"
LV009_ARMS = "every arm in every shipped artifact has an entry in the arm catalogue"
LV010 = ["an arm declared as sharing a mean size predicts it and scores as its source on every case"]
HY001_UNIT = "every fragment size is stated in one unit, whatever its magnitude"
RS001 = ["the surface is the live engine evaluated on its grid"]
RS002 = ["the iso-lines separate the cells above their level from the cells below"]
RS003 = ["a cell that is not a blast is left empty with its reason"]
RS006 = ["a learned surface uses the models of the case’s own training scope"]


@needs_node
def test_every_node_gate_passes_on_the_clean_copy(web: Path) -> None:
    assert_clean(web, PARITY, LV001 + LV002 + LV003 + LV004 + LV005 + LV006 + LV010 + [LV009_FIELDS, LV009_ARMS, HY001_UNIT])
    assert_clean(web, LEARNED, LV007 + LV008)
    assert_clean(web, CONTRACT, [LV009_GEN])
    assert_clean(web, SURFACE, RS001 + RS002 + RS003 + RS006)


# ---------------------------------------------------------------- live-lanes

@needs_node
def test_lv001_a_wrong_size_exponent_in_the_classical_mean_size_is_found(web: Path) -> None:
    edit(web, fe(LIVE), "Math.pow(volume / charge, 0.8)", "Math.pow(volume / charge, 0.79)")
    assert_caught(web, PARITY, LV001)


@needs_node
def test_lv002_a_distorted_discriminant_and_a_changed_intercept_are_found(web: Path) -> None:
    edit(web, fe(LIVE), "  E_GPa: 0.208,", "  E_GPa: -3.208,")
    edit(web, fe(LIVE), "    intercept: 0.6,", "    intercept: 0.7,")
    assert_caught(web, PARITY, LV002)


@needs_node
def test_lv003_a_drifted_curve_a_broken_tail_a_nearest_point_percentile_and_a_short_grid_are_found(web: Path) -> None:
    edit(web, fe(LIVE), "1 - Math.exp(-Math.LN2 * Math.pow(x / x50M, uniformity))", "1 - Math.exp(-0.69 * Math.pow(x / x50M, uniformity))")
    edit(web, fe(LIVE), "    return 1 / (1 + f);", "    return 1 / (1 + 1.02 * f);")
    edit(web, fe(LIVE), "      return Math.exp(Math.log(sizesM[i - 1]) + t * (Math.log(sizesM[i]) - Math.log(sizesM[i - 1])));\n    }\n  }\n  return sizesM[sizesM.length - 1];\n}\n\n/** The fraction",
         "      return sizesM[i];\n    }\n  }\n  return sizesM[sizesM.length - 1];\n}\n\n/** The fraction")
    edit(web, fe(LIVE), "n = 241", "n = 240")
    assert_caught(web, PARITY, LV003)


@needs_node
def test_lv004_a_skewed_spacing_in_the_geometry_reconstruction_is_found(web: Path) -> None:
    edit(web, fe(LIVE), "spacingM: blast.S_over_B * burdenM,", "spacingM: blast.S_over_B * burdenM * 1.02,")
    assert_caught(web, PARITY, LV004)


@needs_node
def test_lv005_a_check_that_flags_a_normal_blast_and_one_that_lets_a_degenerate_design_through_are_found(web: Path) -> None:
    # Over-eager: the charge fraction floor rises until a normal blast is flagged; only the second gate may notice.
    edit(web, fe(LIVE), "if (charged < 0.05) {", "if (charged < 0.99) {")
    assert_caught(web, PARITY, ["a normal blast is not flagged as degenerate"])
    edit(web, fe(LIVE), "if (charged < 0.99) {", "if (charged < 0.05) {")
    # Blind: no design is ever refused; only the first gate may notice.
    edit(web, fe(LIVE), "if (blast.T_over_B >= blast.H_over_B) {", "if (false) {")
    edit(web, fe(LIVE), "if (charged < 0.05) {", "if (false) {")
    assert_caught(web, PARITY, ["the browser refuses exactly the designs the bake refused as not a blast"])


@needs_node
def test_lv006_a_widened_plausible_range_is_found(web: Path) -> None:
    edit(web, fe(LIVE), "PLAUSIBLE_X50_M: [number, number] = [0.001, 3]", "PLAUSIBLE_X50_M: [number, number] = [0.001, 5]")
    assert_caught(web, PARITY, LV006)


@needs_node
def test_lv007_a_logistic_that_drifts_in_the_network_walker_is_found(web: Path) -> None:
    edit(web, fe(LEARNED_SRC), "1 / (1 + Math.exp(-v))", "1 / (1 + Math.exp(-1.001 * v))")
    assert_caught(web, LEARNED, LV007)


@needs_node
def test_lv008_a_walker_that_no_longer_refuses_a_value_above_the_range_is_found(web: Path) -> None:
    edit(web, fe(LEARNED_SRC), "value < low || value > high", "value < low")
    assert_caught(web, LEARNED, LV008)


@needs_node
def test_lv009_a_field_the_generated_types_stopped_naming_and_an_arm_the_catalogue_forgot_are_found(web: Path) -> None:
    text = (web / fe("src/lib/contract.gen.ts")).read_text(encoding="utf-8")
    assert "best_learned_is_positive" in text
    (web / fe("src/lib/contract.gen.ts")).write_text(text.replace("best_learned_is_positive", "best_learned_is_renamed"), encoding="utf-8", newline="")
    edit(web, fe(ARTIFACTS), "    id: 'svr-rbf',", "    id: 'svr-rbf-planted',")
    assert_caught(web, PARITY, [LV009_FIELDS, LV009_ARMS])
    assert_caught(web, CONTRACT, [LV009_GEN])


@needs_node
def test_lv010_an_arm_that_shares_a_mean_size_but_predicts_another_is_found(web: Path) -> None:
    path = web / "data" / "derived" / "real-murgul" / "case.json"
    doc = json.loads(path.read_text(encoding="utf-8"))
    cell = next(iter(doc["predictions"]["swebrec"].values()))
    assert cell["x50_m"] is not None
    cell["x50_m"] = round(cell["x50_m"] + 0.01, 6)
    path.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
    assert_caught(web, PARITY, LV010)


# ---------------------------------------------------------------- hygiene (the Node, the Spanish-guard and the browser gates)

@needs_node
def test_hy001_a_size_stated_in_millimetres_below_ten_centimetres_is_found_by_the_unit_test(web: Path) -> None:
    edit(web, fe(ARTIFACTS), "return `${num(metres * 100, 1)} cm`;",
         "return metres < 0.1 ? `${num(metres * 1000, 0)} mm` : `${num(metres * 100, 1)} cm`;")
    assert_caught(web, PARITY, [HY001_UNIT])


def track(repo: Path) -> Path:
    """Make the copy a git repository with every file staged: the Spanish guard reads `git ls-files`."""
    subprocess.run(["git", "init", "-q"], cwd=repo, check=True)
    subprocess.run(["git", "add", "-A"], cwd=repo, check=True, capture_output=True)
    return repo


def spanish_gate(repo: Path, name: str) -> subprocess.CompletedProcess:
    """The product's own gate test (tests/test_guards.py) run on the copy, with the pipeline's plugins off."""
    return subprocess.run([sys.executable, "-m", "pytest", f"tests/test_guards.py::{name}", "-p", "no:cacheprovider", "--no-header"],
                          cwd=repo, capture_output=True, encoding="utf-8", errors="replace", timeout=300)


ESTA = "test_the_spanish_surface_writes_the_verb_esta_where_a_participle_follows"
EL = "test_the_spanish_surface_writes_the_pronoun_el_before_punctuation"


def test_hy003_hy004_the_spanish_gates_pass_on_the_clean_copy(repo: Path) -> None:
    track(repo)
    for name in (ESTA, EL):
        r = spanish_gate(repo, name)
        assert r.returncode == 0 and "1 passed" in r.stdout, r.stdout[-1500:]


def test_hy003_a_participle_after_the_unaccented_esta_in_a_spanish_string_is_found(repo: Path) -> None:
    (repo / "frontend" / "src" / "plant.ts").write_text("export const text = { es: 'la instalación esta rota' };\n", encoding="utf-8")
    r = spanish_gate(track(repo), ESTA)
    assert r.returncode == 1 and "needs the verb" in r.stdout and "frontend/src/plant.ts:1" in r.stdout, r.stdout[-2500:]


def test_hy004_the_unaccented_pronoun_before_a_full_stop_in_a_spanish_string_is_found(repo: Path) -> None:
    (repo / "frontend" / "src" / "plant.ts").write_text("export const text = { es: 'ningún modelo puede correr sobre el.' };\n", encoding="utf-8")
    r = spanish_gate(track(repo), EL)
    assert r.returncode == 1 and "needs the pronoun" in r.stdout and "frontend/src/plant.ts:1" in r.stdout, r.stdout[-2500:]


# ---------------------------------------------------------------- response surface (the Node gates)

@needs_node
def test_rs001_a_cell_evaluated_on_a_shifted_burden_is_found(web: Path) -> None:
    edit(web, fe(SURFACE_SRC), "const cellDesign = { ...design, B_over_D: b, S_over_B: s };", "const cellDesign = { ...design, B_over_D: b * 1.05, S_over_B: s };")
    assert_caught(web, SURFACE, RS001)


@needs_node
def test_rs002_an_iso_line_that_misclassifies_one_corner_of_a_square_is_found(web: Path) -> None:
    edit(web, fe(SURFACE_SRC), "(a >= level ? 1 : 0)", "(a <= level ? 1 : 0)")
    assert_caught(web, SURFACE, RS002)


@needs_node
def test_rs003_an_empty_cell_that_loses_its_reason_is_found(web: Path) -> None:
    edit(web, fe(SURFACE_SRC), "reason: value === null ? answer.reason : null", "reason: null")
    assert_caught(web, SURFACE, RS003)


@needs_node
def test_rs006_a_held_out_case_that_names_the_corpus_models_is_found(web: Path) -> None:
    path = web / "data" / "derived" / "real-murgul" / "case.json"
    doc = json.loads(path.read_text(encoding="utf-8"))
    assert doc["live_models"]["scope"] == "Murgul"
    doc["live_models"]["path"] = "models/corpus.json"
    doc["live_models"]["scope"] = "corpus"
    path.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
    assert_caught(web, SURFACE, RS006)


# ---------------------------------------------------------------- the browser gate

GATE = "frontend/scripts/browser-gate.mjs"
PORT = int(os.environ.get("ADV_WEB_PORT", "4191"))


def needed_chromium_folders(node_modules: Path = NODE_MODULES) -> list[str]:
    """The folders under the browsers path that hold the Chromium build the installed ``playwright-core`` runs: the
    revision its ``browsers.json`` declares, for the headless shell (the default of a headless launch) or the full
    chromium. Empty when ``playwright-core`` is not installed (the needed build is then unknown)."""
    try:
        listing = json.loads((node_modules / "playwright-core" / "browsers.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    revisions = {b["name"]: b["revision"] for b in listing.get("browsers", []) if "revision" in b}
    return [f"{name.replace('-', '_')}-{revisions[name]}" for name in ("chromium-headless-shell", "chromium") if name in revisions]


def browser_available(roots: list[str] | None = None, node_modules: Path = NODE_MODULES) -> bool:
    """The Chromium build the product's Playwright needs is installed (BL-053): in PLAYWRIGHT_BROWSERS_PATH when set,
    else in the OS default cache. Any other chromium folder (another revision) does not count, because the browser
    plants would fail on "Executable doesn't exist" instead of skipping."""
    if roots is None:
        roots = [os.environ.get("PLAYWRIGHT_BROWSERS_PATH", "")]
        roots.append(str(Path(os.environ.get("LOCALAPPDATA", "")) / "ms-playwright") if os.name == "nt" else str(Path.home() / ".cache" / "ms-playwright"))
    needed = needed_chromium_folders(node_modules)
    return any(r and Path(r).is_dir() and any((Path(r) / n).is_dir() for n in needed) for r in roots)


needs_browser = pytest.mark.skipif(NODE is None or not SHELL_INSTALLED or not browser_available(),
                                   reason="needs node, `npm ci` in frontend/ and a Playwright browser (PLAYWRIGHT_BROWSERS_PATH)")


def _fake_playwright(root: Path, shell_rev: str = "1194", chromium_rev: str = "1194") -> Path:
    """A ``node_modules`` holding only the ``browsers.json`` of a ``playwright-core`` that needs the given revisions."""
    core = root / "node_modules" / "playwright-core"
    core.mkdir(parents=True)
    (core / "browsers.json").write_text(json.dumps({"browsers": [
        {"name": "chromium", "revision": chromium_rev}, {"name": "chromium-headless-shell", "revision": shell_rev},
        {"name": "firefox", "revision": "1495"}]}), encoding="utf-8")
    return root / "node_modules"


def test_bl053_a_browsers_folder_holding_only_another_revision_is_not_available(tmp_path: Path) -> None:
    modules = _fake_playwright(tmp_path)
    browsers = tmp_path / "browsers"
    for other in ("chromium-1243", "chromium_headless_shell-1243", "chromium-1100"):
        (browsers / other).mkdir(parents=True)
    assert browser_available([str(browsers)], modules) is False


def test_bl053_the_needed_headless_shell_or_chromium_makes_the_browser_available(tmp_path: Path) -> None:
    modules = _fake_playwright(tmp_path)
    for needed in ("chromium_headless_shell-1194", "chromium-1194"):
        browsers = tmp_path / needed
        (browsers / needed).mkdir(parents=True)
        (browsers / "chromium-1243").mkdir()
        assert browser_available([str(browsers)], modules) is True, needed


def test_bl053_the_second_root_counts_and_a_missing_or_empty_root_does_not(tmp_path: Path) -> None:
    modules = _fake_playwright(tmp_path, shell_rev="1300", chromium_rev="1300")
    (tmp_path / "a" / "chromium_headless_shell-1300").mkdir(parents=True)
    assert browser_available(["", str(tmp_path / "missing"), str(tmp_path / "a")], modules) is True
    assert browser_available(["", str(tmp_path / "missing")], modules) is False


def test_bl053_without_playwright_core_the_needed_build_is_unknown_and_the_browser_is_not_available(tmp_path: Path) -> None:
    (tmp_path / "browsers" / "chromium-1194").mkdir(parents=True)
    assert needed_chromium_folders(tmp_path / "no_modules") == []
    assert browser_available([str(tmp_path / "browsers")], tmp_path / "no_modules") is False


def append(repo: Path, rel: str, text: str) -> None:
    path = repo / rel
    path.write_bytes(path.read_bytes() + text.encode("utf-8"))


def subset_gate(repo: Path) -> None:
    """Cut the gate copy to one viewport (1600x900, the footer's), the light theme and no phone or tablet sweep: the rules
    are the same code, measured at one size, so a run costs minutes and not an hour."""
    edit(repo, GATE, "const VIEWPORTS = [\n  [1280, 800],\n  [1600, 900],\n  [2560, 1440],\n];", "const VIEWPORTS = [[1600, 900]];")
    edit(repo, GATE, "for (const theme of ['light', 'dark']) {", "for (const theme of ['light']) {")
    edit(repo, GATE, "for (const [w, h] of [\n  [390, 844],\n  [768, 1024],\n]) {", "for (const [w, h] of []) {")


class GateRun:
    def __init__(self, code: int, out: str) -> None:
        self.code = code
        self.out = out
        self.fails = [ln.strip() for ln in out.splitlines() if ln.strip().startswith("FAIL")]

    def failed_with(self, pattern: str) -> bool:
        return any(re.search(pattern, ln) for ln in self.fails)


def listening() -> bool:
    """Something answers on the port, whatever address ``localhost`` resolves to (vite preview binds the IPv6 one on Windows)."""
    try:
        socket.create_connection(("localhost", PORT), timeout=1).close()
        return True
    except OSError:
        return False


def build_and_gate(site: Path, env_extra: dict[str, str] | None = None) -> GateRun:
    """Build the copy as the deploy does (copy-data, vite build, the 404 pages), serve it on the port with vite preview, run the
    gate against it and stop the server."""
    fe_dir = site / "frontend"
    vite = fe_dir / "node_modules" / "vite" / "bin" / "vite.js"
    env = {**os.environ, **(env_extra or {})}
    for cmd in ([NODE, "copy-data.mjs"], [NODE, str(vite), "build"], [NODE, "spa-404.mjs"]):
        r = subprocess.run(cmd, cwd=fe_dir, capture_output=True, encoding="utf-8", errors="replace", env=env, timeout=300)
        assert r.returncode == 0, f"{cmd[1]}: {r.stdout[-1500:]}{r.stderr[-1500:]}"
    assert not listening(), f"port {PORT} is already in use"
    log = (site / "preview.log").open("w")
    server = subprocess.Popen([NODE, str(vite), "preview", "--port", str(PORT), "--strictPort"], cwd=fe_dir, stdout=log, stderr=log, env=env)
    try:
        deadline = time.monotonic() + 40
        while time.monotonic() < deadline:
            if listening():
                break
            time.sleep(0.5)
        else:
            raise AssertionError(f"vite preview did not listen on {PORT}: {(site / 'preview.log').read_text(errors='replace')[-800:]}")
        r = subprocess.run([NODE, "scripts/browser-gate.mjs", "--url", f"http://localhost:{PORT}"], cwd=fe_dir, capture_output=True,
                           encoding="utf-8", errors="replace", env=env, timeout=2400)
        return GateRun(r.returncode, r.stdout + r.stderr)
    finally:
        server.terminate()
        try:
            server.wait(timeout=20)
        except subprocess.TimeoutExpired:
            server.kill()
        log.close()


def run_site(base_copy: Path, tmp_path_factory: pytest.TempPathFactory, name: str, plants, env_extra=None) -> GateRun:
    site = tmp_path_factory.mktemp(name) / "repo"
    shutil.copytree(base_copy, site)
    link_node_modules(site / "frontend")
    try:
        subset_gate(site)
        for plant in plants:
            plant(site)
        return build_and_gate(site, env_extra)
    finally:
        unlink_node_modules(site / "frontend")


def e(rel: str, old: str, new: str):
    return lambda site: edit(site, fe(rel), old, new)


def a(rel: str, text: str):
    return lambda site: append(site, fe(rel), text)


# What each planted copy carries. Every plant is one requirement's defect and every message the gate prints for it is
# distinct, so many plants share one build; the plants that would hide the others (a wrapped tab strip stops the checks
# after it in the workbench walk) are in the second build.
BASE_PLANTS = [
    # HY-001: sizes in millimetres below ten centimetres, in centimetres above.
    e(ARTIFACTS, "return `${num(metres * 100, 1)} cm`;", "return metres < 0.1 ? `${num(metres * 1000, 0)} mm` : `${num(metres * 100, 1)} cm`;"),
    # HY-002: a band of empty rail above the last control.
    a("src/fragmenta.css", "\n[data-rail] > :last-child { margin-top: 90px !important; }\n"),
    # RS-004: the design marker no longer moves the design.
    e("src/workbench/design.tsx", "if (cell) onMarker(surface.bd[cell.col], surface.sb[cell.row]);", "if (cell) void cell;"),
    # RS-005: the surface declares a drawn count its cells do not add up to.
    e("src/workbench/design.tsx", "data-chart-cells={surface.drawn}", "data-chart-cells={surface.drawn + 1}"),
    # ST-002: the document declares English whatever the page was asked for.
    a("src/main.tsx", "\n{\n  const force = () => {\n    if (document.documentElement.lang !== 'en') document.documentElement.lang = 'en';\n  };\n"
                      "  new MutationObserver(force).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });\n  force();\n}\n"),
    # ST-003: the body becomes the scroller (shell defect 1: the document itself cannot scroll), and a page is wider than the screen.
    a("src/fragmenta.css", "\nhtml { height: 100% !important; overflow: hidden !important; }\nbody { height: 100% !important; overflow: auto !important; }\n"
                           "body::after { content: ''; display: block; width: 4000px; height: 1px; }\n"),
    # ST-004: the case control is a row of chips, the rail's controls start below the fold and the page itself is taller than the viewport.
    e("src/workbench/Workbench.tsx", "layout: 'select',", "layout: 'chips',"),
    a("src/fragmenta.css", "\n[data-rail] { padding-top: 900px !important; }\nbody::before { content: ''; display: block; width: 1px; height: 3000px; }\n"),
    # ST-006: every chart declares zero of what it drew.
    e("src/viz/plots.tsx", "node.setAttribute(`data-chart-${key}`, String(count));", "node.setAttribute(`data-chart-${key}`, String(0 * count));"),
    # ST-007: the axis title of a documentation figure moves onto its tick labels.
    e("src/viz/figures/benchmark.tsx", "y={bottom + 36}", "y={bottom + 16}"),
    # ST-008: the footer is held to a narrow box and wraps.
    a("src/fragmenta.css", "\n.site-footer .footer-meta { max-width: 220px !important; }\n"),
    # ST-009: two citations run together, a table wider than its container, and text cut by an ellipsis with no title.
    e("src/pages/benchmark/Live.tsx", "<Cite id=\"kulatilake2012\" />{' '}\n        <Cite id=\"sui2025\" />", "<Cite id=\"kulatilake2012\" /><Cite id=\"sui2025\" />"),
    e("src/workbench/views.tsx", "const tables = (\n    <>\n      <table className=\"fr-table caos-table\">", "const tables = (\n    <>\n      <table className=\"fr-table caos-table\" style={{ minWidth: 3000 }}>"),
    a("src/fragmenta.css", "\n.subtabs p { max-width: 240px !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }\n"),
    # ST-010: the arms that share the classical mean size get a row of their own, with its exact scores.
    e("src/workbench/views.tsx", ".filter((a) => !a.sharesMeanSizeWith && !foldedCaps.includes(a) && !sizeless.includes(a))", ".filter((a) => !foldedCaps.includes(a) && !sizeless.includes(a))"),
    # ST-011: the bench block is opaque, so no charge column can be seen, and the timing disclaimer is gone.
    e("src/viz/BenchView3D.tsx", "transparent: true,\n        opacity: 0.32,\n        depthWrite: false,", "transparent: false,\n        opacity: 1,\n        depthWrite: true,"),
    e("src/viz/BenchView3D.tsx", "data-bench-disclaimer=\"timing-is-choreography\"", "data-bench-note=\"timing-is-choreography\""),
    # ST-012: the App redraws its 2D canvases while nobody touches it.
    a("src/main.tsx", "\nsetInterval(() => {\n  for (const c of document.querySelectorAll('canvas')) c.getContext('2d')?.clearRect(0, 0, 1, 1);\n}, 150);\n"),
]
# Plants that hide every check after them in the workbench walk, so each is in a build of its own: a console error (the
# walk reports the first problem of a tab and stops there) and a wrapped tab strip.
CONSOLE_PLANTS = [
    # ST-001: a console error and a request for a file that is not there, on every route.
    a("src/main.tsx", "\nconsole.error('planted console error');\nvoid fetch('/data/planted-missing.json');\n"),
    # ST-013: the page is set in a font of its own, whatever the runner asked for.
    a("src/fragmenta.css", "\nbody { font-family: Georgia, serif !important; }\n"),
]
TAB_PLANTS = [
    # ST-005: every tab of a strip on a row of its own.
    a("src/fragmenta.css", "\n[role='tablist'] { display: block !important; }\n[role='tab'] { display: block !important; }\n"),
]
DEJAVU = {"GATE_FONTS": "dejavu"}


@pytest.fixture(scope="module")
def clean_run(base_copy: Path, tmp_path_factory: pytest.TempPathFactory) -> GateRun:
    return run_site(base_copy, tmp_path_factory, "gate-clean", [])


@pytest.fixture(scope="module")
def planted_run(base_copy: Path, tmp_path_factory: pytest.TempPathFactory) -> GateRun:
    return run_site(base_copy, tmp_path_factory, "gate-planted", BASE_PLANTS)


@pytest.fixture(scope="module")
def console_run(base_copy: Path, tmp_path_factory: pytest.TempPathFactory) -> GateRun:
    return run_site(base_copy, tmp_path_factory, "gate-console", CONSOLE_PLANTS, DEJAVU)


@pytest.fixture(scope="module")
def fonts_clean_run(base_copy: Path, tmp_path_factory: pytest.TempPathFactory) -> GateRun:
    """The clean build under GATE_FONTS=dejavu. DejaVu Sans is the deploy runner's font and is not installed everywhere, so a
    host without it may fail other checks on the fallback's metrics; only the font message of this run is read."""
    return run_site(base_copy, tmp_path_factory, "gate-fonts", [], DEJAVU)


@pytest.fixture(scope="module")
def tabs_run(base_copy: Path, tmp_path_factory: pytest.TempPathFactory) -> GateRun:
    return run_site(base_copy, tmp_path_factory, "gate-tabs", TAB_PLANTS)


@needs_browser
def test_the_browser_gate_passes_on_the_clean_build(clean_run: GateRun) -> None:
    assert clean_run.code == 0 and "FRAGMENTA GATE PASSED" in clean_run.out and not clean_run.fails, clean_run.out[-3000:]


def caught(run: GateRun, pattern: str) -> None:
    assert run.code == 1 and run.failed_with(pattern), f"no failure matches {pattern!r}:\n" + "\n".join(run.fails[:40])


@needs_browser
def test_hy001_sizes_in_two_units_in_one_column_are_found_by_the_browser_gate(planted_run: GateRun) -> None:
    caught(planted_run, 'a size column mixes units')


@needs_browser
def test_hy002_a_band_of_empty_rail_above_the_last_control_is_found(planted_run: GateRun) -> None:
    caught(planted_run, 'of empty rail above its last control')


@needs_browser
def test_rs004_a_marker_that_no_longer_moves_the_design_is_found(planted_run: GateRun) -> None:
    caught(planted_run, 'moving the design marker did not move the distribution')


@needs_browser
def test_rs005_a_surface_declaring_cells_that_do_not_add_up_is_found(planted_run: GateRun) -> None:
    caught(planted_run, 'the surface declares \\d+ drawn and \\d+ empty cells')


@needs_browser
def test_st001_a_console_error_and_a_failed_request_are_found_and_named(console_run: GateRun) -> None:
    caught(console_run, 'planted console error')
    caught(console_run, 'planted-missing\\.json')


@needs_browser
def test_st002_a_document_that_declares_the_wrong_language_is_found(planted_run: GateRun) -> None:
    caught(planted_run, 'the page reads es but the document declares lang="en"')


@needs_browser
def test_st003_a_document_that_cannot_scroll_and_a_page_wider_than_the_screen_are_found(planted_run: GateRun) -> None:
    caught(planted_run, 'so the document cannot scroll')
    caught(planted_run, 'wider than the screen')


@needs_browser
def test_st004_a_case_control_without_groups_controls_below_the_fold_and_a_page_that_scrolls_are_found(planted_run: GateRun) -> None:
    caught(planted_run, 'of rail controls below the fold')
    caught(planted_run, 'the case control is not a select with optgroups')
    caught(planted_run, 'the App route scrolls the page by')


@needs_browser
def test_st005_tab_strips_wrapped_onto_several_rows_are_found(tabs_run: GateRun) -> None:
    caught(tabs_run, 'the tab strip wrapped onto \\d+ rows')


@needs_browser
def test_st006_a_chart_that_declares_nothing_drawn_is_found(planted_run: GateRun) -> None:
    caught(planted_run, 'chart declared nothing drawn')


@needs_browser
def test_st007_text_on_text_in_a_figure_is_found(planted_run: GateRun) -> None:
    caught(planted_run, 'overlaps')


@needs_browser
def test_st008_a_footer_that_wraps_is_found(planted_run: GateRun) -> None:
    caught(planted_run, 'the footer wraps onto \\d+ rows')


@needs_browser
def test_st009_citations_run_together_a_table_wider_than_its_container_and_text_cut_without_a_title_are_found(planted_run: GateRun) -> None:
    caught(planted_run, 'citations with no space between')
    caught(planted_run, 'a table is wider than its container')
    caught(planted_run, 'text cut with no title')


@needs_browser
def test_st010_two_rows_with_identical_scores_are_found(planted_run: GateRun) -> None:
    caught(planted_run, 'comparison rows with identical scores')


@needs_browser
def test_st011_a_bench_without_visible_charge_columns_and_without_its_disclaimer_is_found(planted_run: GateRun) -> None:
    caught(planted_run, 'but none of them is visible from the camera')
    caught(planted_run, 'the 3D bench lost its timing disclaimer')


@needs_browser
def test_st012_an_app_that_redraws_while_idle_is_found(planted_run: GateRun) -> None:
    caught(planted_run, 'canvas redraws in 3 idle seconds')


@needs_browser
def test_st013_a_page_that_ignores_the_runners_fonts_is_found(console_run: GateRun, fonts_clean_run: GateRun) -> None:
    pattern = "asked for the runner's fonts and the page is set in"
    assert "checks passed" in fonts_clean_run.out and not fonts_clean_run.failed_with(pattern), fonts_clean_run.out[-1500:]
    caught(console_run, pattern)


# ---------------------------------------------------------------- BL-049: the live engine's reasons and the refusal list

REASONS_TEST = "test/reasons.test.ts"
BR003 = ["the live engine’s reasons are written in both languages, with the Spanish decimal comma"]
BR004 = ["on a case where every arm abstains the refusals are listed for every arm, in both languages",
         "the refusal list is drawn on ctrl-degenerate, in the language shown, and says that no model answers",
         "the Predict group lists the refusals where no arm is ranked and draws none beside a ranked arm"]


@needs_node
def test_br003_a_live_reason_left_in_english_on_the_spanish_page_is_found(web: Path) -> None:
    assert_clean(web, LEARNED, BR003)
    edit(web, fe(LEARNED_SRC), "'tipo de modelo desconocido'", "'unknown model kind'")
    assert_caught(web, LEARNED, BR003)


ARM_SOURCES = "test/arm-sources.test.ts"
BR005 = ["the source of every model is written in English and in Spanish",
         "the selected model shows its source in the language of the page"]


@needs_node
def test_br005_a_model_source_left_in_english_or_shown_in_one_language_is_found(web: Path) -> None:
    assert_clean(web, ARM_SOURCES, BR005)
    # The Spanish source of the published regression planted back in English, as 0.08.000 showed it on a Spanish page.
    edit(web, fe(ARTIFACTS), "es: 'Hudaverdi et al. 2010, Ecs. 9 y 10'", "es: 'Hudaverdi et al. 2010, Eqs. 9 and 10'")
    # And the case view reading the English source whatever the page's language.
    edit(web, fe("src/workbench/views.tsx"), "{arm.source[lang]}", "{arm.source.en}")
    assert_caught(web, ARM_SOURCES, BR005)

@needs_node
def test_br004_a_predict_group_without_the_refusal_list_and_a_list_in_english_are_found(web: Path) -> None:
    assert_clean(web, REASONS_TEST, BR004)
    # The list removed from the group: the wiring test fails.
    edit(web, fe("src/workbench/views.tsx"), "<RefusalsPanel artifact={sel.artifact} noneAnswers={!answering(sel).length} />", "{null}")
    # And the panel's statement left in English on the Spanish page: the render test fails.
    edit(web, fe("src/viz/Panels.tsx"), "? 'Ningún modelo responde en este caso: todos rechazan sus diseños.'",
         "? 'No model answers on this case: every model refuses its designs.'")
    code, results, out = run_node(web, REASONS_TEST, BR004[1:])
    assert code != 0 and all(results.get(n) is False for n in BR004[1:]), out[-2500:]
