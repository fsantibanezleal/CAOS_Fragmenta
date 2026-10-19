"""The readiness document (catalog row readiness, ADR-0080 decisions 3 and 4): what is real in this build,
computed from docs/contracts/catalog.md and the repository state, never written by hand.

A pure function of its inputs: no clock, no randomness, rows in catalog order, ``missing`` sorted. The
rules, their order (first match wins) and their reasons are the catalog's ``## Missing-data states``
table; tests/contracts/test_readiness.py parses that table and holds every reason here to it. Stdlib
only, so scripts/check_readiness.py runs in CI without installing the pipeline's dependencies, and
``run.py readiness`` runs without the training stack.

The shape follows CAOS_PRODUCT_TEMPLATE 0.08.002 (core/readiness.py) with Fragmenta's rows: the index is
the inventory of the bake, so a case's manifest, its artifact and each models file are checked against
the paths the index lists, and the benchmark is checked against ``benchmark.json``. ``models_dir`` is
accepted for the template's signature (check_readiness.py passes it) and is not read: Fragmenta's fitted
models are documents of the bake (``models/<scope>.json`` under the derived root), not a released bundle
apart from it.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from .manifest import READINESS_SCHEMA

SCHEMA = READINESS_SCHEMA
CATALOG_REL = "docs/contracts/catalog.md"
INDEX_REL = "manifests/index.json"
BENCHMARK_REL = "benchmark.json"
STATUSES = ("real", "active")  # the catalog's status vocabulary (its Contracts section), exactly, lower case
BAKED_ROWS = (
    "case-index",
    "case-manifest",
    "case-artifact",
    "models-file",
    "benchmark",
)  # the rows the bake produces

# the catalog's reasons as (en, es) templates, in the order of its Missing-data table
T_PROVIDER = (
    "Served by its provider ({provider}); the real producer is not built yet.",
    "Lo sirve su proveedor ({provider}); el productor real aún no está construido.",
)
T_NOT_BAKED = ("The pipeline has not baked this build.", "El pipeline no ha generado esta versión.")
T_MANIFESTS = ("{n} of {total} manifests are absent.", "Faltan {n} de {total} manifiestos.")
T_ARTIFACTS = ("{n} of {total} artifacts are absent.", "Faltan {n} de {total} artefactos.")
T_MODELS = ("{n} of {total} models files are absent.", "Faltan {n} de {total} archivos de modelos.")
T_NO_BENCHMARK = ("The benchmark has not been baked.", "El benchmark no se ha generado.")
T_STALE = (
    "Baked by {app_version}; the product is {version}.",
    "Generado por {app_version}; el producto es {version}.",
)
T_API = (
    "The API lane is dormant; the site reads the committed documents.",
    "La API está inactiva; el sitio lee los documentos versionados.",
)


def parse_catalog(text: str) -> list[dict[str, str]]:
    """The rows of the ``## Contracts`` table, one dict per row keyed by the lower-cased header cells."""
    lines = text.replace("\r\n", "\n").split("\n")
    start = next(i for i, ln in enumerate(lines) if ln.strip() == "## Contracts")
    table: list[list[str]] = []
    for ln in lines[start + 1 :]:
        if ln.startswith("## "):
            break
        if ln.startswith("|"):
            table.append([c.strip() for c in ln.strip().strip("|").split("|")])
    header = [c.lower() for c in table[0]]
    return [dict(zip(header, cells)) for cells in table[2:]]  # table[1] is the separator


def _fill(tpl: tuple[str, str], **vals: object) -> dict[str, str]:
    out = []
    for text in tpl:
        for k, v in vals.items():
            text = text.replace("{" + k + "}", str(v))
        out.append(text)
    return {"en": out[0], "es": out[1]}


def _json(path: Path) -> Any | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


class _Facts:
    """What the repository says, read once: the index and which of the files it lists are absent."""

    def __init__(self, derived_root: Path, version: str) -> None:
        self.version = version
        index = _json(derived_root / INDEX_REL)
        self.index: dict | None = index if isinstance(index, dict) else None
        self.app_version = str(self.index.get("app_version")) if self.index else ""
        self.manifests_total = self.artifacts_total = self.models_total = 0
        self.manifests_missing: list[str] = []
        self.artifacts_missing: list[str] = []
        self.models_missing: list[str] = []
        if self.index:
            for entry in self.index.get("cases", []):
                self.manifests_total += 1
                if not (derived_root / entry["manifest_path"]).is_file():
                    self.manifests_missing.append(entry["manifest_path"])
                self.artifacts_total += 1
                if not (derived_root / entry["artifact_path"]).is_file():
                    self.artifacts_missing.append(entry["artifact_path"])
            for entry in self.index.get("models", []):
                self.models_total += 1
                if not (derived_root / entry["path"]).is_file():
                    self.models_missing.append(entry["path"])
        self.benchmark_present = (derived_root / BENCHMARK_REL).is_file()


