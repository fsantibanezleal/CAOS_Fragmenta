/**
 * Topic 5, learned: the published neural network of Kulatilake, Hudaverdi and Wu, trained per stiffness group with
 * Levenberg-Marquardt. The widths, the parameter counts and the output range are read from the corpus-scope models file;
 * the seed sweep and the width sweep from the committed benchmark.
 */

import { Callout, Cite, DocSection, Equation, useShellLang } from '@fasl-work/caos-app-shell';

import { SECTION_REFS } from '../../data/citations';
import type { BenchmarkArtifact, GroupedArmBlock } from '../../lib/contract.types';
import { f, facts } from '../../lib/facts';
import { notAvailable } from '../../lib/format';
import { NetworkDiagram } from '../../viz/Diagrams';
import { exportedArm, type TopicData } from './shared';

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
        ? `Ese ancho se eligió sobre las mismas filas con que luego se informó. Reproducido el procedimiento de la fuente sobre el conjunto de 2012, elige ${f(p['1'].best_hidden, 0)} unidades en el grupo de módulo alto y ${f(p['2'].best_hidden, 0)} en el bajo, no ${f(p['1'].published_optimum, 0)} y ${f(p['2'].published_optimum, 0)}; con el sitio excluido, todo ancho de ${f(ws.widths[0], 0)} a ${f(ws.widths[ws.widths.length - 1], 0)} puntúa entre ${f(Math.min(...held))} y ${f(Math.max(...held))}, y el par publicado ${f(pub)}, contra ${f(nullScore)} del nulo. El ancho no explica ni rescata la falla de la red al transferir.`
        : `That width was chosen on the rows it was then reported on. Reproduced on the 2012 set, the source's procedure picks ${f(p['1'].best_hidden, 0)} units for the high-modulus group and ${f(p['2'].best_hidden, 0)} for the low, not ${f(p['1'].published_optimum, 0)} and ${f(p['2'].published_optimum, 0)}; held out by site, every width from ${f(ws.widths[0], 0)} to ${f(ws.widths[ws.widths.length - 1], 0)} scores between ${f(Math.min(...held))} and ${f(Math.max(...held))}, and the published pair ${f(pub)}, against the null's ${f(nullScore)}. The width neither explains nor rescues the network's failure to transfer.`}{' '}
      <Cite id="kulatilake2012" />
    </p>
  );
}

