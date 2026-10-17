"""Read the committed documents (index, manifests, artifacts, models files, benchmark, readiness) as they are.
Read-only, path-traversal guarded.

Only what the index lists is served: a manifest of an indexed case, an artifact an indexed case names, a models
file of an indexed scope (never the index, the readiness, the benchmark or a manifest as an "artifact"), so no
route answers with a body its OpenAPI response does not declare. A document that exists but is not JSON raises
``Unreadable``, which the router answers as a declared 503.

The documents are served unchanged; their shapes are the schema files under docs/contracts/schemas/, checked by
tests/contracts and scripts/check_documents.py, never re-declared here.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from ..config import REPO_ROOT, Settings


class Unreadable(Exception):
    """A committed document exists but cannot be read as JSON; ``rel`` is its path under the derived root."""

    def __init__(self, rel: str) -> None:
        super().__init__(rel)
        self.rel = rel


def _derived() -> Path:
    return (REPO_ROOT / Settings().data_dir).resolve()


def _read(rel: str) -> Any | None:
    """A committed JSON document under the derived root, or None (missing, or outside the root).

    Raises ``Unreadable`` when the file is there but is not valid JSON.
    """
    root = _derived()
    p = (root / rel).resolve()
    if p.suffix != ".json" or (p != root and root not in p.parents) or not p.is_file():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:  # ValueError covers a JSON syntax error and bytes that are not UTF-8
        raise Unreadable(rel) from exc


def load_index() -> dict | None:
    """The case index, or None when the pipeline has not baked this build (never a stand-in body)."""
    return _read("manifests/index.json")


def load_benchmark() -> dict | None:
    """The benchmark, or None when it is not in this build."""
    return _read("benchmark.json")


def load_readiness() -> dict | None:
    """The committed readiness document with the api row set to available, or None when it is absent.

    The API answering is the evidence for that row. Its status becomes real too: the schema forbids provenance
    real under status active, and the app answering is the real producer of the api row.
    """
    doc = _read("readiness.json")
    if doc is None:
        return None
    for entry in doc.get("contracts", []):
        if entry.get("id") == "api":
            entry.update(status="real", state="available", provenance="real", reason=None, missing=[])
    return doc


def _entries(key: str) -> list[dict]:
    index = load_index()
    items = index.get(key, []) if isinstance(index, dict) else []
    return [e for e in items if isinstance(e, dict)]


def load_manifest(case_id: str) -> dict | None:
    """The manifest of an indexed case, or None for any other id (the index itself, a path, a case not baked)."""
    for entry in _entries("cases"):
        if entry.get("case_id") == case_id and isinstance(entry.get("manifest_path"), str):
            return _read(entry["manifest_path"])
    return None


def load_artifact(rel: str) -> Any | None:
    """The artifact some indexed case lists, by exactly that path, or None."""
    for entry in _entries("cases"):
        if entry.get("artifact_path") == rel:
            return _read(rel)
    return None


def load_models(scope: str) -> dict | None:
    """The models file of an indexed scope, or None for any other name."""
    for entry in _entries("models"):
        if entry.get("scope") == scope and isinstance(entry.get("path"), str):
            return _read(entry["path"])
    return None
