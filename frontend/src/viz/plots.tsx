/**
 * The product's charts, as data-to-props adapters on the shell's `UPlotChart` (BL-042, shell 0.17.0).
 *
 * Until 0.09.000 the product drew its size distributions and its lines with a uPlot wrapper of its own
 * (`viz/Charts.tsx`), because the shell's chart had no log x axis, no parity form, no reference lines and no points
 * on an x of their own. It has all four now, and this file imports no uPlot: it maps the product's series, markers
 * and wording onto the shell chart's props, and declares on the chart's host what was drawn, which the browser gate
 * reads (`data-chart`, `data-chart-*`), because pixels cannot tell an empty canvas from one that never mounted.
 *
 */

import { type BiText, type FormatOptions } from '@fasl-work/caos-app-shell';
import { UPlotChart } from '@fasl-work/caos-app-shell/chart';
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
