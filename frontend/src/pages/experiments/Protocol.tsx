/**
 * The protocol (area `protocol`): the leakage-safe, held-out protocol with the forbidden anti-pattern drawn, the three
 * splits and their questions, what is fitted where, and the figures that show it. The protocols that used to sit on the
 * Methodology page are here. The duplicate groups, the campaign sizes and the scores are read from the committed benchmark.
 */

import { Callout, Cite, DocSection, Equation } from '@fasl-work/caos-app-shell';

import { EXPERIMENTS_REFS } from '../../data/citations/experiments';
import { f, facts } from '../../lib/facts';
import { notAvailable } from '../../lib/format';
import { ProtocolDiagram, SafeProtocolDiagram } from '../../viz/Diagrams';
import { LeakageSplitFigure } from '../../viz/figures/experiments';
import { Loading, tr, type TopicProps } from './shared';

export function Protocol({ es, b }: TopicProps) {
  const t = tr(es);
  const F = b ? facts(b) : null;
  const groups = b?.duplicate_groups ?? [];
  const duplicated = groups.flat().length;
  const largest = b ? Math.max(...Object.values(b.site_counts)) : undefined;
  const sites = b?.sites.length;
  const first = groups.find((g) => g.length >= 3)?.[0];
  const campaign = b?.corpus_rows?.find((r) => r.blast_id === first)?.site;
  const published = b?.verdict.published_random_split_figures.stacking;
  const seeds = b?.network_seed_sweep.n_seeds;
  return (
    <DocSection
      title={{ en: 'The protocol: held out, and what it rules out', es: 'El protocolo: con datos retenidos, y lo que descarta' }}
      area="protocol"
      refs={EXPERIMENTS_REFS['e-protocol']}
    >
      <p>
        {t(
          'The benchmark answers five distinct questions, and each has its own experiment. Keeping them apart matters because one number can answer one question and not another: the published figure for a random split answers the first and says nothing about the third. Everything below is the protocol that keeps the questions apart, and the leakage it is built to prevent.',
          'El benchmark responde cinco preguntas distintas, y cada una tiene su experimento. Separarlas importa porque un mismo número puede responder a una y no a otra: la cifra publicada para una partición aleatoria responde la primera y nada dice de la tercera. Todo lo que sigue es el protocolo que mantiene separadas las preguntas, y la fuga que está construido para impedir.',
        )}
      </p>
      <ol className="fr-list">
        <li>{t('How well does each model interpolate between blasts of campaigns it has seen? A hundred random 80/20 splits, the published protocol.', '¿Qué tan bien interpola cada modelo entre tiros de campañas que ya vio? Cien particiones aleatorias 80/20, el protocolo publicado.')}</li>
        <li>{t(`How much of that is due to the ${duplicated || notAvailable()} repeated input vectors? A hundred splits after collapsing the repeats.`, `¿Cuánto de eso se debe a los ${duplicated || notAvailable()} vectores de entrada repetidos? Cien particiones tras colapsar los repetidos.`)}</li>
        <li>{t(`Does it reach a mine it has not seen? ${sites ?? notAvailable()} hold-outs, one whole campaign each, scored together, with a site-resampled interval.`, `¿Llega a una mina que no vio? ${sites ?? notAvailable()} retenciones, una campaña completa cada una, puntuadas juntas, con intervalo por remuestreo de sitios.`)}</li>
        <li>{t('Does the conclusion depend on which rows are scored? Every score of the third question, over every blast and over those with geometry.', '¿Depende la conclusión de qué filas se puntúan? Cada puntaje de la tercera pregunta, sobre todos los tiros y sobre los que tienen geometría.')}</li>
        <li>{t(`Do the published models reproduce their own figures? The two published hold-outs and a ${seeds ?? notAvailable()}-seed sweep of the network.`, `¿Reproducen los modelos publicados sus propias cifras? Los dos conjuntos de validación publicados y un barrido de ${seeds ?? notAvailable()} semillas de la red.`)}</li>
      </ol>
      <p>
        {t(
          `Rows within one campaign share a rock mass, a drilling rig, an explosive supply and a measurement method chosen by the people who ran it. One quarry supplies ${largest ?? notAvailable()} of the ${F?.nBlasts ?? notAvailable()} rows, and ${duplicated || notAvailable()} rows duplicate another row’s input vector, in ${groups.length || notAvailable()} groups. A random split therefore places rows of the same campaign, and sometimes the same input vector, on both sides, and a model can score well by recognising the campaign rather than by modelling the blast. Roberts and colleagues set out why data with group structure needs a split that holds out whole groups, and Kapoor and Narayanan catalogue how leakage between training and test rows inflates reported performance.`,
          `Las filas de una campaña comparten macizo rocoso, equipo de perforación, suministro de explosivo y un método de medición elegido por quienes la realizaron. Una cantera aporta ${largest ?? notAvailable()} de las ${F?.nBlasts ?? notAvailable()} filas, y ${duplicated || notAvailable()} filas repiten el vector de entrada de otra, en ${groups.length || notAvailable()} grupos. Una partición aleatoria pone entonces filas de una misma campaña, y a veces el mismo vector de entrada, a ambos lados, y un modelo puede puntuar bien reconociendo la campaña en lugar de modelar el tiro. Roberts y colegas explican por qué los datos con estructura de grupos exigen una partición que retenga grupos enteros, y Kapoor y Narayanan catalogan cómo la fuga entre filas de entrenamiento y de prueba infla el desempeño informado.`,
        )}{' '}
        <Cite id="hudaverdi2010" />{' '}
        <Cite id="roberts2017" />{' '}
        <Cite id="kapoor2023" />
      </p>
      <div className="fr-scroll-x">
        <table className="fr-table">
          <thead>
            <tr>
              <th>{t('protocol', 'protocolo')}</th>
              <th>{t('rule', 'regla')}</th>
              <th>{t('question it answers', 'pregunta que responde')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>random-8020</code></td>
              <td>{t(`seeded random 80/20, repeated ${b?.n_repeats ?? notAvailable()} times`, `80/20 aleatorio con semilla, repetido ${b?.n_repeats ?? notAvailable()} veces`)}</td>
              <td>{t('how does the published protocol behave, draw to draw?', '¿cómo se comporta el protocolo publicado, sorteo a sorteo?')}</td>
            </tr>
            <tr>
              <td><code>dedup-random</code></td>
              <td>{t('duplicate vectors collapsed to one row (mean measured size), then random 80/20, repeated', 'vectores repetidos colapsados a una fila (tamaño medido medio), luego 80/20 aleatorio, repetido')}</td>
              <td>{t('how much of the random score is the duplicates?', '¿cuánto del puntaje aleatorio son los repetidos?')}</td>
            </tr>
            <tr>
              <td><code>leave-one-site-out</code></td>
              <td>{t('each campaign held out once, out-of-fold predictions pooled', 'cada campaña retenida una vez, predicciones fuera de pliegue agrupadas')}</td>
              <td>{t('can a model reach a mine it has not seen?', '¿puede un modelo llegar a una mina que no vio?')}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        {t(
          `The 2025 headline came from the first row of that table. Its source reports a variance explained of ${f(published?.published)} on a random 80/20 split of these same blasts, and records that cross-validation was tried and removed because the cross-validated model predicted its test set poorly, which is the symptom the duplicates predict. Reproduced here, the median of ${b?.n_repeats ?? notAvailable()} such draws is ${f(published?.median_draw)}, and ${published ? Math.round(published.share_of_draws_below * 100) : notAvailable()} percent of the draws fall below the published figure. The protocol therefore scores every learned arm three ways and shows all three, so that the gap is measured rather than argued.`,
          `El titular de 2025 salió de la primera fila de esa tabla. Su fuente informa una varianza explicada de ${f(published?.published)} sobre una partición aleatoria 80/20 de estos mismos tiros, y registra que la validación cruzada se probó y se quitó porque el modelo validado de forma cruzada predecía mal su conjunto de prueba, que es el síntoma que predicen los repetidos. Reproducida aquí, la mediana de ${b?.n_repeats ?? notAvailable()} sorteos así es ${f(published?.median_draw)}, y ${published ? Math.round(published.share_of_draws_below * 100) : notAvailable()} por ciento de los sorteos cae bajo la cifra publicada. El protocolo puntúa por eso cada predictor aprendido de tres formas y muestra las tres, para que la brecha se mida en lugar de discutirse.`,
        )}{' '}
        <Cite id="sui2025" />
      </p>
      {b ? (
        <LeakageSplitFigure
          groups={groups}
          total={F?.nBlasts ?? 0}
          campaign={{ site: campaign ?? notAvailable(), n: campaign ? b.site_counts[campaign] : 0 }}
          published={published?.published ?? null}
        />
      ) : (
        <Loading es={es} />
      )}
      <p>
        {t(
          'Everything that is fitted is fitted on each split’s training rows only: the input scaling, the weights, the trees, the meta-learner and the transfer rock-factor line. What cannot be refitted without the corpus is declared and reported as such: the router and the published regression come fitted by their source on all the blasts, and the site factor of the classical arm is recovered from published predictions for the site itself. The same rule governs the App, where every learned model shown on a real campaign was fitted on the corpus without that campaign, and the bake asserts it for every case.',
          'Todo lo que se ajusta, se ajusta solo con las filas de entrenamiento de cada partición: la escala de las entradas, los pesos, los árboles, el metaaprendiz y la recta del factor de roca de transferencia. Lo que no se puede reajustar sin el corpus se declara y se informa como tal: el enrutador y la regresión publicada vienen ajustados por su fuente sobre todos los tiros, y el factor de sitio del predictor clásico se recupera de predicciones publicadas del propio sitio. La misma regla gobierna la App, donde todo modelo aprendido que se muestra sobre una campaña real se ajustó con el corpus sin esa campaña, y el horneado lo asegura en cada caso.',
        )}
      </p>
      <Equation
        tex={String.raw`\mathcal{T}_c = \mathcal{C} \setminus \{\,i : s(i) = s_c\,\},\qquad \forall\, i \in c:\ i \notin \mathcal{T}_c`}
        caption={t(
          'The training rows of case c: the corpus C without the rows i of the site s_c that the case withholds, and the bake’s assertion that no blast i of the case is among them.',
          'Las filas de entrenamiento del caso c: el corpus C sin las filas i del sitio s_c que el caso retiene, y la aserción del horneado de que ningún tiro i del caso está entre ellas.',
        )}
      />
      <ProtocolDiagram
        scores={{
          random: F?.random('stacking')?.r2_identity,
          dedup: F?.dedup('stacking')?.r2_identity,
          site: F?.site('stacking'),
          arm: es ? 'el ensamble apilado' : 'the stacked ensemble',
        }}
      />
      <p>
        {t(
          'Two controls measure the protocol rather than the blast. The null predicts the mean measured size of the training rows and is the reference every score is read against; the oracle returns the measurement and must score exactly 1 under every protocol and on every row set, which the engine’s tests assert. The App has its own positive control, a case whose blasts carry a measurement set to the formula’s own output, so a correctly implemented arm must reproduce it, and a negative control, a design that no arm may answer.',
          'Dos controles miden el protocolo y no el tiro. El nulo predice el tamaño medido medio de las filas de entrenamiento y es la referencia contra la que se lee cada puntaje; el oráculo devuelve la medición y debe puntuar exactamente 1 bajo todo protocolo y sobre todo conjunto de filas, lo que las pruebas del motor aseguran. La App tiene su propio control positivo, un caso cuyos tiros llevan una medición fijada en la salida de la propia fórmula, de modo que un predictor bien implementado debe reproducirla, y un control negativo, un diseño que ningún predictor puede responder.',
        )}
      </p>
      <SafeProtocolDiagram />
      <p>
        {t(
          'Random splits are still run, a hundred times each, so the size of the difference between protocols is measured and not argued, and no hyperparameter in this product was tuned on any test score: every arm uses its source’s published settings. What is reported at the end is the pooled leave-one-site-out score with its site-resampled interval, never the best of several attempts, and a difference between two arms is a finding only when it is larger than their intervals allow.',
          'Las particiones aleatorias se corren igual, cien veces cada una, para que el tamaño de la diferencia entre protocolos se mida y no se discuta, y ningún hiperparámetro de este producto se ajustó con un puntaje de prueba: cada predictor usa los ajustes publicados por su fuente. Lo que se informa al final es el puntaje agrupado de dejar un sitio fuera con su intervalo por remuestreo de sitios, nunca el mejor de varios intentos, y una diferencia entre dos predictores es un hallazgo solo cuando supera lo que permiten sus intervalos.',
        )}
      </p>
      <Callout variant="honest" title={t('What changed in 0.05.000, and why', 'Lo que cambió en la versión 0.05.000, y por qué')}>
        {t(
          'Before 0.05.000 each random protocol was a single draw of 19 rows, the site hold-out had no interval, and the classical arm and the learned arms were scored on different rows. An adversarial review showed that two claims of that time (that the classical model improves with a site held out, and that deduplication raises the learned scores) were effects of the seed-0 draw, and that the verdict changes with six blasts. The experiments were redesigned to measure those three things.',
          'Antes de la versión 0.05.000 cada protocolo aleatorio era un único sorteo de 19 filas, la retención de sitio no tenía intervalo, y el predictor clásico y los aprendidos se puntuaban sobre filas distintas. Una revisión adversarial mostró que dos afirmaciones de entonces (que el modelo clásico mejora al excluir un sitio y que deduplicar sube los puntajes aprendidos) eran efectos del sorteo de la semilla 0, y que el veredicto cambia con seis tiros. Los experimentos se rediseñaron para medir esas tres cosas.',
        )}
      </Callout>
    </DocSection>
  );
}
