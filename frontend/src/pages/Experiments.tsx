/**
 * Experiments: the questions, the exact metrics, the coverage, how the score responds to the protocol
 * and to the site, how the design responds to its levers, and the diagnostics. Benchmark asks which
 * model to trust; this page shows how the experiment that answers it was built and how it behaves.
 */

import { Callout, Cite, Equation, Refs, SubTabs, useShellLang } from '@fasl-work/caos-app-shell';
import type { SubTabDef } from '@fasl-work/caos-app-shell';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { SECTION_REFS } from '../data/citations';
import { ARM_BY_ID, CATEGORY_LABEL, FEATURE_LABEL, formatSize, loadCase } from '../lib/artifacts';
import type { BenchmarkArtifact, CaseArtifact, CaseIndex, Lang } from '../lib/contract.types';
import { f, facts, useBenchmark, useIndex } from '../lib/facts';
import { LineChart, ParityChart, type SeriesSpec } from '../viz/Charts';
import { SafeProtocolDiagram } from '../viz/Diagrams';
import { RatioTable, ResponseHeatmap } from '../viz/Evidence';
import { notAvailable, num } from '../lib/format';

interface TabProps {
  es: boolean;
  lang: Lang;
  b: BenchmarkArtifact | null;
  index: CaseIndex | null;
}

const refs = (key: string, es: boolean) => <Refs ids={SECTION_REFS[key]} label={es ? 'Fuentes' : 'Sources'} />;
const label = (arm: string, lang: Lang) => ARM_BY_ID.get(arm)?.label[lang] ?? arm;
const FEATURES = ['S_over_B', 'H_over_B', 'B_over_D', 'T_over_B', 'Pf_kg_m3', 'XB_m', 'E_GPa'];

export default function Experiments() {
  const lang = useShellLang();
  const es = lang === 'es';
  const b = useBenchmark();
  const index = useIndex();
  const props = { es, lang, b, index };
  const tabs: SubTabDef[] = [
    // Six peers at most (ADR-0071 rule 5): the metrics belong with the questions they answer.
    {
      id: 'design',
      label: es ? 'Preguntas, diseño y métricas' : 'Questions, design and metrics',
      content: (
        <>
          <Design {...props} />
          <Metrics {...props} />
        </>
      ),
    },
    { id: 'coverage', label: es ? 'Cobertura' : 'Coverage', content: <Coverage {...props} /> },
    { id: 'protocol', label: es ? 'Sensibilidad al protocolo' : 'Protocol sensitivity', content: <ProtocolSensitivity {...props} /> },
    { id: 'sites', label: es ? 'Por sitio' : 'By site', content: <BySite {...props} /> },
    { id: 'response', label: es ? 'Respuesta del diseño' : 'Design response', content: <Response {...props} /> },
    { id: 'diagnostics', label: es ? 'Diagnósticos' : 'Diagnostics', content: <Diagnostics {...props} /> },
  ];
  return (
    <div className="page-body wide prose fr-doc">
      <div className="page-head">
        <h1>{es ? 'Experimentos' : 'Experiments'}</h1>
        <p className="lede">
          {es
            ? 'Cómo se construyó el experimento que responde qué modelo merece confianza: las preguntas, las métricas exactas con sus constantes, los dieciséis casos y por qué está cada uno, cómo responde el puntaje al protocolo y al sitio, cómo responde el diseño a sus palancas, y los diagnósticos que informan la lectura sin cambiarla. Los puntajes finales están en Benchmark.'
            : 'How the experiment that answers which model deserves trust was built: the questions, the exact metrics with their constants, the sixteen cases and why each is there, how the score responds to the protocol and to the site, how the design responds to its levers, and the diagnostics that inform the reading without changing it. The final scores are on Benchmark.'}
        </p>
      </div>
      <SubTabs tabs={tabs} ariaLabel={es ? 'secciones de experimentos' : 'experiment sections'} orientation="vertical" />
    </div>
  );
}

/* ------------------------------------------------------------------------------------------- */

