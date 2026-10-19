/**
 * Topic 2, classical: the rock factor A, the three published schemes, the factor back-solved from the published
 * predictions and the line that predicts it from the modulus. The per-site table and the transfer line are read from the
 * committed benchmark and the corpus-scope models file.
 */

import { Callout, Cite, DocSection, Equation, useShellLang } from '@fasl-work/caos-app-shell';

import { SECTION_REFS } from '../../data/citations';
import { f } from '../../lib/facts';
import { notAvailable, value } from '../../lib/format';
import { RockFactorDiagram } from '../../viz/Diagrams';
import { exportedArm, type TopicData } from './shared';

export default function RockFactor({ b, corpus }: TopicData) {
  const es = useShellLang() === 'es';
  const sites = b ? Object.entries(b.site_meta).sort((x, y) => (y[1].E_GPa[0] ?? 0) - (x[1].E_GPa[0] ?? 0)) : [];
  const line = exportedArm(corpus, 'kuznetsov-transfer', 'kuznetsov-transfer')?.rock_factor;
  const counts = b ? Object.values(b.site_counts) : [];
  const moduli = b ? Object.values(b.site_meta).flatMap((meta) => meta.E_GPa) : [];
  const largest = counts.length ? Math.max(...counts) : null;
  const smallest = counts.length ? Math.min(...counts) : null;
  const lowest = moduli.length ? Math.min(...moduli) : null;
  const sign = (v: number) => (v < 0 ? '−' : '+');
  return (
    <DocSection
      area="method"
      kind="classical"
      title={{ en: 'The rock factor', es: 'El factor de roca' }}
      refs={SECTION_REFS['m-rock-factor']}
    >
      <p>
        {es
          ? 'Un solo número adimensional, A, carga con todo lo que la ecuación clásica sabe de la roca. En su forma original era una tabla de tres valores (7 para roca media, 10 para roca dura muy fisurada, 13 para roca muy dura poco fisurada), y el artículo de 2010 dice que esas categorías son demasiado amplias. La vía de Cunningham es el índice de tronabilidad de Lilly, que el artículo de 2010 imprime así:'
          : 'One dimensionless number, A, carries everything the classical equation knows about the rock. In its original form it was a three-value table (7 for medium rock, 10 for hard, highly fissured rock, 13 for very hard, weakly fissured rock), and the 2010 paper says those categories are too wide. Cunningham’s route out is Lilly’s blastability index, which the 2010 paper prints as:'}{' '}
        <Cite id="hudaverdi2010" />
      </p>
      <Equation
        tex={String.raw`A = 0.06\,\mathrm{BI},\qquad \mathrm{BI} = 0.5\,(\mathrm{RMD} + \mathrm{JPS} + \mathrm{JPO} + \mathrm{RDI} + S)`}
        caption={es ? 'RMD descripción del macizo (10, 20, 50), JPS espaciamiento de juntas (10, 20, 50), JPO orientación (10 a 40), RDI = 25·densidad − 50, S = 0,05·UCS.' : 'RMD rock-mass description (10, 20, 50), JPS joint spacing (10, 20, 50), JPO orientation (10 to 40), RDI = 25·density − 50, S = 0.05·UCS.'}
      />
      <p>
        {es
          ? 'Babaeian y colegas publican en 2019 una segunda tabla atribuida a Lilly, y no es la misma: el término de resistencia es la resistencia a compresión dividida por 3 bajo 50 GPa de módulo, o por 5 sobre 50 GPa, en vez de 0,05 veces la resistencia. Con 100 MPa eso da 5 frente a 33,3 o 20, mueve el índice hasta 14 puntos y el factor de roca hasta 0,85, y el tamaño predicho es lineal en ese factor. La misma fuente tabula una tercera vía, la de Hustrulid, que pasa directamente del índice de Protodyakonov a un factor de 3 a 13. Las tres vías se ofrecen lado a lado, cada una con su fuente, y un esquema que necesita una resistencia a compresión y no la recibe lo dice en vez de suponer un valor, porque una resistencia supuesta produce un factor de roca, y un tamaño, sin evidencia detrás.'
          : 'Babaeian and colleagues published in 2019 a second table attributed to Lilly, and it is not the same table: the strength term is the compressive strength divided by 3 below 50 GPa of modulus, or by 5 above it, instead of 0.05 times the strength. At 100 MPa that is 5 against 33.3 or 20; it moves the index by up to 14 points and the rock factor by up to 0.85, and the predicted size is linear in the factor. The same source tabulates a third route, Hustrulid’s, which maps the Protodyakonov index straight onto a factor from 3 to 13. The three routes are offered side by side, each with its source, and a scheme that needs a compressive strength and is not given one raises an error instead of assuming a value, because an assumed strength produces a rock factor, and so a fragment size, with no evidence behind it.'}{' '}
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
          ? 'Los valores recuperados casi no se mueven dentro de un sitio: la mayor dispersión es 3,7 por ciento, lo que produce redondear las predicciones publicadas a dos decimales, y un error en la geometría los dispersaría. Ordenan la roca casi por rigidez, aunque no del todo: el esquisto plegado de 60 GPa de Enusa queda por debajo de los carbonatos de 45 GPa de Reocin. Los dos artículos imprimen predicciones clásicas distintas para los mismos tiros, así que implican factores distintos; la recuperación usa la columna de 2012, la tabla que trae los tres modelos publicados, y lo declara.'
          : 'The recovered values barely move within a site: the widest spread is 3.7 percent, which is what rounding the published predictions to two decimals produces, and an error in the geometry would scatter them. They order the rock almost by stiffness, though not entirely: the folded 60 GPa schist at Enusa sits below the 45 GPa carbonates at Reocin. The two papers print different classical predictions for the same blasts, so they imply different factors; the recovery uses the 2012 column, the table that carries all three published models, and says so.'}{' '}
        <Cite id="kulatilake2012" />
      </p>
      <p>
        {es
          ? `La vía de transferencia quita lo que el factor recuperado toma prestado del sitio. En cada partición toma un punto por sitio de entrenamiento, de modo que la campaña mayor (${largest === null ? notAvailable() : f(largest, 0)} tiros) pesa lo mismo que la menor (${smallest === null ? notAvailable() : f(smallest, 0)}), y ajusta la recta por mínimos cuadrados ordinarios. El módulo es la única propiedad de la roca registrada en todos los tiros, la que Hudaverdi y colegas eligieron para representar el comportamiento mecánico y la que los dos estudios de 2025 ponen primera. Ajustada sobre los ${line ? f(line.fit_sites.length, 0) : notAvailable()} sitios con factor recuperado, la recta es ln A = ${line ? `${f(line.intercept)} ${sign(line.slope)} ${f(Math.abs(line.slope))}` : notAvailable()} ln E, y cada caso la reajusta sin su propia campaña. Es una calibración de este producto que no ve la estructura del macizo, y bajo el rango de módulo de los sitios de entrenamiento extrapola: los cinco tiros de campo a 5,6 GPa, bajo el mínimo de ${lowest === null ? notAvailable() : value(lowest)} GPa del corpus, llevan el sello de extrapolación.`
          : `The transfer route removes what the recovered factor borrows from the site. For each split it takes one point per training site, so the largest campaign (${largest === null ? notAvailable() : f(largest, 0)} blasts) weighs the same as the smallest (${smallest === null ? notAvailable() : f(smallest, 0)}), and fits the line by ordinary least squares. The modulus is the one rock property recorded for every blast, the one Hudaverdi and colleagues chose to represent mechanical behaviour, and the one both 2025 studies rank first. Fitted on the ${line ? f(line.fit_sites.length, 0) : notAvailable()} sites with a recovered factor, the line reads ln A = ${line ? `${f(line.intercept)} ${sign(line.slope)} ${f(Math.abs(line.slope))}` : notAvailable()} ln E, and each case refits it without its own campaign. It is a calibration of this product that sees no rock-mass structure, and below the training sites’ modulus range it extrapolates: the five field blasts at 5.6 GPa, under the corpus minimum of ${lowest === null ? notAvailable() : value(lowest)} GPa, carry the extrapolation stamp.`}{' '}
        <Cite id="sui2025" />{' '}
        <Cite id="huan2025" />
      </p>
      <Equation
        tex={String.raw`\hat A(E) = \exp\left(a + b \ln E\right),\qquad (a, b) = \arg\min \sum_{s\in\mathrm{train}}\left(\ln A_s - a - b \ln \bar E_s\right)^2`}
        caption={es ? 'La recta de transferencia: A_s factor recuperado del sitio s, Ē_s su módulo medio; cada sitio de entrenamiento pesa lo mismo, sea cual sea su número de tiros.' : 'The transfer line: A_s the recovered factor of site s, Ē_s its mean modulus; each training site weighs the same, whatever its number of blasts.'}
      />
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
                  <td className="fr-fine" lang="en" translate="no">{meta.rock ?? '-'}</td>
                  <td>{meta.E_GPa.map((e) => value(e)).join('; ')}</td>
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
    </DocSection>
  );
}
