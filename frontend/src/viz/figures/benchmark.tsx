/**
 * The Benchmark page's own figure: one hand-authored, theme-aware horizontal bar drawing in a viewBox, every label inside
 * the drawing and in the language of the page, the caption outside the SVG in the shell's `Figure`. The page feeds it
 * rows read from the committed benchmark: the campaigns of the corpus, the published models on their hold-out. The browser
 * gate measures the text overprint of every figure on every documentation sub-tab.
 */

import { Figure, fitLabel } from '@fasl-work/caos-app-shell';
import type { ReactNode } from 'react';

const FG = 'var(--color-fg, #222)';
const MUTED = 'var(--color-fg-subtle, #8892a4)';
const BORDER = 'var(--color-border, rgba(128,128,128,0.3))';
const ACCENT = 'var(--color-accent, #4f8ef7)';
const GOOD = 'var(--color-good, #3aa675)';
const BAD = 'var(--color-bad, #cc4b4b)';

const W = 900;
const LABEL_W = 250;
const BAR_L = 262;
const BAR_R = 690;
const ROW_H = 30;
const TOP = 10;
const FONT = 11.5;

const TONE = { accent: ACCENT, good: GOOD, bad: BAD, muted: MUTED } as const;

export interface BarRow {
  id: string;
  label: string;
  value: number;
  /** What the row reads out to the right of its bar, already formatted for the language. */
  text: string;
  tone?: keyof typeof TONE;
}

/**
 * Horizontal bars on a linear axis. The label column is fixed on the left and the readout of each row sits in a column to the
 * right of the plot, past the last grid line, so no text meets a bar or a grid line; a row below zero extends left of the
 * zero line.
 */
export function BarsFigure({
  rows,
  domain,
  ticks,
  tickText,
  caption,
  ariaLabel,
  axisLabel,
}: {
  rows: BarRow[];
  domain: [number, number];
  ticks: number[];
  tickText: (value: number) => string;
  caption: ReactNode;
  ariaLabel: string;
  axisLabel: string;
}) {
  const x = (v: number) => BAR_L + ((Math.min(Math.max(v, domain[0]), domain[1]) - domain[0]) / (domain[1] - domain[0])) * (BAR_R - BAR_L);
  const zero = x(0);
  const bottom = TOP + rows.length * ROW_H;
  const total = bottom + 44;
  return (
    <Figure caption={caption}>
      <svg viewBox={`0 0 ${W} ${total}`} role="img" aria-label={ariaLabel} className="fr-svg" data-figure="">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={x(tick)} y1={TOP - 4} x2={x(tick)} y2={bottom} stroke={BORDER} strokeDasharray={tick === 0 ? undefined : '2 4'} />
            <text x={x(tick)} y={bottom + 16} fill={MUTED} fontSize={11} textAnchor="middle">
              {tickText(tick)}
            </text>
          </g>
        ))}
        <line x1={zero} y1={TOP - 4} x2={zero} y2={bottom} stroke={FG} strokeWidth={1.2} />
        {rows.map((row, i) => {
          const cy = TOP + i * ROW_H + ROW_H / 2;
          const end = x(row.value);
          const fit = fitLabel(row.label, LABEL_W - 12, FONT, 1);
          return (
            <g key={row.id} data-row={row.id}>
              <text x={LABEL_W} y={cy + 4} fill={FG} fontSize={FONT} textAnchor="end">
                {fit.shortened ? <title>{row.label}</title> : null}
                {fit.lines[0]}
              </text>
              <rect x={Math.min(zero, end)} y={cy - 8} width={Math.max(2, Math.abs(end - zero))} height={16} fill={TONE[row.tone ?? 'accent']} opacity={0.8} rx={2} />
              <text x={BAR_R + 14} y={cy + 4} fill={MUTED} fontSize={FONT}>
                {row.text}
              </text>
            </g>
          );
        })}
        <text x={(BAR_L + BAR_R) / 2} y={bottom + 36} fill={MUTED} fontSize={11} textAnchor="middle">
          {axisLabel}
        </text>
      </svg>
    </Figure>
  );
}
