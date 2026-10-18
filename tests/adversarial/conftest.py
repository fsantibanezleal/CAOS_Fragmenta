"""Fixtures of the adversarial tests (template 0.08.002, adapted to Fragmenta: its tree copies a few more files): a throwaway copy of the repository's relevant files, one planted
defect, the real guard run as a subprocess.

The copy holds every file the guards read and none of the heavy or generated trees (node_modules, dist, venvs). The
tests need only the standard library and pytest, so CI can run them in the checks job; the root conftest's autouse
fixture imports the pipeline (numpy), so it is replaced here by a no-op."""
from __future__ import annotations

import shutil
from pathlib import Path

import pytest
from planting import add_schema

ROOT = Path(__file__).resolve().parents[2]
SKIP = shutil.ignore_patterns("node_modules", "dist", "gate-output", "__pycache__", ".venv*", ".git", ".pytest_cache",
                              ".ruff_cache", "*.pyc", "build")
COPIED = ("scripts", "docs", "data", "data-pipeline", "models", "frontend", "tests", ".github", "deploy", "app", "manifests",
          "content")
FILES = ("VERSION", "product.json", "CHANGELOG.md", "requirements.txt", "requirements-precompute.txt", "requirements-dev.txt",
         "requirements-gpu.txt", "requirements-api.txt", ".template-source", ".template-version", "pyproject.toml",
         ".gitignore", ".gitattributes", ".env.example", "README.md", "LICENSE", "CONTRIBUTING.md", "SECURITY.md",
         "CODE_OF_CONDUCT.md")


@pytest.fixture(autouse=True)
def _sandboxed_pipeline() -> None:
    """Overrides tests/conftest.py: these tests import nothing of the pipeline."""
    return None


@pytest.fixture(scope="session")
def base_copy(tmp_path_factory: pytest.TempPathFactory) -> Path:
    base = tmp_path_factory.mktemp("repo-base")
    for name in COPIED:
        if (ROOT / name).exists():
            shutil.copytree(ROOT / name, base / name, ignore=SKIP)
    for name in FILES:
        if (ROOT / name).exists():
            shutil.copy2(ROOT / name, base / name)
    return add_schema(base)


@pytest.fixture
def repo(base_copy: Path, tmp_path: Path) -> Path:
    """A fresh copy of the repository's relevant files, to plant one defect in."""
    dest = tmp_path / "repo"
    shutil.copytree(base_copy, dest)
    return dest
