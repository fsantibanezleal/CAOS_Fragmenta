"""No internal method-tier name reaches a reader (CAOS_MANAGE method-tiers section 0, BL-060).

The template's gate (``scripts/check_internal_names.py``) reads the notebooks, the README and the
strings of the app. It does not read the labels a predictor carries in ``artifacts.ts``, the legends
of the charts or the texts baked into ``data/derived``, which is where 0.10.000 still said
"classical": they are checked here.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import check_internal_names  # noqa: E402

TIER_WORDS = re.compile(
    r"classical|cl[aá]sic[oa]s?|state[ -]of[ -]the[ -]art|estado del arte|\bSOTA\b|\bBS-\d",
    re.IGNORECASE,
)

# Two texts that the published engine (blastfrag 0.4.0) writes into the artifacts. The app shows
# neither: the verdict callout is composed from the structured fields (pages/benchmark/shared.ts)
# and the arm note is not rendered. They change with an engine release. Everything else is clean.
ENGINE_TEXTS = {
    ("data/derived/benchmark.json", "verdict/outcome"),
    ("data/derived/manifests/index.json", "benchmark/verdict"),
}
ENGINE_NOTE = ("arms/kuznetsov-transfer/note",)


def test_the_gate_passes_on_this_repository():
    assert check_internal_names.findings_of(ROOT) == []


def test_the_gate_rejects_a_planted_tier_name(tmp_path):
    planted = "The classical model is the baseline of the state of the art.\n"
    (tmp_path / "README.md").write_text(planted, encoding="utf-8")
    found = check_internal_names.findings_of(tmp_path)
    assert found and all("README.md" in line for line in found)


def _strings(node, path=""):
    if isinstance(node, dict):
        for key, value in node.items():
            yield from _strings(value, f"{path}/{key}" if path else str(key))
    elif isinstance(node, list):
        for index, value in enumerate(node):
            yield from _strings(value, f"{path}[{index}]")
    elif isinstance(node, str):
        yield path, node


def _is_key(value: str) -> bool:
    return re.fullmatch(r"[a-z][a-z0-9_-]*", value) is not None


def test_the_predictor_labels_and_groups_name_their_method():
    text = (ROOT / "frontend/src/lib/artifacts.ts").read_text(encoding="utf-8")
    one = r"label:\s*\{\s*en:\s*'([^']*)',\s*es:\s*'([^']*)'"
    two = r"\n\s+en:\s*'([^']*)',\n\s+es:\s*'([^']*)',\n\s+\},\n\s+blurb"
    labels = re.findall(one, text) + re.findall(two, text)
    assert labels, "no label found: the pattern no longer reads artifacts.ts"
    for en, es in labels:
        assert not TIER_WORDS.search(en) and not TIER_WORDS.search(es), (en, es)
    for needle in (
        "Kuznetsov mean size, site rock factor",
        "Tamaño medio de Kuznetsov, factor de roca del sitio",
        "Kuznetsov mean size, transferred rock factor",
        "Kuznetsov mean size, capped at the in-situ block",
        "Kuz-Ram distribution",
        "Distribución Kuz-Ram",
        "Empirical equations",
        "Ecuaciones empíricas",
    ):
        assert needle in text, needle
    # the prose of every blurb too: only the data keys (`tier: 'classical'`) may keep the word
    keys = r"tier:\s*'classical'|classical:\s*\{ en: 'Empirical|\bTier\b[^;]*;|TIER_ORDER[^;]*;"
    prose = re.sub(keys, "", text)
    assert not TIER_WORDS.search(prose), TIER_WORDS.search(prose).group(0)


def test_the_curve_legend_names_the_kuz_ram_curve():
    text = (ROOT / "frontend/src/workbench/views.tsx").read_text(encoding="utf-8")
    legend = "label: { en: 'Kuz-Ram', es: 'Kuz-Ram' }, values: curves.classical.passing"
    assert legend in text
    assert "'Kuz-Ram curve', 'Curva Kuz-Ram'" in text


def test_the_baked_reader_texts_carry_no_tier_name():
    found = []
    documents = sorted((ROOT / "content").glob("*.json"))
    documents += sorted((ROOT / "data" / "derived").rglob("*.json"))
    for path in documents:
        rel = path.relative_to(ROOT).as_posix()
        for where, value in _strings(json.loads(path.read_text(encoding="utf-8"))):
            if _is_key(value) or not TIER_WORDS.search(value):
                continue
            if (rel, where) in ENGINE_TEXTS or where.endswith(ENGINE_NOTE):
                continue
            found.append(f"{rel}: {where}: {value[:90]}")
    assert found == []
