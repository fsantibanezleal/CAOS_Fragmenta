/**
 * Charts for the evidence pages: every arm with its spread, the draws of one protocol, the design
 * response over a plane, and tables that colour a value against its reference.
 *
 * Readouts follow the pointer but are written UNDER the drawing, in a readout line, never on top of
 * it; labels live in reserved margins. That is the same rule the diagrams follow: no text sits on a
 * mark it does not belong to.
 */

import { useShellLang } from '@fasl-work/caos-app-shell';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import {
  kuznetsovX50M,
  patternFromRatios,
  percentile,
  rosinRammler,
  sieveGrid,
  uniformityIndex,
  type LiveBlast,
} from '../engine/live';

const FG = 'var(--color-fg, #222)';
const MUTED = 'var(--color-fg-subtle, #8892a4)';
const BORDER = 'var(--color-border, rgba(128,128,128,0.3))';
const ACCENT = 'var(--color-accent, #4f8ef7)';
const WARN = 'var(--color-warn, #d19a2b)';
const GOOD = 'var(--color-good, #3aa675)';
const BAD = 'var(--color-bad, #cc4b4b)';

const fmt = (v: number | null | undefined, d = 3) => (v === null || v === undefined || !Number.isFinite(v) ? 'n/a' : v.toFixed(d));

