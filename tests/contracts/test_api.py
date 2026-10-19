"""Catalog row api 1.0.0: the dormant FastAPI app serves every committed document as
docs/contracts/api.openapi.json declares, answers 503 with the declared state when a document is absent,
404 for an unknown case, scope or artifact, and never leaves the derived root. DATA_DIR selects the tree
(the swap test runs the same assertions on the provider fixture tree and on the bake)."""

from __future__ import annotations

import shutil
import sys

import pytest
from contract_schemas import DERIVED_ROOTS, OPENAPI, ROOT, load_json, response_errors

pytest.importorskip("fastapi")
pytest.importorskip("httpx")

from fastapi.testclient import TestClient  # noqa: E402

sys.path.insert(0, str(ROOT))

NOT_BAKED = {"en": "The pipeline has not baked this build.", "es": "El pipeline no ha generado esta versión."}
NO_READINESS = {
    "en": "The readiness document is not in this build.",
    "es": "El documento de disponibilidad no está en esta versión.",
}
NO_BENCHMARK = {"en": "The benchmark is not in this build.", "es": "El benchmark no está en esta versión."}
CASE = "real-murgul"


def client(monkeypatch: pytest.MonkeyPatch, data_dir) -> TestClient:
    monkeypatch.setenv("DATA_DIR", str(data_dir))
    from app.main import create_app

    return TestClient(create_app())


def get_checked(c: TestClient, path: str, template: str, expect: int):
    """GET ``path``, require ``expect`` and the body the OpenAPI document declares for ``template``."""
    r = c.get(path)
    assert r.status_code == expect, f"{path}: {r.status_code} {r.text[:200]}"
    body = r.json()
    assert response_errors(template, "get", expect, body) == [], path
    return body


def route_sets(app, document: dict) -> tuple[set, set]:
    """(routes the app serves, routes the OpenAPI ``document`` declares), each as (path, METHOD). The app's
    own generated schema lists every route the app serves; it is cached, so a route mounted after the
    first call needs the cache dropped."""
    app.openapi_schema = None
    served = {(p, m.upper()) for p, ops in app.openapi()["paths"].items() for m in ops}
    declared = {(p, m.upper()) for p, ops in document["paths"].items() for m in ops}
    return served, declared


def test_routes_match_the_openapi_document(monkeypatch, tmp_path):
    served, declared = route_sets(client(monkeypatch, tmp_path).app, load_json(OPENAPI))
    assert served == declared


def test_adversarial_an_undeclared_route_and_a_missing_route_fail_the_comparison(monkeypatch, tmp_path):
    document = load_json(OPENAPI)
    app = client(monkeypatch, tmp_path).app

    @app.get("/api/planted")
    def planted() -> dict:
        return {}

    served, declared = route_sets(app, document)
    assert served != declared and served - declared == {("/api/planted", "GET")}, (
        served - declared,
        declared - served,
    )
    app = client(monkeypatch, tmp_path).app
    path = "/api/cases"
    assert path in document["paths"], "the plant would remove nothing"
    shorter = {**document, "paths": {p: ops for p, ops in document["paths"].items() if p != path}}
    served, declared = route_sets(app, shorter)
    assert served != declared and {p for p, _ in served - declared} == {path}, (
        served - declared,
        declared - served,
    )
    longer = {**document, "paths": {**document["paths"], "/api/never-mounted": {"get": {}}}}
    served, declared = route_sets(app, longer)
    assert declared - served == {("/api/never-mounted", "GET")}, (served - declared, declared - served)


def assert_serves_everything(c: TestClient) -> int:
    assert get_checked(c, "/health", "/health", 200) == {"status": "ok"}
    get_checked(c, "/healthz", "/healthz", 200)
    index = get_checked(c, "/api/cases", "/api/cases", 200)
    assert index["cases"]
    n_documents = 0
    for e in index["cases"]:
        m = get_checked(c, f"/api/cases/{e['case_id']}/manifest", "/api/cases/{case_id}/manifest", 200)
        get_checked(c, f"/api/artifacts/{m['artifact']['path']}", "/api/artifacts/{rel_path}", 200)
        n_documents += 1
    for m in index["models"]:
        get_checked(c, f"/api/models/{m['scope']}", "/api/models/{scope}", 200)
    get_checked(c, "/api/benchmark", "/api/benchmark", 200)
    ready = get_checked(c, "/api/readiness", "/api/readiness", 200)
    api = next(e for e in ready["contracts"] if e["id"] == "api")
    assert (api["state"], api["provenance"], api["reason"]) == ("available", "real", None)
    return n_documents


def test_responses_match_the_openapi_document(monkeypatch):
    assert assert_serves_everything(client(monkeypatch, DERIVED_ROOTS["bake"])) == 16


