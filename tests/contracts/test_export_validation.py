"""Validation before writing (ADR-0080, producer side): stages/export.py checks the document against its
schema file before it writes it, and a failure stops the bake with the path of the field. Tested on the
committed artifact, written to a temp dir, and on a deliberately broken copy."""

from __future__ import annotations

import copy
import json

import contract_schemas as cs
import pytest
from pipeline.io import contract
from pipeline.stages import export

CASE = "real-murgul"


def committed() -> dict:
    return cs.load_json(cs.DERIVED_ROOTS["bake"] / CASE / "case.json")


def test_a_valid_artifact_is_written_byte_for_byte(tmp_path):
    payload = committed()
    path, size = export.write_artifact(tmp_path, CASE, payload)
    on_disk = (cs.DERIVED_ROOTS["bake"] / CASE / "case.json").read_bytes()
    assert path.read_bytes() == on_disk and size == len(on_disk)


def test_adversarial_a_broken_artifact_stops_the_bake_with_the_path_of_the_field(tmp_path):
    payload = committed()
    broken = copy.deepcopy(payload)
    arm = next(iter(broken["predictions"]))
    blast = next(iter(broken["predictions"][arm]))
    broken["predictions"][arm][blast]["x50_m"] = "0.3"  # a string where the contract says a number or null
    with pytest.raises(contract.ContractError) as exc:
        export.write_artifact(tmp_path, CASE, broken)
    message = str(exc.value)
    assert f"predictions/{arm}/{blast}/x50_m" in message and CASE in message, message
    assert not (tmp_path / CASE / "case.json").exists(), "a document that failed validation was written"


def test_adversarial_a_planted_field_and_a_missing_field_are_both_refused(tmp_path):
    payload = committed()
    extra = {**payload, "unexpected": 1}
    with pytest.raises(contract.ContractError) as exc:
        export.write_artifact(tmp_path, CASE, extra)
    assert "unexpected" in str(exc.value)
    missing = {k: v for k, v in payload.items() if k != "scores"}
    with pytest.raises(contract.ContractError) as exc:
        export.write_artifact(tmp_path, CASE, missing)
    assert "scores" in str(exc.value)
    assert not list(tmp_path.rglob("*.json"))


def test_validate_document_covers_every_document_kind():
    """The callers that write the manifest, index, models files and benchmark use the same function."""
    bake = cs.DERIVED_ROOTS["bake"]
    index = cs.load_json(bake / "manifests" / "index.json")
    docs = {
        "case-index": index,
        "case-manifest": cs.load_json(bake / index["cases"][0]["manifest_path"]),
        "models-file": cs.load_json(bake / index["models"][0]["path"]),
        "benchmark": cs.load_json(bake / "benchmark.json"),
    }
    for kind, doc in docs.items():
        export.validate_document(kind, doc, where=kind)
        bad = {**doc, "unexpected": 1}
        with pytest.raises(contract.ContractError):
            export.validate_document(kind, bad, where=kind)
    json.dumps(docs["case-index"])  # the documents are plain JSON values
