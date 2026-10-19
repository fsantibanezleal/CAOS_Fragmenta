/**
 * Topic 3, classical: from the mean size to a passing curve (Rosin-Rammler, Swebrec, the crush-zone composition), the
 * in-situ block cap the engine declares, and the timing revision of 2005. No dataset available carries a measured curve,
 * so no shape is validated here; the cap's effect on the mean size is read from the committed benchmark.
 */

import { Callout, Cite, DocSection, Equation, useShellLang } from '@fasl-work/caos-app-shell';

import { SECTION_REFS } from '../../data/citations';
import type { BenchmarkArtifact, GroupedArmBlock } from '../../lib/contract.types';
import { f, iv } from '../../lib/facts';
import { notAvailable } from '../../lib/format';
import { DistributionShapesDiagram } from '../../viz/Diagrams';
import type { TopicData } from './shared';

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
          ? 'Una voladura rompe bloques y no los une, así que ningún fragmento puede ser mayor que el bloque in situ del que salió. Las fuentes describen la voladura justamente como la transformación de la distribución de bloques in situ en la de fragmentos, pero la ecuación clásica nunca lee el tamaño de bloque. Ninguna fuente disponible imprime un límite, así que el motor implementa uno como una elección declarada, no como una relación publicada, y sobre una curva pasante lee la masa sobre el bloque como bloques sin romper a ese tamaño en vez de renormalizarla, porque renormalizar la movería a los finos sin que ningún mecanismo lo respalde:'
          : 'A blast breaks blocks and does not fuse them, so no fragment can be larger than the in-situ block it came from. The sources describe blasting as exactly that transformation, from the in-situ block size distribution to the blasted one, yet the classical equation never reads the block size. No source held for this work prints a cap, so the engine implements one as a declared choice, not a published relation, and on a passing curve it reads the mass above the block as unbroken blocks at that size instead of renormalising it, because renormalising would move that mass into the fines with no mechanism to support it:'}{' '}
        <Cite id="hudaverdi2010" />
      </p>
      <Equation
        tex={String.raw`x_{50,\mathrm{cap}} = \min\left(x_{50},\; X_B\right)`}
        caption={es ? 'El límite in situ, una elección declarada de blastfrag 0.4.0; X_B es el tamaño de bloque in situ.' : 'The in-situ cap, a declared choice of blastfrag 0.4.0; X_B is the in-situ block size.'}
      />
      <p>
        {es
          ? `En el corpus el límite actúa en ${f(moved.length, 0)} tiros (${moved.join(', ') || notAvailable()}), donde la predicción clásica supera el bloque; ningún tamaño medido en ninguna parte lo supera. Con el sitio excluido lleva el brazo clásico de ${f(classical?.r2_identity)} a ${f(capped?.r2_identity)}, con un intervalo que sigue cruzando el cero (${iv(capped?.supports.all.interval_95, 2, true)}). Ninguna curva medida valida la forma limitada; solo se puntúa su efecto en el tamaño medio.`
          : `On the corpus the cap binds on ${f(moved.length, 0)} blasts (${moved.join(', ') || notAvailable()}), where the classical prediction exceeds the block; no measured size anywhere exceeds it. Held out by site it moves the classical arm from ${f(classical?.r2_identity)} to ${f(capped?.r2_identity)}, with an interval that still spans zero (${iv(capped?.supports.all.interval_95)}). No measured curve validates the capped shape; only its effect on the mean size is scored.`}
      </p>
    </>
  );
}

