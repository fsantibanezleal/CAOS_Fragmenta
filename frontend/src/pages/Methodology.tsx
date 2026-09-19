/**
 * Methodology: every model, term by term, with its source and where it fails.
 *
 * Six family sub-tabs. Each carries the equations with every symbol defined, an explicit assumptions
 * block, a theme-aware diagram, and inline citations with real DOIs rather than a bibliography dump
 * at the bottom.
 */

import { Callout, Cite, Equation, InlineMath, Refs, SubTabs, useShellLang } from '@fasl-work/caos-app-shell';
import type { SubTabDef } from '@fasl-work/caos-app-shell';

import { SECTION_REFS } from '../data/citations';
import {
  ClassicalFlowDiagram,
  GroupRouterDiagram,
  LearnedFlowDiagram,
  ProtocolDiagram,
  RockFactorDiagram,
} from '../viz/Diagrams';

export default function Methodology() {
  const lang = useShellLang();
  const es = lang === 'es';

  const tabs: SubTabDef[] = [
    { id: 'classical', label: es ? 'Clásicos' : 'Classical', content: <Classical es={es} /> },
    { id: 'rock', label: es ? 'Factor de roca' : 'Rock factor', content: <RockFactor es={es} /> },
    {
      id: 'distributions',
      label: es ? 'Distribuciones' : 'Distributions',
      content: <Distributions es={es} />,
    },
    {
      id: 'statistical',
      label: es ? 'Estadísticos' : 'Statistical',
      content: <Statistical es={es} />,
    },
    { id: 'learned', label: es ? 'Aprendidos' : 'Learned', content: <Learned es={es} /> },
    { id: 'protocol', label: es ? 'Protocolos' : 'Protocols', content: <Protocol es={es} /> },
  ];

  return (
    <div className="page-body prose">
      <h1>{es ? 'Metodología' : 'Methodology'}</h1>
      <p className="fr-lede">
        {es
          ? 'Doce modelos en cuatro niveles, cada uno transcrito de una fuente primaria con cada símbolo definido, y cada uno con una nota de dónde falla. Un nombre en un selector no es un método.'
          : 'Twelve models across four tiers, each transcribed from a primary source with every symbol defined, and each with a note on where it fails. A name in a selector is not a method.'}
      </p>
      <SubTabs tabs={tabs} ariaLabel="method families" />
      <Refs ids={SECTION_REFS.methodology} label={es ? "Fuentes de esta página" : "Sources for this page"} />
    </div>
  );
}

/* ------------------------------------------------------------------------------------------- */

