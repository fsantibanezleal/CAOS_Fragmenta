/**
 * Hand-authored, theme-aware SVG figures, laid out so that no text can sit on another element.
 *
 * Inline JSX rather than files behind an `<img>`: an SVG behind an `<img>` is a separate document and
 * cannot read the page's CSS custom properties, so every `var(--color-fg)` inside it resolves to black
 * and the figure disappears in the dark theme.
 *
 * Until 0.05.000 every label here was placed at a hand-picked coordinate, and four figures shipped with
 * text running through a neighbouring box or off the edge of the drawing: the stiffness-router note sat
 * on the Group 2 box, the protocol note inside the leave-one-site-out box, the classical trap note
 * 550 px wide from x = 500 in a 900 px drawing. The rules now:
 *
 * 1. A box sizes ITSELF from its wrapped title and lines (`place`), so its text cannot leave it.
 * 2. Arrows run between computed box edges (`edge`), never between typed coordinates.
 * 3. A free-standing note never shares space with the drawing: it goes into the NOTES BAND under it,
 *    wrapped to the width of the viewBox.
 * 4. Every string is bilingual.
 *
 * The widths used for wrapping are conservative estimates; the browser gate measures the real
 * rendered boxes (text against text, text against a box it does not belong to, text against the
 * viewBox) on every figure, in both themes and both languages, and fails the build on any hit.
 */

import { useShellLang } from '@fasl-work/caos-app-shell';
import { useId, type ReactNode } from 'react';

import { DISCRIMINANT_BOUNDARY, rosinRammler, sieveGrid, swebrec } from '../engine/live';
import { coord, num } from '../lib/format';

const FG = 'var(--color-fg, #222)';
const MUTED = 'var(--color-fg-subtle, #8892a4)';
const FAINT = 'var(--color-fg-faint, #9aa0aa)';
const ACCENT = 'var(--color-accent, #4f8ef7)';
const OK = 'var(--color-good, #3aa675)';
const WARN = 'var(--color-warn, #d19a2b)';
const BAD = 'var(--color-bad, #cc4b4b)';
const BORDER = 'var(--color-border, rgba(128,128,128,0.3))';
const SURFACE = 'var(--color-surface-2, transparent)';

/** Every figure is drawn in a 900-unit-wide viewBox and scales to its container. */
const W = 900;

type Tone = 'neutral' | 'accent' | 'good' | 'warn' | 'bad';
const TONE: Record<Tone, string> = { neutral: BORDER, accent: ACCENT, good: OK, warn: WARN, bad: BAD };

/* ------------------------------------------------------------------------------------------- */
/* Layout                                                                                        */
/* ------------------------------------------------------------------------------------------- */

const PAD = 10;
const TITLE_LH = 16;
const BODY_LH = 14;
// Conservative per-character advances. Over-estimating only wraps a line earlier than needed;
// under-estimating would let text out of its box, which the gate then catches.
const TITLE_CHAR = 7.4; // 12.5 px semibold sans
const MONO_CHAR = 6.5; // 10.5 px monospace is 0.6 em
const SANS_CHAR = 6.1; // 10.5 px sans
const NOTE_CHAR = 6.3; // 11 px sans
const NOTE_LH = 15;

/** Greedy word wrap to a character budget. A single word longer than the budget stays whole. */
function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      out.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) out.push(line);
  return out.length ? out : [''];
}

interface BoxSpec {
  x: number;
  y: number;
  w: number;
  title: string;
  lines?: string[];
  tone?: Tone;
  /** Body lines in a proportional font (prose) rather than monospace (quantities, formulas). */
  prose?: boolean;
}

interface Placed extends BoxSpec {
  h: number;
  titleLines: string[];
  bodyLines: string[];
}

function place(spec: BoxSpec): Placed {
  const inner = spec.w - 2 * PAD;
  const titleLines = wrap(spec.title, Math.floor(inner / TITLE_CHAR));
  const per = spec.prose ? SANS_CHAR : MONO_CHAR;
  const bodyLines = (spec.lines ?? []).flatMap((line) => wrap(line, Math.floor(inner / per)));
  const h = PAD + titleLines.length * TITLE_LH + (bodyLines.length ? 4 + bodyLines.length * BODY_LH : 0) + 8;
  return { ...spec, h, titleLines, bodyLines };
}

/** Stack boxes top to bottom in one column, each sized to its own text. */
function column(x: number, w: number, y0: number, gap: number, specs: Omit<BoxSpec, 'x' | 'y' | 'w'>[]): Placed[] {
  const out: Placed[] = [];
  let y = y0;
  for (const spec of specs) {
    const placed = place({ ...spec, x, y, w });
    out.push(placed);
    y += placed.h + gap;
  }
  return out;
}

/** Centre a box vertically on a reference line. */
function centred(spec: Omit<BoxSpec, 'y'>, cy: number): Placed {
  const probe = place({ ...spec, y: 0 });
  return { ...probe, y: cy - probe.h / 2 };
}

type Side = 'left' | 'right' | 'top' | 'bottom';

function edge(box: Placed, side: Side, along = 0.5): [number, number] {
  switch (side) {
    case 'left':
      return [box.x, box.y + box.h * along];
    case 'right':
      return [box.x + box.w, box.y + box.h * along];
    case 'top':
      return [box.x + box.w * along, box.y];
    default:
      return [box.x + box.w * along, box.y + box.h];
  }
}

const bottomOf = (boxes: Placed[]) => Math.max(...boxes.map((b) => b.y + b.h));

/* ------------------------------------------------------------------------------------------- */
/* Primitives                                                                                    */
/* ------------------------------------------------------------------------------------------- */

function BoxEl({ box }: { box: Placed }) {
  const stroke = TONE[box.tone ?? 'neutral'];
  const strong = box.tone && box.tone !== 'neutral';
  let y = box.y + PAD + 11;
  return (
    <g data-figure-box="">
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        rx={6}
        fill={SURFACE}
        stroke={stroke}
        strokeWidth={strong ? 2 : 1}
      />
      {box.titleLines.map((line, i) => {
        const el = (
          <text key={`t${i}`} x={box.x + PAD} y={y} fill={FG} fontSize={12.5} fontWeight={600}>
            {line}
          </text>
        );
        y += TITLE_LH;
        return el;
      })}
      {box.bodyLines.map((line, i) => {
        const baseline = box.y + PAD + box.titleLines.length * TITLE_LH + 4 + 10 + i * BODY_LH;
        return (
          <text
            key={`b${i}`}
            x={box.x + PAD}
            y={baseline}
            fill={MUTED}
            fontSize={10.5}
            fontFamily={box.prose ? undefined : 'ui-monospace, SFMono-Regular, Menlo, monospace'}
          >
            {line}
          </text>
        );
      })}
    </g>
  );
}

function Arrow({ from, to, marker, dashed }: { from: [number, number]; to: [number, number]; marker: string; dashed?: boolean }) {
  return (
    <line
      x1={from[0]}
      y1={from[1]}
      x2={to[0]}
      y2={to[1]}
      stroke={MUTED}
      strokeWidth={1.4}
      strokeDasharray={dashed ? '5 4' : undefined}
      markerEnd={`url(#${marker})`}
    />
  );
}

/** A label in free space, declared with its own bounding width so the gate can check it. */
function Label({ x, y, children, anchor = 'start', tone = 'muted', size = 10.5 }: {
  x: number;
  y: number;
  children: ReactNode;
  anchor?: 'start' | 'middle' | 'end';
  tone?: 'muted' | 'fg' | 'bad' | 'accent' | 'good' | 'warn';
  size?: number;
}) {
  const fill = { muted: MUTED, fg: FG, bad: BAD, accent: ACCENT, good: OK, warn: WARN }[tone];
  return (
    <text x={x} y={y} fill={fill} fontSize={size} textAnchor={anchor} data-figure-label="">
      {children}
    </text>
  );
}

interface FigureProps {
  label: string;
  caption: string;
  /** Height of the drawing, before the notes band. */
  height: number;
  notes?: string[];
  children: (marker: string) => ReactNode;
}