def test_swap_fixture_tree_and_bake(monkeypatch):
    for which in ("fixture", "bake"):
        assert assert_serves_everything(client(monkeypatch, DERIVED_ROOTS[which])) >= 1, which


def test_adversarial_503_when_documents_are_absent(monkeypatch, tmp_path):
    c = client(monkeypatch, tmp_path)
    for path, template, reason in (
        ("/api/cases", "/api/cases", NOT_BAKED),
        (f"/api/cases/{CASE}/manifest", "/api/cases/{case_id}/manifest", NOT_BAKED),
        ("/api/models/Murgul", "/api/models/{scope}", NOT_BAKED),
        ("/api/benchmark", "/api/benchmark", NO_BENCHMARK),
        ("/api/readiness", "/api/readiness", NO_READINESS),
    ):
        body = get_checked(c, path, template, 503)
        assert body == {"detail": {"state": "missing", "reason": reason}}, path
    assert "cases" not in c.get("/api/cases").json()  # never an empty-index body that looks like data


def test_adversarial_503_when_the_index_is_removed_from_a_copy(monkeypatch, tmp_path):
    """Remove the index in a temp copy: 503 with the declared state; an unknown case is a 404."""
    root = tmp_path / "derived"
    shutil.copytree(DERIVED_ROOTS["bake"], root)
    c = client(monkeypatch, root)
    assert c.get("/api/cases").status_code == 200
    (root / "manifests" / "index.json").unlink()
    body = get_checked(c, "/api/cases", "/api/cases", 503)
    assert body == {"detail": {"state": "missing", "reason": NOT_BAKED}}
    assert (
        c.get(f"/api/artifacts/{CASE}/case.json").status_code == 404
    )  # nothing is served that no index lists
    (root / "manifests" / "index.json").write_bytes(
        (DERIVED_ROOTS["bake"] / "manifests" / "index.json").read_bytes()
    )
    assert get_checked(c, "/api/cases/NOPE/manifest", "/api/cases/{case_id}/manifest", 404) == {
        "detail": "unknown case"
    }


def test_adversarial_404_bodies_and_nothing_outside_the_root(monkeypatch):
    c = client(monkeypatch, DERIVED_ROOTS["bake"])
    assert get_checked(c, "/api/cases/NOPE/manifest", "/api/cases/{case_id}/manifest", 404) == {
        "detail": "unknown case"
    }
    assert get_checked(c, "/api/models/NOPE", "/api/models/{scope}", 404) == {
        "detail": "unknown models scope"
    }
    for bad in ("..%5Cindex", ".hidden", "..", "%2e%2e"):
        r = c.get(f"/api/cases/{bad}/manifest")
        assert (
            r.status_code == 404
            and response_errors("/api/cases/{case_id}/manifest", "get", 404, r.json()) == []
        ), bad
        r = c.get(f"/api/models/{bad}")
        assert r.status_code == 404 and response_errors("/api/models/{scope}", "get", 404, r.json()) == [], (
            bad
        )
    for rel in (
        f"{CASE}/nope.json",
        "../../VERSION",
        "..%2F..%2FVERSION",
        "%2e%2e/%2e%2e/package.json",
        "..%5C..%5CVERSION",
        "manifests/..%2F..%2F..%2FVERSION",
        "manifests/.gitkeep",
        "manifests",
        CASE,
        "readiness.json.txt",
    ):
        r = c.get(f"/api/artifacts/{rel}")
        assert r.status_code == 404, rel
        assert (
            r.json() == {"detail": "no such artifact"}
            or response_errors("/api/artifacts/{rel_path}", "get", 404, r.json()) == []
        ), rel
    assert c.get(f"/api/artifacts/{CASE}/case.json").status_code == 200


def test_get_only(monkeypatch):
    c = client(monkeypatch, DERIVED_ROOTS["bake"])
    for method in ("post", "put", "patch", "delete"):
        assert getattr(c, method)("/api/cases").status_code == 405, method


def test_adversarial_only_indexed_documents_are_served_as_artifacts(monkeypatch):
    """The declared body of /api/artifacts is a case artifact: a document that is not one (the readiness,
    the index, a manifest, the benchmark, a models file) is a 404, never a 200 with a body the response
    schema does not declare."""
    c = client(monkeypatch, DERIVED_ROOTS["bake"])
    for rel in (
        "readiness.json",
        "manifests/index.json",
        f"manifests/{CASE}.json",
        "benchmark.json",
        "models/Murgul.json",
    ):
        body = get_checked(c, f"/api/artifacts/{rel}", "/api/artifacts/{rel_path}", 404)
        assert body == {"detail": "no such artifact"}, rel
    body = get_checked(c, "/api/cases/index/manifest", "/api/cases/{case_id}/manifest", 404)
    assert body == {"detail": "unknown case"}


