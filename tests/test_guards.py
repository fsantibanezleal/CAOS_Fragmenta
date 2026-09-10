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
