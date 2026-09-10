#!/usr/bin/env python3
"""Re-bake into a sandbox and compare, number by number, against what was committed.

Reproducibility of this product has two halves, and they need two different instruments.

**Within one environment the bake is byte-identical**, and a content address is the right check for
that. Run this with `--repeat 2` and any dependence on a wall clock, a set iteration order or a
time-based stopping rule shows up immediately.

**Across environments it is identical to a numeric tolerance, not to a hash**, and pretending
otherwise would be false. A hash is a discrete answer to a continuous question. Two builds of the
same pinned numpy reduce a dot product in a different order, the last bits of the result differ, and
an iterative solver amplifies that difference over its iterations. No amount of pinning removes it,
because it is not a version difference.

That is not a hypothesis here, it is a measurement. Baking all sixteen cases on Windows and on Linux
runners, with the same pinned numpy 2.5.3, scikit-learn 1.9.0 and xgboost 3.4.1 on Python 3.13:

  - 2 bakes on the same runner: identical, byte for byte;
  - worst difference across all sixteen cases: 2.7e-08 relative, on `real-reocin-ug`;
  - a typical case: 30 to 100 fields differ, the worst of them around 1e-09;
  - `ctrl-degenerate`, where every arm abstains and the artifact holds refusals rather than numbers:
    identical, byte for byte.

That last line is the control on the explanation. If the drift were structural rather than
arithmetic, a case with no arithmetic in it would drift too.

The drift is largest on the fitted arms, `published-neural-net` and `refitted-regression`, then
`svr-rbf` and `stacking`. It is not confined to them: on `real-soma` the closed forms move as well,
because a closed form here is evaluated on a reconstructed geometry that is itself several operations
deep. Any arm whose value passes through a chain of arithmetic can pick up the last bit.

So the tolerance below is set from the measurement, with room, and it still separates the two things
that matter: a floating-point reduction order moves a number by less than 1e-7, and a different model
moves it by percent.
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
from pipeline.registry import list_cases  # noqa: E402

# Measured worst cross-platform difference over all sixteen cases: 2.7e-08. This sits about two
# orders above it, and roughly five orders below any difference a changed model would produce. It is
# also far finer than anything the App displays: predictions are exported rounded to a micrometre
# and read in centimetres.
RELATIVE_TOLERANCE = 1e-6


def walk(node: object, path: str = "") -> dict[str, object]:
    """Flatten a payload to leaf path to value, so two payloads compare key by key."""
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
        # bool is a subclass of int, and a flag flipping is a structural change, not a numeric one.
        if isinstance(a, bool) or isinstance(b, bool):
            if a != b:
                problems.append(f"{key}: re-baked {a!r} against committed {b!r}")
            continue
        if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):
            if a != b:
                problems.append(f"{key}: re-baked {a!r} against committed {b!r}")
            continue
        if a == b:
            continue
        scale = max(abs(a), abs(b))
        relative = abs(a - b) / scale if scale else math.inf
        numeric.append((relative, key, float(a), float(b)))

    numeric.sort(reverse=True)
    return problems, numeric


def arm_of(key: str) -> str:
    """Which arm a differing field belongs to, because that is the actionable fact.

    A difference spread over every arm points at the environment. A difference on one arm points at
    that arm. Both are worth knowing, and neither is visible from a hash.
    """
    parts = key.split(".")
    for head in ("scores", "predictions", "variant_curves", "distributions"):
        if parts[0] == head and len(parts) > 1:
            return parts[1].split("[")[0]
    return parts[0].split("[")[0]


def check_case(case, *, seed: int, repeat: int, tolerance: float, verbose: bool) -> tuple[bool, float]:
    """Bake one case and compare it. Returns whether it passed, and its worst relative error."""
    committed_path = ROOT / "data" / "derived" / case.id / "case.json"
    if not committed_path.exists():
        print(f"{case.id}: FAILED, no committed artifact at {committed_path}")
        return False, math.inf
    committed = json.loads(committed_path.read_text(encoding="utf-8"))

    digests, baked = [], {}
    for _ in range(max(1, repeat)):
        # A sandbox, never the canonical tree. A check that can overwrite the artifacts it is
        # checking can silently make itself pass.
        with tempfile.TemporaryDirectory() as sandbox:
            digests.append(bake_case(case, seed=seed, root=Path(sandbox)).digest)
            baked = json.loads((Path(sandbox) / case.id / "case.json").read_text(encoding="utf-8"))

    if len(set(digests)) > 1:
        print(f"{case.id}: FAILED self-consistency, {repeat} bakes here produced {sorted(set(digests))}")
        print("  the pipeline is reading a wall clock, iterating a set, or stopping on a time limit")
        return False, math.inf

    if digests[0] == committed["digest"]:
        print(f"{case.id}: identical, byte for byte  {digests[0][:16]}")
        return True, 0.0

    # The digest covers the payload including its own numbers, so it always moves when they do.
    baked.pop("digest", None)
    committed.pop("digest", None)
    problems, numeric = compare(baked, committed)

    worst = numeric[0][0] if numeric else 0.0
    arms = sorted({arm_of(key) for _, key, _, _ in numeric})
    status = "FAILED" if problems or worst > tolerance else "within tolerance"
    print(
        f"{case.id}: {status}, {len(numeric)} fields differ, worst {worst:.3e}"
        + (f", across {', '.join(arms)}" if arms else "")
    )
    for problem in problems:
        print(f"  STRUCTURAL {problem}")
    if verbose or worst > tolerance:
        for relative, key, a, b in numeric[:10]:
            print(f"  {relative:.3e}  {key}: re-baked {a!r} against committed {b!r}")

    return not problems and worst <= tolerance, worst


def main() -> int:
    parser = argparse.ArgumentParser(description="Re-bake and compare against the committed artifacts")
    parser.add_argument("case_id", nargs="?", help="one case; omit to check every case")
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--tolerance", type=float, default=RELATIVE_TOLERANCE)
    parser.add_argument(
        "--repeat",
        type=int,
        default=1,
        help="bake this many times and fail if they disagree with each other",
    )
    parser.add_argument("--verbose", action="store_true", help="list the worst fields even on a pass")
    args = parser.parse_args()

    cases = list_cases()
    if args.case_id:
        cases = [c for c in cases if c.id == args.case_id]
        if not cases:
            print(f"no case called {args.case_id}")
            return 1

    print(f"comparing {len(cases)} case(s) against the committed artifacts, tolerance {args.tolerance:.0e}")
    results = [
        check_case(case, seed=args.seed, repeat=args.repeat, tolerance=args.tolerance, verbose=args.verbose)
        for case in cases
    ]

    failed = [ok for ok, _ in results if not ok]
    worst = max((w for _, w in results), default=0.0)
    print(
        f"worst relative error across {len(cases)} case(s): {worst:.3e}"
        f" against a tolerance of {args.tolerance:.0e}"
    )
    if failed:
        print(f"{len(failed)} case(s) FAILED")
        return 1
    print("every case reproduces")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
