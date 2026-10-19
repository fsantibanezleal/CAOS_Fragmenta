"""Producer-side tests of the document contracts (catalog rows case-index, case-manifest, case-artifact,
models-file, benchmark): every document of the committed bake and of the provider tree validates against
its schema file (docs/contracts/schemas/) and obeys the rules a schema cannot state. The same assertions
run on both roots (the swap test). The consumer side is frontend/src/lib/contract.test.ts (owed by U3b).

Nothing here re-bakes: the documents are the committed ones, read as they are."""

from __future__ import annotations

import copy
import json
import subprocess
import sys
from pathlib import Path

import contract_schemas as cs
import pytest
from openapi_spec_validator import validate as validate_openapi
from pipeline.stages.export import digest

BAKE = cs.DERIVED_ROOTS["bake"]
FIXTURE = cs.DERIVED_ROOTS["fixture"]
ROOTS = {"committed bake": BAKE, "fixture tree": FIXTURE}


def index_of(root: Path) -> dict:
    return cs.load_json(root / "manifests" / "index.json")


def own_digest(doc: dict) -> str:
    """The content address a document carries: the digest of everything but the digest."""
    return digest({k: v for k, v in doc.items() if k != "digest"})


def cross_field_errors(root: Path) -> list[str]:
    """Every departure from the schemas and from the rules they cannot state, for the documents under
    ``root`` (a data/derived layout): the index, the manifests, the artifacts, the models files and the
    benchmark. A missing document is an error naming its path."""
    out: list[str] = []
    index_path = root / "manifests" / "index.json"
    if not index_path.is_file():
        return [f"missing {index_path}"]
    index = cs.load_json(index_path)
    out += [f"index {e}" for e in cs.errors("case-index", index)]
    ids = [c.get("case_id") for c in index.get("cases", [])]
    if index.get("n_cases") != len(ids):
        out.append(f"index: n_cases={index.get('n_cases')} but {len(ids)} entries")
    if ids != sorted(set(ids)):
        out.append("index: entries are not sorted by case_id and unique")
    scopes = {m["scope"]: m for m in index.get("models", [])}
    for entry in index.get("cases", []):
        cid = entry["case_id"]
        mpath, apath = root / entry["manifest_path"], root / entry["artifact_path"]
        if not mpath.is_file():
            out.append(f"missing manifest {mpath}")
        else:
            m = cs.load_json(mpath)
            out += [f"{cid} manifest {e}" for e in cs.errors("case-manifest", m)]
            if m.get("case_id") != cid:
                out.append(f"{cid}: manifest case_id is {m.get('case_id')!r}")
            if m.get("lane") != (m.get("gate") or {}).get("lane"):
                out.append(f"{cid}: lane {m.get('lane')!r} differs from gate.lane")
            if m.get("artifact", {}).get("path") != entry["artifact_path"]:
                out.append(f"{cid}: manifest artifact.path differs from the index artifact_path")
            if m.get("digest") != entry["digest"]:
                out.append(f"{cid}: manifest digest differs from the index digest")
            if m.get("models_scope") not in scopes:
                out.append(f"{cid}: models_scope {m.get('models_scope')!r} is not in the index models")
        if not apath.is_file():
            out.append(f"missing artifact {apath}")
            continue
        if apath.stat().st_size != entry["bytes"]:
            out.append(
                f"{cid}: index bytes {entry['bytes']} differs from the file size {apath.stat().st_size}"
            )
        a = cs.load_json(apath)
        out += [f"{cid} artifact {e}" for e in cs.errors("case-artifact", a)]
        if a.get("case", {}).get("id") != cid:
            out.append(f"{cid}: artifact case.id is {a.get('case', {}).get('id')!r}")
        if a.get("digest") != own_digest(a) or a.get("digest") != entry["digest"]:
            out.append(f"{cid}: the artifact digest is not the digest of its content or of the index entry")
        blasts = [b["blast_id"] for b in a.get("blasts", [])]
        if a.get("representative_blast_id") not in blasts:
            out.append(
                f"{cid}: representative_blast_id {a.get('representative_blast_id')!r} is not a blast"
            )
        for arm, row in a.get("predictions", {}).items():
            if sorted(row) != sorted(blasts):
                out.append(f"{cid}: arm {arm} does not answer exactly the case's blasts")
        for arm in a.get("scores", {}):
            if arm != "null" and arm not in a.get("predictions", {}):
                out.append(f"{cid}: scores name the arm {arm}, which has no predictions")
        live = a.get("live_models")
        if live is not None:
            mf = root / live["path"]
            if live["scope"] not in scopes or not mf.is_file():
                out.append(f"{cid}: live_models names {live['path']}, which is not served")
            elif cs.load_json(mf).get("digest") != live["digest"]:
                out.append(f"{cid}: live_models digest differs from the models file")
    for scope, entry in scopes.items():
        path = root / entry["path"]
        if not path.is_file():
            out.append(f"missing models file {path}")
            continue
        doc = cs.load_json(path)
        out += [f"models/{scope} {e}" for e in cs.errors("models-file", doc)]
        if doc.get("scope") != scope:
            out.append(f"models/{scope}: scope is {doc.get('scope')!r}")
        if doc.get("digest") != own_digest(doc) or doc.get("digest") != entry["digest"]:
            out.append(f"models/{scope}: the digest is not the digest of its content or of the index entry")
        if path.stat().st_size != entry["bytes"]:
            out.append(f"models/{scope}: index bytes differ from the file size")
        if sorted(doc.get("arms", {})) != sorted(entry["arms"]):
            out.append(f"models/{scope}: the index lists other arms than the file holds")
        n = len(doc.get("fixtures", {}).get("inputs", []))
        for arm, expected in doc.get("fixtures", {}).get("expected", {}).items():
            if len(expected) != n:
                out.append(
                    f"models/{scope}: fixtures.expected[{arm}] has {len(expected)} values for {n} inputs"
                )
    bench = index.get("benchmark")
    if bench:
        path = root / bench["path"]
        if not path.is_file():
            out.append(f"missing benchmark {path}")
        else:
            doc = cs.load_json(path)
            out += [f"benchmark {e}" for e in cs.errors("benchmark", doc)]
            if doc.get("digest") != own_digest(doc) or doc.get("digest") != bench["digest"]:
                out.append("benchmark: the digest is not the digest of its content or of the index entry")
            if doc.get("corpus_digest") != index.get("corpus_digest"):
                out.append("benchmark: corpus_digest differs from the index's")
            if sorted(doc.get("site_meta", {})) != sorted(doc.get("sites", [])):
                out.append("benchmark: site_meta does not name exactly the sites")
            if path.stat().st_size != bench["bytes"]:
                out.append("benchmark: index bytes differ from the file size")
    return out


