"""The measured live-versus-precompute gate.

A case runs LIVE in the browser only if it is pure Python, its wheels are Pyodide-safe, and it is
small and fast enough. Otherwise it is PRECOMPUTE and the site replays the committed artifact.

The verdict and the numbers behind it go into the manifest, and CI fails on a mislabelling. This is
a MEASUREMENT, never a hand-wave: a lane chosen by hand is a claim about performance that nothing
ever checks.
"""
from __future__ import annotations

LIVE_WHEELS: set[str] = {"numpy"}   # the Pyodide-safe wheel set the live lane is allowed to import
RUN_MS_GATE = 1500.0                 # a live run must complete well within an interaction budget
TRACE_BYTES_GATE = 256 * 1024        # a live/replay artifact must stay small


def classify_lane(*, pure_python: bool, wheels: set[str], run_ms: float, trace_bytes: int) -> dict:
    reasons: list[str] = []
    live = True
    if not pure_python:
        live = False
        reasons.append("not pure-python")
    extra = set(wheels) - LIVE_WHEELS
    if extra:
        live = False
        reasons.append(f"wheels not Pyodide-safe: {sorted(extra)}")
    if run_ms > RUN_MS_GATE:
        live = False
        reasons.append(f"runtime exceeds the {RUN_MS_GATE:.0f}ms budget")
    if trace_bytes > TRACE_BYTES_GATE:
        live = False
        reasons.append(f"trace_bytes {trace_bytes} > {TRACE_BYTES_GATE}")
    # The measured runtime drives the DECISION and is deliberately NOT stored. A committed manifest
    # must be a pure function of the case and the seed, and a wall clock would dirty git on every
    # re-run. The verdict and the deterministic budgets are recorded instead; the live runtime is
    # measured separately, in the browser, where it actually matters.
    return {
        "lane": "live" if live else "precompute",
        "pure_python": pure_python,
        "wheels": sorted(wheels),
        "trace_bytes": trace_bytes,
        "run_ms_budget": RUN_MS_GATE,
        "trace_bytes_budget": TRACE_BYTES_GATE,
        "reasons": reasons,
    }
