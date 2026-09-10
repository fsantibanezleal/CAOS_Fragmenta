/**
 * Benchmark: across every blast there is, which model is actually worth trusting.
 *
 * This is where the product's central claim lives, and it leads with the honest protocol rather than
 * with the flattering one.
 */

import { Callout, Refs, useShellLang } from '@fasl-work/caos-app-shell';
import { useEffect, useState } from 'react';

import { SECTION_REFS } from '../data/citations';
import { ARM_BY_ID, formatScore, formatSize, loadBenchmark, PROTOCOL_LABEL } from '../lib/artifacts';
import type { BenchmarkArtifact, ReproductionBlock } from '../lib/contract.types';
import { LineChart, type SeriesSpec } from '../viz/Charts';

const PROTOCOL_ORDER = ['random-8020', 'dedup-random', 'leave-one-site-out'];

export default function Benchmark() {
  const lang = useShellLang();
  const es = lang === 'es';
  const [benchmark, setBenchmark] = useState<BenchmarkArtifact | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBenchmark().then(setBenchmark).catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="fr-error" role="alert">{error}</div>;
  if (!benchmark) return <div className="fr-loading">{es ? 'Cargando' : 'Loading'}</div>;

  const arms = Object.keys(benchmark.protocols['leave-one-site-out'].arms).filter(
    (arm) => arm !== 'oracle',
  );

  return (
    <article className="fr-prose fr-prose-wide">
      <h1>{es ? 'Benchmark' : 'Benchmark'}</h1>

      <Callout variant={benchmark.verdict.generalises_across_sites ? 'note' : 'strong'} title={es ? 'El veredicto' : 'The verdict'}>
        {benchmark.verdict.outcome}
      </Callout>

      <p className="fr-lede">
        {es
          ? 'Los mismos modelos, las mismas filas, tres formas de partir los datos. La brecha entre ellas es el hallazgo, y cualquiera de sus dos signos habria sido publicable.'
          : 'The same models, the same rows, three ways of splitting the data. The gap between them is the finding, and either sign of it would have been worth reporting.'}
      </p>

      <h2>{es ? 'Los tres protocolos' : 'The three protocols'}</h2>
      <p className="fr-fine">
        {es
          ? 'Varianza explicada respecto de la linea de identidad. Abstenciones entre parentesis.'
          : 'Variance explained about the identity line. Abstentions in brackets.'}
      </p>
      <div className="fr-scroll-x">
        <table className="fr-table fr-table-wide">
          <thead>
            <tr>
              <th>{es ? 'modelo' : 'model'}</th>
              <th>{es ? 'nivel' : 'tier'}</th>
              {PROTOCOL_ORDER.map((protocol) => (
                <th key={protocol}>{PROTOCOL_LABEL[protocol]?.[lang] ?? protocol}</th>
              ))}
              <th>{es ? 'brecha' : 'gap'}</th>
            </tr>
          </thead>
          <tbody>
            {arms.map((arm) => {
              const meta = ARM_BY_ID.get(arm);
              const gap = benchmark.verdict.protocol_gap_random_minus_grouped[arm];
              const grouped = benchmark.protocols['leave-one-site-out'].arms[arm];
              return (
                <tr key={arm} className={(grouped?.r2_identity ?? -1) > 0 ? 'fr-row-good' : ''}>
                  <td>{meta ? meta.label[lang] : arm}</td>
                  <td className="fr-fine">{grouped?.tier}</td>
                  {PROTOCOL_ORDER.map((protocol) => {
                    const cell = benchmark.protocols[protocol].arms[arm];
                    const value = cell?.r2_identity;
                    return (
                      <td key={protocol} className={(value ?? -1) > 0 ? 'fr-ok' : 'fr-bad'}>
                        {formatScore(value)}
                        {cell?.n_abstained ? <span className="fr-fine"> ({cell.n_abstained})</span> : null}
                      </td>
                    );
                  })}
                  <td className={gap > 0.5 ? 'fr-bad' : ''}>
                    {gap === undefined ? '-' : `${gap > 0 ? '+' : ''}${gap.toFixed(3)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>{es ? 'Lo que dice la tabla' : 'What the table says'}</h2>

      <h3>{es ? 'Solo sobreviven los modelos que no se ajustan' : 'Only the models that are not fitted survive'}</h3>
      <p>
        {es
          ? 'Dos modelos resisten, y ambos tienen coeficientes FIJOS. Los exponentes de la regresion publicada son constantes de un articulo; la unica cantidad libre de la ecuacion clasica es un factor de roca por sitio. Todo modelo que se ajusta a este corpus fracasa al salir de el.'
          : 'Two models hold up, and both have FIXED coefficients. The published regression’s exponents are constants from a paper; the classical equation’s only free quantity is a per-site rock factor. Every model that fits itself to this corpus fails to leave it.'}
      </p>
      <ul className="fr-list">
        {benchmark.verdict.arms_with_positive_variance_explained_across_sites.map(([arm, value]) => (
          <li key={arm}>
            <b>{ARM_BY_ID.get(arm)?.label[lang] ?? arm}</b>: {value.toFixed(3)}
          </li>
        ))}
      </ul>
      <p>
        {es
          ? 'Es una afirmacion sobre lo que este corpus puede sostener: 97 tiros de diez campanas alcanzan para ajustar un modelo que interpola entre campanas que ya vio, y no alcanzan para uno que llegue a una nueva.'
          : 'It is a statement about what this corpus can support: 97 blasts from ten campaigns are enough to fit a model that interpolates between campaigns it has seen, and not enough to fit one that reaches a new one.'}
      </p>

      <h3>{es ? 'El modelo clasico mejora bajo el protocolo honesto' : 'The classical model improves under the honest protocol'}</h3>
      <p>
        {es
          ? `De ${formatScore(benchmark.protocols['random-8020'].arms.kuznetsov?.r2_identity)} en una particion aleatoria a ${formatScore(benchmark.protocols['leave-one-site-out'].arms.kuznetsov?.r2_identity)} al excluir un sitio. El modelo no cambio. Cambio la comparacion: en una particion aleatoria compite contra modelos que memorizaron casi duplicados de las filas de prueba.`
          : `From ${formatScore(benchmark.protocols['random-8020'].arms.kuznetsov?.r2_identity)} on a random split to ${formatScore(benchmark.protocols['leave-one-site-out'].arms.kuznetsov?.r2_identity)} with a site held out. The model did not change. The comparison did: on a random split it competes against models that have memorised near-duplicates of the test rows.`}
      </p>

      <h3>{es ? 'Deduplicar no explica la brecha' : 'Deduplication does not explain the gap'}</h3>
      <p>
        {es
          ? 'Colapsar los vectores duplicados y partir al azar SUBE los puntajes de casi todos los modelos aprendidos, no los baja. Los duplicados no son lo que los sostenia. El sitio compartido si.'
          : 'Collapsing the duplicate vectors and splitting randomly RAISES the scores of nearly every learned model, not lowers them. The duplicates are not what was holding them up. The shared site is.'}
      </p>
      <p className="fr-fine">
        {es
          ? `El corpus tiene ${benchmark.duplicate_groups.length} grupos de vectores duplicados que cubren ${benchmark.duplicate_groups.reduce((s, g) => s + g.length, 0)} de sus 97 filas, y una sola cantera aporta ${benchmark.site_counts.Akdaglar ?? 0} de ellas.`
          : `The corpus has ${benchmark.duplicate_groups.length} groups of duplicated vectors covering ${benchmark.duplicate_groups.reduce((s, g) => s + g.length, 0)} of its 97 rows, and one quarry supplies ${benchmark.site_counts.Akdaglar ?? 0} of them.`}
      </p>

      <h2>{es ? 'Reproducir el conjunto publicado' : 'Reproducing the published hold-out'}</h2>
      <PublishedArms benchmark={benchmark} es={es} />

      <h3>{es ? 'La ecuacion publicada supera a las cifras que sus propios articulos imprimieron' : 'The published equation beats the numbers its own papers printed'}</h3>
      <table className="fr-table">
        <thead>
          <tr>
            <th>{es ? 'conjunto' : 'hold-out'}</th>
            <th>{es ? 'filas' : 'rows'}</th>
            <th>{es ? 'la tabla del articulo' : 'the paper’s own table'}</th>
            <th>{es ? 'recalculado de su ecuacion' : 'recomputed from its equation'}</th>
            <th>{es ? 'ganancia' : 'gain'}</th>
          </tr>
        </thead>
        <tbody>
          {(['2010', '2012'] as const).map((label) => {
            const block = benchmark.published_reproduction[label] as unknown as ReproductionBlock;
            if (!block) return null;
            return (
              <tr key={label}>
                <td>{label}</td>
                <td>{block.n_rows}</td>
                <td>{formatScore(block.as_published.r2_identity)}</td>
                <td className="fr-ok">{formatScore(block.recomputed.r2_identity)}</td>
                <td className="fr-ok">+{block.gain_in_r2_identity.toFixed(3)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>{es ? 'La reproduccion de la red, a lo largo de las semillas' : 'The network reproduction, across seeds'}</h2>
      <SeedSweep benchmark={benchmark} es={es} lang={lang} />

      <h2>{es ? 'La fuga en el protocolo publicado' : 'The leak in the published protocol'}</h2>
      <p>
        {es
          ? 'Un tiro de validacion esta tambien en la tabla de entrenamiento sobre la que el articulo dice haber entrenado. La suposicion natural al encontrarlo fue que inflaba los modelos aprendidos. Medido, no lo hace: quitarlo les cuesta un poco y le GANA bastante al modelo clasico, porque es su segunda peor fila.'
          : 'One validation blast is also in the training table the paper says it trained on. The natural assumption on finding it was that it inflated the learned models. Measured, it does not: removing it costs them slightly and GAINS the classical model a great deal, because it is that model’s second-worst row.'}
      </p>
      <LeakageTable benchmark={benchmark} es={es} />

      <p className="fr-fine">
        {es ? 'Horneado con semilla' : 'Baked at seed'} {benchmark.seed} ·{' '}
        {es ? 'corpus' : 'corpus'} <code>{benchmark.corpus_digest.slice(0, 16)}</code> ·{' '}
        {es ? 'motor' : 'engine'} {benchmark.engine_version}
      </p>

      <Refs ids={SECTION_REFS.benchmark} label={es ? "Fuentes de esta pagina" : "Sources for this page"} />
    </article>
  );
}

/* ------------------------------------------------------------------------------------------- */

function PublishedArms({ benchmark, es }: { benchmark: BenchmarkArtifact; es: boolean }) {
  const arms = benchmark.published_reproduction.published_holdout_arms;
  const order = ['classical', 'regression', 'neural-net', 'null'];
  const labels: Record<string, string> = {
    classical: es ? 'clasico, tal como se publico' : 'classical, as published',
    regression: es ? 'regresion, tal como se publico' : 'regression, as published',
    'neural-net': es ? 'red neuronal, tal como se publico' : 'neural network, as published',
    null: es ? 'nulo: predecir la media' : 'null: predict the mean',
  };
  return (
    <>
      <p>
        {es
          ? 'Los tres modelos que el articulo de 2012 imprime en la misma tabla, sobre las mismas doce filas, con un predictor constante al lado. El modelo clasico es el peor de los tres, y le gana a la constante por un 13 por ciento en RMSE.'
          : 'The three models the 2012 paper prints in one table, on the same twelve rows, with a constant predictor beside them. The classical model is the worst of the three, and it beats the constant by 13 percent on RMSE.'}
      </p>
      <table className="fr-table">
        <thead>
          <tr>
            <th>{es ? 'modelo' : 'model'}</th>
            <th title="1 - SS_res/SS_tot about the 1:1 line">
              {es ? 'varianza explicada' : 'variance explained'}
            </th>
            <th title="the square of the correlation, which is what the papers report">
              {es ? 'correlacion al cuadrado' : 'squared correlation'}
            </th>
            <th>RMSE</th>
            <th>MAPE</th>
          </tr>
        </thead>
        <tbody>
          {order.map((key) => {
            const block = arms[key];
            if (!block) return null;
            return (
              <tr key={key} className={key === 'null' ? 'fr-row-null' : ''}>
                <td>{labels[key]}</td>
                <td className={(block.r2_identity ?? 0) > 0 ? 'fr-ok' : 'fr-bad'}>
                  {formatScore(block.r2_identity)}
                </td>
                <td>{formatScore(block.pearson_r2)}</td>
                <td>{formatSize(block.rmse_m)}</td>
                <td>{block.mape_pct === null || block.mape_pct === undefined ? 'n/a' : `${block.mape_pct.toFixed(1)}%`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Callout variant="honest" title={es ? 'Las dos columnas no son lo mismo' : 'The two columns are not the same thing'}>
        {es
          ? 'Para el modelo clasico difieren por un factor de dos y medio sobre estas mismas doce filas. La cifra que la literatura reporta es la segunda. La que un lector supone al ver la palabra es la primera.'
          : 'For the classical model they differ by a factor of two and a half on these same twelve rows. The figure the literature reports is the second one. The one a reader assumes on seeing the word is the first.'}
      </Callout>
    </>
  );
}

function SeedSweep({
  benchmark,
  es,
  lang,
}: {
  benchmark: BenchmarkArtifact;
  es: boolean;
  lang: 'en' | 'es';
}) {
  const sweep = benchmark.network_seed_sweep;
  const sorted = [...sweep.r2_identity].sort((a, b) => a - b);
  const x = sorted.map((_, i) => i);
  const series: SeriesSpec[] = [
    {
      id: 'seeds',
      label: es ? 'reproduccion, por semilla' : 'reproduction, per seed',
      values: sorted,
    },
    {
      id: 'published',
      label: es ? 'publicado' : 'published',
      values: sorted.map(() => sweep.published),
      dashed: true,
    },
  ];

  return (
    <>
      <p>
        {es
          ? `La red publicada esta completamente especificada, asi que se puede reproducir exactamente. Reproducida sobre ${sweep.n_seeds} semillas, su varianza explicada sobre el conjunto publicado va de ${sweep.min.toFixed(3)} a ${sweep.max.toFixed(3)}. El ${sweep.published.toFixed(3)} publicado queda por encima de todas.`
          : `The published network is fully specified, so it can be reproduced exactly. Reproduced across ${sweep.n_seeds} seeds, its variance explained on the published hold-out runs from ${sweep.min.toFixed(3)} to ${sweep.max.toFixed(3)}. The published ${sweep.published.toFixed(3)} sits above every one of them.`}
      </p>
      <LineChart
        x={x}
        series={series}
        xLabel={es ? 'semilla, ordenada' : 'seed, sorted'}
        yLabel={es ? 'varianza explicada' : 'variance explained'}
        height={240}
        xTickFormat={(v) => `#${Math.round(v)}`}
        zeroLine
      />
      <Callout variant="note" title={es ? 'Que se afirma, y que no' : 'What is claimed, and what is not'}>
        {es
          ? 'No se afirma que el resultado publicado sea falso. Detalles no registrados, un esquema de inicializacion o una tirada distinta de simulaciones podrian explicarlo. Lo que el barrido si establece es que el puntaje publicado no es robusto a la semilla, sobre un metodo cuyo propio articulo lo muestra oscilando por un factor de cuatro entre anchos ocultos vecinos.'
          : 'It is not claimed that the published result is wrong. Unrecorded details, an initialisation scheme or a different simulation draw could account for it. What the sweep does establish is that the published score is not robust to the seed, on a method whose own paper shows it swinging by a factor of four between adjacent hidden widths.'}
      </Callout>
      <h3>{es ? 'Donde se concentra el deficit' : 'Where the shortfall concentrates'}</h3>
      <table className="fr-table">
        <thead>
          <tr>
            <th>{es ? 'tiro' : 'blast'}</th>
            <th>{es ? 'medido' : 'measured'}</th>
            <th>{es ? 'publicado' : 'published'}</th>
            <th>{es ? 'rango en semillas' : 'range across seeds'}</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(sweep.per_blast).map(([blastId, row]) => {
            const outside =
              row.min_m !== null &&
              row.max_m !== null &&
              (row.published_m < row.min_m || row.published_m > row.max_m);
            return (
              <tr key={blastId} className={outside ? 'fr-row-bad' : ''}>
                <td>
                  <code>{blastId}</code>
                </td>
                <td>{formatSize(row.measured_m)}</td>
                <td>{formatSize(row.published_m)}</td>
                <td>
                  {row.min_m === null ? 'n/a' : `${formatSize(row.min_m)} to ${formatSize(row.max_m)}`}
                  {outside ? (
                    <span className="fr-badge fr-badge-warn">
                      {lang === 'es' ? 'fuera del rango' : 'outside the range'}
                    </span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="fr-fine">
        {es
          ? 'Las filas marcadas son aquellas donde el valor publicado queda fuera de todo lo que la reproduccion alcanzo en cualquier semilla. Son tambien las filas que la propia fuente reporta como sus mas inestables.'
          : 'The marked rows are those where the published value falls outside everything the reproduction reached on any seed. They are also the rows the source itself reports as its most unstable.'}
      </p>
    </>
  );
}

function LeakageTable({ benchmark, es }: { benchmark: BenchmarkArtifact; es: boolean }) {
  const withRow = benchmark.published_reproduction.published_holdout_arms;
  const withoutRow = benchmark.published_reproduction.without_the_leaked_row;
  const keys = ['classical', 'regression', 'neural-net'];
  const labels: Record<string, string> = {
    classical: es ? 'clasico' : 'classical',
    regression: es ? 'regresion' : 'regression',
    'neural-net': es ? 'red neuronal' : 'neural network',
  };
  return (
    <table className="fr-table">
      <thead>
        <tr>
          <th>{es ? 'modelo' : 'model'}</th>
          <th>{es ? 'con la fila filtrada' : 'with the leaked row'}</th>
          <th>{es ? 'sin ella' : 'without it'}</th>
          <th>{es ? 'cambio' : 'change'}</th>
        </tr>
      </thead>
      <tbody>
        {keys.map((key) => {
          const a = withRow[key]?.r2_identity;
          const b = withoutRow[key]?.r2_identity;
          const delta = a !== null && a !== undefined && b !== null && b !== undefined ? b - a : null;
          return (
            <tr key={key}>
              <td>{labels[key]}</td>
              <td>{formatScore(a)}</td>
              <td>{formatScore(b)}</td>
              <td className={delta === null ? '' : delta > 0 ? 'fr-ok' : 'fr-warn'}>
                {delta === null ? '-' : `${delta > 0 ? '+' : ''}${delta.toFixed(3)}`}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