def every_document(root: Path) -> dict[str, list[tuple[str, dict]]]:
    """(label, document) of each kind under ``root``, read from the index, never a stray file."""
    index = index_of(root)
    return {
        "case-index": [("index", index)],
        "case-manifest": [(c["case_id"], cs.load_json(root / c["manifest_path"])) for c in index["cases"]],
        "case-artifact": [(c["case_id"], cs.load_json(root / c["artifact_path"])) for c in index["cases"]],
        "models-file": [(m["scope"], cs.load_json(root / m["path"])) for m in index["models"]],
        "benchmark": [("benchmark", cs.load_json(root / index["benchmark"]["path"]))]
        if "benchmark" in index
        else [],
    }


def test_the_committed_bake_has_every_document_the_catalog_names() -> None:
    docs = every_document(BAKE)
    assert [
        len(docs[k]) for k in ("case-index", "case-manifest", "case-artifact", "models-file", "benchmark")
    ] == [1, 16, 16, 11, 1]


@pytest.mark.parametrize("kind", ["case-index", "case-manifest", "case-artifact", "models-file", "benchmark"])
def test_every_document_validates_on_both_roots(kind: str) -> None:
    for label, root in ROOTS.items():
        docs = every_document(root)[kind]
        assert docs, f"{label}: no {kind} document"
        for name, doc in docs:
            assert cs.errors(kind, doc) == [], f"{label} {kind} {name}"


