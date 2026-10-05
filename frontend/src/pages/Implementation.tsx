/**
 * Implementation: how every number on this site is produced, where it runs, and what checks it.
 * Eight sub-tabs, each with the exact steps, a captioned equation, a figure where the structure is
 * worth drawing, a callout on where the mechanism holds and where it does not, and its sources.
 */

import { Callout, Cite, Equation, InlineMath, Refs, SubTabs, useShellLang } from '@fasl-work/caos-app-shell';
import type { SubTabDef } from '@fasl-work/caos-app-shell';

import { SECTION_REFS } from '../data/citations';
import type { BenchmarkArtifact, CaseIndex } from '../lib/contract.types';
import { f, useBenchmark, useIndex } from '../lib/facts';
import {
  ArchitectureDiagram,
  ContractsDiagram,
  LeakageDiagram,
  PipelineDiagram,
  PortableModelDiagram,
  ReconstructionDiagram,
} from '../viz/Diagrams';

interface TabProps {
  es: boolean;
  b: BenchmarkArtifact | null;
  index: CaseIndex | null;
}

const refs = (key: string, es: boolean) => <Refs ids={SECTION_REFS[key]} label={es ? 'Fuentes' : 'Sources'} />;
const kb = (bytes: number | undefined) => (bytes === undefined ? 'n/a' : `${Math.round(bytes / 1024)} kB`);

export default function Implementation() {
  const es = useShellLang() === 'es';
  const b = useBenchmark();
  const index = useIndex();
  const props = { es, b, index };
  const tabs: SubTabDef[] = [
    { id: 'architecture', label: es ? 'Arquitectura' : 'Architecture', content: <Architecture {...props} /> },
    { id: 'data', label: es ? 'Datos y compuerta' : 'Data and the gate', content: <Data {...props} /> },
    { id: 'geometry', label: es ? 'Geometría' : 'Geometry', content: <Geometry {...props} /> },
    { id: 'bake', label: es ? 'El horneado' : 'The bake', content: <Bake {...props} /> },
    { id: 'leakage', label: es ? 'Control de fuga' : 'Leakage control', content: <Leakage {...props} /> },
    { id: 'live', label: es ? 'Vivo: ecuaciones' : 'Live: equations', content: <LiveEquations {...props} /> },
    { id: 'models', label: es ? 'Vivo: modelos ajustados' : 'Live: fitted models', content: <LiveModels {...props} /> },
    { id: 'deploy', label: es ? 'Artefactos y despliegue' : 'Artifacts and deploy', content: <Deploy {...props} /> },
  ];
  return (
    <div className="page-body wide prose">
      <div className="page-head">
        <h1>{es ? 'Implementación' : 'Implementation'}</h1>
        <p className="lede">
          {es
            ? 'Cómo se produce cada número de este sitio, dónde corre y qué lo verifica. Nada se calcula al desplegar: un horneado sin conexión, con versiones fijadas, escribe artefactos direccionados por contenido, y el navegador los reproduce y recalcula en vivo las ecuaciones y los modelos ajustados cuando usted cambia un diseño, atado por pruebas a los números horneados. La ciencia vive en un paquete aparte que este producto fija y consume.'
            : 'How every number on this site is produced, where it runs and what checks it. Nothing is computed at deploy time: an offline bake against pinned versions writes content-addressed artifacts, and the browser replays them and recomputes the equations and the fitted models live when you change a design, held by tests to the baked numbers. The science lives in a separate package this product pins and consumes.'}
        </p>
      </div>
      <SubTabs tabs={tabs} ariaLabel={es ? 'secciones de implementación' : 'implementation sections'} orientation="vertical" />
    </div>
  );
}

/* ------------------------------------------------------------------------------------------- */

