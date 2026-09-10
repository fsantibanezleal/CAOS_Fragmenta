#!/usr/bin/env python3
"""Fail the build if a Spanish string is missing an accent it needs.

The product shipped its whole Spanish surface unaccented while its own navigation read
"Introduccion" correctly, so the two halves of the same page disagreed. To a Spanish reader an
unaccented "fragmentacion" or "campana" is not a typo, it is a different word: "campana" is a bell.

A general Spanish spell-checker is the wrong tool here. It would need a dictionary this repo does
not carry, and it would flag the mining and statistics vocabulary on every run. What this checks is
narrower and exact: a list of words that are ALWAYS wrong without their accent, in any context. Each
entry earned its place by appearing, unaccented, in a shipped string.

Words whose unaccented form is also a real Spanish word are deliberately absent. "mas" is a real
conjunction, "esta" is a real determiner, "si" is a real conditional, "solo" takes no accent under
current usage. Those cannot be decided by a list, so this guard does not pretend to.

    python scripts/check_spanish_accents.py
"""
from __future__ import annotations

import io
import json
import re
import subprocess
import sys
import tokenize
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SELF = Path(__file__).name

# Unaccented form: what it must be. Every one of these is unambiguous in any context.
REQUIRED = {
    "abstencion": "abstención", "actuan": "actúan", "actualizacion": "actualización",
    "afirmacion": "afirmación", "ahi": "ahí", "aisla": "aísla", "algun": "algún",
    "analisis": "análisis", "animacion": "animación", "aproximacion": "aproximación",
    "aqui": "aquí", "aritmetica": "aritmética", "articulo": "artículo", "asi": "así",
    "asignacion": "asignación", "atribucion": "atribución", "busqueda": "búsqueda",
    "calificacion": "calificación", "campana": "campaña", "canonico": "canónico",
    "caida": "caída", "caracteristica": "característica", "carbonifera": "carbonífera",
    "carguio": "carguío",
    "categoria": "categoría", "centimetros": "centímetros", "cientifico": "científico",
    "clasico": "clásico", "coleccion": "colección", "combinacion": "combinación",
    "comparacion": "comparación", "compensacion": "compensación", "composicion": "composición",
    "compresion": "compresión", "comprobacion": "comprobación", "conclusion": "conclusión",
    "conexion": "conexión", "conminucion": "conminución", "construccion": "construcción",
    "coreografia": "coreografía", "correccion": "corrección", "correlacion": "correlación",
    "criptografico": "criptográfico", "cubico": "cúbico", "debil": "débil", "decimo": "décimo",
    "decision": "decisión", "definicion": "definición", "deficit": "déficit", "demas": "demás",
    "descripcion": "descripción", "despues": "después", "desviacion": "desviación",
    "detonacion": "detonación", "diametro": "diámetro", "dieciseis": "dieciséis",
    "dimension": "dimensión", "direccion": "dirección", "diseno": "diseño",
    "dispersion": "dispersión", "distincion": "distinción", "distribucion": "distribución",
    "economico": "económico", "ecuacion": "ecuación", "energia": "energía", "envia": "envía",
    "espana": "España", "especificacion": "especificación", "estadistico": "estadístico",
    "estan": "están", "estandar": "estándar", "evalua": "evalúa", "exito": "éxito",
    "explicito": "explícito", "extrapolacion": "extrapolación", "formulas": "fórmulas",
    "fraccion": "fracción", "fragmentacion": "fragmentación", "funcion": "función",
    "geometria": "geometría", "geometrico": "geométrico", "granulometrico": "granulométrico",
    "habia": "había", "habria": "habría", "hibrido": "híbrido",
    "hiperparametros": "hiperparámetros", "hipotesis": "hipótesis", "identico": "idéntico",
    "implementacion": "implementación", "impresion": "impresión", "indice": "índice",
    "informacion": "información", "iniciacion": "iniciación",
    "inicializacion": "inicialización", "instalacion": "instalación",
    "introduccion": "introducción", "invencion": "invención", "inversion": "inversión",
    "limite": "límite", "linea": "línea", "maquina": "máquina", "maximo": "máximo",
    "mecanicista": "mecanicista", "medicion": "medición", "metodo": "método",
    "metodologia": "metodología", "metrica": "métrica", "milimetros": "milímetros",
    "minimo": "mínimo", "modulo": "módulo", "multiplicacion": "multiplicación",
    "ningun": "ningún", "normalizacion": "normalización", "notese": "nótese", "nucleo": "núcleo",
    "numerico": "numérico", "numero": "número", "ondulacion": "ondulación",
    "operacion": "operación", "pagina": "página", "parametro": "parámetro",
    "parentesis": "paréntesis", "parrafo": "párrafo", "particion": "partición",
    "pequena": "pequeña", "perforacion": "perforación", "podia": "podía", "podria": "podría",
    "potenciacion": "potenciación", "precision": "precisión", "prediccion": "predicción",
    "produccion": "producción", "proporcion": "proporción", "proyeccion": "proyección",
    "puntuacion": "puntuación", "razon": "razón", "reciproco": "recíproco",
    "recomendacion": "recomendación", "reconstruccion": "reconstrucción",
    "regresion": "regresión", "reproduccion": "reproducción", "rigido": "rígido",
    "segun": "según", "senal": "señal", "separacion": "separación", "simbolo": "símbolo",
    "simulacion": "simulación", "sintetico": "sintético", "sintoma": "síntoma",
    "subestimacion": "subestimación", "subterranea": "subterránea", "suposicion": "suposición",
    "tamano": "tamaño", "tambien": "también", "tecnico": "técnico", "tension": "tensión",
    "termino": "término", "traccion": "tracción", "transcripcion": "transcripción",
    "tuberia": "tubería", "turquia": "Turquía", "ultimo": "último", "unico": "único",
    "validacion": "validación", "variacion": "variación", "verificacion": "verificación",
    "verosimil": "verosímil", "version": "versión", "vibracion": "vibración",
}
# Plurals and the feminine, generated rather than listed, so the table above stays readable.
#
# The plural rule has one trap and it fired the first time this ran. A word stressed on its LAST
# syllable and ending in n or s carries the accent only in the singular: "razon" needs "razón", but
# its plural "razones" is correct exactly as written, because the extra syllable moves the stress
# onto the penultimate one and the accent is no longer needed. Generating "razónes" would have made
# this guard demand a misspelling. So no plural is generated for those.
AGUDA_ENDINGS = tuple(v + n for v in "áéíóú" for n in "ns")

