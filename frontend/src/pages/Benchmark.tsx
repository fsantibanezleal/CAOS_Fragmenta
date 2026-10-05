/**
 * Benchmark: across every blast there is, which model is worth trusting, with how much uncertainty.
 *
 * Every number on this page is read from the committed benchmark artifact or computed live in the
 * browser from the committed model files. The verdict leads, on both row sets it depends on.
 */

import { Callout, Cite, Equation, Refs, SubTabs, useShellLang } from '@fasl-work/caos-app-shell';
import type { SubTabDef } from '@fasl-work/caos-app-shell';
import { useMemo, useState } from 'react';

import { SECTION_REFS } from '../data/citations';
import { fittedArms, predictModel } from '../engine/learned';
import { ARM_BY_ID, formatSize, IN_SAMPLE_ARMS } from '../lib/artifacts';
import type { BenchmarkArtifact, Lang, ReproductionBlock } from '../lib/contract.types';
import { f, facts, iv, useBenchmark, useModels } from '../lib/facts';
import { LineChart, ParityChart, type SeriesSpec } from '../viz/Charts';
import { SupportsDiagram } from '../viz/Diagrams';
import { DrawHistogram, IntervalChart, type IntervalRow, type MarkKind } from '../viz/Evidence';

interface TabProps {
  es: boolean;
  lang: Lang;
  b: BenchmarkArtifact;
}

const refs = (key: string, es: boolean) => <Refs ids={SECTION_REFS[key]} label={es ? 'Fuentes' : 'Sources'} />;
const label = (arm: string, lang: Lang) => ARM_BY_ID.get(arm)?.label[lang] ?? arm;

const ORDER = [
  'kuznetsov',
  'kuznetsov-transfer',
  'published-regression',
  'refitted-regression',
  'published-neural-net',
  'svr-rbf',
  'svr-poly',
  'random-forest',
  'xgboost',
  'stacking',
  'null',
];

/**
 * The verdict in the reader's language. The engine writes one canonical English sentence group into
 * the artifact; it is shown verbatim in English. The Spanish is composed from the same structured
 * fields, so the two languages derive from the numbers and cannot drift apart.
 */
function verdictText(b: BenchmarkArtifact, lang: Lang): string {
  if (lang !== 'es') return b.verdict.outcome;
  const v = b.verdict;
  const all = v.supports.all;
  const geo = v.supports.geometry;
  const name = (arm: string) => label(arm, 'es');
  const parts: string[] = [];
  if (v.depends_on_support) {
    parts.push(
      `EL VEREDICTO DEPENDE DE QUÉ FILAS SE PUNTÚAN. Sobre los ${all.n_blasts} tiros, el mejor brazo aprendido con cada sitio excluido, ${name(all.best_learned_arm)}, explica ${f(all.best_learned_r2_identity)} y el nivel aprendido ${all.generalises_across_sites ? 'cumple' : 'no cumple'} el criterio. Sobre los ${geo.n_blasts} tiros con geometría resoluble, las filas donde también se puntúan los brazos clásicos, ${name(geo.best_learned_arm)} explica ${f(geo.best_learned_r2_identity)}, ${f(geo.margin_over_null)} sobre el nulo, y el nivel ${geo.generalises_across_sites ? 'lo cumple' : 'no lo cumple'}. Los tiros que separan los dos conjuntos son de ${v.sites_outside_geometry_support.join(', ')}.`,
    );
  } else if (all.generalises_across_sites) {
    parts.push(`El nivel aprendido generaliza entre sitios: ${name(all.best_learned_arm)} explica ${f(all.best_learned_r2_identity)} de la varianza y supera a un predictor constante por ${f(all.margin_over_null)}.`);
  } else {
    parts.push(`EL NIVEL APRENDIDO NO GENERALIZA ENTRE SITIOS: el mejor brazo aprendido, ${name(all.best_learned_arm)}, explica ${f(all.best_learned_r2_identity)} con cada sitio excluido.`);
  }
  if (!v.arms_with_interval_above_zero.length) {
    parts.push('Fuera de los brazos que su fuente ajustó sobre este corpus, ningún brazo tiene un intervalo al 95 por ciento por remuestreo de sitios por encima de cero: con diez sitios, ninguno se distingue de predecir la media del corpus.');
  }
  if (all.null_pearson_r !== null && all.null_pearson_r < 0) {
    parts.push(`Las predicciones del nulo con el sitio excluido se correlacionan con las mediciones en ${f(all.null_pearson_r, 2)}: excluir un sitio grueso baja la media de entrenamiento, así que todo margen sobre el nulo en este protocolo es mayor que la destreza que mide.`);
  }
  return parts.join(' ');
}

