#!/usr/bin/env python3
"""Run the Fragmenta bake. Invoked by path, never installed: this repo declares no package.

    python data-pipeline/run.py                 bake every case plus the benchmark
    python data-pipeline/run.py --case real-murgul
    python data-pipeline/run.py --no-benchmark  cases only, for a fast iteration
    python data-pipeline/run.py --validate      re-check what is already on disk
    python data-pipeline/run.py readiness       write data/derived/readiness.json, without a bake
"""
from __future__ import annotations

import os

# BLAS on one thread, set before numpy is imported. The network's matrices are tiny, and on a loaded machine a
# multi-threaded BLAS spins: one fit at width 15 took more than six minutes against 1.9 s on one thread
# (2026-10-05). One thread also keeps the reduction order, and so the last bits, fixed across machines.
for _variable in ("OPENBLAS_NUM_THREADS", "OMP_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ[_variable] = "1"

import argparse  # noqa: E402
import sys  # noqa: E402
from pathlib import Path  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))


def readiness_command(argv: list[str]) -> int:
    """Compute the readiness document of the repository and write it.

    It reads the catalog and the committed documents and nothing else, so it runs before (and without) the
    engine and the training stack that the bake below imports.
    """
    from pipeline.core import readiness

    parser = argparse.ArgumentParser(prog="run.py readiness", description="Write the readiness document.")
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="the repository whose catalog and data/derived are read and written (default: this one)",
    )
    root = parser.parse_args(argv).repo_root.resolve()
    derived = root / "data" / "derived"
    doc = readiness.compute(repo_root=root, derived_root=derived)
    size = readiness.write(derived, doc)
    for entry in doc["contracts"]:
        absent = f" ({len(entry['missing'])} absent)" if entry["missing"] else ""
        print(f"  {entry['id']}: {entry['state']}{absent}")
    print(f"readiness: wrote {derived / 'readiness.json'} ({size} bytes), product {doc['product_version']}")
    return 0


if len(sys.argv) > 1 and sys.argv[1] == "readiness":
    raise SystemExit(readiness_command(sys.argv[2:]))

from pipeline.pipeline import DATA_ROOT, bake_all, bake_case  # noqa: E402
from pipeline.registry import get_case, list_cases  # noqa: E402
from pipeline.stages import validate  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Bake the Fragmenta artifacts.")
    parser.add_argument("--case", action="append", help="bake only these case ids")
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--n-seeds", type=int, default=30, help="network reproduction sweep width")
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
