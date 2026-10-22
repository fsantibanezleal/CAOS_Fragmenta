/**
 * Engine, the leakage guards: the withheld-site assertion of the bake, what each arm declares it was fitted on, the two
 * row sets and the non-circularity tests that keep a synthetic case from scoring an arm on its own output (area `engine`).
 * The arm table and the row-set sizes are read from the benchmark.
 */

import { Callout, Cite, DocSection, Equation } from '@fasl-work/caos-app-shell';

import { IMPLEMENTATION_REFS } from '../../data/citations/implementation';
import { LeakageDiagram } from '../../viz/Diagrams';
import { count, tr, type TopicProps } from './shared';

export function EngineLeakage({ es, b }: TopicProps) {
  const t = tr(es);
  const provenance = b ? Object.entries(b.provenance).filter(([, p]) => p.tier !== 'control') : [];
  const all = b?.verdict.supports.all?.n_blasts;
  const geometry = b?.verdict.supports.geometry?.n_blasts;
  const separating = all !== undefined && geometry !== undefined ? all - geometry : undefined;
  return (
    <DocSection
      title={{ en: 'The leakage guards', es: 'Las guardas de fuga' }}
      area="engine"
      refs={IMPLEMENTATION_REFS['i-leakage']}
    >
      <p>
        {t(
          'Every fitted model shown on a real campaign was trained on the corpus without that campaign. The withheld site is stamped on the artifact, the bake fails if any blast of the case appears among the training rows, and the models the browser runs live for that case are exactly the ones from that fit. Kapoor and Narayanan catalogue how leakage between training and test rows inflates reported performance in machine-learning-based science, which is why the assertion is a stop and not a warning.',
          'Todo modelo ajustado que se muestra sobre una campaña real se entrenó con el corpus sin esa campaña. El sitio retenido se estampa en el artefacto, el horneado falla si algún tiro del caso aparece entre las filas de entrenamiento, y los modelos que el navegador corre en vivo para ese caso son exactamente los de ese ajuste. Kapoor y Narayanan catalogan cómo la fuga entre filas de entrenamiento y de prueba infla el desempeño reportado en ciencia con aprendizaje automático, y por eso la aserción detiene el horneado y no solo avisa.',
        )}{' '}
        <Cite id="kapoor2023" />
      </p>
      <Equation
        tex={String.raw`\mathcal{T}_c = \mathcal{C} \setminus \{\,i : s(i) = s_c\,\},\qquad \forall\, i \in c:\ i \notin \mathcal{T}_c`}
        caption={t(
          'The training rows of case c: the corpus C without the rows i of the site s_c that the case withholds, and the bake’s assertion that no blast i of the case is among them.',
          'Las filas de entrenamiento del caso c: el corpus C sin las filas i del sitio s_c que el caso retiene, y la aserción del horneado de que ningún tiro i del caso está entre ellas.',
        )}
      />
      <LeakageDiagram />
      <p>
        {t(
          'Withholding rows is not enough for every arm, and each one declares what it was fitted on. The router and the published regression were fitted by their source on the 97 blasts, so they are in sample under any split; the refitted regression and the network fit their coefficients without the site but choose the group with that router; the classical arm reads a factor recovered from published predictions for the site itself. The table says so arm by arm, read from the artifact.',
          'Retener filas no basta para todos los predictores, y cada uno declara con qué se ajustó. El enrutador y la regresión publicada los ajustó su fuente sobre los 97 tiros, así que están dentro de la muestra bajo cualquier partición; la regresión reajustada y la red ajustan sus coeficientes sin el sitio, pero eligen el grupo con ese enrutador; el predictor clásico lee un factor recuperado de predicciones publicadas para el propio sitio. La tabla lo dice predictor por predictor, leída del artefacto.',
        )}{' '}
        <Cite id="roberts2017" />
      </p>
      {provenance.length ? (
        <div className="fr-scroll-x">
          <table className="fr-table">
            <thead>
              <tr>
                <th>{t('arm', 'predictor')}</th>
                <th>{t('fitted on', 'ajustado con')}</th>
                <th>{t('flag', 'marca')}</th>
              </tr>
            </thead>
            <tbody>
              {provenance.map(([arm, p]) => (
                <tr key={arm}>
                  <td><code>{arm}</code></td>
                  <td className="fr-fine">{p.fitted_on}</td>
                  <td>
                    {p.in_sample_corpus
                      ? t('in sample', 'dentro de la muestra')
                      : p.uses_site_constant
                        ? t('own-site constant', 'constante del propio sitio')
                        : p.router_in_sample
                          ? t('router in sample', 'enrutador en muestra')
                          : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <p>
        {t(
          `The classical arms need an absolute geometry, and the Miami campaign publishes none, so they abstain on its blasts. Comparing a classical score over ${count(geometry)} blasts with a learned score over ${count(all)} compares different denominators, and before release 0.05.000 that comparison set the verdict. Since then every pooled score and the criterion are reported on both row sets: all ${count(all)} corpus blasts, and the ${count(geometry)} whose pattern geometry is resolvable, the rows every arm can answer. The ${count(separating)} blasts that separate them come from Miami, and when the outcome differs between the row sets the page says the verdict depends on the row set instead of choosing one.`,
          `Los predictores clásicos necesitan una geometría absoluta, y la campaña de Miami no publica ninguna, así que se abstienen en sus tiros. Comparar un puntaje clásico sobre ${count(geometry)} tiros con uno aprendido sobre ${count(all)} compara denominadores distintos, y antes de la versión 0.05.000 esa comparación fijaba el veredicto. Desde entonces cada puntaje agrupado y el criterio se informan sobre ambos conjuntos de filas: los ${count(all)} tiros del corpus, y los ${count(geometry)} cuya geometría de malla es resoluble, las filas que todo predictor puede responder. Los ${count(separating)} tiros que los separan son de Miami, y cuando el resultado difiere entre los conjuntos de filas la página dice que el veredicto depende del conjunto de filas en vez de elegir uno.`,
        )}
      </p>
      <p>
        {t(
          `A synthetic case must not score an arm on its own output, and four tests hold that. No synthetic design carries a measured size or a score, so no arm is ever scored on one. No synthetic blast enters the benchmark, which is computed on the ${count(all)} corpus blasts only. Every synthetic design rebuilds with every arm’s prediction disabled, so a design cannot depend on an arm. And the positive control’s truth is exactly the published regression’s own output, circular by design, and its case says that it tests the harness and not the science.`,
          `Un caso sintético no debe puntuar a un predictor sobre su propia salida, y cuatro pruebas lo sostienen. Ningún diseño sintético lleva un tamaño medido ni un puntaje, así que ningún predictor se puntúa jamás sobre uno. Ningún tiro sintético entra al benchmark, que se calcula solo sobre los ${count(all)} tiros del corpus. Todo diseño sintético se reconstruye con la predicción de cada predictor deshabilitada, de modo que un diseño no puede depender de un predictor. Y la verdad del control positivo es exactamente la salida de la propia regresión publicada, circular por diseño, y su caso dice que prueba el arnés y no la ciencia.`,
        )}
      </p>
      <Callout variant="note" title={t('Where it works and where it fails', 'Dónde funciona y dónde falla')}>
        {t(
          'The assertion guarantees that no blast of the case entered the fit. It does not guarantee independence between campaigns: two campaigns from one paper, or on the same rock, share information no protocol can remove, like the two Reocin campaigns with the same 45 GPa modulus. And the in-sample arms stay in the benchmark by design, flagged, so a source’s own fit is never read as transfer; the leakage guards label what is shared, they do not remove it.',
          'La aserción garantiza que ningún tiro del caso entró al ajuste. No garantiza independencia entre campañas: dos campañas de un mismo artículo, o con la misma roca, comparten información que ningún protocolo puede retirar, como las dos de Reocin con el mismo módulo de 45 GPa. Y los predictores dentro de la muestra se quedan en el benchmark por diseño, marcados, para que el ajuste propio de una fuente nunca se lea como transferencia; las guardas de fuga rotulan lo que se comparte, no lo retiran.',
        )}
      </Callout>
    </DocSection>
  );
}
