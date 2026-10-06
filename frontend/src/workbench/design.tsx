/**
 * The Design group: the response surface of the selected model over the burden and spacing plane, every model on
 * the current design beside it, and the bench as reconstructed (docs/design/features/response-surface/).
 */

import { pick, PlotCard, Stage, SubTabs, useShellLang, useThemeTokens, type BiText } from '@fasl-work/caos-app-shell';
import { useEffect, useMemo, useRef, useState } from 'react';

import { answersOnDesign, DESIGN_ARMS, designRefusal, ENVELOPE, outsideEnvelope, type DesignContext } from '../engine/design';
import type { LiveBlast } from '../engine/live';
import { evaluateSurface, isoLines, SURFACE_N, type Surface } from '../engine/surface';
import { ARM_BY_ID, FEATURE_LABEL, formatSize } from '../lib/artifacts';
import type { Lang } from '../lib/contract.types';
import { notAvailable, num } from '../lib/format';
import { BenchView3D } from '../viz/BenchView3D';
import { provenanceOf, type DesignView, type Selection } from './model';

const t = (lang: Lang, en: string, es: string) => (lang === 'es' ? es : en);

/** The arm the surface maps: the selected model when it predicts a size from a design, else the classical one. */
export const surfaceArm = (armId: string) => ((DESIGN_ARMS as readonly string[]).includes(armId) ? armId : 'kuznetsov');

export function DesignGroup({
  sel,
  view,
  onView,
  onDesign,
}: {
  sel: Selection;
  view: DesignView;
  onView: (v: DesignView) => void;
  onDesign: (design: LiveBlast) => void;
}) {
  const lang = useShellLang();
  return (
    <SubTabs
      ariaLabel={t(lang, 'Design views', 'Vistas del diseño')}
      value={sel.blast.pattern ? view : 'surface'}
      onChange={(v) => onView(v as DesignView)}
      tabs={[
        {
          id: 'surface',
          label: t(lang, 'Response surface', 'Superficie de respuesta'),
          content: (
            <div className="caos-views-row">
              <div className="fr-viewcol" style={{ flexGrow: 3 }}>
                <SurfaceView sel={sel} onDesign={onDesign} />
              </div>
              <div className="fr-viewcol" style={{ flexGrow: 2 }}>
                <ArmsOnDesignView sel={sel} />
              </div>
            </div>
          ),
        },
        ...(sel.blast.pattern ? [{ id: 'bench', label: t(lang, 'The bench', 'El banco'), content: <BenchSubView sel={sel} /> }] : []),
      ]}
    />
  );
}

/* ------------------------------------------------------------------------------------------- */
/* The surface                                                                                   */
/* ------------------------------------------------------------------------------------------- */

// Viridis, sampled: perceptually uniform and readable in both themes, so the scale needs no theme of its own.
const VIRIDIS = ['#440154', '#472c7a', '#3b518b', '#2c718e', '#21908d', '#27ad81', '#5cc863', '#aadc32', '#fde725'];

