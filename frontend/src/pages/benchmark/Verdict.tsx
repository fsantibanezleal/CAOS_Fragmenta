/**
 * Topic 1, the verdict: the criterion, its outcome on both row sets and the limits that qualify it. The verdict callout
 * is the page's one honest or strong callout (area `caveat`); the two row sets and their table are area `results`.
 */

import { Callout, Cite, DocSection, Equation, useShellLang } from '@fasl-work/caos-app-shell';

import { SECTION_REFS } from '../../data/citations';
import { f, facts, iv } from '../../lib/facts';
import { SupportsDiagram } from '../../viz/Diagrams';
import { label, tr, type TopicData, verdictText } from './shared';

export default function Verdict({ b }: TopicData) {
  const lang = useShellLang();
  const es = lang === 'es';
  const t = tr(es);
  const v = b.verdict;
  const F = facts(b);
  const miami = b.site_meta.Miami;
  const rows = Object.values(b.site_meta).reduce((s, m) => s + m.n_blasts, 0);
  const corpusMean = Object.values(b.site_meta).reduce((s, m) => s + m.n_blasts * m.mean_x50_m, 0) / rows;
  const outside = v.sites_outside_geometry_support.join(', ');
  const nOutside = v.supports.all.n_blasts - v.supports.geometry.n_blasts;
  return (
    <>
      <DocSection
        title={{ en: 'What the verdict says, and what limits it', es: 'Lo que dice el veredicto y lo que lo limita' }}
        area="caveat"
        refs={SECTION_REFS['b-caveat']}
      >
        <Callout variant={v.generalises_across_sites && !v.depends_on_support ? 'note' : 'strong'} title={t('What the benchmark writes', 'Lo que escribe el benchmark')}>
          {verdictText(b, lang)}
        </Callout>
        <p>
          {t(
            `What the benchmark supports without ambiguity: with each campaign held out, every learned arm loses between ${f(F.learnedGapRange[0], 2)} and ${f(F.learnedGapRange[1], 2)} of the variance it explains on random splits. What it cannot separate: the classical equation (${f(F.site('kuznetsov'))}, interval ${iv(F.interval('kuznetsov'))}) and the best learned arm. Outside the published regression, which is in sample, no interval sits above zero.`,
            `Lo que el benchmark sostiene sin ambigüedad: con cada campaña retenida, cada predictor aprendido pierde entre ${f(F.learnedGapRange[0], 2)} y ${f(F.learnedGapRange[1], 2)} de la varianza que explica en las particiones aleatorias. Lo que no puede separar: la ecuación clásica (${f(F.site('kuznetsov'))}, intervalo ${iv(F.interval('kuznetsov'), 2, true)}) y el mejor aprendido. Fuera de la regresión publicada, que está dentro de la muestra, ningún intervalo queda por encima de cero.`,
          )}{' '}
          <Cite id="field2007" />
        </p>
        <p>
          {t(
            `The intervals are wide because the evidence is thin, not because of the method: the resampling draws whole campaigns, the unit that shares a rock, a rig and a measurement method, and ${F.nSites} campaigns are few to draw from. A point estimate that favours one arm is therefore a reading of one realisation of ten sites; the classical equation and the best learned arm differ by less than either interval is wide.`,
            `Los intervalos son anchos porque la evidencia es poca, no por el método: el remuestreo saca campañas completas, la unidad que comparte una roca, un equipo y un método de medición, y ${F.nSites} campañas son pocas para sacar de ellas. Una estimación puntual que favorece a un predictor es entonces la lectura de una realización de diez sitios; la ecuación clásica y el mejor predictor aprendido difieren menos que el ancho de cualquiera de los dos intervalos.`,
          )}{' '}
          <Cite id="efron1979" />
        </p>
        <ul className="fr-list">
          <li>{t('The target is a continuous size, so there is no confusion matrix or ROC curve: the measure is variance explained with its interval, the error and the bias.', 'El objetivo es un tamaño continuo, así que no hay matriz de confusión ni curvas ROC: la medida es la varianza explicada con su intervalo, el error y el sesgo.')}</li>
          <li>{t('The measurement method differs between campaigns and the source states it for only three; part of what separates the campaigns may be how each was measured.', 'El método de medición difiere entre campañas y la fuente lo declara solo para tres; parte de lo que separa a las campañas puede ser cómo se midió cada una.')}</li>
          <li>{t('Full distributions are not scored: no available set carries a measured curve.', 'Las distribuciones completas no se puntúan: ningún conjunto disponible trae una curva medida.')}</li>
          <li>{t('The learned arms are reproductions with published parameters; a new hyperparameter search on this corpus would fall outside what this benchmark measures.', 'Los predictores aprendidos son reproducciones con parámetros publicados; un ajuste nuevo de hiperparámetros sobre este corpus quedaría fuera de lo que este benchmark mide.')}</li>
        </ul>
      </DocSection>
      <DocSection
        title={{ en: 'The criterion, on both row sets', es: 'El criterio, sobre los dos conjuntos de filas' }}
        area="results"
        refs={SECTION_REFS['b-verdict']}
      >
        <p>
          {t(
            'The criterion was first written, before the first run, as a margin over the null alone. That run produced a best learned arm at -0.034 against a null at -0.216, and the margin-only rule declared that the learned tier generalises, for an arm that does worse than a constant; the positivity half was added then. The sentence has not changed since, and an engine test pins its digest. It asks that the best learned arm, with each site held out, explain a positive variance and at least 0.10 more than the null. Since 0.05.000 it is evaluated on two row sets, because the classical arms cannot answer at Miami, and comparing them with the learned arms over different denominators is what set the previous verdict.',
            'El criterio se escribió antes de la primera corrida como un margen sobre el nulo y nada más. Esa corrida dio un mejor predictor aprendido de -0,034 frente a un nulo de -0,216, y la regla de solo margen declaró que el nivel aprendido generaliza para un predictor peor que una constante; entonces se agregó la mitad de positividad. La frase no ha cambiado desde entonces y una prueba del motor fija su resumen. Pide que el mejor predictor aprendido, con cada sitio excluido, explique una varianza positiva y al menos 0,10 más que el nulo. Desde la versión 0.05.000 se evalúa sobre dos conjuntos de filas, porque los predictores clásicos no pueden responder en Miami y compararlos con los aprendidos sobre denominadores distintos fue lo que fijó el veredicto anterior.',
          )}{' '}
          <Cite id="roberts2017" />
        </p>
        <Equation
          tex={String.raw`\text{generalises} \iff R^2_{\mathrm{LOSO}}(\text{best}) > 0 \ \wedge\ R^2_{\mathrm{LOSO}}(\text{best}) - R^2_{\mathrm{LOSO}}(\text{null}) \ge 0.10`}
          caption={t(
            'The kill criterion, as the engine evaluates it. R²_LOSO is the variance explained about the identity line, pooled over the ten folds with one campaign held out each; best is the best learned arm; null predicts the mean of the training rows. Both halves are required.',
            'El criterio de descarte, como lo evalúa el motor. R²_LOSO es la varianza explicada respecto de la recta identidad, agrupada sobre los diez pliegues con una campaña retenida en cada uno; best es el mejor predictor aprendido; null predice la media de las filas de entrenamiento. Se exigen las dos mitades.',
          )}
        />
        <SupportsDiagram
          all={{ n: v.supports.all.n_blasts, best: v.supports.all.best_learned_r2_identity, arm: label(v.supports.all.best_learned_arm, lang) }}
          geometry={{ n: v.supports.geometry.n_blasts, best: v.supports.geometry.best_learned_r2_identity, arm: label(v.supports.geometry.best_learned_arm, lang) }}
        />
        <table className="fr-table">
          <thead>
            <tr>
              <th />
              <th>{es ? `todos (${v.supports.all.n_blasts})` : `all (${v.supports.all.n_blasts})`}</th>
              <th>{es ? `con geometría (${v.supports.geometry.n_blasts})` : `with geometry (${v.supports.geometry.n_blasts})`}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{t('best learned arm', 'mejor predictor aprendido')}</td>
              <td>{label(v.supports.all.best_learned_arm, lang)}: {f(v.supports.all.best_learned_r2_identity)}</td>
              <td>{label(v.supports.geometry.best_learned_arm, lang)}: {f(v.supports.geometry.best_learned_r2_identity)}</td>
            </tr>
            <tr>
              <td>{t('its 95 percent interval', 'su intervalo al 95 por ciento')}</td>
              <td>{iv(v.supports.all.best_learned_interval_95, 2, es)}</td>
              <td>{iv(v.supports.geometry.best_learned_interval_95, 2, es)}</td>
            </tr>
            <tr>
              <td>{t('null', 'nulo')}</td>
              <td>{f(v.supports.all.null_r2_identity)}</td>
              <td>{f(v.supports.geometry.null_r2_identity)}</td>
            </tr>
            <tr>
              <td>{t('margin over the null', 'margen sobre el nulo')}</td>
              <td>{f(v.supports.all.margin_over_null)}</td>
              <td>{f(v.supports.geometry.margin_over_null)}</td>
            </tr>
            <tr>
              <td>{t('meets the criterion', 'cumple el criterio')}</td>
              <td className={v.supports.all.generalises_across_sites ? 'fr-ok' : 'fr-bad'}>{v.supports.all.generalises_across_sites ? t('yes', 'sí') : 'no'}</td>
              <td className={v.supports.geometry.generalises_across_sites ? 'fr-ok' : 'fr-bad'}>{v.supports.geometry.generalises_across_sites ? t('yes', 'sí') : 'no'}</td>
            </tr>
          </tbody>
        </table>
        <p>
          {t(
            `The ${nOutside} blasts that separate the two row sets come from ${outside}, the finest fragments in the corpus (mean ${f(miami.mean_x50_m)} m against a corpus mean of ${f(corpusMean)} m), where the tree models make some of their largest errors. The classical arms need an absolute geometry, the campaign publishes no hole diameter, and so they abstain there; the geometry row set is the set every arm can answer. When the outcome differs between the row sets, the engine writes that the verdict depends on the row set, and this page reports it that way rather than choosing one.`,
            `Los ${nOutside} tiros que separan los dos conjuntos de filas son de ${outside}, los fragmentos más finos del corpus (media de ${f(miami.mean_x50_m)} m frente a una media del corpus de ${f(corpusMean)} m), donde los modelos de árboles cometen algunos de sus mayores errores. Los predictores clásicos necesitan una geometría absoluta, la campaña no publica el diámetro de perforación, y por eso se abstienen allí; el conjunto con geometría es el que todo predictor puede responder. Cuando el resultado difiere entre los conjuntos de filas, el motor escribe que el veredicto depende del conjunto de filas, y esta página lo informa así en vez de elegir uno.`,
          )}
        </p>
      </DocSection>
    </>
  );
}
