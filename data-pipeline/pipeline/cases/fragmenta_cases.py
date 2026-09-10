"""The case registry: sixteen blast cases, grouped by category.

A case here is a coherent set of blasts that answers one question. Ten are real source campaigns,
one is a real out-of-envelope field set, and five are synthetic, two of which are controls.

Two of these cases exist specifically to make the product refuse rather than answer, and they are
the ones to look at first when judging whether it is honest.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Category = Literal[
    "real-campaign",
    "extrapolation-control",
    "parameter-sweep",
    "structural-control",
    "negative-control",
    "positive-control",
]


@dataclass(frozen=True, slots=True)
class Variant:
    """One perturbation of a case's base design, over a real physical family."""

    id: str
    label_en: str
    label_es: str
    #: The blast field this variant moves, and the multiplier applied to the case's base value.
    field: str
    factor: float


@dataclass(frozen=True, slots=True)
class Case:
    """One case: a set of real blasts or a synthetic design, plus its variants and its reason."""

    id: str
    category: Category
    real_or_synthetic: Literal["real", "synthetic"]
    #: The source site whose blasts this case carries, or None for a synthetic case.
    site: str | None
    title_en: str
    title_es: str
    #: Why this case is in the matrix. Not decoration: a case without a scientific reason is padding.
    reason_en: str
    reason_es: str
    expected_band: str
    variants: tuple[Variant, ...] = ()
    dataset: Literal["train", "field", "synthetic"] = "train"
    licence: str = "numeric facts from Hudaverdi, Kulatilake and Kuzu 2010, doi:10.1002/nag.957"
    doi: str = "10.1002/nag.957"


# Every case carries at least six variants, over families that a blast engineer actually moves.
# Multipliers rather than absolute values, so one definition applies to patterns of any scale.
_STANDARD_VARIANTS: tuple[Variant, ...] = (
    Variant("base", "As designed", "Como se diseñó", "none", 1.0),
    Variant(
        "burden-tight", "Burden 15 percent tighter", "Bordo 15 por ciento menor", "B_over_D", 0.85
    ),
    Variant(
        "burden-wide", "Burden 15 percent wider", "Bordo 15 por ciento mayor", "B_over_D", 1.15
    ),
    Variant(
        "spacing-wide",
        "Spacing 20 percent wider",
        "Espaciamiento 20 por ciento mayor",
        "S_over_B",
        1.20,
    ),
    Variant(
        "powder-up",
        "Powder factor 30 percent higher",
        "Factor de carga 30 por ciento mayor",
        "Pf_kg_m3",
        1.30,
    ),
    Variant(
        "powder-down",
        "Powder factor 25 percent lower",
        "Factor de carga 25 por ciento menor",
        "Pf_kg_m3",
        0.75,
    ),
    Variant(
        "stemming-long", "Stemming 25 percent longer", "Taco 25 por ciento más largo", "T_over_B", 1.25
    ),
    Variant(
        "blocky",
        "In situ blocks 50 percent larger",
        "Bloques in situ 50 por ciento mayores",
        "XB_m",
        1.50,
    ),
)


