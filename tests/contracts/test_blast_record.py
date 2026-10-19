"""Catalog row blast-record 1.0.0 (producer side, contract 1): the rows of the published corpus, as
data-pipeline/pipeline/io/contract.py accepts them, validate against
docs/contracts/schemas/blast-record.schema.json, and the schema and validate_row agree on what is
rejected."""

from __future__ import annotations

import copy
import dataclasses

import blastfrag as bf
import contract_schemas as cs
import pytest
from pipeline.io import contract


def rows() -> list[dict]:
    """The 97 corpus rows as dictionaries: id, site, the seven features, the measured size and the group."""
    out = []
    for blast in bf.load_training_corpus():
        row = {f.name: getattr(blast, f.name) for f in dataclasses.fields(blast) if f.name != "meta"}
        out.append(row)
    return out


def test_corpus_rows_validate_and_are_accepted_by_contract_1() -> None:
    corpus = rows()
    assert len(corpus) == 97
    for row in corpus:
        assert cs.errors("blast-record", row) == [], row["blast_id"]
        assert contract.validate_row(row) == [], row["blast_id"]


def test_the_example_validates_and_is_a_corpus_row() -> None:
    example = cs.load_json(cs.CONTRACTS / "examples" / "blast-record.json")
    assert cs.errors("blast-record", example) == []
    assert contract.validate_row(example) == []
    assert example in rows()


def test_adversarial_schema_and_contract_reject_the_same_rows() -> None:
    base = rows()[0]
    for column, (low, high, _unit) in contract.RANGES.items():
        for value in (low - 1e-6 if low > 1e-6 else -1.0, high + 1e-6):
            bad = {**base, column: value}
            assert cs.errors("blast-record", bad), f"{column}={value}: the schema accepts it"
            assert contract.validate_row(bad), f"{column}={value}: contract 1 accepts it"
        for value in (low, high):  # the bounds themselves are accepted by both
            ok = {**base, column: value}
            assert cs.errors("blast-record", ok) == [] and contract.validate_row(ok) == [], (
                f"{column}={value}"
            )
    for column in contract.REQUIRED_COLUMNS:
        bad = copy.deepcopy(base)
        del bad[column]
        assert cs.errors("blast-record", bad), f"{column}: a missing column is accepted by the schema"
        assert contract.validate_row(bad), f"{column}: a missing column is accepted by contract 1"
    for text in ("not a number", None):
        bad = {**base, "E_GPa": text}
        assert cs.errors("blast-record", bad) and contract.validate_row(bad)


def test_the_schema_check_in_the_pipeline_agrees_with_the_registry() -> None:
    base = rows()[0]
    assert contract.schema_errors("blast-record", base) == []
    assert contract.schema_errors("blast-record", {**base, "E_GPa": 60000.0})
    with pytest.raises(contract.ContractError) as exc:
        contract.require_valid("blast-record", {**base, "E_GPa": 60000.0}, where="row Ad1")
    assert "E_GPa" in str(exc.value) and "row Ad1" in str(exc.value)