function Classical({ es }: { es: boolean }) {
  return (
    <section>
      <h2>{es ? 'El tamaño medio clásico' : 'The classical mean size'}</h2>
      <p>
        {es
          ? 'La ecuación de 1973 con la corrección de Cunningham por potencia del explosivo. Es cerrada, se evalúa en microsegundos, y sigue siendo el estándar de la industria. Esa combinación es exactamente la razón para probarla duro: un modelo así de barato tiende a creerse.'
          : 'The 1973 equation with Cunningham’s explosive-strength correction. It is closed form, evaluates in microseconds, and is still the industry default. That combination is exactly why it is worth testing hard: a model this cheap tends to be believed.'}{' '}
        <Cite id="hudaverdi2010" />
        <Cite id="amoako2022" />
      </p>

      <Equation
        tex={String.raw`x_{50} \;=\; A \left(\frac{V}{Q}\right)^{0.8} Q^{1/6} \left(\frac{\mathrm{RWS}}{115}\right)^{-19/30}`}
        caption={
          es
            ? 'Tamaño medio de fragmento, en centímetros en la ecuación original.'
            : 'Mean fragment size, in centimetres in the original equation.'
        }
      />

      <dl className="fr-symbols">
        <dt><InlineMath tex="A" /></dt>
        <dd>{es ? 'factor de roca, adimensional, entre 0.8 y 22' : 'rock factor, dimensionless, between 0.8 and 22'}</dd>
        <dt><InlineMath tex="V" /></dt>
        <dd>{es ? 'volumen de roca fragmentado por barreno, m3' : 'rock volume broken per hole, m3'}</dd>
        <dt><InlineMath tex="Q" /></dt>
        <dd>{es ? 'masa de explosivo en ese barreno, kg' : 'explosive mass in that hole, kg'}</dd>
        <dt><InlineMath tex="\mathrm{RWS}" /></dt>
        <dd>{es ? 'potencia relativa en peso; ANFO es 100 y TNT es 115' : 'weight strength relative to ANFO, which is 100; TNT is 115'}</dd>
      </dl>

      <p>
        {es
          ? 'Nótese que V/Q es el recíproco del factor de carga, y por eso las dos formas publicadas de esta ecuación, una en V/Q y otra en el factor de carga elevado a -0.8, coinciden en ese término.'
          : 'Note that V/Q is the reciprocal of the powder factor, which is why the two published spellings of this equation, one in V/Q and one in the powder factor to the power -0.8, agree on that term.'}
      </p>

      <Callout variant="honest" title={es ? 'Un desacuerdo publicado, resuelto sobre este corpus' : 'A published disagreement, settled on this corpus'}>
        {es
          ? 'Las dos fuentes escriben el exponente de potencia del explosivo distinto: -19/30 sobre (E/115) en una, 19/20 sobre (115/RWS) en la otra. Difieren cerca de un 8 por ciento con RWS 140. Despejar el factor de roca desde las predicciones publicadas lo decide: con la forma -19/30 el factor recuperado queda casi constante dentro de cada sitio, y con la otra no.'
          : 'The two sources write the explosive-strength exponent differently: -19/30 on (E/115) in one, 19/20 on (115/RWS) in the other. They differ by about 8 percent at an RWS of 140. Back-solving the rock factor from the published predictions decides it: with the -19/30 form the recovered factor is near constant within each site, and with the other it is not.'}
      </Callout>

      <h3>{es ? 'El índice de uniformidad' : 'The uniformity index'}</h3>
      <Equation
        tex={String.raw`n = \left(2.2 - 14\frac{B}{d}\right)\sqrt{\frac{1 + S/B}{2}}\left(1 - \frac{W}{B}\right)\left(\left|\frac{\mathrm{BCL}-\mathrm{CCL}}{L}\right| + 0.1\right)^{0.1}\frac{L}{H}`}
        caption={es ? 'Cunningham 1987. Multiplicar por 1.1 en malla trabada.' : 'Cunningham 1987. Multiply by 1.1 for a staggered pattern.'}
      />

      <Callout variant="strong" title={es ? 'La trampa de unidades' : 'The unit trap'}>
        {es
          ? 'La fuente da el bordo en METROS y el diámetro en MILÍMETROS, así que el B/d publicado vale cerca de 0.027 para un bordo de 4.5 m en un barreno de 165 mm. NO es la razón adimensional bordo sobre diámetro que tabula el corpus, que es mil veces mayor. Leido así, el término principal se vuelve 2.2 menos 382 y el índice cae a unos -380. Una prueba del producto verifica que el índice cae en su banda publicada sobre los 91 tiros reconstruibles, y eso es lo que atrapa este error.'
          : 'The source states the burden in METRES and the diameter in MILLIMETRES, so the published B/d is about 0.027 for a 4.5 m burden on a 165 mm hole. It is NOT the dimensionless burden-to-diameter ratio the corpus tabulates, which is a thousand times larger. Read that way the leading term becomes 2.2 minus 382 and the index falls to about -380. A product test asserts the index lands in its published band on all 91 reconstructable blasts, and that is what catches this.'}
      </Callout>

      <h3>{es ? 'Supuestos' : 'Assumptions'}</h3>
      <ul className="fr-list">
        <li>{es ? 'Detonación ideal. La detónica no ideal queda fuera de alcance.' : 'Ideal detonation. Non-ideal detonics is out of scope.'}</li>
        <li>
          {es
            ? 'Una sola columna de carga continua, que es lo que el ANFO es en estas mallas. El término de distribución de carga se reduce entonces a 0.1 elevado a 0.1, en vez de inventarse un reparto entre carga de fondo y de columna que el corpus no publica.'
            : 'One continuous charge column, which is what ANFO in these patterns is. The charge-distribution term then reduces to 0.1 to the power 0.1, rather than inventing a bottom and column charge split the corpus does not publish.'}
        </li>
        <li>
          {es
            ? 'El factor de tiempo y las correcciones de 2005 no están tabuladas en ninguna fuente consultada. Valen 1 por defecto y las fija el usuario.'
            : 'The timing factor and the 2005 corrections are not tabulated in any source held for this work. They default to 1 and are set by the user.'}
        </li>
      </ul>

      <ClassicalFlowDiagram />

      <h3>{es ? 'Dónde falla' : 'Where it fails'}</h3>
      <p>
        {es
          ? 'Sobre el conjunto de validación publicado de doce tiros explica 0.232 de la varianza respecto de la identidad, con un RMSE de 0.128 m frente a los 0.147 m de predecir una constante. Le gana a una constante por un 13 por ciento, y es el peor de los tres modelos impresos en su propia tabla fuente. Su falla mejor documentada es subestimar los finos.'
          : 'On the published twelve-blast hold-out it explains 0.232 of the variance about the identity line, with a root mean square error of 0.128 m against 0.147 m for predicting a constant. It beats a constant by 13 percent, and it is the worst of the three models printed in its own source table. Its best-documented failure is under-predicting fines.'}
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

function RockFactor({ es }: { es: boolean }) {
  return (
    <section>
      <h2>{es ? 'El factor de roca' : 'The rock factor'}</h2>
      <p>
        {es
          ? 'Un solo número adimensional carga con todo el "qué clase de roca es esta". Su forma original era una búsqueda de tres valores, que la propia literatura llama demasiado gruesa. La salida es un esquema de calificación, y ahí es donde una colección de fórmulas elegiría una en silencio.'
          : 'One dimensionless number carries the whole of "what kind of rock is this". Its original form was a three-value lookup, which the literature itself calls too coarse. The way out is a rating scheme, and that is where a formula collection would quietly pick one.'}
      </p>

      <Equation
        tex={String.raw`A = 0.06 \times \mathrm{BI}, \qquad \mathrm{BI} = 0.5\,(\mathrm{RMD} + \mathrm{JPS} + \mathrm{JPO} + \mathrm{RDI} + S)`}
        caption={es ? 'El índice de tronabilidad de Lilly.' : 'Lilly’s blastability index.'}
      />

      <Callout variant="honest" title={es ? 'Dos tablas bajo la misma atribución' : 'Two tables under the same attribution'}>
        {es
          ? 'Dos fuentes primarias publican tablas de calificación atribuidas a Lilly, y no son la misma tabla. El término de resistencia es 0.05 por la resistencia a compresión simple en una, y esa resistencia dividida por 3 o por 5 según el módulo en la otra. Con 100 MPa eso da 5 frente a 33.3 o 20, lo que mueve el índice hasta 14 puntos y el factor de roca hasta 0.85. El tamaño predicho es lineal en ese factor.'
          : 'Two primary sources publish rating tables attributed to Lilly, and they are not the same table. The strength term is 0.05 times the uniaxial compressive strength in one, and that strength divided by 3 or 5 by modulus in the other. At 100 MPa that is 5 against 33.3 or 20, which moves the index by up to 14 points and the rock factor by up to 0.85. Predicted size is linear in that factor.'}{' '}
        <Cite id="babaeian2019" />
      </Callout>

      <p>
        {es
          ? 'Los tres esquemas se muestran lado a lado, con su fuente en cada uno. Presentar uno como EL factor de roca ocultaría la subjetividad que es el contenido real de este parámetro.'
          : 'All three schemes ship side by side with the source on each. Presenting one as THE rock factor would hide the subjectivity that is the real content of this parameter.'}
      </p>

      <h3>{es ? 'Un cuarto esquema, recuperado de los datos' : 'A fourth scheme, recovered from the data'}</h3>
      <p>
        {es
          ? 'Ambas fuentes dicen que el factor de roca "se estimó para cada tiro" y ninguna publica un valor. Invirtiendo la ecuación de tamaño medio sobre una predicción publicada se recupera:'
          : 'Both sources say the rock factor "was estimated for each blast" and neither prints a value. Inverting the mean-size equation on a published prediction recovers it:'}
      </p>
      <Equation
        tex={String.raw`A = \frac{x_{50}}{(V/Q)^{0.8}\,Q^{1/6}\,(\mathrm{RWS}/115)^{-19/30}}`}
      />
      <p>
        {es
          ? 'Los valores recuperados apenas se mueven dentro de cada sitio: la mayor dispersión es 3.7 por ciento, que es lo que produce redondear las predicciones publicadas a dos decimales. Un error en la reconstrucción geométrica los dispersaría. Ese único resultado valida la geometría, resuelve el desacuerdo de exponentes y recupera una constante que la literatura omitió.'
          : 'The recovered values barely move within a site: the widest spread is 3.7 percent, which is what rounding the published predictions to two decimals produces. An error in the geometry reconstruction would scatter them. That one result validates the geometry, settles the exponent disagreement, and recovers a constant the literature omitted.'}
      </p>

      <Callout variant="note" title={es ? 'Una inversión, nombrada en vez de suavizada' : 'One inversion, named rather than smoothed'}>
        {es
          ? 'Los factores recuperados correlacionan con el módulo de Young en 0.87, no cerca de uno, y hay una inversión que vale la pena nombrar: la roca más rígida del corpus, un esquisto plegado de 60 GPa, queda por debajo de los carbonatos de 45 GPa. La rigidez no es lo único que carga el factor de roca.'
          : 'The recovered factors correlate with Young modulus at 0.87, not near one, and there is one inversion worth naming: the stiffest rock in the corpus, a folded schist at 60 GPa, sits below the carbonates at 45 GPa. Stiffness is not the only thing the rock factor carries.'}
      </Callout>

      <RockFactorDiagram />
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

function Distributions({ es }: { es: boolean }) {
  return (
    <section>
      <h2>{es ? 'De un tamaño medio a una curva' : 'From a mean size to a curve'}</h2>

      <h3>{es ? 'Dos parámetros' : 'Two parameters'}</h3>
      <Equation
        tex={String.raw`R(x) = \exp\!\left[-0.693\left(\frac{x}{x_{50}}\right)^{n}\right]`}
        caption={es ? 'Fracción retenida sobre una malla x; lo que pasa es uno menos eso.' : 'Fraction retained above a mesh x; passing is one minus that.'}
      />
      <p>
        {es
          ? 'El 0.693 es el logaritmo natural de dos, y es lo que hace que x50 sea el tamaño al 50 por ciento pasante en vez del tamaño característico. El característico, por el que pasa el 63.2 por ciento, vale x50 dividido por 0.693 elevado a 1/n.'
          : 'The 0.693 is the natural logarithm of two, which is what makes x50 the fifty-percent passing size rather than the characteristic size. The characteristic size, through which 63.2 percent passes, is x50 divided by 0.693 to the power 1/n.'}
      </p>

      <h3>{es ? 'Tres parámetros' : 'Three parameters'}</h3>
      <Equation
        tex={String.raw`P(x) = \frac{1}{1 + \left[\dfrac{\ln(x_{\max}/x)}{\ln(x_{\max}/x_{50})}\right]^{b}}`}
        caption={es ? 'Ouchterlony 2005. x_max se toma como el mayor entre bordo y espaciamiento.' : 'Ouchterlony 2005. x_max is taken as the larger of burden and spacing.'}
      />
      <p>
        {es
          ? 'El límite superior explícito corrige la cola gruesa que la forma de dos parámetros equivoca, y la curvatura adicional corrige la rama de finos.'
          : 'The explicit upper limit fixes the coarse tail the two-parameter form gets wrong, and the extra curvature fixes the fines branch.'}{' '}
        <Cite id="amoako2022" />
      </p>

      <Callout variant="honest" title={es ? 'Un contraejemplo que viaja con el modelo' : 'A counter-example that travels with the model'}>
        {es
          ? 'La misma fuente que recomienda la forma de tres parámetros reporta un sitio donde la más simple ajustó mejor: sobre 24 tiros en una mina de bauxita medidos por análisis de imagen, el rango de la forma de dos parámetros quedó más cerca de la medición. Es más adaptable en general y no mejor en todas partes.'
          : 'The same body of work that recommends the three-parameter form reports a site where the simpler one fitted better: over 24 blasts at one bauxite mine measured by image analysis, the two-parameter range landed closer to the measurement. It is more adaptable in general and not better everywhere.'}{' '}
        <Cite id="babaeian2019" />
      </Callout>

      <h3>{es ? 'La composición de dos ramas' : 'The two-branch composition'}</h3>
      <p>
        {es
          ? 'Dos mecanismos actúan a la vez: la fractura por tracción produce los fragmentos gruesos y la fractura por corte en la zona triturada alrededor del barreno produce los finos. La rama gruesa es el modelo clásico; la fina modifica los parámetros de la distribución.'
          : 'Two mechanisms act at once: tensile fracturing produces the coarse fragments and compressive-shear fracturing in the crushed zone around the hole produces the fines. The coarse branch is the classical model; the fine branch modifies the distribution’s parameters.'}
      </p>

      <Callout variant="strong" title={es ? 'La estructura tiene fuente, las constantes no' : 'The structure is sourced, the constants are not'}>
        {es
          ? 'Los artículos que introdujeron estos modelos son actas de congreso que no se poseen para este trabajo; lo que sí se tiene es una descripción del mecanismo. Así que el tamaño de cruce, la uniformidad de la rama fina y la fracción de finos los fija el usuario, con valores por defecto declarados como puntos de partida plausibles y no como valores publicados. Cada curva que este modelo devuelve lleva esa distinción.'
          : 'The papers that introduced these models are proceedings that are not held for this work; what is held is a description of the mechanism. So the crossover size, the fines-branch uniformity and the fines fraction are set by the user, with defaults stated as plausible starting values rather than published ones. Every curve this model returns carries that distinction.'}
      </Callout>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

function Statistical({ es }: { es: boolean }) {
  return (
    <section>
      <h2>{es ? 'El enrutador y las dos regresiones' : 'The router and the two regressions'}</h2>
      <p>
        {es
          ? 'Los 97 tiros se separan por análisis de conglomerados en dos grupos: 35 de módulo alto, con media 51.14 GPa, y 62 de módulo bajo, con media 17.22 GPa. El análisis de la propia fuente muestra por qué funciona: el módulo domina la separación, y la razón espaciamiento sobre bordo no influye en absoluto en la pertenencia al grupo.'
          : 'The 97 blasts separate by cluster analysis into two groups: 35 high-modulus blasts averaging 51.14 GPa and 62 low-modulus blasts averaging 17.22 GPa. The source’s own analysis shows why it works: the modulus dominates the split, and the spacing-to-burden ratio has no effect on group membership at all.'}{' '}
        <Cite id="hudaverdi2010" />
      </p>

      <Equation
        tex={String.raw`L = 4.467\tfrac{S}{B} - 0.551\tfrac{H}{B} - 0.123\tfrac{B}{D} + 1.642\tfrac{T}{B} - 3.005\,P_f + 0.309\,X_B + 0.208\,E + 3.577`}
        caption={es ? 'La función discriminante. Por encima de 11.821 es el grupo de módulo alto.' : 'The discriminant function. Above 11.821 is the high-modulus group.'}
      />

      <Callout variant="note" title={es ? 'Se reproduce exactamente' : 'It reproduces exactly'}>
        {es
          ? 'Cero errores de asignación en los 97 tiros de entrenamiento y en los 12 de validación. Los dos grupos quedan perfectamente separados, con máximo 10.318 en el grupo bajo y mínimo 13.067 en el alto. Eso importa más que la contabilidad: significa que el enrutador es una compuerta real y no una consulta de etiqueta, así que las ecuaciones por grupo funcionan sobre diseños nuevos.'
          : 'Zero misassignments on all 97 training blasts and all 12 hold-out blasts. The two groups are perfectly separated, with a low-group maximum of 10.318 and a high-group minimum of 13.067. That matters beyond bookkeeping: it means the router is a real gate rather than a label lookup, so the group equations work on new designs.'}
      </Callout>

      <GroupRouterDiagram />

      <h3>{es ? 'Las dos leyes de potencia' : 'The two power laws'}</h3>
      <Equation
        tex={String.raw`x_{50} = 208 \left(\tfrac{S}{B}\right)^{2.788}\left(\tfrac{H}{B}\right)^{0.112}\left(\tfrac{B}{D}\right)^{0.027}\left(\tfrac{T}{B}\right)^{-0.321} P_f^{-0.360} X_B^{0.233} E^{-1.802}`}
        caption={es ? 'Grupo 1, módulo alto. R2 0.708 sobre 35 tiros.' : 'Group 1, high modulus. R2 0.708 on 35 blasts.'}
      />
      <Equation
        tex={String.raw`x_{50} = 0.60 \left(\tfrac{S}{B}\right)^{0.547}\left(\tfrac{H}{B}\right)^{0.535}\left(\tfrac{B}{D}\right)^{0.427}\left(\tfrac{T}{B}\right)^{-0.101} P_f^{-0.115} X_B^{0.434} E^{-1.202}`}
        caption={es ? 'Grupo 2, módulo bajo. R2 0.739 sobre 62 tiros.' : 'Group 2, low modulus. R2 0.739 on 62 blasts.'}
      />

      <Callout variant="note" title={es ? 'Un aparente error de unidades que no lo es' : 'An apparent unit error that is not one'}>
        {es
          ? 'Los dos coeficientes principales difieren por un factor de 347 y ambas ecuaciones devuelven metros. Parece un error y no lo es: los exponentes del módulo difieren en 0.6 sobre un rango de 9.57 a 60 GPa, y el término del módulo absorbe la diferencia. Se comprobó numéricamente antes de aceptar los coeficientes.'
          : 'The two leading coefficients differ by a factor of 347 and both equations return metres. It looks like a slip and it is not: the modulus exponents differ by 0.6 over a range of 9.57 to 60 GPa, and the modulus term absorbs the gap. Checked numerically before the coefficients were accepted.'}
      </Callout>

      <h3>{es ? 'El hallazgo' : 'The finding'}</h3>
      <p>
        {es
          ? 'Ambos artículos imprimen estas ecuaciones Y una tabla de predicciones hechas con ellas. Recalcular las ecuaciones y puntuar sobre las mismas filas da un resultado materialmente mejor que cualquiera de las dos tablas: 0.854 contra el 0.747 propio del artículo de 2010, y 0.827 contra el 0.708 del de 2012. En las cuatro filas donde los dos artículos se contradicen, el recálculo cae sobre la cifra de 2010 las cuatro veces.'
          : 'Both papers print these equations AND a table of predictions made with them. Recomputing the equations and scoring on the same rows gives a materially better result than either table: 0.854 against the 2010 paper’s own 0.747, and 0.827 against the 2012 paper’s 0.708. On the four rows where the two papers contradict each other, the recomputation lands on the 2010 figure all four times.'}{' '}
        <Cite id="kulatilake2012" />
      </p>

      <p>
        {es
          ? 'Una fila no coincide con ninguno de los dos por un factor de dos, y dos modelos independientes se apartan de la fuente en la misma dirección sobre esa fila. Se probó la hipótesis de que una celda de entrada estuviera mal: ningún valor único reconcilia ambos modelos. La fila viaja con sus entradas publicadas y con su inconsistencia registrada.'
          : 'One row matches neither by a factor of two, and two independent models disagree with the source in the same direction on that row. The hypothesis that one input cell is wrong was tested: no single value reconciles both models. The row travels with its published inputs and its inconsistency recorded.'}
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

function Learned({ es }: { es: boolean }) {
  return (
    <section>
      <h2>{es ? 'Los modelos aprendidos' : 'The learned models'}</h2>
      <p>
        {es
          ? 'Tres de los cinco están completamente especificados en sus fuentes, hasta el ancho de la capa oculta, el algoritmo de entrenamiento, la normalización y los hiperparámetros. Eso los hace reproducciones y no reimplementaciones, y es lo que permite que una reproducción pueda discrepar del artículo de forma significativa.'
          : 'Three of the five are fully specified in their sources, down to the hidden width, the training algorithm, the normalisation and the hyperparameters. That makes them reproductions rather than reimplementations, and it is what lets a reproduction disagree with a paper in a way that means something.'}{' '}
        <Cite id="kulatilake2012" />
        <Cite id="sui2025" />
      </p>

      <h3>{es ? 'La red publicada' : 'The published network'}</h3>
      <ul className="fr-list">
        <li>{es ? 'siete entradas, una capa oculta, una salida lineal' : 'seven inputs, one hidden layer, one linear output'}</li>
        <li>{es ? 'entrenada por separado en cada grupo de rigidez' : 'trained separately on each stiffness group'}</li>
        <li>{es ? 'entradas y objetivo normalizados por mínimo y máximo' : 'inputs and target normalised by minimum and maximum'}</li>
        <li>{es ? 'entrenamiento por Levenberg-Marquardt, elegido tras comparar cuatro algoritmos' : 'Levenberg-Marquardt training, chosen after comparing four algorithms'}</li>
        <li>{es ? 'ancho oculto barrido de 6 a 15, ocho simulaciones en cada uno' : 'hidden width swept from 6 to 15, eight simulations at each'}</li>
      </ul>

      <Callout variant="strong" title={es ? 'La reproducción no alcanza el puntaje publicado' : 'The reproduction does not reach the published score'}>
        {es
          ? 'A lo largo de treinta semillas, la varianza explicada de la reproducción sobre el conjunto de validación publicado va de 0.167 a 0.636, con mediana cerca de 0.34. El 0.910 publicado queda por encima de todas ellas y ninguna semilla llega siquiera a 0.7. El déficit se concentra en las dos filas que la propia fuente reporta como sus más inestables, con coeficientes de variación de 0.56 y 0.76 en sus propias tablas. La afirmación es estrecha y verificable: el puntaje publicado no es robusto a la semilla.'
          : 'Across thirty seeds, the reproduction’s variance explained on the published hold-out runs from 0.167 to 0.636, with a median near 0.34. The published 0.910 sits above every one of them and no seed reaches even 0.7. The shortfall concentrates in the two rows the source itself reports as its most unstable, with coefficients of variation of 0.56 and 0.76 in its own tables. The claim is narrow and checkable: the published score is not robust to the seed.'}
      </Callout>

      <p>
        {es
          ? 'La arquitectura es generosa respecto de los datos: siete unidades ocultas sobre 62 tiros son 64 parámetros libres, y nueve sobre 35 son 82. Ambos recuentos viajan en cada predicción.'
          : 'The architecture is generous relative to the data: seven hidden units on 62 blasts is 64 free parameters, and nine on 35 is 82. Both counts ride on every prediction.'}
      </p>

      <h3>{es ? 'Los modelos de 2025' : 'The 2025 models'}</h3>
      <p>
        {es
          ? 'Dos fuentes ajustan la regresión por vectores de soporte sobre este mismo corpus y llegan a conclusiones opuestas sobre el núcleo. Ambas se incluyen; promediarlas borraría el desacuerdo, que es la parte interesante. El bosque aleatorio, la potenciación por gradiente y el ensamble apilado se reproducen con los hiperparámetros finales publicados, incluido el sobreajuste que la propia fuente reporta, que se deja visible en vez de corregirse.'
          : 'Two sources tune support vector regression on this same corpus and reach opposite conclusions about the kernel. Both ship; averaging them would erase the disagreement, which is the interesting part. The random forest, the gradient boosting and the stacking ensemble are reproduced with the published final hyperparameters, including the overfitting the source itself reports, which is left visible rather than corrected.'}
      </p>

      <Callout variant="note" title={es ? 'Lo que no se reprodujo, y por qué' : 'What was not reproduced, and why'}>
        {es
          ? 'Un híbrido de 2025 que combina una red convolucional, una máquina de vectores de soporte por mínimos cuadrados y un optimizador tipo Newton-Raphson reporta cifras fuertes sobre un superconjunto de este corpus. No se reproduce: la regla de actualización del optimizador no es transcribible con confianza desde la copia disponible, y una aproximación casera bajo ese nombre sería un método fabricado. Aparece citado con sus cifras publicadas, no como un modelo de este producto.'
          : 'A 2025 hybrid combining a convolutional network, a least-squares support vector machine and a Newton-Raphson-based optimiser reports strong figures on a superset of this corpus. It is not reproduced: the optimiser’s update rule is not transcribable with confidence from the copy available, and a hand-rolled approximation under that name would be a fabricated method. It appears cited with its published figures, not as a model of this product.'}{' '}
        <Cite id="huan2025" />
      </Callout>

      <LearnedFlowDiagram />
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */

function Protocol({ es }: { es: boolean }) {
  return (
    <section>
      <h2>{es ? 'Por que el protocolo es el experimento' : 'Why the protocol is the experiment'}</h2>
      <p>
        {es
          ? 'El estado del arte de 2025 sobre este corpus reporta una varianza explicada de 0.943 desde una partición aleatoria 80/20 de 97 filas. Diecisiete de esas filas duplican el vector de características de otra fila, así que una partición aleatoria coloca duplicados a ambos lados por construcción. El mismo artículo registra que probó validación cruzada y la quitó porque "el modelo con validación cruzada tuvo un efecto de predicción pobre sobre el conjunto de prueba", que es exactamente el síntoma que esto predice.'
          : 'The 2025 state of the art on this corpus reports a variance explained of 0.943 from a random 80/20 split of 97 rows. Seventeen of those rows duplicate another row’s feature vector, so a random split places duplicates on both sides by construction. The same paper records that it tried cross-validation and removed it because "the cross-validated model had a poor prediction effect on the test set", which is exactly the symptom this predicts.'}{' '}
        <Cite id="sui2025" />
      </p>

      <ProtocolDiagram />

      <h3>{es ? 'Tres protocolos' : 'Three protocols'}</h3>
      <table className="fr-table">
        <thead>
          <tr>
            <th>{es ? 'protocolo' : 'protocol'}</th>
            <th>{es ? 'regla' : 'rule'}</th>
            <th>{es ? 'que responde' : 'what it answers'}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{es ? 'aleatorio 80/20' : 'random 80/20'}</td>
            <td>{es ? 'partición aleatoria con semilla' : 'seeded random partition'}</td>
            <td>{es ? 'reproduce el protocolo publicado' : 'reproduces the published protocol'}</td>
          </tr>
          <tr>
            <td>{es ? 'deduplicado' : 'deduplicated'}</td>
            <td>{es ? 'colapsa vectores duplicados y luego parte' : 'collapse duplicate vectors, then split'}</td>
            <td>{es ? 'aísla el efecto de los duplicados' : 'isolates the duplicate effect alone'}</td>
          </tr>
          <tr>
            <td>{es ? 'dejar un sitio fuera' : 'leave one site out'}</td>
            <td>{es ? 'una campaña completa fuera, diez pliegues' : 'a whole campaign held out, ten folds'}</td>
            <td>{es ? 'puede llegar a una mina que no ha visto' : 'can it reach a mine it has not seen'}</td>
          </tr>
        </tbody>
      </table>

      <p>
        {es
          ? 'El tercero es la pregunta del profesional. Las filas de una misma campaña comparten macizo rocoso, equipo de perforación, suministro de explosivo y operador de medición, y una sola cantera aporta 22 de las 97 filas.'
          : 'The third is the practitioner’s question. Rows within one campaign share a rock mass, a drilling rig, an explosive supply and a measurement operator, and one quarry supplies 22 of the 97 rows.'}
      </p>

      <Callout variant="honest" title={es ? 'El criterio de descarte, declarado antes de correr' : 'The kill criterion, declared before the run'}>
        {es
          ? 'El nivel aprendido cuenta como generalizable entre sitios solo si la varianza explicada del mejor modelo aprendido bajo dejar-un-sitio-fuera es a la vez positiva y al menos 0.10 sobre la del modelo nulo. Ambas mitades son necesarias, y la segunda se agregó DESPUÉS de la primera corrida, porque esa corrida atrapó al criterio fallando en medir su propio objeto: entregó un mejor modelo aprendido en -0.034 contra un nulo en -0.216, y la regla declaró éxito. Una compuerta que puede aprobar con dos fracasos no es una compuerta.'
          : 'The learned tier counts as generalising across sites only if the best learned model’s variance explained under leave-one-site-out is both positive and at least 0.10 above the null model’s. Both halves are required, and the second was added AFTER the first run, because that run caught the criterion failing to measure its own subject: it produced a best learned model at -0.034 against a null at -0.216 and the rule declared success. A gate that can pass on two failures is not a gate.'}
      </Callout>
    </section>
  );
}