export default function Network({ b, corpus }: TopicData) {
  const es = useShellLang() === 'es';
  const sweep = b?.network_seed_sweep;
  const F = b ? facts(b) : null;
  const net = exportedArm(corpus, 'published-neural-net', 'network');
  const g1 = net?.groups['1'];
  const g2 = net?.groups['2'];
  const sims = g1?.networks.length;
  const params = (hidden: number | undefined) => (hidden === undefined ? notAvailable() : f(9 * hidden + 1, 0));
  const span = (g: typeof g1) => (g ? `${f(g.target_low, 2)} ${es ? 'a' : 'to'} ${f(g.target_high, 2)}` : notAvailable());
  return (
    <DocSection
      area="method"
      kind="learned"
      title={{ en: 'The published neural network', es: 'La red neuronal publicada' }}
      refs={SECTION_REFS['m-network']}
    >
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
      <p>
        {es
          ? 'Ninguna biblioteca de uso general trae Levenberg-Marquardt para redes, y el descenso de gradiente no sería el método publicado, así que el motor lo implementa. Cada paso resuelve un sistema de Gauss-Newton amortiguado, con el jacobiano derivado a mano y comprobado contra una diferencia finita central; la semilla se sortea antes de cualquier entrenamiento, de modo que los pesos iniciales de una red no dependen de cuántos modelos se ajustaron antes en el mismo proceso. El amortiguamiento sube cuando un paso empeora la pérdida, y el paso se parece entonces al descenso de gradiente, y baja cuando la mejora, y se parece a Gauss-Newton.'
          : 'No general-purpose library ships Levenberg-Marquardt for neural networks, and gradient descent would not be the published method, so the engine implements it. Each step solves a damped Gauss-Newton system, with the Jacobian derived by hand and checked against a central finite difference; the seed is drawn before any training, so that a network’s initial weights do not depend on how many models were fitted earlier in the same process. The damping rises when a step worsens the loss, and the step then moves toward gradient descent, and falls when it improves it, toward Gauss-Newton.'}{' '}
        <Cite id="marquardt1963" />
      </p>
      <Equation
        tex={String.raw`\left(J^{\top}J + \lambda I\right)\delta = -J^{\top} r`}
        caption={es ? 'Paso de Levenberg-Marquardt: J jacobiano de los residuos r respecto de los pesos; λ sube si el paso empeora y baja si mejora.' : 'The Levenberg-Marquardt step: J the Jacobian of the residuals r with respect to the weights; λ rises when a step worsens the loss and falls when it improves it.'}
      />
      <p>
        {es
          ? `El ancho N se barrió de 6 a 15, el rango que permiten dos heurísticas publicadas, con ocho simulaciones por ancho; los óptimos publicados son 9 unidades en el grupo de módulo alto y 7 en el bajo, y son los que usa este producto, como lo muestra el modelo exportado (${g1 ? f(g1.n_hidden, 0) : notAvailable()} y ${g2 ? f(g2.n_hidden, 0) : notAvailable()} unidades, ${sims === undefined ? notAvailable() : f(sims, 0)} redes por grupo). La arquitectura es generosa respecto de los datos: una red 7-N-1 tiene 9N + 1 parámetros libres, o sea ${params(g1?.n_hidden)} parámetros libres sobre los 35 tiros del grupo de módulo alto y ${params(g2?.n_hidden)} parámetros libres sobre los 62 del bajo.`
          : `The width N was swept from 6 to 15, the range two published heuristics allow, with eight simulations at each width; the published optima are 9 units for the high-modulus group and 7 for the low one, and those are the widths this product uses, as the exported model shows (${g1 ? f(g1.n_hidden, 0) : notAvailable()} and ${g2 ? f(g2.n_hidden, 0) : notAvailable()} units, ${sims === undefined ? notAvailable() : f(sims, 0)} networks per group). The architecture is generous relative to the data: a 7-N-1 network has 9N + 1 free parameters, that is ${params(g1?.n_hidden)} free parameters on the 35 blasts of the high-modulus group and ${params(g2?.n_hidden)} free parameters on the 62 of the low one.`}
      </p>
      <p>
        {es
          ? `Los objetivos de entrenamiento del modelo exportado abarcan de ${span(g1)} m en el grupo de módulo alto y de ${span(g2)} m en el bajo. La salida de cada red se acota al intervalo unitario antes de volver a ese rango, y las redes del grupo se promedian; el acotamiento importa porque sin él las simulaciones más extremas de una fila promedian a cero y arrastran la varianza explicada de esa fila de positiva a negativa:`
          : `The training targets of the exported model span ${span(g1)} m in the high-modulus group and ${span(g2)} m in the low one. Each network’s output is clamped to the unit interval before it is mapped back to that range, and the networks of the group are averaged; the clamp matters because without it the wildest simulations on a row average to zero and drag that row’s variance explained from positive to negative:`}
      </p>
      <Equation
        tex={String.raw`\hat x_{50} = \frac{1}{K}\sum_{k=1}^{K}\left[\,y_{\mathrm{lo}} + \left(y_{\mathrm{hi}} - y_{\mathrm{lo}}\right)\min\!\left(1,\ \max\!\left(0,\ \hat y_k\right)\right)\right]`}
        caption={es ? 'La salida del modelo exportado: ŷ_k la salida normalizada de la red k, K el número de redes del grupo, y_lo e y_hi el mínimo y el máximo de los objetivos de entrenamiento del grupo, en metros.' : 'The exported model’s output: ŷ_k the normalised output of network k, K the number of networks in the group, y_lo and y_hi the minimum and the maximum of the group’s training targets, in metres.'}
      />
      <WidthParagraph es={es} b={b} />
      <p>
        {es
          ? `Reproducida con su especificación sobre ${sweep?.n_seeds ?? notAvailable()} semillas, la varianza explicada en el conjunto de validación publicado va de ${f(sweep?.min)} a ${f(sweep?.max)}, con mediana ${f(sweep?.median)}. El ${f(sweep?.published)} publicado queda por encima de todas. El déficit se concentra en dos filas, las que la propia fuente reporta como sus más inestables, con coeficientes de variación de 0,56 y 0,76 entre sus ocho simulaciones.`
          : `Reproduced to its specification over ${sweep?.n_seeds ?? notAvailable()} seeds, its variance explained on the published hold-out runs from ${f(sweep?.min)} to ${f(sweep?.max)}, with a median of ${f(sweep?.median)}. The published ${f(sweep?.published)} lies above every one. The shortfall concentrates in two rows, the two the source itself reports as its most unstable, with coefficients of variation of 0.56 and 0.76 across its eight simulations.`}
      </p>
      <p>
        {es
          ? `El acotamiento tiene una consecuencia al excluir un sitio: una red entrenada sin una campaña gruesa no puede predecir un tamaño mayor que el del tiro de entrenamiento más grueso. Las dos campañas de Reocin, las más gruesas del corpus, son donde eso pesa. Con cada sitio excluido, la red publicada explica ${f(F?.site('published-neural-net'))} de la varianza.`
          : `The clamp has a consequence when a site is held out: a network trained without a coarse campaign cannot predict a size above the coarsest training blast. The two Reocin campaigns, the coarsest in the corpus, are where that bites. With each site held out, the published network explains ${f(F?.site('published-neural-net'))} of the variance.`}
      </p>
      <NetworkDiagram />
      <Callout variant="honest" title={es ? 'Qué se afirma, y qué no' : 'What is claimed, and what is not'}>
        {es
          ? 'No se afirma que el resultado publicado sea falso: detalles no registrados, una inicialización o una tirada distinta de simulaciones podrían explicarlo. Lo que el barrido establece es que el puntaje publicado no es robusto a la semilla, en un método cuyo propio artículo lo muestra inestable entre anchos vecinos: en el grupo de módulo bajo, la correlación de su Tabla 7 pasa de 0,11 con seis unidades ocultas a 0,81 con siete y a 0,49 con ocho.'
          : 'It is not claimed that the published result is wrong: unrecorded details, an initialisation scheme or a different simulation draw could account for it. What the sweep establishes is that the published score is not robust to the seed, on a method its own paper shows to be unstable between adjacent widths: in the low-modulus group, the correlation in its Table 7 goes from 0.11 with six hidden units to 0.81 with seven and 0.49 with eight.'}
      </Callout>
    </DocSection>
  );
}
