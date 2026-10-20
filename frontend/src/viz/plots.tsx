/**
 * The product's charts, as data-to-props adapters on the shell's `UPlotChart` (BL-042, shell 0.17.0).
 *
 * Until 0.09.000 the product drew its size distributions and its lines with a uPlot wrapper of its own
 * (`viz/Charts.tsx`), because the shell's chart had no log x axis, no parity form, no reference lines and no points
 * on an x of their own. It has all four now, and this file imports no uPlot: it maps the product's series, markers
 * and wording onto the shell chart's props, and declares on the chart's host what was drawn, which the browser gate
 * reads (`data-chart`, `data-chart-*`), because pixels cannot tell an empty canvas from one that never mounted.
 *
 * Two charts so far: the parity plot and the lines of the documentation pages and of the all-models view.
 */

import { useShellLang, type BiText, type FormatOptions } from '@fasl-work/caos-app-shell';
import { type ChartSeries, UPlotChart } from '@fasl-work/caos-app-shell/chart';
import { useEffect, useRef } from 'react';

import { num } from '../lib/format';

/** The product's series colours, in the order its charts have always drawn them (the shell's own rotation differs). */
export const SERIES_COLOURS = ['--color-accent', '--color-good', '--color-warn', '--color-bad', '--color-accent-2', '--color-magenta'] as const;

type Colour = (typeof SERIES_COLOURS)[number];

/** A series past the palette repeats a colour, so it is drawn dashed. */
function styleOf(index: number, dashed?: boolean): { color: Colour; dash?: number[] } {
  return { color: SERIES_COLOURS[index % SERIES_COLOURS.length], dash: dashed || index >= SERIES_COLOURS.length ? [6, 4] : undefined };
}

const bi = (s: string): BiText => ({ en: s, es: s });

/** A chart says what it drew, on the element that holds it (the browser gate reads `data-chart` and `data-chart-*`). */
function declare(node: HTMLElement | null, chart: string, drawn: Record<string, number>) {
  if (!node) return;
  node.setAttribute('data-chart', chart);
  for (const [key, count] of Object.entries(drawn)) node.setAttribute(`data-chart-${key}`, String(count));
}

/** The hint under an idle chart, in both languages (the shell's default says "hover the chart"). */
const HINTS = {
  line: { en: 'Move the pointer across the chart to read values', es: 'Mueva el puntero por el gráfico para leer los valores' },
  // One line under the plot, cut with an ellipsis where it does not fit: 62 characters fit the Predict card at 1280 px.
  parity: { en: 'Point at a blast for its error and site; click to select it.', es: 'Apunte a un tiro: su error y su sitio; clic para elegirlo.' },
  // where a click selects nothing (the documentation pages), the hint does not promise it
  parityRead: { en: 'Point at a blast for its error and site.', es: 'Apunte a un tiro: su error y su sitio.' },
} as const;

const AXES = {
  measured: { en: 'measured', es: 'medido' },
  predicted: { en: 'predicted', es: 'predicho' },
  nullModel: { en: 'null model', es: 'modelo nulo' },
} as const;

/** The box of a chart: the card the product has always drawn it in, filling its stage or at the height asked for. */
function Box({ fill, children, host }: { fill: boolean; children: React.ReactNode; host: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={host} className="fr-chart" style={fill ? { height: '100%', minHeight: 0 } : undefined}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* Parity                                                                                         */
/* ------------------------------------------------------------------------------------------- */

export interface ParityPoint {
  blastId: string;
  site: string;
  measuredM: number;
  predictedM: number;
  extrapolated?: boolean;
}

export interface ParityProps {
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
 * Predicted against measured, on equal axes, with the identity line: the shell's `UPlotChart` in its parity form
 * (one shared range in a square box, the null model as a reference line, the selected blast as a larger point of its
 * own colour, the blast under the pointer found in the plane).
 */
export function ParityPlot({ points, nullMeanM, height = 320, onSelect, selected, fill = false }: ParityProps) {
  const lang = useShellLang();
  const host = useRef<HTMLDivElement | null>(null);
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
    declare(host.current, 'parity', { points: points.length, selected: at >= 0 ? 1 : 0, 'null-line': nullMeanM === undefined || nullMeanM === null ? 0 : 1 });
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
    <div ref={host} className={fill ? 'fr-chart fr-parity fill' : 'fr-chart fr-parity'}>
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
/* Lines                                                                                          */
/* ------------------------------------------------------------------------------------------- */

export interface LineSpec {
  id: string;
  /** Already in the interface language. */
  label: string;
  values: (number | null)[];
  dashed?: boolean;
  width?: number;
}

export interface LinesProps {
  x: number[];
  series: LineSpec[];
  xLabel: string;
  yLabel: string;
  height?: number;
  /** How the x ticks and the y ticks are written (the shell's `FormatOptions`; significant digits by default). */
  xFormat?: FormatOptions;
  yFormat?: FormatOptions;
  /** An x value as the readout names it (a design's id, a protocol); a number with three decimals by default. */
  xText?: (x: number) => string;
  /** A y value as the readout writes it. */
  valueText?: (v: number) => string;
  yRange?: [number, number];
  /** A reference line at zero. */
  zeroLine?: boolean;
}

/** Lines against one x: the response curves, the sorted draws, the slope charts and the all-models view. */
export function Lines({ x, series, xLabel, yLabel, height = 260, xFormat, yFormat, xText, valueText, yRange, zeroLine = false }: LinesProps) {
  const host = useRef<HTMLDivElement | null>(null);
  const drawn = series.filter((s) => s.values.some((v) => v !== null && v !== undefined)).length;
  useEffect(() => {
    // A series of all-nulls draws nothing while still counting as a series, so count the ones that put a value on it.
    declare(host.current, 'line', { series: series.length, points: x.length, 'series-with-values': drawn });
  }, [series.length, x.length, drawn]);
  const fmt = valueText ?? ((v: number) => num(v, 3));
  const readout = (i: number) =>
    [xText ? xText(x[i]) : num(x[i], 3), ...series.map((s) => `${s.label} ${s.values[i] === null || s.values[i] === undefined ? '-' : fmt(s.values[i] as number)}`)].join(' · ');
  if (x.length === 0) return <div ref={host} className="fr-chart" style={{ minHeight: height }} />;
  return (
    <Box fill={false} host={host}>
      <UPlotChart
        height={height}
        x={{ values: x, label: bi(xLabel), format: xFormat }}
        y={{ label: bi(yLabel), range: yRange, format: yFormat }}
        series={series.map((s, i) => ({ label: bi(s.label), values: s.values, width: s.width, ...styleOf(i, s.dashed) }))}
        yMarks={zeroLine ? [{ y: 0, label: bi(''), tone: 'neutral' as const }] : undefined}
        readout={readout}
        hint={HINTS.line}
      />
    </Box>
  );
}
