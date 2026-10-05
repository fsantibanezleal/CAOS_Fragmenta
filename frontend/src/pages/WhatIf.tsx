/**
 * What-if: change the design of the selected blast and watch every arm answer, live.
 *
 * The closed forms recompute in TypeScript; the fitted arms (network, kernels, forest, boosting,
 * stack, refit, transfer line) recompute from the case's own models file, the models fitted without
 * this case's campaign, walked exactly. The baked prediction for the unchanged blast and its measured
 * size stay on the chart as references, so a reader sees how far a change moves each arm and how far
 * each arm was from the measurement to begin with.
 *
 * A changed design has not been fired, so nothing here is a score. Leaving the training envelope is
 * flagged, input by input.
 */

import { useShellLang } from '@fasl-work/caos-app-shell';
import { useEffect, useMemo, useState } from 'react';

import { fittedArms, predictModel } from '../engine/learned';
import { degenerateReason, kuznetsovX50M, patternFromRatios, PLAUSIBLE_X50_M, publishedRegression, type LiveBlast } from '../engine/live';
import { ARM_BY_ID, FEATURE_LABEL, formatSize } from '../lib/artifacts';
import type { BlastRow, CaseArtifact, Lang } from '../lib/contract.types';
import { useModels } from '../lib/facts';
import { LineChart, type SeriesSpec } from '../viz/Charts';
import { Panel } from '../viz/Panels';

const FEATURES: (keyof LiveBlast)[] = ['S_over_B', 'H_over_B', 'B_over_D', 'T_over_B', 'Pf_kg_m3', 'XB_m', 'E_GPa'];

/** The training envelope, as the source paper's own summary table prints it. */
const ENVELOPE: Record<keyof LiveBlast, [number, number]> = {
  S_over_B: [1.0, 1.75],
  H_over_B: [1.33, 6.82],
  B_over_D: [17.98, 39.47],
  T_over_B: [0.5, 4.67],
  Pf_kg_m3: [0.22, 1.26],
  XB_m: [0.02, 2.35],
  E_GPa: [9.57, 60],
};

/** Slider ranges: wider than the envelope, so leaving it is possible and visible. */
const RANGE: Record<keyof LiveBlast, [number, number, number]> = {
  S_over_B: [0.8, 2.2, 0.01],
  H_over_B: [1, 8, 0.05],
  B_over_D: [15, 45, 0.1],
  T_over_B: [0.3, 5, 0.01],
  Pf_kg_m3: [0.15, 1.5, 0.01],
  XB_m: [0.02, 3, 0.01],
  E_GPa: [5, 70, 0.1],
};

const ROWS = [
  'kuznetsov',
  'kuznetsov-transfer',
  'published-regression',
  'refitted-regression',
  'published-neural-net',
  'svr-rbf',
  'random-forest',
  'xgboost',
  'stacking',
];

const label = (arm: string, lang: Lang) => ARM_BY_ID.get(arm)?.label[lang] ?? arm;

interface Answer {
  value: number | null;
  reason: string | null;
}

