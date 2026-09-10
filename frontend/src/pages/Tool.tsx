/**
 * The App route: one selected case, fully interactive.
 *
 * Six sibling tabs, grouped by the QUESTION rather than by the method list, because thirteen arms as
 * thirteen tabs is a list rather than an architecture. The arms are reached from a selector inside
 * the tabs that need one.
 *
 * Anything that summarises ACROSS cases belongs on Experiments or Benchmark, not here. A workbench
 * that answers "across all campaigns" has stopped being a workbench.
 */

import { CaseSelector, Tabs, useShellLang, type CaseDef, type TabDef } from '@fasl-work/caos-app-shell';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import {
  ARMS,
  ARM_BY_ID,
  CATEGORY_LABEL,
  FEATURE_LABEL,
  formatScore,
  formatSize,
  loadCase,
  loadIndex,
  TIER_LABEL,
  TIER_ORDER,
} from '../lib/artifacts';
import type { BlastRow, CaseArtifact, CaseIndex, Lang } from '../lib/contract.types';
import {
  crushZone,
  degenerateReason,
  kuznetsovX50M,
  passingAt,
  percentile,
  publishedRegression,
  rosinRammler,
  sieveGrid,
  swebrec,
  uniformityIndex,
  type LiveBlast,
} from '../engine/live';
import { BenchView3D } from '../viz/BenchView3D';
import { DistributionChart, LineChart, ParityChart, type SeriesSpec } from '../viz/Charts';
import {
  AbstentionPanel,
  DecisionPanel,
  Panel,
  ProvenancePanel,
  ScorePanel,
  SimulationSpread,
  TabBoundary,
  TierBadge,
} from '../viz/Panels';

const DEFAULT_CASE = 'real-murgul';