export default function Benchmark() {
  const lang = useShellLang();
  const es = lang === 'es';
  const b = useBenchmark();
  if (!b) return <div className="page-body fr-loading">{es ? 'Cargando' : 'Loading'}</div>;
  const props = { es, lang, b };
  const tabs: SubTabDef[] = [
    { id: 'verdict', label: es ? 'El veredicto' : 'The verdict', content: <Verdict {...props} /> },
    { id: 'arms', label: es ? 'Cada brazo' : 'Every arm', content: <Arms {...props} /> },
    { id: 'published', label: es ? 'Validaciones publicadas' : 'Published hold-outs', content: <Published {...props} /> },
    { id: 'network', label: es ? 'Semillas de la red' : 'Network seeds', content: <Seeds {...props} /> },
    { id: 'robustness', label: es ? 'Robustez' : 'Robustness', content: <Robustness {...props} /> },
    { id: 'live', label: es ? 'Comprobación en vivo' : 'Live check', content: <LiveCheck {...props} /> },
    { id: 'provenance', label: es ? 'Procedencia y salvedades' : 'Provenance and caveats', content: <Provenance {...props} /> },
  ];
  return (
    <div className="page-body wide prose">
      <div className="page-head">
        <h1>Benchmark</h1>
        <p className="lede">
          {es
            ? `Los mismos ${facts(b).nBlasts} tiros, los mismos brazos y tres formas de partirlos: cien sorteos aleatorios, cien deduplicados y diez retenciones de campaña completa con un intervalo por remuestreo de sitios. Cada número sale del artefacto comprometido o se recalcula en su navegador desde los modelos comprometidos. El veredicto va primero, sobre los dos conjuntos de filas de los que depende.`
            : `The same ${facts(b).nBlasts} blasts, the same arms and three ways of splitting them: a hundred random draws, a hundred deduplicated draws and ten whole-campaign hold-outs with a site-resampled interval. Every number comes from the committed artifact or is recomputed in your browser from the committed models. The verdict leads, on the two row sets it depends on.`}
        </p>
      </div>
      <SubTabs tabs={tabs} ariaLabel={es ? 'secciones del benchmark' : 'benchmark sections'} orientation="vertical" />
    </div>
  );
}

/* ------------------------------------------------------------------------------------------- */

