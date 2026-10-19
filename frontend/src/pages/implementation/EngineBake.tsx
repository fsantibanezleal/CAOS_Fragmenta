/**
 * Engine, the bake: the stages every case goes through, the benchmark build, the models stage and the release gate
 * (area `engine`). The stage table is transcribed from the bake's documentation; the counts are read from the benchmark
 * and the index.
 */

import { Callout, DocSection, Equation } from '@fasl-work/caos-app-shell';

import { BENCHMARK_SCHEMA } from '../../lib/contract.types';
import { PipelineDiagram } from '../../viz/Diagrams';
import { count, mb, tr, type Bi, type TopicProps } from './shared';

/** The stages of one case, in order: what each does and what it refuses (docs/architecture/01_the-bake.md, section 2). */
const STAGES: { id: string; does: Bi; refuses: Bi }[] = [
  {
    id: 'ingest',
    does: { en: 'loads the case’s blasts through the engine’s contract, records provenance and flags', es: 'carga los tiros del caso por el contrato del motor, registra la procedencia y las marcas' },
    refuses: { en: 'a row outside the contract bounds, and an out-of-envelope row unless the case opts in', es: 'una fila fuera de los límites del contrato, y una fila fuera de la envolvente salvo que el caso lo pida' },
  },
  {
    id: 'preprocess',
    does: { en: 'recovers the absolute pattern, resolves the rock factor, re-asserts the source’s dimensional constraints', es: 'recupera la malla absoluta, resuelve el factor de roca y vuelve a comprobar las restricciones dimensionales de la fuente' },
    refuses: { en: 'reconstructing without checking', es: 'reconstruir sin comprobar' },
  },
  {
    id: 'dataset',
    does: { en: 'builds the case’s training rows: the corpus without the case’s own campaign for a real case', es: 'arma las filas de entrenamiento del caso: el corpus sin la campaña del propio caso en un caso real' },
    refuses: { en: 'a training set that contains a blast of the case', es: 'un conjunto de entrenamiento que contenga un tiro del caso' },
  },
  {
    id: 'feature_extraction',
    does: { en: 'the seven ratios plus the derived absolutes; each arm keeps its own normalisation', es: 'las siete razones más los absolutos derivados; cada brazo conserva su propia normalización' },
    refuses: { en: 'unifying normalisations that are not interchangeable', es: 'unificar normalizaciones que no son intercambiables' },
  },
  {
    id: 'train',
    does: { en: 'fits every learned arm and the transfer line on those training rows', es: 'ajusta cada brazo aprendido y la recta de transferencia sobre esas filas de entrenamiento' },
    refuses: { en: 'training on everything and showing the result as a prediction', es: 'entrenar con todo y mostrar el resultado como predicción' },
  },
  {
    id: 'infer',
    does: { en: 'every arm over every blast and every design variant, each cell a number or an abstention with its reason', es: 'cada brazo sobre cada tiro y cada variante de diseño, cada celda un número o una abstención con su razón' },
    refuses: { en: 'a number where the model cannot answer', es: 'un número donde el modelo no puede responder' },
  },
  {
    id: 'evaluate',
    does: { en: 'variance explained and correlation, the null beside every arm, the case’s controls', es: 'varianza explicada y correlación, el nulo junto a cada brazo, los controles del caso' },
    refuses: { en: 'a statistic under a bare label', es: 'un estadístico bajo una etiqueta sin más' },
  },
  {
    id: 'export',
    does: { en: 'the content-addressed case artifact and manifest, and the case’s models file', es: 'el artefacto de caso y el manifiesto direccionados por contenido, y el archivo de modelos del caso' },
    refuses: { en: 'NaN or Infinity, which no browser can parse', es: 'NaN o Infinity, que ningún navegador puede leer' },
  },
  {
    id: 'validate',
    does: { en: 'reads back, re-hashes and re-checks what was written', es: 'vuelve a leer, a calcular los resúmenes y a comprobar lo escrito' },
    refuses: { en: 'passing without reading what was written', es: 'pasar sin leer lo escrito' },
  },
];

