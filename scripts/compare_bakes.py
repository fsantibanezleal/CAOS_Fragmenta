#!/usr/bin/env python3
"""Re-bake a case into a sandbox and compare it, number by number, against what was committed.

Why this exists rather than a bare digest comparison: a content address answers "same or not" and
nothing else. When two machines disagree, the only question worth asking is HOW MUCH they disagree,
because the answer decides what to do.

  - a difference at the 15th significant digit is floating-point summation order, which differs
    between two BLAS builds and cannot be removed by pinning a version;
  - a difference in the 3rd significant digit is a different MODEL, and pinning is exactly the fix;
  - a key present on one side and not the other is a code change, not a numeric one.

Those three call for three different responses, so the check has to be able to tell them apart. The
digest alone cannot, and a determinism job that only prints two hashes sends you looking in the
wrong place.

    python scripts/compare_bakes.py real-murgul

Exits non-zero when the re-bake differs from the committed artifact by more than the tolerance.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "data-pipeline"))

from pipeline.pipeline import bake_case  # noqa: E402
from pipeline.registry import get_case  # noqa: E402

# The published numbers agree to at least this relative precision, or they are not the same numbers.
# Set well below anything the App displays and well above the noise floor of a double-precision
# reduction, so it separates "another machine's BLAS" from "another model".
RELATIVE_TOLERANCE = 1e-9


def walk(node: object, path: str = "") -> dict[str, object]:
    """Flatten a payload to leaf path to value, so two payloads can be compared key by key."""
    flat: dict[str, object] = {}
    if isinstance(node, dict):
        for key, value in node.items():
            flat.update(walk(value, f"{path}.{key}" if path else str(key)))
    elif isinstance(node, list):
        for index, value in enumerate(node):
            flat.update(walk(value, f"{path}[{index}]"))
    else:
        flat[path] = node
    return flat


def compare(baked: dict, committed: dict) -> tuple[list[str], list[tuple[float, str, float, float]]]:
    """Return structural problems, and numeric differences sorted worst relative error first."""
    left, right = walk(baked), walk(committed)

    problems = [f"only in the re-bake: {key}" for key in sorted(set(left) - set(right))]
    problems += [f"only in the committed artifact: {key}" for key in sorted(set(right) - set(left))]

    numeric: list[tuple[float, str, float, float]] = []
    for key in sorted(set(left) & set(right)):
        a, b = left[key], right[key]
        if isinstance(a, bool) or isinstance(b, bool) or not isinstance(a, (int, float)):
            if a != b:
                problems.append(f"{key}: re-baked {a!r} against committed {b!r}")
            continue
        if not isinstance(b, (int, float)):
            problems.append(f"{key}: re-baked {a!r} against committed {b!r}")
            continue
        if a == b:
            continue
        scale = max(abs(a), abs(b))
        relative = abs(a - b) / scale if scale else math.inf
        numeric.append((relative, key, float(a), float(b)))

    numeric.sort(reverse=True)
    return problems, numeric


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("case_id", nargs="?", default="real-murgul")
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--tolerance", type=float, default=RELATIVE_TOLERANCE)
    parser.add_argument(
        "--repeat",
        type=int,
        default=1,
        help=(
            "bake this many times before comparing, and fail if the bakes disagree with each other. "
            "Two bakes in ONE environment must be identical; anything else means the pipeline reads "
            "a wall clock, iterates a set, or stops on a time limit."
        ),
    )
    args = parser.parse_args()

    committed_path = ROOT / "data" / "derived" / args.case_id / "case.json"
    if not committed_path.exists():
        print(f"no committed artifact at {committed_path}")
        return 1
    committed = json.loads(committed_path.read_text(encoding="utf-8"))

    case = get_case(args.case_id)
    print(f"case {args.case_id}")

    digests, baked = [], {}
    for _ in range(max(1, args.repeat)):
        # A sandbox, never the canonical tree. A check that can overwrite the artifacts it is
        # checking can silently make itself pass.
        with tempfile.TemporaryDirectory() as sandbox:
            digests.append(bake_case(case, seed=args.seed, root=Path(sandbox)).digest)
            baked = json.loads((Path(sandbox) / args.case_id / "case.json").read_text(encoding="utf-8"))

    if len(set(digests)) > 1:
        print(f"  FAILED self-consistency: {args.repeat} bakes here produced {sorted(set(digests))}")
        return 1
    if len(digests) > 1:
        print(f"  {len(digests)} bakes in this environment agree with each other")

    print(f"  re-baked digest  {digests[0]}")
    print(f"  committed digest {committed['digest']}")
    if digests[0] == committed["digest"]:
        print("  identical, byte for byte")
        return 0

    # The digest is over the payload including its own numbers, so it always differs when they do.
    baked.pop("digest", None)
    committed.pop("digest", None)
    problems, numeric = compare(baked, committed)

    for problem in problems:
        print(f"  STRUCTURAL {problem}")

    if numeric:
        worst = numeric[0][0]
        print(f"  {len(numeric)} numeric fields differ, worst relative error {worst:.3e}")
        for relative, key, a, b in numeric[:15]:
            print(f"    {relative:.3e}  {key}: re-baked {a!r} against committed {b!r}")
        verdict = (
            "below the tolerance, so this is floating-point reduction order between two builds of "
            "the same pinned libraries"
            if worst <= args.tolerance
            else "ABOVE the tolerance, so these are different models, not rounding"
        )
        print(f"  verdict: {verdict}")
    else:
        worst = 0.0

    failed = bool(problems) or worst > args.tolerance
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