function colourAt(f: number): string {
  const x = Math.min(1, Math.max(0, f)) * (VIRIDIS.length - 1);
  const i = Math.min(VIRIDIS.length - 2, Math.floor(x));
  const mix = x - i;
  const a = VIRIDIS[i];
  const b = VIRIDIS[i + 1];
  const ch = (h: string, k: number) => parseInt(h.slice(1 + 2 * k, 3 + 2 * k), 16);
  const c = [0, 1, 2].map((k) => Math.round(ch(a, k) + (ch(b, k) - ch(a, k)) * mix));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

interface Layout {
  left: number;
  top: number;
  cw: number;
  ch: number;
  plotW: number;
  plotH: number;
}

function SurfaceView({ sel, onDesign }: { sel: Selection; onDesign: (design: LiveBlast) => void }) {
  const lang = useShellLang();
  const tokens = useThemeTokens();
  const arm = surfaceArm(sel.armId);
  const quantity = sel.controls.quantity;
  const ctx: DesignContext = useMemo(
    () => ({ rockFactor: sel.blast.rock_factor, models: sel.models, lang }),
    [sel.blast.rock_factor, sel.models, lang],
  );
  // The other ratios are held at the current design; the surface recomputes only when they, the model or the case move.
  const held = useMemo(
    () => ({ ...sel.design, B_over_D: ENVELOPE.B_over_D[0], S_over_B: ENVELOPE.S_over_B[0] }),
    [sel.design.H_over_B, sel.design.T_over_B, sel.design.Pf_kg_m3, sel.design.XB_m, sel.design.E_GPa],
  );
  const surface = useMemo(() => evaluateSurface(arm, quantity, held, sel.holeMm, ctx), [arm, quantity, held, sel.holeMm, ctx]);
  const levels = useMemo(() => {
    if (quantity === 'p80') {
      return [
        { value: sel.controls.targetP80Cm / 100, label: t(lang, 'target P80', 'P80 objetivo'), colour: tokens['--color-warn'] },
        { value: sel.controls.oversizeCm / 100, label: t(lang, 'oversize limit', 'límite de sobretamaño'), colour: tokens['--color-bad'] },
      ];
    }
    return sel.asFired && sel.blast.x50_measured_m !== null
      ? [{ value: sel.blast.x50_measured_m, label: t(lang, 'measured x50', 'x50 medido'), colour: tokens['--color-good'] }]
      : [];
  }, [quantity, sel.controls.targetP80Cm, sel.controls.oversizeCm, sel.asFired, sel.blast.x50_measured_m, lang, tokens]);
  const lines = useMemo(() => (surface ? levels.map((l) => ({ ...l, segments: isoLines(surface, l.value) })) : []), [surface, levels]);
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);

  const title: BiText = {
    en: `${quantity === 'p80' ? 'P80' : 'Mean size x50'} of ${ARM_BY_ID.get(arm)?.label.en ?? arm} over burden and spacing`,
    es: `${quantity === 'p80' ? 'P80' : 'Tamaño medio x50'} de ${ARM_BY_ID.get(arm)?.label.es ?? arm} sobre bordo y espaciamiento`,
  };
  const hoverCell = surface && hover ? surface.cells[hover.row][hover.col] : null;
  const readout = (
    <div className="fr-readout" role="status" aria-live="polite">
      {hoverCell ? (
        <>
          <span className="fr-readout-key">{`B/D ${num(hoverCell.bd, 1)}, S/B ${num(hoverCell.sb, 2)}`}</span>
          <span className="fr-readout-item">
            {hoverCell.value !== null ? <b>{formatSize(hoverCell.value)}</b> : <span>{hoverCell.reason ?? notAvailable()}</span>}
          </span>
        </>
      ) : (
        <span className="fr-fine">
          {lines.length
            ? lines.map((l) => `${l.label} ${formatSize(l.value)}`).join(' · ')
            : t(lang, 'Point at a cell to read its design and prediction.', 'Apunte a una celda para leer su diseño y su predicción.')}
        </span>
      )}
    </div>
  );
  return (
    <PlotCard
      fill
      title={title}
      lane="live"
      provenance="synthetic"
      dataKey={sel.stateKey}
      note={{
        en: 'Every cell is the model on that design, computed in your browser; the other ratios and the hole diameter are the design in the rail. Drag the marker, or focus the map and use the arrow keys, to move the design. A hatched cell is not a blast, or its prediction left the plausible range.',
        es: 'Cada celda es el modelo sobre ese diseño, calculado en su navegador; las demás razones y el diámetro son el diseño del panel. Arrastre el marcador, o enfoque el mapa y use las flechas, para mover el diseño. Una celda rayada no es un tiro, o su predicción salió del rango plausible.',
      }}
    >
      {surface ? (
        <Stage label={title}>
          {({ width, height }) => (
            <div className="fr-stagebox" style={{ width, height }}>
              <SurfaceCanvas
                surface={surface}
                lines={lines}
                width={width}
                height={Math.max(160, height - 36)}
                design={sel.design}
                tokens={tokens}
                lang={lang}
                title={pick(title, lang)}
                onHover={setHover}
                onMarker={(bd, sb) => onDesign({ ...sel.design, B_over_D: bd, S_over_B: sb })}
              />
              {readout}
            </div>
          )}
        </Stage>
      ) : (
        <p className="caos-pending" data-state="loading">{t(lang, 'Loading the case’s fitted models', 'Cargando los modelos ajustados del caso')}</p>
      )}
    </PlotCard>
  );
}