function Readout({ children }: { children: ReactNode }) {
  return (
    <div className="fr-readout" aria-live="polite">
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* Interval chart                                                                                */
/* ------------------------------------------------------------------------------------------- */

export type MarkKind = 'random' | 'dedup' | 'site' | 'site-geometry';

export interface IntervalMark {
  kind: MarkKind;
  value: number | null;
  low?: number | null;
  high?: number | null;
}

export interface IntervalRow {
  id: string;
  label: string;
  note?: string;
  marks: IntervalMark[];
}

const MARK_STYLE: Record<MarkKind, { colour: string; offset: number; shape: 'circle' | 'square' | 'diamond' | 'triangle' }> = {
  random: { colour: ACCENT, offset: -9, shape: 'circle' },
  dedup: { colour: WARN, offset: -3, shape: 'square' },
  site: { colour: BAD, offset: 3, shape: 'diamond' },
  'site-geometry': { colour: GOOD, offset: 9, shape: 'triangle' },
};

export function IntervalChart({
  rows,
  range = [-1.2, 1],
  labels,
}: {
  rows: IntervalRow[];
  range?: [number, number];
  labels: Record<MarkKind, string>;
}) {
  const es = useShellLang() === 'es';
  const [hover, setHover] = useState<string | null>(null);
  const W = 900;
  const L = 270;
  const R = 880;
  const rowH = 34;
  const top = 10;
  const H = top + rows.length * rowH + 34;
  const x = (v: number) => L + ((Math.min(Math.max(v, range[0]), range[1]) - range[0]) / (range[1] - range[0])) * (R - L);
  const ticks = [-1, -0.5, 0, 0.5, 1].filter((t) => t >= range[0] && t <= range[1]);
  const active = rows.find((r) => r.id === hover);
  const shape = (kind: MarkKind, cx: number, cy: number, clipped: boolean) => {
    const s = MARK_STYLE[kind];
    const fill = clipped ? 'none' : s.colour;
    switch (s.shape) {
      case 'circle':
        return <circle cx={cx} cy={cy} r={4.5} fill={fill} stroke={s.colour} strokeWidth={1.5} />;
      case 'square':
        return <rect x={cx - 4} y={cy - 4} width={8} height={8} fill={fill} stroke={s.colour} strokeWidth={1.5} />;
      case 'diamond':
        return <path d={`M${cx},${cy - 5} L${cx + 5},${cy} L${cx},${cy + 5} L${cx - 5},${cy} Z`} fill={fill} stroke={s.colour} strokeWidth={1.5} />;
      default:
        return <path d={`M${cx},${cy - 5} L${cx + 5},${cy + 4} L${cx - 5},${cy + 4} Z`} fill={fill} stroke={s.colour} strokeWidth={1.5} />;
    }
  };
  return (
    <div className="fr-evidence">
      <ul className="fr-legend">
        {(Object.keys(MARK_STYLE) as MarkKind[]).map((kind) => (
          <li key={kind}>
            <svg width="14" height="14" aria-hidden="true">{shape(kind, 7, 7, false)}</svg>
            {labels[kind]}
          </li>
        ))}
        <li className="fr-fine">{es ? 'hueco: más allá del eje, valor exacto en la lectura' : 'hollow: beyond the axis, exact value in the readout'}</li>
      </ul>
      <svg viewBox={`0 0 ${W} ${H}`} className="fr-svg" role="img" aria-label={es ? 'Puntaje de cada brazo por protocolo' : 'Every arm’s score by protocol'} onPointerLeave={() => setHover(null)}>
        <line x1={x(0)} y1={top - 4} x2={x(0)} y2={top + rows.length * rowH} stroke={FG} strokeWidth={1.2} />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} y1={top - 4} x2={x(t)} y2={top + rows.length * rowH} stroke={BORDER} strokeDasharray={t === 0 ? undefined : '2 4'} />
            <text x={x(t)} y={top + rows.length * rowH + 18} fill={MUTED} fontSize={11} textAnchor="middle">{t.toFixed(1)}</text>
          </g>
        ))}
        {rows.map((row, i) => {
          const cy = top + i * rowH + rowH / 2;
          return (
            <g key={row.id} onPointerEnter={() => setHover(row.id)} data-row={row.id}>
              <rect x={0} y={cy - rowH / 2} width={W} height={rowH} fill={hover === row.id ? 'var(--color-accent-soft, rgba(79,142,247,0.08))' : 'transparent'} />
              <text x={L - 12} y={cy + 4} fill={FG} fontSize={11.5} textAnchor="end">{row.label}</text>
              {row.marks.map((mark) => {
                if (mark.value === null || mark.value === undefined) return null;
                const cyy = cy + MARK_STYLE[mark.kind].offset;
                const clipped = mark.value < range[0] || mark.value > range[1];
                return (
                  <g key={mark.kind}>
                    {mark.low !== undefined && mark.low !== null && mark.high !== undefined && mark.high !== null ? (
                      <line x1={x(mark.low)} y1={cyy} x2={x(mark.high)} y2={cyy} stroke={MARK_STYLE[mark.kind].colour} strokeWidth={1.4} opacity={0.75} />
                    ) : null}
                    {shape(mark.kind, x(mark.value), cyy, clipped)}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <Readout>
        {active ? (
          <>
            <b>{active.label}</b>
            {active.marks.map((m) => (
              <span key={m.kind}>
                {' · '}
                {labels[m.kind]}: {fmt(m.value)}
                {m.low !== undefined && m.low !== null ? ` (${fmt(m.low, 2)} ${es ? 'a' : 'to'} ${fmt(m.high, 2)})` : ''}
              </span>
            ))}
            {active.note ? <span className="fr-fine"> · {active.note}</span> : null}
          </>
        ) : (
          <span className="fr-fine">{es ? 'Pase el puntero sobre una fila para leer sus valores.' : 'Point at a row to read its values.'}</span>
        )}
      </Readout>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* Histogram of draws                                                                            */
/* ------------------------------------------------------------------------------------------- */

export function DrawHistogram({
  draws,
  marks,
  range = [-1, 1],
  bin = 0.05,
}: {
  draws: number[];
  marks: { value: number | null | undefined; label: string; colour: 'accent' | 'warn' | 'bad' | 'good' }[];
  range?: [number, number];
  bin?: number;
}) {
  const es = useShellLang() === 'es';
  const [hover, setHover] = useState<number | null>(null);
  const nBins = Math.round((range[1] - range[0]) / bin);
  const counts = useMemo(() => {
    const c = new Array(nBins).fill(0);
    for (const d of draws) {
      const k = Math.min(nBins - 1, Math.max(0, Math.floor((d - range[0]) / bin)));
      c[k] += 1;
    }
    return c;
  }, [draws, nBins, range, bin]);
  const maxCount = Math.max(1, ...counts);
  const W = 900;
  const L = 50;
  const R = 880;
  const T = 12;
  const B = 190;
  const x = (v: number) => L + ((v - range[0]) / (range[1] - range[0])) * (R - L);
  const y = (c: number) => B - (c / maxCount) * (B - T);
  const colour = { accent: ACCENT, warn: WARN, bad: BAD, good: GOOD };
  return (
    <div className="fr-evidence">
      <ul className="fr-legend">
        {marks.map((m) => (
          <li key={m.label}>
            <svg width="16" height="10" aria-hidden="true"><line x1="0" y1="5" x2="16" y2="5" stroke={colour[m.colour]} strokeWidth="2.5" /></svg>
            {m.label}: {fmt(m.value)}
          </li>
        ))}
      </ul>
      <svg viewBox={`0 0 ${W} ${B + 30}`} className="fr-svg" role="img" aria-label={es ? 'Distribución de los sorteos' : 'Distribution of the draws'} onPointerLeave={() => setHover(null)}>
        <line x1={L} y1={B} x2={R} y2={B} stroke={BORDER} />
        {counts.map((c, k) => (
          <rect
            key={k}
            x={x(range[0] + k * bin) + 1}
            y={y(c)}
            width={Math.max(1, x(range[0] + (k + 1) * bin) - x(range[0] + k * bin) - 2)}
            height={B - y(c)}
            fill={hover === k ? ACCENT : MUTED}
            opacity={hover === k ? 0.9 : 0.55}
            onPointerEnter={() => setHover(k)}
          />
        ))}
        {marks.map((m) =>
          m.value === null || m.value === undefined ? null : (
            <line key={m.label} x1={x(Math.min(Math.max(m.value, range[0]), range[1]))} y1={T} x2={x(Math.min(Math.max(m.value, range[0]), range[1]))} y2={B} stroke={colour[m.colour]} strokeWidth={2.5} />
          ),
        )}
        {[-1, -0.5, 0, 0.5, 1].map((t) => (
          <text key={t} x={x(t)} y={B + 18} fill={MUTED} fontSize={11} textAnchor="middle">{t.toFixed(1)}</text>
        ))}
      </svg>
      <Readout>
        {hover !== null ? (
          <>
            {es ? 'Intervalo' : 'Bin'} {fmt(range[0] + hover * bin, 2)} {es ? 'a' : 'to'} {fmt(range[0] + (hover + 1) * bin, 2)}: <b>{counts[hover]}</b> {es ? `de ${draws.length} sorteos` : `of ${draws.length} draws`}
          </>
        ) : (
          <span className="fr-fine">{es ? 'Pase el puntero sobre una barra para leer cuántos sorteos caen en ella.' : 'Point at a bar to read how many draws fall in it.'}</span>
        )}
      </Readout>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* Design response heat map, computed live                                                       */
/* ------------------------------------------------------------------------------------------- */

const CORPUS_CENTRE: LiveBlast = {
  S_over_B: 1.19,
  H_over_B: 3.34,
  B_over_D: 27.35,
  T_over_B: 1.26,
  Pf_kg_m3: 0.53,
  XB_m: 1.1,
  E_GPa: 29.46,
};

/** A perceptually ordered ramp (dark blue to yellow), readable in both themes. */
function ramp(t: number): [number, number, number] {
  const stops: [number, number, number][] = [
    [33, 49, 117],
    [32, 113, 160],
    [36, 162, 139],
    [134, 197, 75],
    [242, 220, 65],
  ];
  const u = Math.min(1, Math.max(0, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(u));
  const w = u - i;
  return [0, 1, 2].map((k) => Math.round(stops[i][k] * (1 - w) + stops[i + 1][k] * w)) as [number, number, number];
}

export function ResponseHeatmap() {
  const es = useShellLang() === 'es';
  const [rockFactor, setRockFactor] = useState(7);
  const [holeMm, setHoleMm] = useState(165);
  const [powder, setPowder] = useState(0.53);
  const [targetCm, setTargetCm] = useState(60);
  const [hover, setHover] = useState<{ bd: number; sb: number; p80: number } | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const NX = 66;
  const NY = 40;
  const BD: [number, number] = [17.98, 39.47];
  const SB: [number, number] = [1.0, 1.75];
  const grid = useMemo(() => sieveGrid(), []);

  const field = useMemo(() => {
    const values: number[][] = [];
    for (let j = 0; j < NY; j += 1) {
      const sb = SB[0] + ((j + 0.5) / NY) * (SB[1] - SB[0]);
      const row: number[] = [];
      for (let i = 0; i < NX; i += 1) {
        const bd = BD[0] + ((i + 0.5) / NX) * (BD[1] - BD[0]);
        const blast = { ...CORPUS_CENTRE, B_over_D: bd, S_over_B: sb, Pf_kg_m3: powder };
        const pattern = patternFromRatios(blast, holeMm);
        const x50 = kuznetsovX50M(pattern, rockFactor);
        const n = uniformityIndex(pattern);
        const p80 = Number.isFinite(x50) && n > 0 ? percentile(rosinRammler(x50, n, grid).passing, grid, 0.8) : NaN;
        row.push(p80);
      }
      values.push(row);
    }
    return values;
  }, [rockFactor, holeMm, powder, grid]);

  const finite = field.flat().filter(Number.isFinite);
  const lo = Math.min(...finite);
  const hi = Math.max(...finite);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    const image = ctx.createImageData(NX, NY);
    for (let j = 0; j < NY; j += 1) {
      for (let i = 0; i < NX; i += 1) {
        const v = field[NY - 1 - j][i];
        const [r, g, b] = Number.isFinite(v) ? ramp((v - lo) / (hi - lo || 1)) : [128, 128, 128];
        const k = (j * NX + i) * 4;
        image.data[k] = r;
        image.data[k + 1] = g;
        image.data[k + 2] = b;
        image.data[k + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }, [field, lo, hi]);

  // Iso-line at the target P80, by marching squares on the cell centres, drawn as SVG segments.
  const segments = useMemo(() => {
    const target = targetCm / 100;
    const out: [number, number, number, number][] = [];
    const px = (i: number) => (i + 0.5) / NX;
    const py = (j: number) => 1 - (j + 0.5) / NY;
    for (let j = 0; j < NY - 1; j += 1) {
      for (let i = 0; i < NX - 1; i += 1) {
        const c = [field[j][i], field[j][i + 1], field[j + 1][i + 1], field[j + 1][i]];
        if (c.some((v) => !Number.isFinite(v))) continue;
        const pts: [number, number][] = [];
        const corners: [number, number][] = [[px(i), py(j)], [px(i + 1), py(j)], [px(i + 1), py(j + 1)], [px(i), py(j + 1)]];
        for (let e = 0; e < 4; e += 1) {
          const a = c[e];
          const b = c[(e + 1) % 4];
          if ((a - target) * (b - target) < 0) {
            const t = (target - a) / (b - a);
            const [ax, ay] = corners[e];
            const [bx, by] = corners[(e + 1) % 4];
            pts.push([ax + t * (bx - ax), ay + t * (by - ay)]);
          }
        }
        if (pts.length >= 2) out.push([pts[0][0], pts[0][1], pts[1][0], pts[1][1]]);
      }
    }
    return out;
  }, [field, targetCm]);

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const u = (event.clientX - rect.left) / rect.width;
    const v = 1 - (event.clientY - rect.top) / rect.height;
    const i = Math.min(NX - 1, Math.max(0, Math.floor(u * NX)));
    const j = Math.min(NY - 1, Math.max(0, Math.floor(v * NY)));
    setHover({ bd: BD[0] + ((i + 0.5) / NX) * (BD[1] - BD[0]), sb: SB[0] + ((j + 0.5) / NY) * (SB[1] - SB[0]), p80: field[j][i] });
  };

  return (
    <div className="fr-evidence">
      <div className="fr-heat">
        <div className="fr-heat-yaxis" aria-hidden="true">
          <span>{SB[1].toFixed(2)}</span>
          <span>{es ? 'S/B' : 'S/B'}</span>
          <span>{SB[0].toFixed(2)}</span>
        </div>
        <div className="fr-heat-plot" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          <canvas ref={canvas} width={NX} height={NY} className="fr-heat-canvas" />
          <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="fr-heat-iso" aria-hidden="true">
            {segments.map(([x1, y1, x2, y2], k) => (
              <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeWidth={0.006} vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
        </div>
        <div className="fr-heat-xaxis" aria-hidden="true">
          <span>{BD[0].toFixed(1)}</span>
          <span>{es ? 'B/D, bordo sobre diámetro' : 'B/D, burden over hole diameter'}</span>
          <span>{BD[1].toFixed(1)}</span>
        </div>
      </div>
      <div className="fr-heat-scale">
        <span>{(lo * 100).toFixed(0)} cm</span>
        <span className="fr-heat-ramp" />
        <span>{(hi * 100).toFixed(0)} cm</span>
        <span className="fr-fine">{es ? `P80 predicho; línea blanca: P80 = ${targetCm} cm` : `predicted P80; white line: P80 = ${targetCm} cm`}</span>
      </div>
      <Readout>
        {hover ? (
          <>
            B/D {hover.bd.toFixed(1)}, S/B {hover.sb.toFixed(2)}: <b>P80 {Number.isFinite(hover.p80) ? `${(hover.p80 * 100).toFixed(1)} cm` : 'n/a'}</b>
          </>
        ) : (
          <span className="fr-fine">{es ? 'Pase el puntero sobre el mapa para leer el P80 de ese diseño.' : 'Point at the map to read the P80 of that design.'}</span>
        )}
      </Readout>
      <div className="fr-inline-controls">
        <label className="fr-control">
          {es ? 'Factor de roca A' : 'Rock factor A'}
          <input type="range" min={3} max={13} step={0.1} value={rockFactor} onChange={(e) => setRockFactor(Number(e.target.value))} />
          <output>{rockFactor.toFixed(1)}</output>
        </label>
        <label className="fr-control">
          {es ? 'Diámetro, mm' : 'Hole diameter, mm'}
          <input type="range" min={76} max={250} step={1} value={holeMm} onChange={(e) => setHoleMm(Number(e.target.value))} />
          <output>{holeMm} mm</output>
        </label>
        <label className="fr-control">
          {es ? 'Factor de carga, kg/m³' : 'Powder factor, kg/m³'}
          <input type="range" min={0.22} max={1.26} step={0.01} value={powder} onChange={(e) => setPowder(Number(e.target.value))} />
          <output>{powder.toFixed(2)}</output>
        </label>
        <label className="fr-control">
          {es ? 'P80 objetivo, cm' : 'Target P80, cm'}
          <input type="range" min={10} max={150} step={5} value={targetCm} onChange={(e) => setTargetCm(Number(e.target.value))} />
          <output>{targetCm} cm</output>
        </label>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* A table that colours each value against a reference                                          */
/* ------------------------------------------------------------------------------------------- */

export function RatioTable({
  columns,
  rows,
  reference,
  format = (v) => fmt(v, 3),
  title,
}: {
  columns: string[];
  rows: { id: string; label: string; values: (number | null)[] }[];
  /** The reference value per column; a cell above it is coloured as worse. */
  reference: (number | null)[];
  format?: (v: number) => string;
  title: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  return (
    <div className="fr-scroll-x">
      <table className="fr-table fr-ratio-table" aria-label={title}>
        <thead>
          <tr>
            <th />
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={hover === row.id ? 'fr-row-hover' : ''} onPointerEnter={() => setHover(row.id)} onPointerLeave={() => setHover(null)}>
              <td>{row.label}</td>
              {row.values.map((v, k) => {
                const ref = reference[k];
                const ratio = v !== null && ref ? v / ref : null;
                const cls = ratio === null ? '' : ratio <= 0.8 ? 'fr-cell-good' : ratio <= 1 ? 'fr-cell-ok' : 'fr-cell-bad';
                return (
                  <td key={k} className={cls} title={ratio === null ? undefined : `${format(v as number)} (${ratio.toFixed(2)}×)`}>
                    {v === null ? '-' : format(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
