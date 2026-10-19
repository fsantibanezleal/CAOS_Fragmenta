"""The provider tree of the contract catalog (docs/contracts/fixtures/data/derived/), generated once from
the committed bake.

    python data-pipeline/pipeline/core/fixture_tree.py            write the tree
    python data-pipeline/pipeline/core/fixture_tree.py --check    exit 1 unless the tree is current

The tree is the walking skeleton's data (ADR-0080, phase 3): one small case, its manifest and artifact,
one models file, a small benchmark, the index and a readiness document that says ``provider``. It is cut
from real documents of the bake (the Murgul campaign's artifact and manifest, the Murgul models, the
benchmark) and rewritten with the product's own writer and digest function, so it validates against the
same schema files as the bake and the same tests run on both.

It is a stand-in, not a result. The numbers in it come from the real bake and are cut, not recomputed,
except the fixtures of the models file, which the engine's portable reader recomputes from the cut
models (so a walker test on the tree is self-consistent). The case says so in its own reason. Nothing
reads this tree in production.

Imports are inside the functions because the file is run by path as well as imported, and the product
declares no package.
"""

from __future__ import annotations

import copy
import hashlib
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURE_ROOT = REPO_ROOT / "docs" / "contracts" / "fixtures" / "data" / "derived"
SOURCE_CASE = "real-murgul"
CASE_ID = "fx01-fixture"
SCOPE = "Fixture"
N_BLASTS = 3
N_TREES = 2
N_VECTORS = 3
ARMS_KEPT = ("xgboost", "null")  # the benchmark's protocols keep these arms
SITES_KEPT = 2