export default function Tool() {
  const lang = useShellLang();
  const [params, setParams] = useSearchParams();
  const [index, setIndex] = useState<CaseIndex | null>(null);
  const [artifact, setArtifact] = useState<CaseArtifact | null>(null);
  const [error, setError] = useState<string | null>(null);

  const caseId = params.get('case') ?? DEFAULT_CASE;
  const [armId, setArmId] = useState('published-regression');
  const [selectedBlast, setSelectedBlast] = useState<string | null>(null);

  useEffect(() => {
    loadIndex().then(setIndex).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    setArtifact(null);
    loadCase(caseId)
      .then((loaded) => {
        setArtifact(loaded);
        setSelectedBlast(loaded.representative_blast_id);
      })
      .catch((e) => setError(String(e)));
  }, [caseId]);

  const selectCase = useCallback(
    (next: string) => {
      const updated = new URLSearchParams(params);
      updated.set('case', next);
      setParams(updated, { replace: false });
    },
    [params, setParams],
  );

  if (error) {
    return (
      <div className="fr-error" role="alert">
        <h2>{lang === 'es' ? 'No se pudieron cargar los artefactos' : 'The artifacts did not load'}</h2>
        <p>{error}</p>
      </div>
    );
  }
  if (!index || !artifact) {
    return <div className="fr-loading">{lang === 'es' ? 'Cargando' : 'Loading'}</div>;
  }

  const cases: CaseDef[] = index.cases.map((entry) => ({
    id: entry.case_id,
    name: entry.title[lang],
    category: CATEGORY_LABEL[entry.category]?.[lang] ?? entry.category,
    kind: entry.real_or_synthetic === 'real' ? 'real' : 'synthetic',
    expectedBand: entry.title[lang],
  }));

  const blast = artifact.blasts.find((b) => b.blast_id === selectedBlast) ?? artifact.blasts[0];

  const tabs: TabDef[] = [
    {
      id: 'predict',
      label: lang === 'es' ? 'Predecir' : 'Predict',
      content: (
        <TabBoundary id="predict">
          <PredictTab
            artifact={artifact}
            armId={armId}
            onArm={setArmId}
            selectedBlast={selectedBlast}
            onSelectBlast={setSelectedBlast}
          />
        </TabBoundary>
      ),
    },
    {
      id: 'distribution',
      label: lang === 'es' ? 'Distribución' : 'Distribution',
      content: (
        <TabBoundary id="distribution"><DistributionTab blast={blast} /></TabBoundary>
      ),
    },
    {
      id: 'bench',
      label: lang === 'es' ? 'Banco' : 'Bench',
      content: (
        <TabBoundary id="bench"><BenchTab artifact={artifact} blast={blast} onSelectBlast={setSelectedBlast} /></TabBoundary>
      ),
    },
    {
      id: 'rock',
      label: lang === 'es' ? 'Roca' : 'Rock',
      content: (
        <TabBoundary id="rock"><RockTab blast={blast} /></TabBoundary>
      ),
    },
    {
      id: 'explain',
      label: lang === 'es' ? 'Explicar' : 'Explain',
      content: (
        <TabBoundary id="explain"><ExplainTab artifact={artifact} armId={armId} /></TabBoundary>
      ),
    },
    {
      id: 'decide',
      label: lang === 'es' ? 'Decidir' : 'Decide',
      content: (
        <TabBoundary id="decide"><DecideTab artifact={artifact} blast={blast} armId={armId} /></TabBoundary>
      ),
    },
  ];

  return (
    <div className="fr-layout">
      <aside className="fr-rail">
        <CaseSelector cases={cases} selectedId={caseId} onSelect={selectCase} lang={lang} />
        <CaseCard artifact={artifact} lang={lang} />
        <ArmSelector armId={armId} onArm={setArmId} artifact={artifact} />
        <ProvenancePanel artifact={artifact} />
        <Link className="fr-focus-link" to={`/focus/${artifact.case.id}`}>
          {lang === 'es' ? 'Abrir en pantalla completa' : 'Open the full-screen view'}
        </Link>
      </aside>
      <main className="fr-main">
        <Tabs tabs={tabs} ariaLabel="workbench views" />
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------- */

function CaseCard({ artifact, lang }: { artifact: CaseArtifact; lang: Lang }) {
  const controls = Object.entries(artifact.controls);
  return (
    <section className="fr-panel fr-panel-case">
      <h3>{artifact.case.title[lang]}</h3>
      <p className="fr-case-reason">{artifact.case.reason[lang]}</p>
      <dl className="fr-kv">
        <dt>{lang === 'es' ? 'Categoría' : 'Category'}</dt>
        <dd>{CATEGORY_LABEL[artifact.case.category]?.[lang] ?? artifact.case.category}</dd>
        <dt>{lang === 'es' ? 'Tiros' : 'Blasts'}</dt>
        <dd>{artifact.blasts.length}</dd>
        <dt>{lang === 'es' ? 'Esperado' : 'Expected'}</dt>
        <dd className="fr-fine">{artifact.case.expected_band}</dd>
      </dl>
      {controls.length ? (
        <ul className="fr-controls">
          {controls.map(([name, block]) => (
            <li key={name} className={block.passed ? 'fr-ok' : 'fr-bad'}>
              {block.passed ? 'PASS' : 'FAIL'} {name.replace(/_/g, ' ')}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/**
 * A categorised one-of-N, so it is a select with option groups rather than thirteen buttons under
 * five headings. Thirteen buttons is a list; this is a control.
 */
function ArmSelector({
  armId,
  onArm,
  artifact,
}: {
  armId: string;
  onArm: (id: string) => void;
  artifact: CaseArtifact;
}) {
  const lang = useShellLang();
  const available = new Set(Object.keys(artifact.predictions));
  const arm = ARM_BY_ID.get(armId);
  return (
    <section className="fr-panel">
      <h3>{lang === 'es' ? 'Modelo' : 'Model'}</h3>
      <select
        className="fr-select"
        value={armId}
        onChange={(e) => onArm(e.target.value)}
        aria-label={lang === 'es' ? 'Modelo' : 'Model'}
      >
        {TIER_ORDER.map((tier) => {
          const inTier = ARMS.filter((a) => a.tier === tier && available.has(a.id));
          if (!inTier.length) return null;
          return (
            <optgroup key={tier} label={TIER_LABEL[tier][lang]}>
              {inTier.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label[lang]}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
      {arm ? (
        <>
          <TierBadge tier={arm.tier} />
          <p className="fr-note">{arm.blurb[lang]}</p>
          <p className="fr-fine">{arm.source}</p>
        </>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* Predict                                                                                       */
/* ------------------------------------------------------------------------------------------- */

function PredictTab({
  artifact,
  armId,
  onArm,
  selectedBlast,
  onSelectBlast,
}: {
  artifact: CaseArtifact;
  armId: string;
  onArm: (id: string) => void;
  selectedBlast: string | null;
  onSelectBlast: (id: string) => void;
}) {
  const lang = useShellLang();
  const row = artifact.predictions[armId] ?? {};
  const score = artifact.scores[armId];
  const nullScore = artifact.scores.null;

  const points = artifact.blasts
    .filter((b) => b.x50_measured_m !== null && row[b.blast_id]?.x50_m !== null)
    .map((b) => ({
      blastId: b.blast_id,
      site: b.site,
      measuredM: b.x50_measured_m as number,
      predictedM: row[b.blast_id].x50_m as number,
      extrapolated: row[b.blast_id].extrapolated,
    }));

  const selectedCell = selectedBlast ? row[selectedBlast] : undefined;

  return (
    <div className="fr-grid fr-grid-2">
      <div className="fr-stage">
        <h3 className="fr-stage-title">
          {lang === 'es' ? 'Predicho contra medido' : 'Predicted against measured'}
        </h3>
        {points.length >= 2 ? (
          <ParityChart
            points={points}
            nullMeanM={artifact.null_mean_m}
            selected={selectedBlast}
            onSelect={onSelectBlast}
            height={340}
          />
        ) : (
          <p className="fr-note">
            {lang === 'es'
              ? 'Este caso no tiene mediciones que graficar, o el modelo se abstiene en todas ellas. Es un estudio de diseño, no una puntuación.'
              : 'This case has no measurements to plot, or the model abstains on all of them. It is a design study rather than a score.'}
          </p>
        )}
        <ArmComparison artifact={artifact} armId={armId} onArm={onArm} />
      </div>
      <div className="fr-side">
        {score ? (
          <ScorePanel
            score={score}
            nullScore={nullScore}
            title={lang === 'es' ? 'Puntaje en este caso' : 'Score on this case'}
          />
        ) : null}
        {selectedCell ? <SimulationSpread cell={selectedCell} /> : null}
        <AbstentionPanel artifact={artifact} arm={armId} />
      </div>
    </div>
  );
}

/** Every arm on this case at a glance, so the selector is a filter rather than a hiding place. */
function ArmComparison({
  artifact,
  armId,
  onArm,
}: {
  artifact: CaseArtifact;
  armId: string;
  onArm: (id: string) => void;
}) {
  const lang = useShellLang();
  const rows = ARMS.filter((a) => artifact.scores[a.id]?.scoreable).sort(
    (a, b) =>
      (artifact.scores[b.id].r2_identity ?? -99) - (artifact.scores[a.id].r2_identity ?? -99),
  );
  if (!rows.length) return null;
  return (
    <div className="fr-armtable">
      <h4>{lang === 'es' ? 'Todos los modelos en este caso' : 'Every model on this case'}</h4>
      <table className="fr-table">
        <thead>
          <tr>
            <th>{lang === 'es' ? 'modelo' : 'model'}</th>
            <th>{lang === 'es' ? 'nivel' : 'tier'}</th>
            <th title="variance explained about the identity line">
              {lang === 'es' ? 'var. explicada' : 'variance explained'}
            </th>
            <th title="the square of the correlation, which is what the source papers report">
              {lang === 'es' ? 'corr. cuadrada' : 'squared corr.'}
            </th>
            <th>RMSE</th>
            <th>{lang === 'es' ? 'abst.' : 'abst.'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((arm) => {
            const score = artifact.scores[arm.id];
            return (
              <tr
                key={arm.id}
                className={arm.id === armId ? 'fr-row-selected' : ''}
                onClick={() => onArm(arm.id)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onArm(arm.id);
                }}
                role="button"
              >
                <td>{arm.label[lang]}</td>
                <td>
                  <TierBadge tier={arm.tier} />
                </td>
                <td className={(score.r2_identity ?? 0) > 0 ? 'fr-ok' : 'fr-bad'}>
                  {formatScore(score.r2_identity)}
                </td>
                <td>{formatScore(score.pearson_r2)}</td>
                <td>{formatSize(score.rmse_m)}</td>
                <td>{score.n_abstained ?? 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="fr-fine">
        {lang === 'es'
          ? 'Las dos columnas de varianza son cantidades distintas y en el conjunto de validación publicado difieren por un factor de dos y medio para el modelo clásico.'
          : 'The two variance columns are different quantities, and on the published hold-out they differ by a factor of two and a half for the classical model.'}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* Distribution                                                                                  */
/* ------------------------------------------------------------------------------------------- */

function DistributionTab({ blast }: { blast: BlastRow }) {
  const lang = useShellLang();
  const [undulation, setUndulation] = useState(2);
  const [finesFraction, setFinesFraction] = useState(0.05);

  const live = useMemo(() => {
    if (!blast.pattern || !blast.rock_factor) return null;
    const pattern = {
      burdenM: blast.pattern.burden_m,
      spacingM: blast.pattern.spacing_m,
      benchHeightM: blast.pattern.bench_height_m,
      stemmingM: blast.pattern.stemming_m,
      holeDiameterMm: blast.pattern.hole_diameter_mm,
      powderFactor: blast.features.Pf_kg_m3,
    };
    const x50 = kuznetsovX50M(pattern, blast.rock_factor);
    const n = uniformityIndex(pattern);
    const grid = sieveGrid();
    const xMax = Math.max(pattern.burdenM, pattern.spacingM);
    return {
      grid,
      x50,
      n,
      classical: rosinRammler(x50, n, grid),
      three: swebrec(x50, xMax, undulation, grid),
      crush: crushZone(x50, n, { crossoverM: 0.01, finesUniformity: 0.8, finesFraction }, grid),
    };
  }, [blast, undulation, finesFraction]);

  if (!live) {
    return (
      <Panel id="no-distribution" title={lang === 'es' ? 'Sin distribución' : 'No distribution'}>
        <p className="fr-note fr-note-warn">
          {blast.geometry_reason ??
            blast.degenerate_reason ??
            (lang === 'es'
              ? 'Este tiro no tiene geometría absoluta ni factor de roca, así que ningún modelo de distribución puede correr sobre el.'
              : 'This blast has neither an absolute geometry nor a rock factor, so no distribution model can run on it.')}
        </p>
      </Panel>
    );
  }

  const series: SeriesSpec[] = [
    { id: 'classical', label: lang === 'es' ? 'Clásica' : 'Classical', values: live.classical.passing },
    {
      id: 'three',
      label: lang === 'es' ? 'Tres parámetros' : 'Three-parameter',
      values: live.three.passing,
    },
    {
      id: 'crush',
      label: lang === 'es' ? 'Zona triturada' : 'Crush zone',
      values: live.crush.passing,
      dashed: true,
    },
  ];

  const p80 = percentile(live.classical.passing, live.grid, 0.8);
  const p20 = percentile(live.classical.passing, live.grid, 0.2);

  return (
    <div className="fr-grid fr-grid-2">
      <div className="fr-stage">
        <h3 className="fr-stage-title">
          {lang === 'es' ? 'Curva granulométrica' : 'Fragment-size distribution'} · {blast.blast_id}
        </h3>
        <DistributionChart
          sizesM={live.grid}
          series={series}
          markers={[
            { fraction: 0.2, label: 'P20' },
            { fraction: 0.5, label: 'P50' },
            { fraction: 0.8, label: 'P80' },
          ]}
          measured={
            blast.x50_measured_m !== null
              ? [{ sizeM: blast.x50_measured_m, passing: 0.5 }]
              : []
          }
          height={360}
        />
        <p className="fr-fine">
          {lang === 'es'
            ? 'El punto rojo es el tamaño medio medido de este tiro, en el 50 por ciento pasante por definición. La curva completa medida no se publica en la fuente.'
            : 'The red point is this blast’s measured mean size, at 50 percent passing by definition. The full measured curve is not published in the source.'}
        </p>
      </div>
      <div className="fr-side">
        <Panel id="readouts" title={lang === 'es' ? 'Lecturas' : 'Readouts'}>
          <dl className="fr-kv">
            <dt>P20</dt>
            <dd>{formatSize(p20)}</dd>
            <dt>P50</dt>
            <dd>{formatSize(live.x50)}</dd>
            <dt>P80</dt>
            <dd>{formatSize(p80)}</dd>
            <dt>{lang === 'es' ? 'Índice de uniformidad' : 'Uniformity index'}</dt>
            <dd>{live.n.toFixed(3)}</dd>
            <dt>{lang === 'es' ? 'Medido' : 'Measured'}</dt>
            <dd>{formatSize(blast.x50_measured_m)}</dd>
          </dl>
          {live.n < 0.7 ? (
            <p className="fr-note fr-note-warn">
              {lang === 'es'
                ? `El indice cae bajo la banda usual de 0.7 a 2. En este tiro el taco ocupa ${((blast.features.T_over_B / blast.features.H_over_B) * 100).toFixed(0)} por ciento del barreno, asi que la columna de carga es corta.`
                : `The index falls below the usual band of 0.7 to 2. On this blast the stemming takes ${((blast.features.T_over_B / blast.features.H_over_B) * 100).toFixed(0)} percent of the hole, so the charge column is short.`}
            </p>
          ) : null}
        </Panel>
        <Panel
          id="unpublished-parameters"
          title={lang === 'es' ? 'Parámetros no publicados' : 'Unpublished parameters'}
          note={
            lang === 'es'
              ? 'Ninguna fuente consultada publica estos valores. Son suyos, y la curva cambia con ellos.'
              : 'No source held for this work publishes these values. They are yours, and the curve moves with them.'
          }
        >
          <label className="fr-control">
            {lang === 'es' ? 'Ondulación (tres parámetros)' : 'Undulation (three-parameter)'}
            <input
              type="range"
              min={1}
              max={4}
              step={0.1}
              value={undulation}
              onChange={(e) => setUndulation(Number(e.target.value))}
            />
            <output>{undulation.toFixed(1)}</output>
          </label>
          <label className="fr-control">
            {lang === 'es' ? 'Fracción de finos (zona triturada)' : 'Fines fraction (crush zone)'}
            <input
              type="range"
              min={0}
              max={0.25}
              step={0.01}
              value={finesFraction}
              onChange={(e) => setFinesFraction(Number(e.target.value))}
            />
            <output>{(finesFraction * 100).toFixed(0)}%</output>
          </label>
        </Panel>
        <Panel id="fines" title={lang === 'es' ? 'Finos' : 'Fines'}>
          <dl className="fr-kv">
            <dt>{lang === 'es' ? 'Pasa 10 mm, clásica' : 'Passing 10 mm, classical'}</dt>
            <dd>{(passingAt(live.classical, 0.01) * 100).toFixed(2)}%</dd>
            <dt>{lang === 'es' ? 'Pasa 10 mm, tres parámetros' : 'Passing 10 mm, three-parameter'}</dt>
            <dd>{(passingAt(live.three, 0.01) * 100).toFixed(2)}%</dd>
            <dt>{lang === 'es' ? 'Pasa 10 mm, zona triturada' : 'Passing 10 mm, crush zone'}</dt>
            <dd>{(passingAt(live.crush, 0.01) * 100).toFixed(2)}%</dd>
          </dl>
          <p className="fr-fine">
            {lang === 'es'
              ? 'La subestimación de finos es la falla mejor documentada del modelo clásico, y es exactamente lo que las otras dos curvas existen para corregir.'
              : 'Under-predicting fines is the classical model’s best-documented failure, and correcting it is exactly why the other two curves exist.'}
          </p>
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* Bench                                                                                         */
/* ------------------------------------------------------------------------------------------- */

function BenchTab({
  artifact,
  blast,
  onSelectBlast,
}: {
  artifact: CaseArtifact;
  blast: BlastRow;
  onSelectBlast: (id: string) => void;
}) {
  const lang = useShellLang();
  const [tieIn, setTieIn] = useState<'row-by-row' | 'v-cut' | 'reverse'>('row-by-row');
  const [delayMs, setDelayMs] = useState(8);
  const report = artifact.geometry_report[artifact.case.site ?? ''];

  return (
    <div className="fr-grid fr-grid-2">
      <div className="fr-stage">
        <h3 className="fr-stage-title">
          {lang === 'es' ? 'El banco reconstruido' : 'The reconstructed bench'} · {blast.blast_id}
        </h3>
        {blast.pattern ? (
          <BenchView3D pattern={blast.pattern} delayMs={delayMs} tieIn={tieIn} height={400} />
        ) : (
          <p className="fr-note fr-note-warn">
            {blast.geometry_reason ??
              (lang === 'es'
                ? 'Sin geometría absoluta no hay banco que dibujar.'
                : 'With no absolute geometry there is no bench to draw.')}
          </p>
        )}
      </div>
      <div className="fr-side">
        <Panel id="blast" title={lang === 'es' ? 'Tiro' : 'Blast'}>
          <select
            className="fr-select"
            value={blast.blast_id}
            onChange={(e) => onSelectBlast(e.target.value)}
            aria-label={lang === 'es' ? 'Tiro' : 'Blast'}
          >
            {artifact.blasts.map((b) => (
              <option key={b.blast_id} value={b.blast_id}>
                {b.blast_id}
                {b.x50_measured_m !== null ? ` · ${formatSize(b.x50_measured_m)}` : ''}
              </option>
            ))}
          </select>
        </Panel>
        <Panel
          id="initiation"
          title={lang === 'es' ? 'Iniciación' : 'Initiation'}
          note={
            lang === 'es'
              ? 'Estos controles mueven la animación y no mueven ninguna predicción.'
              : 'These controls move the animation and move no prediction.'
          }
        >
          <label className="fr-control">
            {lang === 'es' ? 'Amarre' : 'Tie-in'}
            <select
              className="fr-select"
              value={tieIn}
              onChange={(e) => setTieIn(e.target.value as typeof tieIn)}
            >
              <option value="row-by-row">{lang === 'es' ? 'fila por fila' : 'row by row'}</option>
              <option value="v-cut">{lang === 'es' ? 'corte en V' : 'V-cut'}</option>
              <option value="reverse">{lang === 'es' ? 'invertido' : 'reversed'}</option>
            </select>
          </label>
          <label className="fr-control">
            {lang === 'es' ? 'Retardo entre barrenos, ms' : 'Inter-hole delay, ms'}
            <input
              type="range"
              min={1}
              max={40}
              step={1}
              value={delayMs}
              onChange={(e) => setDelayMs(Number(e.target.value))}
            />
            <output>{delayMs} ms</output>
          </label>
        </Panel>
        {report?.checks?.length ? (
          <Panel
            id="geometry-recovery"
            title={lang === 'es' ? 'Cómo se recuperó esta geometría' : 'How this geometry was recovered'}
          >
            <p className="fr-note">
              {lang === 'es'
                ? `El diametro de ${report.hole_diameter_mm} mm viene de la prosa de la fuente. Todo lo demas se deduce de las razones publicadas, y se verifica contra lo que la misma prosa declara.`
                : `The ${report.hole_diameter_mm} mm diameter comes from the source’s own prose. Everything else follows from the published ratios, and is checked against what the same prose states.`}
            </p>
            <table className="fr-table fr-table-compact">
              <thead>
                <tr>
                  <th>{lang === 'es' ? 'cantidad' : 'quantity'}</th>
                  <th>{lang === 'es' ? 'declarado' : 'stated'}</th>
                  <th>{lang === 'es' ? 'reconstruido' : 'reconstructed'}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {report.checks.map((check) => (
                  <tr key={check.quantity}>
                    <td>{check.quantity.replace(/_m$/, '').replace(/_/g, ' ')}</td>
                    <td>
                      {check.stated[0]} to {check.stated[1]} m
                    </td>
                    <td>
                      {check.reconstructed[0]} to {check.reconstructed[1]} m
                    </td>
                    <td className={check.ok ? 'fr-ok' : 'fr-bad'}>{check.ok ? 'PASS' : 'FAIL'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* Rock                                                                                          */
/* ------------------------------------------------------------------------------------------- */

function RockTab({ blast }: { blast: BlastRow }) {
  const lang = useShellLang();
  const [ucs, setUcs] = useState(80);
  const [density, setDensity] = useState(2.7);
  const [jointSpacing, setJointSpacing] = useState(0.6);

  // The two published rating tables, computed live so the disagreement is a thing you can move
  // rather than a sentence you have to take on trust.
  const rmd = 20;
  const jps = jointSpacing < 0.1 ? 10 : jointSpacing <= 1 ? 20 : 50;
  const jpo = 30;
  const rdi = 25 * density - 50;
  const strengthA = 0.05 * ucs;
  const strengthB = ucs / (blast.features.E_GPa < 50 ? 3 : 5);
  const biA = 0.5 * (rmd + jps + jpo + rdi + strengthA);
  const biB = 0.5 * (rmd + jps + jpo + rdi + strengthB);
  const factorA = 0.06 * biA;
  const factorB = 0.06 * biB;
  const recovered = blast.rock_factor;

  const liveBlast: LiveBlast = blast.features;
  const group = publishedRegression(liveBlast).group;

  return (
    <div className="fr-grid fr-grid-2">
      <div className="fr-stage">
        <h3 className="fr-stage-title">
          {lang === 'es' ? 'El factor de roca, y su desacuerdo' : 'The rock factor, and its disagreement'}
        </h3>
        <p className="fr-note">
          {lang === 'es'
            ? 'Dos fuentes primarias publican tablas de calificación bajo la misma atribución, y no son la misma tabla. El término de resistencia difiere por un factor de seis. Mueva los controles y vea cuánto se separan.'
            : 'Two primary sources publish rating tables under the same attribution, and they are not the same table. The strength term differs by a factor of six. Move the controls and watch them separate.'}
        </p>
        <div className="fr-rockcompare">
          <RockCard
            title={lang === 'es' ? 'Esquema A' : 'Scheme A'}
            subtitle="strength = 0.05 x UCS"
            index={biA}
            factor={factorA}
          />
          <RockCard
            title={lang === 'es' ? 'Esquema B' : 'Scheme B'}
            subtitle={`strength = UCS / ${blast.features.E_GPa < 50 ? 3 : 5}`}
            index={biB}
            factor={factorB}
          />
          <RockCard
            title={lang === 'es' ? 'Recuperado' : 'Recovered'}
            subtitle={lang === 'es' ? 'de las predicciones publicadas' : 'from the published predictions'}
            index={null}
            factor={recovered}
            highlight
          />
        </div>
        <p className="fr-note fr-note-warn">
          {lang === 'es'
            ? `Los dos esquemas publicados difieren en ${Math.abs(factorA - factorB).toFixed(2)} en el factor de roca sobre esta misma roca. El tamano predicho es lineal en ese factor.`
            : `The two published schemes differ by ${Math.abs(factorA - factorB).toFixed(2)} in the rock factor on this same rock. Predicted size is linear in that factor.`}
        </p>
      </div>
      <div className="fr-side">
        <Panel
          id="rock-description"
          title={lang === 'es' ? 'Descripción de la roca' : 'Rock description'}
          note={
            lang === 'es'
              ? 'El corpus publica solo el módulo y el tamaño de bloque, así que estos otros valores son suyos. Ningún esquema los inventa: si faltan, se niega a calcular.'
              : 'The corpus publishes only the modulus and the block size, so these other values are yours. No scheme invents them: if they are missing it refuses to compute.'
          }
        >
          <label className="fr-control">
            UCS, MPa
            <input type="range" min={10} max={250} step={5} value={ucs} onChange={(e) => setUcs(Number(e.target.value))} />
            <output>{ucs}</output>
          </label>
          <label className="fr-control">
            {lang === 'es' ? 'Densidad, t/m3' : 'Density, t/m3'}
            <input type="range" min={1.8} max={3.5} step={0.05} value={density} onChange={(e) => setDensity(Number(e.target.value))} />
            <output>{density.toFixed(2)}</output>
          </label>
          <label className="fr-control">
            {lang === 'es' ? 'Espaciamiento de juntas, m' : 'Joint spacing, m'}
            <input type="range" min={0.02} max={2} step={0.02} value={jointSpacing} onChange={(e) => setJointSpacing(Number(e.target.value))} />
            <output>{jointSpacing.toFixed(2)}</output>
          </label>
        </Panel>
        <Panel id="corpus-publishes" title={lang === 'es' ? 'Lo que el corpus sí publica' : 'What the corpus does publish'}>
          <dl className="fr-kv">
            {(Object.keys(blast.features) as (keyof typeof blast.features)[]).map((key) => (
              <FeatureRow key={key} name={key} value={blast.features[key]} lang={lang} />
            ))}
            <dt>{lang === 'es' ? 'Grupo de rigidez' : 'Stiffness group'}</dt>
            <dd>
              {group === 1
                ? lang === 'es'
                  ? '1, módulo alto'
                  : '1, high modulus'
                : lang === 'es'
                  ? '2, módulo bajo'
                  : '2, low modulus'}
            </dd>
          </dl>
        </Panel>
      </div>
    </div>
  );
}

function FeatureRow({ name, value, lang }: { name: string; value: number; lang: Lang }) {
  return (
    <>
      <dt>{FEATURE_LABEL[name]?.[lang] ?? name}</dt>
      <dd>{value.toFixed(name === 'B_over_D' || name === 'E_GPa' ? 2 : 3)}</dd>
    </>
  );
}

function RockCard({
  title,
  subtitle,
  index,
  factor,
  highlight,
}: {
  title: string;
  subtitle: string;
  index: number | null;
  factor: number | null;
  highlight?: boolean;
}) {
  return (
    <div className={`fr-rockcard ${highlight ? 'fr-rockcard-on' : ''}`}>
      <h4>{title}</h4>
      <p className="fr-fine">{subtitle}</p>
      {index !== null ? <p className="fr-metric-small">index {index.toFixed(1)}</p> : null}
      <p className="fr-metric">{factor === null ? 'n/a' : factor.toFixed(2)}</p>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* Explain                                                                                       */
/* ------------------------------------------------------------------------------------------- */

function ExplainTab({ artifact, armId }: { artifact: CaseArtifact; armId: string }) {
  const lang = useShellLang();
  const curves = artifact.variant_curves[armId] ?? {};
  const variants = artifact.variants;
  const base = curves.base ?? null;

  const x = variants.map((_, i) => i);
  const series: SeriesSpec[] = [
    {
      id: 'response',
      label: lang === 'es' ? 'tamaño medio predicho' : 'predicted mean size',
      values: variants.map((v) => curves[v.id] ?? null),
    },
  ];

  return (
    <div className="fr-grid fr-grid-2">
      <div className="fr-stage">
        <h3 className="fr-stage-title">
          {lang === 'es' ? 'Respuesta a cada palanca' : 'Response to each lever'}
        </h3>
        <LineChart
          x={x}
          series={series}
          xLabel={lang === 'es' ? 'variante' : 'variant'}
          yLabel={lang === 'es' ? 'x50, m' : 'x50, m'}
          xTickFormat={(v) => variants[Math.round(v)]?.label[lang] ?? ''}
          valueFormat={(v) => formatSize(v)}
          height={300}
        />
        <table className="fr-table">
          <thead>
            <tr>
              <th>{lang === 'es' ? 'variante' : 'variant'}</th>
              <th>{lang === 'es' ? 'campo' : 'field'}</th>
              <th>{lang === 'es' ? 'factor' : 'factor'}</th>
              <th>x50</th>
              <th>{lang === 'es' ? 'cambio' : 'change'}</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((variant) => {
              const value = curves[variant.id];
              const change = base && value ? (value - base) / base : null;
              return (
                <tr key={variant.id}>
                  <td>{variant.label[lang]}</td>
                  <td>
                    <code>{variant.field === 'none' ? '-' : variant.field}</code>
                  </td>
                  <td>{variant.factor.toFixed(2)}</td>
                  <td>{formatSize(value)}</td>
                  <td className={change === null ? '' : change > 0 ? 'fr-warn' : 'fr-ok'}>
                    {change === null ? '-' : `${change > 0 ? '+' : ''}${(change * 100).toFixed(1)}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="fr-side">
        <Panel
          id="how-to-read"
          title={lang === 'es' ? 'Cómo leer esto' : 'How to read this'}
          note={
            lang === 'es'
              ? 'Una variante es un diseño que no se ha disparado, así que no tiene medición y nunca se puntúa contra la del tiro original.'
              : 'A variant is a design that has not been fired, so it has no measurement and is never scored against the original blast’s.'
          }
        >
          <p className="fr-note">
            {lang === 'es'
              ? 'Cada variante mueve un solo campo por un multiplicador, de modo que la respuesta a esa palanca queda aislada. Las campañas reales varían varias cosas a la vez.'
              : 'Each variant moves a single field by a multiplier, so the response to that lever is isolated. Real campaigns vary several things at once.'}
          </p>
        </Panel>
        <Panel id="signs" title={lang === 'es' ? 'Signos que deben cumplirse' : 'Signs that must hold'}>
          <ul className="fr-list">
            <li>
              {lang === 'es'
                ? 'Más explosivo debe predecir roca más fina.'
                : 'More explosive must predict finer rock.'}
            </li>
            <li>
              {lang === 'es'
                ? 'Un bordo más amplio debe predecir roca más gruesa.'
                : 'A wider burden must predict coarser rock.'}
            </li>
            <li>
              {lang === 'es'
                ? 'Bloques in situ mayores deben predecir roca más gruesa.'
                : 'Larger in situ blocks must predict coarser rock.'}
            </li>
          </ul>
          <p className="fr-fine">
            {lang === 'es'
              ? 'Estos tres se comprueban en la suite de pruebas del producto. Si alguno se invierte, hay un signo equivocado en alguna parte.'
              : 'All three are asserted in the product’s test suite. If any inverts, a sign is wrong somewhere.'}
          </p>
        </Panel>
        <AbstentionPanel artifact={artifact} arm={armId} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* Decide                                                                                        */
/* ------------------------------------------------------------------------------------------- */

function DecideTab({
  artifact,
  blast,
  armId,
}: {
  artifact: CaseArtifact;
  blast: BlastRow;
  armId: string;
}) {
  const lang = useShellLang();
  const [targetP80Cm, setTargetP80Cm] = useState(60);
  const [oversizeCm, setOversizeCm] = useState(100);

  const cell = artifact.predictions[armId]?.[blast.blast_id];
  const live = useMemo(() => {
    if (!blast.pattern || !cell?.x50_m) return null;
    const pattern = {
      burdenM: blast.pattern.burden_m,
      spacingM: blast.pattern.spacing_m,
      benchHeightM: blast.pattern.bench_height_m,
      stemmingM: blast.pattern.stemming_m,
      holeDiameterMm: blast.pattern.hole_diameter_mm,
      powderFactor: blast.features.Pf_kg_m3,
    };
    const grid = sieveGrid();
    const curve = rosinRammler(cell.x50_m, uniformityIndex(pattern), grid);
    return {
      p80: percentile(curve.passing, grid, 0.8),
      oversize: 1 - passingAt(curve, oversizeCm / 100),
      fines: passingAt(curve, 0.01),
    };
  }, [blast, cell, oversizeCm]);

  return (
    <div className="fr-grid fr-grid-2">
      <div className="fr-stage">
        <h3 className="fr-stage-title">
          {lang === 'es' ? 'Contra su objetivo' : 'Against your target'}
        </h3>
        <DecisionPanel
          inputs={{
            targetP80M: targetP80Cm / 100,
            oversizeLimitM: oversizeCm / 100,
            predictedX50M: cell?.x50_m ?? null,
            predictedP80M: live?.p80 ?? null,
            oversizeFraction: live?.oversize ?? null,
            finesFraction: live?.fines ?? null,
            armId,
          }}
        />
        <Panel id="downstream" title={lang === 'es' ? 'Consecuencia aguas abajo' : 'Downstream consequence'}>
          <p className="fr-note fr-note-warn">
            {lang === 'es'
              ? 'Este producto no modela la chancadora ni el molino. La fragmentación los alimenta y esa cadena es real, pero cualquier cifra de energía específica que se mostrara aquí sería un sustituto, no un modelo de conminución.'
              : 'This product does not model the crusher or the mill. Fragmentation feeds them and that chain is real, but any specific-energy figure shown here would be a proxy rather than a comminution model.'}
          </p>
        </Panel>
      </div>
      <div className="fr-side">
        <Panel id="specification" title={lang === 'es' ? 'Su especificación' : 'Your specification'}>
          <label className="fr-control">
            {lang === 'es' ? 'P80 objetivo, cm' : 'Target P80, cm'}
            <input
              type="range"
              min={10}
              max={150}
              step={5}
              value={targetP80Cm}
              onChange={(e) => setTargetP80Cm(Number(e.target.value))}
            />
            <output>{targetP80Cm} cm</output>
          </label>
          <label className="fr-control">
            {lang === 'es' ? 'Límite de sobre tamaño, cm' : 'Oversize limit, cm'}
            <input
              type="range"
              min={40}
              max={200}
              step={5}
              value={oversizeCm}
              onChange={(e) => setOversizeCm(Number(e.target.value))}
            />
            <output>{oversizeCm} cm</output>
          </label>
        </Panel>
        {cell ? <SimulationSpread cell={cell} /> : null}
        <Panel id="how-much-to-trust" title={lang === 'es' ? 'Cuánto confiar' : 'How much to trust this'}>
          <p className="fr-note">
            {lang === 'es'
              ? 'El modelo seleccionado se puntúa contra tiros reales en la página de Benchmark, y bajo tres protocolos distintos. Solo uno de ellos responde la pregunta que usted tiene.'
              : 'The selected model is scored against real blasts on the Benchmark page, under three different protocols. Only one of them answers the question you have.'}
          </p>
          <Link className="fr-inline-link" to="/benchmark">
            {lang === 'es' ? 'Ver el benchmark' : 'See the benchmark'}
          </Link>
        </Panel>
      </div>
    </div>
  );
}

/** Kept for the degenerate case: a design that is not a blast should say so before anything else. */
export function useDegenerateNotice(blast: BlastRow): string | null {
  return blast.degenerate_reason ?? degenerateReason(blast.features) ?? null;
}
