/**
 * The views of the selected case, by question. Each is a shell `PlotCard` with the lane that produced it and the
 * data it rests on, and every drawing sits in a `Stage`, so the gate measures what is drawn, not the box around it.
 */

import { pick, PlotCard, Stage, SubTabs, useShellLang, type BiText } from '@fasl-work/caos-app-shell';
import { useMemo } from 'react';
import { Link } from 'react-router';

import { DESIGN_ARMS, designOf } from '../engine/design';
import {
  crushZone,
  passingAt,
  patternFromRatios,
  percentile,
  publishedRegression,
  rosinRammler,
  sieveGrid,
  swebrec,
  uniformityIndex,
  kuznetsovX50M,
} from '../engine/live';
import {
  ARMS,
  ARM_BY_ID,
  CATEGORY_LABEL,
  CONTROL_LABEL,
  FEATURE_LABEL,
  formatScore,
  formatSize,
  QUANTITY_LABEL,
} from '../lib/artifacts';
import type { CaseArtifact, Lang } from '../lib/contract.types';
import { notAvailable, num, value } from '../lib/format';
import { DistributionChart, LineChart, ParityChart, type SeriesSpec } from '../viz/Charts';
import { AbstentionPanel, DecisionPanel, ProvenancePanel, SimulationSpread, TierBadge } from '../viz/Panels';
import { provenanceOf, type DistributionView, type Selection } from './model';

const t = (lang: Lang, en: string, es: string) => (lang === 'es' ? es : en);

