/**
 * Engine, the portable models: how a model fitted with numpy, scikit-learn and xgboost runs in a browser and why its
 * numbers are the fitted model's (area `engine`). The kind table is transcribed from the portable-models page; the counts
 * are read from the benchmark and the index.
 */

import { Callout, Cite, DocSection, Equation } from '@fasl-work/caos-app-shell';

import { IMPLEMENTATION_REFS } from '../../data/citations/implementation';
import { PortableModelDiagram } from '../../viz/Diagrams';
import { count, kb, tr, type Bi, type TopicProps } from './shared';

/** One row per kind of portable document: what is stored and how it is evaluated (docs/architecture/05_portable-models.md, section 3). */
const KINDS: { kind: string; stored: Bi; evaluated: Bi }[] = [
  {
    kind: 'network',
    stored: { en: 'the router; per group the input bounds, the target range, the hidden width and eight weight vectors', es: 'el enrutador; por grupo los límites de entrada, el rango del objetivo, el ancho oculto y ocho vectores de pesos' },
    evaluated: { en: 'min-max scale, logistic hidden layer, linear output, clamp to the unit interval, rescale, average the eight', es: 'escala mínimo-máximo, capa oculta logística, salida lineal, límite al intervalo unitario, reescala, promedio de los ocho' },
  },
  {
    kind: 'svr',
    stored: { en: 'standardisation, kernel, gamma, degree, support vectors, dual coefficients, intercept', es: 'estandarización, núcleo, gamma, grado, vectores de soporte, coeficientes duales, intercepto' },
    evaluated: { en: 'the sum of dual coefficients times the kernel at each support vector, plus the intercept', es: 'la suma de los coeficientes duales por el núcleo en cada vector de soporte, más el intercepto' },
  },
  {
    kind: 'forest',
    stored: { en: 'standardisation; every tree as four arrays: left child, right child, feature, threshold or leaf', es: 'estandarización; cada árbol como cuatro arreglos: hijo izquierdo, hijo derecho, variable, umbral u hoja' },
    evaluated: { en: 'walk left when the input is at most the threshold, stop at a leaf, average over the trees', es: 'ir a la izquierda si la entrada es a lo más el umbral, parar en una hoja, promediar sobre los árboles' },
  },
  {
    kind: 'xgboost',
    stored: { en: 'the same arrays, thresholds as 32-bit values, and the base score', es: 'los mismos arreglos, umbrales como valores de 32 bits, y el puntaje base' },
    evaluated: { en: 'walk left when the input is strictly below the threshold; base score plus the leaves', es: 'ir a la izquierda si la entrada es estrictamente menor que el umbral; puntaje base más las hojas' },
  },
  {
    kind: 'stacking',
    stored: { en: 'references to the forest and the booster, the meta-learner’s weights and intercept', es: 'referencias al bosque y a la potenciación, los pesos y el intercepto del metaaprendiz' },
    evaluated: { en: 'a weighted sum of the forest and the booster plus a constant', es: 'una suma ponderada del bosque y la potenciación más una constante' },
  },
  {
    kind: 'power-law',
    stored: { en: 'the router; per group the intercept and seven exponents', es: 'el enrutador; por grupo el intercepto y siete exponentes' },
    evaluated: { en: 'the group’s constant times the product of the inputs raised to their exponents', es: 'la constante del grupo por el producto de las entradas elevadas a sus exponentes' },
  },
  {
    kind: 'kuznetsov-transfer',
    stored: { en: 'the fitted line of the log rock factor on the log Young modulus', es: 'la recta ajustada del logaritmo del factor de roca sobre el logaritmo del módulo de Young' },
    evaluated: { en: 'returns the rock factor; the browser’s classical equation does the rest', es: 'devuelve el factor de roca; la ecuación clásica del navegador hace el resto' },
  },
];

