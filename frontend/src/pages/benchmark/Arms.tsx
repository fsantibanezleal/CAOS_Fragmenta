/**
 * Topic 2, every arm: each arm under every protocol (area `results`), each arm on each campaign it did not see (area
 * `results`), and the best learned arm against the classical arms on the rows every size-predicting arm answered (area
 * `comparison`). Every number is read from the committed benchmark.
 */

import { Callout, Cite, DocSection, Equation, Figure, useShellLang } from '@fasl-work/caos-app-shell';

import { SECTION_REFS } from '../../data/citations';
import { IN_SAMPLE_ARMS } from '../../lib/artifacts';
import type { GroupedArmBlock } from '../../lib/contract.types';
import { f, facts, iv } from '../../lib/facts';
import { notAvailable, num } from '../../lib/format';
import { IntervalChart, type IntervalRow, type MarkKind } from '../../viz/Evidence';
import { label, ORDER, tr, type TopicData } from './shared';

export default function Arms({ b }: TopicData) {
  const lang = useShellLang();
  const es = lang === 'es';
  const t = tr(es);
  const F = facts(b);
  const arms = ORDER.filter((arm) => b.protocols['leave-one-site-out'].arms[arm]);
  const rows: IntervalRow[] = arms.map((arm) => {
    const r = F.random(arm)?.repeats;
    const d = F.dedup(arm)?.repeats;
    const g = F.grouped(arm);
    return {
      id: arm,
      label: label(arm, lang),
      note: IN_SAMPLE_ARMS[arm]?.[lang],
      marks: [
        { kind: 'random' as MarkKind, value: r?.median ?? null, low: r?.p05, high: r?.p95 },
        { kind: 'dedup' as MarkKind, value: d?.median ?? null, low: d?.p05, high: d?.p95 },
        { kind: 'site' as MarkKind, value: g?.supports.all.score.r2_identity ?? null, low: g?.supports.all.interval_95?.[0], high: g?.supports.all.interval_95?.[1] },
        { kind: 'site-geometry' as MarkKind, value: g?.supports.geometry.score.r2_identity ?? null, low: g?.supports.geometry.interval_95?.[0], high: g?.supports.geometry.interval_95?.[1] },
      ],
    };
  });
  const labels: Record<MarkKind, string> = {
    random: t('random, median and 5 to 95 percent', 'aleatorio, mediana y 5 a 95 por ciento'),
    dedup: t('deduplicated, median and 5 to 95', 'deduplicado, mediana y 5 a 95'),
    site: t('site held out, all, 95 interval', 'sitio excluido, todos, intervalo 95'),
    'site-geometry': t('site held out, with geometry', 'sitio excluido, con geometría'),
  };

  // The best learned arm on every blast, the worst campaign it meets and what that campaign measures.
  const best = b.verdict.supports.all.best_learned_arm;
  const bestSites = F.grouped(best)?.per_site ?? {};
  const worst = Object.entries(bestSites).reduce<[string, number] | null>((acc, [site, e]) => (e.rmse_m !== undefined && (!acc || e.rmse_m > acc[1]) ? [site, e.rmse_m] : acc), null);
  const worstMean = worst ? bestSites[worst[0]].mean_measured_m : null;

  // The comparison: the classical arms, the best learned arm of each row set and the null, on the common rows.
  const common = (b.protocols['leave-one-site-out'].arms.null as GroupedArmBlock).common;
  const learned = [...new Set([b.verdict.supports.all.best_learned_arm, b.verdict.supports.geometry.best_learned_arm])];
  const compared = ['kuznetsov', 'kuznetsov-transfer', 'kuznetsov-capped', ...learned, 'null'];
  const tier = (arm: string) => (b.protocols['leave-one-site-out'].arms[arm].tier === 'learned' ? t('learned', 'aprendido') : arm === 'null' ? t('control', 'control') : t('classical', 'clásico'));
  const bestCommonArm = learned.reduce((a, arm) => ((F.grouped(arm)?.common?.score.r2_identity ?? -Infinity) > (F.grouped(a)?.common?.score.r2_identity ?? -Infinity) ? arm : a), learned[0]);
  const bestLearnedCommon = F.grouped(bestCommonArm)?.common?.score.r2_identity ?? null;
  const bestLearnedInterval = F.grouped(bestCommonArm)?.common?.interval_95 ?? null;
  const classicalCommon = F.grouped('kuznetsov')?.common?.score.r2_identity ?? null;
  const classicalInterval = F.grouped('kuznetsov')?.common?.interval_95 ?? null;
  const within = (v: number | null, pair: [number, number] | null) => v !== null && pair !== null && v >= pair[0] && v <= pair[1];
  const overlap = within(classicalCommon, bestLearnedInterval) && within(bestLearnedCommon, classicalInterval);
  const learnedAhead = bestLearnedCommon !== null && classicalCommon !== null && bestLearnedCommon > classicalCommon;

  return (
    <>
      <DocSection title={{ en: 'Every arm, every protocol', es: 'Cada brazo, cada protocolo' }} area="results" refs={SECTION_REFS['b-arms']}>
        <p>
          {t(
            'Each row is an arm; each mark, a protocol. The bars of the random protocols run from the 5th to the 95th percentile of a hundred draws; those of the site hold-out are site-resampled 95 percent intervals. Zero is predicting the mean of the scored rows. The random draws score a model on rows from campaigns it has trained on, the deduplicated draws remove the repeated input vectors first, and the site hold-out removes a whole campaign, which is the question a new mine asks.',
            'Cada fila es un brazo; cada marca, un protocolo. Las barras de los protocolos aleatorios van del percentil 5 al 95 de cien sorteos; las de la retención de sitio son intervalos al 95 por ciento por remuestreo de sitios. El cero es predecir la media de las filas puntuadas. Los sorteos aleatorios puntúan un modelo sobre filas de campañas con las que se entrenó, los sorteos deduplicados quitan antes los vectores de entrada repetidos, y la retención de sitio quita una campaña completa, que es la pregunta que hace una mina nueva.',
          )}{' '}
          <Cite id="efron1979" />
        </p>
        <Figure
          caption={t(
            'The variance explained by every arm under the four scores: the median of a hundred random 80/20 draws, of a hundred deduplicated draws, and the pooled leave-one-site-out score on every blast and on the blasts with geometry. The bar is the 5th to 95th percentile of the draws or the site-resampled 95 percent interval; zero is predicting the mean.',
            'La varianza explicada por cada brazo bajo las cuatro puntuaciones: la mediana de cien sorteos aleatorios 80/20, de cien sorteos deduplicados, y la puntuación agrupada con un sitio excluido sobre todos los tiros y sobre los tiros con geometría. La barra es el percentil 5 al 95 de los sorteos o el intervalo al 95 por ciento por remuestreo de sitios; el cero es predecir la media.',
          )}
        >
          <IntervalChart rows={rows} labels={labels} />
        </Figure>
        <div className="fr-scroll-x">
          <table className="fr-table fr-table-wide">
            <thead>
              <tr>
                <th>{t('arm', 'brazo')}</th>
                <th>{t('random', 'aleatorio')}</th>
                <th>{t('deduplicated', 'deduplicado')}</th>
                <th>{t('site held out, all', 'sitio excluido, todos')}</th>
                <th>{t('abst.', 'abst.')}</th>
                <th>{t('with geometry', 'con geometría')}</th>
                <th title={t('the rows every size-predicting arm answered', 'las filas que respondió todo brazo que predice un tamaño')}>{t('common rows', 'filas comunes')}</th>
                <th>RMSE</th>
                <th>{t('fitted on', 'ajustado con')}</th>
              </tr>
            </thead>
            <tbody>
              {arms.map((arm) => {
                const g = F.grouped(arm);
                const p = b.provenance[arm];
                return (
                  <tr key={arm} data-in-sample={p?.in_sample_corpus ? 'true' : undefined}>
                    <td>{label(arm, lang)}</td>
                    <td>{f(F.random(arm)?.r2_identity)}</td>
                    <td>{f(F.dedup(arm)?.r2_identity)}</td>
                    <td className={p?.in_sample_corpus ? 'fr-fine' : (g?.r2_identity ?? -1) > 0 ? 'fr-ok' : 'fr-bad'}>
                      {f(g?.r2_identity)} <span className="fr-fine">{iv(g?.supports.all.interval_95, 2, es)}</span>
                    </td>
                    <td>{g?.n_abstained || ''}</td>
                    <td>{f(g?.supports.geometry.score.r2_identity)}</td>
                    <td>
                      {f(g?.common?.score.r2_identity)} <span className="fr-fine">{iv(g?.common?.interval_95, 2, es)}</span>
                    </td>
                    <td>{g?.rmse_m === null || g?.rmse_m === undefined ? notAvailable() : `${num(g.rmse_m * 100, 1)} cm`}</td>
                    <td className="fr-fine">
                      {p?.in_sample_corpus
                        ? IN_SAMPLE_ARMS[arm]?.[lang] ?? t('in sample', 'dentro de la muestra')
                        : p?.uses_site_constant
                          ? t('the site’s own rock factor', 'factor de roca del propio sitio')
                          : p?.router_in_sample
                            ? t('training rows; router in sample', 'filas de entrenamiento; enrutador en muestra')
                            : t('training rows', 'filas de entrenamiento')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Callout variant="note" title={t('How to read the table', 'Cómo leer la tabla')}>
          {t(
            'The published regression was fitted on these 97 blasts, so its site-held-out column is an in-sample fit and not transfer. The site-factor classical arm uses information about the site itself; the transfer arm does not, and scores almost the same. Arms with abstentions are scored on fewer rows, which is why the with-geometry column compares them all on the same ones.',
            'La regresión publicada se ajustó sobre estos 97 tiros, así que su columna con el sitio excluido es un ajuste dentro de la muestra y no transferencia. El brazo clásico de factor del sitio usa información del propio sitio; el de transferencia no, y puntúa casi lo mismo. Los brazos con abstenciones se puntúan sobre menos filas, por eso la columna con geometría compara a todos sobre las mismas.',
          )}
        </Callout>
      </DocSection>
      <DocSection title={{ en: 'Every arm, every campaign', es: 'Cada brazo, cada campaña' }} area="results" refs={SECTION_REFS['b-persite']}>
        <p>
          {worst
            ? t(
                `The root mean square error, in centimetres, of each arm on each campaign it did not see; an abstention reads as not available, and the last row is the mean measured size of the campaign, the scale an error is read against. The best learned arm on every blast, ${label(best, 'en')}, errs most on ${worst[0]}, by ${num(worst[1] * 100, 1)} cm against a mean measured size of ${num((worstMean ?? 0) * 100, 1)} cm. A pooled score hides this spread: a campaign of seven blasts and one of twenty-two weigh as the rows they hold, and the campaigns differ in rock, rig and measurement.`,
                `La raíz del error cuadrático medio, en centímetros, de cada brazo en cada campaña que no vio; una abstención se lee como no disponible, y la última fila es el tamaño medio medido de la campaña, la escala contra la que se lee un error. El mejor brazo aprendido sobre todos los tiros, ${label(best, 'es')}, yerra más en ${worst[0]}, por ${num(worst[1] * 100, 1)} cm frente a un tamaño medio medido de ${num((worstMean ?? 0) * 100, 1)} cm. Una puntuación agrupada oculta esta dispersión: una campaña de siete tiros y una de veintidós pesan como las filas que contienen, y las campañas difieren en roca, equipo y medición.`,
              )
            : notAvailable()}{' '}
          <Cite id="hudaverdi2010" />
        </p>
        <div className="fr-scroll-x">
          <table className="fr-table fr-table-wide">
            <thead>
              <tr>
                <th>{t('arm, RMSE in cm', 'brazo, RMSE en cm')}</th>
                {b.sites.map((site) => (
                  <th key={site}>{site}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {arms.map((arm) => (
                <tr key={arm}>
                  <td>{label(arm, lang)}</td>
                  {b.sites.map((site) => {
                    const e = F.grouped(arm)?.per_site[site];
                    return <td key={site}>{e?.rmse_m === undefined ? notAvailable() : num(e.rmse_m * 100, 1)}</td>;
                  })}
                </tr>
              ))}
              <tr>
                <td className="fr-fine">{t('mean measured x50', 'x50 medio medido')}</td>
                {b.sites.map((site) => (
                  <td key={site} className="fr-fine">{num(b.site_meta[site].mean_x50_m * 100, 1)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </DocSection>
      <DocSection title={{ en: 'The best learned arm against the classical arm, on the same rows', es: 'El mejor brazo aprendido frente al clásico, sobre las mismas filas' }} area="comparison" refs={SECTION_REFS['b-comparison']}>
        <p>
          {t(
            `Even with geometry, each arm drops its own abstentions, so two arms in the table above are scored on different rows when one refuses a prediction outside the plausible range. The comparison here scores every arm on the rows every size-predicting arm answered: held out by site, ${common.n_rows} blasts from ${common.n_sites} sites. The classical equation scores ${f(classicalCommon)} on those rows and the best learned arm ${f(bestLearnedCommon)}, so on the same rows the learned arm is ${learnedAhead ? 'ahead' : 'behind'}${overlap ? ', and each interval contains the other’s point estimate' : ''}.`,
            `Aun con geometría, cada brazo descarta sus propias abstenciones, así que dos brazos de la tabla de arriba se puntúan sobre filas distintas cuando uno rehúsa una predicción fuera del rango plausible. La comparación de aquí puntúa a todos los brazos sobre las filas que respondió todo brazo que predice un tamaño: con el sitio excluido, ${common.n_rows} tiros de ${common.n_sites} sitios. La ecuación clásica puntúa ${f(classicalCommon)} sobre esas filas y el mejor brazo aprendido ${f(bestLearnedCommon)}, así que sobre las mismas filas el brazo aprendido queda ${learnedAhead ? 'por delante' : 'por detrás'}${overlap ? ', y cada intervalo contiene la estimación puntual del otro' : ''}.`,
          )}{' '}
          <Cite id="kuznetsov1973" />
        </p>
        <Equation
          tex={String.raw`C = \bigcap_{a \in \mathcal{A}} \left\{\, i : \hat y_i^{(a)} \ \text{is not an abstention} \,\right\}`}
          caption={t(
            'The common rows: C is the set of blasts i that every size-predicting arm a in the set of arms A answered with a prediction. Every arm is scored on C, so the denominators agree; C is chosen by the arms’ own refusals, so it is never the set the criterion reads.',
            'Las filas comunes: C es el conjunto de tiros i que todo brazo a que predice un tamaño, del conjunto de brazos A, respondió con una predicción. Todo brazo se puntúa sobre C, de modo que los denominadores coinciden; C lo eligen los propios rechazos de los brazos, así que nunca es el conjunto que lee el criterio.',
          )}
        />
        <div className="fr-scroll-x">
          <table className="fr-table">
            <thead>
              <tr>
                <th>{t('arm', 'brazo')}</th>
                <th>{t('kind', 'clase')}</th>
                <th>{t('random, median on the common rows', 'aleatorio, mediana en las filas comunes')}</th>
                <th>{t('held out by site, common rows', 'sitio excluido, filas comunes')}</th>
                <th>{t('its 95 percent interval', 'su intervalo al 95 por ciento')}</th>
              </tr>
            </thead>
            <tbody>
              {compared.map((arm) => {
                const g = F.grouped(arm);
                return (
                  <tr key={arm}>
                    <td>{label(arm, lang)}</td>
                    <td>{tier(arm)}</td>
                    <td>{f(F.random(arm)?.common?.repeats.median)}</td>
                    <td>{f(g?.common?.score.r2_identity)}</td>
                    <td className="fr-fine">{iv(g?.common?.interval_95, 2, es)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Callout variant="note" title={t('The common rows', 'Las filas comunes')}>
          {t(
            `Those rows are chosen by the arms' own refusals, and an arm refuses where it extrapolates, so the rows left out are the hard ones and every score rises on them. That is why the criterion is evaluated only on the two row sets declared before the run, never on these.`,
            'Esas filas las eligen los propios rechazos de los brazos, y un brazo rehúsa donde extrapola, así que las filas que quedan fuera son las difíciles y todo puntaje sube en ellas. Por eso el criterio se evalúa solo sobre los dos conjuntos declarados antes de la corrida, nunca sobre estos.',
          )}
        </Callout>
      </DocSection>
    </>
  );
}
