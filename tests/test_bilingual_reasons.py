"""BL-039: every reason the bake writes is carried as {"en", "es"}, and the interface picks one.

Three kinds of reason reach an artifact: the abstention reasons of the arms, the score reasons of a case,
and the geometry and degenerate-design reasons of a blast. The pipeline's own reasons are built bilingual
where they arise. The engine's reasons are English text; ``pipeline/reasons.py`` maps each by pattern, with
its numbers and names carried into both languages, and an engine reason it does not know stops the bake.

These tests run on the COMMITTED documents (what the web reads) and on the engine itself (what the bake
receives).
"""

from __future__ import annotations

import dataclasses
import json
import re
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "data-pipeline"))

import blastfrag as bf  # noqa: E402
from pipeline import reasons  # noqa: E402
from pipeline.model.blasts import is_degenerate  # noqa: E402

DERIVED = ROOT / "data" / "derived"

#: Words the product writes in Spanish. A Spanish reason carrying one of these in English is a half
#: translation.
ENGLISH_ONLY = re.compile(
    r"\b(stemming|burdens?|bench|blasts?|rock factor|hole diameter|charge column|rock volume|charge mass|"
    r"publishes|this|the|is|not|no absolute|equation|needs|both|model|returned|range|domain|"
    r"prediction|fragment|assigns|group rather|measured|response|score|case carries)\b",
    re.IGNORECASE,
)
#: Spanish terms of the product that a translated reason must use where its English names the thing.
SPANISH_TERMS = {
    "stemming": "taco",
    "burden": "bordo",
    "bench": "banco",
    "rock factor": "factor de roca",
    "blast": "voladura",
}


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _case_ids() -> list[str]:
    return [entry["case_id"] for entry in _load(DERIVED / "manifests" / "index.json")["cases"]]


def _reasons_of_case(payload: dict):
    """Every reason field of a case artifact as (where, value): the value must be a bilingual pair, or "
    "None."""
    for arm, row in payload["predictions"].items():
        for blast_id, cell in row.items():
            yield f"predictions.{arm}.{blast_id}.reason", cell["reason"], cell["abstained"]
    for arm, block in payload["scores"].items():
        if "reason" in block:
            yield f"scores.{arm}.reason", block["reason"], True
        for index, item in enumerate(block.get("abstain_reasons", [])):
            yield f"scores.{arm}.abstain_reasons[{index}]", item, True
    for blast in payload["blasts"]:
        for key in ("geometry_reason", "degenerate_reason"):
            if key in blast:
                yield f"blasts.{blast['blast_id']}.{key}", blast[key], True
    for site, report in payload["geometry_report"].items():
        if "reason" in report:
            yield f"geometry_report.{site}.reason", report["reason"], True


def _is_pair(value) -> bool:
    return (
        isinstance(value, dict)
        and set(value) == {"en", "es"}
        and all(isinstance(value[k], str) and value[k].strip() for k in ("en", "es"))
    )


# ---------------------------------------------------------------------------------------------
# The committed documents
# ---------------------------------------------------------------------------------------------

@pytest.mark.parametrize("case_id", _case_ids())
def test_every_reason_of_every_case_is_bilingual_and_non_empty(case_id):
    payload = _load(DERIVED / case_id / "case.json")
    seen = 0
    for where, value, expected in _reasons_of_case(payload):
        if value is None:
            assert not expected, f"{case_id}: {where} is absent on a refusal"
            continue
        assert _is_pair(value), f"{case_id}: {where} is not an en/es pair: {value!r}"
        assert value["es"] != value["en"], f"{case_id}: {where} Spanish equals English"
        spanish = value["es"]
        assert not ENGLISH_ONLY.search(spanish), f"{case_id}: {where} Spanish carries English: {spanish}"
        seen += 1
    if case_id in ("ctrl-degenerate", "real-miami", "synth-sweep-burden"):
        assert seen > 0


def test_every_reason_of_the_benchmark_is_bilingual():
    benchmark = _load(DERIVED / "benchmark.json")
    found = 0
    for protocol in benchmark["protocols"].values():
        for arm in protocol["arms"].values():
            for site, entry in arm.get("per_site", {}).items():
                if "abstain_reason" not in entry or entry["abstain_reason"] is None:
                    continue
                assert _is_pair(entry["abstain_reason"]), f"{site}: {entry['abstain_reason']!r}"
                assert not ENGLISH_ONLY.search(entry["abstain_reason"]["es"]), entry["abstain_reason"]["es"]
                found += 1
    assert found > 0, "the committed benchmark carries no abstention reason to check"