for base, fixed in list(REQUIRED.items()):
    forms = [(base, fixed)]
    if base.endswith("o"):
        forms.append((base[:-1] + "a", fixed[:-1] + "a"))
    for singular, accented in forms:
        REQUIRED.setdefault(singular, accented)
        if accented.endswith(AGUDA_ENDINGS):
            continue
        suffix = "s" if singular[-1] in "aeiou" else "es"
        REQUIRED.setdefault(singular + suffix, accented + suffix)

# Correct without an accent. Listed above only so its plural is not generated from something else.
for correct in ("mecanicista", "mecanicistas"):
    REQUIRED.pop(correct, None)

QUOTED = r"(['\"])((?:\\.|(?!\1).)*)\1"
JSX_PATTERNS = [
    re.compile(r"\bes\s*\?\s*" + QUOTED, re.S),
    re.compile(r"lang\s*===\s*'es'\s*\?\s*" + QUOTED, re.S),
    re.compile(r"\b(?:\w*_)?es\s*:\s*" + QUOTED, re.S),
]
WORD = re.compile(r"[A-Za-zÀ-ſ]+")


def tracked(pattern: str) -> list[Path]:
    out = subprocess.run(["git", "ls-files", pattern], cwd=ROOT, capture_output=True, text=True,
                         check=True).stdout
    return [ROOT / line for line in out.splitlines() if line]


def spanish_strings() -> list[tuple[str, str]]:
    """Every Spanish literal in the product, as (where, text)."""
    found: list[tuple[str, str]] = []

    for path in sorted(set(tracked("frontend/src/**"))):
        if path.suffix not in {".ts", ".tsx"} or path.name == SELF:
            continue
        text = path.read_text(encoding="utf-8")
        seen = set()
        for pattern in JSX_PATTERNS:
            for m in pattern.finditer(text):
                if (m.start(2), m.end(2)) in seen:
                    continue
                seen.add((m.start(2), m.end(2)))
                line = text.count("\n", 0, m.start(2)) + 1
                found.append((f"{path.relative_to(ROOT).as_posix()}:{line}", m.group(2)))

    # The case registry writes its Spanish as Python literals, some of them implicitly concatenated
    # across lines. Ask the module which strings are Spanish rather than guessing from the source.
    sys.path.insert(0, str(ROOT / "data-pipeline"))
    from pipeline.registry import list_cases

    spanish, english = set(), set()
    for case in list_cases():
        spanish.update([case.title_es, case.reason_es])
        english.update([case.title_en, case.reason_en])
        for variant in case.variants:
            spanish.add(variant.label_es)
            english.add(variant.label_en)

    registry = ROOT / "data-pipeline" / "pipeline" / "cases" / "fragmenta_cases.py"
    source = registry.read_text(encoding="utf-8")
    for tok in tokenize.generate_tokens(io.StringIO(source).readline):
        if tok.type != tokenize.STRING:
            continue
        try:
            value = json.loads(tok.string) if tok.string.startswith('"') else None
        except ValueError:
            value = None
        if value is None:
            try:
                value = eval(tok.string, {}, {})  # noqa: S307, a string literal from this repo
            except Exception:
                continue
        if isinstance(value, str) and value.strip():
            if any(value in s for s in spanish) and not any(value in s for s in english):
                found.append((f"data-pipeline/.../fragmenta_cases.py:{tok.start[0]}", value))

    return found


def problems_in(where: str, text: str) -> list[str]:
    """Everything wrong with one Spanish string. Separated out so the guard itself is testable."""
    problems = []
    if text != unicodedata.normalize("NFC", text):
        problems.append(f"{where}: a decomposed accent, which some fonts render wrongly")
    if "�" in text:
        problems.append(f"{where}: a replacement character, so this string was mis-encoded")
    for m in WORD.finditer(text):
        fixed = REQUIRED.get(m.group(0).lower())
        if fixed:
            problems.append(f"{where}: '{m.group(0)}' should be '{fixed}'")
    return problems


def main() -> int:
    strings = spanish_strings()
    problems = [p for where, text in strings for p in problems_in(where, text)]

    for problem in problems:
        print(f"::error::{problem}")
    if problems:
        print(f"{len(problems)} problem(s) across {len(strings)} Spanish strings")
        return 1
    print(f"spanish accents: OK across {len(strings)} Spanish strings")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