/** A figure: the drawing, then the notes band under it, then the caption outside the SVG. */
function Figure({ label, caption, height, notes = [], children }: FigureProps) {
  const marker = `fr-arrow-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const lines = notes.flatMap((note) => wrap(note, Math.floor((W - 24) / NOTE_CHAR)));
  const bandTop = height + 6;
  const total = lines.length ? bandTop + 12 + lines.length * NOTE_LH + 4 : height + 8;
  return (
    <figure className="fr-figure">
      <svg viewBox={`0 0 ${W} ${total}`} role="img" aria-label={label} className="fr-svg" data-figure="">
        <defs>
          <marker id={marker} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill={MUTED} />
          </marker>
        </defs>
        {children(marker)}
        {lines.length ? (
          <g data-figure-notes="">
            <line x1={12} y1={bandTop} x2={W - 12} y2={bandTop} stroke={BORDER} strokeDasharray="3 4" />
            {lines.map((line, i) => (
              <text key={i} x={12} y={bandTop + 16 + i * NOTE_LH} fill={MUTED} fontSize={11}>
                {line}
              </text>
            ))}
          </g>
        ) : null}
      </svg>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function useT() {
  const es = useShellLang() === 'es';
  return (en: string, sp: string) => (es ? sp : en);
}

/* ------------------------------------------------------------------------------------------- */
/* Introduction                                                                                  */
/* ------------------------------------------------------------------------------------------- */

/** The whole path, from a published table to a scored prediction. */
export function OverviewDiagram() {
  const t = useT();
  const cy = 90;
  const data = centred({ x: 12, w: 170, tone: 'good', title: t('97 measured blasts', '97 tiros medidos'), lines: [t('10 campaigns, 5 countries', '10 campañas, 5 países'), t('7 ratios + measured x50', '7 razones + x50 medido')] }, cy);
  const geo = centred({ x: 210, w: 170, title: t('Geometry recovered', 'Geometría recuperada'), lines: ['B = (B/D)·D', 'V = B·S·H', 'Q = Pf·V'] }, cy);
  const models = place({ x: 430, y: 18, w: 200, tone: 'accent', title: t('Ten predictors', 'Diez predictores'), lines: [t('equations to ensembles', 'ecuaciones a ensambles'), t('+ null and oracle', '+ nulo y oráculo')] });
  const protocols = place({ x: 430, y: 18 + models.h + 18, w: 200, tone: 'warn', title: t('Three protocols', 'Tres protocolos'), lines: [t('random, deduplicated,', 'aleatorio, deduplicado,'), t('one site held out', 'un sitio excluido')] });
  const verdict = centred({ x: 690, w: 198, tone: 'bad', title: t('Score with an interval', 'Puntaje con intervalo'), lines: [t('variance explained', 'varianza explicada'), t('site-resampled 95%', 'remuestreo por sitio 95%')] }, (models.y + protocols.y + protocols.h) / 2);
  const boxes = [data, geo, models, protocols, verdict];
  const h = bottomOf(boxes) + 14;
  return (
    <Figure
      height={h}
      label={t('From a published table to a scored prediction', 'De una tabla publicada a una predicción puntuada')}
      caption={t(
        'The path every number on this site takes. The left two boxes are measured data and arithmetic checked against the source; everything to the right is a model that is scored, with its uncertainty, before it is believed.',
        'El camino de cada número de este sitio. Las dos cajas de la izquierda son datos medidos y aritmética comprobada contra la fuente; todo lo de la derecha es un modelo que se puntúa, con su incertidumbre, antes de creerle.',
      )}
      notes={[
        t(
          'The geometry step is what lets the classical equation run at all: the corpus prints ratios, and the hole diameters in the source prose turn them into metres for 91 of the 97 blasts.',
          'El paso de geometría es lo que permite que la ecuación clásica corra: el corpus imprime razones, y los diámetros de perforación de la prosa de la fuente las convierten en metros para 91 de los 97 tiros.',
        ),
      ]}
    >
      {(m) => (
        <>
          {boxes.map((b, i) => <BoxEl key={i} box={b} />)}
          <Arrow from={edge(data, 'right')} to={[geo.x - 2, geo.y + geo.h / 2]} marker={m} />
          <Arrow from={edge(geo, 'right', 0.4)} to={[models.x - 2, models.y + models.h / 2]} marker={m} />
          <Arrow from={edge(geo, 'right', 0.6)} to={[protocols.x - 2, protocols.y + protocols.h / 2]} marker={m} />
          <Arrow from={edge(models, 'right')} to={[verdict.x - 2, verdict.y + verdict.h * 0.35]} marker={m} />
          <Arrow from={edge(protocols, 'right')} to={[verdict.x - 2, verdict.y + verdict.h * 0.65]} marker={m} />
        </>
      )}
    </Figure>
  );
}

/** The bench: what each symbol in the equations is, on an elevation and a plan. */
export function BenchSectionDiagram() {
  const t = useT();
  // Elevation, left panel. Ground level at y=70, floor at y=230, free face from the crest (330,70)
  // to the toe (370,230). Two holes, the front row at burden B from the crest.
  const crest = 330;
  const toe = 368;
  const top = 70;
  const floor = 230;
  const holes = [190, 260];
  const stem = 32;
  const sub = 16;
  const label = (x: number, y: number, text: string, anchor: 'start' | 'middle' | 'end' = 'start') => (
    <Label x={x} y={y} anchor={anchor}>{text}</Label>
  );
  return (
    <Figure
      height={300}
      label={t('Bench blast terminology', 'Terminología de una voladura de banco')}
      caption={t(
        'Left, a section through the bench; right, the pattern seen from above. These are the quantities the classical equation uses in metres and the corpus records only as ratios: S/B, H/B, B/D and T/B.',
        'A la izquierda, un corte del banco; a la derecha, la malla vista desde arriba. Son las magnitudes que la ecuación clásica usa en metros y que el corpus registra solo como razones: S/B, H/B, B/D y T/B.',
      )}
      notes={[
        t(
          'B burden, S spacing, H bench height, T stemming (inert plug at the collar), J subdrill below grade, D hole diameter. The charge column runs from the stemming to the bottom of the hole; powder factor Pf is charge mass per cubic metre of rock broken.',
          'B bordo, S espaciamiento, H altura de banco, T taco (tapón inerte en el collar), J pasadura bajo el piso, D diámetro de perforación. La columna de carga va del taco al fondo; el factor de carga Pf es masa de explosivo por metro cúbico de roca tronada.',
        ),
      ]}
    >
      {() => (
        <>
          {/* rock mass */}
          <path d={`M30,${top} L${crest},${top} L${toe},${floor} L430,${floor} L430,${floor + 40} L30,${floor + 40} Z`} fill="none" stroke={MUTED} strokeWidth={1.2} />
          {holes.map((x) => (
            <g key={x}>
              <rect x={x - 5} y={top} width={10} height={stem} fill={FAINT} opacity={0.45} />
              <rect x={x - 5} y={top + stem} width={10} height={floor + sub - top - stem} fill={WARN} opacity={0.75} />
            </g>
          ))}
          {/* H, bench height, on the far left */}
          <line x1={46} y1={top} x2={46} y2={floor} stroke={MUTED} />
          <line x1={40} y1={top} x2={52} y2={top} stroke={MUTED} />
          <line x1={40} y1={floor} x2={52} y2={floor} stroke={MUTED} />
          {label(58, (top + floor) / 2 + 4, 'H')}
          {/* B, burden: front hole to crest, above the bench */}
          <line x1={holes[1]} y1={top - 18} x2={crest} y2={top - 18} stroke={MUTED} />
          {label((holes[1] + crest) / 2, top - 24, 'B', 'middle')}
          {/* T and J beside the front hole */}
          <line x1={holes[1] + 14} y1={top} x2={holes[1] + 14} y2={top + stem} stroke={MUTED} />
          {label(holes[1] + 20, top + stem / 2 + 4, 'T')}
          <line x1={holes[1] + 14} y1={floor} x2={holes[1] + 14} y2={floor + sub} stroke={MUTED} />
          {label(holes[1] + 20, floor + sub / 2 + 5, 'J')}
          {/* D at the rear hole */}
          {label(holes[0] - 12, top + stem + 50, 'D', 'end')}
          {label(372, (top + floor) / 2, t('free face', 'cara libre'), 'start')}
          {label(30, top - 30, t('section', 'corte'), 'start')}
          {/* Plan, right panel: three rows by four holes, free face along the bottom. */}
          {label(480, top - 30, t('plan', 'planta'), 'start')}
          <line x1={480} y1={250} x2={880} y2={250} stroke={MUTED} strokeWidth={2} />
          {label(880, 270, t('free face', 'cara libre'), 'end')}
          {[0, 1, 2].map((row) =>
            [0, 1, 2, 3].map((col) => (
              <circle key={`${row}-${col}`} cx={540 + col * 90} cy={210 - row * 55} r={6} fill={WARN} opacity={0.85} />
            )),
          )}
          {/* S between two holes of the front row, B from the front row to the face */}
          <line x1={540} y1={228} x2={630} y2={228} stroke={MUTED} />
          {label(585, 243, 'S', 'middle')}
          <line x1={835} y1={210} x2={835} y2={250} stroke={MUTED} />
          {label(848, 234, 'B', 'start')}
        </>
      )}
    </Figure>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* Methodology                                                                                   */
/* ------------------------------------------------------------------------------------------- */

export function ClassicalFlowDiagram() {
  const t = useT();
  const left = column(12, 190, 14, 16, [
    { title: t('Absolute pattern', 'Malla absoluta'), lines: ['B, S, H, T, D', 'V = B·S·H', 'Q = Pf·V'] },
    { title: t('Rock factor A', 'Factor de roca A'), tone: 'warn', lines: [t('published ratings, or', 'calificaciones publicadas, o'), t('recovered per site, or', 'recuperado por sitio, o'), t('predicted from E', 'predicho desde E')] },
  ]);
  const mean = centred({ x: 245, w: 220, tone: 'accent', title: t('Mean size x50', 'Tamaño medio x50'), lines: ['A·(V/Q)^0.8·Q^(1/6)', '·(RWS/115)^(-19/30)'] }, bottomOf(left) / 2 + 7);
  const right = column(505, 200, 14, 16, [
    { title: t('Uniformity n', 'Uniformidad n'), tone: 'bad', lines: ['(2.2 - 14·B/d)·...', t('B in m, d in mm', 'B en m, d en mm')] },
    { title: t('Curve shape', 'Forma de la curva'), lines: ['Rosin-Rammler', 'Swebrec', t('two-branch', 'dos ramas')] },
  ]);
  const out = centred({ x: 745, w: 143, tone: 'good', title: 'P20, P50, P80', lines: [t('oversize %', 'sobretamaño %'), t('fines %', 'finos %')] }, bottomOf(right) / 2 + 7);
  const boxes = [...left, mean, ...right, out];
  return (
    <Figure
      height={bottomOf(boxes) + 12}
      label={t('The classical model, term by term', 'El modelo clásico, término a término')}
      caption={t(
        'The classical chain. The rock factor enters multiplicatively, so a predicted size is linear in it; the uniformity index sets the shape around the mean size and never moves the mean size itself.',
        'La cadena clásica. El factor de roca entra multiplicando, así que el tamaño predicho es lineal en él; el índice de uniformidad fija la forma alrededor del tamaño medio y nunca mueve el tamaño medio.',
      )}
      notes={[
        t(
          'The trap in n: the source gives the burden in metres and the hole diameter in millimetres, so B/d is about 0.027 for a 4.5 m burden on a 165 mm hole, a thousand times smaller than the ratio the corpus tabulates. Read as the tabulated ratio, the leading term becomes 2.2 minus 382.',
          'La trampa en n: la fuente da el bordo en metros y el diámetro en milímetros, así que B/d vale cerca de 0,027 para un bordo de 4,5 m en un barreno de 165 mm, mil veces menos que la razón tabulada en el corpus. Leído como la razón tabulada, el término principal pasa a 2,2 menos 382.',
        ),
      ]}
    >
      {(m) => (
        <>
          {boxes.map((b, i) => <BoxEl key={i} box={b} />)}
          <Arrow from={edge(left[0], 'right')} to={[mean.x - 2, mean.y + mean.h * 0.35]} marker={m} />
          <Arrow from={edge(left[1], 'right')} to={[mean.x - 2, mean.y + mean.h * 0.65]} marker={m} />
          <Arrow from={edge(mean, 'right')} to={[right[1].x - 2, right[1].y + right[1].h / 2]} marker={m} />
          <Arrow from={edge(right[0], 'bottom')} to={[right[1].x + right[1].w / 2, right[1].y - 2]} marker={m} />
          <Arrow from={edge(right[1], 'right')} to={[out.x - 2, out.y + out.h / 2]} marker={m} />
        </>
      )}
    </Figure>
  );
}

export function RockFactorDiagram() {
  const t = useT();
  const sources = column(12, 230, 12, 12, [
    { title: t('Lilly, as printed in 2010', 'Lilly, según 2010'), lines: ['BI = 0.5(RMD+JPS+JPO', '     +RDI+0.05·UCS)'] },
    { title: t('Lilly, as printed in 2019', 'Lilly, según 2019'), tone: 'warn', lines: [t('strength = UCS/3 or /5', 'resistencia = UCS/3 o /5')] },
    { title: t('Protodyakonov lookup', 'Tabla de Protodyakonov'), lines: [t('five bands, A = 3 to 13', 'cinco bandas, A = 3 a 13')] },
    { title: t('Recovered per site', 'Recuperado por sitio'), tone: 'good', lines: [t('invert x50 on the', 'invertir x50 sobre la'), t('published prediction', 'predicción publicada')] },
    { title: t('Predicted from E', 'Predicho desde E'), tone: 'accent', lines: [t('line over training sites', 'recta sobre sitios de'), t('only (transfer arm)', 'entrenamiento (brazo de transferencia)')] },
  ]);
  const a = centred({ x: 310, w: 200, tone: 'accent', title: t('Rock factor A', 'Factor de roca A'), lines: [t('valid range 0.8 to 22', 'rango válido 0,8 a 22'), t('x50 is linear in A', 'x50 es lineal en A')] }, bottomOf(sources) / 2 + 6);
  const spread = centred({ x: 580, w: 308, tone: 'bad', title: t('How far the routes disagree', 'Cuánto discrepan las rutas'), lines: [t('2010 vs 2019 tables: up to', 'tablas 2010 vs 2019: hasta'), t('0.85 in A at UCS 100 MPa', '0,85 en A con UCS 100 MPa'), t('recovered: within-site', 'recuperado: dispersión'), t('spread 0.6 to 3.7%', 'dentro del sitio 0,6 a 3,7%')] }, a.y + a.h / 2);
  const boxes = [...sources, a, spread];
  return (
    <Figure
      height={bottomOf(boxes) + 12}
      label={t('Five routes to the rock factor', 'Cinco rutas al factor de roca')}
      caption={t(
        'Five routes to one number. The two rating tables carry the same attribution and different strength terms; the recovered factors come from the published predictions; the transfer arm predicts the factor from the modulus without the target site.',
        'Cinco rutas a un número. Las dos tablas de calificación llevan la misma atribución y términos de resistencia distintos; los factores recuperados salen de las predicciones publicadas; el brazo de transferencia predice el factor desde el módulo sin el sitio objetivo.',
      )}
    >
      {(m) => (
        <>
          {boxes.map((b, i) => <BoxEl key={i} box={b} />)}
          {sources.map((s, i) => (
            <Arrow key={i} from={edge(s, 'right')} to={[a.x - 2, a.y + a.h * (0.2 + i * 0.15)]} marker={m} />
          ))}
          <Arrow from={edge(a, 'right')} to={[spread.x - 2, spread.y + spread.h / 2]} marker={m} />
        </>
      )}
    </Figure>
  );
}

/** Two distribution shapes around the same mean size, computed with the live engine. */
export function DistributionShapesDiagram() {
  const t = useT();
  const x50 = 0.3;
  const n = 1.2;
  const xmax = 4.5;
  const grid = sieveGrid(0.003, 4.4, 160);
  const rr = rosinRammler(x50, n, grid).passing;
  const sw = swebrec(x50, xmax, 2.0, grid).passing;
  // Plot area
  const X0 = 70;
  const X1 = 860;
  const Y0 = 24;
  const Y1 = 236;
  const lx = (v: number) => X0 + ((Math.log10(v) - Math.log10(0.003)) / (Math.log10(4.4) - Math.log10(0.003))) * (X1 - X0);
  const ly = (p: number) => Y1 - p * (Y1 - Y0);
  const path = (values: number[]) => values.map((p, i) => `${i ? 'L' : 'M'}${coord(lx(grid[i]))},${coord(ly(p))}`).join(' ');
  const ticks = [0.01, 0.1, 1];
  return (
    <Figure
      height={286}
      label={t('Two curves through one mean size', 'Dos curvas por un mismo tamaño medio')}
      caption={t(
        'Computed in your browser by the same functions the App uses: a two-parameter Rosin-Rammler curve (n = 1.2) and a three-parameter Swebrec curve (upper limit 4.5 m, undulation 2) through the same x50 of 0.30 m. Both pass 50 percent at x50; they disagree in both tails.',
        'Calculadas en su navegador por las mismas funciones que usa la App: una curva Rosin-Rammler de dos parámetros (n = 1,2) y una Swebrec de tres (límite superior 4,5 m, ondulación 2) por el mismo x50 de 0,30 m. Ambas pasan el 50 por ciento en x50; discrepan en las dos colas.',
      )}
      notes={[
        t(
          'Horizontal axis: mesh size, logarithmic, 3 mm to 4.4 m. Vertical: fraction passing, 0 to 1. No measured passing curve exists for any blast held for this work, so neither shape is validated here.',
          'Eje horizontal: tamaño de malla, logarítmico, de 3 mm a 4,4 m. Vertical: fracción pasante, de 0 a 1. Ningún tiro disponible para este trabajo tiene una curva pasante medida, así que ninguna de las dos formas se valida aquí.',
        ),
      ]}
    >
      {() => (
        <>
          <rect x={X0} y={Y0} width={X1 - X0} height={Y1 - Y0} fill="none" stroke={BORDER} />
          {[0.25, 0.5, 0.75].map((p) => (
            <line key={p} x1={X0} y1={ly(p)} x2={X1} y2={ly(p)} stroke={BORDER} strokeDasharray="2 4" />
          ))}
          <line x1={lx(x50)} y1={Y0} x2={lx(x50)} y2={Y1} stroke={FAINT} strokeDasharray="4 4" />
          <path d={path(rr)} fill="none" stroke={ACCENT} strokeWidth={2.2} />
          <path d={path(sw)} fill="none" stroke={WARN} strokeWidth={2.2} />
          {ticks.map((v) => (
            <Label key={v} x={lx(v)} y={Y1 + 16} anchor="middle">{v >= 1 ? `${v} m` : `${v * 100} cm`}</Label>
          ))}
          <Label x={lx(x50)} y={Y1 + 16} anchor="middle" tone="fg">x50</Label>
          {[0, 0.5, 1].map((p) => (
            <Label key={p} x={X0 - 8} y={ly(p) + 4} anchor="end">{num(p, 1)}</Label>
          ))}
          {/* Legend in the empty upper-left of the plot, where neither curve goes. */}
          <rect x={X0 + 12} y={Y0 + 12} width={14} height={4} fill={ACCENT} />
          <Label x={X0 + 32} y={Y0 + 18} tone="fg">Rosin-Rammler (Kuz-Ram)</Label>
          <rect x={X0 + 12} y={Y0 + 32} width={14} height={4} fill={WARN} />
          <Label x={X0 + 32} y={Y0 + 38} tone="fg">Swebrec</Label>
        </>
      )}
    </Figure>
  );
}

export function GroupRouterDiagram() {
  const t = useT();
  const groups = column(560, 210, 14, 26, [
    { title: t('Group 1, high modulus', 'Grupo 1, módulo alto'), tone: 'good', lines: [t('35 blasts, mean 51.1 GPa', '35 tiros, media 51,1 GPa'), t('lowest L = 13.067', 'menor L = 13,067')] },
    { title: t('Group 2, low modulus', 'Grupo 2, módulo bajo'), tone: 'good', lines: [t('62 blasts, mean 17.2 GPa', '62 tiros, media 17,2 GPa'), t('highest L = 10.318', 'mayor L = 10,318')] },
  ]);
  const mid = bottomOf(groups) / 2 + 7;
  const inputs = centred({ x: 12, w: 170, title: t('Seven ratios', 'Siete razones'), lines: ['S/B H/B B/D T/B', 'Pf XB E'] }, mid);
  const score = centred({ x: 222, w: 230, tone: 'accent', title: t('Discriminant L', 'Discriminante L'), lines: ['4.467 S/B - 0.551 H/B', '- 0.123 B/D + ... + 3.577'] }, mid);
  const eq = centred({ x: 800, w: 88, title: t('Its own', 'Su propia'), lines: [t('power law', 'ley de potencia')] }, mid);
  const boxes = [inputs, score, ...groups, eq];
  const from = edge(score, 'right');
  return (
    <Figure
      height={bottomOf(boxes) + 12}
      label={t('The stiffness router', 'El enrutador por rigidez')}
      caption={t(
        'The published discriminant function decides which group equation applies. It reproduces the published membership of all 109 labelled blasts with zero errors, and the two groups do not overlap.',
        'La función discriminante publicada decide qué ecuación de grupo se aplica. Reproduce la pertenencia publicada de los 109 tiros etiquetados sin un solo error, y los dos grupos no se traslapan.',
      )}
      notes={[
        t(
          `Rule: a blast goes to Group 1 when L is above ${DISCRIMINANT_BOUNDARY}, the midpoint between the two group centroids measured on the corpus. It is a real gate rather than a label lookup, so it routes designs the corpus never contained; its coefficients, like the regressions', were fitted by the source on all 97 blasts.`,
          `Regla: un tiro va al Grupo 1 cuando L supera ${DISCRIMINANT_BOUNDARY}, el punto medio entre los centroides de los dos grupos medido en el corpus. Es una compuerta real y no una búsqueda de etiqueta, así que enruta diseños que el corpus no contenía; sus coeficientes, como los de las regresiones, los ajustó la fuente sobre los 97 tiros.`,
        ),
      ]}
    >
      {(m) => (
        <>
          {boxes.map((b, i) => <BoxEl key={i} box={b} />)}
          <Arrow from={edge(inputs, 'right')} to={[score.x - 2, score.y + score.h / 2]} marker={m} />
          <Arrow from={from} to={[groups[0].x - 2, groups[0].y + groups[0].h / 2]} marker={m} />
          <Arrow from={from} to={[groups[1].x - 2, groups[1].y + groups[1].h / 2]} marker={m} />
          <Label x={(from[0] + groups[0].x) / 2} y={groups[0].y + groups[0].h / 2 - 8} anchor="middle" tone="fg">{`L > ${DISCRIMINANT_BOUNDARY}`}</Label>
          <Label x={(from[0] + groups[1].x) / 2} y={groups[1].y + groups[1].h / 2 + 18} anchor="middle" tone="fg">{`L ≤ ${DISCRIMINANT_BOUNDARY}`}</Label>
          <Arrow from={edge(groups[0], 'right')} to={[eq.x - 2, eq.y + eq.h * 0.3]} marker={m} />
          <Arrow from={edge(groups[1], 'right')} to={[eq.x - 2, eq.y + eq.h * 0.7]} marker={m} />
        </>
      )}
    </Figure>
  );
}

