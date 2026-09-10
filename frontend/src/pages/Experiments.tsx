/**
 * Experiments: the design, the coverage matrix, and the cross-case sweeps.
 *
 * The distinction from Benchmark is deliberate. Benchmark asks which model to trust; Experiments
 * asks what was actually tested and how the design responds to a lever.
 */

import { Callout, Refs, useShellLang } from '@fasl-work/caos-app-shell';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';

import { SECTION_REFS } from '../data/citations';
import {
  ARM_BY_ID,
  CATEGORY_LABEL,
  formatScore,
  formatSize,
  loadBenchmark,
  loadCase,
  loadIndex,
} from '../lib/artifacts';
import type { BenchmarkArtifact, CaseArtifact, CaseIndex } from '../lib/contract.types';
import { kuznetsovX50M, patternFromRatios, type LiveBlast } from '../engine/live';
import { LineChart, type SeriesSpec } from '../viz/Charts';

const CORPUS_CENTRE: LiveBlast = {
  S_over_B: 1.19,
  H_over_B: 3.34,
  B_over_D: 27.35,
  T_over_B: 1.26,
  Pf_kg_m3: 0.53,
  XB_m: 1.1,
  E_GPa: 29.46,
};

export default function Experiments() {
  const lang = useShellLang();
  const es = lang === 'es';
  const [index, setIndex] = useState<CaseIndex | null>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkArtifact | null>(null);
  const [sweep, setSweep] = useState<CaseArtifact | null>(null);

  useEffect(() => {
    loadIndex().then(setIndex).catch(() => setIndex(null));
    loadBenchmark().then(setBenchmark).catch(() => setBenchmark(null));
    loadCase('synth-sweep-powder').then(setSweep).catch(() => setSweep(null));
  }, []);

  if (!index) return <div className="fr-loading">{es ? 'Cargando' : 'Loading'}</div>;

  const byCategory = new Map<string, typeof index.cases>();
  for (const entry of index.cases) {
    byCategory.set(entry.category, [...(byCategory.get(entry.category) ?? []), entry]);
  }

  return (
    <div className="page-body wide prose">
      <h1>{es ? 'Experimentos' : 'Experiments'}</h1>
      <p className="fr-lede">
        {es
          ? 'Qué se probó, por qué cada caso está en la matriz, y cómo responde el diseño cuando se mueve una sola palanca. Un caso sin razón científica es relleno.'
          : 'What was tested, why each case is in the matrix, and how the design responds when one lever moves. A case with no scientific reason is padding.'}
      </p>

      <h2>{es ? 'La matriz de cobertura' : 'The coverage matrix'}</h2>
      <p>
        {es
          ? `${index.n_cases} casos en ${byCategory.size} categorias. Cuatro de ellos existen para que el producto se niegue a responder en vez de responder, y son los primeros que conviene mirar al juzgar si es honesto.`
          : `${index.n_cases} cases across ${byCategory.size} categories. Four of them exist so that the product refuses to answer rather than answering, and they are the first ones to look at when judging whether it is honest.`}
      </p>
      <div className="fr-scroll-x">
        <table className="fr-table fr-table-wide">
          <thead>
            <tr>
              <th>{es ? 'categoría' : 'category'}</th>
              <th>{es ? 'casos' : 'cases'}</th>
              <th>{es ? 'que prueba' : 'what it tests'}</th>
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
                <td className="fr-fine">{categoryPurpose(category, es)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>{es ? 'Los controles' : 'The controls'}</h2>
      <Callout variant="note" title={es ? 'Los cuatro pasan, y cada uno dispara solo donde puede' : 'All four pass, and each fires only where it can'}>
        {es
          ? 'Un bloque de control en cada caso parecería minucioso y no significaría nada. Estos van adjuntos a los casos que pueden dispararlos.'
          : 'A control block on every case would look thorough and mean nothing. These are attached to the cases that can trigger them.'}
      </Callout>
      <ul className="fr-list">
        <li>
          <b>{es ? 'Control negativo de geometría' : 'Geometry negative control'}</b>{' '}
          {es
            ? 'seis tiros cuya escala absoluta ninguna fuente publica. Todo modelo que necesite un volumen de roca se abstiene ahí con una razón, y una prueba verifica que ninguno respondió.'
            : 'six blasts whose absolute scale no source publishes. Every model that needs a rock volume abstains there with a reason, and a test asserts none answered.'}
        </li>
        <li>
          <b>{es ? 'Control negativo degenerado' : 'Degenerate negative control'}</b>{' '}
          {es
            ? 'seis diseños donde el taco excede el banco, así que no hay columna de carga. TODOS los modelos se niegan, incluidos los que solo ven razones, porque la guarda está al nivel del diseño y no del número.'
            : 'six designs where the stemming exceeds the bench, so there is no charge column. EVERY model refuses, including the ratio-only ones, because the guard sits at the design level rather than the number level.'}
        </li>
        <li>
          <b>{es ? 'Control de extrapolación' : 'Extrapolation control'}</b>{' '}
          {es
            ? 'cinco tiros de terreno bajo el mínimo del corpus en su variable más importante. Las 35 predicciones llevan el sello, comprobado y no supuesto.'
            : 'five field blasts below the corpus minimum on its most important feature. All 35 predictions carry the stamp, asserted rather than assumed.'}
        </li>
        <li>
          <b>{es ? 'Control positivo' : 'Positive control'}</b>{' '}
          {es
            ? 'verdad generada por un modelo conocido, que la recupera con error cero. Prueba la instalación, no la ciencia: si falla, ningún otro resultado de este sitio es confiable.'
            : 'truth generated by a known model, which recovers it at zero error. It tests the plumbing rather than the science: if it fails, no other result on this site can be trusted.'}
        </li>
      </ul>

      <h2>{es ? 'Respuesta del diseño' : 'Design response'}</h2>
      <ResponseSurface es={es} />

      {sweep ? <PowderSweep artifact={sweep} es={es} lang={lang} /> : null}

      {benchmark ? (
        <>
          <h2>{es ? 'Sensibilidad al protocolo, modelo a modelo' : 'Protocol sensitivity, model by model'}</h2>
          <ProtocolSlope benchmark={benchmark} es={es} lang={lang} />
          <h2>{es ? 'Por sitio' : 'By site'}</h2>
          <p>
            {es
              ? 'Las filas de una misma campaña no son muestras independientes: comparten macizo rocoso, equipo y operador de medición. Por eso el benchmark excluye sitios completos, y por eso los intervalos remuestrean el sitio y no la fila.'
              : 'Rows within a campaign are not independent draws: they share a rock mass, a rig and a measurement operator. That is why the benchmark holds out whole sites, and why the intervals resample the site rather than the row.'}
          </p>
          <table className="fr-table">
            <thead>
              <tr>
                <th>{es ? 'sitio' : 'site'}</th>
                <th>{es ? 'tiros' : 'blasts'}</th>
                <th>{es ? 'proporción del corpus' : 'share of the corpus'}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(benchmark.site_counts)
                .sort((a, b) => b[1] - a[1])
                .map(([site, count]) => (
                  <tr key={site}>
                    <td>{site}</td>
                    <td>{count}</td>
                    <td>
                      <div className="fr-bar">
                        <span style={{ width: `${(count / 97) * 100}%` }} />
                      </div>
                      {((count / 97) * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      ) : null}

      <Refs ids={SECTION_REFS.experiments} label={es ? "Fuentes de esta página" : "Sources for this page"} />
    </div>
  );
}

function categoryPurpose(category: string, es: boolean): string {
  const map: Record<string, [string, string]> = {
    'real-campaign': [
      'a real mine, with its own rock, rig and measurement operator',
      'una mina real, con su propia roca, equipo y operador de medicion',
    ],
    'extrapolation-control': [
      'the only real set outside the fitted envelope',
      'el unico conjunto real fuera de la envolvente ajustada',
    ],
    'parameter-sweep': [
      'one lever isolated, which no real campaign can show',
      'una palanca aislada, que ninguna campana real puede mostrar',
    ],
    'structural-control': [
      'the coarse tail against the joint structure',
      'la cola gruesa contra la estructura de juntas',
    ],
    'negative-control': [
      'the product must refuse, not answer',
      'el producto debe negarse, no responder',
    ],
    'positive-control': [
      'the harness itself, recovered to zero error',
      'la instalacion misma, recuperada con error cero',
    ],
  };
  const pair = map[category];
  return pair ? (es ? pair[1] : pair[0]) : category;
}

/* ------------------------------------------------------------------------------------------- */

/** Live: the classical response over the burden and powder-factor planes, recomputed in the browser. */
function ResponseSurface({ es }: { es: boolean }) {
  const [rockFactor, setRockFactor] = useState(9.23);
  const [holeMm, setHoleMm] = useState(165);

  const burdens = useMemo(
    () => Array.from({ length: 40 }, (_, i) => 18 + (i * (39 - 18)) / 39),
    [],
  );

  const series: SeriesSpec[] = useMemo(() => {
    const build = (powder: number, label: string): SeriesSpec => ({
      id: `pf-${powder}`,
      label,
      values: burdens.map((ratio) => {
        const blast: LiveBlast = { ...CORPUS_CENTRE, B_over_D: ratio, Pf_kg_m3: powder };
        const pattern = patternFromRatios(blast, holeMm);
        const value = kuznetsovX50M(pattern, rockFactor);
        return Number.isFinite(value) ? value : null;
      }),
    });
    return [
      build(0.3, es ? 'factor de carga 0.30' : 'powder factor 0.30'),
      build(0.53, es ? 'factor de carga 0.53' : 'powder factor 0.53'),
      build(0.9, es ? 'factor de carga 0.90' : 'powder factor 0.90'),
    ];
  }, [burdens, rockFactor, holeMm, es]);

  return (
    <>
      <p>
        {es
          ? 'La superficie de respuesta del modelo clásico, recalculada en su navegador. Es la vista de compromiso que un ingeniero de diseño realmente quiere: más explosivo compra roca más fina, y un bordo más amplio la pierde.'
          : 'The classical model’s response surface, recomputed in your browser. It is the trade-off view a design engineer actually wants: more explosive buys finer rock and a wider burden gives it back.'}
      </p>
      <LineChart
        x={burdens}
        series={series}
        xLabel={es ? 'bordo / diámetro' : 'burden / hole diameter'}
        yLabel={es ? 'x50 predicho' : 'predicted x50'}
        height={280}
        xTickFormat={(v) => v.toFixed(0)}
        valueFormat={(v) => formatSize(v)}
      />
      <div className="fr-inline-controls">
        <label className="fr-control">
          {es ? 'Factor de roca' : 'Rock factor'}
          <input
            type="range"
            min={3}
            max={13}
            step={0.1}
            value={rockFactor}
            onChange={(e) => setRockFactor(Number(e.target.value))}
          />
          <output>{rockFactor.toFixed(2)}</output>
        </label>
        <label className="fr-control">
          {es ? 'Diámetro, mm' : 'Hole diameter, mm'}
          <input
            type="range"
            min={76}
            max={250}
            step={1}
            value={holeMm}
            onChange={(e) => setHoleMm(Number(e.target.value))}
          />
          <output>{holeMm} mm</output>
        </label>
      </div>
      <p className="fr-fine">
        {es
          ? 'Todo lo demás se mantiene en el centro del corpus. Es un barrido, no un diseño: las campañas reales mueven varias cosas a la vez.'
          : 'Everything else is held at the corpus centre. It is a sweep rather than a design: real campaigns move several things at once.'}
      </p>
    </>
  );
}

function PowderSweep({
  artifact,
  es,
  lang,
}: {
  artifact: CaseArtifact;
  es: boolean;
  lang: 'en' | 'es';
}) {
  const blasts = artifact.blasts;
  const x = blasts.map((b) => b.features.Pf_kg_m3);
  const arms = ['kuznetsov', 'published-regression', 'random-forest', 'stacking'];
  const series: SeriesSpec[] = arms
    .filter((arm) => artifact.predictions[arm])
    .map((arm) => ({
      id: arm,
      label: ARM_BY_ID.get(arm)?.label[lang] ?? arm,
      values: blasts.map((b) => artifact.predictions[arm][b.blast_id]?.x50_m ?? null),
    }));

  return (
    <>
      <h3>{es ? 'El eje económico' : 'The economics axis'}</h3>
      <p>
        {es
          ? 'El explosivo es el lugar más barato para fragmentar roca, y esta es la curva que dice cuánto más fino compra cada kilogramo por metro cúbico adicional. Todos los modelos deben bajar; si alguno sube, hay un signo equivocado.'
          : 'Explosive is the cheapest place to break rock, and this is the curve that says how much finer each extra kilogram per cubic metre buys. Every model must fall; if one rises, a sign is wrong.'}
      </p>
      <LineChart
        x={x}
        series={series}
        xLabel={es ? 'factor de carga, kg/m3' : 'powder factor, kg/m3'}
        yLabel={es ? 'x50 predicho' : 'predicted x50'}
        height={280}
        xTickFormat={(v) => v.toFixed(2)}
        valueFormat={(v) => formatSize(v)}
      />
      <p className="fr-fine">
        {es
          ? 'Estos tiros son sintéticos y no tienen medición, así que el caso muestra una respuesta y no un puntaje. Decirlo así evita que un bloque de métricas con ceros se lea como un fracaso del modelo.'
          : 'These blasts are synthetic and carry no measurement, so the case shows a response rather than a score. Saying so keeps a zero-shaped metric block from reading as a model failure.'}
      </p>
    </>
  );
}

function ProtocolSlope({
  benchmark,
  es,
  lang,
}: {
  benchmark: BenchmarkArtifact;
  es: boolean;
  lang: 'en' | 'es';
}) {
  const order = ['random-8020', 'dedup-random', 'leave-one-site-out'];
  const learned = Object.entries(benchmark.protocols['leave-one-site-out'].arms)
    .filter(([, block]) => block.tier === 'learned')
    .map(([arm]) => arm);

  const series: SeriesSpec[] = learned.map((arm) => ({
    id: arm,
    label: ARM_BY_ID.get(arm)?.label[lang] ?? arm,
    values: order.map((protocol) => benchmark.protocols[protocol].arms[arm]?.r2_identity ?? null),
  }));
  series.push({
    id: 'published-regression',
    label: ARM_BY_ID.get('published-regression')?.label[lang] ?? 'published regression',
    values: order.map(
      (protocol) => benchmark.protocols[protocol].arms['published-regression']?.r2_identity ?? null,
    ),
    dashed: true,
    width: 3,
  });

  return (
    <>
      <p>
        {es
          ? 'Cada línea es un modelo, cruzando los tres protocolos. La pendiente es el hallazgo; una tabla obligaría al lector a calcularla.'
          : 'Each line is one model across the three protocols. The slope is the finding; a table would make the reader compute it.'}
      </p>
      <LineChart
        x={[0, 1, 2]}
        series={series}
        xLabel={es ? 'protocolo' : 'protocol'}
        yLabel={es ? 'varianza explicada' : 'variance explained'}
        height={300}
        xTickFormat={(v) => ['random', 'dedup', 'by site'][Math.round(v)] ?? ''}
        zeroLine
      />
      <p className="fr-fine">
        {es
          ? `Brecha mediana entre el protocolo aleatorio y el honesto: ${benchmark.verdict.median_protocol_gap.toFixed(3)}. La linea punteada es el unico modelo que no cae.`
          : `Median gap between the random protocol and the honest one: ${benchmark.verdict.median_protocol_gap.toFixed(3)}. The dashed line is the one model that does not fall.`}
      </p>
      <p className="fr-fine">
        {formatScore(benchmark.verdict.best_learned_r2_identity)}{' '}
        {es ? 'es el mejor aprendido bajo el protocolo honesto; el nulo está en' : 'is the best learned model under the honest protocol; the null sits at'}{' '}
        {formatScore(benchmark.verdict.null_r2_identity)}.
      </p>
    </>
  );
}