def _entry(
    row: dict[str, str],
    state: str,
    provenance: str | None,
    reason: dict | None,
    missing: list[str] | None = None,
) -> dict:
    return {
        "id": row["id"],
        "version": row["version"],
        "status": row["status"],
        "provenance": provenance,
        "state": state,
        "reason": reason,
        "missing": sorted(missing or []),
    }


def _rule(row: dict[str, str], f: _Facts) -> dict:
    """The first rule of the catalog's Missing-data table that matches ``row``."""
    rid = row["id"]
    provider = row.get("provider", "").replace("`", "")
    if row["status"] not in STATUSES:
        raise ValueError(
            f"catalog row {rid!r}: status {row['status']!r} is not one of "
            f"{' or '.join(repr(s) for s in STATUSES)} (lower case, no other value)"
        )
    if row["status"] == "active":
        return _entry(
            row, "provider", provider.split(":", 1)[0] or "stub", _fill(T_PROVIDER, provider=provider)
        )
    baked = rid in BAKED_ROWS
    if baked and f.index is None:
        return _entry(row, "missing", None, _fill(T_NOT_BAKED))
    if rid == "case-manifest" and f.manifests_missing:
        return _entry(
            row,
            "partial",
            "real",
            _fill(T_MANIFESTS, n=len(f.manifests_missing), total=f.manifests_total),
            f.manifests_missing,
        )
    if rid == "case-artifact" and f.artifacts_missing:
        return _entry(
            row,
            "partial",
            "real",
            _fill(T_ARTIFACTS, n=len(f.artifacts_missing), total=f.artifacts_total),
            f.artifacts_missing,
        )
    if rid == "models-file" and f.models_missing:
        return _entry(
            row,
            "partial",
            "real",
            _fill(T_MODELS, n=len(f.models_missing), total=f.models_total),
            f.models_missing,
        )
    if rid == "benchmark" and not f.benchmark_present:
        return _entry(row, "missing", None, _fill(T_NO_BENCHMARK))
    if baked and f.app_version != f.version:
        return _entry(row, "stale", "real", _fill(T_STALE, app_version=f.app_version, version=f.version))
    if rid == "api":
        return _entry(row, "missing", None, _fill(T_API))
    return _entry(row, "available", "real", None)


def compute(
    *,
    repo_root: str | Path,
    derived_root: str | Path,
    models_dir: str | Path | None = None,
    catalog_path: str | Path | None = None,
    version: str | None = None,
) -> dict:
    """The readiness document of the repository at ``repo_root``, whose baked documents are under
    ``derived_root``. ``catalog_path`` and ``version`` default to the repository's. ``models_dir`` is
    accepted and ignored (see the module)."""
    root = Path(repo_root)
    catalog = Path(catalog_path) if catalog_path else root / CATALOG_REL
    raw = catalog.read_bytes().replace(b"\r\n", b"\n")
    ver = version if version is not None else (root / "VERSION").read_text(encoding="utf-8").strip()
    facts = _Facts(Path(derived_root), ver)
    rows = [r for r in parse_catalog(raw.decode("utf-8")) if r["id"] != "readiness"]
    return {
        "schema": SCHEMA,
        "product_version": ver,
        "catalog_sha256": hashlib.sha256(raw).hexdigest(),
        "contracts": [_rule(r, facts) for r in rows],
    }


def to_bytes(doc: dict) -> bytes:
    """The one serialisation of the document, which scripts/check_readiness.py compares byte for byte:
    compact separators, keys in the order ``compute`` builds them, non-ASCII kept (the Spanish reasons),
    no trailing newline, UTF-8."""
    return json.dumps(doc, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def write(derived_root: str | Path, doc: dict) -> int:
    """Write ``<derived_root>/readiness.json`` (LF, no BOM); return its byte size."""
    path = Path(derived_root) / "readiness.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    data = to_bytes(doc)
    path.write_bytes(data)
    return len(data)
