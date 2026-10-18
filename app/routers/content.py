"""GET-only endpoints serving the committed documents unchanged (read-only).

As docs/contracts/api.openapi.json declares. A document that does not exist yet, or exists but is not JSON,
is a declared state: 503 with state missing and its reason, never an empty body that looks like data and
never a 500. No write paths.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from ..services import content

router = APIRouter(prefix="/api")

NOT_BAKED = {"en": "The pipeline has not baked this build.", "es": "El pipeline no ha generado esta versión."}
NO_BENCHMARK = {"en": "The benchmark is not in this build.", "es": "El benchmark no está en esta versión."}
NO_READINESS = {
    "en": "The readiness document is not in this build.",
    "es": "El documento de disponibilidad no está en esta versión.",
}


def _unavailable(reason: dict[str, str]) -> HTTPException:
    return HTTPException(status_code=503, detail={"state": "missing", "reason": reason})


def _unreadable(exc: content.Unreadable) -> HTTPException:
    return _unavailable(
        {"en": f"The document {exc.rel} is unreadable.", "es": f"El documento {exc.rel} no se puede leer."}
    )


@router.get("/cases")
def list_cases() -> Any:
    """The index (catalog row case-index): every baked case, the benchmark and the models files."""
    try:
        index = content.load_index()
    except content.Unreadable as exc:
        raise _unreadable(exc) from exc
    if index is None:
        raise _unavailable(NOT_BAKED)
    return index


@router.get("/cases/{case_id}/manifest")
def get_manifest(case_id: str) -> Any:
    try:
        if content.load_index() is None:
            raise _unavailable(NOT_BAKED)
        m = content.load_manifest(case_id)
    except content.Unreadable as exc:
        raise _unreadable(exc) from exc
    if m is None:
        raise HTTPException(status_code=404, detail="unknown case")
    return m


@router.get("/artifacts/{rel_path:path}")
def get_artifact(rel_path: str) -> Any:
    """A case artifact an indexed case lists, by its path under data/derived.

    For example `<case>/case.json`.
    """
    try:
        art = content.load_artifact(rel_path)
    except content.Unreadable as exc:
        raise _unreadable(exc) from exc
    if art is None:
        raise HTTPException(status_code=404, detail="no such artifact")
    return art


@router.get("/models/{scope}")
def get_models(scope: str) -> Any:
    """The fitted models of an indexed training scope (the withheld site, or corpus)."""
    try:
        if content.load_index() is None:
            raise _unavailable(NOT_BAKED)
        doc = content.load_models(scope)
    except content.Unreadable as exc:
        raise _unreadable(exc) from exc
    if doc is None:
        raise HTTPException(status_code=404, detail="unknown models scope")
    return doc


@router.get("/benchmark")
def get_benchmark() -> Any:
    """The cross-case benchmark."""
    try:
        doc = content.load_benchmark()
    except content.Unreadable as exc:
        raise _unreadable(exc) from exc
    if doc is None:
        raise _unavailable(NO_BENCHMARK)
    return doc


@router.get("/readiness")
def get_readiness() -> Any:
    """What is real in this build: the committed readiness document, with the api row available."""
    try:
        doc = content.load_readiness()
    except content.Unreadable as exc:
        raise _unreadable(exc) from exc
    if doc is None:
        raise _unavailable(NO_READINESS)
    return doc
