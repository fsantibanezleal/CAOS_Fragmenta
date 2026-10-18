/**
 * Topic 1, classical: the Kuznetsov mean size as the Kuz-Ram family prints it, the two ways to the rock factor it needs,
 * Cunningham's uniformity index, and where the classical arm fails. Every score is read from the committed benchmark.
 */

import { Callout, Cite, DocSection, Equation, useShellLang } from '@fasl-work/caos-app-shell';
import { Link } from 'react-router';

import { SECTION_REFS } from '../../data/citations';
import { f, facts } from '../../lib/facts';
import { notAvailable } from '../../lib/format';
import { ClassicalFlowDiagram } from '../../viz/Diagrams';
import { geometrySupport, type TopicData } from './shared';

export default function MeanSize({ b }: TopicData) {
  const es = useShellLang() === 'es';
  const holdout = b?.published_reproduction.published_holdout_arms;
  const classical = holdout?.classical;
  const nul = holdout?.null;
  const gain = classical?.rmse_m && nul?.rmse_m ? 1 - classical.rmse_m / nul.rmse_m : null;
  const F = b ? facts(b) : null;
  const geo = geometrySupport(b);
  return (
    <DocSection
      area="method"
      kind="classical"
      title={{ en: 'The Kuznetsov and Kuz-Ram mean size', es: 'El tamaño medio de Kuznetsov y Kuz-Ram' }}
      refs={SECTION_REFS['m-mean-size']}
    >
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
          ? 'Como V/Q es el recíproco del factor de carga K, Amoako, Jha y Zhong escriben la misma ecuación en K. Las dos formas coinciden en ese término y difieren en el exponente de potencia: −19/30 sobre RWS/115 en una y 19/20 sobre 115/RWS en la otra, lo que separa los resultados en cerca de 8 por ciento con RWS 140. El corpus no tiene ese problema en la práctica, porque todos sus tiros usaron ANFO (RWS 100), y despejar el factor de roca desde las predicciones publicadas lo zanja de todos modos: con la forma −19/30 el factor recuperado queda casi constante dentro de cada sitio, y con la otra no. La forma −19/30 es la que usa el motor por defecto, y la otra la ofrece como variante con nombre.'
          : 'Because V/Q is the reciprocal of the powder factor K, Amoako, Jha and Zhong write the same equation in K. The two forms agree on that term and differ on the strength exponent, −19/30 on RWS/115 in one and 19/20 on 115/RWS in the other, which separates the results by about 8 percent at an RWS of 140. On this corpus it does not matter in practice, because every blast used ANFO (RWS 100), and back-solving the rock factor from the published predictions settles it anyway: with the −19/30 form the recovered factor is near constant within each site, and with the other it is not. The −19/30 form is the engine’s default and the other is offered as a named variant.'}{' '}
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
          ? ` muestra cómo. ${geo ? `Para ${geo.outside.join(', ')} la fuente no publica ninguna dimensión absoluta, así que sus ${f(geo.all - geo.geometry, 0)} tiros (${f(geo.all, 0)} del corpus menos ${f(geo.geometry, 0)} con geometría) no se reconstruyen y los dos brazos clásicos se abstienen allí, cada uno con su razón en el artefacto. ` : ''}El factor de roca se toma de una de dos vías: el valor recuperado para el sitio, que usa información de ese mismo sitio, o el predicho desde el módulo con una recta ajustada solo sobre los demás sitios, que es la forma que se usa para hablar de transferencia:`
          : ` shows how. ${geo ? `For ${geo.outside.join(', ')} the source publishes no absolute dimension, so its ${f(geo.all - geo.geometry, 0)} blasts (${f(geo.all, 0)} in the corpus less ${f(geo.geometry, 0)} with geometry) are not reconstructed and both classical arms abstain there, each with its reason in the artifact. ` : ''}The rock factor comes by one of two routes: the value recovered for the site, which uses information about that same site, or the one predicted from the modulus by a line fitted over the other sites only, which is the form used when the question is transfer:`}
      </p>
      <Equation
        tex={String.raw`\ln \hat A = a + b \ln \bar E_s,\quad (a,b)\ \text{fitted over the training sites, one point per site}`}
        caption={es ? 'El factor de roca de transferencia, una calibración de este producto y no una relación publicada; Ē_s es el módulo medio del sitio s.' : 'The transfer rock factor, a calibration of this product and not a published relation; Ē_s is the mean modulus of site s.'}
      />
      <p>
        {es
          ? 'Kuz-Ram acompaña ese tamaño medio con un índice de uniformidad, el n de Cunningham, que fija qué tan apretada queda la distribución de tamaños en torno a su mediana: un valor alto significa un tamaño uniforme y uno bajo una dispersión amplia con sobretamaño y finos a la vez, y la fuente da como rango habitual de 0,7 a 2. El índice se construye solo con la geometría, con el bordo y el espaciamiento en metros y el diámetro del barreno en milímetros, tal como lo imprimen Amoako, Jha y Zhong, con un factor de 1,1 en malla trabada:'
          : 'Kuz-Ram pairs that mean size with a uniformity index, Cunningham’s n, which sets how tightly the size distribution gathers around its median: a high value means uniform sizing and a low one a wide spread carrying both oversize and fines, and the source gives the usual range as 0.7 to 2. The index is built from the geometry alone, with the burden and spacing in metres and the hole diameter in millimetres, as Amoako, Jha and Zhong print it, with a factor of 1.1 for a staggered pattern:'}{' '}
        <Cite id="amoako2022" />
      </p>
      <Equation
        tex={String.raw`n = \left(2.2 - 14\frac{B}{d}\right)\sqrt{\frac{1 + S/B}{2}}\left(1 - \frac{W}{B}\right)\left(\left|\frac{\mathrm{BCL}-\mathrm{CCL}}{L}\right| + 0.1\right)^{0.1}\frac{L}{H}`}
        caption={es ? 'Cunningham 1987, Amoako et al. Ec. 7: B y S en m, d en mm, W desviación de perforación, BCL y CCL largos de carga de fondo y de columna, L largo de carga, H altura de banco; ×1,1 en malla trabada.' : 'Cunningham 1987, Amoako et al. Eq. 7: B and S in m, d in mm, W drilling deviation, BCL and CCL bottom and column charge lengths, L charge length, H bench height; ×1.1 for a staggered pattern.'}
      />
      <p>
        {es
          ? 'Tres decisiones de este producto. La carga es una columna continua de ANFO, así que el término de distribución de carga vale 0,1 elevado a 0,1 en vez de inventarse un reparto entre carga de fondo y de columna; la desviación de perforación es cero porque ninguna fuente la publica. La trampa está en B/d: la fuente da el bordo en metros y el diámetro en milímetros, así que vale cerca de 0,027, no la razón de 27 que tabula el corpus, y leída como esa razón el índice se va a cerca de −380.'
          : 'Three decisions of this product. The charge is one continuous ANFO column, so the charge-distribution term is 0.1 to the power 0.1 rather than an invented split between bottom and column charge; the drilling deviation is zero because no source publishes it. The trap is B/d: the source gives the burden in metres and the diameter in millimetres, so it is about 0.027, not the ratio of 27 the corpus tabulates, and read as that ratio the index goes to about −380.'}
      </p>
      <p>
        {es
          ? `Dónde falla. Sobre el conjunto de validación publicado de doce tiros, la columna clásica que imprime el artículo de 2012 explica ${f(classical?.r2_identity)} de la varianza respecto de la identidad, con una correlación al cuadrado de ${f(classical?.pearson_r2)}; su error cuadrático medio de ${f(classical?.rmse_m)} m mejora en ${gain === null ? notAvailable() : f(Math.round(gain * 100), 0)} por ciento al de predecir una constante. Es el peor de los tres modelos de esa tabla. Su falla mejor documentada es subestimar los finos. Bajo los protocolos de este producto puntúa ${f(F?.random('kuznetsov')?.r2_identity)} en la partición aleatoria mediana y ${f(F?.site('kuznetsov'))} con su sitio excluido, casi lo mismo en ambos porque la ecuación no tiene ningún parámetro ajustado a las filas de entrenamiento.`
          : `Where it fails. On the published twelve-blast hold-out, the classical column the 2012 paper prints explains ${f(classical?.r2_identity)} of the variance about the identity line, with a squared correlation of ${f(classical?.pearson_r2)}; its root mean square error of ${f(classical?.rmse_m)} m improves on predicting a constant by ${gain === null ? notAvailable() : f(Math.round(gain * 100), 0)} percent. It is the worst of the three models in that table. Its best-documented failure is under-predicting fines. Under this product’s protocols it scores ${f(F?.random('kuznetsov')?.r2_identity)} at the median random split and ${f(F?.site('kuznetsov'))} with its site held out, nearly the same in both because the equation has no parameter fitted to the training rows.`}{' '}
        <Cite id="kulatilake2012" />{' '}
        <Cite id="amoako2022" />
      </p>
      <ClassicalFlowDiagram />
      <Callout variant="honest" title={es ? 'Una coincidencia que no es evidencia' : 'An agreement that is not evidence'}>
        {es
          ? 'Sobre el conjunto de validación publicado, el brazo clásico de este producto reproduce la columna clásica impresa casi exactamente, y eso es circular: los factores de roca se despejaron precisamente de esa columna. La evidencia de que la geometría y la forma de la ecuación son correctas es otra, que el factor recuperado casi no varíe dentro de cada sitio.'
          : 'On the published hold-out, this product’s classical arm reproduces the printed classical column almost exactly, and that is circular: the rock factors were back-solved from that very column. The evidence that the geometry and the form of the equation are right is something else, that the recovered factor barely varies within each site.'}
      </Callout>
    </DocSection>
  );
}