export function EngineBake({ es, b, index }: TopicProps) {
  const t = tr(es);
  const sites = b ? Object.keys(b.site_meta).length : undefined;
  const modelBytes = index?.models?.reduce((s, m) => s + m.bytes, 0);
  return (
    <DocSection
      title={{ en: 'The staged bake', es: 'El horneado por etapas' }}
      area="engine"
      noRefsReason={{ en: 'Describes this product’s own pipeline; the methods it runs are cited in the Methodology page.', es: 'Describe el pipeline propio de este producto; los métodos que corre se citan en la página de Metodología.' }}
    >
      <p>
        {t(
          `One runner takes each of the ${count(index?.n_cases)} cases through ${STAGES.length} stages and then runs the cross-case benchmark: ingest with the contract and the gate; preprocess with the geometry and the rock factor; split with its leakage guards; features; train without the case’s own site; infer every arm, with a value or a reason; evaluate with both statistics and the null; export, content-addressed, including each scope’s fitted models; and validate, which re-reads, re-hashes and fails on a hole. A real case is trained on the corpus without its own campaign, and the models stage writes that scope’s fitted arms, so cases that share a scope share one file.`,
          `Un solo ejecutor lleva cada uno de los ${count(index?.n_cases)} casos por ${STAGES.length} etapas y después corre el benchmark entre casos: ingesta con el contrato y la compuerta; preproceso con la geometría y el factor de roca; partición con sus guardas de fuga; variables; entrenamiento sin el sitio del caso; inferencia de todo brazo, con valor o razón; evaluación con ambos estadísticos y el nulo; exportación direccionada por contenido, incluidos los modelos ajustados de cada alcance; y validación, que vuelve a leer, a calcular los resúmenes y falla ante un hueco. Un caso real se entrena con el corpus sin su propia campaña, y la etapa de modelos escribe los brazos ajustados de ese alcance, así que los casos que comparten alcance comparten un archivo.`,
        )}
      </p>
      <PipelineDiagram />
      <div className="fr-scroll-x">
        <table className="fr-table">
          <thead>
            <tr>
              <th>{t('stage', 'etapa')}</th>
              <th>{t('what it does', 'qué hace')}</th>
              <th>{t('what it refuses', 'qué rechaza')}</th>
            </tr>
          </thead>
          <tbody>
            {STAGES.map((s) => (
              <tr key={s.id}>
                <td><code>{s.id}</code></td>
                <td>{es ? s.does.es : s.does.en}</td>
                <td>{es ? s.refuses.es : s.refuses.en}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        {t(
          `After the cases, the benchmark stage runs the engine’s benchmark on the corpus: ${count(b?.n_repeats)} random draws, ${count(b?.n_repeats)} deduplicated draws, the ${count(sites)}-fold leave-one-site-out with intervals from ${count(b?.n_boot)} site resamples, the verdict on both row sets, the per-site errors, the arm provenance and the diagnostics. It adds the published reproductions, the seed sweep and the width sweep of the published network, the per-site metadata and the rows the Benchmark page re-scores in the browser. The result is one document, ${BENCHMARK_SCHEMA}. Most of the bake’s time goes here, mostly to the network’s Levenberg-Marquardt training.`,
          `Después de los casos, la etapa del benchmark corre el benchmark del motor sobre el corpus: ${count(b?.n_repeats)} sorteos aleatorios, ${count(b?.n_repeats)} sorteos deduplicados, la retención de un sitio a la vez en ${count(sites)} pliegues con intervalos de ${count(b?.n_boot)} remuestreos de sitios, el veredicto sobre ambos conjuntos de filas, los errores por sitio, la procedencia de cada brazo y los diagnósticos. Agrega las reproducciones publicadas, el barrido de semillas y el barrido de anchuras de la red publicada, los metadatos por sitio y las filas que la página Benchmark vuelve a puntuar en el navegador. El resultado es un solo documento, ${BENCHMARK_SCHEMA}. La mayor parte del tiempo del horneado se va aquí, sobre todo en el entrenamiento de Levenberg-Marquardt de la red.`,
        )}
      </p>
      <Equation
        tex={String.raw`\text{artifacts} = \mathrm{bake}\big(\text{case registry},\ \text{pinned versions},\ \text{seed}\big)`}
        caption={t(
          'The bake as a pure function: the case registry, the exactly pinned versions of the engine, numpy, scikit-learn and xgboost, and the seed are its whole input, so no wall clock, stopping rule or machine state enters an artifact.',
          'El horneado como función pura: el registro de casos, las versiones fijadas exactamente del motor, numpy, scikit-learn y xgboost, y la semilla son toda su entrada, así que ningún reloj, regla de parada ni estado de la máquina entra en un artefacto.',
        )}
      />
      <p>
        {t(
          `The release gate closes the bake: it re-reads every artifact from disk and checks the digests, the corpus digest, the finite numbers, each real case’s withheld site, the controls and the reasons of every abstention. The models stage exports the fitted arms of each scope, the ${count(sites)} campaigns withheld one at a time and the whole corpus, ${count(index?.models?.length)} files and ${mb(modelBytes)} in all. The full bake of release 0.06.000 took 745 s on the development workstation.`,
          `La compuerta de publicación cierra el horneado: relee de disco cada artefacto y comprueba los resúmenes, el resumen del corpus, los números finitos, el sitio retenido de cada caso real, los controles y las razones de cada abstención. La etapa de modelos exporta los brazos ajustados de cada alcance, las ${count(sites)} campañas retenidas una a la vez y el corpus completo, ${count(index?.models?.length)} archivos y ${mb(modelBytes)} en total. El horneado completo de la versión 0.06.000 tomó 745 s en la estación de desarrollo.`,
        )}
      </p>
      <Callout variant="note" title={t('Where it works and where it fails', 'Dónde funciona y dónde falla')}>
        {t(
          'The release gate re-reads and re-hashes what was written, so a hole, a hand edit or a stale file is caught. It cannot say that a stage computed the right thing: that is the work of the tests against the source and of the controls. The full bake is run on a developer machine before a release and never in continuous integration or in the deploy, so between releases the committed digests, and not a fresh bake, vouch for the artifacts.',
          'La compuerta de publicación vuelve a leer y a calcular los resúmenes de lo escrito, así que atrapa un hueco, una edición manual o un archivo viejo. No puede decir que una etapa calculó lo correcto: eso lo hacen las pruebas contra la fuente y los controles. El horneado completo se corre en una máquina de desarrollo antes de una versión y nunca en la integración continua ni en el despliegue, así que entre versiones los resúmenes versionados, y no un horneado nuevo, respaldan los artefactos.',
        )}
      </Callout>
    </DocSection>
  );
}