export default function Distributions({ b }: TopicData) {
  const es = useShellLang() === 'es';
  return (
    <DocSection
      area="method"
      kind="classical"
      title={{ en: 'From a mean size to a curve', es: 'De un tamaño medio a una curva' }}
      refs={SECTION_REFS['m-distributions']}
    >
      <p>
        {es
          ? 'Una chancadora se especifica contra el 80 por ciento pasante, un límite de sobretamaño y una fracción de finos, que son puntos de la curva lejos de la mediana. La forma de dos parámetros, Rosin-Rammler, escrita sobre el tamaño medio, da la fracción pasante, y su uniformidad sale del índice de Cunningham del tema anterior:'
          : 'A crusher is specified against the 80 percent passing size, an oversize limit and a fines fraction, which are points on the curve away from the median. The two-parameter Rosin-Rammler form, written on the mean size, gives the fraction passing, and its uniformity comes from Cunningham’s index of the previous topic:'}{' '}
        <Cite id="amoako2022" />
      </p>
      <Equation
        tex={String.raw`P(x) = 1 - \exp\!\left[-0.693\left(\frac{x}{x_{50}}\right)^{n}\right]`}
        caption={es ? 'Amoako et al. 2022, Ec. 5. El 0,693 es ln 2, lo que hace de x50 el tamaño al 50 por ciento.' : 'Amoako et al. 2022, Eq. 5. The 0.693 is ln 2, which makes x50 the 50 percent size.'}
      />
      <p>
        {es
          ? 'Como el 0,693 es ln 2, x50 es el tamaño al 50 por ciento y no el tamaño característico, por el que pasa el 63,2 por ciento y que vale x50 dividido por 0,693 elevado a 1/n. Cualquier percentil sale entonces en forma cerrada, y el 80 por ciento pasante, el número con que se especifica una chancadora primaria, depende del tamaño medio y del índice de uniformidad y de nada más:'
          : 'Because the 0.693 is ln 2, x50 is the 50 percent size and not the characteristic size, through which 63.2 percent passes and which equals x50 divided by 0.693 to the power 1/n. Any percentile then follows in closed form, and the 80 percent passing size, the number a primary crusher is specified against, depends on the mean size and the uniformity index and on nothing else:'}
      </p>
      <Equation
        tex={String.raw`x_p = x_{50}\left(\frac{-\ln(1-p)}{\ln 2}\right)^{1/n},\qquad P_{80} = x_{50}\left(\frac{\ln 5}{\ln 2}\right)^{1/n}`}
        caption={es ? 'Percentil p de la curva de Rosin-Rammler escrita sobre el tamaño medio; P80 es el tamaño al 80 por ciento pasante.' : 'The p-th percentile of the Rosin-Rammler curve written on the mean size; P80 is the 80 percent passing size.'}
      />
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
          ? 'La tercera forma separa dos mecanismos: la fractura por tracción produce la fracción gruesa y la fractura por compresión y corte en la zona triturada alrededor del barreno produce los finos. La rama gruesa es la curva clásica; la fina tiene su propia uniformidad bajo un tamaño de cruce, y las dos se componen por masa, de modo que la rama de finos lleva exactamente la fracción de masa que se declara. La estructura tiene fuente; sus constantes no, porque los artículos de 1999 que las introducen son actas que no se tienen, así que el tamaño de cruce, la uniformidad y la fracción de finos los fija el usuario, y un cruce igual o mayor que el tamaño medio no deja rama gruesa y el motor lo rechaza.'
          : 'The third form separates two mechanisms: tensile fracturing produces the coarse fraction and compressive-shear fracturing in the crushed zone around the hole produces the fines. The coarse branch is the classical curve; the fine branch has its own uniformity below a crossover size, and the two are composed by mass, so that the fine branch carries exactly the mass fraction that is stated. The structure is sourced; its constants are not, because the 1999 papers that introduce them are proceedings that are not held, so the crossover size, the uniformity and the fines fraction are set by the user, and a crossover at or above the mean size leaves no coarse branch and the engine refuses it.'}{' '}
        <Cite id="amoako2022" />
      </p>
      <Equation
        tex={String.raw`P(x) = w\,P_{\mathrm{RR}}(x;\ x_c,\ n_f) + (1 - w)\,P_{\mathrm{RR}}(x;\ x_{50},\ n),\qquad P_{\mathrm{RR}}(x;\ m,\ k) = 1 - e^{-\ln 2\,(x/m)^{k}}`}
        caption={es ? 'La composición con zona triturada: w fracción de masa de finos, x_c tamaño de cruce con x_c menor que x50, n_f uniformidad de la rama fina; w, x_c y n_f los fija el usuario.' : 'The crush-zone composition: w the fines mass fraction, x_c the crossover size with x_c below x50, n_f the uniformity of the fine branch; w, x_c and n_f are set by the user.'}
      />
      <CapParagraphs es={es} b={b} />
      <p>
        {es
          ? 'Cunningham revisó las dos ecuaciones en 2005, sobre todo por los detonadores electrónicos con retardo: el tamaño medio se multiplica por un factor de tiempo y una corrección del factor de roca, y el índice gana un factor de dispersión del tiempo. Ninguno de esos cuatro multiplicadores está impreso en una fuente primaria que se tenga, así que valen uno por defecto y son parámetros del usuario. El factor de tiempo es un escalar sin estructura espacial: cambiar una conexión o el sentido de iniciación cambia la animación del banco y nada de la predicción.'
          : 'Cunningham revised both equations in 2005, mainly because of electronic delay detonators: the mean size is multiplied by a timing factor and a rock-factor correction, and the index gains a timing-scatter factor. None of those four multipliers is printed in any primary source held for this work, so they default to one and are user parameters. The timing factor is a scalar with no spatial structure: changing a tie-in or the initiation direction changes the bench animation and nothing in the prediction.'}
      </p>
      <DistributionShapesDiagram />
      <Callout variant="honest" title={es ? 'Formas sin validar' : 'Unvalidated shapes'}>
        {es
          ? 'Las tres formas comparten el tamaño medio de la ecuación clásica y solo difieren en la forma, así que para el tamaño medio son un predictor, no tres, y el benchmark lo cuenta una vez. Ningún conjunto disponible para este trabajo trae una curva pasante medida, de modo que ninguna forma se valida aquí; lo que validaría es un conjunto de tiros con el diseño y la curva medida por tamizado o por imágenes calibradas.'
          : 'The three forms share the classical equation’s mean size and differ only in shape, so for the mean size they are one predictor, not three, and the benchmark counts it once. No dataset available for this work carries a measured passing curve, so no shape is validated here; what would validate one is a set of blasts with both the design and a curve measured by sieving or calibrated image analysis.'}
      </Callout>
    </DocSection>
  );
}