function Verdict({ es, lang, b }: TabProps) {
  const v = b.verdict;
  const F = facts(b);
  return (
    <section>
      <h2>{es ? 'El veredicto' : 'The verdict'}</h2>
      <Callout variant={v.generalises_across_sites && !v.depends_on_support ? 'note' : 'strong'} title={es ? 'Lo que escribe el benchmark' : 'What the benchmark writes'}>
        {verdictText(b, lang)}
      </Callout>
      <p>
        {es
          ? 'El criterio se escribió antes de la primera corrida como un margen sobre el nulo y nada más. Esa corrida dio un mejor brazo aprendido de -0.034 frente a un nulo de -0.216, y la regla de solo margen declaró que el nivel aprendido generaliza para un brazo peor que una constante; entonces se agregó la mitad de positividad. La frase no ha cambiado desde entonces y una prueba del motor fija su resumen. Pide que el mejor brazo aprendido, con cada sitio excluido, explique una varianza positiva y al menos 0.10 más que el nulo. Desde 0.05 se evalúa sobre dos conjuntos de filas, porque los brazos clásicos no pueden responder en Miami y compararlos con los aprendidos sobre denominadores distintos fue lo que fijó el veredicto anterior.'
          : 'The criterion was first written, before the first run, as a margin over the null alone. That run produced a best learned arm at -0.034 against a null at -0.216, and the margin-only rule declared that the learned tier generalises, for an arm that does worse than a constant; the positivity half was added then. The sentence has not changed since, and an engine test pins its digest. It asks that the best learned arm, with each site held out, explain a positive variance and at least 0.10 more than the null. Since 0.05 it is evaluated on two row sets, because the classical arms cannot answer at Miami, and comparing them with the learned arms over different denominators is what set the previous verdict.'}{' '}
        <Cite id="roberts2017" />
      </p>
      <SupportsDiagram
        all={{ n: v.supports.all.n_blasts, best: v.supports.all.best_learned_r2_identity, arm: label(v.supports.all.best_learned_arm, lang) }}
        geometry={{ n: v.supports.geometry.n_blasts, best: v.supports.geometry.best_learned_r2_identity, arm: label(v.supports.geometry.best_learned_arm, lang) }}
      />
      <table className="fr-table">
        <thead>
          <tr>
            <th />
            <th>{es ? `todos (${v.supports.all.n_blasts})` : `all (${v.supports.all.n_blasts})`}</th>
            <th>{es ? `con geometría (${v.supports.geometry.n_blasts})` : `with geometry (${v.supports.geometry.n_blasts})`}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{es ? 'mejor brazo aprendido' : 'best learned arm'}</td>
            <td>{label(v.supports.all.best_learned_arm, lang)}: {f(v.supports.all.best_learned_r2_identity)}</td>
            <td>{label(v.supports.geometry.best_learned_arm, lang)}: {f(v.supports.geometry.best_learned_r2_identity)}</td>
          </tr>
          <tr>
            <td>{es ? 'su intervalo al 95 por ciento' : 'its 95 percent interval'}</td>
            <td>{iv(v.supports.all.best_learned_interval_95, 2, es)}</td>
            <td>{iv(v.supports.geometry.best_learned_interval_95, 2, es)}</td>
          </tr>
          <tr>
            <td>{es ? 'nulo' : 'null'}</td>
            <td>{f(v.supports.all.null_r2_identity)}</td>
            <td>{f(v.supports.geometry.null_r2_identity)}</td>
          </tr>
          <tr>
            <td>{es ? 'margen sobre el nulo' : 'margin over the null'}</td>
            <td>{f(v.supports.all.margin_over_null)}</td>
            <td>{f(v.supports.geometry.margin_over_null)}</td>
          </tr>
          <tr>
            <td>{es ? 'cumple el criterio' : 'meets the criterion'}</td>
            <td className={v.supports.all.generalises_across_sites ? 'fr-ok' : 'fr-bad'}>{v.supports.all.generalises_across_sites ? (es ? 'sí' : 'yes') : 'no'}</td>
            <td className={v.supports.geometry.generalises_across_sites ? 'fr-ok' : 'fr-bad'}>{v.supports.geometry.generalises_across_sites ? (es ? 'sí' : 'yes') : 'no'}</td>
          </tr>
        </tbody>
      </table>
      <p>
        {es
          ? `Lo que el benchmark sostiene sin ambigüedad: con cada campaña retenida, cada brazo aprendido pierde entre ${f(F.learnedGapRange[0], 2)} y ${f(F.learnedGapRange[1], 2)} de la varianza que explica en las particiones aleatorias. Lo que no puede separar: la ecuación clásica (${f(F.site('kuznetsov'))}, intervalo ${iv(F.interval('kuznetsov'), 2, true)}) y el mejor aprendido. Fuera de la regresión publicada, que está dentro de la muestra, ningún intervalo queda por encima de cero.`
          : `What the benchmark supports without ambiguity: with each campaign held out, every learned arm loses between ${f(F.learnedGapRange[0], 2)} and ${f(F.learnedGapRange[1], 2)} of the variance it explains on random splits. What it cannot separate: the classical equation (${f(F.site('kuznetsov'))}, interval ${iv(F.interval('kuznetsov'))}) and the best learned arm. Outside the published regression, which is in sample, no interval sits above zero.`}{' '}
        <Cite id="field2007" />
      </p>
      {refs('b-verdict', es)}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

function Arms({ es, lang, b }: TabProps) {
  const F = facts(b);
  const rows: IntervalRow[] = ORDER.filter((arm) => b.protocols['leave-one-site-out'].arms[arm]).map((arm) => {
    const r = F.random(arm)?.repeats;
    const d = F.dedup(arm)?.repeats;
    const g = F.grouped(arm);
    return {
      id: arm,
      label: label(arm, lang),
      note: IN_SAMPLE_ARMS[arm]?.[lang],
      marks: [
        { kind: 'random' as MarkKind, value: r?.median ?? null, low: r?.p05, high: r?.p95 },
        { kind: 'dedup' as MarkKind, value: d?.median ?? null, low: d?.p05, high: d?.p95 },
        { kind: 'site' as MarkKind, value: g?.supports.all.score.r2_identity ?? null, low: g?.supports.all.interval_95?.[0], high: g?.supports.all.interval_95?.[1] },
        { kind: 'site-geometry' as MarkKind, value: g?.supports.geometry.score.r2_identity ?? null, low: g?.supports.geometry.interval_95?.[0], high: g?.supports.geometry.interval_95?.[1] },
      ],
    };
  });
  const labels: Record<MarkKind, string> = {
    random: es ? 'aleatorio, mediana y 5 a 95 por ciento' : 'random, median and 5 to 95 percent',
    dedup: es ? 'deduplicado, mediana y 5 a 95' : 'deduplicated, median and 5 to 95',
    site: es ? 'sitio excluido, todos, intervalo 95' : 'site held out, all, 95 interval',
    'site-geometry': es ? 'sitio excluido, con geometría' : 'site held out, with geometry',
  };
  return (
    <section>
      <h2>{es ? 'Cada brazo, cada protocolo' : 'Every arm, every protocol'}</h2>
      <p>
        {es
          ? 'Cada fila es un brazo; cada marca, un protocolo. Las barras de los protocolos aleatorios van del percentil 5 al 95 de cien sorteos; las de la retención de sitio son intervalos al 95 por ciento por remuestreo de sitios. El cero es predecir la media de las filas puntuadas.'
          : 'Each row is an arm; each mark, a protocol. The bars of the random protocols run from the 5th to the 95th percentile of a hundred draws; those of the site hold-out are site-resampled 95 percent intervals. Zero is predicting the mean of the scored rows.'}
      </p>
      <IntervalChart rows={rows} labels={labels} />
      <div className="fr-scroll-x">
        <table className="fr-table fr-table-wide">
          <thead>
            <tr>
              <th>{es ? 'brazo' : 'arm'}</th>
              <th>{es ? 'aleatorio' : 'random'}</th>
              <th>{es ? 'deduplicado' : 'deduplicated'}</th>
              <th>{es ? 'sitio excluido, todos' : 'site held out, all'}</th>
              <th>{es ? 'abst.' : 'abst.'}</th>
              <th>{es ? 'con geometría' : 'with geometry'}</th>
              <th>RMSE</th>
              <th>{es ? 'ajustado con' : 'fitted on'}</th>
            </tr>
          </thead>
          <tbody>
            {ORDER.filter((arm) => b.protocols['leave-one-site-out'].arms[arm]).map((arm) => {
              const g = F.grouped(arm);
              const p = b.provenance[arm];
              return (
                <tr key={arm} data-in-sample={p?.in_sample_corpus ? 'true' : undefined}>
                  <td>{label(arm, lang)}</td>
                  <td>{f(F.random(arm)?.r2_identity)}</td>
                  <td>{f(F.dedup(arm)?.r2_identity)}</td>
                  <td className={p?.in_sample_corpus ? 'fr-fine' : (g?.r2_identity ?? -1) > 0 ? 'fr-ok' : 'fr-bad'}>
                    {f(g?.r2_identity)} <span className="fr-fine">{iv(g?.supports.all.interval_95, 2, es)}</span>
                  </td>
                  <td>{g?.n_abstained || ''}</td>
                  <td>{f(g?.supports.geometry.score.r2_identity)}</td>
                  <td>{formatSize(g?.rmse_m)}</td>
                  <td className="fr-fine">
                    {p?.in_sample_corpus
                      ? IN_SAMPLE_ARMS[arm]?.[lang] ?? (es ? 'dentro de la muestra' : 'in sample')
                      : p?.uses_site_constant
                        ? es ? 'factor de roca del propio sitio' : 'the site’s own rock factor'
                        : p?.router_in_sample
                          ? es ? 'filas de entrenamiento; enrutador en muestra' : 'training rows; router in sample'
                          : es ? 'filas de entrenamiento' : 'training rows'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Callout variant="honest" title={es ? 'Cómo leer la tabla' : 'How to read the table'}>
        {es
          ? 'La regresión publicada se ajustó sobre estos 97 tiros, así que su columna con el sitio excluido es un ajuste dentro de la muestra y no transferencia. El brazo clásico de factor del sitio usa información del propio sitio; el de transferencia no, y puntúa casi lo mismo. Los brazos con abstenciones se puntúan sobre menos filas, por eso la columna con geometría compara a todos sobre las mismas.'
          : 'The published regression was fitted on these 97 blasts, so its site-held-out column is an in-sample fit and not transfer. The site-factor classical arm uses information about the site itself; the transfer arm does not, and scores almost the same. Arms with abstentions are scored on fewer rows, which is why the with-geometry column compares them all on the same ones.'}
      </Callout>
      {refs('b-protocols', es)}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

function Published({ es, b }: TabProps) {
  const arms = b.published_reproduction.published_holdout_arms;
  const without = b.published_reproduction.without_the_leaked_row;
  const order = ['classical', 'regression', 'neural-net', 'null'];
  const names: Record<string, string> = {
    classical: es ? 'clásico, como se publicó' : 'classical, as published',
    regression: es ? 'regresión, como se publicó' : 'regression, as published',
    'neural-net': es ? 'red neuronal, como se publicó' : 'neural network, as published',
    null: es ? 'nulo: la media de entrenamiento' : 'null: the training mean',
  };
  const gain = arms.classical?.rmse_m && arms.null?.rmse_m ? 1 - arms.classical.rmse_m / arms.null.rmse_m : null;
  return (
    <section>
      <h2>{es ? 'Las validaciones publicadas' : 'The published hold-outs'}</h2>
      <p>
        {es
          ? `El artículo de 2012 imprime, en una misma tabla y sobre las mismas doce filas, las predicciones de tres modelos. Puntuadas aquí con un nulo al lado, la ecuación clásica es la peor de las tres y mejora en ${gain === null ? 'n/a' : Math.round(gain * 100)} por ciento el error de predecir una constante. Esas doce filas son de los mismos sitios que el entrenamiento, así que esta es la validación que reporta la literatura y no una prueba de transferencia.`
          : `The 2012 paper prints, in one table and on the same twelve rows, the predictions of three models. Scored here with a null beside them, the classical equation is the worst of the three and improves on the error of predicting a constant by ${gain === null ? 'n/a' : Math.round(gain * 100)} percent. Those twelve rows come from the same sites as the training rows, so this is the validation the literature reports and not a transfer test.`}{' '}
        <Cite id="kulatilake2012" />
      </p>
      <table className="fr-table">
        <thead>
          <tr>
            <th>{es ? 'modelo' : 'model'}</th>
            <th>{es ? 'varianza explicada' : 'variance explained'}</th>
            <th>{es ? 'correlación al cuadrado' : 'squared correlation'}</th>
            <th>RMSE</th>
            <th>MAPE</th>
          </tr>
        </thead>
        <tbody>
          {order.map((key) => (
            <tr key={key} className={key === 'null' ? 'fr-row-null' : ''}>
              <td>{names[key]}</td>
              <td className={(arms[key]?.r2_identity ?? 0) > 0 ? 'fr-ok' : 'fr-bad'}>{f(arms[key]?.r2_identity)}</td>
              <td>{f(arms[key]?.pearson_r2)}</td>
              <td>{formatSize(arms[key]?.rmse_m)}</td>
              <td>{arms[key]?.mape_pct === null || arms[key]?.mape_pct === undefined ? 'n/a' : `${arms[key]?.mape_pct?.toFixed(1)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>{es ? 'La ecuación publicada, recalculada, supera a su propia tabla' : 'The published equation, recomputed, beats its own table'}</h3>
      <table className="fr-table">
        <thead>
          <tr>
            <th>{es ? 'conjunto' : 'hold-out'}</th>
            <th>{es ? 'filas' : 'rows'}</th>
            <th>{es ? 'tabla del artículo' : 'the paper’s table'}</th>
            <th>{es ? 'recalculada' : 'recomputed'}</th>
          </tr>
        </thead>
        <tbody>
          {(['2010', '2012'] as const).map((key) => {
            const block = b.published_reproduction[key] as ReproductionBlock | undefined;
            if (!block) return null;
            return (
              <tr key={key}>
                <td>{key}</td>
                <td>{block.n_rows}</td>
                <td>{f(block.as_published.r2_identity)}</td>
                <td className="fr-ok">{f(block.recomputed.r2_identity)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <h3>{es ? 'Una fila en entrenamiento y en validación' : 'One row in both training and validation'}</h3>
      <p>
        {es
          ? 'El tiro Rc1 aparece en la tabla de entrenamiento del artículo de 2010 y en el conjunto de validación del de 2012. Quitarlo apenas mueve los modelos aprendidos y le suma mucho al clásico, porque es su segunda peor fila.'
          : 'Blast Rc1 appears in the 2010 paper’s training table and in the 2012 paper’s hold-out. Removing it barely moves the learned models and adds a great deal to the classical one, because it is that model’s second-worst row.'}{' '}
        <Cite id="hudaverdi2010" />
      </p>
      <table className="fr-table">
        <thead>
          <tr>
            <th>{es ? 'modelo' : 'model'}</th>
            <th>{es ? 'con Rc1' : 'with Rc1'}</th>
            <th>{es ? 'sin Rc1' : 'without Rc1'}</th>
          </tr>
        </thead>
        <tbody>
          {['classical', 'regression', 'neural-net'].map((key) => (
            <tr key={key}>
              <td>{names[key]}</td>
              <td>{f(arms[key]?.r2_identity)}</td>
              <td>{f(without[key]?.r2_identity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {refs('b-published', es)}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

function Seeds({ es, lang, b }: TabProps) {
  const sweep = b.network_seed_sweep;
  const sorted = [...sweep.r2_identity].sort((x, y) => x - y);
  const series: SeriesSpec[] = [
    { id: 'seeds', label: es ? 'reproducción, por semilla' : 'reproduction, per seed', values: sorted },
    { id: 'published', label: es ? 'publicado' : 'published', values: sorted.map(() => sweep.published), dashed: true },
  ];
  return (
    <section>
      <h2>{es ? 'La red publicada, a lo largo de las semillas' : 'The published network, across seeds'}</h2>
      <p>
        {es
          ? `La red de 2012 está especificada por completo, así que se puede reproducir y no solo reimplementar. Reproducida sobre ${sweep.n_seeds} semillas, su varianza explicada en el conjunto publicado va de ${f(sweep.min)} a ${f(sweep.max)}, con mediana ${f(sweep.median)}; el ${f(sweep.published)} publicado queda por encima de todas.`
          : `The 2012 network is fully specified, so it can be reproduced rather than only reimplemented. Reproduced over ${sweep.n_seeds} seeds, its variance explained on the published hold-out runs from ${f(sweep.min)} to ${f(sweep.max)}, with a median of ${f(sweep.median)}; the published ${f(sweep.published)} lies above every one.`}{' '}
        <Cite id="kulatilake2012" />
      </p>
      <LineChart
        x={sorted.map((_, i) => i)}
        series={series}
        xLabel={es ? 'semilla, ordenada' : 'seed, sorted'}
        yLabel={es ? 'varianza explicada' : 'variance explained'}
        height={240}
        legend
        xTickFormat={(v) => `#${Math.round(v)}`}
        valueFormat={(v) => f(v)}
      />
      <table className="fr-table">
        <thead>
          <tr>
            <th>{es ? 'tiro' : 'blast'}</th>
            <th>{es ? 'medido' : 'measured'}</th>
            <th>{es ? 'publicado' : 'published'}</th>
            <th>{es ? 'rango en las semillas' : 'range across seeds'}</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(sweep.per_blast).map(([id, row]) => {
            const outside = row.min_m !== null && row.max_m !== null && (row.published_m < row.min_m || row.published_m > row.max_m);
            return (
              <tr key={id} className={outside ? 'fr-row-bad' : ''}>
                <td><code>{id}</code></td>
                <td>{formatSize(row.measured_m)}</td>
                <td>{formatSize(row.published_m)}</td>
                <td>
                  {row.min_m === null ? 'n/a' : `${formatSize(row.min_m)} ${lang === 'es' ? 'a' : 'to'} ${formatSize(row.max_m)}`}
                  {outside ? <span className="fr-badge fr-badge-warn">{es ? 'fuera del rango' : 'outside the range'}</span> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Callout variant="note" title={es ? 'Qué se afirma, y qué no' : 'What is claimed, and what is not'}>
        {es
          ? 'No se afirma que el resultado publicado sea falso. Lo que el barrido establece es que no es robusto a la semilla; las filas marcadas, donde lo publicado queda fuera de todo lo que alcanzó la reproducción, son las que la propia fuente reporta como sus más inestables.'
          : 'It is not claimed that the published result is wrong. What the sweep establishes is that it is not robust to the seed; the marked rows, where the published value falls outside everything the reproduction reached, are the rows the source itself reports as its most unstable.'}
      </Callout>
      {refs('b-network', es)}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

function Robustness({ es, lang, b }: TabProps) {
  const F = facts(b);
  const [arm, setArm] = useState('stacking');
  const [protocol, setProtocol] = useState<'random' | 'dedup'>('random');
  const block = protocol === 'random' ? F.random(arm) : F.dedup(arm);
  const published = protocol === 'random' ? b.verdict.published_random_split_figures[arm]?.published : undefined;
  const arms = ORDER.filter((a) => a !== 'null' && F.random(a));
  return (
    <section>
      <h2>{es ? 'Robustez: cuánto se mueve un puntaje de sorteo a sorteo' : 'Robustness: how far a score moves from draw to draw'}</h2>
      <p>
        {es
          ? 'Un solo sorteo de 19 filas de prueba no mide un protocolo. El histograma muestra los cien sorteos de un brazo, con su mediana, el puntaje con cada sitio excluido y, donde existe, la cifra que la fuente publicó de un único sorteo.'
          : 'A single draw of 19 test rows does not measure a protocol. The histogram shows an arm’s hundred draws, with their median, the score with each site held out and, where there is one, the figure the source published from a single draw.'}{' '}
        <Cite id="sui2025" />
      </p>
      <div className="fr-inline-controls">
        <label className="fr-control">
          {es ? 'Brazo' : 'Arm'}
          <select value={arm} onChange={(e) => setArm(e.target.value)}>
            {arms.map((a) => (
              <option key={a} value={a}>{label(a, lang)}</option>
            ))}
          </select>
        </label>
        <label className="fr-control">
          {es ? 'Protocolo' : 'Protocol'}
          <select value={protocol} onChange={(e) => setProtocol(e.target.value as 'random' | 'dedup')}>
            <option value="random">{es ? 'aleatorio 80/20' : 'random 80/20'}</option>
            <option value="dedup">{es ? 'deduplicado' : 'deduplicated'}</option>
          </select>
        </label>
      </div>
      {block ? (
        <DrawHistogram
          draws={block.draws}
          marks={[
            { value: block.repeats.median, label: es ? 'mediana' : 'median', colour: 'accent' },
            { value: F.site(arm), label: es ? 'sitio excluido' : 'site held out', colour: 'warn' },
            ...(published !== undefined ? [{ value: published, label: es ? 'publicado' : 'published', colour: 'bad' as const }] : []),
          ]}
        />
      ) : null}
      <p>
        {es
          ? `Para el ensamble apilado la mediana es ${f(F.random('stacking')?.r2_identity)} y el percentil 95, ${f(F.random('stacking')?.repeats.p95)}; el 0.943 publicado queda por encima de ${Math.round((b.verdict.published_random_split_figures.stacking?.share_of_draws_below ?? 0) * 100)} de cada 100 sorteos. Para el brazo clásico, los sorteos van de ${f(F.random('kuznetsov')?.repeats.p05, 2)} a ${f(F.random('kuznetsov')?.repeats.p95, 2)} entre los percentiles 5 y 95: un único sorteo puede caer a cualquier lado de cero, y la semilla 0 cayó bajo cero.`
          : `For the stacked ensemble the median is ${f(F.random('stacking')?.r2_identity)} and the 95th percentile ${f(F.random('stacking')?.repeats.p95)}; the published 0.943 lies above ${Math.round((b.verdict.published_random_split_figures.stacking?.share_of_draws_below ?? 0) * 100)} of 100 draws. For the classical arm, the draws run from ${f(F.random('kuznetsov')?.repeats.p05, 2)} to ${f(F.random('kuznetsov')?.repeats.p95, 2)} between the 5th and 95th percentiles: a single draw can land on either side of zero, and seed 0 landed below it.`}
      </p>
      {refs('b-protocols', es)}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

const LIVE_ARMS = ['random-forest', 'xgboost', 'stacking', 'published-neural-net', 'svr-rbf', 'refitted-regression'];

function score(pairs: [number, number][]) {
  const n = pairs.length;
  if (n < 2) return { r2: null as number | null, rmse: null as number | null, n };
  const mean = pairs.reduce((s, [m]) => s + m, 0) / n;
  const ssRes = pairs.reduce((s, [m, p]) => s + (m - p) ** 2, 0);
  const ssTot = pairs.reduce((s, [m]) => s + (m - mean) ** 2, 0);
  return { r2: 1 - ssRes / ssTot, rmse: Math.sqrt(ssRes / n), n };
}

function LiveCheck({ es, lang, b }: TabProps) {
  const corpus = useModels('corpus');
  const [arm, setArm] = useState('random-forest');
  const [set, setSet] = useState<'published-2012' | 'field-2025'>('published-2012');
  const rows = (b.holdout_rows ?? []).filter((r) => r.set === set);
  const live = useMemo(() => {
    if (!corpus) return null;
    const arms = fittedArms(corpus);
    const out: Record<string, { r2: number | null; rmse: number | null; n: number; predictions: Record<string, number | null>; parity: number }> = {};
    for (const name of LIVE_ARMS) {
      const model = arms[name];
      if (!model) continue;
      const predictions: Record<string, number | null> = {};
      const pairs: [number, number][] = [];
      let parity = 0;
      rows.forEach((row) => {
        const { value } = predictModel(model, row.features);
        predictions[row.blast_id] = value;
        if (value !== null) pairs.push([row.x50_m, value]);
        const i = corpus.fixtures.inputs.findIndex((input) => input.blast_id === row.blast_id);
        const expected = i >= 0 ? corpus.fixtures.expected[name]?.[i] : undefined;
        if (expected !== undefined && expected !== null && value !== null && Math.abs(expected - value) <= 1e-12 * Math.abs(expected)) parity += 1;
      });
      out[name] = { ...score(pairs), predictions, parity };
    }
    return out;
  }, [corpus, rows]);
  const points = live?.[arm]
    ? rows
        .filter((r) => live[arm].predictions[r.blast_id] !== null)
        .map((r) => ({ blastId: r.blast_id, site: r.site, measuredM: r.x50_m, predictedM: live[arm].predictions[r.blast_id] as number, extrapolated: set === 'field-2025' }))
    : [];
  return (
    <section>
      <h2>{es ? 'Comprobación en vivo sobre tiros reales retenidos' : 'Live check on real held-out blasts'}</h2>
      <p>
        {es
          ? 'Esta sección no lee un puntaje horneado: carga los modelos ajustados sobre los 97 tiros, los corre en su navegador sobre tiros reales que no están en el corpus, y puntúa ahí mismo. Dos conjuntos: los doce tiros de validación de 2012, de los mismos sitios que el entrenamiento, y los cinco tiros de campo de 2025, en una roca más blanda que cualquiera del corpus.'
          : 'This section reads no baked score: it loads the models fitted on the 97 blasts, runs them in your browser on real blasts that are not in the corpus, and scores them on the spot. Two sets: the twelve 2012 hold-out blasts, from the same sites as the training rows, and the five 2025 field blasts, in a rock softer than any in the corpus.'}{' '}
        <Cite id="kulatilake2012" />{' '}
        <Cite id="sui2025" />
      </p>
      <div className="fr-inline-controls">
        <label className="fr-control">
          {es ? 'Conjunto' : 'Set'}
          <select value={set} onChange={(e) => setSet(e.target.value as 'published-2012' | 'field-2025')}>
            <option value="published-2012">{es ? 'validación publicada 2012 (12)' : 'published hold-out 2012 (12)'}</option>
            <option value="field-2025">{es ? 'campo 2025 (5), extrapolación' : 'field 2025 (5), extrapolation'}</option>
          </select>
        </label>
        <label className="fr-control">
          {es ? 'Brazo en el gráfico' : 'Arm in the chart'}
          <select value={arm} onChange={(e) => setArm(e.target.value)}>
            {LIVE_ARMS.map((a) => (
              <option key={a} value={a}>{label(a, lang)}</option>
            ))}
          </select>
        </label>
      </div>
      {live ? (
        <>
          <table className="fr-table">
            <thead>
              <tr>
                <th>{es ? 'brazo, ajustado sobre los 97' : 'arm, fitted on the 97'}</th>
                <th>{es ? 'varianza explicada, en vivo' : 'variance explained, live'}</th>
                <th>RMSE</th>
                <th>{es ? 'puntuadas' : 'scored'}</th>
                <th>{es ? 'iguales al modelo original' : 'equal to the original model'}</th>
              </tr>
            </thead>
            <tbody>
              {LIVE_ARMS.filter((a) => live[a]).map((a) => (
                <tr key={a}>
                  <td>{label(a, lang)}</td>
                  <td className={(live[a].r2 ?? -1) > 0 ? 'fr-ok' : 'fr-bad'}>{f(live[a].r2)}</td>
                  <td>{formatSize(live[a].rmse)}</td>
                  <td>{live[a].n} / {rows.length}</td>
                  <td>{live[a].parity} / {rows.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="fr-parity-box">
            <ParityChart points={points} height={380} />
          </div>
        </>
      ) : (
        <div className="fr-loading">{es ? 'Cargando los modelos' : 'Loading the models'}</div>
      )}
      <Equation
        tex={String.raw`R^2_{\mathrm{id}} = 1 - \frac{\sum_{i\in H}(y_i - \hat y_i)^2}{\sum_{i\in H}(y_i - \bar y_H)^2}`}
        caption={es ? 'Calculado en el navegador sobre el conjunto retenido H elegido.' : 'Computed in the browser over the chosen held-out set H.'}
      />
      <Callout variant="note" title={es ? 'Cómo leerlo' : 'How to read it'}>
        {es
          ? 'Los doce tiros de 2012 son de los mismos sitios que el entrenamiento, así que un modelo aprendido debería ir bien, y lo hace: es el protocolo que la literatura reporta. Los cinco de 2025 están fuera de la envolvente en el módulo, la entrada que más pesa; con cinco tiros de un mismo sitio, la varianza explicada es inestable y se lee junto con el error.'
          : 'The twelve 2012 blasts are from the same sites as the training rows, so a learned model should do well, and does: this is the protocol the literature reports. The five 2025 blasts lie outside the envelope on the modulus, the input that weighs most; with five blasts from one site, variance explained is unstable and is read together with the error.'}
      </Callout>
      {refs('b-live', es)}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

function Provenance({ es, b }: TabProps) {
  return (
    <section>
      <h2>{es ? 'Procedencia y salvedades' : 'Provenance and caveats'}</h2>
      <p>
        {es
          ? `Benchmark horneado con el motor ${b.engine_version}, la aplicación ${b.app_version}, semilla ${b.seed}, ${b.n_repeats} sorteos por protocolo aleatorio y ${b.n_boot} remuestreos de sitios por intervalo, sobre el corpus con resumen ${b.corpus_digest.slice(0, 16)}. Los valores numéricos de los tres conjuntos reales son hechos experimentales reutilizados con cita; los artículos no se redistribuyen.`
          : `Benchmark baked with engine ${b.engine_version}, application ${b.app_version}, seed ${b.seed}, ${b.n_repeats} draws per random protocol and ${b.n_boot} site resamples per interval, on the corpus with digest ${b.corpus_digest.slice(0, 16)}. The numeric values of the three real sets are experimental facts reused with citation; the articles are not redistributed.`}{' '}
        <Cite id="hudaverdi2010" />
      </p>
      <ul className="fr-list">
        <li>{es ? 'El objetivo es un tamaño continuo, así que no hay matriz de confusión ni curvas ROC: la medida es la varianza explicada con su intervalo, el error y el sesgo.' : 'The target is a continuous size, so there is no confusion matrix or ROC curve: the measure is variance explained with its interval, the error and the bias.'}</li>
        <li>{es ? 'El método de medición difiere entre campañas y la fuente lo declara solo para tres; parte de lo que separa a las campañas puede ser cómo se midió cada una.' : 'The measurement method differs between campaigns and the source states it for only three; part of what separates the campaigns may be how each was measured.'}</li>
        <li>{es ? 'Diez campañas son pocas para un intervalo por remuestreo de sitios; los intervalos son anchos porque la evidencia es poca, no por el método.' : 'Ten campaigns are few for a site-resampled interval; the intervals are wide because the evidence is thin, not because of the method.'}</li>
        <li>{es ? 'Las distribuciones completas no se puntúan: ningún conjunto disponible trae una curva medida.' : 'Full distributions are not scored: no available set carries a measured curve.'}</li>
        <li>{es ? 'Los brazos aprendidos son reproducciones con parámetros publicados; un ajuste nuevo de hiperparámetros sobre este corpus quedaría fuera de lo que este benchmark mide.' : 'The learned arms are reproductions with published parameters; a new hyperparameter search on this corpus would fall outside what this benchmark measures.'}</li>
      </ul>
      {refs('b-sites', es)}
    </section>
  );
}
