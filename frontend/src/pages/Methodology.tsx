/**
 * Methodology: every predictor, term by term, with its source, how this product applies it, and
 * where it fails. Seven families, one sub-tab each, every one with its equations, a figure, a
 * callout and its own sources. Figures that depend on a measurement read it from the artifacts.
 */

import { Callout, Cite, Equation, InlineMath, Refs, SubTabs, useShellLang } from '@fasl-work/caos-app-shell';
import type { SubTabDef } from '@fasl-work/caos-app-shell';
import { Link } from 'react-router';

import { SECTION_REFS } from '../data/citations';
import type { BenchmarkArtifact, GroupedArmBlock, ModelsFile, ReproductionBlock } from '../lib/contract.types';
import { f, facts, iv, useBenchmark, useModels } from '../lib/facts';
import {
  ClassicalFlowDiagram,
  DistributionShapesDiagram,
  EnsembleDiagram,
  GroupRouterDiagram,
  NetworkDiagram,
  ProtocolDiagram,
  RockFactorDiagram,
} from '../viz/Diagrams';

interface TabProps {
  es: boolean;
  b: BenchmarkArtifact | null;
}

const refs = (key: string, es: boolean) => <Refs ids={SECTION_REFS[key]} label={es ? 'Fuentes' : 'Sources'} />;

export default function Methodology() {
  const es = useShellLang() === 'es';
  const b = useBenchmark();
  const corpus = useModels('corpus');

  const tabs: SubTabDef[] = [
    { id: 'classical', label: es ? 'Tamaño medio clásico' : 'Classical mean size', content: <Classical es={es} b={b} /> },
    { id: 'rock', label: es ? 'Factor de roca' : 'Rock factor', content: <RockFactor es={es} b={b} /> },
    { id: 'distributions', label: es ? 'Distribuciones' : 'Distributions', content: <Distributions es={es} b={b} /> },
    { id: 'statistical', label: es ? 'Enrutador y regresiones' : 'Router and regressions', content: <Statistical es={es} b={b} /> },
    { id: 'network', label: es ? 'Red neuronal' : 'Neural network', content: <Network es={es} b={b} /> },
    { id: 'ensembles', label: es ? 'Núcleos y ensambles' : 'Kernels and ensembles', content: <Ensembles es={es} b={b} corpus={corpus} /> },
    { id: 'protocols', label: es ? 'Protocolos y métricas' : 'Protocols and metrics', content: <Protocols es={es} b={b} /> },
  ];

  return (
    <div className="page-body wide prose">
      <div className="page-head">
        <h1>{es ? 'Metodología' : 'Methodology'}</h1>
        <p className="lede">
          {es
            ? 'Diez predictores del tamaño medio en cuatro familias, cada uno transcrito de su fuente primaria con cada símbolo definido, junto con lo que este producto fija donde la fuente no dice nada, y dónde falla cada uno. La última sección define cómo se miden: la varianza explicada '
            : 'Ten predictors of the mean size in four families, each transcribed from its primary source with every symbol defined, together with what this product sets where the source is silent, and where each one fails. The last section defines how they are measured: variance explained '}
          <InlineMath tex="R^2_{\mathrm{id}}" />
          {es ? ', bajo tres protocolos, con intervalos por remuestreo de sitios.' : ', under three protocols, with site-resampled intervals.'}
        </p>
      </div>
      <SubTabs tabs={tabs} ariaLabel={es ? 'familias de métodos' : 'method families'} orientation="vertical" />
    </div>
  );
}

/* ------------------------------------------------------------------------------------------- */

