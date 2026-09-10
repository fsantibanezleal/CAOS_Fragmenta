import { Callout, Cite, Refs, useShellLang } from '@fasl-work/caos-app-shell';
import { useEffect, useState } from 'react';

import { SECTION_REFS } from '../data/citations';
import { loadBenchmark, loadIndex } from '../lib/artifacts';
import type { BenchmarkArtifact, CaseIndex } from '../lib/contract.types';
import { ContractsDiagram, LearnedFlowDiagram, PipelineDiagram } from '../viz/Diagrams';

export default function Implementation() {
  const lang = useShellLang();
  const es = lang === 'es';
  const [index, setIndex] = useState<CaseIndex | null>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkArtifact | null>(null);

  useEffect(() => {
    loadIndex().then(setIndex).catch(() => setIndex(null));
    loadBenchmark().then(setBenchmark).catch(() => setBenchmark(null));
  }, []);

  const totalBytes = index?.cases.reduce((sum, c) => sum + c.bytes, 0) ?? 0;

  return (
    <article className="fr-prose">
      <h1>{es ? 'Implementacion' : 'Implementation'}</h1>
      <p className="fr-lede">
        {es
          ? 'Nada en estas pantallas se calcula al desplegar. Todo es una proyeccion de archivos que un horneado sin conexion escribio, y el carril vivo recalcula las formas cerradas en el navegador para que usted pueda cambiar un diseno. Que ambos coincidan es una compuerta, no una esperanza.'
          : 'Nothing on these screens is computed at deploy time. Everything is a projection of files an offline bake wrote, and the live lane recomputes the closed forms in the browser so you can change a design. That the two agree is a gate rather than a hope.'}
      </p>

      <h2>{es ? 'Dos repositorios, y por que' : 'Two repositories, and why'}</h2>
      <p>
        {es
          ? 'La ciencia vive en un paquete publicado aparte, que este producto fija por version y consume. Un producto no declara paquete propio: cualquier cosa que un tercero podria usar para predecir fragmentacion sin que le importe Fragmenta pertenece aguas arriba. Lo que queda aqui es el producto: la matriz de casos, el horneado por etapas, los dos contratos de datos, la compuerta de carril y los artefactos que la web reproduce.'
          : 'The science lives in a separately published package this product pins and consumes. A product declares no package of its own: anything a third party could use to predict fragmentation without caring about Fragmenta belongs upstream. What remains here is the product: the case matrix, the staged bake, the two data contracts, the lane gate and the artifacts the web replays.'}
      </p>

      <h2>{es ? 'La tuberia' : 'The pipeline'}</h2>
      <PipelineDiagram />

      <h2>{es ? 'Los dos contratos de datos' : 'The two data contracts'}</h2>
      <ContractsDiagram />

      <Callout variant="honest" title={es ? 'La compuerta que encontro cinco defectos' : 'The gate that found five defects'}>
        {es
          ? 'El corpus, tal como se ensamblo primero, discrepaba de las tablas publicadas en cinco celdas, dos de ellas sobre el tamano que se predice. La senal fue que el articulo imprime sus propias estadisticas descriptivas y su maximo de factor de carga era 1.26 mientras el archivo tenia 1.47, porque el tamano de bloque de una fila se habia copiado a la columna vecina. Un articulo que imprime una tabla resumen le ha entregado una suma de verificacion, y nadie la estaba leyendo.'
          : 'The corpus as first assembled disagreed with the published tables in five cells, two of them on the size being predicted. The tell was that the paper prints its own descriptive statistics and its powder-factor maximum was 1.26 while the file held 1.47, because one row’s block size had been copied into the neighbouring column. A paper that prints a summary table has handed you a checksum, and nothing was reading it.'}
      </Callout>

      <p>
        {es
          ? 'Ahora esa comprobacion corre en cada carga, y hace dos cosas independientes. Reproduce el minimo, el maximo, la media y la desviacion estandar de las siete variables a la precision con que se imprimieron. Y compara un resumen criptografico del contenido con un valor fijado, porque una media sobre 97 filas es un detector debil para un cambio de una sola celda: corregir un factor de carga la mueve en 0.0006. Las dos preguntas son distintas: la primera dice que el archivo sigue SIENDO la tabla publicada, la segunda dice que no se ha movido desde que se corrigio.'
          : 'That check now runs on every load and does two independent things. It reproduces the minimum, maximum, mean and standard deviation of all seven variables at the precision each was printed to. And it compares a content digest against a pinned value, because a mean over 97 rows is a weak detector for a single-cell change: correcting one powder factor moves it by 0.0006. The two answer different questions: the first says the file still IS the published table, the second says it has not moved since it was corrected.'}
      </p>

      <h2>{es ? 'Recuperar la geometria' : 'Recovering the geometry'}</h2>
      <p>
        {es
          ? 'El corpus publica razones y ninguna dimension. La ecuacion clasica necesita volumen de roca y masa de carga por barreno, asi que sobre razones no podia correr en absoluto, y esa es plausiblemente la razon de que todo estudio reciente sobre este corpus sea un regresor de caja negra.'
          : 'The corpus publishes ratios and no dimensions. The classical equation needs rock volume and charge mass per hole, so on ratios alone it could not run at all, and that is plausibly why every recent study on this corpus is a black-box regressor.'}{' '}
        <Cite id="hudaverdi2010" />
      </p>
      <p>
        {es
          ? 'La prosa de la propia fuente da un diametro de perforacion en ocho de sus diez sitios, y un diametro cierra el sistema. Un noveno sale invirtiendo su altura de banco declarada, y devuelve los mismos 91.2 mm en sus seis filas. El decimo no publica nada absoluto, asi que sus seis tiros no son reconstruibles y todo modelo que necesite un volumen se abstiene ahi con una razon.'
          : 'The source’s own prose gives a hole diameter for eight of its ten sites, and a diameter closes the system. A ninth falls out by inverting its stated bench height, returning the same 91.2 mm on all six of its rows. The tenth publishes nothing absolute, so its six blasts are not reconstructable and every model that needs a volume abstains there with a reason.'}
      </p>

      <Callout variant="note" title={es ? 'Lo que lo vuelve un resultado y no un supuesto' : 'What makes it a result rather than an assumption'}>
        {es
          ? 'La misma prosa declara restricciones dimensionales independientes, y la reconstruccion se verifica contra cada una: quince en total, sobre nueve sitios, las quince satisfechas. Un parrafo declara altura de banco, rango de bordo y rango de espaciamiento, y una sola regla aritmetica reproduce los tres exactamente. La tolerancia no se elige: es la impresion a dos decimales de las razones, propagada por la multiplicacion que produjo cada cantidad.'
          : 'The same prose states independent dimensional constraints, and the reconstruction is checked against every one: fifteen in total, across nine sites, all fifteen satisfied. One paragraph states a bench height, a burden range and a spacing range, and one arithmetic rule reproduces all three exactly. The tolerance is not chosen: it is the two-decimal printing of the ratios propagated through the multiplication that produced each quantity.'}
      </Callout>

      <h2>{es ? 'Fuga de informacion, comprobada al hornear' : 'Leakage, asserted at bake time'}</h2>
      <p>
        {es
          ? 'Todo modelo aprendido que se muestra sobre una campana real fue entrenado sobre el corpus MENOS esa campana. El sitio excluido se estampa en el artefacto y el horneado falla si algun tiro del caso aparece en sus filas de entrenamiento. Un modelo entrenado sobre una campana y luego mostrado prediciendola muestra una memoria, no una prediccion.'
          : 'Every learned model shown on a real campaign was trained on the corpus MINUS that campaign. The withheld site is stamped on the artifact and the bake fails if any of the case’s blasts appear in its training rows. A model trained on a campaign and then shown predicting it is displaying a memory, not a prediction.'}
      </p>
      <LearnedFlowDiagram />

      <h2>{es ? 'Los carriles' : 'The lanes'}</h2>
      <table className="fr-table">
        <thead>
          <tr>
            <th>{es ? 'carril' : 'lane'}</th>
            <th>{es ? 'que corre ahi' : 'what runs there'}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{es ? 'sin conexion, canonico' : 'offline, canonical'}</td>
            <td>
              {es
                ? 'el entrenamiento, el barrido de semillas, la matriz de dejar-un-sitio-fuera y todo el benchmark'
                : 'training, the seed sweep, the leave-one-site-out matrix and the whole benchmark'}
            </td>
          </tr>
          <tr>
            <td>{es ? 'reproduccion' : 'replay'}</td>
            <td>
              {es
                ? 'los artefactos comprometidos que la web lee para toda evidencia entre casos'
                : 'the committed artifacts the web reads for all cross-case evidence'}
            </td>
          </tr>
          <tr>
            <td>{es ? 'vivo, en el navegador' : 'live, in the browser'}</td>
            <td>
              {es
                ? 'las formas cerradas en TypeScript, para que cambiar un diseno mueva la curva; su coincidencia con el motor Python es una compuerta'
                : 'the closed forms in TypeScript, so changing a design moves the curve; their agreement with the Python engine is a gate'}
            </td>
          </tr>
        </tbody>
      </table>

      <h2>{es ? 'Lo que se envia' : 'What ships'}</h2>
      {index ? (
        <dl className="fr-kv fr-kv-wide">
          <dt>{es ? 'Casos' : 'Cases'}</dt>
          <dd>{index.n_cases}</dd>
          <dt>{es ? 'Bytes de artefactos' : 'Artifact bytes'}</dt>
          <dd>{(totalBytes / 1024).toFixed(0)} kB</dd>
          <dt>{es ? 'Version del motor' : 'Engine version'}</dt>
          <dd>{index.engine_version}</dd>
          <dt>{es ? 'Resumen del corpus' : 'Corpus digest'}</dt>
          <dd>
            <code>{index.corpus_digest.slice(0, 16)}</code>
          </dd>
          <dt>{es ? 'Todos en carril vivo' : 'All in the live lane'}</dt>
          <dd>{index.cases.every((c) => c.lane === 'live') ? (es ? 'si' : 'yes') : (es ? 'no' : 'no')}</dd>
          <dt>{es ? 'Controles aprobados' : 'Controls passing'}</dt>
          <dd>
            {index.cases.filter((c) => c.controls_passed).length} / {index.cases.length}
          </dd>
        </dl>
      ) : null}

      {benchmark ? (
        <p className="fr-fine">
          {es ? 'Benchmark horneado con semilla' : 'Benchmark baked at seed'} {benchmark.seed},{' '}
          {benchmark.network_seed_sweep.n_seeds} {es ? 'semillas en el barrido de la red' : 'seeds in the network sweep'}.
        </p>
      ) : null}

      <h2>{es ? 'Reproducirlo' : 'Reproducing it'}</h2>
      <pre className="fr-code">
        <code>{`python data-pipeline/run.py            # bake every case plus the benchmark
python data-pipeline/run.py --validate # re-check what is already on disk
pytest                                 # the tests run against the COMMITTED artifacts`}</code>
      </pre>
      <p>
        {es
          ? 'El horneado es una funcion pura del registro de casos, el entorno fijado y la semilla. Repetirlo en el MISMO entorno produce artefactos identicos byte a byte. Repetirlo en otro sistema operativo los reproduce con una tolerancia numerica y no con un hash: dos compilaciones del mismo numpy fijado suman un producto punto en distinto orden, y el unico solver iterativo del producto arrastra esos ultimos bits hasta su salida. Medido entre Windows y Linux con las mismas versiones: 72 campos difieren, el peor con error relativo 8.3e-09, y todos pertenecen a la red entrenada por Levenberg-Marquardt. Ningun otro brazo se mueve. Las pruebas corren contra los artefactos comprometidos y no contra un horneado en memoria, porque eso es lo que la web lee.'
          : 'The bake is a pure function of the case registry, the pinned environment and the seed. Re-running it in the SAME environment produces byte-identical artifacts. Re-running it on another operating system reproduces them to a numeric tolerance rather than to a hash: two builds of the same pinned numpy sum a dot product in a different order, and the one iterative solver in the product carries those last bits through to its output. Measured between Windows and Linux on identical versions: 72 fields differ, the worst at a relative error of 8.3e-09, and every one of them belongs to the Levenberg-Marquardt network. No other arm moves. The tests run against the committed artifacts rather than a fresh in-memory bake, because that is what the web reads.'}
      </p>

      <Refs ids={SECTION_REFS.implementation} label={es ? "Fuentes de esta pagina" : "Sources for this page"} />
    </article>
  );
}
