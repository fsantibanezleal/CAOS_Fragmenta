/**
 * The interactive charts. Every one reads out values at the cursor and reacts to the case selector.
 *
 * uPlot rather than an SVG chart library: these curves carry 241 points each with up to six series
 * overlaid, and the readout has to follow the pointer without a re-render per frame.
 *
 * Colours come from the shell's CSS custom properties, resolved at draw time rather than baked, so
 * a theme change repaints correctly. A hard-coded hex here is a chart that is invisible in one theme
 * and nobody notices until a screenshot.
 */

import { useShellLang } from '@fasl-work/caos-app-shell';
import { type ChartSeries, UPlotChart } from '@fasl-work/caos-app-shell/chart';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { notAvailable, num } from '../lib/format';

/** Read a CSS custom property off the document, with a fallback that is never a bare colour. */
function token(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export const SERIES_COLOURS = [
  '--color-accent',
  '--color-good',
  '--color-warn',
  '--color-bad',
  '--color-accent-2',
  '--color-magenta',
] as const;

function palette(): string[] {
  const fallbacks = ['#58a6ff', '#3fb950', '#d29922', '#f85149', '#3fb1c8', '#f778ba'];
  return SERIES_COLOURS.map((name, i) => token(name, fallbacks[i]));
}

/** A series past the palette repeats a colour, so it is drawn dashed; a colour given explicitly is not repeated. */
function isDashed(s: { dashed?: boolean; colour?: string }, i: number): boolean {
  return Boolean(s.dashed) || (!s.colour && i >= SERIES_COLOURS.length);
}

/** The swatch of a series in a key or a readout: its colour, dashed as its line is. */
function swatch(s: { dashed?: boolean; colour?: string }, i: number): string {
  const colour = s.colour ?? palette()[i % palette().length];
  return isDashed(s, i) ? `repeating-linear-gradient(90deg, ${colour} 0 4px, transparent 4px 7px)` : colour;
}

/** Re-resolve tokens whenever the theme attribute flips, so a repaint follows the toggle. */
function useThemeEpoch(): number {
  const [epoch, setEpoch] = useState(0);
  useEffect(() => {
    const observer = new MutationObserver(() => setEpoch((e) => e + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });
    return () => observer.disconnect();
  }, []);
  return epoch;
}

/** Fill the parent box, and report the size, so a chart never renders at zero width. */
function useBox<T extends HTMLElement>(): [React.RefObject<T | null>, { w: number; h: number }] {
  const ref = useRef<T | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observe = new ResizeObserver(() => {
      const rect = element.getBoundingClientRect();
      setBox({ w: Math.max(120, Math.floor(rect.width)), h: Math.max(120, Math.floor(rect.height)) });
    });
    observe.observe(element);
    return () => observe.disconnect();
  }, []);
  return [ref, box];
}

export interface SeriesSpec {
  id: string;
  label: string;
  values: (number | null)[];
  colour?: string;
  dashed?: boolean;
  width?: number;
}

/* ------------------------------------------------------------------------------------------- */
/* The size distribution                                                                        */
/* ------------------------------------------------------------------------------------------- */

export interface DistributionChartProps {
  sizesM: number[];
  series: SeriesSpec[];
  /** Draggable percentile markers, as fractions. */
  markers?: { fraction: number; label: string }[];
  measured?: { sizeM: number; passing: number }[];
  /** Vertical size markers, such as the in-situ block, where the cap reads mass above it as unbroken blocks. */
  sizeMarkers?: { sizeM: number; label: string }[];
  height?: number;
}

/**
 * Cumulative percent passing against size, on a log-x axis.
 *
 * Settled against a bar histogram, which hides both tails, and against linear axes, which compress
 * the fines branch into nothing. The tails are the entire reason the three-parameter form exists.
 */
// The hint under an idle chart. All three were hardcoded English, so a Spanish reader was told in
// English how to read the only interactive element on the page.
const HINTS = {
  line: {
    en: 'Move the pointer across the chart to read values',
    es: 'Mueva el puntero por el gráfico para leer los valores',
  },
  curve: {
    en: 'Move the pointer over the curve to read values',
    es: 'Mueva el puntero sobre la curva para leer los valores',
  },
  // One line under the plot, cut with an ellipsis where it does not fit: 62 characters fit the Predict card at
  // 1280 px, and the part before the semicolon fits a phone.
  parity: {
    en: 'Point at a blast for its error and site; click to select it.',
    es: 'Apunte a un tiro: su error y su sitio; clic para elegirlo.',
  },
  // where a click selects nothing (the documentation pages), the hint does not promise it
  parityRead: {
    en: 'Point at a blast for its error and site.',
    es: 'Apunte a un tiro: su error y su sitio.',
  },
} as const;