export function NetworkDiagram() {
  const t = useT();
  const router = place({ x: 12, y: 60, w: 150, title: t('Router', 'Enrutador'), lines: [t('picks the group', 'elige el grupo')] });
  const scale = place({ x: 192, y: 60, w: 160, title: t('Min-max scaling', 'Escala mín-máx'), lines: ['(x - min)/(max - min)', t('training rows only', 'solo filas de entrenamiento')] });
  const net = place({ x: 382, y: 30, w: 230, tone: 'accent', title: t('7-N-1 network, per group', 'Red 7-N-1, por grupo'), lines: [t('logistic hidden units', 'unidades ocultas logísticas'), t('N = 9 (group 1), 7 (group 2)', 'N = 9 (grupo 1), 7 (grupo 2)'), 'Levenberg-Marquardt', t('8 networks, seeded', '8 redes, con semilla')] });
  const out = place({ x: 642, y: 30, w: 246, tone: 'warn', title: t('Output', 'Salida'), lines: [t('each clamped to [0, 1],', 'cada una acotada a [0, 1],'), t('rescaled, then averaged;', 'reescalada y promediada;'), t('the spread is reported', 'la dispersión se informa')] });
  const boxes = [router, scale, net, out];
  return (
    <Figure
      height={bottomOf(boxes) + 12}
      label={t('The published network', 'La red publicada')}
      caption={t(
        'The 2012 network as specified: one hidden layer, trained separately on each stiffness group, eight simulations averaged. Every stage is reproduced; the hidden widths are the published optima.',
        'La red de 2012 tal como se especificó: una capa oculta, entrenada por separado en cada grupo de rigidez, ocho simulaciones promediadas. Cada etapa se reproduce; los anchos ocultos son los óptimos publicados.',
      )}
      notes={[
        t(
          'The clamp is part of the published design and has a consequence across sites: a network trained without a coarse campaign cannot predict a size above the coarsest training blast. The two Reocin campaigns, the coarsest in the corpus, are where that bites.',
          'El acotamiento es parte del diseño publicado y tiene una consecuencia entre sitios: una red entrenada sin una campaña gruesa no puede predecir un tamaño mayor que el del tiro de entrenamiento más grueso. Las dos campañas de Reocin, las más gruesas del corpus, son donde eso pesa.',
        ),
      ]}
    >
      {(m) => (
        <>
          {boxes.map((b, i) => <BoxEl key={i} box={b} />)}
          <Arrow from={edge(router, 'right')} to={[scale.x - 2, scale.y + scale.h / 2]} marker={m} />
          <Arrow from={edge(scale, 'right')} to={[net.x - 2, scale.y + scale.h / 2]} marker={m} />
          <Arrow from={edge(net, 'right')} to={[out.x - 2, net.y + net.h / 2]} marker={m} />
        </>
      )}
    </Figure>
  );
}

