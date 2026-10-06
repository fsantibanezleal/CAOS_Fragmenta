/**
 * Introduction: why the size of broken rock matters, what a blast designer controls, the relations
 * every later page uses, the question this product asks, how a number is produced, where the data
 * come from, and what is exact, modelled or absent.
 *
 * Every corpus-level figure is read from the committed benchmark through `lib/facts`, never typed.
 */

import { Callout, Cite, Equation, InlineMath, Refs, useShellLang } from '@fasl-work/caos-app-shell';
import { Link } from 'react-router';

import { SECTION_REFS } from '../data/citations';
import { ARM_BY_ID } from '../lib/artifacts';
import { f, facts, iv, useBenchmark } from '../lib/facts';
import { BenchSectionDiagram, OverviewDiagram } from '../viz/Diagrams';

export default function Introduction() {
  const es = useShellLang() === 'es';
  const benchmark = useBenchmark();
  const F = benchmark ? facts(benchmark) : null;
  const refs = (key: string) => <Refs ids={SECTION_REFS[key]} label={es ? 'Fuentes' : 'Sources'} />;
  const label = (arm: string) => ARM_BY_ID.get(arm)?.label[es ? 'es' : 'en'] ?? arm;

  return (
    <div className="page-body wide prose">
      <div className="page-head">
        <h1>{es ? 'Fragmentación por voladura, y qué se puede predecir de ella' : 'Blast fragmentation, and what can be predicted about it'}</h1>
        <p className="lede">
          {es
            ? 'Fragmenta predice el tamaño medio '
            : 'Fragmenta predicts the mean fragment size '}
          <InlineMath tex="x_{50}" />
          {es
            ? ' de una voladura de banco a partir de su diseño y de la roca, con diez predictores publicados que van de la ecuación de 1973 a los ensambles de 2025, y mide cuánto vale cada predicción en una mina que el modelo no ha visto. No es un simulador mecanicista ni una herramienta de diseño de producción: es un banco de pruebas sobre 97 tiros publicados, con la incertidumbre de cada resultado a la vista.'
            : ' of a bench blast from its design and its rock, with ten published predictors from the 1973 equation to the 2025 ensembles, and measures what each prediction is worth at a mine the model has not seen. It is not a mechanistic simulator and not a production design tool: it is a test bench over 97 published blasts, with the uncertainty of every result shown.'}
        </p>
      </div>

      <section>
        <h2>{es ? 'Por qué importa el tamaño de la roca tronada' : 'Why the size of broken rock matters'}</h2>
        <p>
          {es
            ? 'La voladura es el principal medio de fragmentación en minería y la primera etapa de reducción de tamaño. Hudaverdi, Kulatilake y Kuzu escriben que la voladura tiene un impacto significativo en los procesos aguas abajo, carguío, chancado y molienda: una mejor fragmentación aumenta la productividad de cargadores y excavadoras por una mayor excavabilidad y mejores factores de llenado de balde y de camión, y una distribución de tamaños adecuada y uniforme aumenta el rendimiento de chancadoras y molinos y reduce la energía de reducción de tamaño.'
            : 'Blasting is the primary means of fragmentation in mining and the first stage of size reduction. Hudaverdi, Kulatilake and Kuzu write that blasting has a significant impact on the downstream processes of loading, crushing and grinding: better fragmentation raises loader and excavator productivity through greater diggability and higher bucket and truck fill factors, and a suitable, uniform size distribution raises crusher and mill throughput and lowers the energy spent on size reduction.'}{' '}
          <Cite id="hudaverdi2010" />
        </p>
        <p>
          {es
            ? 'El mismo artículo describe el enfoque de mina a planta como la optimización del diseño de voladura para maximizar la rentabilidad global en vez de la de cada operación por separado, y agrega que una distribución uniforme elimina la voladura secundaria de bolones. Amoako, Jha y Zhong dicen lo mismo desde el otro extremo: una buena tronadura ahorra lo que se gastaría en voladura secundaria y en el chancado y la molienda posteriores.'
            : 'The same paper describes the mine-to-mill approach as optimising the blast design for overall profitability rather than for each operation on its own, and adds that a uniform distribution removes the need to re-blast oversize boulders. Amoako, Jha and Zhong say the same from the other end: an efficient blast saves what would otherwise be spent on secondary blasting and on the crushing and grinding that follow.'}{' '}
          <Cite id="amoako2022" />
        </p>
        <p>
          {es
            ? 'Por eso la pregunta práctica tiene números: para esta roca y este banco, qué malla entrega el tamaño que pide la chancadora primaria sin exceso de finos ni de sobretamaño, y cuánto puede equivocarse la predicción. Esta aplicación trabaja sobre el primer número de esa cadena, el tamaño medio, y sobre la curva que lo rodea.'
            : 'That is why the practical question has numbers in it: for this rock and this bench, which pattern delivers the size the primary crusher is specified for without excess fines or oversize, and how wrong could the prediction be. This application works on the first number in that chain, the mean size, and on the curve around it.'}
        </p>
        {refs('intro-why')}
      </section>

      <section>
        <h2>{es ? 'Lo que controla el diseñador y lo que decide la roca' : 'What the designer controls, and what the rock decides'}</h2>
        <p>
          {es
            ? 'Las dos fuentes dividen los parámetros de una voladura en controlables y no controlables. Los controlables los fija el ingeniero: la geometría (diámetro de perforación, bordo, espaciamiento, altura de banco, taco, pasadura), el explosivo (tipo, potencia, factor de carga) y el tiempo (retardos y secuencia de iniciación). Los no controlables son la roca y el macizo: resistencia, módulo elástico, densidad, número, orientación y espaciamiento de las discontinuidades.'
            : 'Both sources divide the parameters of a blast into controllable and uncontrollable. The engineer sets the controllable ones: the geometry (hole diameter, burden, spacing, bench height, stemming, subdrill), the explosive (type, strength, powder factor) and the timing (delays and initiation sequence). The uncontrollable ones are the rock and the rock mass: strength, elastic modulus, density, and the number, orientation and spacing of the discontinuities.'}{' '}
          <Cite id="hudaverdi2010" />{' '}
          <Cite id="amoako2022" />
        </p>
        <BenchSectionDiagram />
        <p>
          {es
            ? 'El corpus con el que trabaja este producto registra cinco parámetros de diseño como razones adimensionales (S/B, H/B, B/D, T/B y el factor de carga) y dos de roca: el módulo de Young E y el tamaño de bloque in situ XB. Hudaverdi y colegas explican la elección: eran los dos parámetros de roca disponibles para toda la base, el módulo para representar las propiedades mecánicas y el tamaño de bloque para la estructura del macizo. Todos los tiros de la base usaron ANFO, así que el tipo de explosivo no es una variable.'
            : 'The corpus this product works on records five design parameters as dimensionless ratios (S/B, H/B, B/D, T/B and the powder factor) and two rock parameters: the Young modulus E and the in-situ block size XB. Hudaverdi and colleagues explain the choice: those were the two rock parameters available for the whole database, the modulus to represent mechanical properties and the block size to represent the rock-mass structure. Every blast in the database used ANFO, so the explosive type is not a variable.'}{' '}
          <Cite id="hudaverdi2010" />
        </p>
        {refs('intro-controls')}
      </section>

      <section>
        <h2>{es ? 'Las relaciones que usan las demás páginas' : 'The relations the other pages use'}</h2>
        <p>
          {es
            ? 'Tres relaciones recorren todo el producto. La primera es la ecuación clásica de tamaño medio, de Kuznetsov con la corrección de Cunningham por potencia del explosivo, tal como la imprimen las fuentes:'
            : 'Three relations run through the whole product. The first is the classical mean-size equation, Kuznetsov with Cunningham’s explosive-strength correction, as the sources print it:'}{' '}
          <Cite id="kuznetsov1973" />{' '}
          <Cite id="hudaverdi2010" />
        </p>
        <Equation
          tex={String.raw`x_{50} = A\left(\frac{V}{Q}\right)^{0.8} Q^{1/6}\left(\frac{\mathrm{RWS}}{115}\right)^{-19/30}`}
          caption={es ? 'Tamaño medio de fragmento, en centímetros en la ecuación original.' : 'Mean fragment size, in centimetres in the original equation.'}
        />
        <p>
          {es
            ? 'La segunda convierte un tamaño medio en una curva: la fracción que pasa una malla de tamaño x, con un índice de uniformidad n que fija qué tan concentrada está la curva alrededor de su mediana.'
            : 'The second turns a mean size into a curve: the fraction passing a mesh of size x, with a uniformity index n that sets how tightly the curve gathers around its median.'}{' '}
          <Cite id="amoako2022" />
        </p>
        <Equation
          tex={String.raw`P(x) = 1 - \exp\!\left[-\ln 2\left(\frac{x}{x_{50}}\right)^{n}\right]`}
          caption={es ? 'Curva Rosin-Rammler escrita sobre el tamaño medio: P(x50) = 0.5.' : 'Rosin-Rammler curve written on the mean size: P(x50) = 0.5.'}
        />
        <p>
          {es
            ? 'La tercera es la vara con que se mide toda predicción en este sitio: la varianza explicada respecto de la línea de identidad, sobre las filas puntuadas. Es negativa cuando una predicción lo hace peor que el promedio de esas filas, y no es el cuadrado de la correlación, que es lo que la literatura suele llamar R2.'
            : 'The third is the yardstick every prediction on this site is measured with: variance explained about the identity line, over the scored rows. It is negative when a prediction does worse than the mean of those rows, and it is not the squared correlation, which is what the literature usually calls R2.'}
        </p>
        <Equation
          tex={String.raw`R^2_{\mathrm{id}} = 1 - \frac{\sum_i (y_i - \hat y_i)^2}{\sum_i (y_i - \bar y)^2}`}
          caption={es ? 'Varianza explicada respecto de la línea 1:1; y medido, ŷ predicho.' : 'Variance explained about the 1:1 line; y measured, ŷ predicted.'}
        />
        <ul className="fr-symbols-list">
          <li><InlineMath tex="x_{50}" />: {es ? 'tamaño medio, la malla que pasa el 50 por ciento' : 'mean size, the mesh 50 percent passes'}</li>
          <li><InlineMath tex="P_{80}" />: {es ? 'malla que pasa el 80 por ciento, la que se especifica para una chancadora' : 'mesh 80 percent passes, what a crusher is specified against'}</li>
          <li><InlineMath tex="B" />: {es ? 'bordo, distancia del barreno a la cara libre, m' : 'burden, distance from the hole to the free face, m'}</li>
          <li><InlineMath tex="S" />: {es ? 'espaciamiento entre barrenos de una fila, m' : 'spacing between holes in a row, m'}</li>
          <li><InlineMath tex="H" />: {es ? 'altura de banco, m' : 'bench height, m'}</li>
          <li><InlineMath tex="T" />: {es ? 'taco, el tapón inerte del collar, m' : 'stemming, the inert plug at the collar, m'}</li>
          <li><InlineMath tex="D" />: {es ? 'diámetro de perforación, mm' : 'hole diameter, mm'}</li>
          <li><InlineMath tex="P_f" />: {es ? 'factor de carga, kg de explosivo por m³ de roca' : 'powder factor, kg of explosive per m³ of rock'}</li>
          <li><InlineMath tex="V,\,Q" />: {es ? 'volumen de roca y masa de explosivo por barreno' : 'rock volume and explosive mass per hole'}</li>
          <li><InlineMath tex="A" />: {es ? 'factor de roca, adimensional, 0,8 a 22' : 'rock factor, dimensionless, 0.8 to 22'}</li>
          <li><InlineMath tex="\mathrm{RWS}" />: {es ? 'potencia relativa en peso; ANFO 100, TNT 115' : 'weight strength relative to ANFO; ANFO 100, TNT 115'}</li>
          <li><InlineMath tex="E" />: {es ? 'módulo de Young de la roca, GPa' : 'Young modulus of the rock, GPa'}</li>
          <li><InlineMath tex="X_B" />: {es ? 'tamaño de bloque in situ, m' : 'in-situ block size, m'}</li>
          <li><InlineMath tex="n" />: {es ? 'índice de uniformidad de la curva' : 'uniformity index of the curve'}</li>
        </ul>
        {refs('intro-math')}
      </section>

      <section>
        <h2>{es ? 'La pregunta de este producto' : 'The question this product asks'}</h2>
        <p>
          {es
            ? 'La familia clásica se ha extendido muchas veces y una revisión de 2019 recorre esas extensiones. Desde 2012, además, una serie de modelos aprendidos se ha ajustado sobre el mismo corpus de 97 tiros: una red neuronal publicada con su especificación completa, regresión por vectores de soporte, bosques, potenciación y, en 2025, un ensamble apilado que reporta 0,943 de una sola partición aleatoria 80/20.'
            : 'The classical family has been extended many times, and a 2019 review surveys those extensions. Since 2012, a series of learned models has also been fitted to the same 97-blast corpus: a published neural network with its full specification, support-vector regression, forests, boosting and, in 2025, a stacked ensemble that reports 0.943 from one random 80/20 split.'}{' '}
          <Cite id="ouchterlony2019" />{' '}
          <Cite id="kulatilake2012" />{' '}
          <Cite id="sui2025" />
        </p>
        <p>
          {es
            ? 'Las filas de una misma campaña comparten roca, equipo de perforación, explosivo y método de medición, y una sola cantera aporta 22 de las 97. Con datos agrupados así, una partición aleatoria deja filas de la misma campaña a ambos lados, y un modelo puede puntuar alto reconociendo la campaña en vez de modelar la voladura. Este producto pone los diez predictores bajo tres protocolos, repite cien veces los aleatorios y retiene campañas completas en el tercero, y reporta un intervalo por remuestreo de sitios en cada puntaje.'
            : 'Rows from one campaign share a rock, a drilling rig, an explosive and a measurement method, and one quarry supplies 22 of the 97. With data grouped like that, a random split leaves rows of the same campaign on both sides, and a model can score well by recognising the campaign rather than by modelling the blast. This product runs the ten predictors under three protocols, repeats the random ones a hundred times, holds out whole campaigns in the third, and reports a site-resampled interval on every score.'}{' '}
          <Cite id="roberts2017" />
        </p>
        {F ? (
          <Callout variant="honest" title={es ? 'Lo que el benchmark sostiene, y lo que no' : 'What the benchmark supports, and what it does not'}>
            <ul className="fr-list">
              <li>
                {es
                  ? `Sobre cien particiones aleatorias, los brazos aprendidos explican una mediana de ${f(F.learnedRandomRange[0], 2)} a ${f(F.learnedRandomRange[1], 2)} de la varianza. Al retener cada campaña completa, cada uno pierde entre ${f(F.learnedGapRange[0], 2)} y ${f(F.learnedGapRange[1], 2)}.`
                  : `Over a hundred random splits, the learned arms explain a median of ${f(F.learnedRandomRange[0], 2)} to ${f(F.learnedRandomRange[1], 2)} of the variance. With each whole campaign held out, every one of them loses between ${f(F.learnedGapRange[0], 2)} and ${f(F.learnedGapRange[1], 2)}.`}
              </li>
              <li>
                {es
                  ? `El 0,943 publicado para el ensamble apilado queda por encima de ${Math.round((benchmark?.verdict.published_random_split_figures.stacking?.share_of_draws_below ?? 0) * 100)} de cada 100 reproducciones de su propio protocolo, cuya mediana es ${f(benchmark?.verdict.published_random_split_figures.stacking?.median_draw)}.`
                  : `The 0.943 published for the stacked ensemble lies above ${Math.round((benchmark?.verdict.published_random_split_figures.stacking?.share_of_draws_below ?? 0) * 100)} of 100 reproductions of its own protocol, whose median is ${f(benchmark?.verdict.published_random_split_figures.stacking?.median_draw)}.`}
              </li>
              <li>
                {es
                  ? `La ecuación clásica puntúa cerca de 0,30 bajo todo protocolo (${f(F.random('kuznetsov')?.r2_identity)} en la partición aleatoria mediana, ${f(F.site('kuznetsov'))} con el sitio excluido), y también ${f(F.site('kuznetsov-transfer'))} cuando su factor de roca se predice desde el módulo con los otros sitios.`
                  : `The classical equation scores about 0.30 under every protocol (${f(F.random('kuznetsov')?.r2_identity)} at the median random split, ${f(F.site('kuznetsov'))} with its site held out), and ${f(F.site('kuznetsov-transfer'))} when its rock factor is predicted from the modulus using the other sites.`}
              </li>
              <li>
                {es
                  ? `Con diez sitios, ningún brazo que no se haya ajustado sobre el propio corpus tiene un intervalo por encima de cero: el clásico va de ${iv(F.interval('kuznetsov'), 2, true)}, el mejor aprendido de ${iv(F.interval(benchmark?.verdict.supports.all.best_learned_arm ?? 'xgboost'), 2, true)}. Que el nivel aprendido cumpla el criterio declarado depende de si se puntúan los seis tiros de Miami.`
                  : `With ten sites, no arm that was not fitted on the corpus itself has an interval above zero: the classical arm runs ${iv(F.interval('kuznetsov'))}, the best learned arm ${iv(F.interval(benchmark?.verdict.supports.all.best_learned_arm ?? 'xgboost'))}. Whether the learned tier meets the declared criterion depends on whether the six Miami blasts are scored.`}
              </li>
            </ul>
          </Callout>
        ) : null}
        <p>
          {es ? 'El detalle está en ' : 'The detail is on '}
          <Link to="/benchmark">{es ? 'Benchmark' : 'Benchmark'}</Link>
          {es ? ' y el diseño de los experimentos en ' : ', and the design of the experiments on '}
          <Link to="/experiments">{es ? 'Experimentos' : 'Experiments'}</Link>.
          {F ? (es ? ` El mejor brazo aprendido con todos los tiros es ${label(benchmark?.verdict.supports.all.best_learned_arm ?? '')}.` : ` The best learned arm over every blast is ${label(benchmark?.verdict.supports.all.best_learned_arm ?? '')}.`) : null}
        </p>
        {refs('intro-question')}
      </section>

      <section>
        <h2>{es ? 'De una tabla publicada a un número puntuado' : 'From a published table to a scored number'}</h2>
        <OverviewDiagram />
        <ol className="fr-list">
          <li>{es ? 'Se cargan los 97 tiros y se comprueba que reproducen la tabla de estadísticas descriptivas del propio artículo; esa comprobación encontró cinco errores de transcripción.' : 'Load the 97 blasts and check that they reproduce the source paper’s own descriptive-statistics table; that check found five transcription errors.'}</li>
          <li>{es ? 'Se recupera la malla en metros desde las razones y los diámetros que declara la prosa de la fuente, y se verifica contra quince restricciones que esa prosa también declara.' : 'Recover the pattern in metres from the ratios and the hole diameters the source prose states, and verify it against fifteen constraints the same prose states.'}</li>
          <li>{es ? 'Se recupera un factor de roca por sitio invirtiendo la ecuación clásica sobre las predicciones publicadas.' : 'Recover a rock factor per site by inverting the classical equation on the published predictions.'}</li>
          <li>{es ? 'Se parte la tabla de tres formas: cien particiones aleatorias, cien deduplicadas y diez retenciones de sitio completo.' : 'Split the table three ways: a hundred random splits, a hundred deduplicated ones, and ten whole-site hold-outs.'}</li>
          <li>{es ? 'Se ajusta cada brazo solo con las filas de entrenamiento de cada partición, y se predice cada fila de prueba o se registra por qué el brazo se abstiene.' : 'Fit each arm on each split’s training rows only, and predict each test row or record why the arm abstains.'}</li>
          <li>{es ? 'Se puntúa con la varianza explicada y con la correlación, con un modelo nulo al lado, sobre dos conjuntos de filas, con un intervalo por remuestreo de sitios.' : 'Score with variance explained and with correlation, with a null model beside each arm, on two row sets, with a site-resampled interval.'}</li>
          <li>{es ? 'Se escriben artefactos direccionados por contenido y se vuelven a leer y verificar antes de publicarlos.' : 'Write content-addressed artifacts, then re-read and re-check them before they are published.'}</li>
          <li>{es ? 'En el navegador se reproducen esos artefactos, y las ecuaciones y los modelos ajustados se recalculan en vivo cuando usted cambia un diseño.' : 'In the browser, replay those artifacts, and recompute the equations and the fitted models live when you change a design.'}</li>
        </ol>
        {refs('intro-path')}
      </section>

      <section>
        <h2>{es ? 'De dónde vienen los datos' : 'Where the data come from'}</h2>
        <p>
          {es
            ? 'Noventa y siete tiros de banco en diez campañas de cinco países: España (Enusa, Reocin a cielo abierto y subterránea), Turquía (Murgul, Soma, Akdaglar y Ozmert), India (Dongri-Buzurg), Indonesia (Mrica) y Estados Unidos (Miami, Arizona). Hudaverdi y colegas reunieron los datos de estudios anteriores con los de las canteras de Estambul. El método de medición se declara solo para algunas campañas: análisis de imágenes con Wipfrag en Akdaglar y Ozmert, y software de análisis de imágenes en Soma; para las demás, el corpus reutiliza los tamaños de los estudios originales sin repetir el método.'
            : 'Ninety-seven bench blasts in ten campaigns across five countries: Spain (Enusa, and Reocin open pit and underground), Turkey (Murgul, Soma, Akdaglar and Ozmert), India (Dongri-Buzurg), Indonesia (Mrica) and the United States (Miami, Arizona). Hudaverdi and colleagues assembled the data from earlier studies together with blasts from the Istanbul quarries. The measurement method is stated only for some campaigns: Wipfrag image analysis at Akdaglar and Ozmert, and image analysis software at Soma; for the others the corpus reuses the sizes of the original studies without restating the method.'}{' '}
          <Cite id="hudaverdi2010" />
        </p>
        <p>
          {es
            ? 'Dos conjuntos de prueba publicados acompañan al corpus, 14 tiros en total de los mismos sitios, uno de ellos con las predicciones de tres modelos impresas en la misma tabla. Un tercero son cinco tiros de producción en una mina de granito del noreste de China, de un artículo de acceso abierto, con un módulo de 5,6 GPa, por debajo del mínimo del corpus. Los valores numéricos son hechos experimentales reutilizados con cita; los artículos no se redistribuyen. El escaneo tridimensional es una alternativa al análisis de imágenes para medir un montón tronado, y se menciona como el canal de medición que mejoraría un corpus futuro.'
            : 'Two published hold-outs accompany the corpus, 14 blasts in all from the same sites, one of them with three models’ predictions printed in the same table. A third set is five production blasts at a granite mine in north-east China, from an open-access paper, with a modulus of 5.6 GPa, below the corpus minimum. The numeric values are experimental facts reused with citation; the articles are not redistributed. Three-dimensional scanning is an alternative to image analysis for measuring a muckpile and is noted as the measurement channel a future corpus could use.'}{' '}
          <Cite id="kulatilake2012" />{' '}
          <Cite id="sui2025" />{' '}
          <Cite id="li2023" />
        </p>
        {refs('intro-data')}
      </section>

      <section>
        <h2>{es ? 'Alcance: exacto, modelado y ausente' : 'Scope: exact, modelled, and absent'}</h2>
        <div className="fr-scope-grid">
          <div>
            <h3>{es ? 'Exacto' : 'Exact'}</h3>
            <p>
              {es
                ? 'Los datos tal como se publicaron, con cinco correcciones documentadas; la geometría en metros, que es aritmética verificada contra la prosa de la fuente; y las ecuaciones publicadas, aplicadas tal como se imprimieron.'
                : 'The data as published, with five documented corrections; the geometry in metres, which is arithmetic checked against the source prose; and the published equations, applied as printed.'}
            </p>
          </div>
          <div>
            <h3>{es ? 'Modelado' : 'Modelled'}</h3>
            <p>
              {es
                ? 'Los factores de roca, recuperados de predicciones publicadas o predichos desde el módulo; la forma de las curvas, que ninguna curva medida valida aquí; y los modelos aprendidos, reproducidos con sus parámetros publicados.'
                : 'The rock factors, recovered from published predictions or predicted from the modulus; the shape of the curves, which no measured curve validates here; and the learned models, reproduced with their published parameters.'}
            </p>
          </div>
          <div>
            <h3>{es ? 'Ausente' : 'Absent'}</h3>
            <p>
              {es
                ? 'Simulación mecanicista por elementos discretos o modelos híbridos, detonación no ideal, proyección de rocas, vibración y modelo de conminución aguas abajo. La secuencia de iniciación se dibuja pero no entra en ninguna predicción.'
                : 'Mechanistic simulation by discrete elements or hybrid stress models, non-ideal detonation, flyrock, vibration and a downstream comminution model. The initiation sequence is drawn but enters no prediction.'}
            </p>
          </div>
        </div>
        <Callout variant="honest" title={es ? 'Lo que no se reproduce, y por qué' : 'What is not reproduced, and why'}>
          {es
            ? 'Un híbrido de 2025 que combina una red convolucional, una máquina de vectores de soporte por mínimos cuadrados y un optimizador tipo Newton-Raphson reporta cifras fuertes sobre un superconjunto de este corpus. No se reproduce porque la regla de actualización del optimizador no se puede transcribir con confianza desde la copia disponible; se cita con sus cifras, no como un modelo de este producto. Las constantes que ninguna fuente imprime, como el factor de tiempo del modelo clásico modificado o las de la rama de finos, se exponen como parámetros del usuario.'
            : 'A 2025 hybrid combining a convolutional network, a least-squares support-vector machine and a Newton-Raphson-based optimiser reports strong figures on a superset of this corpus. It is not reproduced, because the optimiser’s update rule cannot be transcribed with confidence from the copy available; it is cited with its figures, not as a model of this product. Constants that no source prints, such as the timing factor of the modified classical model or those of the fines branch, are exposed as user parameters.'}{' '}
          <Cite id="huan2025" />
        </Callout>
        {refs('intro-scope')}
      </section>
    </div>
  );
}