_REAL_SITES: tuple[tuple[str, str, str, str, str, str], ...] = (
    # site, title EN, title ES, reason EN, reason ES, expected band
    (
        "Enusa",
        "Enusa uranium mine, Spain",
        "Mina de uranio Enusa, España",
        (
    "The stiffest rock in the corpus at 60 GPa, in a moderately to heavily folded schist. It is "
    "also where the uniformity index goes lowest, because the stemming takes most of a bench "
    "only 1.33 burdens tall."
        ),
        (
    "La roca más rígida del conjunto, 60 GPa, en un esquisto plegado. También es donde el índice "
    "de uniformidad baja más, porque el taco ocupa casi todo un banco de solo 1.33 bordos."
        ),
        "coarse, 0.26 to 0.64 m measured",
    ),
    (
        "Reocin",
        "Reocin zinc open pit, Spain",
        "Rajo de zinc Reocin, España",
        (
    "The largest burden in the corpus at 6.0 m on 229 mm holes. Its Rc1 blast is the one that "
    "sits in both the training table and the published validation set."
        ),
        (
    "El mayor bordo del conjunto, 6.0 m con perforación de 229 mm. Su tiro Rc1 es el que aparece "
    "tanto en la tabla de entrenamiento como en el conjunto de validación publicado."
        ),
        "coarse, 0.44 to 0.96 m measured",
    ),
    (
        "Reocin-UG",
        "Reocin underground",
        "Reocin subterránea",
        (
    "The stiffness-ratio extreme: an 18 m bench on a 3 m burden, six burdens tall. Its hole "
    "diameter is the one the source never printed, recovered by inverting the stated bench "
    "height and agreeing on all six rows."
        ),
        (
    "El extremo de rigidez del banco: 18 m de altura sobre 3 m de bordo, seis bordos de alto. Su "
    "diámetro es el que la fuente nunca publicó, recuperado invirtiendo la altura declarada y "
    "coincidente en las seis filas."
        ),
        "coarse, 0.51 to 0.69 m measured",
    ),
    (
        "Murgul",
        "Murgul copper mine, Turkey",
        "Mina de cobre Murgul, Turquía",
        (
    "The geometry check. Its source paragraph states a bench height, a burden range and a "
    "spacing range, and the reconstruction reproduces all three exactly. If the arithmetic in "
    "this product were wrong, this case would show it."
        ),
        (
    "El control de geometría. Su párrafo fuente declara altura de banco, rango de bordo y rango "
    "de espaciamiento, y la reconstrucción reproduce los tres exactamente. Si la aritmética de "
    "este producto estuviera mal, este caso lo mostraría."
        ),
        "medium, 0.23 to 0.38 m measured",
    ),
    (
        "Mrica",
        "Mrica quarry, Indonesia",
        "Cantera Mrica, Indonesia",
        (
    "Andesite on the smallest holes in the corpus, 76 mm, in a 15 m bench. This is where the "
    "uniformity index reaches its highest values, because the charge column is long relative to "
    "the bench."
        ),
        (
    "Andesita con la perforación más pequeña del conjunto, 76 mm, en un banco de 15 m. Aquí el "
    "índice de uniformidad alcanza sus valores más altos, porque la columna de carga es larga "
    "respecto del banco."
        ),
        "fine, 0.13 to 0.21 m measured",
    ),
    (
        "Soma",
        "Soma coal basin, Turkey",
        "Cuenca carbonífera de Soma, Turquía",
        (
    "The case that carries an unresolved source conflict. Its paragraph states both a 5 m burden "
    "and a 21 cm hole, and the ratios cannot hold both. Taking the diameter reproduces the "
    "stated spacing and bench height exactly, so the diameter is used and the disagreement "
    "travels with the case."
        ),
        (
    "El caso que arrastra un conflicto sin resolver en la fuente. Su párrafo declara un bordo de "
    "5 m y una perforación de 21 cm, y las razones no admiten ambos. Tomar el diámetro "
    "reproduce exactamente el espaciamiento y la altura declarados, así que se usa el diámetro y "
    "la discrepancia viaja con el caso."
        ),
        "fine, 0.15 to 0.28 m measured",
    ),
    (
        "Dongri-Buzurg",
        "Dongri-Buzurg manganese mine, India",
        "Mina de manganeso Dongri-Buzurg, India",
        (
    "The weakest rock in the corpus at 9.57 GPa, and the lowest recovered rock factor at 3.68. "
    "It is also where the classical model fails hardest: on the hold-out blast from this site it "
    "predicts 0.08 m against 0.35 m measured."
        ),
        (
    "La roca más débil del conjunto, 9.57 GPa, y el menor factor de roca recuperado, 3.68. "
    "También es donde el modelo clásico falla más: en el tiro de validación de este sitio "
    "predice 0.08 m frente a 0.35 m medidos."
        ),
        "medium, 0.23 to 0.76 m measured",
    ),
    (
        "Akdaglar",
        "Akdaglar quarry, Istanbul",
        "Cantera Akdaglar, Estambul",
        (
    "The largest site in the corpus, 22 of the 97 blasts, which is why rows here are not "
    "independent draws and why the benchmark holds out whole sites. Sandstone at 16.9 GPa with "
    "the highest powder factors in the set."
        ),
        (
    "El sitio más grande del conjunto, 22 de los 97 tiros, razón por la cual las filas no son "
    "muestras independientes y el benchmark excluye sitios completos. Arenisca de 16.9 GPa con "
    "los mayores factores de carga del conjunto."
        ),
        "fine, 0.14 to 0.22 m measured",
    ),
    (
        "Ozmert",
        "Ozmert quarry, Istanbul",
        "Cantera Ozmert, Estambul",
        (
    "The sibling quarry to Akdaglar: the same sandstone and the same 89 mm holes on a different "
    "pattern, which is the closest thing this corpus has to a controlled comparison."
        ),
        (
    "La cantera hermana de Akdaglar: la misma arenisca y la misma perforación de 89 mm sobre "
    "otra malla, lo más parecido a una comparación controlada que ofrece este conjunto."
        ),
        "fine, 0.12 to 0.30 m measured",
    ),
)