function Architecture({ es, b }: TabProps) {
  return (
    <section>
      <h2>{es ? 'Dónde corre cada cosa' : 'Where each thing runs'}</h2>
      <p>
        {es
          ? `Dos repositorios. El motor, publicado como paquete (versión ${b?.engine_version ?? 'n/a'}), contiene todo lo que un tercero usaría para predecir fragmentación sin que le importe esta aplicación: los modelos, los corpus con su compuerta de integridad, la reconstrucción de la geometría, los protocolos, las métricas, los diagnósticos y la exportación portátil de los modelos ajustados. Este repositorio contiene el producto: la matriz de casos, el horneado por etapas, los dos contratos de datos, los artefactos y la aplicación web.`
          : `Two repositories. The engine, published as a package (version ${b?.engine_version ?? 'n/a'}), holds everything a third party would use to predict fragmentation without caring about this application: the models, the corpora with their integrity gate, the geometry reconstruction, the protocols, the metrics, the diagnostics and the portable export of fitted models. This repository holds the product: the case matrix, the staged bake, the two data contracts, the artifacts and the web application.`}
      </p>
      <ArchitectureDiagram />
      <p>
        {es
          ? 'Cuatro carriles. Sin conexión corre todo lo que ajusta o mide: el entrenamiento por caso, los cien sorteos de cada protocolo aleatorio, las diez retenciones de sitio, los intervalos y los diagnósticos. La reproducción lee lo que eso escribió. En vivo, en el navegador, corren las formas cerradas (la ecuación clásica, las curvas, el enrutador, la regresión publicada) y los modelos ajustados, recorridos desde su forma exportada.'
          : 'Four lanes. Offline runs everything that fits or measures: the per-case training, the hundred draws of each random protocol, the ten site hold-outs, the intervals and the diagnostics. Replay reads what that wrote. Live, in the browser, run the closed forms (the classical equation, the curves, the router, the published regression) and the fitted models, walked from their exported form.'}
      </p>
      <table className="fr-table">
        <thead>
          <tr>
            <th>{es ? 'carril' : 'lane'}</th>
            <th>{es ? 'qué corre' : 'what runs'}</th>
            <th>{es ? 'qué lo ata a lo horneado' : 'what holds it to the bake'}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{es ? 'sin conexión' : 'offline'}</td>
            <td>{es ? 'entrenamiento, protocolos, intervalos, diagnósticos' : 'training, protocols, intervals, diagnostics'}</td>
            <td>{es ? 'versiones fijadas, semilla, compuerta de publicación' : 'pinned versions, a seed, the release gate'}</td>
          </tr>
          <tr>
            <td>{es ? 'reproducción' : 'replay'}</td>
            <td>{es ? 'casos, benchmark, modelos' : 'cases, benchmark, models'}</td>
            <td>{es ? 'resumen de contenido por archivo' : 'a content digest per file'}</td>
          </tr>
          <tr>
            <td>{es ? 'vivo: ecuaciones' : 'live: equations'}</td>
            <td>{es ? 'clásica, curvas, enrutador, regresión' : 'classical, curves, router, regression'}</td>
            <td>{es ? 'prueba de paridad contra cada tiro horneado' : 'a parity test against every baked blast'}</td>
          </tr>
          <tr>
            <td>{es ? 'vivo: modelos' : 'live: models'}</td>
            <td>{es ? 'red, núcleos, árboles, reajuste, transferencia' : 'network, kernels, trees, refit, transfer'}</td>
            <td>{es ? 'fijaciones de los modelos originales' : 'fixtures from the original models'}</td>
          </tr>
        </tbody>
      </table>
      <Equation
        tex={String.raw`d = \mathrm{SHA\text{-}256}\big(\mathrm{json}_{\mathrm{sorted}}(\text{payload})\big)`}
        caption={es ? 'Dirección de contenido de cada artefacto: el resumen de su serialización canónica, con claves ordenadas.' : 'Each artifact’s content address: the digest of its canonical serialisation, with sorted keys.'}
      />
      <Callout variant="note" title={es ? 'Dónde vale y dónde no' : 'Where it holds and where it does not'}>
        {es
          ? 'El resumen detecta cualquier edición de un artefacto después del horneado, y el índice repite el resumen de cada archivo, así que un artefacto y su índice no pueden separarse sin que la compuerta lo note. No dice nada sobre si el número es correcto; eso lo dicen las pruebas contra la fuente y los controles.'
          : 'The digest detects any edit to an artifact after the bake, and the index repeats each file’s digest, so an artifact and its index cannot drift apart without the gate noticing. It says nothing about whether a number is right; the tests against the source and the controls say that.'}
      </Callout>
      {refs('i-architecture', es)}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

function Data({ es }: TabProps) {
  const defects: [string, string, string, string][] = [
    ['Db5', es ? 'factor de carga' : 'powder factor', '0.39', '0.33'],
    ['Sm4', 'x50', '0.22', '0.24'],
    ['Ad15', 'x50', '0.15', '0.22'],
    ['Ad17', es ? 'factor de carga' : 'powder factor', '1.24', '1.07'],
    ['Ad19', es ? 'factor de carga' : 'powder factor', '1.26', '1.47'],
  ];
  return (
    <section>
      <h2>{es ? 'Los datos y la compuerta de integridad' : 'The data and the integrity gate'}</h2>
      <p>
        {es
          ? 'Tres conjuntos reales se cargan por el mismo contrato: los 97 tiros del corpus, los 14 de validación publicados y los cinco de campo. El contrato rechaza lo que no puede ser una voladura (un factor de carga fuera de 0.05 a 3 kg/m³, por ejemplo) y marca, sin recortar, lo que queda fuera de la envolvente de entrenamiento; toda predicción sobre una fila marcada lleva el sello de extrapolación.'
          : 'Three real sets load through one contract: the 97 corpus blasts, the 14 published hold-out blasts and the five field blasts. The contract rejects what cannot be a blast (a powder factor outside 0.05 to 3 kg/m³, for example) and flags, without clipping, what lies outside the training envelope; every prediction on a flagged row carries the extrapolation stamp.'}{' '}
        <Cite id="hudaverdi2010" />{' '}
        <Cite id="sui2025" />
      </p>
      <p>
        {es
          ? 'Cargar el corpus corre una compuerta de dos partes. La primera recalcula, desde las 97 filas, la tabla de estadísticas descriptivas que el propio artículo imprime (mínimo, máximo, media y desviación de las siete variables) y la compara a la precisión con que se imprimió. La segunda compara un resumen criptográfico del contenido con un valor fijado, porque una media sobre 97 filas detecta mal el cambio de una celda: corregir un factor de carga la mueve en 0.0006.'
          : 'Loading the corpus runs a two-part gate. The first recomputes, from the 97 rows, the descriptive-statistics table the paper itself prints (minimum, maximum, mean and deviation of all seven variables) and compares it at the precision it was printed to. The second compares a cryptographic digest of the content with a pinned value, because a mean over 97 rows detects a one-cell change poorly: correcting one powder factor moves it by 0.0006.'}
      </p>
      <Equation
        tex={String.raw`\left|\,\hat\theta - \theta^{\mathrm{pub}}\right| \le 0.5\times 10^{-k},\qquad \theta \in \{\min, \max, \bar x, s\}\ \text{of each of the seven features}`}
        caption={es ? 'Comprobación a la precisión impresa: k es el número de decimales con que la tabla de la fuente imprime cada estadístico.' : 'The check at printed precision: k is the number of decimals the source table prints each statistic to.'}
      />
      <p>
        {es
          ? 'La compuerta encontró cinco errores de transcripción en el corpus tal como se ensambló al principio, dos sobre el tamaño medido. La señal fue el máximo del factor de carga, 1.47 frente al 1.26 que imprime el artículo; la fila Ad19 tenía su propio tamaño de bloque copiado en la columna vecina. Dos copias independientes del artículo, leídas por separado, coinciden entre sí y discrepan del archivo exactamente en estas cinco celdas:'
          : 'The gate found five transcription errors in the corpus as first assembled, two of them on the measured size. The tell was the powder-factor maximum, 1.47 against the 1.26 the paper prints; row Ad19 had its own block size copied into the neighbouring column. Two independent copies of the paper, read separately, agree with each other and disagree with the file in exactly these five cells:'}{' '}
        <Cite id="kulatilake2012" />
      </p>
      <table className="fr-table">
        <thead>
          <tr>
            <th>{es ? 'tiro' : 'blast'}</th>
            <th>{es ? 'columna' : 'column'}</th>
            <th>{es ? 'publicado' : 'published'}</th>
            <th>{es ? 'como se encontró' : 'as found'}</th>
          </tr>
        </thead>
        <tbody>
          {defects.map(([id, column, published, found]) => (
            <tr key={id}>
              <td><code>{id}</code></td>
              <td>{column}</td>
              <td>{published}</td>
              <td className="fr-bad">{found}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ContractsDiagram />
      <Callout variant="note" title={es ? 'Dónde vale y dónde no' : 'Where it holds and where it does not'}>
        {es
          ? 'La compuerta atrapa cualquier diferencia entre el archivo y la tabla publicada. No puede atrapar un error que ya esté en el artículo, porque compara contra él; y las estadísticas de una columna no detectan dos errores que se compensen, que es para lo que está el resumen fijado.'
          : 'The gate catches any difference between the file and the published table. It cannot catch an error already in the paper, because it compares against it; and the statistics of a column do not detect two errors that cancel, which is what the pinned digest is for.'}
      </Callout>
      {refs('i-data', es)}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

function Geometry({ es, b }: TabProps) {
  const sites = b ? Object.entries(b.site_meta) : [];
  return (
    <section>
      <h2>{es ? 'Recuperar la malla en metros' : 'Recovering the pattern in metres'}</h2>
      <p>
        {es
          ? 'El corpus publica razones y ninguna dimensión, y la ecuación clásica necesita volumen de roca y masa de explosivo por barreno, así que sobre razones no podía correr. La prosa de la fuente da un diámetro de perforación en ocho de los diez sitios, y un diámetro cierra el sistema:'
          : 'The corpus publishes ratios and no dimensions, and the classical equation needs rock volume and explosive mass per hole, so on ratios alone it could not run. The source prose gives a hole diameter for eight of its ten sites, and a diameter closes the system:'}{' '}
        <Cite id="hudaverdi2010" />
      </p>
      <Equation
        tex={String.raw`B = \tfrac{B}{D}\,D,\quad S = \tfrac{S}{B}\,B,\quad H = \tfrac{H}{B}\,B,\quad T = \tfrac{T}{B}\,B,\qquad V = B\,S\,H,\quad Q = P_f\,V`}
        caption={es ? 'La reconstrucción: D en metros; V volumen de roca y Q masa de explosivo por barreno.' : 'The reconstruction: D in metres; V the rock volume and Q the explosive mass per hole.'}
      />
      <p>
        {es
          ? 'Un noveno sitio, Reocin subterránea, no declara diámetro pero sí una altura de banco de 18 m; invertir la cadena da el mismo diámetro, 91.2 mm, en sus seis filas, una comprobación interna de seis veces y no un supuesto. El décimo, Miami, no publica nada absoluto: sus seis tiros no se reconstruyen y todo brazo que necesita volumen se abstiene allí con la razón.'
          : 'A ninth site, Reocin underground, states no diameter but an 18 m bench height; inverting the chain returns the same diameter, 91.2 mm, on all six of its rows, a six-fold internal check rather than an assumption. The tenth, Miami, publishes nothing absolute: its six blasts are not reconstructed and every arm that needs a volume abstains there with the reason.'}
      </p>
      <Equation
        tex={String.raw`D = \frac{H}{(H/B)\,(B/D)}`}
        caption={es ? 'El diámetro implícito en una altura de banco declarada.' : 'The diameter implied by a stated bench height.'}
      />
      <p>
        {es
          ? 'La reconstrucción se verifica contra quince restricciones que la misma prosa declara, en nueve sitios, y se cumplen las quince. En Murgul un párrafo declara altura de banco, rango de bordo y rango de espaciamiento, y la regla reproduce los tres exactamente; en Dongri-Buzurg los tres caen dentro. La tolerancia no se elige: es la impresión a dos decimales de las razones, propagada por la multiplicación. Soma es la excepción registrada: su prosa declara 5 m de bordo y 21 cm de diámetro, y su razón no admite ambos; tomar el diámetro reproduce exactamente el espaciamiento y la altura declarados, así que dos de tres restricciones lo eligen y el conflicto viaja con el caso.'
          : 'The reconstruction is checked against fifteen constraints the same prose states, at nine sites, and all fifteen hold. At Murgul one paragraph states a bench height, a burden range and a spacing range, and the rule reproduces all three exactly; at Dongri-Buzurg all three land inside. The tolerance is not chosen: it is the two-decimal printing of the ratios, propagated through the multiplication. Soma is the recorded exception: its prose states a 5 m burden and a 21 cm diameter, and its ratio cannot hold both; taking the diameter reproduces the stated spacing and bench height exactly, so two of three constraints select it and the conflict travels with the case.'}
      </p>
      {sites.length ? (
        <table className="fr-table">
          <thead>
            <tr>
              <th>{es ? 'sitio' : 'site'}</th>
              <th>{es ? 'mina' : 'mine'}</th>
              <th>D, mm</th>
              <th>{es ? 'tiros' : 'blasts'}</th>
            </tr>
          </thead>
          <tbody>
            {sites.map(([site, meta]) => (
              <tr key={site}>
                <td>{site}</td>
                <td className="fr-fine">{meta.mine ?? '-'}</td>
                <td>{meta.hole_diameter_mm === null ? (es ? 'no publicado' : 'not published') : f(meta.hole_diameter_mm, 1)}</td>
                <td>{meta.n_blasts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <ReconstructionDiagram />
      <Callout variant="note" title={es ? 'Dónde vale y dónde no' : 'Where it holds and where it does not'}>
        {es
          ? 'Vale donde la fuente declara un diámetro o una dimensión de la que despejarlo, y se comprueba donde además declara rangos. No vale para Miami, y en Soma depende de qué dato de la prosa se toma como correcto. Una evidencia independiente de que la geometría es correcta es que el factor de roca recuperado con ella casi no varía dentro de cada sitio.'
          : 'It holds where the source states a diameter or a dimension to solve one from, and it is checked where the source also states ranges. It does not hold for Miami, and at Soma it depends on which figure in the prose is taken as correct. Independent evidence that the geometry is right is that the rock factor recovered with it barely varies within each site.'}
      </Callout>
      {refs('i-geometry', es)}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

function Bake({ es, b }: TabProps) {
  return (
    <section>
      <h2>{es ? 'El horneado por etapas' : 'The staged bake'}</h2>
      <p>
        {es
          ? 'Un solo ejecutor corre nueve etapas para cada uno de los dieciséis casos y después el benchmark entre casos: ingesta con el contrato y la compuerta; preproceso con la geometría y el factor de roca; partición con sus guardas de fuga; variables; entrenamiento sin el sitio del caso; inferencia de todo brazo, con valor o razón; evaluación con ambos estadísticos y el nulo; exportación direccionada por contenido, incluidos los modelos ajustados de cada alcance; y validación, que vuelve a leer, a calcular los resúmenes y falla ante un hueco.'
          : 'One runner takes each of the sixteen cases through nine stages and then runs the cross-case benchmark: ingest with the contract and the gate; preprocess with the geometry and the rock factor; split with its leakage guards; features; train without the case’s own site; infer every arm, with a value or a reason; evaluate with both statistics and the null; export, content-addressed, including each scope’s fitted models; and validate, which re-reads, re-hashes and fails on a hole.'}
      </p>
      <PipelineDiagram />
      <p>
        {es
          ? `El horneado es una función pura del registro de casos, de las versiones fijadas (motor ${b?.engine_version ?? 'n/a'}, numpy, scikit-learn y xgboost exactos) y de la semilla. Repetido en el mismo entorno, produce artefactos idénticos byte a byte, y una prueba lo comprueba. Repetido en otro sistema operativo los reproduce con una tolerancia numérica y no con un resumen, porque dos compilaciones del mismo numpy pueden sumar un producto punto en otro orden; la comparación entre entornos usa una tolerancia relativa de 1e-6, y la peor diferencia medida entre Windows y Linux en la versión 0.04 fue 2.7e-08.`
          : `The bake is a pure function of the case registry, the pinned versions (engine ${b?.engine_version ?? 'n/a'}, and exact numpy, scikit-learn and xgboost) and the seed. Re-run in the same environment it writes byte-identical artifacts, and a test checks that. Re-run on another operating system it reproduces them to a numeric tolerance rather than a digest, because two builds of the same numpy can sum a dot product in a different order; the cross-environment comparison uses a relative tolerance of 1e-6, and the worst difference measured between Windows and Linux at version 0.04 was 2.7e-08.`}
      </p>
      <Equation
        tex={String.raw`\frac{|a - b|}{\max(|a|, |b|)} \le 10^{-6}\quad \text{for every number in every artifact}`}
        caption={es ? 'La comparación entre entornos: número a número, no archivo a archivo.' : 'The cross-environment comparison: number by number, not file by file.'}
      />
      <Callout variant="note" title={es ? 'Dónde vale y dónde no' : 'Where it holds and where it does not'}>
        {es
          ? 'Las pruebas escriben en un directorio temporal y comparan contra los archivos comprometidos, así que no pueden reescribir lo que comprueban. La medición entre sistemas operativos se hizo en la versión 0.04 y no se repitió para esta; la identidad byte a byte en el mismo entorno sí se comprueba en cada corrida de las pruebas.'
          : 'Tests write into a temporary directory and compare against the committed files, so they cannot rewrite what they check. The cross-operating-system measurement was made at version 0.04 and not repeated for this one; byte identity in the same environment is checked on every test run.'}
      </Callout>
      {refs('i-bake', es)}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

function Leakage({ es, b }: TabProps) {
  const provenance = b ? Object.entries(b.provenance).filter(([, p]) => p.tier !== 'control') : [];
  return (
    <section>
      <h2>{es ? 'Control de fuga' : 'Leakage control'}</h2>
      <p>
        {es
          ? 'Todo modelo ajustado que se muestra sobre una campaña real se entrenó con el corpus sin esa campaña. El sitio retenido se estampa en el artefacto, el horneado falla si algún tiro del caso aparece entre las filas de entrenamiento, y los modelos que el navegador corre en vivo para ese caso son exactamente los de ese ajuste. Kapoor y Narayanan catalogan cómo la fuga entre filas de entrenamiento y de prueba infla el desempeño reportado en ciencia con aprendizaje automático.'
          : 'Every fitted model shown on a real campaign was trained on the corpus without that campaign. The withheld site is stamped on the artifact, the bake fails if any blast of the case appears among the training rows, and the models the browser runs live for that case are exactly the ones from that fit. Kapoor and Narayanan catalogue how leakage between training and test rows inflates reported performance in machine-learning-based science.'}{' '}
        <Cite id="kapoor2023" />
      </p>
      <Equation
        tex={String.raw`\mathcal{T}_c = \mathcal{C} \setminus \{\,i : s(i) = s_c\,\},\qquad \forall\, i \in c:\ i \notin \mathcal{T}_c`}
        caption={es ? 'Las filas de entrenamiento del caso c: el corpus C sin las del sitio s_c; la aserción del horneado.' : 'The training rows of case c: the corpus C without those of site s_c; the bake’s assertion.'}
      />
      <LeakageDiagram />
      <p>
        {es
          ? 'Retener filas no basta para todos los brazos, y cada uno declara con qué se ajustó. El enrutador y la regresión publicada los ajustó su fuente sobre los 97 tiros, así que están dentro de la muestra bajo cualquier partición; la regresión reajustada y la red ajustan sus coeficientes sin el sitio, pero eligen el grupo con ese enrutador; el brazo clásico lee un factor recuperado de predicciones publicadas para el propio sitio. La tabla lo dice brazo por brazo, leída del artefacto:'
          : 'Withholding rows is not enough for every arm, and each one declares what it was fitted on. The router and the published regression were fitted by their source on the 97 blasts, so they are in sample under any split; the refitted regression and the network fit their coefficients without the site but choose the group with that router; the classical arm reads a factor recovered from published predictions for the site itself. The table says so arm by arm, read from the artifact:'}{' '}
        <Cite id="roberts2017" />
      </p>
      {provenance.length ? (
        <div className="fr-scroll-x">
          <table className="fr-table">
            <thead>
              <tr>
                <th>{es ? 'brazo' : 'arm'}</th>
                <th>{es ? 'ajustado con' : 'fitted on'}</th>
                <th>{es ? 'marca' : 'flag'}</th>
              </tr>
            </thead>
            <tbody>
              {provenance.map(([arm, p]) => (
                <tr key={arm}>
                  <td><code>{arm}</code></td>
                  <td className="fr-fine">{p.fitted_on}</td>
                  <td>
                    {p.in_sample_corpus
                      ? es ? 'dentro de la muestra' : 'in sample'
                      : p.uses_site_constant
                        ? es ? 'constante del propio sitio' : 'own-site constant'
                        : p.router_in_sample
                          ? es ? 'enrutador en muestra' : 'router in sample'
                          : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <Callout variant="note" title={es ? 'Dónde vale y dónde no' : 'Where it holds and where it does not'}>
        {es
          ? 'La aserción garantiza que ningún tiro del caso entró al ajuste. No garantiza independencia entre campañas: dos campañas de un mismo artículo, o con la misma roca, comparten información que ningún protocolo puede retirar, como las dos de Reocin con el mismo módulo de 45 GPa.'
          : 'The assertion guarantees that no blast of the case entered the fit. It does not guarantee independence between campaigns: two campaigns from one paper, or on the same rock, share information no protocol can remove, like the two Reocin campaigns with the same 45 GPa modulus.'}
      </Callout>
      {refs('i-leakage', es)}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

function LiveEquations({ es }: TabProps) {
  return (
    <section>
      <h2>{es ? 'El carril vivo: las ecuaciones' : 'The live lane: the equations'}</h2>
      <p>
        {es
          ? 'Las formas cerradas se reescribieron en TypeScript para que cambiar un diseño mueva la curva sin esperar a un servidor: la ecuación clásica de tamaño medio, el índice de uniformidad, las curvas de dos y tres parámetros, la composición de dos ramas, la función discriminante, las dos leyes de potencia publicadas y la guarda que rechaza un diseño cuyo taco se come el banco.'
          : 'The closed forms were rewritten in TypeScript so that changing a design moves the curve without waiting on a server: the classical mean-size equation, the uniformity index, the two- and three-parameter curves, the two-branch composition, the discriminant function, the two published power laws and the guard that refuses a design whose stemming swallows the bench.'}{' '}
        <Cite id="amoako2022" />{' '}
        <Cite id="hudaverdi2010" />
      </p>
      <p>
        {es
          ? 'Dos implementaciones de una ecuación se separan en cuanto nadie las compara, y el síntoma es un gráfico sutilmente equivocado y plausible. La prueba de paridad compara cada función contra los números que horneó el motor de Python, en cada tiro de cada caso, y falla la compilación ante una divergencia mayor que el redondeo de los artefactos.'
          : 'Two implementations of one equation drift as soon as nobody compares them, and the symptom is a chart that is subtly wrong and entirely plausible. The parity test compares every function against the numbers the Python engine baked, on every blast of every case, and fails the build on a divergence larger than the artifacts’ rounding.'}
      </p>
      <Equation
        tex={String.raw`\left|\,x_{50}^{\mathrm{TS}} - x_{50}^{\mathrm{py}}\right| < 5\times 10^{-4}\ \mathrm{m}`}
        caption={es ? 'El criterio de paridad de las formas cerradas: el artefacto redondea la predicción a seis decimales y la malla a cuatro.' : 'The parity criterion for the closed forms: the artifact rounds the prediction to six decimals and the pattern to four.'}
      />
      <p>
        {es ? 'La curva de dos parámetros, por ejemplo, se escribe en el navegador exactamente como en el motor: ' : 'The two-parameter curve, for example, is written in the browser exactly as in the engine: '}
        <InlineMath tex={String.raw`P(x) = 1 - e^{-\ln 2\,(x/x_{50})^n}`} />
        {es ? ', con el mismo enrejado logarítmico de tamaños, para que las curvas se superpongan sin remuestrear.' : ', on the same logarithmic size grid, so curves overlay without resampling.'}
      </p>
      <Callout variant="note" title={es ? 'Dónde vale y dónde no' : 'Where it holds and where it does not'}>
        {es
          ? 'La paridad vale en los diseños horneados. Un diseño que usted construye en la App con los controles no tiene número horneado contra el cual comparar: lo que garantiza que su resultado es el del motor es que las mismas funciones pasaron la paridad en todos los tiros horneados.'
          : 'Parity holds on the baked designs. A design you build in the App with the controls has no baked number to compare against: what guarantees its result is the engine’s is that the same functions passed parity on every baked blast.'}
      </Callout>
      {refs('i-live', es)}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

function LiveModels({ es, index }: TabProps) {
  const models = index?.models ?? [];
  const total = models.reduce((s, m) => s + m.bytes, 0);
  return (
    <section>
      <h2>{es ? 'El carril vivo: los modelos ajustados' : 'The live lane: the fitted models'}</h2>
      <p>
        {es
          ? 'Los brazos aprendidos se ajustan sin conexión con numpy, scikit-learn y xgboost, que un navegador no tiene, y ONNX Runtime Web no trae un núcleo para ensambles de árboles. Así que el motor exporta cada modelo ajustado como JSON plano (los pesos de la red, los vectores de soporte, y cada árbol como cuatro arreglos: hijo izquierdo, hijo derecho, variable y umbral u hoja), y la App los recorre en TypeScript.'
          : 'The learned arms are fitted offline with numpy, scikit-learn and xgboost, which a browser does not have, and ONNX Runtime Web has no tree-ensemble kernel. So the engine exports each fitted model as plain JSON (the network’s weights, the support vectors, and every tree as four arrays: left child, right child, feature, and threshold or leaf), and the App walks them in TypeScript.'}{' '}
        <Cite id="breiman2001" />{' '}
        <Cite id="chen2016" />{' '}
        <Cite id="smola2004" />
      </p>
      <PortableModelDiagram />
      <p>
        {es
          ? 'Tres detalles hacen que el recorrido sea exacto y no aproximado. scikit-learn y XGBoost comparan una entrada de 32 bits con el umbral, así que la entrada estandarizada se redondea a 32 bits antes de cada comparación; XGBoost imprime sus umbrales de 32 bits como decimales cortos, que hay que volver a redondear; y XGBoost suma sus hojas en 32 bits a partir del valor base:'
          : 'Three details make the walk exact rather than approximate. scikit-learn and XGBoost compare a 32-bit input with the threshold, so the standardised input is rounded to 32 bits before every comparison; XGBoost prints its 32-bit thresholds as short decimals, which have to be rounded back; and XGBoost sums its leaves in 32 bits starting from the base value:'}
      </p>
      <Equation
        tex={String.raw`z_j^{(32)} = \mathrm{fl}_{32}\!\left(\frac{x_j - \mu_j}{\sigma_j}\right),\qquad s_k = \mathrm{fl}_{32}\big(s_{k-1} + \ell_k(z^{(32)})\big),\quad s_0 = \mathrm{fl}_{32}(b_0)`}
        caption={es ? 'Entrada redondeada a 32 bits y acumulación de 32 bits de las hojas ℓ de la potenciación; fl₃₂ es Math.fround.' : 'The input rounded to 32 bits, and the 32-bit accumulation of the boosting leaves ℓ; fl₃₂ is Math.fround.'}
      />
      <p>
        {es
          ? `Cada archivo de modelos trae, como fijaciones, la predicción del modelo original en los 116 tiros publicados. La prueba del navegador las reproduce exactamente para el bosque, la potenciación y el ensamble, y con una diferencia relativa menor que 1e-12 para la red, los núcleos y la ley de potencia, que llaman a una exponencial o a una potencia. Hay ${models.length || 'n/a'} archivos, uno por campaña retenida y uno con el corpus completo, ${kb(total)} en total; el navegador carga solo el del caso abierto.`
          : `Every models file carries, as fixtures, the original model’s prediction at all 116 published blasts. The browser test reproduces them exactly for the forest, the boosting model and the ensemble, and to a relative difference below 1e-12 for the network, the kernels and the power law, which call an exponential or a power. There are ${models.length || 'n/a'} files, one per withheld campaign and one for the whole corpus, ${kb(total)} in all; the browser loads only the one for the open case.`}
      </p>
      <Callout variant="note" title={es ? 'Dónde vale y dónde no' : 'Where it holds and where it does not'}>
        {es
          ? 'Un número aprendido que se mueve cuando usted arrastra un control es el del modelo ajustado, no una aproximación. Eso no lo vuelve confiable fuera de la envolvente de entrenamiento: el modelo es el mismo, y lo que el benchmark mide de él, incluida su caída al excluir un sitio, también vale para su diseño.'
          : 'A learned number that moves as you drag a control is the fitted model’s number, not an approximation of it. That does not make it reliable outside the training envelope: the model is the same, and what the benchmark measures about it, including its drop with a site held out, applies to your design too.'}
      </Callout>
      {refs('i-models', es)}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

function Deploy({ es, b, index }: TabProps) {
  const caseBytes = index?.cases.reduce((s, c) => s + c.bytes, 0);
  const modelBytes = index?.models?.reduce((s, m) => s + m.bytes, 0);
  return (
    <section>
      <h2>{es ? 'Artefactos y despliegue' : 'Artifacts and deploy'}</h2>
      <p>
        {es
          ? `Lo que se publica: ${index?.n_cases ?? 'n/a'} artefactos de caso (${kb(caseBytes)}), el benchmark (${kb(index?.benchmark?.bytes)}), ${index?.models?.length ?? 'n/a'} archivos de modelos (${kb(modelBytes)}) y un índice que lista cada archivo con su resumen. El horneado los escribe con la versión de la aplicación ${b?.app_version ?? 'n/a'} y la del motor ${b?.engine_version ?? 'n/a'}, que el pie de página y cada artefacto repiten.`
          : `What is published: ${index?.n_cases ?? 'n/a'} case artifacts (${kb(caseBytes)}), the benchmark (${kb(index?.benchmark?.bytes)}), ${index?.models?.length ?? 'n/a'} models files (${kb(modelBytes)}) and an index listing every file with its digest. The bake writes them with application version ${b?.app_version ?? 'n/a'} and engine version ${b?.engine_version ?? 'n/a'}, which the footer and every artifact repeat.`}
      </p>
      <p>
        {es
          ? 'El despliegue es un sitio estático en GitHub Pages con dominio propio. El flujo de despliegue verifica los artefactos comprometidos, compila la aplicación, corre la compuerta de navegador sobre lo que va a publicar (cada ruta, ambos temas, ambos idiomas, y la medición de figuras y pie de página) y solo entonces publica. Nunca entrena, nunca vuelve a hornear y nunca recalcula un benchmark; la integración continua tampoco instala la pila de entrenamiento.'
          : 'The deploy is a static site on GitHub Pages with a custom domain. The deploy workflow verifies the committed artifacts, builds the application, runs the browser gate on what it is about to publish (every route, both themes, both languages, and the figure and footer measurements) and only then publishes. It never trains, never re-bakes and never recomputes a benchmark; continuous integration does not install the training stack either.'}
      </p>
      <pre className="fr-code">
        <code>{`python data-pipeline/run.py            # ${es ? 'hornea los casos, los modelos y el benchmark' : 'bake the cases, the models and the benchmark'}
python data-pipeline/run.py --validate # ${es ? 'vuelve a comprobar lo que está en disco' : 're-check what is on disk'}
pytest                                 # ${es ? 'pruebas contra los artefactos comprometidos' : 'tests against the committed artifacts'}
cd frontend && npm test                # ${es ? 'paridad de ecuaciones y modelos' : 'parity of equations and models'}`}</code>
      </pre>
      <Equation
        tex={String.raw`\text{publish} \iff \text{gate}(\text{artifacts}) \wedge \text{build} \wedge \text{browser gate}(\text{site})`}
        caption={es ? 'La condición de publicación del flujo de despliegue.' : 'The deploy workflow’s condition for publishing.'}
      />
      <Callout variant="note" title={es ? 'Dónde vale y dónde no' : 'Where it holds and where it does not'}>
        {es
          ? 'Un sitio que responde 200 en cada ruta puede estar en blanco: este lo estuvo desde su primera publicación hasta su primera versión de corrección, con dos copias de la biblioteca de rutas. Por eso la verificación de un despliegue es la compuerta de navegador sobre el sitio, y no un código de estado.'
          : 'A site that answers 200 on every route can be blank: this one was, from its first publish to its first patch release, with two copies of the routing library. That is why a deploy is verified by the browser gate on the site, not by a status code.'}
      </Callout>
      {refs('i-deploy', es)}
    </section>
  );
}