function SurfaceCanvas({
  surface,
  lines,
  width,
  height,
  design,
  tokens,
  lang,
  title,
  onHover,
  onMarker,
}: {
  surface: Surface;
  lines: { value: number; label: string; colour: string; segments: ReturnType<typeof isoLines> }[];
  width: number;
  height: number;
  design: LiveBlast;
  tokens: Record<string, string>;
  lang: Lang;
  title: string;
  onHover: (cell: { row: number; col: number } | null) => void;
  onMarker: (bd: number, sb: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const dragging = useRef(false);
  const n = surface.bd.length;
  const layout: Layout = useMemo(() => {
    const left = 56;
    const top = 10;
    const right = 70;
    const bottom = 40;
    const plotW = Math.max(60, width - left - right);
    const plotH = Math.max(60, height - top - bottom);
    return { left, top, plotW, plotH, cw: plotW / n, ch: plotH / n };
  }, [width, height, n]);
  const [bd0, bd1] = [surface.bd[0], surface.bd[n - 1]];
  const [sb0, sb1] = [surface.sb[0], surface.sb[n - 1]];
  const lo = surface.min ?? 0;
  const hi = surface.max ?? 1;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const g = canvas.getContext('2d');
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, width, height);
    const { left, top, cw, ch, plotW, plotH } = layout;
    // Cells, highest spacing at the top.
    for (let r = 0; r < n; r += 1) {
      for (let c = 0; c < n; c += 1) {
        const cell = surface.cells[r][c];
        const x = left + c * cw;
        const y = top + (n - 1 - r) * ch;
        if (cell.value === null) {
          g.fillStyle = tokens['--color-surface-2'];
          g.fillRect(x, y, cw + 0.5, ch + 0.5);
          g.strokeStyle = tokens['--color-border'];
          g.beginPath();
          g.moveTo(x, y + ch);
          g.lineTo(x + cw, y);
          g.stroke();
        } else {
          g.fillStyle = colourAt(hi > lo ? (cell.value - lo) / (hi - lo) : 0.5);
          g.fillRect(x, y, cw + 0.5, ch + 0.5);
        }
      }
    }
    // Iso-lines at the decision levels.
    const px = (gx: number) => left + (gx + 0.5) * cw;
    const py = (gy: number) => top + (n - 1 - gy + 0.5) * ch;
    g.lineWidth = 2;
    for (const line of lines) {
      g.strokeStyle = line.colour;
      g.setLineDash([6, 4]);
      g.beginPath();
      for (const s of line.segments) {
        g.moveTo(px(s.x1), py(s.y1));
        g.lineTo(px(s.x2), py(s.y2));
      }
      g.stroke();
    }
    g.setLineDash([]);
    // Axes.
    g.fillStyle = tokens['--color-fg-subtle'];
    g.font = `11px ${tokens['--font-sans'] || 'sans-serif'}`;
    g.textAlign = 'center';
    for (let k = 0; k <= 4; k += 1) {
      const v = bd0 + ((bd1 - bd0) * k) / 4;
      g.fillText(num(v, 1, lang), left + (plotW * k) / 4, top + plotH + 16);
    }
    g.fillText(lang === 'es' ? 'bordo / diámetro, B/D' : 'burden / diameter, B/D', left + plotW / 2, top + plotH + 32);
    g.textAlign = 'right';
    for (let k = 0; k <= 4; k += 1) {
      const v = sb0 + ((sb1 - sb0) * k) / 4;
      g.fillText(num(v, 2, lang), left - 6, top + plotH - (plotH * k) / 4 + 4);
    }
    g.save();
    g.translate(14, top + plotH / 2);
    g.rotate(-Math.PI / 2);
    g.textAlign = 'center';
    g.fillText(lang === 'es' ? 'espaciamiento / bordo, S/B' : 'spacing / burden, S/B', 0, 0);
    g.restore();
    // The colour scale, with its range in centimetres.
    const barX = left + plotW + 18;
    for (let k = 0; k < plotH; k += 1) {
      g.fillStyle = colourAt(1 - k / plotH);
      g.fillRect(barX, top + k, 12, 1.5);
    }
    g.fillStyle = tokens['--color-fg-subtle'];
    g.textAlign = 'left';
    g.fillText(`${num(hi * 100, 0, lang)} cm`, barX + 16, top + 10);
    g.fillText(`${num(lo * 100, 0, lang)} cm`, barX + 16, top + plotH);
    // The design, as a draggable marker.
    const mx = left + ((design.B_over_D - bd0) / (bd1 - bd0)) * (plotW - cw) + cw / 2;
    const my = top + plotH - ((design.S_over_B - sb0) / (sb1 - sb0)) * (plotH - ch) - ch / 2;
    if (mx >= left && mx <= left + plotW && my >= top && my <= top + plotH) {
      g.strokeStyle = tokens['--color-bg'];
      g.lineWidth = 4;
      g.beginPath();
      g.arc(mx, my, 7, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = tokens['--color-fg'];
      g.lineWidth = 2;
      g.beginPath();
      g.arc(mx, my, 7, 0, Math.PI * 2);
      g.stroke();
    }
  }, [surface, lines, width, height, layout, design.B_over_D, design.S_over_B, tokens, lang, n, bd0, bd1, sb0, sb1, lo, hi]);

  const cellAt = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const col = Math.floor((event.clientX - rect.left - layout.left) / layout.cw);
    const row = n - 1 - Math.floor((event.clientY - rect.top - layout.top) / layout.ch);
    return col >= 0 && col < n && row >= 0 && row < n ? { row, col } : null;
  };
  const moveTo = (cell: { row: number; col: number } | null) => {
    if (cell) onMarker(surface.bd[cell.col], surface.sb[cell.row]);
  };
  const step = (dc: number, dr: number) => {
    const col = Math.round(((design.B_over_D - bd0) / (bd1 - bd0)) * (n - 1));
    const row = Math.round(((design.S_over_B - sb0) / (sb1 - sb0)) * (n - 1));
    moveTo({ col: Math.min(n - 1, Math.max(0, col + dc)), row: Math.min(n - 1, Math.max(0, row + dr)) });
  };

  return (
    <canvas
      ref={ref}
      className="fr-surface"
      tabIndex={0}
      role="img"
      aria-label={title}
      data-chart="surface"
      data-chart-grid={SURFACE_N}
      data-chart-cells={surface.drawn}
      data-chart-empty={surface.empty}
      data-chart-isolines={lines.reduce((s, l) => s + l.segments.length, 0)}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        moveTo(cellAt(e));
      }}
      onPointerMove={(e) => {
        const cell = cellAt(e);
        onHover(cell);
        if (dragging.current) moveTo(cell);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerLeave={() => onHover(null)}
      onKeyDown={(e) => {
        const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
        const m = moves[e.key];
        if (m) {
          e.preventDefault();
          step(m[0], m[1]);
        }
      }}
    />
  );
}