export function EnginePortableModels({ es, b, index }: TopicProps) {
  const t = tr(es);
  const models = index?.models ?? [];
  const total = models.reduce((s, m) => s + m.bytes, 0);
  const fixtures = b?.corpus_rows && b.holdout_rows ? b.corpus_rows.length + b.holdout_rows.length : undefined;
  const arms = models.find((m) => m.scope === 'corpus')?.arms.length;
  return (
    <DocSection
      title={{ en: 'Running a fitted model in the browser', es: 'Correr un modelo ajustado en el navegador' }}
      area="engine"
      refs={IMPLEMENTATION_REFS['i-models']}
    >
      <p>
        {t(
          'The learned arms are fitted offline with numpy, scikit-learn and xgboost, which a browser does not have, and ONNX Runtime Web has no tree-ensemble kernel. So the engine exports each fitted model as plain JSON (the network’s weights, the support vectors, and every tree as four arrays: left child, right child, feature, and threshold or leaf), and the App walks them in TypeScript. A forest of 76 trees is most of what needs to run, which is why a custom format won over the usual route.',
          'Los predictores aprendidos se ajustan sin conexión con numpy, scikit-learn y xgboost, que un navegador no tiene, y ONNX Runtime Web no trae un núcleo para ensambles de árboles. Así que el motor exporta cada modelo ajustado como JSON plano (los pesos de la red, los vectores de soporte, y cada árbol como cuatro arreglos: hijo izquierdo, hijo derecho, variable y umbral u hoja), y la App los recorre en TypeScript. Un bosque de 76 árboles es casi todo lo que hay que correr, y por eso un formato propio se impuso a la vía habitual.',
        )}{' '}
        <Cite id="breiman2001" />{' '}
        <Cite id="chen2016" />{' '}
        <Cite id="smola2004" />
      </p>
      <PortableModelDiagram />
      <p>
        {t(
          `One models file holds one training scope: the withheld campaign, or the whole corpus, with what the arms were fitted on, ${count(arms)} portable arm documents, the fixtures and the content address. The kinds are listed below with what each stores and how it is evaluated. A stacked model stores its forest and its booster as references to the standalone arms, after the stage asserts that the trees are identical, which keeps each file small.`,
          `Un archivo de modelos contiene un alcance de entrenamiento: la campaña retenida, o el corpus completo, con aquello con que se ajustaron los predictores, ${count(arms)} documentos de predictor portátiles, las fijaciones y la dirección de contenido. Los tipos se listan abajo con lo que guarda cada uno y cómo se evalúa. Un modelo apilado guarda su bosque y su potenciación como referencias a los predictores independientes, después de que la etapa verifica que los árboles son idénticos, lo que mantiene pequeño cada archivo.`,
        )}
      </p>
      <div className="fr-scroll-x">
        <table className="fr-table">
          <thead>
            <tr>
              <th>{t('kind', 'tipo')}</th>
              <th>{t('what is stored', 'qué se guarda')}</th>
              <th>{t('how it is evaluated', 'cómo se evalúa')}</th>
            </tr>
          </thead>
          <tbody>
            {KINDS.map((k) => (
              <tr key={k.kind}>
                <td><code>{k.kind}</code></td>
                <td>{es ? k.stored.es : k.stored.en}</td>
                <td>{es ? k.evaluated.es : k.evaluated.en}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        {t(
          'Three details make the walk exact rather than approximate. scikit-learn and XGBoost compare a 32-bit input with the threshold, so the standardised input is rounded to 32 bits before every comparison; XGBoost prints its 32-bit thresholds as short decimals, which have to be rounded back, or 3 of 100 trees took the other branch on one blast where an input equalled a split value; and XGBoost sums its leaves in 32 bits starting from the base value.',
          'Tres detalles hacen que el recorrido sea exacto y no aproximado. scikit-learn y XGBoost comparan una entrada de 32 bits con el umbral, así que la entrada estandarizada se redondea a 32 bits antes de cada comparación; XGBoost imprime sus umbrales de 32 bits como decimales cortos, que hay que volver a redondear, o 3 de 100 árboles tomaban la otra rama en un tiro donde una entrada igualaba un valor de corte; y XGBoost suma sus hojas en 32 bits a partir del valor base.',
        )}{' '}
        <Cite id="goldberg1991" />
      </p>
      <Equation
        tex={String.raw`z_j^{(32)} = \mathrm{fl}_{32}\!\left(\frac{x_j - \mu_j}{\sigma_j}\right),\qquad s_k = \mathrm{fl}_{32}\big(s_{k-1} + \ell_k(z^{(32)})\big),\quad s_0 = \mathrm{fl}_{32}(b_0)`}
        caption={t(
          'The input z standardised with the mean mu and deviation sigma and rounded to 32 bits, and the 32-bit accumulation s of the boosting leaves l from the base value b0; fl32 is Math.fround.',
          'La entrada z estandarizada con la media mu y la desviación sigma y redondeada a 32 bits, y la acumulación de 32 bits s de las hojas l de la potenciación desde el valor base b0; fl32 es Math.fround.',
        )}
      />
      <p>
        {t(
          `Every models file carries, as fixtures, the original model’s prediction at all ${count(fixtures)} published blasts. The browser test reproduces them exactly for the forest, the boosting model and the ensemble, and to a relative difference below 1e-12 for the network, the kernels and the power law, which call an exponential or a power; abstentions must agree too. A second test checks that every learned prediction a case artifact replays is what that case’s models file returns, so the replayed and the live numbers cannot come from two fits. There are ${count(models.length || undefined)} files, one per withheld campaign and one for the whole corpus, ${kb(total)} in all; the browser loads only the one for the open case.`,
          `Cada archivo de modelos trae, como fijaciones, la predicción del modelo original en los ${count(fixtures)} tiros publicados. La prueba del navegador las reproduce exactamente para el bosque, la potenciación y el ensamble, y con una diferencia relativa menor que 1e-12 para la red, los núcleos y la ley de potencia, que llaman a una exponencial o a una potencia; las abstenciones también deben coincidir. Una segunda prueba comprueba que toda predicción aprendida que un artefacto de caso reproduce es la que devuelve el archivo de modelos de ese caso, así que los números reproducidos y los vivos no pueden venir de dos ajustes. Hay ${count(models.length || undefined)} archivos, uno por campaña retenida y uno con el corpus completo, ${kb(total)} en total; el navegador carga solo el del caso abierto.`,
        )}
      </p>
      <Callout variant="note" title={t('Where it works and where it fails', 'Dónde funciona y dónde falla')}>
        {t(
          'A learned number that moves as you drag a control is the fitted model’s number, not an approximation of it. That does not make it reliable outside the training envelope: the model is the same, and what the benchmark measures about it, including its drop with a site held out, applies to your design too. The polynomial kernel is left out of the live arms by choice, because the radial one is the better of the two under every protocol.',
          'Un número aprendido que se mueve cuando usted arrastra un control es el del modelo ajustado, no una aproximación. Eso no lo vuelve confiable fuera de la envolvente de entrenamiento: el modelo es el mismo, y lo que el benchmark mide de él, incluida su caída al excluir un sitio, también vale para su diseño. El núcleo polinómico queda fuera de los predictores en vivo por elección, porque el radial es el mejor de los dos bajo todo protocolo.',
        )}
      </Callout>
    </DocSection>
  );
}