function Design({ es }: TabProps) {
  return (
    <section>
      <h2>{es ? 'Las preguntas, y cómo se diseñó cada experimento' : 'The questions, and how each experiment was designed'}</h2>
      <p>
        {es
          ? 'El benchmark responde cinco preguntas distintas, y cada una tiene su experimento. Separarlas importa porque un mismo número puede responder a una y no a otra: el 0,943 publicado responde la primera y nada dice de la tercera.'
          : 'The benchmark answers five distinct questions, and each has its own experiment. Keeping them apart matters because one number can answer one question and not another: the published 0.943 answers the first and says nothing about the third.'}
      </p>
      <ol className="fr-list">
        <li>{es ? '¿Qué tan bien interpola cada modelo entre tiros de campañas que ya vio? Cien particiones aleatorias 80/20, el protocolo publicado.' : 'How well does each model interpolate between blasts of campaigns it has seen? A hundred random 80/20 splits, the published protocol.'}</li>
        <li>{es ? '¿Cuánto de eso se debe a los 17 vectores de entrada repetidos? Cien particiones tras colapsar los repetidos.' : 'How much of that is due to the 17 repeated input vectors? A hundred splits after collapsing the repeats.'}</li>
        <li>{es ? '¿Llega a una mina que no vio? Diez retenciones, una campaña completa cada una, puntuadas juntas, con intervalo por remuestreo de sitios.' : 'Does it reach a mine it has not seen? Ten hold-outs, one whole campaign each, scored together, with a site-resampled interval.'}</li>
        <li>{es ? '¿Depende la conclusión de qué filas se puntúan? Cada puntaje de la tercera pregunta, sobre todos los tiros y sobre los que tienen geometría.' : 'Does the conclusion depend on which rows are scored? Every score of the third question, over every blast and over those with geometry.'}</li>
        <li>{es ? '¿Reproducen los modelos publicados sus propias cifras? Los dos conjuntos de validación publicados y un barrido de 30 semillas de la red.' : 'Do the published models reproduce their own figures? The two published hold-outs and a 30-seed sweep of the network.'}</li>
      </ol>
      <SafeProtocolDiagram />
      <p>
        {es
          ? 'Todo lo que se ajusta, se ajusta solo con las filas de entrenamiento de cada partición: la escala de las entradas, los pesos, los árboles, la recta del factor de roca de transferencia. Lo que no se puede ajustar sin el corpus se declara: el enrutador y la regresión publicada vienen ajustados por su fuente sobre los 97 tiros, y el factor de roca recuperado usa predicciones publicadas del propio sitio. El criterio de descarte se declaró antes de correr; lo que cambió en la versión 0.05.000 es lo que se informa a su lado.'
          : 'Everything that is fitted is fitted on each split’s training rows only: the input scaling, the weights, the trees, the transfer rock-factor line. What cannot be fitted without the corpus is declared: the router and the published regression come fitted by their source on the 97 blasts, and the recovered rock factor uses published predictions for the site itself. The kill criterion was declared before the run; what changed in 0.05.000 is what is reported beside it.'}{' '}
        <Cite id="roberts2017" />{' '}
        <Cite id="kapoor2023" />
      </p>
      <Callout variant="honest" title={es ? 'Lo que cambió en la versión 0.05.000, y por qué' : 'What changed in 0.05.000, and why'}>
        {es
          ? 'Antes de la versión 0.05.000 cada protocolo aleatorio era un único sorteo de 19 filas, la retención de sitio no tenía intervalo, y el brazo clásico y los aprendidos se puntuaban sobre filas distintas. Una revisión adversarial mostró que dos afirmaciones de entonces (que el modelo clásico mejora al excluir un sitio y que deduplicar sube los puntajes aprendidos) eran efectos del sorteo de la semilla 0, y que el veredicto cambia con seis tiros. Los experimentos se rediseñaron para medir esas tres cosas.'
          : 'Before 0.05.000 each random protocol was a single draw of 19 rows, the site hold-out had no interval, and the classical arm and the learned arms were scored on different rows. An adversarial review showed that two claims of that time (that the classical model improves with a site held out, and that deduplication raises the learned scores) were effects of the seed-0 draw, and that the verdict changes with six blasts. The experiments were redesigned to measure those three things.'}
      </Callout>
      {refs('e-design', es)}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

function Metrics({ es, b }: TabProps) {
  return (
    <section>
      <h2>{es ? 'Las métricas, con sus constantes' : 'The metrics, with their constants'}</h2>
      <p>
        {es
          ? 'Cada brazo, en cada caso y protocolo, se puntúa con las mismas funciones del motor. Las abstenciones se cuentan y se excluyen, nunca se reemplazan por un número; por eso cada puntaje lleva cuántas filas se puntuaron y cuántas se rechazaron, y por eso los puntajes agrupados se informan además sobre un conjunto común de filas.'
          : 'Every arm, in every case and protocol, is scored by the same engine functions. Abstentions are counted and excluded, never replaced by a number; that is why every score carries how many rows were scored and how many refused, and why the pooled scores are also reported on a common row set.'}
      </p>
      <Equation
        tex={String.raw`R^2_{\mathrm{id}} = 1 - \frac{\sum (y-\hat y)^2}{\sum (y-\bar y)^2},\quad \mathrm{RMSE} = \sqrt{\tfrac{1}{n}\textstyle\sum (y-\hat y)^2},\quad \mathrm{MAE} = \tfrac{1}{n}\textstyle\sum |y-\hat y|`}
        caption={es ? 'Varianza explicada, error cuadrático medio y error absoluto medio, en metros, sobre las n filas puntuadas.' : 'Variance explained, root mean square error and mean absolute error, in metres, over the n scored rows.'}
      />
      <Equation
        tex={String.raw`\mathrm{MAPE} = \frac{100}{n}\sum \left|\frac{y-\hat y}{y}\right|,\qquad \mathrm{bias} = \frac{1}{n}\sum(\hat y - y),\qquad r^2 = \mathrm{corr}(y, \hat y)^2`}
        caption={es ? 'Error porcentual absoluto medio, sesgo con signo, y la correlación al cuadrado que reporta la literatura como R2.' : 'Mean absolute percentage error, signed bias, and the squared correlation the literature reports as R2.'}
      />
      <p>
        {es
          ? `Constantes de esta corrida: ${b?.n_repeats ?? notAvailable()} sorteos por protocolo aleatorio con semillas consecutivas desde ${b?.seed ?? notAvailable()}; 20 por ciento de filas de prueba en cada sorteo; ${b?.n_boot ?? notAvailable()} remuestreos de sitios por intervalo, con semilla 0; un nulo que predice la media de las filas de entrenamiento de cada partición; un rango plausible de 0,001 a 3 m, fuera del cual una predicción es una abstención con su razón.`
          : `Constants of this run: ${b?.n_repeats ?? notAvailable()} draws per random protocol with consecutive seeds from ${b?.seed ?? notAvailable()}; 20 percent of rows to test in each draw; ${b?.n_boot ?? notAvailable()} site resamples per interval, with seed 0; a null that predicts the mean of each split’s training rows; a plausible range of 0.001 to 3 m, outside which a prediction is an abstention with its reason.`}
      </p>
      <Equation
        tex={String.raw`\tilde R^2 = q_{0.5}\{R^2_k\}_{k=1}^{100},\qquad [\,q_{0.05},\ q_{0.95}\,],\qquad q_p(v) = v_{(\lfloor h \rfloor)} + (h - \lfloor h \rfloor)\big(v_{(\lceil h\rceil)} - v_{(\lfloor h \rfloor)}\big),\ h = (K-1)p`}
        caption={es ? 'Un protocolo repetido se informa por la mediana de sus sorteos y sus percentiles 5 y 95, con el cuantil interpolado.' : 'A repeated protocol is reported by the median of its draws and their 5th and 95th percentiles, with the interpolated quantile.'}
      />
      <p>
        {es
          ? 'El intervalo de un puntaje agrupado remuestrea campañas: se sortean diez campañas con reposición, se juntan sus tiros con sus predicciones fuera de pliegue y se recalcula el puntaje; los percentiles 2,5 y 97,5 de las 2000 repeticiones son el intervalo. Es un bootstrap por conglomerados, y es el adecuado cuando las filas de una campaña no son independientes.'
          : 'The interval of a pooled score resamples campaigns: ten campaigns are drawn with replacement, their blasts are gathered with their out-of-fold predictions, and the score is recomputed; the 2.5th and 97.5th percentiles of the 2000 repetitions are the interval. It is a cluster bootstrap, the appropriate one when the rows of a campaign are not independent.'}{' '}
        <Cite id="efron1979" />{' '}
        <Cite id="field2007" />
      </p>
      <Callout variant="note" title={es ? 'Lo que una curva necesitaría' : 'What a curve would need'}>
        {es
          ? 'Para las distribuciones completas, la métrica sería la desviación absoluta media de la fracción pasante sobre un enrejado logarítmico común y el error en P20, P50 y P80. No se calcula porque ningún conjunto disponible trae una curva medida.'
          : 'For full distributions, the metric would be the mean absolute deviation of the passing fraction over a shared logarithmic grid and the error at P20, P50 and P80. It is not computed because no available set carries a measured curve.'}
      </Callout>
      {refs('e-metrics', es)}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

const PURPOSE: Record<string, { en: string; es: string }> = {
  'real-campaign': { en: 'a real campaign, its learned arms trained without it', es: 'una campaña real, con sus brazos aprendidos entrenados sin ella' },
  'extrapolation-control': { en: 'the only real set outside the training envelope', es: 'el único conjunto real fuera de la envolvente de entrenamiento' },
  'parameter-sweep': { en: 'one lever moved alone, which no real campaign shows', es: 'una palanca movida sola, que ninguna campaña real muestra' },
  'structural-control': { en: 'the coarse tail against the joint structure', es: 'la cola gruesa contra la estructura de juntas' },
  'negative-control': { en: 'the product must refuse rather than answer', es: 'el producto debe negarse en vez de responder' },
  'positive-control': { en: 'the harness itself, recovered at zero error', es: 'el andamiaje mismo, recuperado con error cero' },
};

function Coverage({ es, lang, index }: TabProps) {
  const byCategory = new Map<string, CaseIndex['cases']>();
  for (const entry of index?.cases ?? []) byCategory.set(entry.category, [...(byCategory.get(entry.category) ?? []), entry]);
  return (
    <section>
      <h2>{es ? 'Cobertura: casos, datos y controles' : 'Coverage: cases, data and controls'}</h2>
      <p>
        {es
          ? `${index?.n_cases ?? notAvailable()} casos en ${byCategory.size} categorías, cada uno con una razón científica para estar en la matriz. Diez son las campañas reales del corpus, una por sitio; uno es el conjunto de campo de 2025, fuera de la envolvente; tres son barridos y un control estructural sintéticos; dos son controles, uno negativo y uno positivo. Cada caso se abre en la App desde aquí.`
          : `${index?.n_cases ?? notAvailable()} cases in ${byCategory.size} categories, each with a scientific reason to be in the matrix. Ten are the corpus’s real campaigns, one per site; one is the 2025 field set, outside the envelope; three are synthetic sweeps and a structural control; two are controls, one negative and one positive. Each case opens in the App from here.`}
      </p>
      <div className="fr-scroll-x">
        <table className="fr-table">
          <thead>
            <tr>
              <th>{es ? 'categoría' : 'category'}</th>
              <th>{es ? 'casos' : 'cases'}</th>
              <th>{es ? 'qué prueba' : 'what it tests'}</th>
            </tr>
          </thead>
          <tbody>
            {[...byCategory.entries()].map(([category, entries]) => (
              <tr key={category}>
                <td>{CATEGORY_LABEL[category]?.[lang] ?? category}</td>
                <td>
                  {entries.map((entry) => (
                    <Link key={entry.case_id} className="fr-chip" to={`/?case=${entry.case_id}`}>
                      {entry.title[lang]}
                    </Link>
                  ))}
                </td>
                <td className="fr-fine">{PURPOSE[category]?.[lang] ?? category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>{es ? 'Conjuntos de datos y redistribución' : 'Datasets and redistribution'}</h3>
      <div className="fr-scroll-x">
        <table className="fr-table">
          <thead>
            <tr>
              <th>{es ? 'conjunto' : 'set'}</th>
              <th>{es ? 'filas' : 'rows'}</th>
              <th>{es ? 'fuente' : 'source'}</th>
              <th>{es ? 'qué se publica aquí' : 'what is published here'}</th>
              <th>{es ? 'uso' : 'use'}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{es ? 'corpus' : 'corpus'}</td>
              <td>97</td>
              <td>Hudaverdi et al. 2010 <Cite id="hudaverdi2010" /></td>
              <td>{es ? 'valores numéricos con cita; el artículo no' : 'numeric values with citation; not the article'}</td>
              <td>{es ? 'entrenamiento, protocolos, casos reales' : 'training, protocols, real cases'}</td>
            </tr>
            <tr>
              <td>{es ? 'validación publicada' : 'published hold-out'}</td>
              <td>14</td>
              <td>Kulatilake et al. 2012 <Cite id="kulatilake2012" /></td>
              <td>{es ? 'valores y predicciones publicadas, con cita' : 'values and published predictions, with citation'}</td>
              <td>{es ? 'reproducción de las cifras publicadas' : 'reproducing the published figures'}</td>
            </tr>
            <tr>
              <td>{es ? 'campo 2025' : 'field 2025'}</td>
              <td>5</td>
              <td>Sui et al. 2025, CC BY <Cite id="sui2025" /></td>
              <td>{es ? 'valores con cita y licencia' : 'values with citation and licence'}</td>
              <td>{es ? 'control de extrapolación' : 'extrapolation control'}</td>
            </tr>
            <tr>
              <td>{es ? 'sintéticos' : 'synthetic'}</td>
              <td>-</td>
              <td>{es ? 'generados aquí, rotulados' : 'generated here, labelled'}</td>
              <td>{es ? 'todo' : 'everything'}</td>
              <td>{es ? 'barridos y controles, nunca puntuados como reales' : 'sweeps and controls, never scored as real'}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h3>{es ? 'Los controles' : 'The controls'}</h3>
      <ul className="fr-list">
        <li><b>{es ? 'Negativo de geometría' : 'Geometry negative'}</b>{es ? ': seis tiros cuya escala no publica ninguna fuente; todo brazo que necesita volumen se abstiene con la razón, y una prueba verifica que ninguno respondió.' : ': six blasts whose scale no source publishes; every arm that needs a volume abstains with the reason, and a test checks that none answered.'}</li>
        <li><b>{es ? 'Negativo degenerado' : 'Degenerate negative'}</b>{es ? ': diseños donde el taco excede el banco; todo brazo se niega, incluidos los que solo ven razones, porque la guarda está a nivel del diseño.' : ': designs where the stemming exceeds the bench; every arm refuses, including the ratio-only ones, because the guard sits at the design level.'}</li>
        <li><b>{es ? 'De extrapolación' : 'Extrapolation'}</b>{es ? ': cinco tiros de campo con módulo de 5,6 GPa, bajo el mínimo del corpus; cada predicción lleva el sello.' : ': five field blasts at 5.6 GPa, below the corpus minimum; every prediction carries the stamp.'}</li>
        <li><b>{es ? 'Positivo' : 'Positive'}</b>{es ? ': una verdad generada por un modelo conocido, que ese modelo recupera con error cero; prueba el andamiaje, no la ciencia.' : ': a truth generated by a known model, which that model recovers at zero error; it tests the harness, not the science.'}</li>
      </ul>
      {refs('e-coverage', es)}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

function ProtocolSensitivity({ es, lang, b }: TabProps) {
  if (!b) return <div className="fr-loading">{es ? 'Cargando' : 'Loading'}</div>;
  const F = facts(b);
  const order: ('random' | 'dedup' | 'site')[] = ['random', 'dedup', 'site'];
  const value = (arm: string, p: 'random' | 'dedup' | 'site') =>
    p === 'random' ? F.random(arm)?.r2_identity ?? null : p === 'dedup' ? F.dedup(arm)?.r2_identity ?? null : F.site(arm);
  const series: SeriesSpec[] = F.learned.map((arm) => ({
    id: arm,
    label: label(arm, lang),
    values: order.map((p) => {
      const v = value(arm, p);
      return v === null ? null : Math.max(v, -1.05);
    }),
  }));
  series.push({
    id: 'kuznetsov',
    label: label('kuznetsov', lang),
    values: order.map((p) => value('kuznetsov', p)),
    width: 3,
  });
  const shifts = b.verdict.dedup_minus_random_median;
  return (
    <section>
      <h2>{es ? 'Cómo responde el puntaje al protocolo' : 'How the score responds to the protocol'}</h2>
      <p>
        {es
          ? 'Cada línea es un brazo, cruzando los tres protocolos: la mediana de cien sorteos aleatorios, la mediana de cien deduplicados y el puntaje agrupado con cada campaña retenida. El eje se corta en −1 y lo que cae más abajo se dibuja en el piso, con su valor en Benchmark.'
          : 'Each line is one arm across the three protocols: the median of a hundred random draws, the median of a hundred deduplicated draws, and the pooled score with each campaign held out. The axis is cut at −1 and anything lower is drawn at the floor, with its value on Benchmark.'}
      </p>
      <LineChart
        x={[0, 1, 2]}
        series={series}
        xLabel={es ? 'protocolo' : 'protocol'}
        yLabel={es ? 'varianza explicada' : 'variance explained'}
        height={320}
        zeroLine
        legend
        yRange={[-1.1, 1]}
        xTicks={[0, 1, 2]}
        xRange={[-0.12, 2.12]}
        xTickFormat={(v) => [es ? 'aleatorio' : 'random', es ? 'deduplicado' : 'deduplicated', es ? 'sitio excluido' : 'site held out'][Math.round(v)] ?? ''}
        yTickFormat={(v) => num(v, 1)}
        valueFormat={(v) => f(v)}
      />
      <p>
        {es
          ? `Deduplicar casi no mueve nada: la mediana de cada brazo cambia en lo que muestra la tabla, y para los árboles, la potenciación y los núcleos el cambio no pasa de ${f(Math.max(...['random-forest', 'xgboost', 'stacking', 'svr-rbf', 'svr-poly'].map((a) => Math.abs(shifts[a] ?? 0))), 3)}. La caída está en la tercera columna: retener la campaña completa le quita a cada brazo aprendido entre ${f(F.learnedGapRange[0], 2)} y ${f(F.learnedGapRange[1], 2)} de varianza explicada. El brazo clásico, con coeficientes fijos, predice lo mismo para un tiro bajo cualquier protocolo, y por eso su línea es casi horizontal.`
          : `Deduplicating barely moves anything: each arm’s median shifts by what the table shows, and for the trees, the boosting model and the kernels the shift is at most ${f(Math.max(...['random-forest', 'xgboost', 'stacking', 'svr-rbf', 'svr-poly'].map((a) => Math.abs(shifts[a] ?? 0))), 3)}. The drop is in the third column: holding out the whole campaign takes between ${f(F.learnedGapRange[0], 2)} and ${f(F.learnedGapRange[1], 2)} of variance explained from every learned arm. The classical arm, with fixed coefficients, predicts the same value for a blast under every protocol, which is why its line is nearly flat.`}
      </p>
      <table className="fr-table">
        <thead>
          <tr>
            <th>{es ? 'brazo' : 'arm'}</th>
            <th>{es ? 'aleatorio, mediana' : 'random, median'}</th>
            <th>{es ? 'deduplicado menos aleatorio' : 'deduplicated minus random'}</th>
            <th>{es ? 'aleatorio menos sitio excluido' : 'random minus site held out'}</th>
          </tr>
        </thead>
        <tbody>
          {[...F.learned, 'kuznetsov', 'kuznetsov-transfer', 'kuznetsov-capped'].map((arm) => (
            <tr key={arm}>
              <td>{label(arm, lang)}</td>
              <td>{f(F.random(arm)?.r2_identity)}</td>
              <td>{shifts[arm] === undefined ? notAvailable() : `${shifts[arm] >= 0 ? '+' : ''}${num(shifts[arm], 3)}`}</td>
              <td>{f(b.verdict.protocol_gap_random_minus_grouped[arm])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Callout variant="honest" title={es ? 'Dos afirmaciones retiradas' : 'Two claims withdrawn'}>
        {es
          ? 'Antes de la versión 0.05.000 esta página decía que el modelo clásico mejora al excluir un sitio y que deduplicar sube los puntajes aprendidos. Las dos lecturas venían del sorteo de la semilla 0; sobre cien sorteos ninguna se sostiene, y la tabla muestra por qué.'
          : 'Before 0.05.000 this page said the classical model improves with a site held out and that deduplication raises the learned scores. Both readings came from the seed-0 draw; over a hundred draws neither holds, and the table shows why.'}
      </Callout>
      {refs('e-spread', es)}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

function BySite({ es, lang, b }: TabProps) {
  const [arm, setArm] = useState('xgboost');
  if (!b) return <div className="fr-loading">{es ? 'Cargando' : 'Loading'}</div>;
  const F = facts(b);
  const sites = b.sites;
  const nullRow = F.grouped('null')?.per_site;
  const arms = ['kuznetsov', 'kuznetsov-transfer', 'kuznetsov-capped', 'published-regression', 'refitted-regression', ...F.learned];
  const rows = arms.map((a) => ({
    id: a,
    label: label(a, lang),
    values: sites.map((s) => F.grouped(a)?.per_site[s]?.rmse_m ?? null),
  }));
  const predictions = F.grouped(arm)?.predictions ?? {};
  const points = (b.corpus_rows ?? [])
    .filter((row) => predictions[row.blast_id] !== null && predictions[row.blast_id] !== undefined)
    .map((row) => ({ blastId: row.blast_id, site: row.site, measuredM: row.x50_m, predictedM: predictions[row.blast_id] as number }));
  return (
    <section>
      <h2>{es ? 'Por sitio' : 'By site'}</h2>
      <p>
        {es
          ? 'Las filas de una campaña no son muestras independientes: comparten macizo, equipo, explosivo y, en este corpus, el método de medición de quien la estudió. Por eso cada campaña se retiene completa, y por eso el error se mira también campaña por campaña. Cada celda es el error cuadrático medio, en metros, de un brazo sobre la campaña que no vio; el color compara con el del nulo en esa misma campaña.'
          : 'The rows of a campaign are not independent samples: they share a rock mass, a rig, an explosive and, in this corpus, the measurement method of whoever studied it. That is why each campaign is held out whole, and why the error is also read campaign by campaign. Each cell is an arm’s root mean square error, in metres, on the campaign it did not see; the colour compares it with the null’s on that same campaign.'}{' '}
        <Cite id="hudaverdi2010" />
      </p>
      <RatioTable
        title={es ? 'Error por sitio retenido' : 'Error per held-out site'}
        columns={sites}
        rows={rows}
        reference={sites.map((s) => nullRow?.[s]?.rmse_m ?? null)}
      />
      <p className="fr-fine">
        {es ? 'Verde: al menos 20 por ciento menos error que el nulo; ámbar: menos que el nulo; rojo: más. Un guion es una abstención.' : 'Green: at least 20 percent less error than the null; amber: less than the null; red: more. A dash is an abstention.'}
      </p>
      <p>
        {es
          ? 'Dos campañas concentran la caída de los aprendidos: Murgul, donde el error de la potenciación es varias veces el del nulo, y Miami, la de fragmentos más finos. Las dos de Reocin, las más gruesas, derrotan a todo brazo que no está dentro de la muestra, porque ningún sitio de entrenamiento es tan grueso. Abajo, las predicciones fuera de pliegue del brazo elegido contra lo medido; al apuntar a un tiro se lee su sitio.'
          : 'Two campaigns concentrate the learned arms’ drop: Murgul, where the boosting model’s error is several times the null’s, and Miami, the one with the finest fragments. The two Reocin campaigns, the coarsest, defeat every arm that is not in sample, because no training site is as coarse. Below, the chosen arm’s out-of-fold predictions against the measurement; point at a blast to read its site.'}
      </p>
      <label className="fr-control fr-control-inline">
        {es ? 'Brazo' : 'Arm'}
        <select value={arm} onChange={(e) => setArm(e.target.value)}>
          {arms.map((a) => (
            <option key={a} value={a}>{label(a, lang)}</option>
          ))}
        </select>
      </label>
      <div className="fr-parity-box">
        <ParityChart points={points} height={420} />
      </div>
      {refs('e-sites', es)}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

function Response({ es, lang }: TabProps) {
  const [powder, setPowder] = useState<CaseArtifact | null>(null);
  const [burden, setBurden] = useState<CaseArtifact | null>(null);
  useEffect(() => {
    loadCase('synth-sweep-powder').then(setPowder).catch(() => setPowder(null));
    loadCase('synth-sweep-burden').then(setBurden).catch(() => setBurden(null));
  }, []);
  const sweep = (artifact: CaseArtifact | null, field: 'Pf_kg_m3' | 'B_over_D') => {
    if (!artifact) return null;
    const x = artifact.blasts.map((blast) => blast.features[field]);
    const arms = ['kuznetsov', 'kuznetsov-transfer', 'kuznetsov-capped', 'published-regression', 'random-forest', 'stacking', 'published-neural-net'];
    const series: SeriesSpec[] = arms
      .filter((a) => artifact.predictions[a])
      .map((a) => ({ id: a, label: label(a, lang), values: artifact.blasts.map((blast) => artifact.predictions[a][blast.blast_id]?.x50_m ?? null) }));
    return { x, series };
  };
  const p = sweep(powder, 'Pf_kg_m3');
  const bd = sweep(burden, 'B_over_D');
  return (
    <section>
      <h2>{es ? 'Cómo responde el diseño a sus palancas' : 'How the design responds to its levers'}</h2>
      <p>
        {es
          ? 'Un ingeniero no elige un bordo o un espaciamiento por separado, sino un punto en el plano de los dos. El mapa calcula en su navegador el P80 de la ecuación clásica con la curva de dos parámetros para cada combinación de bordo sobre diámetro y espaciamiento sobre bordo dentro de la envolvente del corpus, con las demás razones en su valor central; la línea blanca marca los diseños que entregan el P80 objetivo.'
          : 'An engineer does not choose a burden or a spacing on its own, but a point in the plane of both. The map computes in your browser the classical equation’s P80, with the two-parameter curve, for every combination of burden over diameter and spacing over burden inside the corpus envelope, with the other ratios at their central values; the white line marks the designs that deliver the target P80.'}{' '}
        <Cite id="kuznetsov1973" />
      </p>
      <ResponseHeatmap />
      <Equation
        tex={String.raw`P_{80}(B/D,\,S/B) = x_{50}\,\left(\frac{-\ln 0.2}{\ln 2}\right)^{1/n},\qquad x_{50},\ n\ \text{from the reconstructed pattern}`}
        caption={es ? 'El P80 de la curva de dos parámetros, a partir del tamaño medio y del índice de uniformidad del diseño.' : 'The P80 of the two-parameter curve, from the design’s mean size and uniformity index.'}
      />
      <p>
        {es
          ? 'Los dos barridos sintéticos mueven una sola palanca y comparan a todos los brazos sobre el mismo recorrido. Ningún tiro sintético tiene medición, así que se muestra una respuesta y no un puntaje. Más explosivo debe predecir roca más fina y un bordo mayor, roca más gruesa; un brazo que invierta el signo tiene un problema, y las pruebas del producto lo comprueban para los brazos clásicos.'
          : 'The two synthetic sweeps move one lever alone and compare every arm along the same path. No synthetic blast has a measurement, so a response is shown rather than a score. More explosive must predict finer rock and a wider burden coarser rock; an arm that inverts the sign has a problem, and the product’s tests check it for the classical arms.'}{' '}
        <Cite id="hudaverdi2010" />
      </p>
      {p ? (
        <>
          <h3>{es ? 'Factor de carga' : 'Powder factor'}</h3>
          <LineChart x={p.x} series={p.series} xLabel={es ? 'factor de carga, kg/m³' : 'powder factor, kg/m³'} yLabel={es ? 'x50 predicho' : 'predicted x50'} height={280} legend xTickFormat={(v) => num(v, 2)} valueFormat={(v) => formatSize(v)} />
        </>
      ) : null}
      {bd ? (
        <>
          <h3>{es ? 'Bordo sobre diámetro' : 'Burden over hole diameter'}</h3>
          <LineChart x={bd.x} series={bd.series} xLabel={es ? 'B/D' : 'B/D'} yLabel={es ? 'x50 predicho' : 'predicted x50'} height={280} legend xTickFormat={(v) => num(v, 1)} valueFormat={(v) => formatSize(v)} />
        </>
      ) : null}
      <Callout variant="note" title={es ? 'Lo que el mapa no dice' : 'What the map does not say'}>
        {es
          ? 'Es la respuesta de una ecuación con un factor de roca elegido por usted, no una predicción validada para una mina. La ecuación clásica explica cerca de 0,30 de la varianza entre sitios en este corpus; su forma de responder a la malla es lo que el mapa muestra, no su exactitud.'
          : 'It is the response of an equation with a rock factor you choose, not a prediction validated for a mine. The classical equation explains about 0.30 of the variance across sites on this corpus; how it responds to the pattern is what the map shows, not how accurate it is.'}
      </Callout>
      {refs('e-response', es)}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

function Diagnostics({ es, lang, b }: TabProps) {
  if (!b) return <div className="fr-loading">{es ? 'Cargando' : 'Loading'}</div>;
  const d = b.diagnostics;
  const scores = d.outliers.anomaly_score;
  const flagged = d.outliers.flagged.map((id) => ({ id, site: b.corpus_rows?.find((r) => r.blast_id === id)?.site ?? '', score: scores[id] }));
  const native = d.native_importance;
  const resampling = d.resampling_importance;
  const featureLabel = (name: string) => FEATURE_LABEL[name]?.[lang] ?? name;
  return (
    <section>
      <h2>{es ? 'Diagnósticos' : 'Diagnostics'}</h2>
      <p>
        {es
          ? `Un bosque de aislamiento separa cada punto con cortes aleatorios y lo califica por cuántos cortes necesita; los puntos raros se aíslan rápido. Huan y colegas pasaron una criba así sobre un superconjunto de 105 muestras de este corpus y marcaron cinco, que eliminaron. Aquí se corre sobre las siete variables y el logaritmo del tamaño medido, con la misma tasa, y marca ${flagged.length}: todos de las campañas más inusuales del corpus. Se informa y nunca se aplica como filtro, porque quitar esas filas quitaría la parte más difícil de la pregunta entre sitios.`
          : `An isolation forest separates each point with random cuts and scores it by how many cuts it takes; unusual points are isolated quickly. Huan and colleagues ran such a screen on a 105-sample superset of this corpus and flagged five, which they removed. Here it runs on the seven features and the logarithm of the measured size, at the same rate, and flags ${flagged.length}: all from the most unusual campaigns in the corpus. It is reported and never applied as a filter, because removing those rows would remove the hardest part of the cross-site question.`}{' '}
        <Cite id="liu2008" />{' '}
        <Cite id="huan2025" />
      </p>
      <table className="fr-table">
        <thead>
          <tr>
            <th>{es ? 'tiro' : 'blast'}</th>
            <th>{es ? 'sitio' : 'site'}</th>
            <th>{es ? 'puntaje de aislamiento' : 'isolation score'}</th>
          </tr>
        </thead>
        <tbody>
          {flagged.map((row) => (
            <tr key={row.id}>
              <td><code>{row.id}</code></td>
              <td>{row.site}</td>
              <td>{f(row.score)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        {es
          ? 'Dos vistas de qué entradas pesan. La primera lee la importancia interna de un bosque y de un modelo de potenciación ajustados sobre los 97 tiros, para compararla con la que publica la fuente de 2025. La segunda pregunta cuánto empeora cada brazo en una campaña que no vio cuando una entrada de esa campaña se reemplaza por valores de las de entrenamiento.'
          : 'Two views of which inputs matter. The first reads the internal importance of a forest and a boosting model fitted on the 97 blasts, to compare it with what the 2025 source publishes. The second asks how much worse each arm does on a campaign it has not seen when one of that campaign’s inputs is replaced by values from the training campaigns.'}{' '}
        <Cite id="breiman2001" />{' '}
        <Cite id="chen2016" />{' '}
        <Cite id="sui2025" />
      </p>
      <RatioTable
        title={es ? 'Importancia por variable' : 'Importance by feature'}
        columns={FEATURES.map(featureLabel)}
        rows={[
          { id: 'rf', label: `${label('random-forest', lang)} (${es ? 'impureza' : 'impurity'})`, values: FEATURES.map((n) => native['random-forest']?.values[n] ?? null) },
          { id: 'xgb', label: `${label('xgboost', lang)} (${native.xgboost?.kind ?? ''})`, values: FEATURES.map((n) => native.xgboost?.values[n] ?? null) },
          ...Object.entries(resampling).map(([arm, report]) => ({
            id: `r-${arm}`,
            label: `${label(arm, lang)} (${es ? 'sitio excluido' : 'site held out'})`,
            values: FEATURES.map((n) => report.share[n] ?? null),
          })),
        ]}
        reference={FEATURES.map(() => null)}
        format={(v) => num(v, 3)}
      />
      <p>
        {es
          ? `La fuente de 2025 publica 0,7129 para el módulo en su bosque y 0,4608 en su potenciación, ambos primeros; aquí el bosque le da ${f(native['random-forest']?.values.E_GPa)}, con el mismo orden. Con el sitio excluido, los aprendidos se apoyan en el módulo mucho más que las ecuaciones. En este corpus el módulo es una constante por campaña: cada tiro de una campaña tiene el mismo valor y nueve valores cubren diez campañas. En una partición aleatoria identifica la campaña de una fila de prueba; al retenerla, ocho de las diez campañas tienen un módulo que ningún tiro de entrenamiento tiene.`
          : `The 2025 source publishes 0.7129 for the modulus in its forest and 0.4608 in its boosting model, first in both; here the forest gives it ${f(native['random-forest']?.values.E_GPa)}, with the same ordering. With the site held out, the learned arms lean on the modulus far more than the equations do. In this corpus the modulus is a constant per campaign: every blast of a campaign has the same value and nine values cover ten campaigns. On a random split it identifies the campaign of a test row; when the campaign is held out, eight of the ten have a modulus no training blast has.`}
      </p>
      <Callout variant="honest" title={es ? 'Un mecanismo, no una prueba' : 'A mechanism, not a proof'}>
        {es
          ? 'Que el módulo funcione como etiqueta de campaña es consistente con la caída de los aprendidos al retener sitios, y se lee de estas mediciones. No se afirma como la única causa: el método de medición y la escala de cada campaña también cambian con ella.'
          : 'That the modulus works as a campaign label is consistent with the learned arms’ drop when sites are held out, and it is read from these measurements. It is not claimed as the only cause: each campaign’s measurement method and scale change with it too.'}
      </Callout>
      {refs('e-diagnostics', es)}
    </section>
  );
}
