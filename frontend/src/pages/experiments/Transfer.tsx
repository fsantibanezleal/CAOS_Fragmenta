/**
 * The question of the third protocol (area `question`): does a predictor reach a site it has not seen? The answer is the
 * pooled leave-one-site-out verdict on both row sets, the declared criterion in its verbatim wording, and what ten sites
 * can separate. Every score and interval is read from the committed benchmark.
 */

import { Callout, Cite, DocSection } from '@fasl-work/caos-app-shell';

import { EXPERIMENTS_REFS } from '../../data/citations/experiments';
import { f, facts, iv } from '../../lib/facts';
import { notAvailable } from '../../lib/format';
import { SupportsDiagram } from '../../viz/Diagrams';
import { armLabel, Loading, tr, type TopicProps } from './shared';

export function Transfer({ es, b }: TopicProps) {
  const t = tr(es);
  const lang = es ? 'es' : 'en';
  const F = b ? facts(b) : null;
  const v = b?.verdict;
  const all = v?.supports.all;
  const geometry = v?.supports.geometry;
  const rows = b
    ? [
        { key: 'all', label: t('every blast', 'todos los tiros'), s: all! },
        { key: 'geometry', label: t('blasts with resolvable geometry', 'tiros con geometría resoluble'), s: geometry! },
      ]
    : [];
  const classicalInterval = F?.interval('kuznetsov');
  const bestInterval = F?.interval(all?.best_learned_arm ?? 'xgboost');
  const corpusMean = b?.corpus_rows?.length ? b.corpus_rows.reduce((s, r) => s + r.x50_m, 0) / b.corpus_rows.length : undefined;
  const miami = b?.site_meta.Miami;
  const inSample = v?.in_sample_arms[0];
  return (
    <DocSection
      title={{ en: 'Does a predictor reach a site it has not seen?', es: '¿Llega un predictor a un sitio que no vio?' }}
      area="question"
      refs={EXPERIMENTS_REFS['e-transfer']}
    >
      <p>
        {t(
          `The third question is the one that matters for a mine that is not in the corpus, and its protocol holds out one whole campaign at a time. Over every blast (${all?.n_blasts ?? notAvailable()}), the best learned arm held out by site is ${all ? armLabel(all.best_learned_arm, lang) : notAvailable()} at ${f(all?.best_learned_r2_identity)} (${iv(all?.best_learned_interval_95)}), ${f(all?.margin_over_null)} above the null, and the criterion is ${all?.generalises_across_sites ? 'met' : 'not met'}. Over the ${geometry?.n_blasts ?? notAvailable()} blasts with resolvable geometry it is ${geometry ? armLabel(geometry.best_learned_arm, lang) : notAvailable()} at ${f(geometry?.best_learned_r2_identity)} (${iv(geometry?.best_learned_interval_95)}), ${f(geometry?.margin_over_null)} above the null, and the criterion is ${geometry?.generalises_across_sites ? 'met' : 'not met'}. The verdict depends on the row set, and this product reports it that way rather than choosing one.`,
          `La tercera pregunta es la que importa para una mina que no está en el corpus, y su protocolo retiene una campaña completa por vez. Sobre todos los tiros (${all?.n_blasts ?? notAvailable()}), el mejor brazo aprendido con el sitio excluido es ${all ? armLabel(all.best_learned_arm, lang) : notAvailable()} con ${f(all?.best_learned_r2_identity)} (${iv(all?.best_learned_interval_95, 2, true)}), ${f(all?.margin_over_null)} sobre el nulo, y el criterio ${all?.generalises_across_sites ? 'se cumple' : 'no se cumple'}. Sobre los ${geometry?.n_blasts ?? notAvailable()} tiros con geometría resoluble es ${geometry ? armLabel(geometry.best_learned_arm, lang) : notAvailable()} con ${f(geometry?.best_learned_r2_identity)} (${iv(geometry?.best_learned_interval_95, 2, true)}), ${f(geometry?.margin_over_null)} sobre el nulo, y el criterio ${geometry?.generalises_across_sites ? 'se cumple' : 'no se cumple'}. El veredicto depende del conjunto de filas, y este producto lo informa así en lugar de elegir uno.`,
        )}
      </p>
      {b ? (
        <div className="fr-scroll-x">
          <table className="fr-table">
            <thead>
              <tr>
                <th>{t('row set', 'conjunto de filas')}</th>
                <th>{t('blasts', 'tiros')}</th>
                <th>{t('best learned arm', 'mejor brazo aprendido')}</th>
                <th>{t('its score', 'su puntaje')}</th>
                <th>{t('site-resampled 95 percent interval', 'intervalo 95 por ciento por remuestreo de sitios')}</th>
                <th>{t('null', 'nulo')}</th>
                <th>{t('null correlation with the measurements', 'correlación del nulo con las mediciones')}</th>
                <th>{t('margin over the null', 'margen sobre el nulo')}</th>
                <th>{t('meets the criterion', 'cumple el criterio')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ key, label, s }) => (
                <tr key={key}>
                  <td>{label}</td>
                  <td>{s.n_blasts}</td>
                  <td>{armLabel(s.best_learned_arm, lang)}</td>
                  <td>{f(s.best_learned_r2_identity)}</td>
                  <td>{iv(s.best_learned_interval_95, 2, es)}</td>
                  <td>{f(s.null_r2_identity)}</td>
                  <td>{f(s.null_pearson_r, 2)}</td>
                  <td>{f(s.margin_over_null)}</td>
                  <td>{s.generalises_across_sites ? t('yes', 'sí') : t('no', 'no')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Loading es={es} />
      )}
      <p>
        {t(
          'The criterion is a sentence the engine evaluates, in the wording fixed since the first run added its positivity half, and an engine test pins its hash so that a later edit fails the suite. It is quoted as the engine writes it:',
          'El criterio es una oración que el motor evalúa, con la redacción fija desde que la primera corrida le agregó la mitad de positividad, y una prueba del motor fija su resumen para que una edición posterior haga fallar el conjunto de pruebas. Se cita tal como la escribe el motor, en inglés:',
        )}
      </p>
      <blockquote className="fr-fine" lang="en" translate="no">
        {b?.kill_criterion ?? notAvailable()}
      </blockquote>
      <p>
        {t(
          `Its history is part of the answer. It was first written, before the first run, as a margin over the null alone, and that run produced a best learned arm at ${f(all?.best_learned_r2_identity)} against a null at ${f(all?.null_r2_identity)}: the margin-only rule declared that the learned tier generalises, for an arm that does worse than predicting a constant. The positivity half was added then. The two row sets exist for a related reason: the classical arms need an absolute geometry that the Miami campaign does not publish, so they abstain on its ${miami?.n_blasts ?? notAvailable()} blasts, and comparing a classical score over ${geometry?.n_blasts ?? notAvailable()} blasts with a learned score over ${all?.n_blasts ?? notAvailable()} compares different denominators.`,
          `Su historia es parte de la respuesta. Se escribió primero, antes de la primera corrida, como un margen sobre el nulo solamente, y esa corrida dio un mejor brazo aprendido en ${f(all?.best_learned_r2_identity)} contra un nulo en ${f(all?.null_r2_identity)}: la regla de solo margen declaró que el nivel aprendido generaliza, para un brazo que lo hace peor que predecir una constante. Entonces se agregó la mitad de positividad. Los dos conjuntos de filas existen por una razón emparentada: los brazos clásicos necesitan una geometría absoluta que la campaña de Miami no publica, así que se abstienen en sus ${miami?.n_blasts ?? notAvailable()} tiros, y comparar un puntaje clásico sobre ${geometry?.n_blasts ?? notAvailable()} tiros con uno aprendido sobre ${all?.n_blasts ?? notAvailable()} compara denominadores distintos.`,
        )}{' '}
        <Cite id="roberts2017" />
      </p>
      {all && geometry ? (
        <SupportsDiagram
          all={{ n: all.n_blasts, best: all.best_learned_r2_identity, arm: armLabel(all.best_learned_arm, lang) }}
          geometry={{ n: geometry.n_blasts, best: geometry.best_learned_r2_identity, arm: armLabel(geometry.best_learned_arm, lang) }}
        />
      ) : null}
      <p>
        {t(
          `The blasts that separate the two row sets come from Miami, the finest fragments in the corpus, with a mean of ${f(miami?.mean_x50_m, 3)} m against a corpus mean of ${f(corpusMean, 2)} m, and the place where the tree models make some of their largest errors. Apart from the arm its source fitted on this corpus, the ${inSampleLabel(inSample?.[0], lang)} at ${f(inSample?.[1])}, which no split hides a blast from, no arm has an interval above zero on either row set: ${v?.arms_with_interval_above_zero.length ? v.arms_with_interval_above_zero.join(', ') : 'none does'}. The null’s held-out predictions correlate with the measurements at ${f(all?.null_pearson_r, 2)}, so any margin over the null under this protocol is larger than the skill it measures.`,
          `Los tiros que separan los dos conjuntos de filas son de Miami, los fragmentos más finos del corpus, con una media de ${f(miami?.mean_x50_m, 3)} m frente a una media del corpus de ${f(corpusMean, 2)} m, y el lugar donde los modelos de árboles cometen algunos de sus mayores errores. Fuera del brazo que su fuente ajustó sobre este corpus, ${inSampleLabel(inSample?.[0], lang)} con ${f(inSample?.[1])}, al que ninguna partición le oculta un tiro, ningún brazo tiene un intervalo sobre cero en ninguno de los dos conjuntos de filas: ${v?.arms_with_interval_above_zero.length ? v.arms_with_interval_above_zero.join(', ') : 'ninguno lo tiene'}. Las predicciones del nulo con el sitio excluido se correlacionan con las mediciones en ${f(all?.null_pearson_r, 2)}, así que todo margen sobre el nulo bajo este protocolo es mayor que la destreza que mide.`,
        )}{' '}
        <Cite id="field2007" />
      </p>
      <Callout variant="honest" title={t('What ten sites can separate', 'Lo que diez sitios pueden separar')}>
        {t(
          `Outside the arms their source fitted on this corpus, no interval sits above zero: the classical arm runs ${iv(classicalInterval)} and the best learned arm ${iv(bestInterval)}. A statement such as the classical equation transfers and the learned arms do not is a reading of point estimates, and a difference between two arms that does not clear those intervals is not printed here as a finding. The interval is the uncertainty of a corpus-level score, not a prediction interval for one blast, and it does not cover what the corpus does not contain.`,
          `Fuera de los brazos ajustados por su fuente sobre este corpus, ningún intervalo queda por encima de cero: el clásico va de ${iv(classicalInterval, 2, true)} y el mejor aprendido de ${iv(bestInterval, 2, true)}. Una afirmación como la ecuación clásica transfiere y los brazos aprendidos no es una lectura de estimaciones puntuales, y una diferencia entre dos brazos que no supera esos intervalos no se imprime aquí como hallazgo. El intervalo es la incertidumbre de un puntaje a nivel de corpus, no un intervalo de predicción para un tiro, y no cubre lo que el corpus no contiene.`,
        )}
      </Callout>
    </DocSection>
  );
}

/** The label of the arm a source fitted on this corpus, or "not available". */
function inSampleLabel(arm: string | undefined, lang: 'en' | 'es'): string {
  return arm ? armLabel(arm, lang) : notAvailable();
}
