/**
 * Topic 6, learned: the kernel, forest, boosting and stacking arms of the 2022 and 2025 sources, reproduced with their
 * published hyperparameters. The sizes of the exported models and the stacking weights are read from the corpus-scope
 * models file, the scores from the committed benchmark.
 */

import { Callout, Cite, DocSection, Equation, useShellLang } from '@fasl-work/caos-app-shell';

import { SECTION_REFS } from '../../data/citations';
import { f, facts } from '../../lib/facts';
import { notAvailable } from '../../lib/format';
import { EnsembleDiagram } from '../../viz/Diagrams';
import { exportedArm, type TopicData } from './shared';

export default function Ensembles({ b, corpus }: TopicData) {
  const es = useShellLang() === 'es';
  const stack = exportedArm(corpus, 'stacking', 'stacking');
  const weights = stack ? stack.meta.coef : null;
  const forest = exportedArm(corpus, 'random-forest', 'forest');
  const boosting = exportedArm(corpus, 'xgboost', 'xgboost');
  const kernel = exportedArm(corpus, 'svr-rbf', 'svr');
  const F = b ? facts(b) : null;
  const pub = b?.verdict.published_random_split_figures.stacking;
  const poly = b?.verdict.published_random_split_figures['svr-poly'];
  const n = (v: number | undefined) => (v === undefined ? notAvailable() : f(v, 0));
  const percent = (share: number | undefined) => (share === undefined ? notAvailable() : f(Math.round(share * 100), 0));
  return (
    <DocSection
      area="method"
      kind="learned"
      title={{ en: 'Kernels, forests, boosting and the ensemble', es: 'Núcleos, bosques, potenciación y el ensamble' }}
      refs={SECTION_REFS['m-ensembles']}
    >
      <p>
        {es
          ? 'Dos fuentes ajustan regresión por vectores de soporte sobre este mismo corpus y llegan a conclusiones opuestas sobre el núcleo. Amoako y colegas buscan en 2700 combinaciones de cuatro núcleos y eligen uno radial con C 5,25 y épsilon 0,04; Sui y colegas usan uno polinomial de grado 5 con C 1 y lo reportan como el peor de sus tres aprendices. Ambos se reproducen y se mantienen separados, porque promediarlos escondería el desacuerdo. La regresión es una expansión en vectores de soporte, con las entradas estandarizadas:'
          : 'Two sources fit support-vector regression to this same corpus and reach opposite conclusions about the kernel. Amoako and colleagues search 2700 combinations of four kernels and choose a radial one with C 5.25 and epsilon 0.04; Sui and colleagues use a degree-5 polynomial with C 1 and report it as the worst of their three learners. Both are reproduced and kept separate, because averaging them would hide the disagreement. The regression is an expansion over support vectors, with the inputs standardised:'}{' '}
        <Cite id="amoako2022" />{' '}
        <Cite id="sui2025" />{' '}
        <Cite id="smola2004" />
      </p>
      <Equation
        tex={String.raw`\hat y(\mathbf z) = \sum_{i} \alpha_i\,K(\mathbf s_i, \mathbf z) + c,\qquad K_{\mathrm{rbf}} = e^{-\gamma\lVert \mathbf s_i - \mathbf z\rVert^2},\quad K_{\mathrm{poly}} = (\gamma\,\mathbf s_i\!\cdot\!\mathbf z + c_0)^{5}`}
        caption={es ? 'Regresión por vectores de soporte con pérdida insensible a épsilon; s vectores de soporte, α coeficientes duales.' : 'Epsilon-insensitive support-vector regression; s the support vectors, α the dual coefficients.'}
      />
      <Equation
        tex={String.raw`z_j = \frac{x_j - \mu_j}{\sigma_j},\qquad (\mu_j, \sigma_j)\ \text{from the training rows of the split}`}
        caption={es ? 'La estandarización de las entradas: μ_j y σ_j son la media y la desviación de la variable j sobre las filas de entrenamiento de la partición, nunca sobre las de prueba.' : 'The standardisation of the inputs: μ_j and σ_j are the mean and the standard deviation of variable j over the split’s training rows, never over its test rows.'}
      />
      <p>
        {es
          ? 'El bosque aleatorio promedia árboles crecidos sobre muestras bootstrap con subconjuntos aleatorios de variables; la potenciación por gradiente suma árboles pequeños, cada uno ajustado al residuo de los anteriores, escalados por una tasa de aprendizaje. Los parámetros finales publicados son 76 árboles con semilla 27 para el bosque, y tasa 0,5 con semilla 42 para la potenciación, que la fuente misma reporta como sobreajustada.'
          : 'The random forest averages trees grown on bootstrap samples with random subsets of the inputs; gradient boosting adds small trees, each fitted to the residual of the ones before, scaled by a learning rate. The published final parameters are 76 trees at seed 27 for the forest and a rate of 0.5 at seed 42 for the boosting, which the source itself reports as overfitting.'}{' '}
        <Cite id="breiman2001" />{' '}
        <Cite id="chen2016" />
      </p>
      <Equation
        tex={String.raw`\hat y_{\mathrm{RF}} = \frac{1}{M}\sum_{m=1}^{M} T_m(\mathbf z),\qquad \hat y_{\mathrm{XGB}} = b_0 + \sum_{k=1}^{K} \eta\, f_k(\mathbf z)`}
        caption={es ? 'Bosque: promedio de M = 76 árboles. Potenciación: valor base más K árboles escalados por η = 0,5.' : 'Forest: average of M = 76 trees. Boosting: a base value plus K trees scaled by η = 0.5.'}
      />
      <p>
        {es
          ? `Los modelos exportados del corpus completo hacen concretos los tamaños: el bosque tiene ${n(forest?.trees.length)} árboles, la potenciación ${n(boosting?.trees.length)} árboles a partir de un valor base de ${f(boosting?.base_score)} m, y el núcleo radial ${n(kernel?.support_vectors.length)} vectores de soporte con γ = ${f(kernel?.gamma)}. La fuente no imprime cuántos árboles tiene la potenciación, así que se usa el valor por defecto de la biblioteca, y la potenciación reproduce casi exactamente sus filas de entrenamiento, que es lo que significa sobreajuste y no se corrige.`
          : `The exported models of the whole corpus make the sizes concrete: the forest holds ${n(forest?.trees.length)} trees, the boosting model ${n(boosting?.trees.length)} trees from a base value of ${f(boosting?.base_score)} m, and the radial kernel ${n(kernel?.support_vectors.length)} support vectors with γ = ${f(kernel?.gamma)}. The source does not print how many trees the boosting model has, so the library default is used, and the boosting model reproduces its training rows almost exactly, which is what overfitting means and is not tuned away.`}
      </p>
      <p>
        {es
          ? `El ensamble apilado combina el bosque y la potenciación con una regresión lineal. Sui y colegas escriben, al describir su construcción, que intentaron validación cruzada y la cancelaron porque el modelo resultante predecía peor en prueba. En un ensamble apilado, la validación cruzada que se puede cancelar es la que genera las entradas del combinador fuera de muestra, el paso que define el apilamiento según Wolpert; así que este producto ajusta el combinador sobre las predicciones en muestra de los dos aprendices. Ajustado así sobre todo el corpus, sus pesos son ${weights ? f(weights[1], 2) : notAvailable()} para la potenciación y ${weights ? f(weights[0], 2) : notAvailable()} para el bosque.`
          : `The stacked ensemble combines the forest and the boosting model with a linear regression. Sui and colleagues write, while describing its construction, that they tried cross-validation and cancelled it because the resulting model predicted worse on the test set. In a stacked ensemble, the cross-validation that can be cancelled is the one that produces the combiner’s inputs out of sample, the step that defines stacking in Wolpert’s formulation; so this product fits the combiner on the two learners’ in-sample predictions. Fitted that way on the whole corpus, its weights are ${weights ? f(weights[1], 2) : notAvailable()} on the boosting model and ${weights ? f(weights[0], 2) : notAvailable()} on the forest.`}{' '}
        <Cite id="wolpert1992" />
      </p>
      <Equation
        tex={String.raw`\hat y_{\mathrm{stack}} = w_B\,\hat y_{\mathrm{XGB}} + w_F\,\hat y_{\mathrm{RF}} + c,\qquad (w_B, w_F, c) = \arg\min \sum_{i\in\mathrm{train}}\left(y_i - w_B\,\hat y_{\mathrm{XGB}}(\mathbf z_i) - w_F\,\hat y_{\mathrm{RF}}(\mathbf z_i) - c\right)^2`}
        caption={es ? 'El combinador lineal ajustado sobre predicciones en muestra, como lo construye la fuente.' : 'The linear combiner fitted on in-sample predictions, as the source builds it.'}
      />
      <p>
        {es
          ? `Como la potenciación reproduce casi exactamente sus filas de entrenamiento, el combinador le da casi todo el peso, y el ensamble se comporta como su aprendiz de potenciación bajo todo protocolo: ${f(F?.random('stacking')?.r2_identity)} y ${f(F?.random('xgboost')?.r2_identity)} en la partición aleatoria mediana, ${f(F?.site('stacking'))} y ${f(F?.site('xgboost'))} con el sitio excluido. El ${f(pub?.published)} publicado para el ensamble queda por encima de ${percent(pub?.share_of_draws_below)} de cada 100 reproducciones de su protocolo, y el ${f(poly?.published)} del núcleo polinomial por encima de ${percent(poly?.share_of_draws_below)}: una cifra de una sola partición dice poco del método hasta que se la pone entre sus repeticiones.`
          : `Because the boosting model reproduces its training rows almost exactly, the combiner gives it almost all the weight, and the ensemble behaves like its boosting learner under every protocol: ${f(F?.random('stacking')?.r2_identity)} and ${f(F?.random('xgboost')?.r2_identity)} at the median random split, ${f(F?.site('stacking'))} and ${f(F?.site('xgboost'))} with the site held out. The ${f(pub?.published)} published for the ensemble lies above ${percent(pub?.share_of_draws_below)} of 100 reproductions of its protocol, and the ${f(poly?.published)} of the polynomial kernel above ${percent(poly?.share_of_draws_below)}: a figure from one split says little about the method until it is placed among its repeats.`}
      </p>
      <EnsembleDiagram boostingWeight={weights?.[1]} forestWeight={weights?.[0]} />
      <Callout variant="honest" title={es ? 'Dos juegos de parámetros, y una lectura' : 'Two parameter sets, and one reading'}>
        {es
          ? 'La fuente imprime dos juegos de parámetros para sus aprendices: uno al afinarlos solos (bosque con semilla 1 y 50 árboles, potenciación con tasa 1,9) y el final al construir el ensamble. No dice sin ambigüedad cuál produjo sus cifras individuales de 0,797 y 0,758, así que los brazos individuales de este producto usan el final y no se presentan como reproducciones de esas dos cifras. Que la validación cruzada cancelada sea la del combinador es una lectura de este producto; la fuente no detalla el mecanismo.'
          : 'The source prints two parameter sets for its learners: one when tuning them alone (forest at seed 1 with 50 trees, boosting at a rate of 1.9) and the final one when building the ensemble. It does not say unambiguously which produced its standalone figures of 0.797 and 0.758, so this product’s standalone arms use the final set and are not presented as reproductions of those two figures. That the cancelled cross-validation is the combiner’s is this product’s reading; the source does not spell out the mechanism.'}
      </Callout>
    </DocSection>
  );
}
