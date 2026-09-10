/**
 * The panels that carry the product's honesty: refusals, uncertainty, provenance and the decision.
 *
 * These are not chrome. An abstention that renders as a blank cell is indistinguishable from a
 * missing feature, and a learned number without its withheld site is indistinguishable from a
 * memory. Each panel here exists because leaving it out would let the page overstate itself.
 */

import { useShellLang } from '@fasl-work/caos-app-shell';
import { AlertTriangle, Ban, CheckCircle2, Info, TrendingDown, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  ARM_BY_ID,
  formatScore,
  formatSize,
  type Tier,
  TIER_LABEL,
} from '../lib/artifacts';
import type { CaseArtifact, PredictionCell, ScoreBlock } from '../lib/contract.types';

/* ------------------------------------------------------------------------------------------- */
/* Provenance                                                                                    */
/* ------------------------------------------------------------------------------------------- */

/**
 * What a reader needs before believing any learned number on this page.
 *
 * A model that was trained on a campaign and is then shown predicting that campaign is displaying a
 * memory. The bake withholds the site and asserts it; this panel is where that assertion becomes
 * visible instead of staying in a manifest nobody opens.
 */
export function ProvenancePanel({ artifact }: { artifact: CaseArtifact }) {
  const lang = useShellLang();
  const { provenance } = artifact;
  const withheld = provenance.held_out_site;

  return (
    <section className="fr-panel fr-panel-provenance">
      <h3>
        <Info size={15} aria-hidden="true" />
        {lang === 'es' ? 'Procedencia' : 'Provenance'}
      </h3>
      <dl className="fr-kv">
        <dt>{lang === 'es' ? 'Origen' : 'Origin'}</dt>
        <dd>
          {artifact.case.real_or_synthetic === 'real'
            ? lang === 'es'
              ? 'tiros reales medidos'
              : 'real measured blasts'
            : lang === 'es'
              ? 'diseño sintético, sin medición'
              : 'synthetic design, no measurement'}
        </dd>
        {artifact.case.doi ? (
          <>
            <dt>DOI</dt>
            <dd>
              <a href={`https://doi.org/${artifact.case.doi}`} rel="noreferrer noopener" target="_blank">
                {artifact.case.doi}
              </a>
            </dd>
          </>
        ) : null}
        <dt>{lang === 'es' ? 'Licencia' : 'Licence'}</dt>
        <dd>{artifact.case.licence}</dd>
        <dt>{lang === 'es' ? 'Sitio excluido' : 'Withheld site'}</dt>
        <dd className={withheld ? 'fr-ok' : ''}>
          {withheld ? (
            <>
              <CheckCircle2 size={13} aria-hidden="true" /> {withheld} (
              {provenance.n_training_rows}{' '}
              {lang === 'es' ? 'filas de entrenamiento' : 'training rows'})
            </>
          ) : (
            <>{lang === 'es' ? 'nada que excluir' : 'nothing to withhold'}</>
          )}
        </dd>
      </dl>
      <p className="fr-note">{provenance.leakage_note}</p>
      <p className="fr-fine">
        {lang === 'es' ? 'motor' : 'engine'} {provenance.engine.package} {provenance.engine.version} ·{' '}
        {lang === 'es' ? 'corpus' : 'corpus'} {provenance.corpus_digest.slice(0, 12)}
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* Refusals                                                                                      */
/* ------------------------------------------------------------------------------------------- */

/**
 * The refusals on this case, grouped by reason.
 *
 * A refusal is a result. Rendering it as an empty cell would make the product look like it answered
 * everything, which is the failure this whole panel exists to prevent.
 */
export function AbstentionPanel({
  artifact,
  arm,
}: {
  artifact: CaseArtifact;
  arm: string;
}) {
  const lang = useShellLang();
  const row = artifact.predictions[arm] ?? {};
  const refusals = Object.entries(row).filter(([, cell]) => cell.abstained);
  if (refusals.length === 0) return null;

  const byReason = new Map<string, string[]>();
  for (const [blastId, cell] of refusals) {
    const reason = cell.reason ?? 'no reason recorded';
    byReason.set(reason, [...(byReason.get(reason) ?? []), blastId]);
  }

  return (
    <section className="fr-panel fr-panel-abstain">
      <h3>
        <Ban size={15} aria-hidden="true" />
        {lang === 'es'
          ? `Se abstiene en ${refusals.length} de ${Object.keys(row).length} tiros`
          : `Abstains on ${refusals.length} of ${Object.keys(row).length} blasts`}
      </h3>
      <ul className="fr-reasons">
        {[...byReason.entries()].map(([reason, ids]) => (
          <li key={reason}>
            <code>{ids.length === 1 ? ids[0] : `${ids.length} blasts`}</code>
            <span>{reason}</span>
          </li>
        ))}
      </ul>
      <p className="fr-fine">
        {lang === 'es'
          ? 'Una abstención es un resultado. Un número aquí sería una invención.'
          : 'An abstention is a result. A number here would be an invention.'}
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* The metric block                                                                              */
/* ------------------------------------------------------------------------------------------- */

/**
 * Both variance statistics, each named.
 *
 * They differ by a factor of two and a half for the classical arm on the published hold-out. A
 * screen that prints one of them under a bare label is showing something a reader will misread, and
 * that misreading is the single most consequential error in this literature.
 */
export function ScorePanel({
  score,
  nullScore,
  title,
}: {
  score: ScoreBlock;
  nullScore?: ScoreBlock;
  title?: string;
}) {
  const lang = useShellLang();

  if (!score.scoreable) {
    return (
      <section className="fr-panel">
        {title ? <h3>{title}</h3> : null}
        <p className="fr-note">
          {score.reason ??
            (lang === 'es' ? 'este caso no es puntuable' : 'this case is not scoreable')}
        </p>
      </section>
    );
  }

  const beatsNull =
    nullScore?.rmse_m !== undefined &&
    nullScore.rmse_m !== null &&
    score.rmse_m !== undefined &&
    score.rmse_m !== null
      ? (nullScore.rmse_m - score.rmse_m) / nullScore.rmse_m
      : null;

  return (
    <section className="fr-panel fr-panel-score">
      {title ? <h3>{title}</h3> : null}
      <dl className="fr-kv fr-kv-metrics">
        <dt title="1 - SS_res / SS_tot about the 1:1 line. What a reader assumes R2 means.">
          {lang === 'es' ? 'Varianza explicada (identidad)' : 'Variance explained (identity)'}
        </dt>
        <dd className={(score.r2_identity ?? 0) > 0 ? 'fr-ok' : 'fr-bad'}>
          {formatScore(score.r2_identity)}
          {score.r2_identity_interval ? (
            <span className="fr-fine">
              {' '}
              [{formatScore(score.r2_identity_interval[0], 2)},{' '}
              {formatScore(score.r2_identity_interval[1], 2)}]
            </span>
          ) : null}
        </dd>
        <dt title="The square of the correlation between predicted and measured. What the source papers report.">
          {lang === 'es' ? 'Correlación al cuadrado' : 'Squared correlation'}
        </dt>
        <dd>{formatScore(score.pearson_r2)}</dd>
        <dt>RMSE</dt>
        <dd>{formatSize(score.rmse_m)}</dd>
        <dt>MAPE</dt>
        <dd>{score.mape_pct === null || score.mape_pct === undefined ? 'n/a' : `${score.mape_pct.toFixed(1)}%`}</dd>
        <dt title="A near-zero bias with a large error is exactly where the two variance statistics diverge.">
          {lang === 'es' ? 'Sesgo' : 'Bias'}
        </dt>
        <dd>{formatSize(score.bias_m)}</dd>
        <dt>{lang === 'es' ? 'Puntuados / abstenidos' : 'Scored / abstained'}</dt>
        <dd>
          {score.n_scored ?? 0} / {score.n_abstained ?? 0}
        </dd>
      </dl>
      {beatsNull !== null ? (
        <p className={`fr-note ${beatsNull > 0 ? 'fr-note-ok' : 'fr-note-warn'}`}>
          {beatsNull > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{' '}
          {lang === 'es'
            ? `Mejora sobre predecir una constante: ${(beatsNull * 100).toFixed(0)} por ciento en RMSE.`
            : `Beats predicting a constant by ${(beatsNull * 100).toFixed(0)} percent on RMSE.`}
        </p>
      ) : null}
      {score.worst_rows && score.worst_rows.length ? (
        <>
          <h4>{lang === 'es' ? 'Dónde más falla' : 'Where it fails hardest'}</h4>
          <table className="fr-table fr-table-compact">
            <thead>
              <tr>
                <th>{lang === 'es' ? 'tiro' : 'blast'}</th>
                <th>{lang === 'es' ? 'medido' : 'measured'}</th>
                <th>{lang === 'es' ? 'predicho' : 'predicted'}</th>
                <th>{lang === 'es' ? 'error' : 'error'}</th>
              </tr>
            </thead>
            <tbody>
              {score.worst_rows.map((worst) => (
                <tr key={worst.blast_id}>
                  <td>
                    <code>{worst.blast_id}</code>
                  </td>
                  <td>{formatSize(worst.measured_m)}</td>
                  <td>{formatSize(worst.predicted_m)}</td>
                  <td className={worst.error_m > 0 ? 'fr-warn' : 'fr-bad'}>
                    {worst.error_pct > 0 ? '+' : ''}
                    {worst.error_pct.toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* Uncertainty on a single learned prediction                                                    */
/* ------------------------------------------------------------------------------------------- */

/**
 * The published network reports a coefficient of variation across its eight simulations, reaching
 * 0.76 on one blast in its own tables. Carrying it per prediction turns that from a footnote into
 * something a reader can act on.
 */
export function SimulationSpread({ cell }: { cell: PredictionCell }) {
  const lang = useShellLang();
  if (cell.cv === null || cell.cv === undefined || !cell.n_simulations) return null;
  const unstable = cell.cv > 0.25;
  return (
    <p className={`fr-note ${unstable ? 'fr-note-warn' : ''}`}>
      {unstable ? <AlertTriangle size={13} /> : <Info size={13} />}{' '}
      {lang === 'es'
        ? `Promedio de ${cell.n_simulations} simulaciones; coeficiente de variacion ${cell.cv.toFixed(2)}.`
        : `Mean of ${cell.n_simulations} simulations; coefficient of variation ${cell.cv.toFixed(2)}.`}{' '}
      {unstable
        ? lang === 'es'
          ? 'Aquí la respuesta depende de la semilla, no del modelo.'
          : 'Here the answer depends on the seed rather than on the model.'
        : ''}
    </p>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* The decision layer                                                                            */
/* ------------------------------------------------------------------------------------------- */

export interface DecisionInputs {
  targetP80M: number;
  oversizeLimitM: number;
  predictedX50M: number | null;
  predictedP80M: number | null;
  oversizeFraction: number | null;
  finesFraction: number | null;
  armId: string;
}

/**
 * Diagnosis, severity, driver and a concrete recommendation.
 *
 * Driven by the selected arm and the entered target, never by a hard-coded string. A decision panel
 * that says the same thing whatever the inputs is a decoration with a border.
 */
export function DecisionPanel({ inputs }: { inputs: DecisionInputs }) {
  const lang = useShellLang();
  const { targetP80M, predictedP80M, predictedX50M, oversizeFraction, oversizeLimitM, armId } = inputs;
  const arm = ARM_BY_ID.get(armId);

  if (predictedP80M === null || predictedX50M === null) {
    return (
      <section className="fr-panel fr-panel-decision">
        <h3>{lang === 'es' ? 'Decisión' : 'Decision'}</h3>
        <p className="fr-note fr-note-warn">
          {lang === 'es'
            ? 'El modelo seleccionado se abstiene en este diseño, así que no hay recomendación que dar.'
            : 'The selected model abstains on this design, so there is no recommendation to give.'}
        </p>
      </section>
    );
  }

  const ratio = predictedP80M / targetP80M;
  const meets = ratio <= 1.0;
  const severity = Math.abs(ratio - 1);
  const severityLabel =
    severity < 0.1
      ? lang === 'es'
        ? 'marginal'
        : 'marginal'
      : severity < 0.35
        ? lang === 'es'
          ? 'moderada'
          : 'moderate'
        : lang === 'es'
          ? 'grande'
          : 'large';

  const recommendation = meets
    ? lang === 'es'
      ? 'El diseño alcanza el objetivo. Si busca ahorro, pruebe reducir el factor de carga en pasos de 10 por ciento y observe la cola gruesa.'
      : 'The design meets the target. If cost matters, try cutting the powder factor in 10 percent steps and watch the coarse tail.'
    : ratio > 1.4
      ? lang === 'es'
        ? 'El diseño queda muy grueso. Cierre el bordo y suba el factor de carga a la vez; una sola palanca no cubre esta brecha.'
        : 'The design is far too coarse. Tighten the burden and raise the powder factor together; one lever will not close this gap.'
      : lang === 'es'
        ? 'El diseño queda grueso. Cierre el bordo entre 10 y 15 por ciento antes de tocar el explosivo: es el cambio más barato.'
        : 'The design is coarse. Tighten the burden by 10 to 15 percent before touching the explosive: it is the cheaper change.';

  return (
    <section className="fr-panel fr-panel-decision">
      <h3>{lang === 'es' ? 'Decisión' : 'Decision'}</h3>
      <div className={`fr-verdict ${meets ? 'fr-verdict-ok' : 'fr-verdict-bad'}`}>
        {meets ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
        <div>
          <strong>
            {meets
              ? lang === 'es'
                ? 'Cumple el objetivo'
                : 'Meets the target'
              : lang === 'es'
                ? 'No cumple el objetivo'
                : 'Misses the target'}
          </strong>
          <span>
            P80 {formatSize(predictedP80M)} {lang === 'es' ? 'contra objetivo' : 'against a target of'}{' '}
            {formatSize(targetP80M)}
          </span>
        </div>
      </div>
      <dl className="fr-kv">
        <dt>{lang === 'es' ? 'Severidad' : 'Severity'}</dt>
        <dd>
          {severityLabel} ({(severity * 100).toFixed(0)}%)
        </dd>
        <dt>{lang === 'es' ? 'Sobre tamaño' : 'Oversize'}</dt>
        <dd>
          {oversizeFraction === null
            ? 'n/a'
            : `${(oversizeFraction * 100).toFixed(1)}% ${lang === 'es' ? 'sobre' : 'above'} ${formatSize(oversizeLimitM)}`}
        </dd>
        <dt>{lang === 'es' ? 'Según' : 'According to'}</dt>
        <dd>{arm ? arm.label[lang] : armId}</dd>
      </dl>
      <p className="fr-note">{recommendation}</p>
      <p className="fr-fine">
        {lang === 'es'
          ? 'Compensación: cerrar la malla o subir el explosivo produce más finos y más vibración, y cuesta más por tonelada. Este producto no modela ninguna de las tres cosas.'
          : 'Trade-off: tightening the pattern or raising the explosive makes more fines and more vibration, and costs more per tonne. This product models none of the three.'}
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */
/* Small shared pieces                                                                           */
/* ------------------------------------------------------------------------------------------- */

export function TierBadge({ tier }: { tier: Tier }) {
  const lang = useShellLang();
  return <span className={`fr-badge fr-badge-${tier}`}>{TIER_LABEL[tier][lang]}</span>;
}

export function Panel({
  title,
  children,
  note,
}: {
  title: ReactNode;
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <section className="fr-panel">
      <h3>{title}</h3>
      {children}
      {note ? <p className="fr-fine">{note}</p> : null}
    </section>
  );
}