def _real_cases() -> list[Case]:
    cases = [
        Case(
            id=f"real-{site.lower()}",
            category="real-campaign",
            real_or_synthetic="real",
            site=site,
            title_en=title_en,
            title_es=title_es,
            reason_en=reason_en,
            reason_es=reason_es,
            expected_band=band,
            variants=_STANDARD_VARIANTS,
        )
        for site, title_en, title_es, reason_en, reason_es, band in _REAL_SITES
    ]

    cases.append(
        Case(
            id="real-miami",
            category="negative-control",
            real_or_synthetic="real",
            site="Miami",
            title_en="Miami mine, Arizona: the geometry negative control",
            title_es="Mina Miami, Arizona: el control negativo de geometría",
            reason_en=(
                "Nothing in the source fixes this site's absolute scale: no hole diameter, no "
                "bench height, no burden. Every model that needs a rock volume and a charge mass "
                "must ABSTAIN on these six blasts, with a reason. A number here would be an "
                "invention, and this case exists so that refusal is visible rather than assumed."
            ),
            reason_es=(
                "Nada en la fuente fija la escala absoluta de este sitio: sin diámetro de "
                "perforación, sin altura de banco, sin bordo. Todo modelo que necesite volumen de "
                "roca y masa de carga debe ABSTENERSE en estos seis tiros, con una razón. Un número "
                "aquí sería una invención, y este caso existe para que la negativa sea visible."
            ),
            expected_band="the classical arm abstains on all six; the ratio arms answer",
            variants=_STANDARD_VARIANTS,
        )
    )

    cases.append(
        Case(
            id="real-granite-ne",
            category="extrapolation-control",
            real_or_synthetic="real",
            site="Granite-NE",
            title_en="Granite mine, northeastern China: the extrapolation control",
            title_es="Mina de granito, noreste de China: el control de extrapolación",
            reason_en=(
                "Five production blasts measured with image analysis, and the only real set in this "
                "product that lies OUTSIDE the fitted envelope. Its Young modulus of 5.6 GPa sits "
                "below the corpus minimum of 9.57, on the feature two independent studies rank most "
                "important. Every prediction here is stamped as an extrapolation. It is also the "
                "only set that publishes its absolute pattern, so it checks the geometry "
                "reconstruction instead of consuming it."
            ),
            reason_es=(
                "Cinco tiros de producción medidos por análisis de imagen, y el único conjunto real "
                "de este producto que queda FUERA de la envolvente ajustada. Su módulo de Young de "
                "5.6 GPa esta bajo el mínimo del corpus, 9.57, en la variable que dos estudios "
                "independientes califican como la más importante. Toda predicción aquí se marca "
                "como extrapolación. Es también el único conjunto que publica su malla absoluta, "
                "así que verifica la reconstrucción geométrica en vez de consumirla."
            ),
            expected_band="fine, 0.146 to 0.200 m measured, every prediction stamped extrapolated",
            variants=_STANDARD_VARIANTS,
            dataset="field",
            licence="numeric facts from Sui, Zhou, Zhao, Yang and Zou 2025, CC BY 4.0",
            doi="10.3390/app15031254",
        )
    )
    return cases