export function EnsembleDiagram({ boostingWeight, forestWeight }: { boostingWeight?: number | null; forestWeight?: number | null }) {
  const t = useT();
  const fmt = (v?: number | null) => (v === undefined || v === null ? '...' : num(v, 2));
  const scale = place({ x: 12, y: 70, w: 150, title: t('Standard score', 'Puntaje estándar'), lines: ['(x - mean)/sd', t('training rows', 'filas de entrenamiento')] });
  const bases = column(196, 220, 14, 14, [
    { title: t('Random forest', 'Bosque aleatorio'), lines: [t('76 trees, seed 27', '76 árboles, semilla 27')] },
    { title: 'XGBoost', tone: 'warn', lines: [t('rate 0.5, seed 42', 'tasa 0,5, semilla 42'), t('fits its training rows almost exactly', 'ajusta sus filas de entrenamiento casi exacto')] },
    { title: t('Support vectors', 'Vectores de soporte'), lines: [t('radial: C 5.25, eps 0.04', 'radial: C 5,25, eps 0,04'), t('poly: degree 5, C 1', 'polinómico: grado 5, C 1')] },
  ]);
  const meta = place({ x: 456, y: 22, w: 200, tone: 'accent', title: t('Linear meta-learner', 'Meta-aprendiz lineal'), lines: [t('fitted on IN-SAMPLE base', 'ajustado sobre predicciones'), t('predictions (no CV)', 'base EN MUESTRA (sin CV)')] });
  const weights = place({ x: 686, y: 22, w: 202, tone: 'bad', title: t('Learned weights', 'Pesos aprendidos'), lines: [`${t('boosting', 'boosting')} ${fmt(boostingWeight)}`, `${t('forest', 'bosque')} ${fmt(forestWeight)}`, t('= its boosting learner', '= su aprendiz boosting')] });
  const boxes = [scale, ...bases, meta, weights];
  return (
    <Figure
      height={bottomOf(boxes) + 12}
      label={t('The 2025 learners', 'Los aprendices de 2025')}
      caption={t(
        'The 2025 learners with their published final parameters. The forest and the boosting model feed a linear meta-learner, which the source fitted without cross-validation; the support-vector arms stand alone, in the two parameterisations two sources published.',
        'Los aprendices de 2025 con sus parámetros finales publicados. El bosque y el modelo boosting alimentan un meta-aprendiz lineal, que la fuente ajustó sin validación cruzada; los brazos de vectores de soporte van solos, en las dos parametrizaciones que publicaron dos fuentes.',
      )}
      notes={[
        t(
          'Trained on in-sample predictions, the meta-learner gives the boosting learner almost all the weight, because that learner reproduces its training rows almost exactly. The stacked model then behaves like its boosting learner under every protocol.',
          'Entrenado sobre predicciones en muestra, el meta-aprendiz le da casi todo el peso al aprendiz boosting, porque ese aprendiz reproduce sus filas de entrenamiento casi exactamente. El modelo apilado se comporta entonces como su aprendiz boosting bajo todo protocolo.',
        ),
      ]}
    >
      {(m) => (
        <>
          {boxes.map((b, i) => <BoxEl key={i} box={b} />)}
          {bases.map((b, i) => (
            <Arrow key={i} from={edge(scale, 'right', 0.3 + i * 0.2)} to={[b.x - 2, b.y + b.h / 2]} marker={m} />
          ))}
          <Arrow from={edge(bases[0], 'right')} to={[meta.x - 2, meta.y + meta.h * 0.35]} marker={m} />
          <Arrow from={edge(bases[1], 'right')} to={[meta.x - 2, meta.y + meta.h * 0.7]} marker={m} />
          <Arrow from={edge(meta, 'right')} to={[weights.x - 2, meta.y + meta.h / 2]} marker={m} />
        </>
      )}
    </Figure>
  );
}

