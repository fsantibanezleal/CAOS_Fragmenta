/**
 * Contract: the artifacts the bake writes and the web reads, who writes each and who reads it, and the rules every
 * artifact follows (area `contract`). The table lists the documents as they are committed; the catalog of their
 * readiness states belongs under it, where the marked slot is.
 */

import { Callout, DocSection, Equation } from '@fasl-work/caos-app-shell';

import { BENCHMARK_SCHEMA, CASE_SCHEMA, INDEX_SCHEMA, MODELS_SCHEMA } from '../../lib/contract.types';
import { count, tr, type TopicProps } from './shared';

export function Contract({ es, index }: TopicProps) {
  const t = tr(es);
  const rows: { path: string; schema: string; holds: string; producer: string; consumer: string }[] = [
    {
      path: 'data/derived/<case>/case.json',
      schema: `${CASE_SCHEMA} (${count(index?.n_cases)})`,
      holds: t(
        'The case’s blasts and patterns, every arm’s prediction or abstention with its reason, the scores, the distributions, the variants, the controls, the provenance and the models file it runs live.',
        'Los tiros y mallas del caso, la predicción o abstención de cada brazo con su razón, los puntajes, las distribuciones, las variantes, los controles, la procedencia y el archivo de modelos que corre en vivo.',
      ),
      producer: t('the bake: export stage', 'el horneado: etapa de exportación'),
      consumer: t('the App and the replayed pages', 'la App y las páginas que reproducen'),
    },
    {
      path: 'data/derived/benchmark.json',
      schema: BENCHMARK_SCHEMA,
      holds: t(
        'The three protocols with their draws and site-resampled intervals, the verdict on both row sets, the per-site errors, the arm provenance, the diagnostics, the published reproductions and the corpus, hold-out and field rows.',
        'Los tres protocolos con sus sorteos e intervalos por remuestreo de sitios, el veredicto sobre ambos conjuntos de filas, los errores por sitio, la procedencia de cada brazo, los diagnósticos, las reproducciones publicadas y las filas del corpus, de validación y de campo.',
      ),
      producer: t('the bake: benchmark stage', 'el horneado: etapa del benchmark'),
      consumer: t('the Benchmark, Experiments and documentation pages', 'las páginas Benchmark, Experimentos y de documentación'),
    },
    {
      path: 'data/derived/models/<scope>.json',
      schema: `${MODELS_SCHEMA} (${count(index?.models?.length)})`,
      holds: t(
        'The fitted learned arms of one training scope in the engine’s portable form, and fixtures of the original models’ predictions at every shipped blast.',
        'Los brazos aprendidos ajustados de un alcance de entrenamiento en la forma portátil del motor, y fijaciones de las predicciones de los modelos originales en cada tiro publicado.',
      ),
      producer: t('the bake: models stage', 'el horneado: etapa de modelos'),
      consumer: t('the live walker in the browser', 'el recorredor en vivo en el navegador'),
    },
    {
      path: 'data/derived/manifests/<case>.json',
      schema: 'fragmenta.manifest/v1',
      holds: t(
        'The case’s lane record: the budgets and the numbers measured against them, the verdict and its reasons, the seed and the versions.',
        'El registro de carril del caso: los presupuestos y los números medidos contra ellos, el veredicto y sus razones, la semilla y las versiones.',
      ),
      producer: t('the bake: export stage', 'el horneado: etapa de exportación'),
      consumer: t('the release gate; copied, never fetched by the browser', 'la compuerta de publicación; se copia, el navegador no lo pide'),
    },
    {
      path: 'data/derived/manifests/index.json',
      schema: INDEX_SCHEMA,
      holds: t(
        'Every case, the benchmark and every models file with its path, byte size and digest, the application and engine versions and the corpus digest.',
        'Cada caso, el benchmark y cada archivo de modelos con su ruta, tamaño en bytes y resumen, las versiones de la aplicación y del motor y el resumen del corpus.',
      ),
      producer: t('the bake, last', 'el horneado, al final'),
      consumer: t('the build’s copy step, the release gate and every page', 'el paso de copia de la compilación, la compuerta de publicación y cada página'),
    },
  ];
  const flow = [
    'bake (Python)  --writes-->  data/derived/**  --copied at build-->  frontend/public/data/**  --fetched-->  browser',
    `${' '.repeat(29)}${t('digests in the index', 'resúmenes en el índice')}${' '.repeat(18)}${t('presence checked', 'presencia comprobada')}${' '.repeat(16)}${t('typed mirror', 'espejo tipado')}`,
  ].join('\n');
  return (
    <DocSection
      title={{ en: 'The artifact contract', es: 'El contrato de artefactos' }}
      area="contract"
      noRefsReason={{ en: 'Describes the files this product writes and reads; it rests on no outside source.', es: 'Describe los archivos que este producto escribe y lee; no se apoya en ninguna fuente externa.' }}
    >
      <p>
        {t(
          'The artifacts are this product’s interface between the bake, which is Python, and the web, which is TypeScript. Three places hold the contract. The writer sorts every key, ends every line with a line feed, refuses a non-finite number and puts a content digest in every file. The typed mirror in the web names every field the artifacts carry, and a test reads the committed artifacts against it. The checks, the release gate and the build’s copy step, fail when a document the index declares is missing or has changed.',
          'Los artefactos son la interfaz de este producto entre el horneado, que es Python, y la web, que es TypeScript. Tres lugares sostienen el contrato. El escritor ordena cada clave, termina cada línea con un salto de línea, rechaza un número no finito y pone un resumen de contenido en cada archivo. El espejo tipado de la web nombra cada campo que traen los artefactos, y una prueba lee los artefactos versionados contra él. Las comprobaciones, la compuerta de publicación y el paso de copia de la compilación, fallan cuando falta un documento que el índice declara o este ha cambiado.',
        )}
      </p>
      <div className="fr-scroll-x">
        <table className="fr-table">
          <thead>
            <tr>
              <th>{t('document', 'documento')}</th>
              <th>{t('schema', 'esquema')}</th>
              <th>{t('what it holds', 'qué contiene')}</th>
              <th>{t('written by', 'lo escribe')}</th>
              <th>{t('read by', 'lo lee')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.path}>
                <td><code>{r.path}</code></td>
                <td className="fr-fine">{r.schema}</td>
                <td>{r.holds}</td>
                <td>{r.producer}</td>
                <td>{r.consumer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* The readiness table of the contract catalog goes here (the integrator adds it when the catalog lands); the slot is empty and takes no space. */}
      <div data-slot="readiness-table" />
      <pre className="fr-code">
        <code>{flow}</code>
      </pre>
      <p>
        {t(
          'Four rules hold for every artifact. It is content-addressed: the file stores the digest of its canonical serialisation, computed without the digest field, and the index repeats it. Every predicted cell carries a number or a reason, and an abstention without a reason fails the bake. No file holds a non-finite float, because Python writes NaN and Infinity into JSON, neither is valid JSON and a browser throws on the first one. And one writer, with line feeds, makes a bake on Windows and a bake on Linux write the same bytes for the same numbers.',
          'Cuatro reglas valen para cada artefacto. Se direcciona por contenido: el archivo guarda el resumen de su serialización canónica, calculado sin el campo del resumen, y el índice lo repite. Cada celda predicha lleva un número o una razón, y una abstención sin razón hace fallar el horneado. Ningún archivo contiene un flotante no finito, porque Python escribe NaN e Infinity en JSON, ninguno es JSON válido y un navegador falla con el primero. Y un solo escritor, con saltos de línea, hace que un horneado en Windows y uno en Linux escriban los mismos bytes para los mismos números.',
        )}
      </p>
      <Equation
        tex={String.raw`d = \mathrm{SHA\text{-}256}\big(\mathrm{json}_{\mathrm{sorted}}(\text{payload})\big)`}
        caption={t(
          'Each artifact’s content address d: the SHA-256 digest of its canonical serialisation, with sorted keys, taken over the payload without the digest field.',
          'La dirección de contenido d de cada artefacto: el resumen SHA-256 de su serialización canónica, con claves ordenadas, tomado sobre el contenido sin el campo del resumen.',
        )}
      />
      <p>
        {t(
          'The release gate, run by the bake and again by the deploy, re-reads every case, the benchmark and every models file from disk. It checks each digest against the file’s own and the index’s, the corpus digest against the installed engine, that no text holds NaN or Infinity, that each real case’s withheld site is its own, that every control passed, that every abstention has a reason, and that each case points at the models file of its own training scope. Any one failure stops the release.',
          'La compuerta de publicación, que corre el horneado y vuelve a correr el despliegue, relee de disco cada caso, el benchmark y cada archivo de modelos. Comprueba cada resumen contra el del propio archivo y el del índice, el resumen del corpus contra el motor instalado, que ningún texto contenga NaN o Infinity, que el sitio retenido de cada caso real sea el suyo, que cada control haya pasado, que cada abstención tenga una razón y que cada caso apunte al archivo de modelos de su propio alcance de entrenamiento. Una sola falla detiene la publicación.',
        )}
      </p>
      <Callout variant="note" title={t('Where it holds and where it does not', 'Dónde vale y dónde no')}>
        {t(
          'The digest detects any edit to an artifact after the bake, and the index repeats each file’s digest, so an artifact and its index cannot drift apart without the gate noticing. It says nothing about whether a number is right; the tests against the source and the controls say that. A field that appears on one side of the typed mirror only fails the build, so a renamed field cannot render an empty chart.',
          'El resumen detecta cualquier edición de un artefacto después del horneado, y el índice repite el resumen de cada archivo, así que un artefacto y su índice no pueden separarse sin que la compuerta lo note. No dice nada sobre si el número es correcto; eso lo dicen las pruebas contra la fuente y los controles. Un campo que aparece solo en un lado del espejo tipado hace fallar la compilación, así que un campo renombrado no puede dibujar un gráfico vacío.',
        )}
      </Callout>
    </DocSection>
  );
}