_SYNTHETIC: tuple[Case, ...] = (
    Case(
        id="synth-sweep-burden",
        category="parameter-sweep",
        real_or_synthetic="synthetic",
        site=None,
        title_en="Burden sweep at fixed rock",
        title_es="Barrido de bordo con roca fija",
        reason_en=(
            "Isolates the burden while everything else is held. The real campaigns each vary "
            "several things at once, so no real case can show a clean response to one lever. This "
            "is the spine of the design response surface."
        ),
        reason_es=(
            "Aísla el bordo manteniendo todo lo demás. Cada campaña real varía varias cosas a la "
            "vez, de modo que ningún caso real muestra una respuesta limpia a una sola palanca. "
            "Esta es la columna de la superficie de respuesta de diseño."
        ),
        expected_band="monotonic: coarser as the burden widens",
        variants=_STANDARD_VARIANTS,
        dataset="synthetic",
        licence="generated by this product; no measured data",
        doi="",
    ),
    Case(
        id="synth-sweep-powder",
        category="parameter-sweep",
        real_or_synthetic="synthetic",
        site=None,
        title_en="Powder-factor sweep at fixed geometry",
        title_es="Barrido de factor de carga con geometría fija",
        reason_en=(
            "The economics axis. Explosive is the cheapest place to break rock, and this is the "
            "curve that says how much finer each extra kilogram per cubic metre buys."
        ),
        reason_es=(
            "El eje económico. El explosivo es el lugar más barato para fragmentar roca, y esta es "
            "la curva que dice cuánto más fino compra cada kilogramo por metro cúbico adicional."
        ),
        expected_band="monotonic: finer as the powder factor rises",
        variants=_STANDARD_VARIANTS,
        dataset="synthetic",
        licence="generated by this product; no measured data",
        doi="",
    ),
    Case(
        id="synth-ibsd-capped",
        category="structural-control",
        real_or_synthetic="synthetic",
        site=None,
        title_en="Structurally capped: large in situ blocks",
        title_es="Limitado por estructura: bloques in situ grandes",
        reason_en=(
            "Drives the in-situ block size to the top of the corpus range while the pattern stays "
            "aggressive. The point is the coarse tail: no amount of explosive breaks rock finer "
            "than the joint structure without energy to do it, and this case is where that shows."
        ),
        reason_es=(
            "Lleva el tamaño de bloque in situ al tope del rango del corpus mientras la malla sigue "
            "agresiva. El punto es la cola gruesa: ninguna cantidad de explosivo fragmenta más fino "
            "que la estructura de juntas sin energía para hacerlo, y aquí se ve."
        ),
        expected_band="coarse tail dominated by the block size, not by the powder factor",
        variants=_STANDARD_VARIANTS,
        dataset="synthetic",
        licence="generated by this product; no measured data",
        doi="",
    ),
    Case(
        id="ctrl-degenerate",
        category="negative-control",
        real_or_synthetic="synthetic",
        site=None,
        title_en="Degenerate design: the negative control",
        title_es="Diseño degenerado: el control negativo",
        reason_en=(
            "A design that is not a blast: the stemming exceeds the hole, so there is no charge to "
            "detonate. Every arm must refuse it rather than return a plausible-looking number. If "
            "any arm answers here, the product is fabricating."
        ),
        reason_es=(
            "Un diseño que no es un tiro: el taco excede la perforación, de modo que no hay carga "
            "que detonar. Todo modelo debe rechazarlo en vez de devolver un número verosímil. Si "
            "algún modelo responde aquí, el producto esta fabricando."
        ),
        expected_band="every arm abstains, with a reason",
        variants=_STANDARD_VARIANTS[:6],
        dataset="synthetic",
        licence="generated by this product; no measured data",
        doi="",
    ),
    Case(
        id="ctrl-oracle",
        category="positive-control",
        real_or_synthetic="synthetic",
        site=None,
        title_en="Recoverable design: the positive control",
        title_es="Diseño recuperable: el control positivo",
        reason_en=(
            "Ground truth generated by a known arm, which that same arm must then recover to "
            "tolerance. It tests the harness rather than the science: if the arm that produced "
            "these numbers cannot reproduce them, the plumbing is broken and no other result on "
            "this page can be trusted."
        ),
        reason_es=(
            "Verdad de terreno generada por un modelo conocido, que ese mismo modelo debe recuperar "
            "dentro de tolerancia. Prueba el andamiaje, no la ciencia: si el modelo que produjo "
            "estos números no puede reproducirlos, la instalación esta rota y ningún otro resultado "
            "de esta página es confiable."
        ),
        expected_band="the generating arm recovers its own truth to within 1e-9",
        variants=_STANDARD_VARIANTS[:6],
        dataset="synthetic",
        licence="generated by this product; no measured data",
        doi="",
    ),
)


CASES: tuple[Case, ...] = tuple(_real_cases()) + _SYNTHETIC

CATEGORY_LABELS: dict[str, tuple[str, str]] = {
    "real-campaign": ("Real campaigns", "Campanas reales"),
    "extrapolation-control": ("Extrapolation control", "Control de extrapolacion"),
    "parameter-sweep": ("Parameter sweeps", "Barridos de parametros"),
    "structural-control": ("Structural control", "Control estructural"),
    "negative-control": ("Negative controls", "Controles negativos"),
    "positive-control": ("Positive control", "Control positivo"),
}