def test_no_committed_document_carries_a_plain_string_reason():
    """Walk every committed JSON for any key named reason, abstain_reason(s), geometry_reason or "
    "degenerate_reason."""
    names = {"reason", "abstain_reason", "abstain_reasons", "geometry_reason", "degenerate_reason"}
    plain: list[str] = []

    def walk(node, path):
        if isinstance(node, dict):
            for key, value in node.items():
                if key in names:
                    items = value if isinstance(value, list) else [value]
                    plain.extend(f"{path}.{key}: {v!r}"[:120] for v in items if isinstance(v, str))
                walk(value, f"{path}.{key}")
        elif isinstance(node, list):
            for index, item in enumerate(node):
                walk(item, f"{path}[{index}]")

    for case_id in _case_ids():
        walk(_load(DERIVED / case_id / "case.json"), case_id)
    walk(_load(DERIVED / "benchmark.json"), "benchmark")
    assert not plain, plain[:5]


def test_a_refusal_always_has_a_reason_so_the_fallback_never_shows():
    """The interface's bilingual fallback is for a reason that is absent; a baked refusal always carries "
    "one."""
    for case_id in _case_ids():
        payload = _load(DERIVED / case_id / "case.json")
        for arm, row in payload["predictions"].items():
            for blast_id, cell in row.items():
                if cell["abstained"]:
                    assert _is_pair(cell["reason"]), f"{case_id}/{arm}/{blast_id}"


# ---------------------------------------------------------------------------------------------
# The catalogue
# ---------------------------------------------------------------------------------------------

def _blast(site: str) -> bf.Blast:
    return next(b for b in bf.load_training_corpus() if b.site == site)


def _engine_examples() -> list[str]:
    """Reasons the engine itself produces, one call per template it has."""
    akdaglar, miami = _blast("Akdaglar"), _blast("Miami")
    out = [
        bf.GroupDiscriminant().predict_one(akdaglar).abstain_reason,
        bf.Kuznetsov().predict_one(miami).abstain_reason,
        bf.Kuznetsov({}).predict_one(akdaglar).abstain_reason,
        bf.Kuznetsov()._guarded(akdaglar, 10.48).abstain_reason,
        bf.Kuznetsov()._guarded(akdaglar, 0.0004).abstain_reason,
        bf.Kuznetsov()._guarded(akdaglar, float("nan")).abstain_reason,
        bf.NullModel().predict_one(akdaglar).abstain_reason,
        bf.Oracle().predict_one(dataclasses.replace(akdaglar, x50_m=None)).abstain_reason,
        bf.KuznetsovTransfer().predict_one(akdaglar).abstain_reason,
        bf.default_arms()["xgboost"]().predict_one(akdaglar).abstain_reason,
    ]
    for blast in (miami, dataclasses.replace(akdaglar, site="Nowhere")):
        try:
            bf.reconstruct_pattern(blast)
        except bf.GeometryUnavailable as exc:
            out.append(str(exc))
    out.append(bf.SITE_GEOMETRY["Miami"].diameter_source)
    return out


def test_every_catalogue_entry_round_trips_a_real_example():
    """Each entry names one real example; it matches that entry alone and yields both languages."""
    assert reasons.ENTRIES, "the catalogue is empty"
    for entry in reasons.ENTRIES:
        assert entry.example, entry.name
        matching = [e.name for e in reasons.ENTRIES if e.pattern.fullmatch(entry.example)]
        assert matching == [entry.name], f"{entry.name}: its example matches {matching}"
        pair = reasons.from_engine(entry.example)
        assert pair["en"] == entry.example
        assert _is_pair(pair) and pair["es"] != pair["en"], entry.name
        assert not ENGLISH_ONLY.search(pair["es"]), (entry.name, pair["es"])


def test_every_reason_the_engine_produces_is_in_the_catalogue():
    examples = _engine_examples()
    assert len(examples) >= 12
    for text in examples:
        pair = reasons.from_engine(text)
        assert pair["en"] == text
        assert _is_pair(pair), text
        assert not ENGLISH_ONLY.search(pair["es"]), (text, pair["es"])


def test_every_engine_example_is_the_example_of_some_entry_or_matches_one():
    """The catalogue's own examples cover the engine's templates: none of the engine's texts falls through."""
    covered = {e.name for e in reasons.ENTRIES if any(e.pattern.fullmatch(t) for t in _engine_examples())}
    assert len(covered) >= 10, sorted(covered)


def test_an_unknown_engine_reason_stops_the_bake_with_its_text():
    text = "the engine invented a new way to refuse this blast"
    with pytest.raises(reasons.UnknownReason) as caught:
        reasons.from_engine(text)
    assert text in str(caught.value)


def test_a_known_template_with_a_changed_word_is_unknown_not_guessed():
    text = "this arm assigns a rock-stiffness group rather than a fragment size, mostly"
    with pytest.raises(reasons.UnknownReason):
        reasons.from_engine(text)


def test_the_range_reason_carries_its_numbers_with_the_decimal_comma():
    pair = reasons.from_engine(bf.Kuznetsov()._guarded(_blast("Akdaglar"), 10.48).abstain_reason)
    assert "10,48 m" in pair["es"] and "0,001 a 3" in pair["es"], pair["es"]
    assert "10.48 m" in pair["en"] and "0.001 to 3.0 m" in pair["en"]


