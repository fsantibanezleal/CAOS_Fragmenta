"""The bilingual reason catalogue: every reason the bake writes is ``{"en": ..., "es": ...}`` (BL-039).

Three kinds of reason reach an artifact: an arm's abstention, a case's score note, and the geometry and
degenerate-design notes of a blast. Two sources produce them.

The **pipeline's own reasons** (a design that is not a blast, a case with no measured sizes) are built
bilingual where they arise, here, and never go through matching.

The **engine's reasons** (``blastfrag``) are English text, and the engine is a separate package this product
does not change. Each template the engine can produce has one entry below: a pattern over the English text
with named groups for its numbers and names, and a function that writes the Spanish with those numbers and
names carried over (decimal comma in the numbers). ``from_engine`` is the only way an engine reason reaches
an artifact, and a reason no entry matches raises :class:`UnknownReason` with the text, so the bake stops. A
new engine version cannot ship an English-only reason silently: the catalogue grows in the same change that
adopts the version.

The Spanish uses the product's own terms: voladura (blast), taco (stemming), bordo (burden), banco (bench),
factor de roca (rock factor), diámetro de perforación (hole diameter). An entry's ``example`` is a text the
engine really produces; ``tests/test_bilingual_reasons.py`` calls the engine for most of them and checks
that each example matches its own entry alone.
"""

from __future__ import annotations

import re
from collections.abc import Callable
from dataclasses import dataclass

from .model.blasts import is_degenerate

__all__ = [
    "ENTRIES",
    "NO_MEASUREMENT",
    "Reason",
    "UnknownReason",
    "degenerate_abstention",
    "from_engine",
    "pair",
]

Reason = dict[str, str]


class UnknownReason(ValueError):
    """An engine reason the catalogue has no entry for: the bake stops rather than ship English on a "
    "Spanish page."""


def pair(en: str, es: str) -> Reason:
    return {"en": en, "es": es}


def _comma(number: str) -> str:
    """A number as the engine printed it, with the Spanish decimal comma (an exponent such as 1e-05 is "
    "kept)."""
    return number.replace(".", ",")


# ---------------------------------------------------------------------------------------------
# The pipeline's own reasons, bilingual at the source
# ---------------------------------------------------------------------------------------------

#: A case with fewer than two measured sizes shows a response, not a score (stages/evaluate.py).
NO_MEASUREMENT: Reason = pair(
    "this case carries no measured fragment sizes, so it shows a response rather than a score",
    "este caso no trae tamaños de fragmento medidos, así que muestra una respuesta y no un puntaje",
)


def degenerate_abstention(blast) -> Reason:
    """The abstention of every arm on a design that is not a blast (stages/infer.py)."""
    inner = is_degenerate(blast)
    if inner is None:
        raise ValueError(f"{blast.blast_id} is a blast: there is no degenerate abstention to write")
    return pair(
        f"this design is not a blast: {inner['en']}",
        f"este diseño no es una voladura: {inner['es']}",
    )


# ---------------------------------------------------------------------------------------------
# The engine's reasons, mapped by pattern
# ---------------------------------------------------------------------------------------------

@dataclass(frozen=True, slots=True)
class Entry:
    name: str
    #: Matched over the whole English text (``fullmatch``); the named groups carry the numbers and names.
    pattern: re.Pattern[str]
    #: Writes the Spanish from the match.
    spanish: Callable[[re.Match[str]], str]
    #: A text the engine really produces, which this entry alone matches.
    example: str


#: How the engine names a mine in a geometry refusal, in Spanish. Only a site with no published diameter
#: reaches a
#: refusal; a new such site is a new entry here, found by the bake stopping on it.
_MINES_ES = {"Miami Mine, Arizona, USA": "la mina Miami (Arizona, EE. UU.)"}

