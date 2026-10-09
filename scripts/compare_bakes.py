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

That is not a hypothesis here, it is a measurement, made twice with the same pinned numpy 2.5.3,
scikit-learn 1.9.0 and xgboost 3.4.1 on Python 3.13. At 0.04, on Windows and Linux runners; at
0.06.000, Windows 11 (Python 3.13.14) against Ubuntu 24.04 under WSL2 (Python 3.13.16), with BLAS on
one thread in both:

  - 2 bakes on the same machine: identical, byte for byte;
  - worst difference across all sixteen cases: 2.7e-08 relative at 0.04 and 2.745e-08 at 0.06.000,
    both on `real-reocin-ug`;
  - a typical case: 30 to 110 fields differ, the worst of them around 1e-09;
  - the models files (0.06.000, the first run that compared them): 1392 to 1587 fields differ each,
    and the worst is 7.0e-07 relative, a network weight of magnitude 2.8e-4 that moved by 2.0e-10.
    A relative difference inflates near zero, so a near-zero weight is where a future run would
    reach the tolerance first, and such a failure is read with the magnitude the tool prints;
  - `ctrl-degenerate`, where every arm abstains and the artifact holds refusals rather than numbers:
    identical, byte for byte, at 0.04; at 0.06.000 not one of its numbers differs, and its bytes
    differ only in the digest of the models file it points at, which has numbers in it.

That last line is the control on the explanation. If the drift were structural rather than
arithmetic, a case with no arithmetic in it would drift too.

The drift is largest on the fitted arms, `published-neural-net` and `refitted-regression`, then
`svr-rbf` and `stacking`. It is not confined to them: on `real-soma` the closed forms move as well,
because a closed form here is evaluated on a reconstructed geometry that is itself several operations
deep. Any arm whose value passes through a chain of arithmetic can pick up the last bit.

**Which digests are compared.** Since 0.05.000 each case carries the content digest of the models
file of its training scope (`live_models.digest`), and that hash moves with the last bit of any number
in the file, exactly as the case's own digest does. Until 0.06.000 this tool compared it as a string,
so across environments every case failed with every number within tolerance, and nothing noticed
because the cross-environment run had not been repeated since 0.04. The two computed digests are now
skipped and the numbers they cover are compared instead: the case's own, and every number of its
models file. The corpus digest is a hash of the INPUT, the same file on every machine, and is still
compared exactly.

