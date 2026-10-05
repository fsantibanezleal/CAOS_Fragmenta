"""The guards have to reject what they are for, and accept what the conventions require.

A guard is only ever seen passing, so nothing tells you whether it can fail. The one these tests
were written for could not: the pattern meant to reject a real `.env` also matched `.env.example`,
so it failed on the file the repo is required to carry, and it would have gone on failing for a
reason nobody would connect to the message it printed.

Each test below feeds a synthetic file list, so no test touches the real tree.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from check_guards import (  # noqa: E402
    no_copyrighted_sources,
    no_environments_or_binaries,
    no_package_of_its_own,
    no_real_env_but_an_example,
)
from check_spanish_accents import REQUIRED, problems_in  # noqa: E402

CLEAN = [".env.example", "README.md", "data-pipeline/run.py", "frontend/src/App.tsx"]


def test_the_env_guard_accepts_the_example_it_requires():
    assert no_real_env_but_an_example(CLEAN) == []


def test_the_env_guard_rejects_a_real_env():
    for leaked in (".env", ".env.local", "frontend/.env.production"):
        problems = no_real_env_but_an_example([*CLEAN, leaked])
        assert len(problems) == 1 and leaked in problems[0], leaked


def test_the_env_guard_fails_when_no_example_is_tracked():
    """A repo with no example passes every other check and cannot be run by anyone."""
    problems = no_real_env_but_an_example(["README.md"])
    assert problems and "cannot be configured" in problems[0]


def test_the_binary_guard_rejects_environments_and_native_artifacts():
    for leaked in (".venv/pyvenv.cfg", "frontend/node_modules/react/index.js", "models/net.pt", "a/b.dll"):
        assert no_environments_or_binaries([*CLEAN, leaked]), leaked


def test_the_binary_guard_does_not_reject_ordinary_source():
    """`venv` inside a longer word is not a virtual environment, and `.ts` is not `.pt`."""
    assert no_environments_or_binaries([*CLEAN, "docs/venvs-explained.md", "src/convention.ts"]) == []


def test_the_package_guard_rejects_an_internal_lab():
    """A product declares no package. The reusable science is the separate published blastfrag."""
    assert no_package_of_its_own([*CLEAN, "fraglab/__init__.py"])


def test_the_package_guard_passes_on_this_repo_as_it_stands():
    assert no_package_of_its_own(CLEAN) == []


def test_the_copyright_guard_rejects_a_source_article():
    """The papers stay in the private vault. Only the numbers read out of them ship."""
    assert no_copyrighted_sources([*CLEAN, "docs/refs/Hudaverdi2012.pdf"])
    assert no_copyrighted_sources([*CLEAN, "wip/saved-page.MHT"])


def test_the_copyright_guard_passes_on_ordinary_documents():
    assert no_copyrighted_sources([*CLEAN, "docs/theory/01_kuz-ram.md"]) == []


# ---------------------------------------------------------------------------------------------
# The Spanish accents, which shipped missing across the whole product while the navigation had them
# ---------------------------------------------------------------------------------------------

def test_the_accent_guard_catches_a_word_that_shipped_wrong():
    """Every one of these was in a shipped string. "campana" is a bell, not a campaign."""
    for wrong in ("fragmentacion", "campana", "tamano", "diseno", "Espana", "razon"):
        assert problems_in("x", f"El {wrong} del corpus"), wrong


def test_the_accent_guard_accepts_the_corrected_text():
    text = "La fragmentacion de una campana en Espana".replace(
        "fragmentacion", "fragmentaci\u00f3n").replace("campana", "campa\u00f1a").replace(
        "Espana", "Espa\u00f1a")
    assert problems_in("x", text) == []


def test_the_accent_guard_does_not_demand_a_misspelling_in_the_plural():
    """An aguda loses its accent in the plural: the singular takes one, the plural does not."""
    assert "razones" not in REQUIRED
    assert problems_in("x", "por dos razones distintas") == []


def test_the_accent_guard_leaves_context_dependent_words_alone():
    """These have a real unaccented meaning, so a word list cannot decide them."""
    for word in ("mas", "esta", "este", "si", "solo", "como", "que", "donde", "media", "valida"):
        assert word not in REQUIRED, word


def test_the_spanish_surface_writes_the_verb_esta_where_a_participle_follows():
    """Before a participle, a gerund or a preposition only the verb can stand; a word list cannot see it."""
    assert problems_in("x", "la instalación esta rota")
    assert problems_in("x", "el producto esta inventando números")
    assert problems_in("x", "Su módulo esta bajo el mínimo")
    assert problems_in("x", "los datos estan en el corpus")
    assert not problems_in("x", "ningún resultado de esta página es confiable")
    assert not problems_in("x", "esta corrida y esta medida son demostrativos")
    assert not problems_in("x", "la instalación está rota")
    from check_spanish_accents import spanish_strings

    found = [
        p for where, text in spanish_strings() for p in problems_in(where, text) if "needs the verb" in p
    ]
    assert found == []


def test_the_spanish_surface_writes_the_pronoun_el_before_punctuation():
    """The article never ends a clause, so "el" before a stop is the pronoun missing its accent."""
    assert problems_in("x", "ningún modelo puede correr sobre el.")
    assert problems_in("x", "lo que se dice de el, se repite")
    assert not problems_in("x", "ningún modelo puede correr sobre él.")
    assert not problems_in("x", "el modelo y el tiro")
    from check_spanish_accents import spanish_strings

    found = [
        p for where, text in spanish_strings() for p in problems_in(where, text) if "needs the pronoun" in p
    ]
    assert found == []


def test_the_accent_guard_rejects_a_decomposed_accent():
    """e + combining acute looks right in most editors and renders wrongly in some fonts."""
    assert problems_in("x", "fragmentacio\u0301n")


def test_the_accent_guard_rejects_a_mis_encoded_string():
    assert problems_in("x", "fragmentaci\ufffdn")


def test_the_architecture_drawings_are_generated_from_the_committed_artifacts():
    """The modal's drawings carry numbers; the generator in check mode proves they match the bake.

    Until 0.05.000 they were hand-placed and two of them still stated withdrawn claims after the
    benchmark had changed. Regenerate with: python scripts/build_architecture_svgs.py
    """
    import subprocess

    result = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "build_architecture_svgs.py"), "--check"],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stdout + result.stderr


def test_the_docs_results_and_fact_blocks_are_generated_from_the_committed_benchmark():
    """Every number in docs/results/ and in a facts block is the benchmark's; a stale one fails.

    Regenerate with: python scripts/build_docs_results.py
    """
    import subprocess

    result = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "build_docs_results.py"), "--check"],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stdout + result.stderr


def test_the_results_pages_report_the_cap_common_support_and_the_width_sweep():
    """Schema v3's three additions reach the wiki, beside the content the generator already checks."""
    every_arm = (ROOT / "docs" / "results" / "02_every-arm.md").read_text(encoding="utf-8")
    assert "capped at the in-situ block (declared)" in every_arm
    assert "## On the rows every arm answers" in every_arm and "never on these" in every_arm
    reproductions = (ROOT / "docs" / "results" / "05_published-reproductions.md").read_text(encoding="utf-8")
    assert "## The network's hidden width" in reproductions and "the published pair" in reproductions
    per_site = (ROOT / "docs" / "results" / "04_per-site.md").read_text(encoding="utf-8")
    assert "capped at the in-situ block" in per_site


