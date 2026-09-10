"""The one writer for every file this pipeline ships.

Four places used to serialise JSON with their own call, and they agreed by coincidence rather than
by construction. Two things have to hold for the artifacts to be portable, and neither is the
default.

**Line endings are fixed at LF.** `Path.write_text` on Windows translates every newline to CRLF, so
the same bake on two operating systems writes the same NUMBERS into files with different BYTES. The
digest is taken over the payload rather than the file, so it never noticed, but the declared byte
size in the manifest was then wrong by one byte per line on one of the two platforms, and any
future file-level integrity check would have failed for a reason nobody would look for.

**Non-finite floats raise instead of being written.** Python emits `NaN` and `Infinity` into JSON
happily; neither is valid JSON and `JSON.parse` throws on the first one, which reaches a user as a
blank page rather than as an error anyone can trace. `allow_nan=False` turns that into a bake
failure at the moment it is created. This is deliberately belt and braces with the payload-level
conversion in `stages/export.py`: that one can be forgotten when a new field is added, this one
cannot.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

__all__ = ["dumps", "write_json"]


def dumps(payload: Any) -> str:
    """Serialise a payload the one way this product serialises anything readable."""
    return json.dumps(payload, indent=1, sort_keys=True, default=str, allow_nan=False)


def write_json(path: Path, payload: Any) -> int:
    """Write a payload and return the size of the file that is actually on disk."""
    path.parent.mkdir(parents=True, exist_ok=True)
    text = dumps(payload)
    # newline="" leaves the string untouched, so the LF written here is the LF that lands.
    path.write_text(text, encoding="utf-8", newline="")
    return len(text.encode("utf-8"))