#: A site's ``diameter_source`` when the site publishes no diameter (the engine's geometry registry), in
#: Spanish.
_DIAMETER_SOURCES_ES = {
    "NOT PUBLISHED and not derivable. The paper gives no diameter and no absolute dimension for this site, "
    "so "
    "nothing fixes its scale. Its six rows are the geometry negative control: a model that needs rock volume "
    "must abstain here, and a number would be an invention.": (
        "NO PUBLICADO y no derivable. El artículo no da ningún diámetro ni dimensión absoluta para este "
        "sitio, "
        "así que nada fija su escala. Sus seis filas son el control negativo de geometría: un modelo que "
        "necesita el volumen de roca debe abstenerse aquí, y un número sería una invención."
    ),
}


def _diameter_source(text: str) -> str:
    try:
        return _DIAMETER_SOURCES_ES[text]
    except KeyError:
        raise UnknownReason(f"a diameter source the catalogue does not know: {text}") from None


def _mine(text: str) -> str:
    try:
        return _MINES_ES[text]
    except KeyError:
        raise UnknownReason(f"a mine the catalogue does not know: {text}") from None


def _fit_failure(m: re.Match[str]) -> str:
    # The wrapped reason is the engine's own text: it goes through the catalogue too, and stops the bake if
    # unknown.
    inner = from_engine(m["inner"])["es"]
    return f"no se pudo ajustar con las filas de entrenamiento del protocolo {m['protocol']}: {inner}"


_NAME = r"[a-z][a-z0-9-]*"