/** A drawing's box inside its stage: a flex column of the stage's size, so a chart can grow to it. */
function StageBox({ width, height, children }: { width: number; height: number; children: React.ReactNode }) {
  return (
    <div className="fr-stagebox" style={{ width, height }}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* Predict                                                                                       */
/* ------------------------------------------------------------------------------------------- */

export function PredictGroup({
  sel,
  onSelectBlast,
  onArm,
}: {
  sel: Selection;
  onSelectBlast: (id: string) => void;
  onArm: (id: string) => void;
}) {
  const lang = useShellLang();
  const row = sel.artifact.predictions[sel.armId] ?? {};
  const points = sel.artifact.blasts
    .filter((b) => b.x50_measured_m !== null && row[b.blast_id]?.x50_m !== null && row[b.blast_id] !== undefined)
    .map((b) => ({
      blastId: b.blast_id,
      site: b.site,
      measuredM: b.x50_measured_m as number,
      predictedM: row[b.blast_id].x50_m as number,
      extrapolated: row[b.blast_id].extrapolated,
    }));
  const title: BiText =
    points.length >= 2
      ? { en: 'Predicted against measured', es: 'Predicho contra medido' }
      : answering(sel).length
        ? { en: 'What every model predicts, design by design', es: 'Lo que predice cada modelo, diseño por diseño' }
        : { en: 'Why every model refuses these designs', es: 'Por qué todos los modelos rechazan estos diseños' };
  const cell = row[sel.blast.blast_id];
  // With no measured size there is no ranking to show beside the drawing, so the drawing takes the row.
  const ranked = ARMS.some((a) => sel.artifact.scores[a.id]?.scoreable && sel.artifact.scores[a.id]?.r2_identity !== null);
  return (
    <div className="caos-views-row">
      <div className="fr-viewcol">
      <PlotCard
        fill
        title={title}
        lane="replay"
        provenance={provenanceOf(sel, false)}
        dataKey={sel.stateKey}
        actions={
          <Link className="fr-inline-link" to={`/focus/${sel.artifact.case.id}`}>
            {t(lang, 'Full screen', 'Pantalla completa')}
          </Link>
        }
      >
        {points.length >= 2 ? (
          <Stage label={title}>
            {({ width, height }) => (
              <StageBox width={width} height={height}>
                <ParityChart
                  points={points}
                  nullMeanM={sel.artifact.null_mean_m}
                  selected={sel.blast.blast_id}
                  onSelect={onSelectBlast}
                  height={height}
                  fill
                />
              </StageBox>
            )}
          </Stage>
        ) : answering(sel).length ? (
          <AllModelsChart sel={sel} />
        ) : (
          <RefusalChart sel={sel} />
        )}
      </PlotCard>
      </div>
      {ranked ? (
      <div className="fr-viewcol">
        <PlotCard
          fill
          title={{ en: 'Every model on this case', es: 'Todos los modelos en este caso' }}
          lane="replay"
          provenance={provenanceOf(sel, false)}
          dataKey={sel.stateKey}
          note={{
            en: 'R²id is the variance explained about the identity line, the score this product reports; r² is the squared correlation, the one the source papers report. They are different quantities, and on the published hold-out they differ by a factor of two and a half for the classical model.',
            es: 'R²id es la varianza explicada respecto de la recta identidad, el puntaje que reporta este producto; r² es la correlación al cuadrado, la que reportan los artículos fuente. Son cantidades distintas y en el conjunto de validación publicado difieren por un factor de dos y medio para el modelo clásico.',
          }}
        >
          <div className="fr-scrolly">
            <ArmComparison artifact={sel.artifact} armId={sel.armId} onArm={onArm} />
            {cell ? <SimulationSpread cell={cell} /> : null}
            <AbstentionPanel artifact={sel.artifact} arm={sel.armId} />
          </div>
        </PlotCard>
      </div>
      ) : null}
    </div>
  );
}

/** Every arm on this case at a glance, so the model picker is a filter rather than a hiding place. */
function ArmComparison({ artifact, armId, onArm }: { artifact: CaseArtifact; armId: string; onArm: (id: string) => void }) {
  const lang = useShellLang();
  const scored = ARMS.filter((a) => artifact.scores[a.id]?.scoreable);
  // A curve-shape arm reuses another arm's mean size, so it scores identically and gets no row.
  const shapes = scored.filter((a) => a.sharesMeanSizeWith);
  // A capped arm equals the arm it caps on a case where the cap binds on no blast; it gets a row only where it differs.
  const same = (a: string, b: string) =>
    (['r2_identity', 'pearson_r2', 'rmse_m', 'n_scored', 'n_abstained'] as const).every(
      (k) => artifact.scores[a]?.[k] === artifact.scores[b]?.[k],
    );
  const foldedCaps = scored.filter((a) => a.cappedFrom && same(a.id, a.cappedFrom));
  // A model with no size on this case (the router predicts a group, not a size) is named, not a row of blanks.
  const sizeless = scored.filter((a) => artifact.scores[a.id].r2_identity === null && artifact.scores[a.id].rmse_m === null);
  const rows = scored
    .filter((a) => !a.sharesMeanSizeWith && !foldedCaps.includes(a) && !sizeless.includes(a))
    .sort((a, b) => (artifact.scores[b.id].r2_identity ?? -99) - (artifact.scores[a.id].r2_identity ?? -99));
  if (!rows.length) {
    return <p className="fr-note">{t(lang, 'No model is scoreable on this case.', 'Ningún modelo es puntuable en este caso.')}</p>;
  }
  const selectedMeta = ARMS.find((a) => a.id === armId);
  const selectedRow =
    selectedMeta?.sharesMeanSizeWith ??
    (selectedMeta && foldedCaps.includes(selectedMeta) ? selectedMeta.cappedFrom : undefined) ??
    armId;
  const shapeTargets = [...new Set(shapes.map((a) => a.sharesMeanSizeWith as string))];
  return (
    <div className="fr-armtable">
      <RankingChart artifact={artifact} rows={rows.map((a) => a.id)} selected={selectedRow} />
      <table className="fr-table caos-table">
        <thead>
          <tr>
            <th>{t(lang, 'model', 'modelo')}</th>
            <th title={t(lang, 'Variance explained about the identity line', 'Varianza explicada respecto de la identidad')}>R²id</th>
            <th title={t(lang, 'Squared correlation, as the source papers report', 'Correlación al cuadrado, como la reportan las fuentes')}>r²</th>
            <th>RMSE</th>
            <th title={t(lang, 'Blasts on which the model abstains', 'Tiros en que el modelo se abstiene')}>{t(lang, 'abst.', 'abst.')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((arm) => {
            const score = artifact.scores[arm.id];
            return (
              <tr key={arm.id} className={arm.id === selectedRow ? 'fr-row-selected' : undefined}>
                <td>
                  <button type="button" className="fr-inline-arm" onClick={() => onArm(arm.id)}>
                    {arm.label[lang]}
                  </button>
                </td>
                <td className={(score.r2_identity ?? 0) > 0 ? 'fr-ok' : 'fr-bad'}>{formatScore(score.r2_identity)}</td>
                <td>{formatScore(score.pearson_r2)}</td>
                <td>{formatSize(score.rmse_m)}</td>
                <td>{score.n_abstained ?? 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {shapeTargets.map((target) => {
        const names = shapes.filter((a) => a.sharesMeanSizeWith === target).map((a) => a.label[lang]).join(', ');
        const base = ARM_BY_ID.get(target)?.label[lang] ?? target;
        return (
          <p key={target} className="fr-fine">
            {t(lang, `${names} use the mean size of "${base}" and score as it does.`, `${names} usan el tamaño medio de «${base}» y puntúan como él.`)}
          </p>
        );
      })}
      {sizeless.length ? (
        <p className="fr-fine">
          {t(
            lang,
            `${sizeless.map((a) => a.label.en).join(', ')}: no size on this case, so no score.`,
            `${sizeless.map((a) => a.label.es).join(', ')}: sin tamaño en este caso, así que sin puntaje.`,
          )}
        </p>
      ) : null}
      {foldedCaps.map((a) => {
        const base = ARM_BY_ID.get(a.cappedFrom as string)?.label[lang] ?? a.cappedFrom;
        return (
          <p key={a.id} className="fr-fine" data-folded-cap={a.id}>
            <button type="button" className="fr-inline-arm" onClick={() => onArm(a.id)}>
              {a.label[lang]}
            </button>
            {t(lang, ` equals "${base}" on this case: no prediction here exceeds its in-situ block.`, ` coincide con «${base}» en este caso: ninguna predicción supera aquí su bloque in situ.`)}
          </p>
        );
      })}
    </div>
  );
}

/** The design arms that answer on at least one blast of the case. */
function answering(sel: Selection): string[] {
  return DESIGN_ARMS.filter((arm) => Object.values(sel.artifact.predictions[arm] ?? {}).some((c) => typeof c.x50_m === 'number'));
}

/** Variance explained per model on this case, drawn: the ranking the table lists, at a glance. */
function RankingChart({ artifact, rows, selected }: { artifact: CaseArtifact; rows: string[]; selected: string }) {
  const lang = useShellLang();
  const W = 600;
  const rowH = 18;
  const left = 230;
  const H = rows.length * rowH + 26;
  // Clipped to [-1, 1]: a refit at -10^5 would flatten every other bar to nothing; its value is in the table.
  const x = (v: number) => left + ((Math.max(-1, Math.min(1, v)) + 1) / 2) * (W - left - 12);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={t(lang, 'Variance explained per model', 'Varianza explicada por modelo')} data-chart="ranking" data-chart-bars={rows.length}>
      <line x1={x(0)} y1={4} x2={x(0)} y2={H - 20} stroke="var(--color-fg-subtle)" />
      {[-1, -0.5, 0, 0.5, 1].map((v) => (
        <text key={v} x={x(v)} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--color-fg-faint)">{num(v, 1)}</text>
      ))}
      {rows.map((arm, i) => {
        const value = artifact.scores[arm]?.r2_identity;
        const y = 4 + i * rowH;
        const clipped = typeof value === 'number' && (value < -1 || value > 1);
        return (
          <g key={arm}>
            <text x={left - 8} y={y + 12} textAnchor="end" fontSize={11} fill={arm === selected ? 'var(--color-accent)' : 'var(--color-fg-subtle)'}>
              {ARM_BY_ID.get(arm)?.label[lang] ?? arm}
            </text>
            {typeof value === 'number' ? (
              <rect
                x={Math.min(x(0), x(value))}
                y={y + 3}
                width={Math.max(1, Math.abs(x(value) - x(0)))}
                height={rowH - 6}
                fill={value > 0 ? 'var(--color-good)' : 'var(--color-bad)'}
                opacity={arm === selected ? 1 : 0.65}
              />
            ) : null}
            {clipped ? <text x={value! < 0 ? x(-1) + 4 : x(1) - 4} y={y + 12} fontSize={10} textAnchor={value! < 0 ? 'start' : 'end'} fill="var(--color-bg)">{value! < 0 ? '<' : '>'}</text> : null}
          </g>
        );
      })}
    </svg>
  );
}

/** A case with no measurement (a design study): every model's prediction on every design, in order. */
function AllModelsChart({ sel }: { sel: Selection }) {
  const lang = useShellLang();
  const arms = answering(sel);
  const blasts = sel.artifact.blasts;
  const series: SeriesSpec[] = arms.map((arm) => ({
    id: arm,
    label: ARM_BY_ID.get(arm)?.label[lang] ?? arm,
    values: blasts.map((b) => {
      const v = sel.artifact.predictions[arm]?.[b.blast_id]?.x50_m;
      return typeof v === 'number' ? v * 100 : null;
    }),
    width: arm === sel.armId ? 3 : 1.5,
  }));
  const title: BiText = { en: 'What every model predicts, design by design', es: 'Lo que predice cada modelo, diseño por diseño' };
  const index = blasts.map((_, i) => i + 1);
  return (
    <Stage label={title}>
      {({ width, height }) => {
        // The legend wraps under the plot: reserve its rows (an entry is its label plus its swatch and gap), the axis
        // title and the readout. On a stage too short for both, the plot keeps a readable height and the legend
        // scrolls into view inside the stage instead of being cut by the card.
        const longest = Math.max(...series.map((x) => x.label.length));
        const perRow = Math.max(1, Math.floor(width / (longest * 6.6 + 44)));
        const legendRows = Math.ceil(series.length / perRow);
        return (
          <div className="fr-scrolly" style={{ width, height }}>
            <LineChart
              x={index}
              series={series}
              xLabel={t(lang, 'design of the case, in order', 'diseño del caso, en orden')}
              yLabel={t(lang, 'predicted x50, cm', 'x50 predicho, cm')}
              height={Math.max(180, height - 80 - legendRows * 32)}
              legend
              xTicks={index}
              xTickFormat={(v) => blasts[Math.round(v) - 1]?.blast_id ?? ''}
              valueFormat={(v) => `${num(v, 1)} cm`}
            />
          </div>
        );
      }}
    </Stage>
  );
}

/** A case no model answers on (the designs are not blasts): each design's charged share against the refusal line. */
function RefusalChart({ sel }: { sel: Selection }) {
  const lang = useShellLang();
  const blasts = sel.artifact.blasts;
  const share = (b: (typeof blasts)[number]) => Math.max(0, 1 - b.features.T_over_B / b.features.H_over_B);
  const title: BiText = { en: 'Why every model refuses these designs', es: 'Por qué todos los modelos rechazan estos diseños' };
  return (
    <Stage label={title}>
      {({ width, height }) => {
        const left = 56;
        const bottom = 40;
        const top = 16;
        const bw = (width - left - 16) / Math.max(1, blasts.length);
        const y = (v: number) => height - bottom - v * (height - bottom - top);
        return (
          <svg width={width} height={height} role="img" aria-label={pick(title, lang)} data-chart="refusals" data-chart-bars={blasts.length}>
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <g key={v}>
                <line x1={left} y1={y(v)} x2={width - 8} y2={y(v)} stroke="var(--color-border)" />
                <text x={left - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--color-fg-subtle)">{`${num(v * 100, 0)} %`}</text>
              </g>
            ))}
            <line x1={left} y1={y(0.05)} x2={width - 8} y2={y(0.05)} stroke="var(--color-bad)" strokeDasharray="6 4" strokeWidth={2} />
            <text x={width - 10} y={y(0.05) - 6} textAnchor="end" fontSize={11} fill="var(--color-bad)">
              {t(lang, 'below 5 percent charged, the engine refuses', 'bajo 5 por ciento cargado, el motor rechaza')}
            </text>
            {blasts.map((b, k) => {
              const v = share(b);
              const x0 = left + 8 + k * bw;
              return (
                <g key={b.blast_id}>
                  <rect x={x0} y={y(v)} width={Math.max(2, bw - 16)} height={Math.max(1, y(0) - y(v))} fill="var(--color-warn)" />
                  <text x={x0 + (bw - 16) / 2} y={height - bottom + 16} textAnchor="middle" fontSize={11} fill="var(--color-fg-subtle)">{b.blast_id}</text>
                  <text x={x0 + (bw - 16) / 2} y={y(v) - 6} textAnchor="middle" fontSize={11} fill="var(--color-fg)">{`${num(v * 100, 0)} %`}</text>
                </g>
              );
            })}
            <text x={left + (width - left) / 2} y={height - 6} textAnchor="middle" fontSize={11} fill="var(--color-fg-subtle)">
              {t(lang, 'share of the hole that carries explosive after the stemming', 'fracción del barreno que lleva explosivo después del taco')}
            </text>
          </svg>
        );
      }}
    </Stage>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* Distribution, and the decision against a target                                               */
/* ------------------------------------------------------------------------------------------- */

const GRID = sieveGrid();

/** The curves need the blast's absolute geometry and its rock factor. */
export const canDrawCurves = (sel: Omit<Selection, 'stateKey'>) => sel.blast.rock_factor !== null && !!sel.blast.pattern;

/** A decision needs the selected model's size on the blast as fired, and the geometry for its shape. */
export const canDecide = (sel: Omit<Selection, 'stateKey'>) =>
  !!sel.blast.pattern && typeof sel.artifact.predictions[sel.armId]?.[sel.blast.blast_id]?.x50_m === 'number';

/** The curves of the current design: the classical shape, the three-parameter Swebrec and the crush-zone fines. */
export function useCurves(sel: Selection) {
  return useMemo(() => {
    if (sel.blast.rock_factor === null || !sel.blast.pattern) return null;
    const pattern = patternFromRatios(sel.design, sel.holeMm);
    const x50 = kuznetsovX50M(pattern, sel.blast.rock_factor);
    if (!Number.isFinite(x50) || x50 <= 0) return null;
    const n = uniformityIndex(pattern);
    const xMax = Math.max(pattern.burdenM, pattern.spacingM);
    const classical = rosinRammler(x50, n, GRID);
    return {
      x50,
      n,
      classical,
      three: swebrec(x50, xMax, sel.controls.undulation, GRID),
      crush: crushZone(x50, n, { crossoverM: 0.01, finesUniformity: 0.8, finesFraction: sel.controls.finesFraction }, GRID),
      p20: percentile(classical.passing, GRID, 0.2),
      p80: percentile(classical.passing, GRID, 0.8),
    };
  }, [sel.design, sel.holeMm, sel.blast, sel.controls.undulation, sel.controls.finesFraction]);
}

export function DistributionGroup({
  sel,
  view,
  onView,
}: {
  sel: Selection;
  view: DistributionView;
  onView: (v: DistributionView) => void;
}) {
  const lang = useShellLang();
  const decidable = canDecide(sel);
  return (
    <SubTabs
      ariaLabel={t(lang, 'Distribution views', 'Vistas de la distribución')}
      value={decidable ? view : 'curves'}
      onChange={(v) => onView(v as DistributionView)}
      tabs={[
        { id: 'curves', label: t(lang, 'The curves', 'Las curvas'), content: <CurvesView sel={sel} /> },
        ...(decidable ? [{ id: 'decide', label: t(lang, 'Against a target', 'Contra un objetivo'), content: <DecideView sel={sel} /> }] : []),
      ]}
    />
  );
}

function CurvesView({ sel }: { sel: Selection }) {
  const lang = useShellLang();
  const curves = useCurves(sel);
  const title: BiText = { en: 'Fragment-size distribution of the design', es: 'Curva granulométrica del diseño' };
  if (!curves) return <NoCurve sel={sel} title={title} />;
  const series: SeriesSpec[] = [
    { id: 'classical', label: t(lang, 'Classical', 'Clásica'), values: curves.classical.passing },
    { id: 'three', label: t(lang, 'Three-parameter', 'Tres parámetros'), values: curves.three.passing },
    { id: 'crush', label: t(lang, 'Crush zone', 'Zona triturada'), values: curves.crush.passing, dashed: true },
  ];
  const measured = sel.asFired && sel.blast.x50_measured_m !== null ? [{ sizeM: sel.blast.x50_measured_m, passing: 0.5 }] : [];
  return (
    <PlotCard
      fill
      title={title}
      lane="live"
      provenance={provenanceOf(sel, true)}
      dataKey={sel.stateKey}
      note={{
        en: 'The red point is the measured mean size, shown while the design is the blast as fired; the full measured curve is not published. The vertical line is the in-situ block: under the engine’s declared cap, mass a curve places above it reads as unbroken blocks.',
        es: 'El punto rojo es el tamaño medio medido, visible mientras el diseño es el tiro tal como se disparó; la curva medida completa no se publica. La línea vertical es el bloque in situ: bajo el límite declarado del motor, la masa que una curva pone por encima se lee como bloques sin romper.',
      }}
    >
      <Stage label={title}>
        {({ width, height }) => (
          <StageBox width={width} height={height}>
            <DistributionChart
              sizesM={GRID}
              series={series}
              markers={[
                { fraction: 0.2, label: 'P20' },
                { fraction: 0.5, label: 'P50' },
                { fraction: 0.8, label: 'P80' },
              ]}
              measured={measured}
              sizeMarkers={[{ sizeM: sel.design.XB_m, label: t(lang, 'in-situ block', 'bloque in situ') }]}
              height={Math.max(200, height - 84)}
            />
            {/* The live percentiles of the classical curve, under the curve they are read from. */}
            <p className="fr-readout" data-readout="percentiles">
              <span className="fr-readout-key">{t(lang, 'Classical curve', 'Curva clásica')}</span>
              <span className="fr-readout-item">P20 <b>{formatSize(curves.p20)}</b></span>
              <span className="fr-readout-item">P50 <b>{formatSize(curves.x50)}</b></span>
              <span className="fr-readout-item">P80 <b>{formatSize(curves.p80)}</b></span>
              <span className="fr-readout-item">{t(lang, 'uniformity', 'uniformidad')} <b>{num(curves.n, 2)}</b></span>
              <span className="fr-readout-item">{t(lang, 'passing 10 mm', 'pasa 10 mm')} <b>{num(passingAt(curves.classical, 0.01) * 100, 1)} %</b></span>
            </p>
          </StageBox>
        )}
      </Stage>
    </PlotCard>
  );
}

function NoCurve({ sel, title }: { sel: Selection; title: BiText }) {
  const lang = useShellLang();
  return (
    <PlotCard title={title} lane="live" provenance={provenanceOf(sel, true)} dataKey={sel.stateKey}>
      <p className="fr-note fr-note-warn">
        {sel.blast.geometry_reason ??
          sel.blast.degenerate_reason ??
          t(
            lang,
            'This blast has neither an absolute geometry nor a rock factor, so no distribution model can run on it.',
            'Este tiro no tiene geometría absoluta ni factor de roca, así que ningún modelo de distribución puede correr sobre él.',
          )}
      </p>
    </PlotCard>
  );
}

function DecideView({ sel }: { sel: Selection }) {
  const lang = useShellLang();
  const cell = sel.artifact.predictions[sel.armId]?.[sel.blast.blast_id];
  const target = sel.controls.targetP80Cm / 100;
  const oversize = sel.controls.oversizeCm / 100;
  // The decision reads the selected model's mean size on the blast as fired (baked), with the design's own shape.
  const decided = useMemo(() => {
    if (!sel.blast.pattern || !cell?.x50_m) return null;
    const n = uniformityIndex(patternFromRatios(designOf(sel.blast), sel.blast.pattern.hole_diameter_mm));
    const curve = rosinRammler(cell.x50_m, n, GRID);
    return { curve, p80: percentile(curve.passing, GRID, 0.8), over: 1 - passingAt(curve, oversize), fines: passingAt(curve, 0.01) };
  }, [sel.blast, cell, oversize]);
  const title: BiText = { en: 'The selected model against your specification', es: 'El modelo seleccionado contra su especificación' };
  return (
    <PlotCard
      fill
      title={title}
      lane="replay"
      provenance={provenanceOf(sel, false)}
      dataKey={sel.stateKey}
      note={{
        en: 'The selected model’s mean size on the blast as fired, baked, with the design’s own uniformity. This product does not model the crusher or the mill: fragmentation feeds them and that chain is real, but a specific-energy figure here would be a proxy, not a comminution model. How far to trust the model is on the Benchmark.',
        es: 'El tamaño medio del modelo seleccionado sobre el tiro tal como se disparó, horneado, con la uniformidad del propio diseño. Este producto no modela la chancadora ni el molino: la fragmentación los alimenta y esa cadena es real, pero una cifra de energía específica aquí sería un sustituto, no un modelo de conminución. Cuánto confiar en el modelo está en el Benchmark.',
      }}
    >
      {decided ? (
        <Stage label={title}>
          {({ width, height }) => (
            <StageBox width={width} height={height}>
              <DistributionChart
                sizesM={GRID}
                series={[{ id: 'selected', label: ARM_BY_ID.get(sel.armId)?.label[lang] ?? sel.armId, values: decided.curve.passing }]}
                markers={[{ fraction: 0.8, label: 'P80' }]}
                sizeMarkers={[
                  { sizeM: target, label: t(lang, 'target P80', 'P80 objetivo') },
                  { sizeM: oversize, label: t(lang, 'oversize limit', 'límite de sobretamaño') },
                ]}
                height={Math.max(180, height - 210)}
              />
              <DecisionPanel
                inputs={{
                  targetP80M: target,
                  oversizeLimitM: oversize,
                  predictedX50M: cell?.x50_m ?? null,
                  predictedP80M: decided.p80,
                  oversizeFraction: decided.over,
                  finesFraction: decided.fines,
                  armId: sel.armId,
                }}
              />
            </StageBox>
          )}
        </Stage>
      ) : (
        <p className="fr-note fr-note-warn">
          {t(lang, 'The selected model abstains on this blast, so there is nothing to decide on.', 'El modelo seleccionado se abstiene en este tiro, así que no hay nada que decidir.')}
        </p>
      )}
    </PlotCard>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* Rock                                                                                          */
/* ------------------------------------------------------------------------------------------- */

/** The two published rating schemes, computed live, against the factor recovered from the published predictions. */
export function rockSchemes(sel: Selection) {
  const { ucs, density, jointSpacing } = sel.controls;
  const rmd = 20;
  const jps = jointSpacing < 0.1 ? 10 : jointSpacing <= 1 ? 20 : 50;
  const jpo = 30;
  const rdi = 25 * density - 50;
  const strengthA = 0.05 * ucs;
  const divisor = sel.blast.features.E_GPa < 50 ? 3 : 5;
  const strengthB = ucs / divisor;
  const biA = 0.5 * (rmd + jps + jpo + rdi + strengthA);
  const biB = 0.5 * (rmd + jps + jpo + rdi + strengthB);
  return { biA, biB, factorA: 0.06 * biA, factorB: 0.06 * biB, divisor, recovered: sel.blast.rock_factor };
}

export function RockGroup({ sel }: { sel: Selection }) {
  const lang = useShellLang();
  const r = rockSchemes(sel);
  const group = publishedRegression(sel.blast.features).group;
  const bars: { id: string; label: string; value: number | null; tone: string }[] = [
    { id: 'a', label: t(lang, 'Scheme A', 'Esquema A'), value: r.factorA, tone: 'var(--color-accent)' },
    { id: 'b', label: t(lang, 'Scheme B', 'Esquema B'), value: r.factorB, tone: 'var(--color-warn)' },
    { id: 'rec', label: t(lang, 'Recovered', 'Recuperado'), value: r.recovered, tone: 'var(--color-good)' },
  ];
  const title: BiText = { en: 'The rock factor, by route', es: 'El factor de roca, por ruta' };
  const top = Math.max(1, ...bars.map((b) => b.value ?? 0)) * 1.15;
  const tables = (
    <>
      <table className="fr-table caos-table">
        <thead>
          <tr>
            <th>{t(lang, 'scheme', 'esquema')}</th>
            <th title={t(lang, 'strength term', 'término de resistencia')}>{t(lang, 'strength', 'resistencia')}</th>
            <th title={t(lang, 'blastability index', 'índice de tronabilidad')}>{t(lang, 'index', 'índice')}</th>
            <th title={t(lang, 'rock factor', 'factor de roca')}>A</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>A</td>
            <td>{`${num(0.05, 2)} × UCS`}</td>
            <td>{num(r.biA, 1)}</td>
            <td>{num(r.factorA, 2)}</td>
          </tr>
          <tr>
            <td>B</td>
            <td>UCS / {r.divisor}</td>
            <td>{num(r.biB, 1)}</td>
            <td>{num(r.factorB, 2)}</td>
          </tr>
        </tbody>
      </table>
      <table className="fr-table caos-table">
        <thead>
          <tr>
            <th>{t(lang, 'what the corpus publishes', 'lo que publica el corpus')}</th>
            <th>{t(lang, 'value', 'valor')}</th>
          </tr>
        </thead>
        <tbody>
          {(Object.keys(sel.blast.features) as (keyof typeof sel.blast.features)[]).map((key) => (
            <tr key={key}>
              <td>{FEATURE_LABEL[key]?.[lang] ?? key}</td>
              <td>{value(sel.blast.features[key])}</td>
            </tr>
          ))}
          <tr>
            <td>{t(lang, 'Stiffness group', 'Grupo de rigidez')}</td>
            <td>{group === 1 ? t(lang, '1, high modulus', '1, módulo alto') : t(lang, '2, low modulus', '2, módulo bajo')}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
  return (
    <PlotCard
      fill
      title={title}
      lane="live"
      provenance="published"
      dataKey={sel.stateKey}
      note={{
        en: 'Two primary sources publish rating tables under the same attribution, and they are not the same table: the strength term differs by a factor of six. Predicted size is linear in the factor. The corpus publishes only the modulus and the block size, so the UCS, density and joint spacing in the rail are yours; no scheme invents them.',
        es: 'Dos fuentes primarias publican tablas de calificación bajo la misma atribución, y no son la misma tabla: el término de resistencia difiere por un factor de seis. El tamaño predicho es lineal en el factor. El corpus publica solo el módulo y el tamaño de bloque, así que la UCS, la densidad y el espaciamiento de juntas del panel son suyos; ningún esquema los inventa.',
      }}
    >
      <Stage label={title}>
        {({ width, height }) => {
          const stacked = width < 640;
          const chartW = stacked ? width : Math.round(width * 0.55);
          const chartH = stacked ? Math.max(220, Math.round(height * 0.5)) : height;
          const left = 64;
          const bottom = 36;
          const bw = (chartW - left - 16) / bars.length;
          const y = (v: number) => chartH - bottom - (v / top) * (chartH - bottom - 24);
          const ticks = [0, top / 4, top / 2, (3 * top) / 4];
          return (
            <div className="fr-rockstage" style={{ width, height, flexDirection: stacked ? 'column' : 'row' }}>
              <svg width={chartW} height={chartH} role="img" aria-label={pick(title, lang)} data-chart="rock" data-chart-bars={bars.filter((b) => b.value !== null).length}>
                {ticks.map((v) => (
                  <g key={v}>
                    <line x1={left} y1={y(v)} x2={chartW - 8} y2={y(v)} stroke="var(--color-border)" />
                    <text x={left - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--color-fg-subtle)">{num(v, 1)}</text>
                  </g>
                ))}
                {bars.map((b, k) => {
                  const x0 = left + 10 + k * bw;
                  const h = b.value === null ? 0 : chartH - bottom - y(b.value);
                  return (
                    <g key={b.id}>
                      {b.value !== null ? <rect x={x0} y={y(b.value)} width={Math.max(4, bw - 20)} height={h} fill={b.tone} /> : null}
                      <text x={x0 + (bw - 20) / 2} y={chartH - bottom + 16} textAnchor="middle" fontSize={11} fill="var(--color-fg-subtle)">{b.label}</text>
                      <text x={x0 + (bw - 20) / 2} y={(b.value === null ? chartH - bottom : y(b.value)) - 6} textAnchor="middle" fontSize={12} fill="var(--color-fg)">
                        {b.value === null ? notAvailable() : num(b.value, 2)}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <div className="fr-rocktables">{tables}</div>
            </div>
          );
        }}
      </Stage>
    </PlotCard>
  );
}

/* ------------------------------------------------------------------------------------------- */

const COMPARE_ARMS = ['kuznetsov', 'kuznetsov-transfer', 'kuznetsov-capped', 'published-regression', 'refitted-regression', 'published-neural-net', 'svr-rbf', 'random-forest', 'xgboost', 'stacking'];

/** The baked response of the selected model to the case's variants; selecting a row loads that variant. */
export function CompareView({ sel, onVariant }: { sel: Selection; onVariant: (id: string) => void }) {
  const lang = useShellLang();
  const arm = COMPARE_ARMS.includes(sel.armId) && sel.artifact.variant_curves[sel.armId] ? sel.armId : 'kuznetsov';
  const curves = sel.artifact.variant_curves[arm] ?? {};
  const variants = sel.artifact.variants;
  const base = curves.base ?? null;
  const values = variants.map((v) => curves[v.id]).filter((v): v is number => typeof v === 'number');
  const hi = Math.max(0.1, ...values) * 1.1;
  const title: BiText = {
    en: `One lever at a time: ${ARM_BY_ID.get(arm)?.label.en ?? arm}`,
    es: `Una palanca por vez: ${ARM_BY_ID.get(arm)?.label.es ?? arm}`,
  };
  return (
    <PlotCard
      fill
      title={title}
      lane="replay"
      provenance="synthetic"
      dataKey={sel.stateKey}
      note={{
        en: 'The mean predicted size over the case’s blasts for each variant, baked; the grey line is the design as fired. Click a row to load that variant.',
        es: 'El tamaño medio predicho sobre los tiros del caso para cada variante, horneado; la línea gris es el diseño tal como se disparó. Haga clic en una fila para cargar esa variante.',
      }}
    >
      <Stage label={title}>
        {({ width, height }) => {
          const left = Math.min(260, width * 0.38);
          const right = width - 16;
          const rowH = Math.max(22, (height - 40) / Math.max(1, variants.length));
          const x = (v: number) => left + (Math.min(v, hi) / hi) * (right - left);
          const ticks = [0, hi / 4, hi / 2, (3 * hi) / 4];
          const bottom = 12 + variants.length * rowH;
          return (
            <svg width={width} height={height} role="img" aria-label={pick(title, lang)} data-chart="variants" data-chart-rows={variants.length} data-chart-dots={values.length}>
              {ticks.map((v) => (
                <g key={v}>
                  <line x1={x(v)} y1={8} x2={x(v)} y2={bottom} stroke="var(--color-border)" strokeDasharray="2 4" />
                  <text x={x(v)} y={bottom + 16} fill="var(--color-fg-subtle)" fontSize={11} textAnchor="middle">{`${num(v * 100, 0)} cm`}</text>
                </g>
              ))}
              {typeof base === 'number' ? <line x1={x(base)} y1={8} x2={x(base)} y2={bottom} stroke="var(--color-fg-subtle)" strokeWidth={1.5} /> : null}
              {variants.map((v, i) => {
                const cy = 12 + i * rowH + rowH / 2;
                const val = curves[v.id];
                const on = v.id === sel.variantId;
                return (
                  <g key={v.id} onClick={() => onVariant(v.id)} style={{ cursor: 'pointer' }}>
                    <rect x={0} y={cy - rowH / 2} width={width} height={rowH} fill={on ? 'var(--color-accent-soft)' : 'transparent'} />
                    <text x={left - 10} y={cy + 4} fill="var(--color-fg)" fontSize={11.5} textAnchor="end">{v.label[lang]}</text>
                    {typeof val === 'number' ? (
                      <>
                        <circle cx={x(val)} cy={cy} r={5.5} fill={v.id === 'base' ? 'var(--color-fg-subtle)' : 'var(--color-accent)'} />
                        <text x={Math.min(right - 40, x(val) + 10)} y={cy + 4} fill="var(--color-fg-subtle)" fontSize={10.5}>
                          {typeof base === 'number' && base > 0 && v.id !== 'base' ? `${val >= base ? '+' : ''}${num((val / base - 1) * 100, 1)} %` : formatSize(val)}
                        </text>
                      </>
                    ) : (
                      <text x={left + 6} y={cy + 4} fill="var(--color-fg-faint)" fontSize={10.5}>{t(lang, 'abstains', 'se abstiene')}</text>
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
/* The case                                                                                      */
/* ------------------------------------------------------------------------------------------- */

export function ContextView({ sel }: { sel: Selection }) {
  const lang = useShellLang();
  const a = sel.artifact;
  const arm = ARM_BY_ID.get(sel.armId);
  const controls = Object.entries(a.controls);
  const report = a.geometry_report[a.case.site ?? ''];
  return (
    <div className="fr-context">
      <h2>{a.case.title[lang]}</h2>
      <p>{a.case.reason[lang]}</p>
      <table className="fr-table caos-table">
        <tbody>
          <tr>
            <td>{t(lang, 'Category', 'Categoría')}</td>
            <td>{CATEGORY_LABEL[a.case.category]?.[lang] ?? a.case.category}</td>
          </tr>
          <tr>
            <td>{t(lang, 'Blasts', 'Tiros')}</td>
            <td>{a.blasts.length}</td>
          </tr>
          <tr>
            <td>{t(lang, 'What a reader should see', 'Lo que el lector debería ver')}</td>
            <td>{a.case.expected_band[lang]}</td>
          </tr>
          <tr>
            <td>{t(lang, 'Learned models fitted', 'Modelos aprendidos ajustados')}</td>
            <td>{a.provenance.held_out_site ? t(lang, `without ${a.provenance.held_out_site}`, `sin ${a.provenance.held_out_site}`) : t(lang, 'on the whole corpus', 'con todo el corpus')}</td>
          </tr>
        </tbody>
      </table>
      {controls.length ? (
        <>
          <h3>{t(lang, 'The controls this case carries', 'Los controles que lleva este caso')}</h3>
          <ul className="fr-controls">
            {controls.map(([name, block]) => (
              <li key={name} className={block.passed ? 'fr-ok' : 'fr-bad'}>
                {block.passed ? t(lang, 'passed', 'aprobado') : t(lang, 'FAILED', 'FALLÓ')}: {CONTROL_LABEL[name]?.[lang] ?? name.replace(/_/g, ' ')}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {arm ? (
        <>
          <h3>{t(lang, 'The selected model', 'El modelo seleccionado')}</h3>
          <p>
            <TierBadge tier={arm.tier} /> {arm.blurb[lang]}
          </p>
          <p className="fr-fine">{arm.source}</p>
        </>
      ) : null}
      {report?.checks?.length ? (
        <>
          <h3>{t(lang, 'How this geometry was recovered', 'Cómo se recuperó esta geometría')}</h3>
          <p>
            {t(
              lang,
              `The ${value(report.hole_diameter_mm)} mm diameter comes from the source’s own prose. Everything else follows from the published ratios, and is checked against what the same prose states.`,
              `El diámetro de ${value(report.hole_diameter_mm)} mm viene de la prosa de la fuente. Todo lo demás se deduce de las razones publicadas, y se verifica contra lo que la misma prosa declara.`,
            )}
          </p>
          <table className="fr-table caos-table">
            <thead>
              <tr>
                <th>{t(lang, 'quantity', 'cantidad')}</th>
                <th>{t(lang, 'stated', 'declarado')}</th>
                <th>{t(lang, 'reconstructed', 'reconstruido')}</th>
                <th>{t(lang, 'check', 'control')}</th>
              </tr>
            </thead>
            <tbody>
              {report.checks.map((check) => (
                <tr key={check.quantity}>
                  <td>{QUANTITY_LABEL[check.quantity]?.[lang] ?? check.quantity}</td>
                  <td>{`${value(check.stated[0])} ${t(lang, 'to', 'a')} ${value(check.stated[1])} m`}</td>
                  <td>{`${value(check.reconstructed[0])} ${t(lang, 'to', 'a')} ${value(check.reconstructed[1])} m`}</td>
                  <td className={check.ok ? 'fr-ok' : 'fr-bad'}>{check.ok ? t(lang, 'passed', 'aprobado') : t(lang, 'FAILED', 'FALLÓ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
      <h3>{t(lang, 'How to read the views', 'Cómo leer las vistas')}</h3>
      <p>
        {t(
          lang,
          'Predict plots the selected model against the measured blasts of this case, with the null model’s level, and ranks every model on the same rows. Distribution draws the curves of the design in the rail, and Against a target reads the selected model’s mean size as a P80 against your crusher specification. Design maps the selected model over the burden and spacing plane, with every model on the current design beside it, and the bench reconstructed in 3D. Rock sets the two published rating schemes against the factor recovered from the published predictions. Compare the variants is the baked response to each design variant of the case.',
          'Predecir grafica el modelo seleccionado contra los tiros medidos de este caso, con el nivel del modelo nulo, y ordena todos los modelos sobre las mismas filas. Distribución dibuja las curvas del diseño del panel, y Contra un objetivo lee el tamaño medio del modelo seleccionado como un P80 frente a su especificación de chancado. Diseño mapea el modelo seleccionado sobre el plano de bordo y espaciamiento, con todos los modelos sobre el diseño actual al lado, y el banco reconstruido en 3D. Roca enfrenta los dos esquemas de calificación publicados con el factor recuperado de las predicciones publicadas. Comparar las variantes es la respuesta horneada a cada variante de diseño del caso.',
        )}
      </p>
      <ProvenancePanel artifact={a} />
    </div>
  );
}