def test_the_framework_examples_in_the_docs_run_and_agree_with_the_engine():
    """The wiki's runnable examples run against the pinned stack, and their numbers match the bake.

    Each one fits small models (seconds), so it runs locally with the rest of the suite; it is not run
    in CI, which never runs the test suite (ADR-0074). The assertions are the cross-checks the pages
    cite: plain scikit-learn reproduces the engine's site-held-out forest, the portable booster is
    exact, and the printed classical column scores 0.232 against a squared correlation of 0.570.
    """
    import subprocess

    out = {}
    for name in ("01_blastfrag", "02_scikit-learn", "03_xgboost", "04_numpy"):
        result = subprocess.run(
            [sys.executable, str(ROOT / "docs" / "frameworks" / name / "example.py")],
            capture_output=True,
            text=True,
            timeout=600,
        )
        assert result.returncode == 0, f"{name}: {result.stdout}{result.stderr}"
        out[name] = result.stdout
    assert "leave one site out, kuznetsov: 0.311" in out["01_blastfrag"]
    assert "leave one site out, pooled: -0.231" in out["02_scikit-learn"]
    assert "worst difference over the corpus: 0.0e+00 m" in out["03_xgboost"]
    assert "variance explained 0.232, squared correlation 0.570" in out["04_numpy"]