def test_the_geometry_reason_names_the_blast_and_the_mine_in_both_languages():
    text = None
    try:
        bf.reconstruct_pattern(_blast("Miami"))
    except bf.GeometryUnavailable as exc:
        text = str(exc)
    pair = reasons.from_engine(text)
    blast_id = text.split(":")[0]
    assert pair["es"].startswith(f"{blast_id}: ")
    assert "Miami" in pair["es"] and "diámetro" in pair["es"]


def test_the_site_name_is_carried_into_the_spanish_reason():
    pair = reasons.from_engine("no rock factor is available for Granite-NE")
    assert pair == {
        "en": "no rock factor is available for Granite-NE",
        "es": "no hay factor de roca disponible para Granite-NE",
    }


# ---------------------------------------------------------------------------------------------
# The pipeline's own reasons
# ---------------------------------------------------------------------------------------------

def _design(t_over_b: float, h_over_b: float) -> bf.Blast:
    return dataclasses.replace(_blast("Akdaglar"), T_over_B=t_over_b, H_over_B=h_over_b)


def test_the_degenerate_design_reason_is_built_bilingual_with_the_decimal_comma():
    blast = _design(4.6, 1.4)
    pair = reasons.degenerate_reason(blast)
    assert pair["en"] == is_degenerate(blast)
    assert "4,60 bordos" in pair["es"] and "1,40 bordos" in pair["es"] and "taco" in pair["es"]
    assert not ENGLISH_ONLY.search(pair["es"]), pair["es"]


def test_the_thin_charge_reason_is_built_bilingual():
    blast = _design(1.29, 1.3)
    pair = reasons.degenerate_reason(blast)
    assert pair["en"] == is_degenerate(blast) and "%" in pair["es"], pair
    assert not ENGLISH_ONLY.search(pair["es"]), pair["es"]


def test_a_sound_design_has_no_degenerate_reason():
    assert reasons.degenerate_reason(_blast("Akdaglar")) is None


def test_the_degenerate_abstention_wraps_the_design_reason_in_both_languages():
    pair = reasons.degenerate_abstention(_design(4.6, 1.4))
    assert pair["en"].startswith("this design is not a blast: ")
    assert pair["es"].startswith("este diseño no es una voladura: ")


def test_the_unscoreable_case_reason_is_bilingual():
    pair = reasons.NO_MEASUREMENT
    assert _is_pair(pair) and "no measured fragment sizes" in pair["en"]
    assert "tamaños de fragmento medidos" in pair["es"]


def test_the_spanish_uses_the_products_terms():
    pair = reasons.degenerate_abstention(_design(4.6, 1.4))
    for english, spanish in SPANISH_TERMS.items():
        if english in pair["en"].lower() and english != "blast":
            assert spanish in pair["es"].lower(), (english, spanish, pair["es"])
    assert "voladura" in pair["es"]


# ---------------------------------------------------------------------------------------------
# The stages
# ---------------------------------------------------------------------------------------------

def _prepared(case_id: str):
    from pipeline.registry import get_case
    from pipeline.stages import ingest, preprocess

    case = get_case(case_id)
    return case, preprocess.run(case, ingest.run(case))


class _InventedRefusal(bf.Arm):
    name = "kuznetsov"
    tier = "classical"
    lane = "live"
    source = "a test double"
    fitted_on = "nothing"

    def predict_one(self, blast):
        return self._abstain(blast, "the engine invented a new way to refuse this blast")


def test_an_unknown_engine_reason_stops_the_infer_stage_naming_the_case_the_arm_and_the_blast(monkeypatch):
    from pipeline.stages import infer

    case, prepared = _prepared("real-murgul")
    monkeypatch.setattr(
        infer, "arm_catalogue", lambda trained=None, rock_factors=None: {"kuznetsov": _InventedRefusal()}
    )
    with pytest.raises(reasons.UnknownReason) as caught:
        infer.run(case, prepared)
    message = str(caught.value)
    assert "real-murgul/kuznetsov/" in message and "invented a new way to refuse" in message


def test_the_infer_stage_writes_every_abstention_in_both_languages():
    from pipeline.stages import infer

    case, prepared = _prepared("real-miami")
    inferred = infer.run(case, prepared)
    for arm, row in inferred.predictions.items():
        for blast_id, prediction in row.items():
            if prediction.abstained:
                pair = inferred.reasons[arm][blast_id]
                assert _is_pair(pair) and pair["en"] == prediction.abstain_reason, (arm, blast_id)
            else:
                assert blast_id not in inferred.reasons[arm]
    assert "publica el diámetro de perforación" in inferred.reasons["kuznetsov"]["Mi1"]["es"]


def test_the_degenerate_design_abstains_in_both_languages_on_every_arm():
    from pipeline.stages import infer

    case, prepared = _prepared("ctrl-degenerate")
    inferred = infer.run(case, prepared)
    for arm, why in inferred.reasons.items():
        assert why and all(p["es"].startswith("este diseño no es una voladura: ") for p in why.values()), arm
