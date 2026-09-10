#!/usr/bin/env python3
"""Verify the committed artifacts without rebaking them.

A thin wrapper over the pipeline's own release gate, so the deploy workflow and a developer run the
same check rather than two checks that can disagree.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "data-pipeline"))

from pipeline.stages import validate  # noqa: E402


def main() -> int:
    report = validate.run(ROOT / "data" / "derived")
    print(f"artifacts: {'OK' if report.ok else 'FAILED'} over {report.n_cases} cases")
    for key, value in report.summary.items():
        print(f"  {key}: {value}")
    for problem in report.problems:
        print(f"  PROBLEM {problem}")
    return 0 if report.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