export function WhatIfTab({ artifact, blast }: { artifact: CaseArtifact; blast: BlastRow }) {
  const lang = useShellLang();
  const es = lang === 'es';
  const models = useModels(artifact.live_models?.scope ?? null);
  const base = useMemo(() => Object.fromEntries(FEATURES.map((k) => [k, blast.features[k]])) as unknown as LiveBlast, [blast]);
  const [design, setDesign] = useState<LiveBlast>(base);
  const [holeMm, setHoleMm] = useState<number>(blast.pattern?.hole_diameter_mm ?? 165);
  const [hover, setHover] = useState<string | null>(null);
  useEffect(() => {
    setDesign(base);
    setHoleMm(blast.pattern?.hole_diameter_mm ?? 165);
  }, [base, blast]);

  const outside = FEATURES.filter((k) => design[k] < ENVELOPE[k][0] || design[k] > ENVELOPE[k][1]);
  const degenerate = degenerateReason(design);

  const answers = useMemo(() => {
    const out: Record<string, Answer> = {};
    if (degenerate) {
      for (const arm of ROWS) out[arm] = { value: null, reason: degenerate };
      return out;
    }
    const pattern = patternFromRatios(design, holeMm);
    const plausible = (v: number): Answer =>
      Number.isFinite(v) && v >= PLAUSIBLE_X50_M[0] && v <= PLAUSIBLE_X50_M[1]
        ? { value: v, reason: null }
        : { value: null, reason: es ? 'fuera del rango plausible de tamaño' : 'outside the plausible size range' };
    out.kuznetsov =
      blast.rock_factor === null
        ? { value: null, reason: es ? 'sin factor de roca recuperado para este sitio' : 'no recovered rock factor for this site' }
        : plausible(kuznetsovX50M(pattern, blast.rock_factor));
    out['published-regression'] = plausible(publishedRegression(design).x50M);
    if (models) {
      const arms = fittedArms(models);
      const x = FEATURES.map((k) => design[k]);
      for (const name of ['refitted-regression', 'published-neural-net', 'svr-rbf', 'random-forest', 'xgboost', 'stacking']) {
        if (arms[name]) out[name] = predictModel(arms[name], x);
      }
      if (arms['kuznetsov-transfer']) {
        const factor = predictModel(arms['kuznetsov-transfer'], x).value;
        out['kuznetsov-transfer'] = factor === null ? { value: null, reason: 'no factor' } : plausible(kuznetsovX50M(pattern, factor));
      }
    }
    return out;
  }, [design, holeMm, models, blast, degenerate, es]);

  const measured = blast.x50_measured_m;
  const values = ROWS.flatMap((arm) => [answers[arm]?.value, artifact.predictions[arm]?.[blast.blast_id]?.x50_m]).filter(
    (v): v is number => typeof v === 'number',
  );
  if (measured) values.push(measured);
  const hi = Math.max(0.1, ...values) * 1.1;
  const W = 720;
  const L = 230;
  const R = 700;
  const rowH = 26;
  const H = 16 + ROWS.length * rowH + 26;
  const x = (v: number) => L + (Math.min(v, hi) / hi) * (R - L);
  const ticks = [0, hi / 4, hi / 2, (3 * hi) / 4].map((t) => Math.round(t * 100) / 100);
  const active = hover ? { arm: hover, live: answers[hover], baked: artifact.predictions[hover]?.[blast.blast_id] } : null;

  return (
    <div className="fr-grid fr-grid-2">
      <div className="fr-stage">
        <h3 className="fr-stage-title">
          {es ? `Cada brazo sobre su diseño modificado de ${blast.blast_id}` : `Every arm on your modified design of ${blast.blast_id}`}
        </h3>
        <ul className="fr-legend">
          <li><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill="var(--color-accent)" /></svg>{es ? 'su diseño, en vivo' : 'your design, live'}</li>
          <li><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4.5" fill="none" stroke="var(--color-fg-subtle)" strokeWidth="1.5" /></svg>{es ? 'el tiro sin cambios, horneado' : 'the unchanged blast, baked'}</li>
          {measured ? <li><svg width="14" height="12" aria-hidden="true"><line x1="7" y1="0" x2="7" y2="12" stroke="var(--color-good)" strokeWidth="2" /></svg>{es ? `medido: ${formatSize(measured)}` : `measured: ${formatSize(measured)}`}</li> : null}
        </ul>
        <svg viewBox={`0 0 ${W} ${H}`} className="fr-svg" role="img" aria-label={es ? 'Predicciones en vivo' : 'Live predictions'} data-chart="whatif" data-chart-rows={ROWS.filter((a) => answers[a]?.value !== undefined).length} onPointerLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={x(t)} y1={10} x2={x(t)} y2={16 + ROWS.length * rowH} stroke="var(--color-border)" strokeDasharray="2 4" />
              <text x={x(t)} y={16 + ROWS.length * rowH + 16} fill="var(--color-fg-subtle)" fontSize={11} textAnchor="middle">{`${Math.round(t * 100)} cm`}</text>
            </g>
          ))}
          {measured ? <line x1={x(measured)} y1={10} x2={x(measured)} y2={16 + ROWS.length * rowH} stroke="var(--color-good)" strokeWidth={2} /> : null}
          {ROWS.map((arm, i) => {
            const cy = 16 + i * rowH + rowH / 2;
            const live = answers[arm];
            const baked = artifact.predictions[arm]?.[blast.blast_id]?.x50_m;
            return (
              <g key={arm} onPointerEnter={() => setHover(arm)}>
                <rect x={0} y={cy - rowH / 2} width={W} height={rowH} fill={hover === arm ? 'var(--color-accent-soft)' : 'transparent'} />
                <text x={L - 10} y={cy + 4} fill="var(--color-fg)" fontSize={11.5} textAnchor="end">{label(arm, lang)}</text>
                {typeof baked === 'number' ? <circle cx={x(baked)} cy={cy} r={5} fill="none" stroke="var(--color-fg-subtle)" strokeWidth={1.5} /> : null}
                {live?.value !== null && live?.value !== undefined ? (
                  <circle cx={x(live.value)} cy={cy} r={5.5} fill="var(--color-accent)" />
                ) : (
                  <text x={L + 6} y={cy + 4} fill="var(--color-fg-faint)" fontSize={10.5}>{live ? (es ? 'se abstiene' : 'abstains') : es ? 'cargando' : 'loading'}</text>
                )}
              </g>
            );
          })}
        </svg>
        <div className="fr-readout">
          {active ? (
            <>
              <b>{label(active.arm, lang)}</b>
              {' · '}
              {es ? 'en vivo' : 'live'}: {active.live?.value !== null && active.live?.value !== undefined ? formatSize(active.live.value) : active.live?.reason ?? 'n/a'}
              {' · '}
              {es ? 'horneado' : 'baked'}: {formatSize(active.baked?.x50_m)}
            </>
          ) : (
            <span className="fr-fine">{es ? 'Pase el puntero sobre una fila para leer sus valores.' : 'Point at a row to read its values.'}</span>
          )}
        </div>
        {outside.length ? (
          <p className="fr-note fr-note-warn">
            {es
              ? `Fuera de la envolvente de entrenamiento: ${outside.map((k) => FEATURE_LABEL[k]?.es ?? k).join(', ')}. Toda predicción aquí es una extrapolación.`
              : `Outside the training envelope: ${outside.map((k) => FEATURE_LABEL[k]?.en ?? k).join(', ')}. Every prediction here is an extrapolation.`}
          </p>
        ) : null}
        {degenerate ? <p className="fr-note fr-note-warn">{degenerate}</p> : null}
        <VariantResponse artifact={artifact} />
      </div>
      <div className="fr-side">
        <Panel
          id="design"
          title={es ? 'Su diseño' : 'Your design'}
          note={
            es
              ? `Los modelos aprendidos de este caso se ajustaron ${artifact.provenance.held_out_site ? `sin ${artifact.provenance.held_out_site}` : 'con todo el corpus'}.`
              : `This case’s learned models were fitted ${artifact.provenance.held_out_site ? `without ${artifact.provenance.held_out_site}` : 'on the whole corpus'}.`
          }
        >
          {FEATURES.map((k) => {
            const [min, max, step] = RANGE[k];
            const out = design[k] < ENVELOPE[k][0] || design[k] > ENVELOPE[k][1];
            return (
              <label key={k} className={`fr-control${out ? ' fr-control-out' : ''}`}>
                {FEATURE_LABEL[k]?.[lang] ?? k}
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={design[k]}
                  onChange={(e) => setDesign({ ...design, [k]: Number(e.target.value) })}
                />
                <output>{design[k].toFixed(2)}</output>
              </label>
            );
          })}
          <label className="fr-control">
            {es ? 'Diámetro de perforación, mm' : 'Hole diameter, mm'}
            <input type="range" min={76} max={250} step={1} value={holeMm} onChange={(e) => setHoleMm(Number(e.target.value))} />
            <output>{holeMm} mm</output>
          </label>
          <button type="button" className="fr-button" onClick={() => { setDesign(base); setHoleMm(blast.pattern?.hole_diameter_mm ?? 165); }}>
            {es ? 'Volver al tiro medido' : 'Back to the measured blast'}
          </button>
        </Panel>
        <Panel id="whatif-read" title={es ? 'Cómo leerlo' : 'How to read it'}>
          <p className="fr-note">
            {es
              ? 'Un diseño cambiado no se ha disparado, así que nada aquí es un puntaje. Lo que muestra es cuánto mueve cada brazo un cambio y en qué dirección; más explosivo debería predecir roca más fina y un bordo mayor, más gruesa. Los modelos aprendidos son los ajustados para este caso, recorridos exactamente; cuánto valen en una mina nueva lo dice Benchmark.'
              : 'A changed design has not been fired, so nothing here is a score. What it shows is how far a change moves each arm and in which direction; more explosive should predict finer rock and a wider burden coarser rock. The learned models are the ones fitted for this case, walked exactly; what they are worth at a new mine is on Benchmark.'}
          </p>
        </Panel>
      </div>
    </div>
  );
}

