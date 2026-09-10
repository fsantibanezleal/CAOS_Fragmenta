#!/usr/bin/env python3
"""Base-integrity guards over what is TRACKED, runnable locally and in CI.

These were four shell one-liners in the workflow. Two problems with that. A developer could not run
them before pushing, so they were discovered by a red build; and one of them was wrong in a way the
shell hid: the pattern meant to reject a real `.env` also matched `.env.example`, so the guard
failed on the file the conventions REQUIRE the repo to carry. A guard that rejects its own positive
control is worse than no guard, because it teaches you to ignore it.

    python scripts/check_guards.py

Each guard is a function that returns a list of problems, so a failing run reports every problem at
once rather than the first one.
"""
from __future__ import annotations

import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# `.env` holds real values and never ships. These names hold placeholder values and always ship:
# a clone that cannot be configured is not runnable.
ENV_EXAMPLES = {".env.example", ".env.sample", ".env.template"}


def tracked() -> list[str]:
    out = subprocess.run(
        ["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, check=True
    ).stdout
    return [line for line in out.splitlines() if line]


def no_real_env_but_an_example(files: list[str]) -> list[str]:
    problems = []
    for path in files:
        name = Path(path).name
        if name == ".env" or (name.startswith(".env.") and name not in ENV_EXAMPLES):
            problems.append(f"a real environment file is tracked: {path}")
    if not any(Path(p).name in ENV_EXAMPLES for p in files):
        problems.append("no .env.example is tracked, so a fresh clone cannot be configured")
    return problems


def no_environments_or_binaries(files: list[str]) -> list[str]:
    pattern = re.compile(r"(^|/)(\.?venv|node_modules)/|\.(dll|so|dylib|pt|pth)$", re.I)
    return [f"an environment or a native binary is tracked: {p}" for p in files if pattern.search(p)]


def no_local_machine_paths(files: list[str]) -> list[str]:
    """A local disk path in a public repo is meaningless to a reader and leaks the author's machine.

    Checked against file CONTENT, not names, and the workflow directory is exempt because this guard
    has to be able to name the pattern it looks for.
    """
    problems = []
    needle = "D:" + chr(92) + "_Repos"
    for path in files:
        if path.startswith(".github/") or path.startswith("scripts/check_guards"):
            continue
        full = ROOT / path
        try:
            text = full.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        if needle in text:
            problems.append(f"a local machine path is written into {path}")
    return problems


def no_package_of_its_own(files: list[str]) -> list[str]:
    """A product declares NO package. A required package is a separate repo with a real PyPI project.

    For this product that package is `blastfrag`, consumed as a pinned dependency.
    """
    problems = [f"an internal lab package appeared: {p}" for p in files if re.search(r"(^|/)[a-z_]+lab/", p)]
    pyproject = ROOT / "pyproject.toml"
    if pyproject.exists() and re.search(r"^\[project\]", pyproject.read_text(encoding="utf-8"), re.M):
        problems.append("pyproject.toml declares a package, which a product must never do")
    return problems


def no_copyrighted_sources(files: list[str]) -> list[str]:
    """The source articles are copyrighted. Only the numeric facts extracted from them may ship."""
    return [
        f"a source document is tracked: {p}" for p in files if Path(p).suffix.lower() in {".pdf", ".mht"}
    ]


GUARDS = (
    no_real_env_but_an_example,
    no_environments_or_binaries,
    no_local_machine_paths,
    no_package_of_its_own,
    no_copyrighted_sources,
)


def main() -> int:
    files = tracked()
    problems: list[str] = []
    for guard in GUARDS:
        found = guard(files)
        print(f"{guard.__name__}: {'OK' if not found else f'{len(found)} problem(s)'}")
        problems.extend(found)

    for problem in problems:
        print(f"::error::{problem}")
    if problems:
        print(f"{len(problems)} problem(s) over {len(files)} tracked files")
        return 1
    print(f"guards: OK over {len(files)} tracked files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