function Classical({ es, b }: TabProps) {
  const holdout = b?.published_reproduction.published_holdout_arms;
  const classical = holdout?.classical;
  const nul = holdout?.null;
  const gain = classical?.rmse_m && nul?.rmse_m ? 1 - classical.rmse_m / nul.rmse_m : null;
  const F = b ? facts(b) : null;
  return (
    <section>
      <h2>{es ? 'El tamaño medio clásico' : 'The classical mean size'}</h2>
      <p>
        {es
          ? 'Kuznetsov publicó en 1973 una relación entre el diámetro medio de los fragmentos, la energía del explosivo y el volumen de roca que rompe cada barreno. Con la corrección de Cunningham por la potencia del explosivo es la base de la familia Kuz-Ram, y las dos fuentes de este producto la imprimen así, con el tamaño en centímetros, el volumen en metros cúbicos y la carga en kilogramos de equivalente TNT:'
          : 'Kuznetsov published in 1973 a relation between the mean fragment diameter, the explosive energy and the rock volume each hole breaks. With Cunningham’s explosive-strength correction it is the basis of the Kuz-Ram family, and both of this product’s sources print it this way, with the size in centimetres, the volume in cubic metres and the charge in kilograms of TNT equivalent:'}{' '}
        <Cite id="kuznetsov1973" />{' '}
        <Cite id="hudaverdi2010" />
      </p>
      <Equation
        tex={String.raw`x_{50} = A\left(\frac{V}{Q}\right)^{0.8} Q^{1/6}\left(\frac{\mathrm{RWS}}{115}\right)^{-19/30}`}
        caption={es ? 'Hudaverdi et al. 2010, Ec. 1. A factor de roca, V volumen por barreno, Q masa de explosivo, RWS potencia relativa.' : 'Hudaverdi et al. 2010, Eq. 1. A rock factor, V volume per hole, Q explosive mass, RWS relative weight strength.'}
      />
      <p>
        {es
          ? 'Como V/Q es el recíproco del factor de carga K, Amoako, Jha y Zhong escriben la misma ecuación en K. Las dos formas coinciden en ese término y difieren en el exponente de potencia: −19/30 sobre RWS/115 en una y 19/20 sobre 115/RWS en la otra, lo que separa los resultados en cerca de 8 por ciento con RWS 140. El corpus no tiene ese problema en la práctica, porque todos sus tiros usaron ANFO (RWS 100), y despejar el factor de roca desde las predicciones publicadas lo zanja de todos modos: con la forma −19/30 el factor recuperado queda casi constante dentro de cada sitio, y con la otra no.'
          : 'Because V/Q is the reciprocal of the powder factor K, Amoako, Jha and Zhong write the same equation in K. The two forms agree on that term and differ on the strength exponent, −19/30 on RWS/115 in one and 19/20 on 115/RWS in the other, which separates the results by about 8 percent at an RWS of 140. On this corpus it does not matter in practice, because every blast used ANFO (RWS 100), and back-solving the rock factor from the published predictions settles it anyway: with the −19/30 form the recovered factor is near constant within each site, and with the other it is not.'}{' '}
        <Cite id="amoako2022" />
      </p>
      <Equation
        tex={String.raw`x_{50} = A\,K^{-0.8}\,Q^{1/6}\left(\frac{115}{\mathrm{RWS}}\right)^{19/20},\qquad K = \frac{Q}{V}`}
        caption={es ? 'La forma en factor de carga, Amoako et al. 2022, Ec. 3; mismo término energético, otro exponente de potencia.' : 'The powder-factor form, Amoako et al. 2022, Eq. 3; same energy term, a different strength exponent.'}
      />
      <p>
        {es
          ? 'Aplicarla al corpus exige dos cosas que el corpus no imprime. El volumen y la carga por barreno se obtienen de la malla en metros, que se recupera desde las razones y los diámetros declarados en la prosa de la fuente; '
          : 'Applying it to the corpus needs two things the corpus does not print. The volume and charge per hole come from the pattern in metres, recovered from the ratios and the diameters stated in the source prose; '}
        <Link to="/implementation">{es ? 'Implementación' : 'Implementation'}</Link>
        {es
          ? ' muestra cómo. El factor de roca se toma de una de dos vías: el valor recuperado para el sitio, que usa información de ese mismo sitio, o el predicho desde el módulo con una recta ajustada solo sobre los demás sitios, que es la forma que se usa para hablar de transferencia:'
          : ' shows how. The rock factor comes by one of two routes: the value recovered for the site, which uses information about that same site, or the one predicted from the modulus by a line fitted over the other sites only, which is the form used when the question is transfer:'}
      </p>
      <Equation
        tex={String.raw`\ln \hat A = a + b \ln \bar E_s,\quad (a,b)\ \text{fitted over the training sites, one point per site}`}
        caption={es ? 'El factor de roca de transferencia, una calibración de este producto y no una relación publicada.' : 'The transfer rock factor, a calibration of this product and not a published relation.'}
      />
      <p>
        {es
          ? `Dónde falla. Sobre el conjunto de validación publicado de doce tiros, la columna clásica que imprime el artículo de 2012 explica ${f(classical?.r2_identity)} de la varianza respecto de la identidad, con una correlación al cuadrado de ${f(classical?.pearson_r2)}; su error cuadrático medio de ${f(classical?.rmse_m)} m mejora en ${gain === null ? 'n/a' : Math.round(gain * 100)} por ciento al de predecir una constante. Es el peor de los tres modelos de esa tabla. Su falla mejor documentada es subestimar los finos. Bajo los protocolos de este producto puntúa cerca de 0.30 en todos: ${f(F?.random('kuznetsov')?.r2_identity)} en la partición aleatoria mediana y ${f(F?.site('kuznetsov'))} con su sitio excluido.`
          : `Where it fails. On the published twelve-blast hold-out, the classical column the 2012 paper prints explains ${f(classical?.r2_identity)} of the variance about the identity line, with a squared correlation of ${f(classical?.pearson_r2)}; its root mean square error of ${f(classical?.rmse_m)} m improves on predicting a constant by ${gain === null ? 'n/a' : Math.round(gain * 100)} percent. It is the worst of the three models in that table. Its best-documented failure is under-predicting fines. Under this product’s protocols it scores about 0.30 in all of them: ${f(F?.random('kuznetsov')?.r2_identity)} at the median random split and ${f(F?.site('kuznetsov'))} with its site held out.`}{' '}
        <Cite id="kulatilake2012" />{' '}
        <Cite id="amoako2022" />
      </p>
      <CapParagraphs es={es} b={b} />
      <ClassicalFlowDiagram />
      <Callout variant="honest" title={es ? 'Una coincidencia que no es evidencia' : 'An agreement that is not evidence'}>
        {es
          ? 'Sobre el conjunto de validación publicado, el brazo clásico de este producto reproduce la columna clásica impresa casi exactamente, y eso es circular: los factores de roca se despejaron precisamente de esa columna. La evidencia de que la geometría y la forma de la ecuación son correctas es otra, que el factor recuperado casi no varíe dentro de cada sitio.'
          : 'On the published hold-out, this product’s classical arm reproduces the printed classical column almost exactly, and that is circular: the rock factors were back-solved from that very column. The evidence that the geometry and the form of the equation are right is something else, that the recovered factor barely varies within each site.'}
      </Callout>
      {refs('m-classical', es)}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

/** The published width, reproduced under the source's own procedure and held out by site. */
function WidthParagraph({ es, b }: { es: boolean; b: BenchmarkArtifact | null }) {
  const ws = b?.network_width_sweep;
  if (!ws) return null;
  const held = ws.leave_one_site_out
    .filter((row) => !row.published)
    .map((row) => row.supports.all.r2_identity)
    .filter((v): v is number => v !== null);
  if (!held.length) return null;
  const pub = ws.leave_one_site_out.find((row) => row.published)?.supports.all.r2_identity;
  const nullScore = (b?.protocols['leave-one-site-out'].arms.null as GroupedArmBlock | undefined)?.r2_identity;
  const p = ws.published_protocol;
  return (
    <p>
      {es
        ? `Ese ancho se eligió sobre las mismas filas con que luego se informó. Reproducido el procedimiento de la fuente sobre el conjunto de 2012, elige ${p['1'].best_hidden} unidades en el grupo de módulo alto y ${p['2'].best_hidden} en el bajo, no ${p['1'].published_optimum} y ${p['2'].published_optimum}; con el sitio excluido, todo ancho de ${ws.widths[0]} a ${ws.widths[ws.widths.length - 1]} puntúa entre ${f(Math.min(...held))} y ${f(Math.max(...held))}, y el par publicado ${f(pub)}, contra ${f(nullScore)} del nulo. El ancho no explica ni rescata la falla de la red al transferir.`
        : `That width was chosen on the rows it was then reported on. Reproduced on the 2012 set, the source's procedure picks ${p['1'].best_hidden} units for the high-modulus group and ${p['2'].best_hidden} for the low, not ${p['1'].published_optimum} and ${p['2'].published_optimum}; held out by site, every width from ${ws.widths[0]} to ${ws.widths[ws.widths.length - 1]} scores between ${f(Math.min(...held))} and ${f(Math.max(...held))}, and the published pair ${f(pub)}, against the null's ${f(nullScore)}. The width neither explains nor rescues the network's failure to transfer.`}{' '}
      <Cite id="kulatilake2012" />
    </p>
  );
}

/** The in-situ cap: a declared choice of the engine, where it binds, and what it moves. */
function CapParagraphs({ es, b }: { es: boolean; b: BenchmarkArtifact | null }) {
  const held = b?.protocols['leave-one-site-out'].arms;
  const capped = held?.['kuznetsov-capped'] as GroupedArmBlock | undefined;
  const classical = held?.kuznetsov as GroupedArmBlock | undefined;
  const moved =
    capped && classical
      ? Object.keys(capped.predictions).filter((k) => capped.predictions[k] !== classical.predictions[k]).sort()
      : [];
  return (
    <>
      <p>
        {es
          ? 'Una voladura rompe bloques y no los une, así que ningún fragmento puede ser mayor que el bloque in situ del que salió. Las fuentes describen la voladura justamente como la transformación de la distribución de bloques in situ en la de fragmentos, pero la ecuación clásica nunca lee el tamaño de bloque. Ninguna fuente disponible imprime un límite, así que el motor implementa uno como una elección declarada, no como una relación publicada:'
          : 'A blast breaks blocks and does not fuse them, so no fragment can be larger than the in-situ block it came from. The sources describe blasting as exactly that transformation, from the in-situ block size distribution to the blasted one, yet the classical equation never reads the block size. No source held for this work prints a cap, so the engine implements one as a declared choice, not a published relation:'}{' '}
        <Cite id="hudaverdi2010" />
      </p>
      <Equation
        tex={String.raw`x_{50,\mathrm{cap}} = \min\left(x_{50},\; X_B\right)`}
        caption={es ? 'El límite in situ, una elección declarada de blastfrag 0.4.0; X_B es el tamaño de bloque in situ.' : 'The in-situ cap, a declared choice of blastfrag 0.4.0; X_B is the in-situ block size.'}
      />
      <p>
        {es
          ? `En el corpus el límite actúa en ${moved.length} tiros (${moved.join(', ') || 'n/a'}), donde la predicción clásica supera el bloque; ningún tamaño medido en ninguna parte lo supera. Con el sitio excluido lleva el brazo clásico de ${f(classical?.r2_identity)} a ${f(capped?.r2_identity)}, con un intervalo que sigue cruzando el cero (${iv(capped?.supports.all.interval_95, 2, true)}). Ninguna curva medida valida la forma limitada; solo se puntúa su efecto en el tamaño medio.`
          : `On the corpus the cap binds on ${moved.length} blasts (${moved.join(', ') || 'n/a'}), where the classical prediction exceeds the block; no measured size anywhere exceeds it. Held out by site it moves the classical arm from ${f(classical?.r2_identity)} to ${f(capped?.r2_identity)}, with an interval that still spans zero (${iv(capped?.supports.all.interval_95)}). No measured curve validates the capped shape; only its effect on the mean size is scored.`}
      </p>
    </>
  );
}

function RockFactor({ es, b }: TabProps) {
  const sites = b ? Object.entries(b.site_meta).sort((x, y) => (y[1].E_GPa[0] ?? 0) - (x[1].E_GPa[0] ?? 0)) : [];
  return (
    <section>
      <h2>{es ? 'El factor de roca' : 'The rock factor'}</h2>
      <p>
        {es
          ? 'Un solo número adimensional, A, carga con todo lo que la ecuación clásica sabe de la roca. En su forma original era una tabla de tres valores (7 para roca media, 10 para roca dura muy fisurada, 13 para roca muy dura poco fisurada), y el artículo de 2010 dice que esas categorías son demasiado amplias. La vía de Cunningham es el índice de tronabilidad de Lilly, que el artículo de 2010 imprime así:'
          : 'One dimensionless number, A, carries everything the classical equation knows about the rock. In its original form it was a three-value table (7 for medium rock, 10 for hard, highly fissured rock, 13 for very hard, weakly fissured rock), and the 2010 paper says those categories are too wide. Cunningham’s route out is Lilly’s blastability index, which the 2010 paper prints as:'}{' '}
        <Cite id="hudaverdi2010" />
      </p>
      <Equation
        tex={String.raw`A = 0.06\,\mathrm{BI},\qquad \mathrm{BI} = 0.5\,(\mathrm{RMD} + \mathrm{JPS} + \mathrm{JPO} + \mathrm{RDI} + S)`}
        caption={es ? 'RMD descripción del macizo (10, 20, 50), JPS espaciamiento de juntas (10, 20, 50), JPO orientación (10 a 40), RDI = 25·densidad − 50, S = 0.05·UCS.' : 'RMD rock-mass description (10, 20, 50), JPS joint spacing (10, 20, 50), JPO orientation (10 to 40), RDI = 25·density − 50, S = 0.05·UCS.'}
      />
      <p>
        {es
          ? 'Babaeian y colegas publican en 2019 una segunda tabla atribuida a Lilly, y no es la misma: el término de resistencia es la resistencia a compresión dividida por 3 bajo 50 GPa de módulo, o por 5 sobre 50 GPa, en vez de 0.05 veces la resistencia. Con 100 MPa eso da 5 frente a 33.3 o 20, mueve el índice hasta 14 puntos y el factor de roca hasta 0.85, y el tamaño predicho es lineal en ese factor. La misma fuente tabula una tercera vía, la de Hustrulid, que pasa directamente del índice de Protodyakonov a un factor de 3 a 13. Las tres vías se ofrecen lado a lado, cada una con su fuente.'
          : 'Babaeian and colleagues published in 2019 a second table attributed to Lilly, and it is not the same table: the strength term is the compressive strength divided by 3 below 50 GPa of modulus, or by 5 above it, instead of 0.05 times the strength. At 100 MPa that is 5 against 33.3 or 20; it moves the index by up to 14 points and the rock factor by up to 0.85, and the predicted size is linear in the factor. The same source tabulates a third route, Hustrulid’s, which maps the Protodyakonov index straight onto a factor from 3 to 13. The three routes are offered side by side, each with its source.'}{' '}
        <Cite id="babaeian2019" />
      </p>
      <p>
        {es
          ? 'Ambos artículos dicen que el factor de roca se estimó para cada tiro, y ninguno imprime el valor. Invirtiendo la ecuación clásica sobre una predicción publicada, con la geometría recuperada, se obtiene:'
          : 'Both papers say the rock factor was estimated for each blast, and neither prints the value. Inverting the classical equation on a published prediction, with the recovered geometry, gives:'}
      </p>
      <Equation
        tex={String.raw`A = \frac{x_{50}^{\mathrm{pub}}}{(V/Q)^{0.8}\,Q^{1/6}\,(\mathrm{RWS}/115)^{-19/30}}`}
        caption={es ? 'Factor de roca recuperado de la predicción clásica publicada, con x50 en centímetros.' : 'Rock factor recovered from the published classical prediction, with x50 in centimetres.'}
      />
      <p>
        {es
          ? 'Los valores recuperados casi no se mueven dentro de un sitio: la mayor dispersión es 3.7 por ciento, lo que produce redondear las predicciones publicadas a dos decimales, y un error en la geometría los dispersaría. Ordenan la roca casi por rigidez, aunque no del todo: el esquisto plegado de 60 GPa de Enusa queda por debajo de los carbonatos de 45 GPa de Reocin. El brazo de transferencia ajusta una recta en logaritmos de esos factores contra el módulo de cada sitio, sin el sitio que se va a predecir; la tabla compara las dos vías.'
          : 'The recovered values barely move within a site: the widest spread is 3.7 percent, which is what rounding the published predictions to two decimals produces, and an error in the geometry would scatter them. They order the rock almost by stiffness, though not entirely: the folded 60 GPa schist at Enusa sits below the 45 GPa carbonates at Reocin. The transfer arm fits a line in logarithms of these factors against each site’s modulus, without the site to be predicted; the table compares the two routes.'}
      </p>
      {sites.length ? (
        <div className="fr-scroll-x">
          <table className="fr-table">
            <thead>
              <tr>
                <th>{es ? 'sitio' : 'site'}</th>
                <th>{es ? 'roca' : 'rock'}</th>
                <th>E, GPa</th>
                <th>{es ? 'A recuperado' : 'A recovered'}</th>
                <th>{es ? 'A de transferencia (todos los sitios)' : 'A transfer (all sites)'}</th>
              </tr>
            </thead>
            <tbody>
              {sites.map(([site, meta]) => (
                <tr key={site}>
                  <td>{site}</td>
                  <td className="fr-fine">{meta.rock ?? '-'}</td>
                  <td>{meta.E_GPa.join(', ')}</td>
                  <td>{meta.rock_factor_recovered === null ? (es ? 'sin geometría' : 'no geometry') : f(meta.rock_factor_recovered, 2)}</td>
                  <td>{f(meta.rock_factor_transfer, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <RockFactorDiagram />
      <Callout variant="honest" title={es ? 'Derivados, no publicados' : 'Derived, not published'}>
        {es
          ? 'Los factores recuperados son un resultado de este trabajo, no valores de la fuente, y el de transferencia es una calibración. Cada predicción clásica lleva en su detalle qué factor usó y de dónde salió. La recta de transferencia no ve la estructura del macizo; la tabla de Lilly sí, pero ningún tiro del corpus trae los datos de juntas que pide.'
          : 'The recovered factors are a result of this work, not values from the source, and the transfer factor is a calibration. Every classical prediction carries in its detail which factor it used and where it came from. The transfer line does not see the rock-mass structure; Lilly’s table does, but no blast in the corpus carries the joint data it asks for.'}
      </Callout>
      {refs('m-rock', es)}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

function Distributions({ es }: TabProps) {
  return (
    <section>
      <h2>{es ? 'De un tamaño medio a una curva' : 'From a mean size to a curve'}</h2>
      <p>
        {es
          ? 'Una chancadora se especifica contra el 80 por ciento pasante, un límite de sobretamaño y una fracción de finos, que son puntos de la curva lejos de la mediana. La forma de dos parámetros, Rosin-Rammler, escrita sobre el tamaño medio, da la fracción pasante y su uniformidad sale del índice de Cunningham:'
          : 'A crusher is specified against the 80 percent passing size, an oversize limit and a fines fraction, which are points on the curve away from the median. The two-parameter Rosin-Rammler form, written on the mean size, gives the fraction passing, and its uniformity comes from Cunningham’s index:'}{' '}
        <Cite id="amoako2022" />
      </p>
      <Equation
        tex={String.raw`P(x) = 1 - \exp\!\left[-0.693\left(\frac{x}{x_{50}}\right)^{n}\right]`}
        caption={es ? 'Amoako et al. 2022, Ec. 5. El 0.693 es ln 2, lo que hace de x50 el tamaño al 50 por ciento.' : 'Amoako et al. 2022, Eq. 5. The 0.693 is ln 2, which makes x50 the 50 percent size.'}
      />
      <Equation
        tex={String.raw`n = \left(2.2 - 14\frac{B}{d}\right)\sqrt{\frac{1 + S/B}{2}}\left(1 - \frac{W}{B}\right)\left(\left|\frac{\mathrm{BCL}-\mathrm{CCL}}{L}\right| + 0.1\right)^{0.1}\frac{L}{H}`}
        caption={es ? 'Cunningham 1987, Amoako et al. Ec. 7: B y S en m, d en mm, W desviación de perforación, L largo de carga; ×1.1 en malla trabada.' : 'Cunningham 1987, Amoako et al. Eq. 7: B and S in m, d in mm, W drilling deviation, L charge length; ×1.1 for a staggered pattern.'}
      />
      <p>
        {es
          ? 'Dos decisiones de este producto. La carga es una columna continua de ANFO, así que el término de distribución de carga vale 0.1 elevado a 0.1 en vez de inventarse un reparto entre carga de fondo y de columna; y la desviación de perforación es cero porque ninguna fuente la publica. La trampa está en B/d: la fuente da el bordo en metros y el diámetro en milímetros, así que vale cerca de 0.027, no la razón de 27 que tabula el corpus.'
          : 'Two decisions of this product. The charge is one continuous ANFO column, so the charge-distribution term is 0.1 to the power 0.1 rather than an invented split between bottom and column charge; and the drilling deviation is zero because no source publishes it. The trap is B/d: the source gives the burden in metres and the diameter in millimetres, so it is about 0.027, not the ratio of 27 the corpus tabulates.'}
      </p>
      <p>
        {es
          ? 'La forma de tres parámetros, Swebrec, agrega un límite superior explícito, que aquí es el mayor entre bordo y espaciamiento, y una ondulación b que forma la rama de finos. Amoako y colegas escriben que es más adaptable y predice mejor los finos; Babaeian y colegas reportan una mina de bauxita, 24 tiros medidos por imágenes, donde la de dos parámetros quedó más cerca de la medición.'
          : 'The three-parameter Swebrec form adds an explicit upper limit, here the larger of burden and spacing, and an undulation b that shapes the fines branch. Amoako and colleagues write that it is more adaptable and predicts fines better; Babaeian and colleagues report a bauxite mine, 24 blasts measured by image analysis, where the two-parameter form landed closer to the measurement.'}{' '}
        <Cite id="ouchterlony2005" />{' '}
        <Cite id="babaeian2019" />
      </p>
      <Equation
        tex={String.raw`P(x) = \frac{1}{1 + \left[\dfrac{\ln(x_{\max}/x)}{\ln(x_{\max}/x_{50})}\right]^{b}},\qquad 0 < x < x_{\max}`}
        caption={es ? 'Ouchterlony 2005, según Amoako et al. Ecs. 10 y 11; b = 2 por defecto, sin ajuste publicado para este corpus.' : 'Ouchterlony 2005, as printed in Amoako et al. Eqs. 10 and 11; b = 2 by default, with no published fit for this corpus.'}
      />
      <p>
        {es
          ? 'La tercera forma separa dos mecanismos: la fractura por tracción produce la fracción gruesa y la fractura por compresión y corte en la zona triturada alrededor del barreno produce los finos. La rama gruesa es la curva clásica; la fina tiene su propia uniformidad bajo un tamaño de cruce. La estructura tiene fuente; sus constantes no, porque los artículos de 1999 que las introducen son actas que no se tienen, así que el tamaño de cruce, la uniformidad y la fracción de finos los fija el usuario.'
          : 'The third form separates two mechanisms: tensile fracturing produces the coarse fraction and compressive-shear fracturing in the crushed zone around the hole produces the fines. The coarse branch is the classical curve; the fine branch has its own uniformity below a crossover size. The structure is sourced; its constants are not, because the 1999 papers that introduce them are proceedings that are not held, so the crossover size, the uniformity and the fines fraction are set by the user.'}
      </p>
      <DistributionShapesDiagram />
      <Callout variant="honest" title={es ? 'Formas sin validar' : 'Unvalidated shapes'}>
        {es
          ? 'Las tres formas comparten el tamaño medio de la ecuación clásica y solo difieren en la forma, así que para el tamaño medio son un predictor, no tres, y el benchmark lo cuenta una vez. Ningún conjunto disponible para este trabajo trae una curva pasante medida, de modo que ninguna forma se valida aquí; lo que validaría es un conjunto de tiros con el diseño y la curva medida por tamizado o por imágenes calibradas.'
          : 'The three forms share the classical equation’s mean size and differ only in shape, so for the mean size they are one predictor, not three, and the benchmark counts it once. No dataset available for this work carries a measured passing curve, so no shape is validated here; what would validate one is a set of blasts with both the design and a curve measured by sieving or calibrated image analysis.'}
      </Callout>
      {refs('m-distributions', es)}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

function Statistical({ es, b }: TabProps) {
  const r2010 = b?.published_reproduction['2010'] as ReproductionBlock | undefined;
  const r2012 = b?.published_reproduction['2012'] as ReproductionBlock | undefined;
  const F = b ? facts(b) : null;
  return (
    <section>
      <h2>{es ? 'El enrutador y las dos regresiones' : 'The router and the two regressions'}</h2>
      <p>
        {es
          ? 'Hudaverdi y colegas separan los 97 tiros por análisis de conglomerados en dos grupos: 35 de módulo alto, con media de 51.14 GPa, y 62 de módulo bajo, con media de 17.22 GPa. El análisis discriminante de la fuente identifica el módulo como el separador dominante (lambda de Wilks 0.161) y encuentra que la razón espaciamiento sobre bordo no influye en la pertenencia. La función discriminante resultante es:'
          : 'Hudaverdi and colleagues separate the 97 blasts by cluster analysis into two groups: 35 high-modulus blasts averaging 51.14 GPa and 62 low-modulus blasts averaging 17.22 GPa. The source’s discriminant analysis identifies the modulus as the dominant separator (Wilks’ lambda 0.161) and finds that the spacing-to-burden ratio has no effect on membership. The resulting discriminant function is:'}{' '}
        <Cite id="hudaverdi2010" />
      </p>
      <Equation
        tex={String.raw`L = 4.467\tfrac{S}{B} - 0.551\tfrac{H}{B} - 0.123\tfrac{B}{D} + 1.642\tfrac{T}{B} - 3.005\,P_f + 0.309\,X_B + 0.208\,E + 3.577`}
        caption={es ? 'Hudaverdi et al. 2010, Ec. 8. Grupo 1 cuando L supera 11.821, el punto medio entre los centroides.' : 'Hudaverdi et al. 2010, Eq. 8. Group 1 when L exceeds 11.821, the midpoint between the centroids.'}
      />
      <p>
        {es
          ? 'Reproduce la pertenencia publicada de los 109 tiros etiquetados sin un error, y los grupos no se traslapan: el mayor valor del grupo bajo es 10.318 y el menor del alto, 13.067. Es una compuerta real, así que enruta diseños que no están en el corpus. Cada grupo tiene su ley de potencia, con siete exponentes:'
          : 'It reproduces the published membership of all 109 labelled blasts with no error, and the groups do not overlap: the low group’s maximum is 10.318 and the high group’s minimum 13.067. It is a real gate, so it routes designs that are not in the corpus. Each group has its power law, with seven exponents:'}
      </p>
      <Equation
        tex={String.raw`x_{50}^{(1)} = 208\left(\tfrac{S}{B}\right)^{2.788}\left(\tfrac{H}{B}\right)^{0.112}\left(\tfrac{B}{D}\right)^{0.027}\left(\tfrac{T}{B}\right)^{-0.321}P_f^{-0.360}X_B^{0.233}E^{-1.802}`}
        caption={es ? 'Grupo 1, módulo alto, Ec. 9: R² 0.708 sobre 35 tiros, en metros.' : 'Group 1, high modulus, Eq. 9: R² 0.708 on 35 blasts, in metres.'}
      />
      <Equation
        tex={String.raw`x_{50}^{(2)} = 0.60\left(\tfrac{S}{B}\right)^{0.547}\left(\tfrac{H}{B}\right)^{0.535}\left(\tfrac{B}{D}\right)^{0.427}\left(\tfrac{T}{B}\right)^{-0.101}P_f^{-0.115}X_B^{0.434}E^{-1.202}`}
        caption={es ? 'Grupo 2, módulo bajo, Ec. 10: R² 0.739 sobre 62 tiros, en metros.' : 'Group 2, low modulus, Eq. 10: R² 0.739 on 62 blasts, in metres.'}
      />
      <p>
        {es
          ? 'Los dos coeficientes principales difieren por un factor de 347 y ambas ecuaciones devuelven metros. Parece un error de unidades y no lo es: los exponentes del módulo difieren en 0.6 sobre un rango de 9.57 a 60 GPa, y el término del módulo absorbe la diferencia. Se comprobó numéricamente antes de aceptar los coeficientes.'
          : 'The two leading coefficients differ by a factor of 347 and both equations return metres. It looks like a unit slip and is not: the modulus exponents differ by 0.6 over a range of 9.57 to 60 GPa, and the modulus term absorbs the gap. This was checked numerically before the coefficients were accepted.'}
      </p>
      <p>
        {es
          ? `Ambos artículos imprimen estas ecuaciones y además una tabla de predicciones hechas con ellas. Recalcular las ecuaciones y puntuar sobre las mismas filas da más que las tablas: ${f(r2010?.recomputed.r2_identity)} frente a ${f(r2010?.as_published.r2_identity)} sobre los ${r2010?.n_rows ?? 'n/a'} tiros de 2010, y ${f(r2012?.recomputed.r2_identity)} frente a ${f(r2012?.as_published.r2_identity)} sobre los ${r2012?.n_rows ?? 'n/a'} de 2012. Los dos artículos imprimen cifras distintas para cinco filas pese a usar las mismas ecuaciones; el recálculo coincide con la cifra de 2010 en cuatro de ellas y nunca con la de 2012, y la quinta, Ad24, no coincide con ninguna por unos 0.02 m.`
          : `Both papers print these equations and also a table of predictions made with them. Recomputing the equations and scoring on the same rows gives more than the tables: ${f(r2010?.recomputed.r2_identity)} against ${f(r2010?.as_published.r2_identity)} on the ${r2010?.n_rows ?? 'n/a'} blasts of 2010, and ${f(r2012?.recomputed.r2_identity)} against ${f(r2012?.as_published.r2_identity)} on the ${r2012?.n_rows ?? 'n/a'} of 2012. The two papers print different figures for five rows despite using the same equations; the recomputation matches the 2010 figure on four of them and never the 2012 one, and the fifth, Ad24, matches neither by about 0.02 m.`}{' '}
        <Cite id="kulatilake2012" />
      </p>
      <GroupRouterDiagram />
      <Callout variant="honest" title={es ? 'Dentro de la muestra' : 'In sample'}>
        {es
          ? `La fuente ajustó el enrutador y las dos regresiones sobre estos mismos 97 tiros, así que ningún protocolo que parta este corpus les oculta un tiro: su ${f(F?.site('published-regression'))} con el sitio excluido es su ajuste dentro de la muestra. La prueba de transferencia de esa forma funcional es la regresión reajustada sin cada sitio, que da ${f(F?.site('refitted-regression'))}, y su evidencia fuera de la muestra son los dos conjuntos de validación publicados, de los mismos sitios.`
          : `The source fitted the router and both regressions on these same 97 blasts, so no protocol that splits this corpus hides a blast from them: their ${f(F?.site('published-regression'))} with the site held out is their in-sample fit. The transfer test of that functional form is the regression refitted without each site, which scores ${f(F?.site('refitted-regression'))}, and its out-of-sample evidence is the two published hold-outs, from the same sites.`}
      </Callout>
      {refs('m-statistical', es)}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

function Network({ es, b }: TabProps) {
  const sweep = b?.network_seed_sweep;
  const F = b ? facts(b) : null;
  return (
    <section>
      <h2>{es ? 'La red neuronal publicada' : 'The published neural network'}</h2>
      <p>
        {es
          ? 'Kulatilake, Hudaverdi y Wu especifican su red por completo: siete entradas, una capa oculta de unidades logísticas, una salida lineal, entrenada por separado en cada grupo de rigidez, con entradas y objetivo normalizados por mínimo y máximo. Justifican la capa oculta única con el resultado de aproximación universal de Cybenko, y eligen el algoritmo de Levenberg-Marquardt tras comparar cuatro, por su estabilidad y por llegar al mínimo en menos ciclos.'
          : 'Kulatilake, Hudaverdi and Wu specify their network completely: seven inputs, one hidden layer of logistic units, a linear output, trained separately on each stiffness group, with inputs and target normalised by minimum and maximum. They justify the single hidden layer with Cybenko’s universal-approximation result, and choose Levenberg-Marquardt after comparing four algorithms, for its stability and for reaching the minimum in fewer cycles.'}{' '}
        <Cite id="kulatilake2012" />{' '}
        <Cite id="cybenko1989" />
      </p>
      <Equation
        tex={String.raw`\hat y = \sum_{j=1}^{N} w^{(2)}_j\,\sigma\!\left(\sum_{i=1}^{7} w^{(1)}_{ij} z_i + b^{(1)}_j\right) + b^{(2)},\qquad z_i = \frac{x_i - x_i^{\min}}{x_i^{\max} - x_i^{\min}}`}
        caption={es ? 'Paso hacia adelante 7-N-1 con normalización mín-máx (Ec. 11 de la fuente); σ es la función logística.' : 'The 7-N-1 forward pass with min-max normalisation (the source’s Eq. 11); σ is the logistic function.'}
      />
      <Equation
        tex={String.raw`\left(J^{\top}J + \lambda I\right)\delta = -J^{\top} r`}
        caption={es ? 'Paso de Levenberg-Marquardt: J jacobiano de los residuos r respecto de los pesos; λ sube si el paso empeora y baja si mejora.' : 'The Levenberg-Marquardt step: J the Jacobian of the residuals r with respect to the weights; λ rises when a step worsens the loss and falls when it improves it.'}
      />
      <p>
        {es
          ? 'El ancho N se barrió de 6 a 15, el rango que permiten dos heurísticas publicadas, con ocho simulaciones por ancho; los óptimos publicados son 9 unidades en el grupo de módulo alto y 7 en el bajo, y son los que usa este producto. La arquitectura es generosa respecto de los datos: 7 unidades sobre 62 tiros son 64 parámetros libres, y 9 sobre 35 son 82. La salida de cada red se acota al rango de los objetivos de entrenamiento antes de desnormalizar, y las ocho se promedian.'
          : 'The width N was swept from 6 to 15, the range two published heuristics allow, with eight simulations at each width; the published optima are 9 units for the high-modulus group and 7 for the low one, and those are the widths this product uses. The architecture is generous relative to the data: 7 units on 62 blasts is 64 free parameters, and 9 on 35 is 82. Each network’s output is clamped to the range of the training targets before denormalising, and the eight are averaged.'}{' '}
        <Cite id="marquardt1963" />
      </p>
      <WidthParagraph es={es} b={b} />
      <p>
        {es
          ? `Reproducida con su especificación sobre ${sweep?.n_seeds ?? 'n/a'} semillas, la varianza explicada en el conjunto de validación publicado va de ${f(sweep?.min)} a ${f(sweep?.max)}, con mediana ${f(sweep?.median)}. El ${f(sweep?.published)} publicado queda por encima de todas. El déficit se concentra en dos filas, las que la propia fuente reporta como sus más inestables, con coeficientes de variación de 0.56 y 0.76 entre sus ocho simulaciones.`
          : `Reproduced to its specification over ${sweep?.n_seeds ?? 'n/a'} seeds, its variance explained on the published hold-out runs from ${f(sweep?.min)} to ${f(sweep?.max)}, with a median of ${f(sweep?.median)}. The published ${f(sweep?.published)} lies above every one. The shortfall concentrates in two rows, the two the source itself reports as its most unstable, with coefficients of variation of 0.56 and 0.76 across its eight simulations.`}
      </p>
      <p>
        {es
          ? `El acotamiento tiene una consecuencia al excluir un sitio: una red entrenada sin una campaña gruesa no puede predecir un tamaño mayor que el del tiro de entrenamiento más grueso. Las dos campañas de Reocin, las más gruesas del corpus, son donde eso pesa. Con cada sitio excluido, la red publicada explica ${f(F?.site('published-neural-net'))} de la varianza.`
          : `The clamp has a consequence when a site is held out: a network trained without a coarse campaign cannot predict a size above the coarsest training blast. The two Reocin campaigns, the coarsest in the corpus, are where that bites. With each site held out, the published network explains ${f(F?.site('published-neural-net'))} of the variance.`}
      </p>
      <NetworkDiagram />
      <Callout variant="honest" title={es ? 'Qué se afirma, y qué no' : 'What is claimed, and what is not'}>
        {es
          ? 'No se afirma que el resultado publicado sea falso: detalles no registrados, una inicialización o una tirada distinta de simulaciones podrían explicarlo. Lo que el barrido establece es que el puntaje publicado no es robusto a la semilla, en un método cuyo propio artículo lo muestra inestable entre anchos vecinos: en el grupo de módulo bajo, la correlación de su Tabla 7 pasa de 0.11 con seis unidades ocultas a 0.81 con siete y a 0.49 con ocho.'
          : 'It is not claimed that the published result is wrong: unrecorded details, an initialisation scheme or a different simulation draw could account for it. What the sweep establishes is that the published score is not robust to the seed, on a method its own paper shows to be unstable between adjacent widths: in the low-modulus group, the correlation in its Table 7 goes from 0.11 with six hidden units to 0.81 with seven and 0.49 with eight.'}
      </Callout>
      {refs('m-network', es)}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

function Ensembles({ es, b, corpus }: TabProps & { corpus: ModelsFile | null }) {
  const stack = corpus?.arms.stacking;
  const weights = stack && stack.kind === 'stacking' ? stack.meta.coef : null;
  const F = b ? facts(b) : null;
  const pub = b?.verdict.published_random_split_figures.stacking;
  return (
    <section>
      <h2>{es ? 'Núcleos, bosques, potenciación y el ensamble' : 'Kernels, forests, boosting and the ensemble'}</h2>
      <p>
        {es
          ? 'Dos fuentes ajustan regresión por vectores de soporte sobre este mismo corpus y llegan a conclusiones opuestas sobre el núcleo. Amoako y colegas buscan en 2700 combinaciones de cuatro núcleos y eligen uno radial con C 5.25 y épsilon 0.04; Sui y colegas usan uno polinomial de grado 5 con C 1 y lo reportan como el peor de sus tres aprendices. Ambos se reproducen. La regresión es una expansión en vectores de soporte, con las entradas estandarizadas:'
          : 'Two sources fit support-vector regression to this same corpus and reach opposite conclusions about the kernel. Amoako and colleagues search 2700 combinations of four kernels and choose a radial one with C 5.25 and epsilon 0.04; Sui and colleagues use a degree-5 polynomial with C 1 and report it as the worst of their three learners. Both are reproduced. The regression is an expansion over support vectors, with the inputs standardised:'}{' '}
        <Cite id="amoako2022" />{' '}
        <Cite id="sui2025" />{' '}
        <Cite id="smola2004" />
      </p>
      <Equation
        tex={String.raw`\hat y(\mathbf z) = \sum_{i} \alpha_i\,K(\mathbf s_i, \mathbf z) + c,\qquad K_{\mathrm{rbf}} = e^{-\gamma\lVert \mathbf s_i - \mathbf z\rVert^2},\quad K_{\mathrm{poly}} = (\gamma\,\mathbf s_i\!\cdot\!\mathbf z + c_0)^{5}`}
        caption={es ? 'Regresión por vectores de soporte con pérdida insensible a épsilon; s vectores de soporte, α coeficientes duales.' : 'Epsilon-insensitive support-vector regression; s the support vectors, α the dual coefficients.'}
      />
      <p>
        {es
          ? 'El bosque aleatorio promedia árboles crecidos sobre muestras bootstrap con subconjuntos aleatorios de variables; la potenciación por gradiente suma árboles pequeños, cada uno ajustado al residuo de los anteriores, escalados por una tasa de aprendizaje. Los parámetros finales publicados son 76 árboles con semilla 27 para el bosque, y tasa 0.5 con semilla 42 para la potenciación, que la fuente misma reporta como sobreajustada.'
          : 'The random forest averages trees grown on bootstrap samples with random subsets of the inputs; gradient boosting adds small trees, each fitted to the residual of the ones before, scaled by a learning rate. The published final parameters are 76 trees at seed 27 for the forest and a rate of 0.5 at seed 42 for the boosting, which the source itself reports as overfitting.'}{' '}
        <Cite id="breiman2001" />{' '}
        <Cite id="chen2016" />
      </p>
      <Equation
        tex={String.raw`\hat y_{\mathrm{RF}} = \frac{1}{M}\sum_{m=1}^{M} T_m(\mathbf z),\qquad \hat y_{\mathrm{XGB}} = b_0 + \sum_{k=1}^{K} \eta\, f_k(\mathbf z)`}
        caption={es ? 'Bosque: promedio de M = 76 árboles. Potenciación: valor base más K árboles escalados por η = 0.5.' : 'Forest: average of M = 76 trees. Boosting: a base value plus K trees scaled by η = 0.5.'}
      />
      <p>
        {es
          ? `El ensamble apilado combina el bosque y la potenciación con una regresión lineal. Sui y colegas escriben, al describir su construcción, que intentaron validación cruzada y la cancelaron porque el modelo resultante predecía peor en prueba. En un ensamble apilado, la validación cruzada que se puede cancelar es la que genera las entradas del combinador fuera de muestra, el paso que define el apilamiento según Wolpert; así que este producto ajusta el combinador sobre las predicciones en muestra de los dos aprendices. Ajustado así sobre todo el corpus, sus pesos son ${weights ? f(weights[1], 2) : 'n/a'} para la potenciación y ${weights ? f(weights[0], 2) : 'n/a'} para el bosque.`
          : `The stacked ensemble combines the forest and the boosting model with a linear regression. Sui and colleagues write, while describing its construction, that they tried cross-validation and cancelled it because the resulting model predicted worse on the test set. In a stacked ensemble, the cross-validation that can be cancelled is the one that produces the combiner’s inputs out of sample, the step that defines stacking in Wolpert’s formulation; so this product fits the combiner on the two learners’ in-sample predictions. Fitted that way on the whole corpus, its weights are ${weights ? f(weights[1], 2) : 'n/a'} on the boosting model and ${weights ? f(weights[0], 2) : 'n/a'} on the forest.`}{' '}
        <Cite id="wolpert1992" />
      </p>
      <Equation
        tex={String.raw`\hat y_{\mathrm{stack}} = w_B\,\hat y_{\mathrm{XGB}} + w_F\,\hat y_{\mathrm{RF}} + c,\qquad (w_B, w_F, c) = \arg\min \sum_{i\in\mathrm{train}}\left(y_i - w_B\,\hat y_{\mathrm{XGB}}(\mathbf z_i) - w_F\,\hat y_{\mathrm{RF}}(\mathbf z_i) - c\right)^2`}
        caption={es ? 'El combinador lineal ajustado sobre predicciones en muestra, como lo construye la fuente.' : 'The linear combiner fitted on in-sample predictions, as the source builds it.'}
      />
      <p>
        {es
          ? `Como la potenciación reproduce casi exactamente sus filas de entrenamiento, el combinador le da casi todo el peso, y el ensamble se comporta como su aprendiz de potenciación bajo todo protocolo: ${f(F?.random('stacking')?.r2_identity)} y ${f(F?.random('xgboost')?.r2_identity)} en la partición aleatoria mediana, ${f(F?.site('stacking'))} y ${f(F?.site('xgboost'))} con el sitio excluido. El 0.943 publicado para el ensamble queda por encima de ${pub ? Math.round(pub.share_of_draws_below * 100) : 'n/a'} de cada 100 reproducciones de su protocolo.`
          : `Because the boosting model reproduces its training rows almost exactly, the combiner gives it almost all the weight, and the ensemble behaves like its boosting learner under every protocol: ${f(F?.random('stacking')?.r2_identity)} and ${f(F?.random('xgboost')?.r2_identity)} at the median random split, ${f(F?.site('stacking'))} and ${f(F?.site('xgboost'))} with the site held out. The 0.943 published for the ensemble lies above ${pub ? Math.round(pub.share_of_draws_below * 100) : 'n/a'} of 100 reproductions of its protocol.`}
      </p>
      <EnsembleDiagram boostingWeight={weights?.[1]} forestWeight={weights?.[0]} />
      <Callout variant="honest" title={es ? 'Dos juegos de parámetros, y una lectura' : 'Two parameter sets, and one reading'}>
        {es
          ? 'La fuente imprime dos juegos de parámetros para sus aprendices: uno al afinarlos solos (bosque con semilla 1 y 50 árboles, potenciación con tasa 1.9) y el final al construir el ensamble. No dice sin ambigüedad cuál produjo sus cifras individuales de 0.797 y 0.758, así que los brazos individuales de este producto usan el final y no se presentan como reproducciones de esas dos cifras. Que la validación cruzada cancelada sea la del combinador es una lectura de este producto; la fuente no detalla el mecanismo.'
          : 'The source prints two parameter sets for its learners: one when tuning them alone (forest at seed 1 with 50 trees, boosting at a rate of 1.9) and the final one when building the ensemble. It does not say unambiguously which produced its standalone figures of 0.797 and 0.758, so this product’s standalone arms use the final set and are not presented as reproductions of those two figures. That the cancelled cross-validation is the combiner’s is this product’s reading; the source does not spell out the mechanism.'}
      </Callout>
      {refs('m-ensembles', es)}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

function Protocols({ es, b }: TabProps) {
  const F = b ? facts(b) : null;
  const v = b?.verdict;
  const classical = b?.published_reproduction.published_holdout_arms.classical;
  return (
    <section>
      <h2>{es ? 'Protocolos y métricas' : 'Protocols and metrics'}</h2>
      <p>
        {es
          ? `Toda predicción de este sitio se mide con la varianza explicada respecto de la línea de identidad, que penaliza el sesgo y la escala, y se acompaña de la correlación, que no los penaliza. Sobre los doce tiros de validación publicados, la columna clásica tiene una correlación al cuadrado de ${f(classical?.pearson_r2)} y una varianza explicada de ${f(classical?.r2_identity)}: la primera es la que reporta la literatura, la segunda la que un lector entiende por la palabra.`
          : `Every prediction on this site is measured by variance explained about the identity line, which penalises bias and scale, and is shown with the correlation, which does not. On the twelve published hold-out blasts, the classical column has a squared correlation of ${f(classical?.pearson_r2)} and a variance explained of ${f(classical?.r2_identity)}: the first is what the literature reports, the second what a reader takes the word to mean.`}
      </p>
      <Equation
        tex={String.raw`R^2_{\mathrm{id}} = 1 - \frac{\sum_i (y_i - \hat y_i)^2}{\sum_i (y_i - \bar y)^2},\qquad r = \frac{\sum_i (y_i - \bar y)(\hat y_i - \bar{\hat y})}{\sqrt{\sum_i (y_i - \bar y)^2\sum_i (\hat y_i - \bar{\hat y})^2}}`}
        caption={es ? 'Varianza explicada y correlación de Pearson sobre las filas puntuadas; las abstenciones se cuentan y no se puntúan.' : 'Variance explained and Pearson correlation over the scored rows; abstentions are counted and not scored.'}
      />
      <p>
        {es
          ? `Tres protocolos parten las mismas filas. El aleatorio reproduce el publicado y el deduplicado colapsa antes los vectores repetidos; ambos se sortean ${b?.n_repeats ?? 'n/a'} veces y se informan por su mediana y sus percentiles 5 y 95. El tercero retiene una campaña completa por vez y puntúa juntas las predicciones fuera de pliegue de las diez campañas, de modo que cada tiro cuenta una vez. Retener grupos enteros es la forma de validar con datos agrupados que recomiendan Roberts y colegas.`
          : `Three protocols split the same rows. The random one reproduces the published protocol and the deduplicated one first collapses the repeated vectors; both are drawn ${b?.n_repeats ?? 'n/a'} times and reported by their median and their 5th and 95th percentiles. The third holds out one whole campaign at a time and scores the out-of-fold predictions of all ten campaigns together, so that every blast counts once. Holding out whole groups is how Roberts and colleagues recommend validating on grouped data.`}{' '}
        <Cite id="roberts2017" />{' '}
        <Cite id="kapoor2023" />
      </p>
      <Equation
        tex={String.raw`R^2_{\mathrm{LOSO}} = 1 - \frac{\sum_{i} \left(y_i - \hat y_i^{(-s(i))}\right)^2}{\sum_i (y_i - \bar y)^2}`}
        caption={es ? 'Puntaje agrupado: ŷ con el superíndice −s(i) es la predicción de un modelo ajustado sin el sitio s(i) del tiro i.' : 'The pooled score: ŷ with superscript −s(i) is the prediction of a model fitted without the site s(i) of blast i.'}
      />
      <p>
        {es
          ? `El intervalo remuestrea sitios, no filas: se sortean diez sitios con reposición ${b?.n_boot ?? 'n/a'} veces, se recalcula el puntaje agrupado y se toman los percentiles 2.5 y 97.5. Remuestrear filas trataría los 22 tiros de una cantera como 22 observaciones independientes. Cada puntaje agrupado se informa además sobre dos conjuntos de filas: todos los tiros, y los ${v?.supports.geometry.n_blasts ?? 'n/a'} con geometría resoluble, que son los únicos donde responden los brazos clásicos.`
          : `The interval resamples sites, not rows: ten sites are drawn with replacement ${b?.n_boot ?? 'n/a'} times, the pooled score is recomputed, and the 2.5th and 97.5th percentiles are taken. Resampling rows would treat the 22 blasts of one quarry as 22 independent observations. Every pooled score is also reported on two row sets: every blast, and the ${v?.supports.geometry.n_blasts ?? 'n/a'} with resolvable geometry, the only rows the classical arms can answer.`}{' '}
        <Cite id="efron1979" />{' '}
        <Cite id="field2007" />
      </p>
      <Equation
        tex={String.raw`\left[\,q_{0.025},\ q_{0.975}\,\right]\ \text{of}\ \left\{R^2_{\mathrm{LOSO}}\big(\mathcal S^{*}_k\big)\right\}_{k=1}^{2000},\qquad \mathcal S^{*}_k \sim \text{10 sites drawn with replacement}`}
        caption={es ? 'Intervalo por remuestreo de sitios (bootstrap por conglomerados).' : 'Site-resampled interval (a cluster bootstrap).'}
      />
      <p>
        {es
          ? `El criterio de descarte, con la redacción fija desde que la primera corrida le agregó la mitad de positividad (la historia está en Benchmark): «${b?.kill_criterion ?? ''}». Sobre todos los tiros, el mejor brazo aprendido explica ${f(v?.supports.all.best_learned_r2_identity)} y el criterio no se cumple; sobre los ${v?.supports.geometry.n_blasts ?? 'n/a'} con geometría, explica ${f(v?.supports.geometry.best_learned_r2_identity)} y se cumple. El nulo agrupado se correlaciona con las mediciones en ${f(v?.supports.all.null_pearson_r, 2)}: excluir un sitio grueso baja la media de entrenamiento, así que el nulo predice bajo justo donde la medición es alta, y el margen sobre él exagera la destreza.`
          : `The kill criterion, in the wording fixed since the first run added its positivity half (the history is on Benchmark): “${b?.kill_criterion ?? ''}” Over every blast the best learned arm explains ${f(v?.supports.all.best_learned_r2_identity)} and the criterion is not met; over the ${v?.supports.geometry.n_blasts ?? 'n/a'} with geometry it explains ${f(v?.supports.geometry.best_learned_r2_identity)} and it is. The pooled null correlates with the measurements at ${f(v?.supports.all.null_pearson_r, 2)}: holding out a coarse site lowers the training mean, so the null predicts low exactly where the measurement is high, and the margin over it overstates skill.`}
      </p>
      <ProtocolDiagram
        scores={{
          random: F?.random('stacking')?.r2_identity,
          dedup: F?.dedup('stacking')?.r2_identity,
          site: F?.site('stacking'),
          arm: es ? 'el ensamble apilado' : 'the stacked ensemble',
        }}
      />
      <Callout variant="honest" title={es ? 'Lo que diez sitios pueden separar' : 'What ten sites can separate'}>
        {es
          ? `Fuera de los brazos ajustados por su fuente sobre este corpus, ningún intervalo queda por encima de cero: el clásico va de ${iv(F?.interval('kuznetsov'), 2, true)} y el mejor aprendido de ${iv(F?.interval(v?.supports.all.best_learned_arm ?? 'xgboost'), 2, true)}. Una diferencia entre dos brazos que no supera esos intervalos es una lectura de estimaciones puntuales, y este producto no la imprime como hallazgo.`
          : `Outside the arms their source fitted on this corpus, no interval sits above zero: the classical arm runs ${iv(F?.interval('kuznetsov'))} and the best learned arm ${iv(F?.interval(v?.supports.all.best_learned_arm ?? 'xgboost'))}. A difference between two arms that does not clear those intervals is a reading of point estimates, and this product does not print it as a finding.`}
      </Callout>
      {refs('m-protocols', es)}
    </section>
  );
}