def test_index_validates() -> None:
    for label, root in ROOTS.items():
        index = index_of(root)
        assert cs.errors("case-index", index) == [], label
        ids = [c["case_id"] for c in index["cases"]]
        assert index["n_cases"] == len(ids) and ids == sorted(ids), label


def test_manifests_validate() -> None:
    for label, root in ROOTS.items():
        for entry in index_of(root)["cases"]:
            m = cs.load_json(root / entry["manifest_path"])
            assert cs.errors("case-manifest", m) == [], f"{label} {entry['case_id']}"
            assert m["case_id"] == entry["case_id"] and m["lane"] == m["gate"]["lane"], (
                f"{label} {entry['case_id']}"
            )


def test_artifacts_validate() -> None:
    for label, root in ROOTS.items():
        for entry in index_of(root)["cases"]:
            a = cs.load_json(root / entry["artifact_path"])
            assert cs.errors("case-artifact", a) == [], f"{label} {entry['case_id']}"


def test_models_files_validate() -> None:
    for label, root in ROOTS.items():
        for entry in index_of(root)["models"]:
            doc = cs.load_json(root / entry["path"])
            assert cs.errors("models-file", doc) == [], f"{label} {entry['scope']}"


def test_benchmark_validates() -> None:
    for label, root in ROOTS.items():
        doc = cs.load_json(root / index_of(root)["benchmark"]["path"])
        assert cs.errors("benchmark", doc) == [], label


def test_every_root_passes_the_cross_field_rules() -> None:
    for label, root in ROOTS.items():
        assert cross_field_errors(root) == [], label


def test_fixture_tree_validates() -> None:
    assert cross_field_errors(FIXTURE) == []
    readiness_path = FIXTURE / "readiness.json"
    assert readiness_path.is_file(), f"missing {readiness_path}"
    readiness = cs.load_json(readiness_path)
    assert cs.errors("readiness", readiness) == []
    assert all(e["state"] == "provider" for e in readiness["contracts"] if e["id"] != "api")
    assert next(e for e in readiness["contracts"] if e["id"] == "api")["state"] == "missing"
    run = subprocess.run(
        [sys.executable, str(cs.ROOT / "scripts" / "check_artifacts.py"), str(cs.FIXTURE_ROOT)],
        capture_output=True,
        text=True,
        check=False,
    )
    assert run.returncode == 0, run.stdout + run.stderr


def test_the_fixture_tree_is_small() -> None:
    size = sum(p.stat().st_size for p in FIXTURE.rglob("*") if p.is_file())
    assert size < 700_000, size


def test_the_fixture_tree_is_what_the_generator_writes() -> None:
    """The provider tree is generated once from the committed bake.

    A change to the bake, the catalog or VERSION that leaves it behind fails here, with the command that
    regenerates it.
    """
    from pipeline.core import fixture_tree

    files = fixture_tree.build()
    on_disk = {p.relative_to(FIXTURE).as_posix() for p in FIXTURE.rglob("*") if p.is_file()}
    fix = "run: python data-pipeline/pipeline/core/fixture_tree.py"
    assert on_disk == set(files), fix
    for rel, data in files.items():
        assert (FIXTURE / rel).read_bytes() == data, f"{rel}: {fix}"


def test_examples_validate() -> None:
    """The documents' examples are the fixture tree's files (catalog column example); the two that are not
    documents of the tree, a corpus row and the API's unavailable body, are in docs/contracts/examples/."""
    examples = cs.CONTRACTS / "examples"
    assert cs.errors("blast-record", cs.load_json(examples / "blast-record.json")) == []
    assert cs.component_errors("UnavailableBody", cs.load_json(examples / "api-unavailable.json")) == []


def test_openapi_document_is_valid() -> None:
    validate_openapi(cs.load_json(cs.OPENAPI), base_uri=cs.OPENAPI.as_uri())


def test_check_documents_passes_on_the_repository() -> None:
    run = subprocess.run(
        [sys.executable, str(cs.ROOT / "scripts" / "check_documents.py")],
        capture_output=True,
        text=True,
        check=False,
    )
    assert run.returncode == 0, run.stdout + run.stderr
    assert "documents:" in run.stdout and "valid" in run.stdout


