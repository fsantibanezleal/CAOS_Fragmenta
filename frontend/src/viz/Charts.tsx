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
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

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
  parity: {
    en: 'Hover a point for its blast, its error and its site. Click to select it.',
    es: 'Pase el puntero por un punto para ver su tiro, su error y su sitio. Haga clic para seleccionarlo.',
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
          values: (_u, ticks) =>
            ticks.map((t) => (t < 0.1 ? `${(t * 1000).toFixed(0)}mm` : `${(t * 100).toFixed(0)}cm`)),
          label: 'fragment size',
          labelSize: 22,
        },
        {
          stroke: text,
          grid: { stroke: grid, width: 1 },
          ticks: { stroke: grid },
          label: 'percent passing',
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
              ctx.fillStyle = token('--color-fg-subtle', '#8892a4');
              ctx.font = '11px ui-monospace, monospace';
              ctx.fillText(marker.label, u.bbox.left + 6, y - 4);
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
    });
    return () => {
      plotRef.current?.destroy();
      plotRef.current = null;
    };
  }, [ref, box.w, box.h, sizesM, series, markers, measured, height, epoch]);

  return (
    <div className="fr-chart">
      <div ref={ref} className="fr-chart-canvas" style={{ minHeight: height }} />
      <div className="fr-readout" role="status" aria-live="polite">
        {readout ? (
          <>
            <span className="fr-readout-key">
              {readout.size < 0.1
                ? `${(readout.size * 1000).toFixed(1)} mm`
                : `${(readout.size * 100).toFixed(1)} cm`}
            </span>
            {series.map((s, i) => (
              <span key={s.id} className="fr-readout-item">
                <i style={{ background: s.colour ?? palette()[i % palette().length] }} />
                {s.label}
                <b>
                  {readout.values[i] === null || readout.values[i] === undefined
                    ? 'n/a'
                    : `${((readout.values[i] as number) * 100).toFixed(1)}%`}
                </b>
              </span>
            ))}
          </>
        ) : (
          <span className="fr-readout-hint">{HINTS.curve[lang] ?? HINTS.curve.en}</span>
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
 * Drawn on a plain canvas rather than through uPlot: this is a scatter with per-point interaction
 * and an aspect ratio that has to stay square for the identity line to mean anything.
 */
export function ParityChart({
  points,
  nullMeanM,
  height = 320,
  onSelect,
  selected,
  fill = false,
}: ParityChartProps) {
  const [ref, box] = useBox<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const epoch = useThemeEpoch();
  const lang = useShellLang();
  const [hover, setHover] = useState<ParityPoint | null>(null);

  // Square, because a parity plot with unequal scales puts the identity line at an angle the eye
  // reads as bias. So the side is the SMALLER of the two container dimensions, and when the caller
  // asks it to fill, the height comes from the container rather than from the `height` floor.
  const size = Math.max(180, Math.min(box.w, fill ? box.h : box.h || height));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size < 120 || points.length === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const pad = 42;
    const values = points.flatMap((p) => [p.measuredM, p.predictedM]);
    const hi = Math.max(...values, nullMeanM ?? 0) * 1.1;
    const lo = 0;
    const toX = (v: number) => pad + ((v - lo) / (hi - lo)) * (size - pad - 10);
    const toY = (v: number) => size - pad - ((v - lo) / (hi - lo)) * (size - pad - 10);

    const grid = token('--color-border', 'rgba(128,128,128,0.25)');
    const text = token('--color-fg', '#222');
    const muted = token('--color-fg-subtle', '#8892a4');

    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.strokeRect(pad, 10, size - pad - 10, size - pad - 10);

    // The identity line. Without it a parity plot is just a scatter.
    ctx.strokeStyle = muted;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(toX(lo), toY(lo));
    ctx.lineTo(toX(hi), toY(hi));
    ctx.stroke();
    ctx.setLineDash([]);

    // The null model: a horizontal line at the constant it predicts.
    if (nullMeanM !== undefined) {
      ctx.strokeStyle = token('--color-warn', '#d19a2b');
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(toX(lo), toY(nullMeanM));
      ctx.lineTo(toX(hi), toY(nullMeanM));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = token('--color-warn', '#d19a2b');
      ctx.font = '10px ui-monospace, monospace';
      const nullLabel = AXES.nullModel[lang] ?? AXES.nullModel.en;
      ctx.fillText(nullLabel, toX(hi) - ctx.measureText(nullLabel).width - 6, toY(nullMeanM) - 4);
    }

    for (const point of points) {
      const x = toX(point.measuredM);
      const y = toY(point.predictedM);
      const isSelected = point.blastId === selected;
      ctx.beginPath();
      ctx.arc(x, y, isSelected ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = point.extrapolated
        ? token('--color-warn', '#d19a2b')
        : token('--color-accent', '#4f8ef7');
      ctx.globalAlpha = isSelected ? 1 : 0.8;
      ctx.fill();
      ctx.globalAlpha = 1;
      if (isSelected) {
        ctx.strokeStyle = text;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    ctx.fillStyle = text;
    ctx.font = '11px ui-monospace, monospace';
    const measuredLabel = AXES.measured[lang] ?? AXES.measured.en;
    ctx.fillText(measuredLabel, size / 2 - ctx.measureText(measuredLabel).width / 2, size - 8);
    ctx.save();
    ctx.translate(12, size / 2 + 24);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(AXES.predicted[lang] ?? AXES.predicted.en, 0, 0);
    ctx.restore();
    ctx.fillText(`${(hi * 100).toFixed(0)}cm`, 6, 18);
    ctx.fillText('0', pad - 10, size - pad + 14);
    declare(ref.current, 'parity', {
      points: points.length,
      selected: selected ? 1 : 0,
      'null-line': nullMeanM === undefined || nullMeanM === null ? 0 : 1,
    });
  }, [ref, points, size, nullMeanM, selected, epoch, lang]);

  const pick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const pad = 42;
    const values = points.flatMap((p) => [p.measuredM, p.predictedM]);
    const hi = Math.max(...values, nullMeanM ?? 0) * 1.1;
    const toX = (v: number) => pad + (v / hi) * (size - pad - 10);
    const toY = (v: number) => size - pad - (v / hi) * (size - pad - 10);
    let best: ParityPoint | null = null;
    let bestDistance = 14;
    for (const point of points) {
      const d = Math.hypot(toX(point.measuredM) - mx, toY(point.predictedM) - my);
      if (d < bestDistance) {
        bestDistance = d;
        best = point;
      }
    }
    return best;
  };

  return (
    <div className="fr-chart">
      {/* In fill mode the measured host is taken OUT of flow, inside a box whose height comes only
          from the flex column above it. Any arrangement where the host is in flow makes the size
          self-referential: the chart reads the host to choose a side, the canvas then sets that
          side as the host's height, and the number never moves off whatever it started at. */}
      <div className={fill ? 'fr-chart-fillbox' : undefined}>
      <div
        ref={ref}
        className="fr-chart-canvas fr-parity"
        style={fill ? undefined : { minHeight: height }}
      >
        <canvas
          ref={canvasRef}
          onMouseMove={(e) => setHover(pick(e))}
          onMouseLeave={() => setHover(null)}
          onClick={(e) => {
            const point = pick(e);
            if (point && onSelect) onSelect(point.blastId);
          }}
        />
      </div>
      </div>
      <div className="fr-readout" role="status" aria-live="polite">
        {hover ? (
          <>
            <span className="fr-readout-key">{hover.blastId}</span>
            <span className="fr-readout-item">
              {hover.site}
              <b>
                measured {(hover.measuredM * 100).toFixed(1)} cm, predicted{' '}
                {(hover.predictedM * 100).toFixed(1)} cm
              </b>
            </span>
            <span className="fr-readout-item">
              error
              <b>
                {hover.predictedM >= hover.measuredM ? '+' : ''}
                {((hover.predictedM - hover.measuredM) * 100).toFixed(1)} cm (
                {(((hover.predictedM - hover.measuredM) / hover.measuredM) * 100).toFixed(0)}%)
              </b>
            </span>
            {hover.extrapolated ? <span className="fr-badge fr-badge-warn">extrapolated</span> : null}
          </>
        ) : (
          <span className="fr-readout-hint">{HINTS.parity[lang] ?? HINTS.parity.en}</span>
        )}
      </div>
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
          dash: s.dashed ? [6, 4] : undefined,
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

  const fmt = valueFormat ?? ((v: number) => v.toFixed(3));

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
              <i style={{ background: s.colour ?? palette()[i % palette().length] }} />
              {s.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="fr-readout" role="status" aria-live="polite">
        {readout ? (
          <>
            <span className="fr-readout-key">
              {xTickFormat ? xTickFormat(readout.x) : readout.x.toFixed(3)}
            </span>
            {series.map((s, i) => (
              <span key={s.id} className="fr-readout-item">
                <i style={{ background: s.colour ?? palette()[i % palette().length] }} />
                {s.label}
                <b>{readout.values[i] === null || readout.values[i] === undefined ? 'n/a' : fmt(readout.values[i] as number)}</b>
              </span>
            ))}
          </>
        ) : (
          <span className="fr-readout-hint">{HINTS.line[lang] ?? HINTS.line.en}</span>
        )}
      </div>
    </div>
  );
}