ENTRIES: tuple[Entry, ...] = (
    Entry(
        "group-assignment",
        re.compile(r"this arm assigns a rock-stiffness group rather than a fragment size"),
        lambda m: "este brazo asigna un grupo de rigidez de la roca en lugar de un tamaño de fragmento",
        "this arm assigns a rock-stiffness group rather than a fragment size",
    ),
    Entry(
        "outside-plausible-range",
        re.compile(
            r"the model returned (?P<value>\S+) m, which is outside the plausible fragment range "
            r"(?P<low>[\d.e+-]+) to (?P<high>[\d.e+-]+) m\. This is the model leaving its domain, not a "
            r"prediction\."
        ),
        lambda m: (
            f"el modelo devolvió {_comma(m['value'])} m, que queda fuera del rango plausible de tamaños de "
            f"fragmento, de {_comma(m['low'])} a {_comma(m['high'])} m. Es el modelo saliendo de su dominio, "
            "no una predicción."
        ),
        "the model returned 10.48 m, which is outside the plausible fragment range 0.001 to 3.0 m. "
        "This is the model leaving its domain, not a prediction.",
    ),
    Entry(
        "no-hole-diameter",
        re.compile(
            r"(?P<site>\S.*?) publishes no hole diameter, so rock volume and charge mass cannot be resolved; "
            r"this equation needs both"
        ),
        lambda m: (
            f"{m['site']} no publica el diámetro de perforación, así que no se pueden resolver el volumen de "
            "roca ni la masa de carga; esta ecuación necesita ambos"
        ),
        "Miami publishes no hole diameter, so rock volume and charge mass cannot be resolved; "
        "this equation needs both",
    ),
    Entry(
        "no-rock-factor",
        re.compile(r"no rock factor is available for (?P<site>\S.*)"),
        lambda m: f"no hay factor de roca disponible para {m['site']}",
        "no rock factor is available for Granite-NE",
    ),
    Entry(
        "geometry-unavailable",
        re.compile(
            r"(?P<blast>[^:]+): (?P<mine>.+?) publishes no hole diameter and no absolute dimension, so its "
            r"scale cannot be fixed\. (?P<source>.+)"
        ),
        lambda m: (
            f"{m['blast']}: {_mine(m['mine'])} no publica el diámetro de perforación ni ninguna dimensión "
            f"absoluta, así que no se puede fijar su escala. {_diameter_source(m['source'])}"
        ),
        "Mi1: Miami Mine, Arizona, USA publishes no hole diameter and no absolute dimension, so its scale "
        "cannot "
        "be fixed. NOT PUBLISHED and not derivable. The paper gives no diameter and no absolute dimension "
        "for "
        "this site, so nothing fixes its scale. Its six rows are the geometry negative control: a model that "
        "needs rock volume must abstain here, and a number would be an invention.",
    ),
    Entry(
        "geometry-site-unknown",
        re.compile(r"(?P<blast>[^:]+): site (?P<site>'[^']*'|\"[^\"]*\") is not in the geometry registry"),
        lambda m: f"{m['blast']}: el sitio {m['site']} no está en el registro de geometría",
        "Zz1: site 'Nowhere' is not in the geometry registry",
    ),
    Entry(
        "diameter-source",
        re.compile(r"(?P<source>NOT PUBLISHED and not derivable\..+)"),
        lambda m: _diameter_source(m["source"]),
        "NOT PUBLISHED and not derivable. The paper gives no diameter and no absolute dimension for this "
        "site, "
        "so nothing fixes its scale. Its six rows are the geometry negative control: a model that needs rock "
        "volume must abstain here, and a number would be an invention.",
    ),
    Entry(
        "null-unfitted",
        re.compile(r"the null model has not been fitted"),
        lambda m: "el modelo nulo no se ha ajustado",
        "the null model has not been fitted",
    ),
    Entry(
        "no-measured-size",
        re.compile(r"this blast has no measured size"),
        lambda m: "esta voladura no tiene tamaño medido",
        "this blast has no measured size",
    ),
    Entry(
        "transfer-unfitted",
        re.compile(r"the transfer rock factor has not been fitted"),
        lambda m: "el factor de roca de transferencia no se ha ajustado",
        "the transfer rock factor has not been fitted",
    ),
    Entry(
        "no-refitted-equation",
        re.compile(
            r"no refitted equation for group (?P<group>\d+): the training rows supplied did not contain "
            r"enough "
            r"of that group to fit seven exponents"
        ),
        lambda m: (
            f"no hay ecuación reajustada para el grupo {m['group']}: las filas de entrenamiento entregadas "
            f"no "
            "contenían suficientes de ese grupo para ajustar siete exponentes"
        ),
        "no refitted equation for group 3: the training rows supplied did not contain enough of that group "
        "to fit seven exponents",
    ),
    Entry(
        "no-network",
        re.compile(r"no network was trained for group (?P<group>\d+) on the rows supplied"),
        lambda m: f"no se entrenó ninguna red para el grupo {m['group']} con las filas entregadas",
        "no network was trained for group 3 on the rows supplied",
    ),
    Entry(
        "arm-unfitted",
        re.compile(rf"(?P<arm>{_NAME}) has not been fitted"),
        lambda m: f"{m['arm']} no se ha ajustado",
        "xgboost has not been fitted",
    ),
    Entry(
        "too-few-blasts",
        re.compile(rf"(?P<arm>{_NAME}) needs at least (?P<need>\d+) measured blasts, got (?P<got>\d+)"),
        lambda m: f"{m['arm']} necesita al menos {m['need']} voladuras medidas y recibió {m['got']}",
        "svr-rbf needs at least 10 measured blasts, got 4",
    ),
    Entry(
        "null-needs-sizes",
        re.compile(r"the null model needs measured sizes to average"),
        lambda m: "el modelo nulo necesita tamaños medidos para promediar",
        "the null model needs measured sizes to average",
    ),
    Entry(
        "transfer-too-few-sites",
        re.compile(
            r"the transfer rock factor needs at least (?P<need>\d+) training sites with a recovered factor, "
            r"got (?P<got>\d+)"
        ),
        lambda m: (
            f"el factor de roca de transferencia necesita al menos {m['need']} sitios de entrenamiento con "
            f"factor recuperado y recibió {m['got']}"
        ),
        "the transfer rock factor needs at least 3 training sites with a recovered factor, got 2",
    ),
    Entry(
        "fit-failure",
        re.compile(r"could not fit on the (?P<protocol>\S+) training rows: (?P<inner>.+)"),
        _fit_failure,
        "could not fit on the leave-out-Miami training rows: svr-rbf needs at least 10 measured blasts, "
        "got 4",
    ),
)


def from_engine(text: str) -> Reason:
    """An engine reason in both languages. Raises :class:`UnknownReason` with the text when no entry "
    "matches."""
    for entry in ENTRIES:
        match = entry.pattern.fullmatch(text)
        if match is not None:
            return pair(text, entry.spanish(match))
    raise UnknownReason(f"the engine produced a reason the catalogue does not know: {text!r}")