def _read(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _models_document(source: dict, features: list[list[float]], blasts: list[dict], version: str) -> dict:
    """The Murgul models cut to a few trees and vectors, with fixtures recomputed by the portable reader."""
    import blastfrag as bf

    from pipeline.stages.export import digest

    doc = copy.deepcopy(source)
    arms = doc["arms"]
    for name in ("random-forest", "xgboost"):
        arms[name]["trees"] = arms[name]["trees"][:N_TREES]
    svr = arms["svr-rbf"]
    svr["support_vectors"], svr["dual_coef"] = (
        svr["support_vectors"][:N_VECTORS],
        svr["dual_coef"][:N_VECTORS],
    )
    for group in arms["published-neural-net"]["groups"].values():
        group["networks"] = group["networks"][:1]
    doc["scope"] = SCOPE
    doc["app_version"] = version
    doc["fixtures"] = {
        "inputs": [
            {"blast_id": b["blast_id"], "site": b["site"], "features": f} for b, f in zip(blasts, features)
        ],
        "expected": {
            name: [
                bf.predict_portable(arm_doc if name != "stacking" else _resolved(arms, arm_doc), f)[0]
                for f in features
            ]
            for name, arm_doc in arms.items()
        },
        "note": (
            "fixture tree: the models are cut from the Murgul scope to a few trees and support vectors and "
            "these values "
            "are recomputed by the portable reader from this document; for kuznetsov-transfer the value is "
            "the rock factor"
        ),
    }
    doc.pop("digest", None)
    doc["digest"] = digest(doc)
    return doc


def _resolved(arms: dict, stacking: dict) -> dict:
    """The stacked arm with its by-reference base learners filled in, as the engine's reader expects them."""
    out = copy.deepcopy(stacking)
    out["forest"] = {"trees": arms[out["forest"]["ref"]]["trees"]}
    out["boosting"] = {
        "base_score": arms[out["boosting"]["ref"]]["base_score"],
        "trees": arms[out["boosting"]["ref"]]["trees"],
    }
    return out


def _artifact(source: dict, models_digest: str, version: str) -> dict:
    from pipeline.stages.export import digest

    art = copy.deepcopy(source)
    kept = [b["blast_id"] for b in art["blasts"][:N_BLASTS]]
    art["blasts"] = art["blasts"][:N_BLASTS]
    art["predictions"] = {
        arm: {k: v for k, v in row.items() if k in kept} for arm, row in art["predictions"].items()
    }
    art["representative_blast_id"] = kept[0]
    art["provenance"]["app_version"] = version
    art["case"].update(
        id=CASE_ID,
        title={"en": "Fixture case, cut from Murgul", "es": "Caso de ejemplo, recortado de Murgul"},
        reason={
            "en": f"The provider tree's case: {N_BLASTS} blasts cut from the Murgul campaign, with the "
            "scores of the whole campaign. It stands in for a bake; it is not a result.",
            "es": f"El caso del árbol de ejemplo: {N_BLASTS} tronaduras recortadas de la campaña de "
            "Murgul, con los puntajes de la campaña completa. Reemplaza una generación; no es un resultado.",
        },
    )
    art["live_models"] = {
        "scope": SCOPE,
        "path": f"models/{SCOPE}.json",
        "digest": models_digest,
        "arms": sorted(art["live_models"]["arms"]),
    }
    art.pop("digest", None)
    art["digest"] = digest(art)
    return art


def _benchmark(source: dict, version: str) -> dict:
    from pipeline.stages.export import digest

    b = copy.deepcopy(source)
    b["app_version"] = version
    sites = b["sites"][:SITES_KEPT]
    b["sites"] = sites
    b["site_counts"] = {s: b["site_counts"][s] for s in sites}
    b["site_meta"] = {s: b["site_meta"][s] for s in sites}
    b["corpus_rows"] = b["corpus_rows"][:N_BLASTS]
    b["holdout_rows"] = b["holdout_rows"][:N_BLASTS]
    b["duplicate_groups"] = b["duplicate_groups"][:1]
    for proto in b["protocols"].values():
        proto["arms"] = {a: proto["arms"][a] for a in ARMS_KEPT}
        for arm in proto["arms"].values():
            if proto["repeated"]:
                arm["draws"] = arm["draws"][:N_BLASTS]
                arm["common"]["draws_r2_identity"] = arm["common"]["draws_r2_identity"][:N_BLASTS]
            else:
                arm["per_site"] = {s: arm["per_site"][s] for s in sites}
                arm["predictions"] = dict(list(arm["predictions"].items())[:N_BLASTS])
    out = b["diagnostics"]["outliers"]
    out["anomaly_score"] = dict(list(out["anomaly_score"].items())[:N_BLASTS])
    b["diagnostics"]["resampling_importance"] = {
        "xgboost": b["diagnostics"]["resampling_importance"]["xgboost"]
    }
    sweep = b["network_seed_sweep"]
    sweep["r2_identity"] = sweep["r2_identity"][:N_BLASTS]
    sweep["per_blast"] = dict(list(sweep["per_blast"].items())[:2])
    b.pop("digest", None)
    b["digest"] = digest(b)
    return b


def _readiness(repo_root: Path) -> dict:
    from pipeline.core import readiness

    raw = (repo_root / readiness.CATALOG_REL).read_bytes().replace(b"\r\n", b"\n")
    rows = [r for r in readiness.parse_catalog(raw.decode("utf-8")) if r["id"] != "readiness"]
    contracts = []
    for row in rows:
        if row["id"] == "api":
            contracts.append(
                {
                    "id": "api",
                    "version": row["version"],
                    "status": "real",
                    "provenance": None,
                    "state": "missing",
                    "reason": readiness._fill(readiness.T_API),
                    "missing": [],
                }
            )
            continue
        provider = row["provider"].replace("`", "")
        contracts.append(
            {
                "id": row["id"],
                "version": row["version"],
                "status": "active",
                "provenance": "fixture",
                "state": "provider",
                "reason": readiness._fill(readiness.T_PROVIDER, provider=provider),
                "missing": [],
            }
        )
    return {
        "schema": readiness.SCHEMA,
        "product_version": (repo_root / "VERSION").read_text(encoding="utf-8").strip(),
        "catalog_sha256": hashlib.sha256(raw).hexdigest(),
        "contracts": contracts,
    }


def build(repo_root: Path = REPO_ROOT, out: Path = FIXTURE_ROOT) -> dict[str, bytes]:
    """The tree as {relative path: file bytes}, built from ``repo_root``'s committed bake. Writes nothing."""
    from pipeline.core.jsonio import dumps

    derived = repo_root / "data" / "derived"
    version = (repo_root / "VERSION").read_text(encoding="utf-8").strip()
    index = _read(derived / "manifests" / "index.json")
    manifest = _read(derived / "manifests" / f"{SOURCE_CASE}.json")
    source_art = _read(derived / SOURCE_CASE / "case.json")
    scope = manifest["models_scope"]
    models_src = _read(derived / "models" / f"{scope}.json")

    blasts = source_art["blasts"][:N_BLASTS]
    features = [
        [
            b["features"][name]
            for name in ("S_over_B", "H_over_B", "B_over_D", "T_over_B", "Pf_kg_m3", "XB_m", "E_GPa")
        ]
        for b in blasts
    ]
    models = _models_document(models_src, features, blasts, version)
    artifact = _artifact(source_art, models["digest"], version)
    bench = _benchmark(_read(derived / "benchmark.json"), version)

    files: dict[str, bytes] = {}
    files[f"models/{SCOPE}.json"] = dumps(models, compact=True).encode("utf-8")
    files[f"{CASE_ID}/case.json"] = dumps(artifact).encode("utf-8")
    files["benchmark.json"] = dumps(bench).encode("utf-8")

    n_scoreable = sum(1 for b in blasts if b["x50_measured_m"] is not None)
    man = copy.deepcopy(manifest)
    man.update(
        case_id=CASE_ID,
        app_version=version,
        digest=artifact["digest"],
        models_scope=SCOPE,
        n_scoreable=n_scoreable,
    )
    man["artifact"] = {
        "path": f"{CASE_ID}/case.json",
        "format": "json",
        "bytes": len(files[f"{CASE_ID}/case.json"]),
    }
    man["gate"]["trace_bytes"] = man["artifact"]["bytes"]
    man["provenance"]["n_blasts"] = len(blasts)
    files[f"manifests/{CASE_ID}.json"] = dumps(man).encode("utf-8")

    entry = next(c for c in index["cases"] if c["case_id"] == SOURCE_CASE)
    entry = {
        **entry,
        "case_id": CASE_ID,
        "title": artifact["case"]["title"],
        "manifest_path": f"manifests/{CASE_ID}.json",
        "artifact_path": f"{CASE_ID}/case.json",
        "bytes": man["artifact"]["bytes"],
        "digest": artifact["digest"],
        "lane": man["lane"],
    }
    new_index = {
        "schema": index["schema"],
        "app_version": version,
        "engine_version": index["engine_version"],
        "corpus_digest": index["corpus_digest"],
        "n_cases": 1,
        "cases": [entry],
        "models": [
            {
                "scope": SCOPE,
                "path": f"models/{SCOPE}.json",
                "bytes": len(files[f"models/{SCOPE}.json"]),
                "digest": models["digest"],
                "arms": sorted(models["arms"]),
            }
        ],
        "benchmark": {
            "path": "benchmark.json",
            "bytes": len(files["benchmark.json"]),
            "digest": bench["digest"],
            "verdict": bench["verdict"]["outcome"],
        },
    }
    files["manifests/index.json"] = dumps(new_index).encode("utf-8")
    files["readiness.json"] = (
        json.dumps(_readiness(repo_root), separators=(",", ":"), ensure_ascii=False)
    ).encode("utf-8")
    return files


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    files = build()
    if "--check" in args:
        stale = [
            rel
            for rel, data in sorted(files.items())
            if not (FIXTURE_ROOT / rel).is_file() or (FIXTURE_ROOT / rel).read_bytes() != data
        ]
        extra = sorted(
            p.relative_to(FIXTURE_ROOT).as_posix()
            for p in FIXTURE_ROOT.rglob("*")
            if p.is_file() and p.relative_to(FIXTURE_ROOT).as_posix() not in files
        )
        for rel in stale:
            print(f"stale: {rel}")
        for rel in extra:
            print(f"unexpected: {rel}")
        print("fixture tree: " + ("current" if not stale and not extra else "NOT current"))
        return 0 if not stale and not extra else 1
    for rel, data in files.items():
        path = FIXTURE_ROOT / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        print(f"wrote {path.relative_to(REPO_ROOT).as_posix()} ({len(data)} bytes)")
    return 0


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
    raise SystemExit(main())