So the tolerance below is set from the measurement, with room, and it still separates the two things
that matter: a floating-point reduction order moved a prediction by less than 3e-8 and a fitted
parameter by less than 1e-6, and a different model moves them by percent.
"""
from __future__ import annotations

import argparse
import copy
import json
import math
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DERIVED = ROOT / "data" / "derived"
sys.path.insert(0, str(ROOT / "data-pipeline"))

from pipeline.pipeline import bake_case  # noqa: E402
from pipeline.registry import list_cases  # noqa: E402

# Measured worst cross-platform difference over all sixteen cases: 2.7e-08 at 0.04 and 2.745e-08 at
# 0.06.000, about two orders below this; over their models files 7.0e-07, on a near-zero network
# weight. It sits roughly four orders below any difference a changed model would produce, and far
# finer than anything the App displays: predictions are exported rounded to a micrometre and read in
# centimetres.
RELATIVE_TOLERANCE = 1e-6

Numeric = list[tuple[float, str, float, float]]


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


def compare(baked: dict, committed: dict) -> tuple[list[str], Numeric]:
    """Return structural problems, and numeric differences sorted worst relative error first."""
    left, right = walk(baked), walk(committed)

    problems = [f"only in the re-bake: {key}" for key in sorted(set(left) - set(right))]
    problems += [f"only in the committed artifact: {key}" for key in sorted(set(right) - set(left))]

    numeric: Numeric = []
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


def without_computed_digests(payload: dict) -> dict:
    """The payload less the two digests computed over numbers: the file's own and its models file's.

    Each moves with the last bit of any number it covers, so across environments it is a string that
    differs whenever any number does, however little. The numbers themselves are compared instead. The
    corpus digest, a hash of the input, is kept and compared exactly.
    """
    out = copy.deepcopy(payload)
    out.pop("digest", None)
    if isinstance(out.get("live_models"), dict):
        out["live_models"].pop("digest", None)
    return out


def compare_bake(sandbox: Path, case_id: str) -> tuple[list[str], Numeric, list[str], Numeric]:
    """Compare a sandbox bake of one case, and the models file it wrote, with the committed ones.

    Returns the case's structural problems and numeric differences, then its models file's.
    """
    baked = json.loads((sandbox / case_id / "case.json").read_text(encoding="utf-8"))
    committed = json.loads((DERIVED / case_id / "case.json").read_text(encoding="utf-8"))
    problems, numeric = compare(without_computed_digests(baked), without_computed_digests(committed))

    model_problems: list[str] = []
    model_numeric: Numeric = []
    path = (baked.get("live_models") or {}).get("path")
    if path and path == (committed.get("live_models") or {}).get("path"):
        rebaked_models = sandbox / path
        committed_models = DERIVED / path
        if not rebaked_models.exists() or not committed_models.exists():
            where = "re-bake" if not rebaked_models.exists() else "committed tree"
            model_problems.append(f"{path}: missing from the {where}")
        else:
            model_problems, model_numeric = compare(
                without_computed_digests(json.loads(rebaked_models.read_text(encoding="utf-8"))),
                without_computed_digests(json.loads(committed_models.read_text(encoding="utf-8"))),
            )
    return problems, numeric, model_problems, model_numeric


def arm_of(key: str) -> str:
    """Which arm a differing field belongs to, because that is the actionable fact.

    A difference spread over every arm points at the environment. A difference on one arm points at
    that arm. Both are worth knowing, and neither is visible from a hash.
    """
    parts = key.split(".")
    for head in ("scores", "predictions", "variant_curves", "distributions", "arms", "fixtures"):
        if parts[0] == head and len(parts) > 1:
            return parts[1].split("[")[0]
    return parts[0].split("[")[0]


def check_case(case, *, seed: int, repeat: int, tolerance: float, verbose: bool) -> tuple[bool, float]:
    """Bake one case and compare it and its models file. Returns whether it passed, and the worst error."""
    committed_path = DERIVED / case.id / "case.json"
    if not committed_path.exists():
        print(f"{case.id}: FAILED, no committed artifact at {committed_path}")
        return False, math.inf
    committed = json.loads(committed_path.read_text(encoding="utf-8"))

    # A sandbox, never the canonical tree. A check that can overwrite the artifacts it is checking can
    # silently make itself pass.
    with tempfile.TemporaryDirectory() as tmp:
        digests = []
        for attempt in range(max(1, repeat)):
            sandbox = Path(tmp) / f"bake-{attempt}"
            digests.append(bake_case(case, seed=seed, root=sandbox).digest)

        if len(set(digests)) > 1:
            print(f"{case.id}: FAILED self-consistency, {repeat} bakes here produced {sorted(set(digests))}")
            print("  the pipeline is reading a wall clock, iterating a set, or stopping on a time limit")
            return False, math.inf

        # The case digest covers its models file's digest, so equal digests mean both are identical.
        if digests[0] == committed["digest"]:
            print(f"{case.id}: identical, byte for byte  {digests[0][:16]}")
            return True, 0.0

        problems, numeric, model_problems, model_numeric = compare_bake(sandbox, case.id)

    worst = numeric[0][0] if numeric else 0.0
    model_worst = model_numeric[0][0] if model_numeric else 0.0
    arms = sorted({arm_of(key) for _, key, _, _ in numeric})
    ok = not problems and not model_problems and max(worst, model_worst) <= tolerance
    models_path = committed.get("live_models", {}).get("path", "no models file")
    status = "within tolerance" if ok else "FAILED"
    print(
        f"{case.id}: {status}, {len(numeric)} fields differ, worst {worst:.3e}"
        + (f", across {', '.join(arms)}" if arms else "")
        + f"; {models_path}: {len(model_numeric)} fields differ, worst {model_worst:.3e}"
    )
    for problem in problems:
        print(f"  STRUCTURAL {problem}")
    for problem in model_problems:
        print(f"  STRUCTURAL {models_path}: {problem}")
    if verbose or worst > tolerance:
        for relative, key, a, b in numeric[:10]:
            print(f"  {relative:.3e}  {key}: re-baked {a!r} against committed {b!r}")
    if verbose or model_worst > tolerance:
        for relative, key, a, b in model_numeric[:5]:
            print(f"  {relative:.3e}  {models_path}:{key}: re-baked {a!r} against committed {b!r}")

    return ok, max(worst, model_worst)


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

    print(
        f"comparing {len(cases)} case(s) and their models files against the committed artifacts, "
        f"tolerance {args.tolerance:.0e}"
    )
    results = [
        check_case(case, seed=args.seed, repeat=args.repeat, tolerance=args.tolerance, verbose=args.verbose)
        for case in cases
    ]

    failed = [ok for ok, _ in results if not ok]
    worst = max((w for _, w in results), default=0.0)
    print(
        f"worst relative error across {len(cases)} case(s) and their models files: {worst:.3e}"
        f" against a tolerance of {args.tolerance:.0e}"
    )
    if failed:
        print(f"{len(failed)} case(s) FAILED")
        return 1
    print("every case reproduces")
    return 0


if __name__ == "__main__":
    sys.exit(main())