// Drawn INTO the canvas, so they are not reached by any of the usual i18n. They were English on a
// Spanish page for exactly that reason: text painted on a canvas is invisible to a translation pass
// that reads JSX.
const AXES = {
  measured: { en: 'measured', es: 'medido' },
  predicted: { en: 'predicted', es: 'predicho' },
  nullModel: { en: 'null model', es: 'modelo nulo' },
} as const;

/**
 * A chart says what it actually drew, on the element itself.
 *
 * A browser gate that samples pixels can pass on the wrong thing: a canvas full of background is
 * still a canvas, and a chart that silently rendered zero series looks the same as one that never
 * mounted. So the renderer declares its own result and the gate reads the declaration. The
 * BenchView3D already does this with data-bench-holes; these are the same idea for the 2D charts.
 */
function declare(node: HTMLElement | null, chart: string, drawn: Record<string, number>) {
  if (!node) return;
  node.setAttribute('data-chart', chart);
  for (const [key, value] of Object.entries(drawn)) {
    node.setAttribute(`data-chart-${key}`, String(value));
  }
}

export function DistributionChart({
  sizesM,
  series,
  markers = [],
  measured = [],
  sizeMarkers = [],
  height = 320,
}: DistributionChartProps) {
  const [ref, box] = useBox<HTMLDivElement>();
  const plotRef = useRef<uPlot | null>(null);
  const epoch = useThemeEpoch();
  const lang = useShellLang();
  const [readout, setReadout] = useState<{ size: number; values: (number | null)[] } | null>(null);

  useEffect(() => {
    if (!ref.current || box.w < 120) return;
    const colours = palette();
    const grid = token('--color-border', 'rgba(128,128,128,0.25)');
    const text = token('--color-fg', '#222');

    const data: uPlot.AlignedData = [
      sizesM,
      ...series.map((s) => s.values.map((v) => (v === null ? null : v * 100))),
    ] as uPlot.AlignedData;

    const options: uPlot.Options = {
      width: box.w,
      height: Math.max(180, box.h || height),
      padding: [8, 12, 4, 4],
      cursor: {
        drag: { x: true, y: false, setScale: false },
        points: { size: 6 },
      },
      scales: {
        x: { distr: 3, time: false },
        y: { range: [0, 100] },
      },
      axes: [
        {
          stroke: text,
          grid: { stroke: grid, width: 1 },
          ticks: { stroke: grid },
          // uPlot passes null for the ticks of a log axis it leaves unlabelled (all but the decades). Until
          // 0.07.000 each null was formatted, as "0mm", so the axis of every distribution read
          // "0mm0mm0mm" on top of itself, on the live site too; a null tick now gets no label.
          values: (_u, ticks) => {
            const labels = ticks.map((t) => {
              if (t === null || t === undefined || !Number.isFinite(t) || t <= 0) return '';
              const decade = Math.log10(t);
              if (Math.abs(decade - Math.round(decade)) > 1e-6) return '';
              if (t < 0.001) return `${num(t * 1000, 1)} mm`;
              if (t < 0.1) return `${num(t * 1000, 0)} mm`;
              if (t < 1) return `${num(t * 100, 0)} cm`;
              return `${num(t, 0)} m`;
            });
            // Declared for the browser gate: a label that repeats the one before it is a broken axis.
            const shown = labels.filter((l) => l !== '');
            const repeats = shown.filter((l, i) => i > 0 && l === shown[i - 1]).length;
            ref.current?.setAttribute('data-ticks-repeat', String(repeats));
            ref.current?.setAttribute('data-ticks-labelled', String(shown.length));
            return labels;
          },
          // Painted on the canvas, so no translation pass reaches it: the language is chosen here.
          label: lang === 'es' ? 'tamaño de fragmento' : 'fragment size',
          labelSize: 22,
        },
        {
          stroke: text,
          grid: { stroke: grid, width: 1 },
          ticks: { stroke: grid },
          label: lang === 'es' ? 'porcentaje pasante' : 'percent passing',
          labelSize: 26,
        },
      ],
      series: [
        {},
        ...series.map((s, i) => ({
          label: s.label,
          stroke: s.colour ?? colours[i % colours.length],
          width: s.width ?? 2,
          dash: s.dashed ? [6, 4] : undefined,
          spanGaps: false,
        })),
      ],
      hooks: {
        setCursor: [
          (u) => {
            const idx = u.cursor.idx;
            if (idx === null || idx === undefined) {
              setReadout(null);
              return;
            }
            setReadout({
              size: sizesM[idx],
              values: series.map((s) => s.values[idx] ?? null),
            });
          },
        ],
        draw: [
          (u) => {
            const ctx = u.ctx;
            ctx.save();
            // uPlot leaves the context right-aligned after its y axis, and until 0.07.000 every label here ended
            // where it was meant to start: the size labels sat a label's width left of their lines, and on a
            // phone ran out past the axis. The alignment is set, not inherited.
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            const surface = token('--color-surface', '#ffffff');
            // A label in the card's colour first, so a grid or marker line under it does not cross out its letters.
            const label = (text: string, x: number, y: number, colour: string) => {
              ctx.lineWidth = 3;
              ctx.lineJoin = 'round';
              ctx.strokeStyle = surface;
              ctx.strokeText(text, x, y);
              ctx.fillStyle = colour;
              ctx.fillText(text, x, y);
            };
            // Percentile markers, labelled with what they are rather than left as bare lines.
            for (const marker of markers) {
              const y = u.valToPos(marker.fraction * 100, 'y', true);
              ctx.strokeStyle = token('--color-fg-subtle', '#8892a4');
              ctx.setLineDash([3, 3]);
              ctx.beginPath();
              ctx.moveTo(u.bbox.left, y);
              ctx.lineTo(u.bbox.left + u.bbox.width, y);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.font = '11px ui-monospace, monospace';
              label(marker.label, u.bbox.left + 6, y - 4, token('--color-fg-subtle', '#8892a4'));
            }
            // Size markers: a vertical line at a size, labelled at the top of the plot, left of its line. Two
            // markers close on the log axis (a 60 cm target beside a 100 cm limit) printed their labels on one
            // another, so a label that would touch one already placed takes the next row down.
            const placed: { row: number; x0: number; x1: number }[] = [];
            const ordered = sizeMarkers
              .map((marker) => ({ marker, x: u.valToPos(marker.sizeM, 'x', true) }))
              .filter(({ x }) => Number.isFinite(x) && x >= u.bbox.left && x <= u.bbox.left + u.bbox.width)
              .sort((a, b) => a.x - b.x);
            ctx.font = '11px ui-monospace, monospace';
            for (const { marker, x } of ordered) {
              ctx.strokeStyle = token('--color-warn', '#b7791f');
              ctx.setLineDash([5, 4]);
              ctx.beginPath();
              ctx.moveTo(x, u.bbox.top);
              ctx.lineTo(x, u.bbox.top + u.bbox.height);
              ctx.stroke();
              ctx.setLineDash([]);
              const width = ctx.measureText(marker.label).width;
              // Left of the line where it fits inside the plot, else right of it, else against the plot's edge.
              const leftOf = x - width - 6;
              const rightOf = x + 6;
              const x0 =
                leftOf >= u.bbox.left + 4
                  ? leftOf
                  : rightOf + width <= u.bbox.left + u.bbox.width - 4
                    ? rightOf
                    : Math.max(u.bbox.left + 4, u.bbox.left + u.bbox.width - 4 - width);
              const x1 = x0 + width;
              const taken = (row: number) => placed.some((q) => q.row === row && x0 < q.x1 + 8 && x1 > q.x0 - 8);
              const row = [...Array(placed.length + 1).keys()].find((r) => !taken(r)) ?? placed.length;
              placed.push({ row, x0, x1 });
              label(marker.label, x0, u.bbox.top + 14 + row * 14, token('--color-warn', '#b7791f'));
            }
            // Measured points, if this case has any.
            for (const point of measured) {
              const x = u.valToPos(point.sizeM, 'x', true);
              const y = u.valToPos(point.passing * 100, 'y', true);
              ctx.fillStyle = token('--color-bad', '#cc4b4b');
              ctx.beginPath();
              ctx.arc(x, y, 4, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          },
        ],
      },
      legend: { show: false },
    };

    plotRef.current?.destroy();
    plotRef.current = new uPlot(options, data, ref.current);
    declare(ref.current, 'distribution', {
      series: series.length,
      points: sizesM.length,
      markers: markers.length,
      measured: measured.length,
      size_markers: sizeMarkers.length,
    });
    return () => {
      plotRef.current?.destroy();
      plotRef.current = null;
    };
  }, [ref, box.w, box.h, sizesM, series, markers, measured, sizeMarkers, height, epoch, lang]);

  return (
    <div className="fr-chart">
      <div ref={ref} className="fr-chart-canvas" style={{ minHeight: height }} />
      <div className="fr-readout" role="status" aria-live="polite">
        {readout ? (
          <>
            <span className="fr-readout-key">
              {readout.size < 0.1
                ? `${num(readout.size * 1000, 1)} mm`
                : `${num(readout.size * 100, 1)} cm`}
            </span>
            {series.map((s, i) => (
              <span key={s.id} className="fr-readout-item">
                <i style={{ background: swatch(s, i) }} />
                {s.label}
                <b>
                  {readout.values[i] === null || readout.values[i] === undefined
                    ? notAvailable()
                    : `${num((readout.values[i] as number) * 100, 1)}%`}
                </b>
              </span>
            ))}
          </>
        ) : (
          <>
            {/* At rest the row is the chart's key: which curve is which, before the pointer asks. */}
            {series.length > 1
              ? series.map((s, i) => (
                  <span key={s.id} className="fr-readout-item">
                    <i style={{ background: swatch(s, i) }} />
                    {s.label}
                  </span>
                ))
              : null}
            <span className="fr-readout-hint" title={HINTS.curve[lang] ?? HINTS.curve.en}>{HINTS.curve[lang] ?? HINTS.curve.en}</span>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* Parity                                                                                        */
/* ------------------------------------------------------------------------------------------- */

export interface ParityPoint {
  blastId: string;
  site: string;
  measuredM: number;
  predictedM: number;
  extrapolated?: boolean;
}

export interface ParityChartProps {
  points: ParityPoint[];
  /** The null model's level, drawn so that "better than a constant" is visible rather than argued. */
  nullMeanM?: number;
  height?: number;
  onSelect?: (blastId: string) => void;
  selected?: string | null;
  /** Take the height the container gives instead of the `height` floor. ADR-0071 rule 8. */
  fill?: boolean;
}

/**
 * Predicted against measured, on equal axes, with the identity line.
 *
 * Settled against a bar chart of scores per model, which hides which blast fails and by how much,
 * and that is the only thing an engineer can act on.
 *
 * Drawn by the shell's `UPlotChart` in its parity form (0.10.0): one shared range in a square box, the
 * null model as a reference line, the selected blast as a larger point of its own colour, the blast
 * under the pointer found in the plane. Until 0.07.000 this was a canvas of the product's own, whose
 * axes carried two labels ("0" and the top of the range) and no grid.
 */
export function ParityChart({
  points,
  nullMeanM,
  height = 320,
  onSelect,
  selected,
  fill = false,
}: ParityChartProps) {
  const lang = useShellLang();
  const ref = useRef<HTMLDivElement | null>(null);
  const es = lang === 'es';
  const at = selected ? points.findIndex((p) => p.blastId === selected) : -1;
  const cm = (m: number) => m * 100;
  const inside = points.map((p, i) => (i === at || p.extrapolated ? null : cm(p.predictedM)));
  const outside = points.map((p, i) => (i !== at && p.extrapolated ? cm(p.predictedM) : null));
  const chosen = points.map((p, i) => (i === at ? cm(p.predictedM) : null));
  const series: ChartSeries[] = [
    { label: { en: 'Blasts', es: 'Tiros' }, values: inside, mode: 'points' },
    ...(outside.some((v) => v !== null)
      ? [{ label: { en: 'Outside the training range', es: 'Fuera del rango de entrenamiento' }, values: outside, mode: 'points' as const, color: '--color-warn' as const }]
      : []),
    ...(at >= 0
      ? [{ label: { en: 'The selected blast', es: 'El tiro elegido' }, values: chosen, mode: 'points' as const, size: 14, color: '--color-magenta' as const }]
      : []),
  ];

  useEffect(() => {
    declare(ref.current, 'parity', {
      points: points.length,
      selected: at >= 0 ? 1 : 0,
      'null-line': nullMeanM === undefined || nullMeanM === null ? 0 : 1,
    });
  }, [points.length, at, nullMeanM]);

  const readout = (i: number) => {
    const p = points[i];
    const err = cm(p.predictedM - p.measuredM);
    const rel = ((p.predictedM - p.measuredM) / p.measuredM) * 100;
    const sign = err >= 0 ? '+' : '';
    const outsideNote = p.extrapolated ? (es ? '; extrapolado' : '; extrapolated') : '';
    // The error first: the readout is one line, cut with an ellipsis in a narrow card, and the sizes it would lose
    // are the ones the axes already show.
    return es
      ? `${p.blastId}, ${p.site}: error ${sign}${num(err, 1)} cm (${sign}${num(rel, 0)} %); medido ${num(cm(p.measuredM), 1)} cm, predicho ${num(cm(p.predictedM), 1)} cm${outsideNote}`
      : `${p.blastId}, ${p.site}: error ${sign}${num(err, 1)} cm (${sign}${num(rel, 0)} %); measured ${num(cm(p.measuredM), 1)} cm, predicted ${num(cm(p.predictedM), 1)} cm${outsideNote}`;
  };

  return (
    <div ref={ref} className={fill ? 'fr-chart fr-parity fill' : 'fr-chart fr-parity'}>
      <UPlotChart
        parity
        height={fill ? 'fill' : height}
        x={{ values: points.map((p) => cm(p.measuredM)), label: AXES.measured, unit: 'cm', format: { decimals: 0 } }}
        y={{ label: AXES.predicted, unit: 'cm', format: { decimals: 0 } }}
        series={series}
        yMarks={nullMeanM === undefined || nullMeanM === null ? undefined : [{ y: cm(nullMeanM), label: AXES.nullModel }]}
        readout={readout}
        hint={onSelect ? HINTS.parity : HINTS.parityRead}
        onPick={onSelect ? (i) => onSelect(points[i].blastId) : undefined}
      />
    </div>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* A generic line chart, for response curves and slope charts                                    */
/* ------------------------------------------------------------------------------------------- */

export interface LineChartProps {
  x: number[];
  series: SeriesSpec[];
  xLabel: string;
  yLabel: string;
  height?: number;
  logX?: boolean;
  xTickFormat?: (value: number) => string;
  yTickFormat?: (value: number) => string;
  valueFormat?: (value: number) => string;
  yRange?: [number, number];
  zeroLine?: boolean;
  /** Exact x positions to tick. Without this uPlot picks its own and a categorical axis repeats. */
  xTicks?: number[];
  /** Widen the x scale past the data, so an end tick's label is not clipped by the plot edge. */
  xRange?: [number, number];
  /** Show a legend that can solo a series. Necessary past about four lines. */
  legend?: boolean;
}

export function LineChart({
  x,
  series,
  xLabel,
  yLabel,
  height = 260,
  logX = false,
  xTickFormat,
  yTickFormat,
  valueFormat,
  yRange,
  zeroLine = false,
  xTicks,
  xRange,
  legend = false,
}: LineChartProps) {
  // Click a legend entry to solo it, click again to release. With a dozen lines crossing each other
  // the readout alone is not enough: the reader needs to be able to isolate one and follow it.
  const [solo, setSolo] = useState<string | null>(null);
  const [ref, box] = useBox<HTMLDivElement>();
  const plotRef = useRef<uPlot | null>(null);
  const epoch = useThemeEpoch();
  const lang = useShellLang();
  const [readout, setReadout] = useState<{ x: number; values: (number | null)[] } | null>(null);

  useEffect(() => {
    if (!ref.current || box.w < 120 || x.length === 0) return;
    const colours = palette();
    const grid = token('--color-border', 'rgba(128,128,128,0.25)');
    const text = token('--color-fg', '#222');

    const options: uPlot.Options = {
      width: box.w,
      height: Math.max(160, box.h || height),
      padding: [8, 12, 4, 4],
      cursor: { drag: { x: false, y: false }, points: { size: 6 } },
      scales: {
        x: { distr: logX ? 3 : 1, time: false, ...(xRange ? { range: xRange } : {}) },
        y: yRange ? { range: yRange } : {},
      },
      axes: [
        {
          stroke: text,
          grid: { stroke: grid, width: 1 },
          ticks: { stroke: grid },
          label: xLabel,
          labelSize: 22,
          values: xTickFormat ? (_u, ticks) => ticks.map(xTickFormat) : undefined,
          // Pinned, when given. On a categorical axis uPlot otherwise fills the range with ticks
          // and every one of them rounds to the same label, so the axis reads as the same word
          // printed twenty times.
          ...(xTicks ? { splits: () => xTicks } : {}),
        },
        {
          stroke: text,
          grid: { stroke: grid, width: 1 },
          ticks: { stroke: grid },
          label: yLabel,
          labelSize: 30,
          values: yTickFormat ? (_u, ticks) => ticks.map(yTickFormat) : undefined,
        },
      ],
      series: [
        {},
        ...series.map((s, i) => ({
          label: s.label,
          stroke: s.colour ?? colours[i % colours.length],
          width: solo && solo !== s.id ? 1 : (s.width ?? 2),
          // A soloed chart DIMS the rest rather than hiding them, so the reader keeps the context
          // of where the chosen line sits among the others.
          alpha: solo && solo !== s.id ? 0.12 : 1,
          dash: isDashed(s, i) ? [6, 4] : undefined,
          points: { show: x.length < 40, size: 5 },
          spanGaps: false,
        })),
      ],
      // The key is OMITTED when there is no zero line, never set to undefined.
      //
      // uPlot copies whatever keys it finds on opts.hooks straight onto its own hook table, so
      // `draw: undefined` leaves a `draw` key holding undefined, and the next `fire('draw')` calls
      // `.forEach` on it. That throws out of the render and takes the whole route to a blank page,
      // which is exactly what it did on the Experiments route and on two workbench tabs. A ternary
      // that yields undefined looks like "no hook" and is not.
      hooks: {
        setCursor: [
          (u) => {
            const idx = u.cursor.idx;
            if (idx === null || idx === undefined) {
              setReadout(null);
              return;
            }
            setReadout({ x: x[idx], values: series.map((s) => s.values[idx] ?? null) });
          },
        ],
        ...(zeroLine
          ? {
              draw: [
                (u: uPlot) => {
                  const y = u.valToPos(0, 'y', true);
                  u.ctx.save();
                  u.ctx.strokeStyle = token('--color-fg-subtle', '#8892a4');
                  u.ctx.setLineDash([4, 4]);
                  u.ctx.beginPath();
                  u.ctx.moveTo(u.bbox.left, y);
                  u.ctx.lineTo(u.bbox.left + u.bbox.width, y);
                  u.ctx.stroke();
                  u.ctx.restore();
                },
              ],
            }
          : {}),
      },
      legend: { show: false },
    };

    plotRef.current?.destroy();
    plotRef.current = new uPlot(options, [x, ...series.map((s) => s.values)] as uPlot.AlignedData, ref.current);
    declare(ref.current, 'line', {
      series: series.length,
      points: x.length,
      // A series of all-nulls draws nothing while still counting as a series, so count the ones
      // that actually put a value on the canvas.
      'series-with-values': series.filter((one) => one.values.some((v) => v !== null && v !== undefined)).length,
    });
    return () => {
      plotRef.current?.destroy();
      plotRef.current = null;
    };
  }, [
    ref,
    box.w,
    box.h,
    x,
    series,
    xLabel,
    yLabel,
    height,
    logX,
    solo,
    xTicks,
    xRange,
    xTickFormat,
    yTickFormat,
    yRange,
    zeroLine,
    epoch,
  ]);

  const fmt = valueFormat ?? ((v: number) => num(v, 3));

  return (
    <div className="fr-chart">
      <div ref={ref} className="fr-chart-canvas" style={{ minHeight: height }} />
      {legend ? (
        <div className="fr-legend">
          {series.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`fr-legend-item${solo === s.id ? ' fr-legend-solo' : ''}`}
              aria-pressed={solo === s.id}
              onClick={() => setSolo(solo === s.id ? null : s.id)}
            >
              <i style={{ background: swatch(s, i) }} />
              {s.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="fr-readout" role="status" aria-live="polite">
        {readout ? (
          <>
            <span className="fr-readout-key">
              {xTickFormat ? xTickFormat(readout.x) : num(readout.x, 3)}
            </span>
            {series.map((s, i) => (
              <span key={s.id} className="fr-readout-item">
                <i style={{ background: swatch(s, i) }} />
                {s.label}
                <b>{readout.values[i] === null || readout.values[i] === undefined ? notAvailable() : fmt(readout.values[i] as number)}</b>
              </span>
            ))}
          </>
        ) : (
          <span className="fr-readout-hint" title={HINTS.line[lang] ?? HINTS.line.en}>{HINTS.line[lang] ?? HINTS.line.en}</span>
        )}
      </div>
    </div>
  );
}
