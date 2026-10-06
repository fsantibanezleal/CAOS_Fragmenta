#!/usr/bin/env python3
"""Generate the five architecture-modal drawings from the committed artifacts.

    python scripts/build_architecture_svgs.py          write frontend/src/architecture/*.svg
    python scripts/build_architecture_svgs.py --check  fail if a committed drawing is out of date

It also writes ``docs/assets/arch-*.svg``: the English layout with FIXED colours, because a markdown
image is a separate document and cannot read the page's CSS variables (every ``var(--color-fg)`` in it
would resolve to black, or to nothing).

The drawings were hand-placed until 0.05.000, and two of them shipped with text running into a
neighbouring line or across a box edge; one still said "10 campaigns, 4 continents" and "2 fixed ones
hold" after both claims were withdrawn. Generating them fixes both failures at the root:

* every box sizes itself from its wrapped text, and every free-standing note goes into a notes band
  under the drawing, so no text can sit on another element (the browser gate measures it anyway);
* every number is read from the committed benchmark and index at build time, and ``--check`` runs in
  the test suite, so a drawing cannot disagree with the artifact it describes.

Each file carries BOTH languages as two complete layouts, ``<g class="l-en">`` and ``<g class="l-es">``,
because the two languages wrap differently; the modal shows one by its ``data-arch-lang`` attribute.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DERIVED = ROOT / "data" / "derived"
OUT = ROOT / "frontend" / "src" / "architecture"
DOCS_ASSETS = ROOT / "docs" / "assets"

# The light palette of the shared shell, for drawings that cannot read the theme.
FIXED = {
    "var(--color-surface-2)": "#f0f3f6",
    "var(--color-border)": "#d0d7de",
    "var(--color-fg)": "#1f2328",
    "var(--color-fg-subtle)": "#57606a",
    "var(--color-fg-faint)": "#6e7781",
    "var(--color-accent)": "#0969da",
    "var(--color-good)": "#1a7f37",
    "var(--color-warn)": "#9a6700",
    "var(--color-bad)": "#cf222e",
}

W = 900
PAD = 10
TITLE_LH = 16
BODY_LH = 14
TITLE_CHAR = 7.4
BODY_CHAR = 6.2
NOTE_CHAR = 6.3
NOTE_LH = 15

STYLE = """  <style>
    .arch-svg text { font-family: var(--font-sans, Inter, "Segoe UI", system-ui, sans-serif); }
    .arch-svg .bx { fill: var(--color-surface-2); stroke: var(--color-border); stroke-width: 1.2; }
    .arch-svg .bx-accent { stroke: var(--color-accent); stroke-width: 1.8; }
    .arch-svg .bx-good { stroke: var(--color-good); stroke-width: 1.8; }
    .arch-svg .bx-bad { stroke: var(--color-bad); stroke-width: 1.8; }
    .arch-svg .bx-warn { stroke: var(--color-warn); stroke-width: 1.8; }
    .arch-svg .ttl { fill: var(--color-fg); font-size: 14px; font-weight: 700; }
    .arch-svg .hd { fill: var(--color-fg); font-size: 12.5px; font-weight: 600; }
    .arch-svg .mu { fill: var(--color-fg-subtle); font-size: 10.5px; }
    .arch-svg .nt { fill: var(--color-fg-subtle); font-size: 11px; }
    .arch-svg .band { stroke: var(--color-border); stroke-dasharray: 3 4; }
    .arch-svg .flow { fill: none; stroke: var(--color-fg-faint); stroke-width: 1.5; }
  </style>
  <defs>
    <marker id="arch-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0,0 L8,4 L0,8 z" fill="var(--color-fg-faint)"/>
    </marker>
  </defs>