def test_every_document_under_the_root_is_served_as_declared_or_404(monkeypatch):
    """No path under data/derived answers 200 with a body that fails the OpenAPI response schema."""
    c = client(monkeypatch, DERIVED_ROOTS["bake"])
    for p in sorted(DERIVED_ROOTS["bake"].rglob("*.json")):
        rel = p.relative_to(DERIVED_ROOTS["bake"]).as_posix()
        r = c.get(f"/api/artifacts/{rel}")
        assert r.status_code in (200, 404), rel
        assert response_errors("/api/artifacts/{rel_path}", "get", r.status_code, r.json()) == [], rel
        r = c.get(f"/api/cases/{p.stem}/manifest")
        assert r.status_code in (200, 404), p.stem
        assert response_errors("/api/cases/{case_id}/manifest", "get", r.status_code, r.json()) == [], p.stem


def corrupt_copy(tmp_path, rel: str):
    """A copy of the bake with the document ``rel`` replaced by text that is not JSON."""
    root = tmp_path / "derived"
    shutil.copytree(DERIVED_ROOTS["bake"], root)
    (root / rel).write_text("{not json", encoding="utf-8")
    return root


def unreadable(rel: str) -> dict:
    return {
        "detail": {
            "state": "missing",
            "reason": {
                "en": f"The document {rel} is unreadable.",
                "es": f"El documento {rel} no se puede leer.",
            },
        }
    }


def test_adversarial_an_unreadable_index_is_a_503(monkeypatch, tmp_path):
    c = client(monkeypatch, corrupt_copy(tmp_path, "manifests/index.json"))
    for path, template in (
        ("/api/cases", "/api/cases"),
        (f"/api/cases/{CASE}/manifest", "/api/cases/{case_id}/manifest"),
        (f"/api/artifacts/{CASE}/case.json", "/api/artifacts/{rel_path}"),
        ("/api/models/Murgul", "/api/models/{scope}"),
    ):
        assert get_checked(c, path, template, 503) == unreadable("manifests/index.json"), path


def test_an_unreadable_manifest_is_a_503(monkeypatch, tmp_path):
    c = client(monkeypatch, corrupt_copy(tmp_path, f"manifests/{CASE}.json"))
    body = get_checked(c, f"/api/cases/{CASE}/manifest", "/api/cases/{case_id}/manifest", 503)
    assert body == unreadable(f"manifests/{CASE}.json")
    assert c.get("/api/cases/real-soma/manifest").status_code == 200  # the other cases work


def test_an_unreadable_artifact_is_a_503(monkeypatch, tmp_path):
    c = client(monkeypatch, corrupt_copy(tmp_path, f"{CASE}/case.json"))
    body = get_checked(c, f"/api/artifacts/{CASE}/case.json", "/api/artifacts/{rel_path}", 503)
    assert body == unreadable(f"{CASE}/case.json")


def test_an_unreadable_models_file_and_benchmark_are_503s(monkeypatch, tmp_path):
    c = client(monkeypatch, corrupt_copy(tmp_path, "models/Murgul.json"))
    assert get_checked(c, "/api/models/Murgul", "/api/models/{scope}", 503) == unreadable(
        "models/Murgul.json"
    )
    c = client(monkeypatch, corrupt_copy(tmp_path / "b", "benchmark.json"))
    assert get_checked(c, "/api/benchmark", "/api/benchmark", 503) == unreadable("benchmark.json")


def test_an_unreadable_readiness_is_a_503(monkeypatch, tmp_path):
    c = client(monkeypatch, corrupt_copy(tmp_path, "readiness.json"))
    body = get_checked(c, "/api/readiness", "/api/readiness", 503)
    assert body == unreadable("readiness.json")


def pins(name: str) -> dict[str, str]:
    out = {}
    for line in (ROOT / name).read_text(encoding="utf-8").splitlines():
        line = line.split("#")[0].strip()
        if line and not line.startswith("-"):
            package, _, version = line.partition("==")
            out[package.split("[")[0]] = version
    return out


def test_the_api_lane_is_pinned_exactly_and_the_dev_lane_agrees():
    api = pins("requirements-api.txt")
    assert set(api) == {"fastapi", "uvicorn", "pydantic"}
    assert all(version and version[0].isdigit() for version in api.values()), api
    dev = pins("requirements-dev.txt")
    assert {k: dev[k] for k in ("fastapi", "pydantic")} == {k: api[k] for k in ("fastapi", "pydantic")}
    import fastapi
    import pydantic

    assert (fastapi.__version__, pydantic.VERSION) == (api["fastapi"], api["pydantic"])
