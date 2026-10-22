/**
 * Topic 4, classical: the stiffness router (a discriminant), the two published power laws, and the refit of the same
 * functional form on each split's training rows. Scores come from the committed benchmark, the refit's constants from the
 * corpus-scope models file.
 */

import { Callout, Cite, DocSection, Equation, useShellLang } from '@fasl-work/caos-app-shell';

import { SECTION_REFS } from '../../data/citations';
import type { ReproductionBlock } from '../../lib/contract.types';
import { f, facts } from '../../lib/facts';
import { notAvailable } from '../../lib/format';
import { GroupRouterDiagram } from '../../viz/Diagrams';
import { exportedArm, type TopicData } from './shared';

export default function Router({ b, corpus }: TopicData) {
  const es = useShellLang() === 'es';
  const r2010 = b?.published_reproduction['2010'] as ReproductionBlock | undefined;
  const r2012 = b?.published_reproduction['2012'] as ReproductionBlock | undefined;
  const F = b ? facts(b) : null;
  const refit = exportedArm(corpus, 'refitted-regression', 'power-law');
  const c1 = refit?.groups['1']?.intercept;
  const c2 = refit?.groups['2']?.intercept;
  const range = refit?.plausible_x50_m;
  return (
    <DocSection
      area="method"
      kind="classical"
      title={{ en: 'The router and the two regressions', es: 'El enrutador y las dos regresiones' }}
      refs={SECTION_REFS['m-router']}
    >
      <p>
        {es
          ? 'Hudaverdi y colegas separan los 97 tiros por análisis de conglomerados en dos grupos: 35 de módulo alto, con media de 51,14 GPa, y 62 de módulo bajo, con media de 17,22 GPa. El análisis discriminante de la fuente identifica el módulo como el separador dominante (lambda de Wilks 0,161) y encuentra que la razón espaciamiento sobre bordo no influye en la pertenencia. La función discriminante resultante es:'
          : 'Hudaverdi and colleagues separate the 97 blasts by cluster analysis into two groups: 35 high-modulus blasts averaging 51.14 GPa and 62 low-modulus blasts averaging 17.22 GPa. The source’s discriminant analysis identifies the modulus as the dominant separator (Wilks’ lambda 0.161) and finds that the spacing-to-burden ratio has no effect on membership. The resulting discriminant function is:'}{' '}
        <Cite id="hudaverdi2010" />
      </p>
      <Equation
        tex={String.raw`L = 4.467\tfrac{S}{B} - 0.551\tfrac{H}{B} - 0.123\tfrac{B}{D} + 1.642\tfrac{T}{B} - 3.005\,P_f + 0.309\,X_B + 0.208\,E + 3.577`}
        caption={es ? 'Hudaverdi et al. 2010, Ec. 8. Grupo 1 cuando L supera 11,821, el punto medio entre los centroides.' : 'Hudaverdi et al. 2010, Eq. 8. Group 1 when L exceeds 11.821, the midpoint between the centroids.'}
      />
      <p>
        {es
          ? 'Reproduce la pertenencia publicada de los 109 tiros etiquetados sin un error, y los grupos no se traslapan: el mayor valor del grupo bajo es 10,318 y el menor del alto, 13,067. Es una compuerta real, así que enruta diseños que no están en el corpus. El enrutador predice un grupo y no un tamaño, así que como predictor de tamaño se abstiene en todos los tiros, con esa razón; está en la escalera porque las regresiones y la red dependen de él y su exactitud acota la de ellas. Cada grupo tiene su ley de potencia, con siete exponentes:'
          : 'It reproduces the published membership of all 109 labelled blasts with no error, and the groups do not overlap: the low group’s maximum is 10.318 and the high group’s minimum 13.067. It is a real gate, so it routes designs that are not in the corpus. The router predicts a group and not a size, so as a size arm it abstains on every blast, with that reason; it is on the ladder because the regressions and the network depend on it and its accuracy bounds theirs. Each group has its power law, with seven exponents:'}
      </p>
      <Equation
        tex={String.raw`x_{50}^{(1)} = 208\left(\tfrac{S}{B}\right)^{2.788}\left(\tfrac{H}{B}\right)^{0.112}\left(\tfrac{B}{D}\right)^{0.027}\left(\tfrac{T}{B}\right)^{-0.321}P_f^{-0.360}X_B^{0.233}E^{-1.802}`}
        caption={es ? 'Grupo 1, módulo alto, Ec. 9: R² 0,708 sobre 35 tiros, en metros.' : 'Group 1, high modulus, Eq. 9: R² 0.708 on 35 blasts, in metres.'}
      />
      <Equation
        tex={String.raw`x_{50}^{(2)} = 0.60\left(\tfrac{S}{B}\right)^{0.547}\left(\tfrac{H}{B}\right)^{0.535}\left(\tfrac{B}{D}\right)^{0.427}\left(\tfrac{T}{B}\right)^{-0.101}P_f^{-0.115}X_B^{0.434}E^{-1.202}`}
        caption={es ? 'Grupo 2, módulo bajo, Ec. 10: R² 0,739 sobre 62 tiros, en metros.' : 'Group 2, low modulus, Eq. 10: R² 0.739 on 62 blasts, in metres.'}
      />
      <p>
        {es
          ? 'Los dos coeficientes principales difieren por un factor de 347 y ambas ecuaciones devuelven metros. Parece un error de unidades y no lo es: los exponentes del módulo difieren en 0,6 sobre un rango de 9,57 a 60 GPa, y el término del módulo absorbe la diferencia. Se comprobó numéricamente antes de aceptar los coeficientes, y una prueba del motor lo fija. En los signos, el tamaño crece con la razón de espaciamiento, la razón bordo sobre diámetro y el tamaño de bloque, y cae con la razón de taco, el factor de carga y el módulo en los dos grupos.'
          : 'The two leading coefficients differ by a factor of 347 and both equations return metres. It looks like a unit slip and is not: the modulus exponents differ by 0.6 over a range of 9.57 to 60 GPa, and the modulus term absorbs the gap. This was checked numerically before the coefficients were accepted, and an engine test pins it. On the signs, the size rises with the spacing ratio, the burden-to-diameter ratio and the block size, and falls with the stemming ratio, the powder factor and the modulus in both groups.'}
      </p>
      <p>
        {es
          ? `Ambos artículos imprimen estas ecuaciones y además una tabla de predicciones hechas con ellas. Recalcular las ecuaciones y puntuar sobre las mismas filas da más que las tablas: ${f(r2010?.recomputed.r2_identity)} frente a ${f(r2010?.as_published.r2_identity)} sobre los ${r2010?.n_rows ?? notAvailable()} tiros de 2010, y ${f(r2012?.recomputed.r2_identity)} frente a ${f(r2012?.as_published.r2_identity)} sobre los ${r2012?.n_rows ?? notAvailable()} de 2012. Los dos artículos imprimen cifras distintas para cinco filas pese a usar las mismas ecuaciones; el recálculo coincide con la cifra de 2010 en cuatro de ellas y nunca con la de 2012, y la quinta, Ad24, no coincide con ninguna por unos 0,02 m.`
          : `Both papers print these equations and also a table of predictions made with them. Recomputing the equations and scoring on the same rows gives more than the tables: ${f(r2010?.recomputed.r2_identity)} against ${f(r2010?.as_published.r2_identity)} on the ${r2010?.n_rows ?? notAvailable()} blasts of 2010, and ${f(r2012?.recomputed.r2_identity)} against ${f(r2012?.as_published.r2_identity)} on the ${r2012?.n_rows ?? notAvailable()} of 2012. The two papers print different figures for five rows despite using the same equations; the recomputation matches the 2010 figure on four of them and never the 2012 one, and the fifth, Ad24, matches neither by about 0.02 m.`}{' '}
        <Cite id="kulatilake2012" />
      </p>
      <p>
        {es
          ? `El reajuste toma la misma forma funcional y la ajusta sobre las filas de entrenamiento de cada partición. En logaritmos la ley de potencia es lineal, así que es mínimos cuadrados ordinarios sin ningún optimizador. Se niega a ajustar un grupo con siete filas o menos, porque siete exponentes con siete filas son una interpolación, y rechaza una predicción fuera del rango de tamaño plausible de ${range ? f(range[0]) : notAvailable()} a ${range ? f(range[1], 0) : notAvailable()} m, que el motor registra en el modelo exportado. Ajustados sobre todo el corpus, sus coeficientes principales son ${f(c1, 1)} para el grupo 1 y ${f(c2)} para el grupo 2, contra los 208 y 0,60 publicados.`
          : `The refit takes the same functional form and fits it on each split’s training rows. In logarithms the power law is linear, so it is ordinary least squares with no optimiser. It refuses to fit a group with seven or fewer rows, because seven exponents from seven rows is an interpolation, and it refuses a prediction outside the plausible size range of ${range ? f(range[0]) : notAvailable()} to ${range ? f(range[1], 0) : notAvailable()} m, which the engine records in the exported model. Fitted on the whole corpus, its leading coefficients are ${f(c1, 1)} for group 1 and ${f(c2)} for group 2, against the published 208 and 0.60.`}
      </p>
      <Equation
        tex={String.raw`\ln x_{50} = \ln c_g + \sum_{j=1}^{7} \beta_{g,j}\,\ln z_j,\qquad g \in \{1, 2\}\ \text{chosen by the router}`}
        caption={es ? 'El reajuste: z_j son las siete razones de entrada, c_g y β_{g,j} el coeficiente y los exponentes del grupo g, ajustados por mínimos cuadrados sobre las filas de entrenamiento.' : 'The refit: z_j are the seven input ratios, c_g and β_{g,j} the coefficient and the exponents of group g, fitted by least squares on the training rows.'}
      />
      <GroupRouterDiagram />
      <Callout variant="honest" title={es ? 'Dentro de la muestra' : 'In sample'}>
        {es
          ? `La fuente ajustó el enrutador y las dos regresiones sobre estos mismos 97 tiros, así que ningún protocolo que parta este corpus les oculta un tiro: su ${f(F?.site('published-regression'))} con el sitio excluido es su ajuste dentro de la muestra. La prueba de transferencia de esa forma funcional es la regresión reajustada sin cada sitio, que da ${f(F?.site('refitted-regression'))}, y su evidencia fuera de la muestra son los dos conjuntos de validación publicados, de los mismos sitios.`
          : `The source fitted the router and both regressions on these same 97 blasts, so no protocol that splits this corpus hides a blast from them: their ${f(F?.site('published-regression'))} with the site held out is their in-sample fit. The transfer test of that functional form is the regression refitted without each site, which scores ${f(F?.site('refitted-regression'))}, and its out-of-sample evidence is the two published hold-outs, from the same sites.`}
      </Callout>
    </DocSection>
  );
}