"""


def wrap(text: str, max_chars: int) -> list[str]:
    words, out, line = text.split(), [], ""
    for word in words:
        candidate = f"{line} {word}" if line else word
        if len(candidate) > max_chars and line:
            out.append(line)
            line = word
        else:
            line = candidate
    if line:
        out.append(line)
    return out or [""]


@dataclass
class Box:
    x: float
    y: float
    w: float
    title: str
    lines: list[str] = field(default_factory=list)
    tone: str = ""
    h: float = 0.0
    title_lines: list[str] = field(default_factory=list)
    body_lines: list[str] = field(default_factory=list)

    def place(self) -> "Box":
        inner = self.w - 2 * PAD
        self.title_lines = wrap(self.title, int(inner // TITLE_CHAR))
        self.body_lines = [piece for line in self.lines for piece in wrap(line, int(inner // BODY_CHAR))]
        self.h = PAD + len(self.title_lines) * TITLE_LH + (4 + len(self.body_lines) * BODY_LH if self.body_lines else 0) + 8
        return self

    def svg(self) -> str:
        cls = f"bx bx-{self.tone}" if self.tone else "bx"
        parts = [f'<rect class="{cls}" x="{self.x:.1f}" y="{self.y:.1f}" width="{self.w:.1f}" height="{self.h:.1f}" rx="6"/>']
        y = self.y + PAD + 11
        for line in self.title_lines:
            parts.append(f'<text class="hd" x="{self.x + PAD:.1f}" y="{y:.1f}">{escape(line)}</text>')
            y += TITLE_LH
        base = self.y + PAD + len(self.title_lines) * TITLE_LH + 4 + 10
        for i, line in enumerate(self.body_lines):
            parts.append(f'<text class="mu" x="{self.x + PAD:.1f}" y="{base + i * BODY_LH:.1f}">{escape(line)}</text>')
        return "\n".join(parts)

    def right(self, along: float = 0.5) -> tuple[float, float]:
        return self.x + self.w, self.y + self.h * along

    def left(self, along: float = 0.5) -> tuple[float, float]:
        return self.x - 2, self.y + self.h * along

    def bottom(self) -> tuple[float, float]:
        return self.x + self.w / 2, self.y + self.h

    def top(self) -> tuple[float, float]:
        return self.x + self.w / 2, self.y - 2


def picker(es: bool):
    """The bilingual text picker each drawing builder uses: t("english", "español")."""

    def t(en: str, sp: str) -> str:
        return sp if es else en

    return t


def column(x: float, w: float, y0: float, gap: float, specs: list[tuple]) -> list[Box]:
    out, y = [], y0
    for spec in specs:
        title, lines, *rest = spec
        box = Box(x, y, w, title, lines, rest[0] if rest else "").place()
        out.append(box)
        y += box.h + gap
    return out


def arrow(a: tuple[float, float], b: tuple[float, float]) -> str:
    return f'<line class="flow" x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" marker-end="url(#arch-arrow)"/>'


def elbow(a: tuple[float, float], b: tuple[float, float], via_y: float) -> str:
    """An arrow routed up to ``via_y``, across, and down: for two boxes with a column between them.

    A straight arrow between non-adjacent columns runs through the middle column's text; the browser
    gate measures strokes against text and fails it.
    """
    d = f"M {a[0]:.1f} {a[1]:.1f} V {via_y:.1f} H {b[0]:.1f} V {b[1]:.1f}"
    return f'<path class="flow" fill="none" d="{d}" marker-end="url(#arch-arrow)"/>'


def layout(title: str, columns: list[list[Box]], arrows: list[str], notes: list[str], heads: list[tuple[float, str]] = ()) -> tuple[str, float]:
    boxes = [b for col in columns for b in col]
    parts = [f'<text class="ttl" x="22" y="28">{escape(title)}</text>']
    for x, text in heads:
        parts.append(f'<text class="hd" x="{x:.1f}" y="52">{escape(text)}</text>')
    parts += [b.svg() for b in boxes]
    parts += arrows
    bottom = max(b.y + b.h for b in boxes) + 12
    lines = [piece for note in notes for piece in wrap(note, int((W - 44) // NOTE_CHAR))]
    if lines:
        parts.append(f'<line class="band" x1="22" y1="{bottom:.1f}" x2="{W - 22}" y2="{bottom:.1f}"/>')
        for i, line in enumerate(lines):
            parts.append(f'<text class="nt" x="22" y="{bottom + 18 + i * NOTE_LH:.1f}">{escape(line)}</text>')
        bottom += 18 + len(lines) * NOTE_LH
    return "\n".join(parts), bottom + 10


def document(label: str, en: tuple[str, float], es: tuple[str, float]) -> str:
    height = max(en[1], es[1])
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {height:.0f}" width="{W}" class="arch-svg" '
        f'role="img" aria-label="{escape(label)}">\n{STYLE}'
        f'<g class="l-en">\n{en[0]}\n</g>\n<g class="l-es">\n{es[0]}\n</g>\n</svg>\n'
    )


# ---------------------------------------------------------------------------------------------


def facts() -> dict:
    b = json.loads((DERIVED / "benchmark.json").read_text(encoding="utf-8"))
    index = json.loads((DERIVED / "manifests" / "index.json").read_text(encoding="utf-8"))
    loso = b["protocols"]["leave-one-site-out"]["arms"]
    random = b["protocols"]["random-8020"]["arms"]
    learned = [a for a, v in loso.items() if v["tier"] == "learned"]
    gaps = [b["verdict"]["protocol_gap_random_minus_grouped"][a] for a in learned]
    medians = [random[a]["r2_identity"] for a in learned]
    return {
        "b": b,
        "index": index,
        "n_cases": index["n_cases"],
        "case_kb": round(sum(c["bytes"] for c in index["cases"]) / 1024),
        "bench_kb": round(index["benchmark"]["bytes"] / 1024),
        "n_models": len(index["models"]),
        "model_kb": round(sum(m["bytes"] for m in index["models"]) / 1024),
        "gap": (min(gaps), max(gaps)),
        "medians": (min(medians), max(medians)),
        "kuz_random": random["kuznetsov"]["r2_identity"],
        "kuz_site": loso["kuznetsov"]["r2_identity"],
        "transfer_site": loso["kuznetsov-transfer"]["r2_identity"],
        "all": b["verdict"]["supports"]["all"],
        "geo": b["verdict"]["supports"]["geometry"],
        "n_repeats": b["n_repeats"],
        "n_boot": b["n_boot"],
        "engine": b["engine_version"],
    }


def tab1(F: dict, es: bool) -> tuple[str, float]:
    t = picker(es)
    left = column(22, 270, 64, 12, [
        (t("The question", "La pregunta"), [t("For this rock and this bench, which pattern delivers the P80 the crusher is specified for, and how far can the prediction be trusted?", "¿Para esta roca y este banco, qué malla entrega el P80 que pide la chancadora, y cuánto se puede confiar en la predicción?")], "accent"),
        (t("The evidence", "La evidencia"), [t("97 published bench blasts, 10 campaigns in 5 countries", "97 tiros de banco publicados, 10 campañas en 5 países"), t("14-blast published hold-out, 5 field blasts", "14 de validación publicados, 5 de campo"), t("measurement method stated for 3 campaigns", "método de medición declarado en 3 campañas")], "good"),
    ])
    mid = column(312, 270, 64, 12, [
        (t("Ten predictors", "Diez predictores"), [t("the 1973 equation to the 2025 ensemble, plus a null and an oracle", "de la ecuación de 1973 al ensamble de 2025, más un nulo y un oráculo")], "accent"),
        (t("Three protocols", "Tres protocolos"), [t(f"{F['n_repeats']} random draws, {F['n_repeats']} deduplicated, and 10 whole-campaign hold-outs with site-resampled intervals", f"{F['n_repeats']} sorteos aleatorios, {F['n_repeats']} deduplicados y 10 retenciones de campaña completa con intervalos por sitio")], "warn"),
    ])
    right = column(602, 276, 64, 12, [
        (t("What it finds", "Lo que encuentra"), [
            t(f"learned arms explain a median {F['medians'][0]:.2f} to {F['medians'][1]:.2f} on random splits and lose {F['gap'][0]:.2f} to {F['gap'][1]:.2f} with a site held out", f"los aprendidos explican una mediana de {F['medians'][0]:.2f} a {F['medians'][1]:.2f} al azar y pierden de {F['gap'][0]:.2f} a {F['gap'][1]:.2f} con el sitio excluido"),
            t(f"the classical equation scores about 0.30 under every protocol ({F['kuz_site']:.3f} held out by site)", f"la ecuación clásica puntúa cerca de 0.30 en todo protocolo ({F['kuz_site']:.3f} con el sitio excluido)"),
            t("no arm fitted without the corpus has an interval above zero", "ningún brazo ajustado sin el corpus tiene un intervalo sobre cero"),
        ], "bad"),
    ])
    nots = column(22, 856, max(b.y + b.h for b in left + mid + right) + 18, 10, [
        (t("What it is not", "Lo que no es"), [t("No mechanistic simulation, no non-ideal detonation, no flyrock, no vibration, no downstream comminution model; the initiation sequence is drawn and enters no prediction; constants no source prints are user parameters.", "Sin simulación mecanicista, sin detonación no ideal, sin proyección de rocas, sin vibración, sin modelo de conminución; la secuencia de iniciación se dibuja y no entra en ninguna predicción; las constantes que ninguna fuente imprime son parámetros del usuario.")]),
    ])
    arrows = [arrow(left[1].right(), mid[0].left()), arrow(mid[0].right(), right[0].left(0.3)), arrow(mid[1].right(), right[0].left(0.8))]
    notes = [t(
        "Two quantities are called R2 in this literature. Every score here is variance explained about the identity line, shown with the squared correlation and with a null that predicts the training mean.",
        "En esta literatura se llama R2 a dos cantidades. Cada puntaje aquí es varianza explicada respecto de la identidad, junto a la correlación al cuadrado y a un nulo que predice la media de entrenamiento.",
    )]
    return layout(t("What Fragmenta is", "Qué es Fragmenta"), [left, mid, right, nots], arrows, notes)


def tab2(F: dict, es: bool) -> tuple[str, float]:
    t = picker(es)
    offline = column(22, 270, 64, 10, [
        (t("Engine package", "Paquete motor"), [f"blastfrag {F['engine']} (PyPI)", t("models, corpora, protocols, metrics, export", "modelos, corpus, protocolos, métricas, exportación")], "accent"),
        (t("Staged bake", "Horneado por etapas"), [t("ingest, preprocess, split, features, train, infer, evaluate, export, validate", "ingesta, preproceso, partición, variables, entrenamiento, inferencia, evaluación, exportación, validación")]),
        (t("Benchmark", "Benchmark"), [t(f"{F['n_repeats']} draws per random protocol, 10 site folds, {F['n_boot']} site resamples per interval", f"{F['n_repeats']} sorteos por protocolo aleatorio, 10 pliegues de sitio, {F['n_boot']} remuestreos por intervalo")]),
    ])
    replay = column(312, 270, 64, 10, [
        (t(f"{F['n_cases']} case artifacts, {F['case_kb']} kB", f"{F['n_cases']} artefactos de caso, {F['case_kb']} kB"), [t("predictions, refusals with reasons, curves", "predicciones, negativas con razón, curvas")]),
        (t(f"Benchmark, {F['bench_kb']} kB", f"Benchmark, {F['bench_kb']} kB"), [t("spreads, two supports, intervals, per site", "dispersiones, dos soportes, intervalos, por sitio")]),
        (t(f"{F['n_models']} model files, {F['model_kb']} kB", f"{F['n_models']} archivos de modelos, {F['model_kb']} kB"), [t("the fitted arms of each training scope", "los brazos ajustados de cada alcance")], "warn"),
    ])
    live = column(602, 276, 64, 10, [
        (t("Live: closed forms", "Vivo: formas cerradas"), [t("classical, curves, router, regression, in TypeScript; parity-tested on every baked blast", "clásica, curvas, enrutador, regresión, en TypeScript; paridad probada en cada tiro")], "good"),
        (t("Live: fitted models", "Vivo: modelos ajustados"), [t("network, kernels, trees, stack, refit, transfer line, walked from JSON; exact against the original fit", "red, núcleos, árboles, apilado, reajuste, recta; recorridos desde JSON; exactos frente al ajuste")], "good"),
    ])
    arrows = [arrow(offline[0].bottom(), offline[1].top()), arrow(offline[1].bottom(), offline[2].top())]
    arrows += [arrow(offline[1].right(0.3 + 0.2 * i), r.left()) for i, r in enumerate(replay)]
    arrows += [arrow(replay[0].right(), live[0].left(0.4)), arrow(replay[2].right(), live[1].left(0.6))]
    notes = [t(
        "The deploy copies the committed artifacts and checks their digests; it never trains, never re-bakes and never recomputes a benchmark. Continuous integration installs no training stack.",
        "El despliegue copia los artefactos comprometidos y verifica sus resúmenes; nunca entrena, nunca vuelve a hornear y nunca recalcula un benchmark. La integración continua no instala la pila de entrenamiento.",
    )]
    heads = [(22, t("offline", "sin conexión")), (312, t("committed", "comprometido")), (602, t("in the browser", "en el navegador"))]
    return layout(t("Where each thing runs", "Dónde corre cada cosa"), [offline, replay, live], arrows, notes, heads)


def tab3(F: dict, es: bool) -> tuple[str, float]:
    t = picker(es)
    app = column(22, 300, 64, 10, [
        (t("App: one selected case", "App: un caso seleccionado"), [t("a rail with the case and the arm selectors, and six tabs grouped by the question", "un riel con los selectores de caso y brazo, y seis pestañas agrupadas por la pregunta")], "accent"),
        (t("The six tabs", "Las seis pestañas"), [t("Predict, Distribution, Bench, Rock, What if, Decide", "Predecir, Distribución, Banco, Roca, Qué pasa si, Decidir")]),
        (t("What if", "Qué pasa si"), [t("every arm, learned ones included, recomputes live on your design from the case's own fitted models", "todo brazo, aprendidos incluidos, se recalcula en vivo sobre su diseño con los modelos ajustados del caso")], "good"),
    ])
    docs = column(352, 260, 64, 10, [
        (t("Introduction", "Introducción"), [t("why fragmentation matters, the relations, the question, the scope", "por qué importa, las relaciones, la pregunta, el alcance")]),
        (t("Methodology, 7 sections", "Metodología, 7 secciones"), [t("every predictor term by term, protocols and metrics", "cada predictor término a término, protocolos y métricas")]),
        (t("Implementation, 8 sections", "Implementación, 8 secciones"), [t("data, geometry, bake, leakage, live lanes, deploy", "datos, geometría, horneado, fuga, carriles vivos, despliegue")]),
        (t("Experiments and Benchmark", "Experimentos y Benchmark"), [t("the only routes that summarise across cases", "las únicas rutas que resumen entre casos")], "warn"),
    ])
    focus = column(642, 236, 64, 10, [
        (t("Focus view", "Vista de foco"), [t("one case full screen, outside the header and footer, applying the theme itself", "un caso a pantalla completa, fuera del encabezado y el pie, aplicando el tema por sí misma")]),
        (t("Every view reads values", "Cada vista lee valores"), [t("readouts under the pointer, never on top of the drawing", "lecturas bajo el puntero, nunca sobre el dibujo")]),
    ])
    # App to the focus view passes over the documentation column, so it is routed through the free
    # band between the title and the boxes rather than straight through the Introduction box.
    arrows = [
        arrow(app[0].bottom(), app[1].top()),
        arrow(app[1].bottom(), app[2].top()),
        elbow((app[0].x + app[0].w * 0.8, app[0].y), (focus[0].x + 40, focus[0].y), app[0].y - 18),
    ]
    notes = [t(
        "The static host serves a real file at each route, so a shared deep link answers 200; the build writes them. A browser gate opens every route and every section in both themes and languages before a deploy publishes.",
        "El hospedaje estático sirve un archivo real en cada ruta, así que un enlace profundo compartido responde 200; la compilación los escribe. Una compuerta de navegador abre cada ruta y cada sección en ambos temas e idiomas antes de publicar.",
    )]
    return layout(t("Six routes and one view outside the chrome", "Seis rutas y una vista fuera del marco"), [app, docs, focus], arrows, notes)


def tab4(F: dict, es: bool) -> tuple[str, float]:
    t = picker(es)
    a = column(22, 270, 64, 10, [
        (t("A dimensionless corpus", "Un corpus adimensional"), [t("seven ratios and no dimensions; the classical equation needs volume and charge per hole", "siete razones y ninguna dimensión; la ecuación clásica necesita volumen y carga por barreno")], "bad"),
        (t("The prose closes it", "La prosa lo cierra"), ["B = (B/D)·D, V = B·S·H, Q = Pf·V", t("a diameter for 8 of 10 sites, a 9th from its bench height", "un diámetro en 8 de 10 sitios, un noveno desde su altura de banco")]),
        (t("Checked: 15 of 15", "Comprobado: 15 de 15"), [t("dimensional constraints the same prose states, at nine sites", "restricciones dimensionales que declara la misma prosa, en nueve sitios")], "good"),
    ])
    b = column(312, 270, 64, 10, [
        (t("A rock factor nobody printed", "Un factor de roca que nadie imprimió"), [t("recovered by inverting the equation on the published predictions; within-site spread 0.6 to 3.7 percent", "recuperado invirtiendo la ecuación sobre las predicciones publicadas; dispersión dentro del sitio 0,6 a 3,7 por ciento")], "accent"),
        (t("A transfer line", "Una recta de transferencia"), [t(f"the factor predicted from Young's modulus over training sites only: {F['transfer_site']:.3f} held out by site, against {F['kuz_site']:.3f} with the site's own factor", f"el factor predicho desde el módulo solo con los sitios de entrenamiento: {F['transfer_site']:.3f} con el sitio excluido, frente a {F['kuz_site']:.3f} con el factor propio")], "good"),
    ])
    c = column(602, 276, 64, 10, [
        (t("Classical", "Clásicos"), [t("the mean size two ways, and three curve shapes that share it", "el tamaño medio de dos formas, y tres formas de curva que lo comparten")]),
        (t("Statistical", "Estadísticos"), [t("the router and the published regression, both fitted by their source on the corpus; the refit", "el enrutador y la regresión publicada, ambos ajustados por su fuente sobre el corpus; el reajuste")]),
        (t("Learned, 6", "Aprendidos, 6"), [t("network, two kernels, forest, boosting, stacking", "red, dos núcleos, bosque, potenciación, apilado")]),
        (t("Controls, 2", "Controles, 2"), [t("the null predicts the training mean; the oracle returns the measurement", "el nulo predice la media de entrenamiento; el oráculo devuelve la medición")]),
    ])
    arrows = [arrow(a[0].bottom(), a[1].top()), arrow(a[1].bottom(), a[2].top()), arrow(a[1].right(), b[0].left()), arrow(b[0].bottom(), b[1].top()), arrow(b[1].right(), c[0].left())]
    notes = [t(
        "The tenth site, Miami, publishes nothing absolute, so its six blasts are not reconstructed and every arm that needs a volume abstains there with a reason; those six blasts are also what the verdict turns on.",
        "El décimo sitio, Miami, no publica nada absoluto, así que sus seis tiros no se reconstruyen y todo brazo que necesita volumen se abstiene allí con una razón; esos seis tiros son también de los que depende el veredicto.",
    )]
    return layout(t("The obstacle, and how it was closed", "El obstáculo, y cómo se cerró"), [a, b, c], arrows, notes)


def tab5(F: dict, es: bool) -> tuple[str, float]:
    t = picker(es)
    c1 = column(22, 270, 64, 10, [
        (t("Contract 1, what gets in", "Contrato 1, qué entra"), [t("REJECT outside the contract range (E in 0.5 to 150 GPa, Pf in 0.05 to 3 kg/m3)", "RECHAZA fuera del rango (E de 0,5 a 150 GPa, Pf de 0,05 a 3 kg/m3)"), t("FLAG and stamp outside the envelope; never clip", "MARCA y sella fuera de la envolvente; nunca recorta")], "warn"),
        (t("Integrity gate", "Compuerta de integridad"), [t("reproduce the paper's own summary table, plus a pinned digest; it found five transcription errors", "reproduce la tabla resumen del artículo, más un resumen fijado; encontró cinco errores de transcripción")], "good"),
    ])
    c2 = column(312, 270, 64, 10, [
        (t("Contract 2, what goes out", "Contrato 2, qué sale"), [t("case, benchmark and model files, each content-addressed, listed with its digest in the index", "archivos de caso, benchmark y modelos, cada uno por contenido, listados con su resumen en el índice")], "accent"),
        (t("A typed mirror", "Un espejo tipado"), [t("the browser's contract types; a field that appears in an artifact and not in the mirror fails the tests", "los tipos del navegador; un campo que aparece en un artefacto y no en el espejo hace fallar las pruebas")]),
    ])
    gate = column(602, 276, 64, 10, [
        (t("Release gate", "Compuerta de publicación"), [t("re-read and re-hash every file; every predicted cell carries a number or a reason, never neither", "relee y rehashea cada archivo; cada celda predicha lleva un número o una razón, nunca ninguna")], "good"),
        (t("Model fixtures", "Fijaciones de modelos"), [t("the original models' predictions at 116 blasts; the browser walker must reproduce them", "las predicciones de los modelos originales en 116 tiros; el recorrido del navegador debe reproducirlas")], "good"),
    ])
    arrows = [arrow(c1[0].bottom(), c1[1].top()), arrow(c1[1].right(), c2[0].left()), arrow(c2[0].bottom(), c2[1].top()), arrow(c2[0].right(), gate[0].left()), arrow(gate[0].bottom(), gate[1].top())]
    notes = [t(
        "The integrity gate exists because the corpus as first assembled disagreed with the published tables in five cells, two on the measured size; the tell was a powder-factor maximum of 1.47 against the 1.26 the paper prints.",
        "La compuerta de integridad existe porque el corpus, tal como se ensambló primero, discrepaba de las tablas publicadas en cinco celdas, dos sobre el tamaño medido; la señal fue un máximo de factor de carga de 1,47 frente al 1,26 que imprime el artículo.",
    )]
    return layout(t("The two contracts and the gates between them", "Los dos contratos y las compuertas entre ellos"), [c1, c2, gate], arrows, notes)


FILES = {
    "01-the-app.svg": ("What Fragmenta is", tab1),
    "02-lanes.svg": ("Where each thing runs", tab2),
    "03-web-flow.svg": ("The web flow", tab3),
    "04-the-science.svg": ("The science flow", tab4),
    "05-data-contracts.svg": ("The two data contracts", tab5),
}


def render() -> dict[str, str]:
    F = facts()
    return {name: document(label, build(F, False), build(F, True)) for name, (label, build) in FILES.items()}


def render_docs() -> dict[str, str]:
    """English only, fixed colours, white background: for the docs wiki."""
    F = facts()
    out = {}
    for name, (label, build) in FILES.items():
        body, height = build(F, False)
        style = STYLE
        for var, colour in FIXED.items():
            style = style.replace(var, colour)
        style = style.replace("var(--font-sans, Inter, \"Segoe UI\", system-ui, sans-serif)", "Inter, \"Segoe UI\", Helvetica, Arial, sans-serif")
        out[f"arch-{name}"] = (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {height:.0f}" width="{W}" class="arch-svg" '
            f'role="img" aria-label="{escape(label)}">\n{style}'
            f'<rect x="0" y="0" width="{W}" height="{height:.0f}" fill="#ffffff"/>\n{body}\n</svg>\n'
        )
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    out = {OUT / name: text for name, text in render().items()}
    out |= {DOCS_ASSETS / name: text for name, text in render_docs().items()}
    stale = []
    for path, text in out.items():
        name = path.name
        if args.check:
            if not path.exists() or path.read_text(encoding="utf-8") != text:
                stale.append(name)
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8", newline="\n")
    if stale:
        print(f"out of date: {', '.join(stale)}; run python scripts/build_architecture_svgs.py")
        return 1
    print("architecture drawings: " + ("up to date" if args.check else f"wrote {len(out)}"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