/** The baked response of each arm to the case's variants: one lever moved at a time. */
function VariantResponse({ artifact }: { artifact: CaseArtifact }) {
  const lang = useShellLang();
  const es = lang === 'es';
  const [arm, setArm] = useState('kuznetsov');
  const curves = artifact.variant_curves[arm] ?? {};
  const variants = artifact.variants;
  const series: SeriesSpec[] = [
    { id: 'response', label: es ? 'tamaño medio predicho, horneado' : 'predicted mean size, baked', values: variants.map((v) => curves[v.id] ?? null) },
  ];
  const arms = Object.keys(artifact.variant_curves).filter((a) => ROWS.includes(a));
  return (
    <>
      <h3 className="fr-stage-title">{es ? 'Una palanca por vez, horneado' : 'One lever at a time, baked'}</h3>
      <label className="fr-control fr-control-inline">
        {es ? 'Brazo' : 'Arm'}
        <select value={arm} onChange={(e) => setArm(e.target.value)}>
          {arms.map((a) => (
            <option key={a} value={a}>{label(a, lang)}</option>
          ))}
        </select>
      </label>
      <LineChart
        x={variants.map((_, i) => i)}
        series={series}
        xLabel={es ? 'variante' : 'variant'}
        yLabel="x50"
        xTickFormat={(v) => variants[Math.round(v)]?.label[lang] ?? ''}
        valueFormat={(v) => formatSize(v)}
        height={240}
      />
    </>
  );
}
