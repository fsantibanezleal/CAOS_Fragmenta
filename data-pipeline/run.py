#!/usr/bin/env python3
"""Run the Fragmenta bake. Invoked by path, never installed: this repo declares no package.

    python data-pipeline/run.py                 bake every case plus the benchmark
    python data-pipeline/run.py --case real-murgul
    python data-pipeline/run.py --no-benchmark  cases only, for a fast iteration
    python data-pipeline/run.py --validate      re-check what is already on disk
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from pipeline.pipeline import DATA_ROOT, bake_all, bake_case
from pipeline.registry import get_case, list_cases
from pipeline.stages import validate


def main() -> int:
    parser = argparse.ArgumentParser(description="Bake the Fragmenta artifacts.")
    parser.add_argument("--case", action="append", help="bake only these case ids")
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--n-seeds", type=int, default=12, help="network reproduction sweep width")
    parser.add_argument("--no-benchmark", action="store_true")
    parser.add_argument("--validate", action="store_true", help="only re-check what is on disk")
    args = parser.parse_args()

    if args.validate:
        report = validate.run(DATA_ROOT)
        print(f"validation: {'OK' if report.ok else 'FAILED'} over {report.n_cases} cases")
        for key, value in report.summary.items():
            print(f"  {key}: {value}")
        for problem in report.problems:
            print(f"  PROBLEM {problem}")
        return 0 if report.ok else 1

    if args.case:
        for case_id in args.case:
            result = bake_case(get_case(case_id), seed=args.seed)
            print(f"{result.case_id}: {result.bytes_written} bytes, lane {result.lane}")
        return 0

    results = bake_all(
        seed=args.seed, with_benchmark=not args.no_benchmark, n_seeds=args.n_seeds
    )
    total = sum(r.bytes_written for r in results)
    print(f"baked {len(results)} of {len(list_cases())} cases, {total} bytes, gate passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