# --------------------------------------------------------------------------- adversarial: the schemas are
# tight


def object_nodes(doc, path=(), parent_keys=None):
    """Every object node as (path, node, signature). The signature (its keys and its parent's) lets a test
    plant once per distinct place instead of once per blast or per site."""
    if isinstance(doc, dict):
        keys = tuple(sorted(doc))
        yield path, doc, (keys, parent_keys, len(path))
        for k, v in doc.items():
            yield from object_nodes(v, (*path, k), keys)
    elif isinstance(doc, list):
        for i, v in enumerate(doc):
            yield from object_nodes(v, (*path, i), parent_keys)


def node_at(doc, path):
    for k in path:
        doc = doc[k]
    return doc


@pytest.mark.parametrize("kind", ["case-index", "case-manifest", "case-artifact", "models-file", "benchmark"])
def test_adversarial_every_object_level_rejects_a_planted_field(kind: str) -> None:
    """Plant a field at every distinct object node of the committed documents: a fixed-key object rejects
    the key, a map (keyed by arm, blast or site) rejects the value, so no level of any schema is open by
    accident."""
    seen: set = set()
    planted = 0
    for name, doc in every_document(BAKE)[kind]:
        for path, _node, signature in list(object_nodes(doc)):
            if signature in seen:
                continue
            seen.add(signature)
            copy_ = copy.deepcopy(doc)
            node_at(copy_, path)["__planted__"] = {"__planted__": True}
            assert cs.errors(kind, copy_), (
                f"{kind} {name} at /{'/'.join(map(str, path))}: a planted field is accepted"
            )
            planted += 1
    assert planted >= 1


@pytest.mark.parametrize("kind", ["case-index", "case-manifest", "case-artifact", "models-file", "benchmark"])
def test_adversarial_a_missing_or_retyped_top_level_field_is_rejected(kind: str) -> None:
    optional = {"case-index": {"benchmark"}}.get(kind, set())
    name, doc = every_document(BAKE)[kind][0]
    for key in doc:
        if key in optional:
            continue
        broken = copy.deepcopy(doc)
        del broken[key]
        assert cs.errors(kind, broken), f"{kind}: dropping {key} is accepted"
    wrong = copy.deepcopy(doc)
    wrong["schema"] = "fragmenta.other/v1"
    assert cs.errors(kind, wrong)


def test_adversarial_booleans_are_not_numbers_and_state_rules_hold() -> None:
    name, art = every_document(BAKE)["case-artifact"][0]
    wrong = copy.deepcopy(art)
    wrong["null_mean_m"] = True
    assert cs.errors("case-artifact", wrong)
    wrong = copy.deepcopy(art)
    arm = next(iter(wrong["predictions"]))
    cell = next(iter(wrong["predictions"][arm].values()))
    cell.update(x50_m=None, reason=None)
    assert cs.errors("case-artifact", wrong), "a refusal without a reason is accepted"
    wrong = copy.deepcopy(art)
    wrong["digest"] = "xyz"
    assert cs.errors("case-artifact", wrong)
    _name, models = every_document(BAKE)["models-file"][0]
    wrong = copy.deepcopy(models)
    del wrong["arms"]["xgboost"]
    assert cs.errors("models-file", wrong)


def test_adversarial_cross_field_rules_catch_what_the_schema_cannot(tmp_path: Path) -> None:
    root = tmp_path / "derived"
    for p in FIXTURE.rglob("*"):
        if p.is_file():
            dest = root / p.relative_to(FIXTURE)
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(p.read_bytes())
    assert cross_field_errors(root) == []
    entry = index_of(root)["cases"][0]
    path = root / entry["artifact_path"]
    a = cs.load_json(path)
    a["null_mean_m"] = a["null_mean_m"] + 1.0
    path.write_text(json.dumps(a), encoding="utf-8")
    problems = cross_field_errors(root)
    assert any("digest" in p for p in problems) and any("bytes" in p for p in problems), problems