/* ------------------------------------------------------------------------------------------- */
/* Every model on the current design                                                             */
/* ------------------------------------------------------------------------------------------- */

function ArmsOnDesignView({ sel }: { sel: Selection }) {
  const lang = useShellLang();
  const ctx: DesignContext = useMemo(() => ({ rockFactor: sel.blast.rock_factor, models: sel.models, lang }), [sel.blast.rock_factor, sel.models, lang]);
  const answers = useMemo(() => answersOnDesign(sel.design, sel.holeMm, ctx), [sel.design, sel.holeMm, ctx]);
  const outside = outsideEnvelope(sel.design);
  const measured = sel.asFired ? sel.blast.x50_measured_m : null;
  const values = DESIGN_ARMS.flatMap((arm) => [answers[arm]?.value, sel.artifact.predictions[arm]?.[sel.blast.blast_id]?.x50_m]).filter(
    (v): v is number => typeof v === 'number',
  );
  if (measured) values.push(measured);
  const hi = Math.max(0.1, ...values) * 1.1;
  const title: BiText = { en: 'Every model on this design', es: 'Cada modelo sobre este diseño' };
  const outsideText = (l: Lang) =>
    outside.length
      ? ` ${t(l, 'Outside the training envelope', 'Fuera de la envolvente de entrenamiento')}: ${outside.map((k) => FEATURE_LABEL[k]?.[l] ?? k).join('; ')}; ${t(l, 'every prediction here is an extrapolation.', 'toda predicción aquí es una extrapolación.')}`
      : '';
  const refusalText = (l: Lang) => {
    const r = designRefusal(sel.design, l);
    return r ? ` ${t(l, 'Not a blast', 'No es un tiro')}: ${r}.` : '';
  };
  return (
    <PlotCard
      fill
      title={title}
      lane="live"
      provenance={provenanceOf(sel, true)}
      dataKey={sel.stateKey}
      note={{
        en: `Filled: the design in the rail, live. Ring: the blast as fired, baked. A changed design has not been fired, so nothing here is a score.${outsideText('en')}${refusalText('en')}`,
        es: `Relleno: el diseño del panel, en vivo. Anillo: el tiro tal como se disparó, horneado. Un diseño cambiado no se ha disparado, así que nada aquí es un puntaje.${outsideText('es')}${refusalText('es')}`,
      }}
    >
      <Stage label={title}>
        {({ width, height }) => {
          const longest = Math.max(...DESIGN_ARMS.map((a) => (ARM_BY_ID.get(a)?.label[lang] ?? a).length));
          const left = Math.min(width * 0.6, Math.max(120, longest * 6.3 + 14));
          const right = width - 16;
          const rowH = Math.max(20, (height - 30) / DESIGN_ARMS.length);
          const bottom = 10 + DESIGN_ARMS.length * rowH;
          const x = (v: number) => left + (Math.min(v, hi) / hi) * (right - left);
          const ticks = [0, hi / 4, hi / 2, (3 * hi) / 4];
          return (
            <svg width={width} height={height} role="img" aria-label={pick(title, lang)} data-chart="whatif" data-chart-rows={DESIGN_ARMS.filter((a) => answers[a]?.value !== undefined).length}>
              {ticks.map((v) => (
                <g key={v}>
                  <line x1={x(v)} y1={6} x2={x(v)} y2={bottom} stroke="var(--color-border)" strokeDasharray="2 4" />
                  <text x={x(v)} y={bottom + 16} fill="var(--color-fg-subtle)" fontSize={11} textAnchor="middle">{`${num(v * 100, 0)} cm`}</text>
                </g>
              ))}
              {measured ? <line x1={x(measured)} y1={6} x2={x(measured)} y2={bottom} stroke="var(--color-good)" strokeWidth={2} /> : null}
              {DESIGN_ARMS.map((arm, i) => {
                const cy = 10 + i * rowH + rowH / 2;
                const live = answers[arm];
                const baked = sel.artifact.predictions[arm]?.[sel.blast.blast_id]?.x50_m;
                const on = arm === sel.armId;
                return (
                  <g key={arm}>
                    {on ? <rect x={0} y={cy - rowH / 2} width={width} height={rowH} fill="var(--color-accent-soft)" /> : null}
                    <text x={left - 10} y={cy + 4} fill="var(--color-fg)" fontSize={11.5} textAnchor="end">{ARM_BY_ID.get(arm)?.label[lang] ?? arm}</text>
                    {typeof baked === 'number' ? <circle cx={x(baked)} cy={cy} r={5} fill="none" stroke="var(--color-fg-subtle)" strokeWidth={1.5} /> : null}
                    {live?.value !== null && live?.value !== undefined ? (
                      <circle cx={x(live.value)} cy={cy} r={5.5} fill="var(--color-accent)" />
                    ) : (
                      <text x={left + 6} y={cy + 4} fill="var(--color-fg-faint)" fontSize={10.5}>
                        {live ? t(lang, 'abstains', 'se abstiene') : t(lang, 'loading', 'cargando')}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          );
        }}
      </Stage>
    </PlotCard>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* The bench                                                                                     */
/* ------------------------------------------------------------------------------------------- */

function BenchSubView({ sel }: { sel: Selection }) {
  const lang = useShellLang();
  const title: BiText = { en: `The reconstructed bench · ${sel.blast.blast_id}`, es: `El banco reconstruido · ${sel.blast.blast_id}` };
  return (
    <PlotCard
      fill
      title={title}
      lane="live"
      provenance={provenanceOf(sel, false)}
      dataKey={sel.stateKey}
      note={{
        en: 'The bench as fired, reconstructed from the published ratios and the hole diameter in the source’s prose. A changed design in the rail does not redraw it.',
        es: 'El banco tal como se disparó, reconstruido a partir de las razones publicadas y el diámetro que da la prosa de la fuente. Un diseño cambiado en el panel no lo redibuja.',
      }}
    >
      {sel.blast.pattern ? (
        <Stage label={title}>
          {({ width, height }) => (
            <div className="fr-stagebox" style={{ width, height }}>
              <BenchView3D pattern={sel.blast.pattern!} delayMs={sel.controls.delayMs} tieIn={sel.controls.tieIn} height={160} />
            </div>
          )}
        </Stage>
      ) : (
        <p className="fr-note fr-note-warn">
          {sel.blast.geometry_reason ?? t(lang, 'With no absolute geometry there is no bench to draw.', 'Sin geometría absoluta no hay banco que dibujar.')}
        </p>
      )}
    </PlotCard>
  );
}