/** The three protocols, with the median scores passed in from the benchmark artifact. */
export function ProtocolDiagram({ scores }: { scores?: { random?: number | null; dedup?: number | null; site?: number | null; arm?: string } }) {
  const t = useT();
  const f = (v?: number | null) => (v === undefined || v === null ? '...' : num(v, 3));
  const rows = column(232, 250, 14, 16, [
    { title: t('Random 80/20, 100 draws', 'Aleatorio 80/20, 100 sorteos'), tone: 'bad', lines: [t('duplicates and sites cross', 'duplicados y sitios cruzan')] },
    { title: t('Deduplicated, 100 draws', 'Deduplicado, 100 sorteos'), tone: 'warn', lines: [t('duplicates removed; sites cross', 'sin duplicados; sitios cruzan')] },
    { title: t('Leave one site out', 'Dejar un sitio fuera'), tone: 'good', lines: [t('ten folds, a whole campaign each', 'diez pliegues, una campaña cada uno')] },
  ]);
  const values = [scores?.random, scores?.dedup, scores?.site];
  const results = rows.map((r, i) =>
    place({ x: 522, y: r.y, w: 170, title: f(values[i]), lines: [i < 2 ? t('median draw', 'sorteo mediano') : t('pooled, all blasts', 'agrupado, todos')] }),
  );
  // Each result box is placed beside its protocol row; equalise heights to the taller of the two.
  const corpus = centred({ x: 12, w: 180, title: t('97 rows', '97 filas'), lines: [t('10 sites', '10 sitios'), t('17 duplicated vectors', '17 vectores repetidos'), t('largest site: 22 rows', 'mayor sitio: 22 filas')] }, bottomOf(rows) / 2 + 7);
  const gap = centred({ x: 730, w: 158, tone: 'bad', title: t('The drop', 'La caída'), lines: [t('random median', 'mediana aleatoria'), t('minus site held out', 'menos sitio excluido')] }, bottomOf(rows) / 2 + 7);
  const boxes = [corpus, ...rows, ...results, gap];
  return (
    <Figure
      height={bottomOf(boxes) + 12}
      label={t('One table, three ways to split it', 'Una tabla, tres formas de partirla')}
      caption={t(
        `One table, three ways to split it. Scores are variance explained for ${scores?.arm ?? t('the stacking ensemble', 'el ensamble apilado')}, read from the committed benchmark. Only the third protocol asks whether a model reaches a mine it has not seen.`,
        `Una tabla, tres formas de partirla. Los puntajes son varianza explicada para ${scores?.arm ?? 'el ensamble apilado'}, leídos del benchmark comprometido. Solo el tercer protocolo pregunta si un modelo llega a una mina que no ha visto.`,
      )}
    >
      {(m) => (
        <>
          {boxes.map((b, i) => <BoxEl key={i} box={b} />)}
          {rows.map((r, i) => (
            <g key={i}>
              <Arrow from={edge(corpus, 'right', 0.25 + i * 0.25)} to={[r.x - 2, r.y + r.h / 2]} marker={m} />
              <Arrow from={edge(r, 'right')} to={[results[i].x - 2, r.y + r.h / 2]} marker={m} />
            </g>
          ))}
          <Arrow from={edge(results[0], 'right')} to={[gap.x - 2, gap.y + gap.h * 0.3]} marker={m} />
          <Arrow from={edge(results[2], 'right')} to={[gap.x - 2, gap.y + gap.h * 0.7]} marker={m} />
        </>
      )}
    </Figure>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* Implementation                                                                                */
/* ------------------------------------------------------------------------------------------- */

export function ArchitectureDiagram() {
  const t = useT();
  const offline = column(12, 250, 30, 12, [
    { title: t('Engine package (PyPI)', 'Paquete motor (PyPI)'), tone: 'accent', lines: [t('every model, the corpora,', 'todo modelo, los corpus,'), t('protocols, metrics, export', 'protocolos, métricas, exportación')] },
    { title: t('Staged bake (this repo)', 'Horneado por etapas (este repo)'), lines: [t('ingest to validate,', 'de ingesta a validación,'), t('pinned versions, seed', 'versiones fijadas, semilla')] },
  ]);
  const artifacts = column(312, 250, 30, 12, [
    { title: t('16 case artifacts', '16 artefactos de caso'), lines: [t('predictions, refusals, curves', 'predicciones, negativas, curvas')] },
    { title: t('Benchmark artifact', 'Artefacto de benchmark'), lines: [t('100 draws, two supports,', '100 sorteos, dos soportes,'), t('site intervals, per site', 'intervalos por sitio')] },
    { title: t('11 model files', '11 archivos de modelos'), tone: 'warn', lines: [t('fitted arms per training scope', 'brazos ajustados por alcance')] },
  ]);
  const browser = column(612, 276, 30, 12, [
    { title: t('Replay', 'Reproducción'), lines: [t('reads the committed files', 'lee los archivos comprometidos')] },
    { title: t('Live: closed forms', 'Vivo: formas cerradas'), tone: 'good', lines: [t('TypeScript, parity-tested', 'TypeScript, con prueba de paridad')] },
    { title: t('Live: fitted models', 'Vivo: modelos ajustados'), tone: 'good', lines: [t('tree walks and networks,', 'recorrido de árboles y redes,'), t('exact against the fit', 'exacto frente al ajuste')] },
  ]);
  const boxes = [...offline, ...artifacts, ...browser];
  return (
    <Figure
      height={bottomOf(boxes) + 12}
      label={t('Where each thing runs', 'Dónde corre cada cosa')}
      caption={t(
        'Left, offline: the engine and the bake that runs it against pinned versions. Middle, the committed artifacts, each content-addressed. Right, the browser: it replays the artifacts and recomputes two lanes live, both held to the baked numbers by tests.',
        'A la izquierda, sin conexión: el motor y el horneado que lo corre con versiones fijadas. Al centro, los artefactos comprometidos, cada uno direccionado por contenido. A la derecha, el navegador: reproduce los artefactos y recalcula dos carriles en vivo, ambos atados a los números horneados por pruebas.',
      )}
      notes={[
        t(
          'The deploy copies the committed artifacts to static hosting and checks their digests; it never trains, never re-bakes and never recomputes a benchmark.',
          'El despliegue copia los artefactos comprometidos al hospedaje estático y verifica sus resúmenes; nunca entrena, nunca vuelve a hornear y nunca recalcula un benchmark.',
        ),
      ]}
    >
      {(m) => (
        <>
          {boxes.map((b, i) => <BoxEl key={i} box={b} />)}
          <Label x={12} y={20} tone="fg" size={11.5}>{t('offline', 'sin conexión')}</Label>
          <Label x={312} y={20} tone="fg" size={11.5}>{t('committed', 'comprometido')}</Label>
          <Label x={612} y={20} tone="fg" size={11.5}>{t('browser', 'navegador')}</Label>
          <Arrow from={edge(offline[0], 'bottom')} to={[offline[1].x + offline[1].w / 2, offline[1].y - 2]} marker={m} />
          {artifacts.map((a, i) => (
            <Arrow key={i} from={edge(offline[1], 'right', 0.3 + i * 0.2)} to={[a.x - 2, a.y + a.h / 2]} marker={m} />
          ))}
          <Arrow from={edge(artifacts[0], 'right')} to={[browser[0].x - 2, browser[0].y + browser[0].h / 2]} marker={m} />
          <Arrow from={edge(artifacts[1], 'right')} to={[browser[0].x - 2, browser[0].y + browser[0].h * 0.8]} marker={m} />
          <Arrow from={edge(artifacts[2], 'right')} to={[browser[2].x - 2, browser[2].y + browser[2].h / 2]} marker={m} />
        </>
      )}
    </Figure>
  );
}

export function PipelineDiagram() {
  const t = useT();
  const steps: [string, string, string][] = [
    ['ingest', t('contract 1', 'contrato 1'), t('integrity gate', 'compuerta de integridad')],
    ['preprocess', t('geometry', 'geometría'), t('rock factor', 'factor de roca')],
    ['split', t('3 protocols', '3 protocolos'), t('leakage guards', 'guardas de fuga')],
    ['features', t('7 ratios', '7 razones'), t('+ absolutes', '+ absolutos')],
    ['train', t('site withheld', 'sitio retenido'), t('per case', 'por caso')],
    ['infer', t('every arm', 'todo brazo'), t('value or reason', 'valor o razón')],
    ['evaluate', t('both statistics', 'ambos estadísticos'), t('null beside it', 'nulo al lado')],
    ['export', t('content-addressed', 'por contenido'), t('models per scope', 'modelos por alcance')],
    ['validate', t('re-read, re-hash', 'releer, rehashear'), t('fail on a hole', 'fallar ante un hueco')],
  ];
  const w = 160;
  const gapX = 18;
  const perRow = 5;
  const placed = steps.map(([title, a, b], i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    // Second row runs right to left, so the path is one continuous snake.
    const x = row === 0 ? 12 + col * (w + gapX) : 12 + (perRow - 1 - col) * (w + gapX);
    return place({ x, y: 14 + row * 100, w, title, lines: [a, b], tone: i === steps.length - 1 ? 'good' : 'neutral' });
  });
  return (
    <Figure
      height={bottomOf(placed) + 12}
      label={t('The offline pipeline', 'La tubería sin conexión')}
      caption={t(
        'Nine stages, each with a test that would fail if it did nothing. The bake is a deliberate, versioned operation; the deploy only copies what it wrote.',
        'Nueve etapas, cada una con una prueba que fallaría si no hiciera nada. El horneado es una operación deliberada y versionada; el despliegue solo copia lo que escribió.',
      )}
      notes={[
        t(
          'Tests write into a temporary directory and are compared with the committed files; a test that could overwrite the committed artifacts could make itself pass.',
          'Las pruebas escriben en un directorio temporal y se comparan con los archivos comprometidos; una prueba que pudiera sobrescribir los artefactos comprometidos podría aprobarse a sí misma.',
        ),
      ]}
    >
      {(m) => (
        <>
          {placed.map((b, i) => <BoxEl key={i} box={b} />)}
          {placed.slice(0, -1).map((b, i) => {
            const next = placed[i + 1];
            if (i === perRow - 1) {
              return <Arrow key={i} from={edge(b, 'bottom')} to={[next.x + next.w / 2, next.y - 2]} marker={m} />;
            }
            const forward = next.x > b.x;
            return (
              <Arrow
                key={i}
                from={edge(b, forward ? 'right' : 'left')}
                to={[forward ? next.x - 2 : next.x + next.w + 2, next.y + next.h / 2]}
                marker={m}
              />
            );
          })}
        </>
      )}
    </Figure>
  );
}

export function ContractsDiagram() {
  const t = useT();
  const c1 = place({ x: 12, y: 14, w: 260, tone: 'warn', title: t('Contract 1, what gets in', 'Contrato 1, qué entra'), lines: [t('reject: not a blast', 'rechazar: no es un tiro'), t('flag: outside the envelope', 'marcar: fuera de la envolvente'), t('never clip a value', 'nunca recortar un valor')] });
  const gate = place({ x: 320, y: 14, w: 260, tone: 'good', title: t('Integrity gate', 'Compuerta de integridad'), lines: [t("the paper's own summary", 'la tabla resumen del'), t('table, reproduced', 'propio artículo, reproducida'), t('+ a pinned content digest', '+ un resumen fijado')] });
  const c2 = place({ x: 628, y: 14, w: 260, tone: 'accent', title: t('Contract 2, what goes out', 'Contrato 2, qué sale'), lines: [t('content-addressed files', 'archivos por contenido'), t('typed mirror in the browser', 'espejo tipado en el navegador'), t('fails the build on drift', 'falla la compilación si deriva')] });
  const boxes = [c1, gate, c2];
  return (
    <Figure
      height={bottomOf(boxes) + 12}
      label={t('The two data contracts', 'Los dos contratos de datos')}
      caption={t(
        'One contract decides what is admitted, the other what is shipped and how the browser can trust it. Between them, a gate that checks the data against the paper it came from.',
        'Un contrato decide qué se admite, el otro qué se envía y cómo puede confiar en ello el navegador. Entre ambos, una compuerta que comprueba los datos contra el artículo del que vienen.',
      )}
      notes={[
        t(
          'The gate exists because the corpus as first assembled disagreed with the published tables in five cells, two of them on the measured size; the tell was a powder-factor maximum of 1.47 against the 1.26 the paper prints in its own summary table.',
          'La compuerta existe porque el corpus, tal como se ensambló primero, discrepaba de las tablas publicadas en cinco celdas, dos sobre el tamaño medido; la señal fue un máximo de factor de carga de 1,47 frente al 1,26 que el artículo imprime en su propia tabla resumen.',
        ),
      ]}
    >
      {(m) => (
        <>
          {boxes.map((b, i) => <BoxEl key={i} box={b} />)}
          <Arrow from={edge(c1, 'right')} to={[gate.x - 2, gate.y + gate.h / 2]} marker={m} />
          <Arrow from={edge(gate, 'right')} to={[c2.x - 2, c2.y + c2.h / 2]} marker={m} />
        </>
      )}
    </Figure>
  );
}

export function LeakageDiagram() {
  const t = useT();
  const corpus = place({ x: 12, y: 40, w: 200, tone: 'good', title: t('Corpus minus the site', 'Corpus menos el sitio'), lines: [t('e.g. 90 of 97 rows', 'p. ej. 90 de 97 filas'), t('asserted at bake time', 'comprobado al hornear')] });
  const fit = place({ x: 250, y: 40, w: 200, title: t('Fit every fitted arm', 'Ajustar todo brazo'), lines: [t('network, kernels, trees,', 'red, núcleos, árboles,'), t('refit, transfer line', 'reajuste, recta')] });
  const outs = column(490, 190, 14, 12, [
    { title: t('Case predictions', 'Predicciones del caso'), tone: 'accent', lines: [t('the site never seen', 'el sitio nunca visto')] },
    { title: t('Model file', 'Archivo de modelos'), tone: 'warn', lines: [t('scope = that site', 'alcance = ese sitio')] },
  ]);
  const ui = centred({ x: 720, w: 168, title: t('App, live', 'App, en vivo'), lines: [t('same models as', 'mismos modelos que'), t('the replay', 'la reproducción')] }, bottomOf(outs) / 2 + 7);
  const boxes = [corpus, fit, ...outs, ui];
  return (
    <Figure
      height={bottomOf(boxes) + 12}
      label={t('How a case withholds its own campaign', 'Cómo un caso retiene su propia campaña')}
      caption={t(
        'For each real campaign, every fitted arm is trained on the corpus without that campaign; the predictions the App replays and the models it runs live both come from that fit.',
        'Para cada campaña real, todo brazo ajustado se entrena con el corpus sin esa campaña; las predicciones que la App reproduce y los modelos que corre en vivo salen ambos de ese ajuste.',
      )}
      notes={[
        t(
          'The bake fails if any blast of the case appears in the rows its models were fitted on. A model fitted on a campaign and then shown predicting it would be recalling, not predicting.',
          'El horneado falla si algún tiro del caso aparece en las filas con que se ajustaron sus modelos. Un modelo ajustado sobre una campaña y luego mostrado prediciéndola estaría recordando, no prediciendo.',
        ),
      ]}
    >
      {(m) => (
        <>
          {boxes.map((b, i) => <BoxEl key={i} box={b} />)}
          <Arrow from={edge(corpus, 'right')} to={[fit.x - 2, fit.y + fit.h / 2]} marker={m} />
          <Arrow from={edge(fit, 'right', 0.35)} to={[outs[0].x - 2, outs[0].y + outs[0].h / 2]} marker={m} />
          <Arrow from={edge(fit, 'right', 0.65)} to={[outs[1].x - 2, outs[1].y + outs[1].h / 2]} marker={m} />
          <Arrow from={edge(outs[1], 'right')} to={[ui.x - 2, ui.y + ui.h * 0.7]} marker={m} />
          <Arrow from={edge(outs[0], 'right')} to={[ui.x - 2, ui.y + ui.h * 0.3]} marker={m} dashed />
        </>
      )}
    </Figure>
  );
}

export function ReconstructionDiagram() {
  const t = useT();
  const inputs = column(12, 210, 14, 12, [
    { title: t('Seven ratios', 'Siete razones'), lines: ['S/B, H/B, B/D, T/B, Pf'] },
    { title: t('Hole diameter D', 'Diámetro D'), tone: 'warn', lines: [t('from the source prose,', 'de la prosa de la fuente,'), t('8 of 10 sites', '8 de 10 sitios')] },
  ]);
  const pattern = centred({ x: 262, w: 200, tone: 'accent', title: t('Pattern in metres', 'Malla en metros'), lines: ['B = (B/D)·D', 'S, H, T from ratios', 'V = B·S·H, Q = Pf·V'] }, bottomOf(inputs) / 2 + 7);
  const checks = column(502, 386, 14, 12, [
    { title: t('Checked against the prose', 'Comprobada contra la prosa'), tone: 'good', lines: [t('15 stated constraints, 9 sites,', '15 restricciones declaradas, 9 sitios,'), t('all satisfied', 'todas satisfechas')] },
    { title: t('Cannot be reconstructed', 'No reconstruible'), tone: 'bad', lines: [t('Miami: no diameter stated,', 'Miami: sin diámetro declarado,'), t('6 blasts, classical arms abstain', '6 tiros, los brazos clásicos se abstienen')] },
  ]);
  const boxes = [...inputs, pattern, ...checks];
  return (
    <Figure
      height={bottomOf(boxes) + 12}
      label={t('Recovering the absolute pattern', 'Recuperar la malla absoluta')}
      caption={t(
        'A diameter closes the system: from it and the tabulated ratios, every dimension of the pattern follows. A ninth site has no stated diameter but a stated bench height, and inverting it returns the same 91.2 mm on all six of its rows.',
        'Un diámetro cierra el sistema: con él y las razones tabuladas se obtiene cada dimensión de la malla. Un noveno sitio no declara diámetro pero sí altura de banco, e invertirla devuelve los mismos 91,2 mm en sus seis filas.',
      )}
    >
      {(m) => (
        <>
          {boxes.map((b, i) => <BoxEl key={i} box={b} />)}
          <Arrow from={edge(inputs[0], 'right')} to={[pattern.x - 2, pattern.y + pattern.h * 0.35]} marker={m} />
          <Arrow from={edge(inputs[1], 'right')} to={[pattern.x - 2, pattern.y + pattern.h * 0.65]} marker={m} />
          <Arrow from={edge(pattern, 'right', 0.35)} to={[checks[0].x - 2, checks[0].y + checks[0].h / 2]} marker={m} />
          <Arrow from={edge(pattern, 'right', 0.65)} to={[checks[1].x - 2, checks[1].y + checks[1].h / 2]} marker={m} dashed />
        </>
      )}
    </Figure>
  );
}

export function PortableModelDiagram() {
  const t = useT();
  const fitted = place({ x: 12, y: 30, w: 200, title: t('Fitted arm (Python)', 'Brazo ajustado (Python)'), lines: ['numpy, scikit-learn,', 'xgboost'] });
  const json = place({ x: 252, y: 30, w: 240, tone: 'accent', title: t('Portable JSON', 'JSON portátil'), lines: [t('weights, support vectors,', 'pesos, vectores de soporte,'), t('trees as four flat arrays', 'árboles como cuatro arreglos')] });
  const walker = place({ x: 532, y: 30, w: 200, tone: 'good', title: t('Walker (TypeScript)', 'Recorrido (TypeScript)'), lines: [t('inputs rounded to 32 bits', 'entradas redondeadas a 32 bits'), t('boosting summed in 32 bits', 'boosting sumado en 32 bits')] });
  const fixtures = place({ x: 772, y: 30, w: 116, tone: 'warn', title: t('Fixtures', 'Fijaciones'), lines: [t('116 blasts,', '116 tiros,'), t('every arm', 'todo brazo')] });
  const boxes = [fitted, json, walker, fixtures];
  return (
    <Figure
      height={bottomOf(boxes) + 12}
      label={t('Running a fitted model in a browser', 'Correr un modelo ajustado en el navegador')}
      caption={t(
        'The fitted learned arms leave Python as plain JSON and are walked in TypeScript. Each model file carries the original model’s predictions at all 116 shipped blasts, and a test holds the walker to them.',
        'Los brazos aprendidos ajustados salen de Python como JSON plano y se recorren en TypeScript. Cada archivo de modelos lleva las predicciones del modelo original en los 116 tiros publicados, y una prueba ata el recorrido a ellas.',
      )}
      notes={[
        t(
          'Agreement is exact for the forest, boosting and stacked models and within 1e-12 relative for the network and the kernels, which is why a learned number that moves when you drag a slider is the fitted model’s number and not an approximation of it.',
          'La coincidencia es exacta para el bosque, el boosting y el apilado, y dentro de 1e-12 relativo para la red y los núcleos; por eso un número aprendido que se mueve al arrastrar un control es el del modelo ajustado y no una aproximación.',
        ),
      ]}
    >
      {(m) => (
        <>
          {boxes.map((b, i) => <BoxEl key={i} box={b} />)}
          <Arrow from={edge(fitted, 'right')} to={[json.x - 2, json.y + json.h / 2]} marker={m} />
          <Arrow from={edge(json, 'right')} to={[walker.x - 2, walker.y + walker.h / 2]} marker={m} />
          <Arrow from={edge(fixtures, 'left')} to={[walker.x + walker.w + 2, walker.y + walker.h / 2]} marker={m} dashed />
        </>
      )}
    </Figure>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* Experiments                                                                                   */
/* ------------------------------------------------------------------------------------------- */

/**
 * The leakage-safe protocol, beside the practices it rules out.
 *
 * The ruled-out boxes are marked by colour and by their column heading. They used to be struck
 * through with two diagonal lines, which crossed their own text: a line over text is an overlay too,
 * even though the figure measurement, which compares text with text, could not see it.
 */
export function SafeProtocolDiagram() {
  const t = useT();
  const bad = column(12, 420, 40, 12, [
    { title: t('Random rows to test', 'Filas al azar a prueba'), tone: 'bad', lines: [t('a test row shares its campaign, rock,', 'una fila de prueba comparte campaña, roca,'), t('rig and measurement with training rows', 'equipo y medición con filas de entrenamiento')], prose: true },
    { title: t('Tune on the test set, report it', 'Ajustar en prueba e informarla'), tone: 'bad', lines: [t('choosing a setting because the test score', 'elegir un ajuste porque el puntaje de prueba'), t('improved makes that score a training score', 'mejoró lo vuelve un puntaje de entrenamiento')], prose: true },
  ]);
  const good = column(468, 420, 40, 12, [
    { title: t('Hold out a whole campaign', 'Retener una campaña entera'), tone: 'good', lines: [t('every fitted quantity, including scaling and', 'toda magnitud ajustada, incluidas la escala y'), t('the rock-factor line, from the other nine sites', 'la recta del factor de roca, de los otros nueve')], prose: true },
    { title: t('Report the interval', 'Informar el intervalo'), tone: 'good', lines: [t('resample sites, not rows, and say when', 'remuestrear sitios, no filas, y decir cuándo'), t('two arms cannot be told apart', 'dos brazos no se distinguen')], prose: true },
  ]);
  const boxes = [...bad, ...good];
  return (
    <Figure
      height={bottomOf(boxes) + 12}
      label={t('The protocol, and what it rules out', 'El protocolo, y lo que descarta')}
      caption={t(
        'Left, in red: the two practices behind a random-split headline on a clustered corpus. Right: what this product does instead. Random splits are still run, a hundred times, so the size of the difference is measured rather than argued.',
        'A la izquierda, en rojo: las dos prácticas detrás de un titular de partición aleatoria sobre un corpus agrupado. A la derecha: lo que hace este producto en su lugar. Las particiones aleatorias se corren igual, cien veces, para medir el tamaño de la diferencia en vez de discutirlo.',
      )}
    >
      {() => (
        <>
          <Label x={12} y={24} tone="bad" size={11.5}>{t('ruled out', 'descartado')}</Label>
          <Label x={468} y={24} tone="good" size={11.5}>{t('what is done', 'lo que se hace')}</Label>
          {boxes.map((b, i) => <BoxEl key={i} box={b} />)}
        </>
      )}
    </Figure>
  );
}

/** Why the verdict depends on the row set: the two supports, with the scores passed in. */
export function SupportsDiagram({ all, geometry }: { all?: { n: number; best: number | null; arm: string } | null; geometry?: { n: number; best: number | null; arm: string } | null }) {
  const t = useT();
  const f = (v?: number | null) => (v === undefined || v === null ? '...' : num(v, 3));
  const a = place({ x: 12, y: 14, w: 420, tone: 'bad', title: t(`All ${all?.n ?? 97} blasts`, `Los ${all?.n ?? 97} tiros`), lines: [t(`best learned: ${all?.arm ?? '...'} ${f(all?.best)}`, `mejor aprendido: ${all?.arm ?? '...'} ${f(all?.best)}`), t('includes Miami: smallest fragments,', 'incluye Miami: fragmentos más finos,'), t('no geometry, classical arms abstain', 'sin geometría, los clásicos se abstienen')] });
  const g = place({ x: 468, y: 14, w: 420, tone: 'good', title: t(`The ${geometry?.n ?? 91} with geometry`, `Los ${geometry?.n ?? 91} con geometría`), lines: [t(`best learned: ${geometry?.arm ?? '...'} ${f(geometry?.best)}`, `mejor aprendido: ${geometry?.arm ?? '...'} ${f(geometry?.best)}`), t('the rows every arm can answer,', 'las filas que todo brazo responde,'), t('so arms are compared like for like', 'así se comparan en igualdad')] });
  const boxes = [a, g];
  return (
    <Figure
      height={bottomOf(boxes) + 12}
      label={t('Two row sets', 'Dos conjuntos de filas')}
      caption={t(
        'The same out-of-fold predictions scored on two row sets. The declared criterion asks for a positive score at least 0.10 above the null; whether the learned tier meets it turns on the six Miami blasts.',
        'Las mismas predicciones fuera de pliegue puntuadas sobre dos conjuntos de filas. El criterio declarado pide un puntaje positivo y al menos 0,10 sobre el nulo; que el nivel aprendido lo cumpla depende de los seis tiros de Miami.',
      )}
    >
      {() => <>{boxes.map((b, i) => <BoxEl key={i} box={b} />)}</>}
    </Figure>
  );
}

