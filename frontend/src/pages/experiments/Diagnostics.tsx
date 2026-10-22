/**
 * The diagnostics question (area `question`): the isolation-forest outlier screen, which is reported and never applied, and
 * the two views of which inputs matter, with the mechanism that links the Young modulus to the campaign. The flagged blasts,
 * the importances and the modulus counts are read from the committed benchmark.
 */

import { Callout, Cite, DocSection } from '@fasl-work/caos-app-shell';

import { EXPERIMENTS_REFS } from '../../data/citations/experiments';
import { FEATURE_LABEL } from '../../lib/artifacts';
import { f } from '../../lib/facts';
import { notAvailable, num } from '../../lib/format';
import { RatioTable } from '../../viz/Evidence';
import { armLabel, Loading, tr, type TopicProps } from './shared';

const FEATURES = ['S_over_B', 'H_over_B', 'B_over_D', 'T_over_B', 'Pf_kg_m3', 'XB_m', 'E_GPa'];

export function Diagnostics({ es, b }: TopicProps) {
  const t = tr(es);
  const lang = es ? 'es' : 'en';
  const d = b?.diagnostics;
  const scores = d?.outliers.anomaly_score ?? {};
  const flagged = (d?.outliers.flagged ?? []).map((id) => ({ id, site: b?.corpus_rows?.find((r) => r.blast_id === id)?.site ?? '', score: scores[id] }));
  const native = d?.native_importance ?? {};
  const resampling = d?.resampling_importance ?? {};
  const featureLabel = (name: string) => FEATURE_LABEL[name]?.[lang] ?? name;
  // The modulus is a constant per campaign: the distinct values, and the campaigns whose value no other campaign has.
  const moduli = Object.entries(b?.site_meta ?? {}).map(([site, m]) => [site, m.E_GPa] as const);
  const distinct = new Set(moduli.flatMap(([, e]) => e)).size;
  const unique = moduli.filter(([site, e]) => e.every((v) => !moduli.some(([other, o]) => other !== site && o.includes(v)))).length;
  const published = d?.published_importance ?? {};
  const bySite = Object.entries(d?.outliers.flagged_by_site ?? {});
  return (
    <DocSection
      title={{ en: 'What do the diagnostics say?', es: '¿Qué dicen los diagnósticos?' }}
      area="question"
      refs={EXPERIMENTS_REFS['e-diagnostics']}
    >
      <p>
        {t(
          `An isolation forest separates each point with random cuts and scores it by how many cuts it takes; unusual points are isolated quickly. Huan and colleagues ran such a screen on a 105-sample superset of this corpus and flagged five, which they removed. Here it runs on the seven features and the logarithm of the measured size, at the same rate, and flags ${flagged.length || notAvailable()} of ${d?.outliers.n_blasts ?? notAvailable()}, in ${bySite.length || notAvailable()} campaigns (${bySite.map(([site, n]) => `${site} ${n}`).join(', ')}). It is reported and never applied as a filter, because removing those rows would remove the hardest part of the cross-site question.`,
          `Un bosque de aislamiento separa cada punto con cortes aleatorios y lo califica por cuántos cortes necesita; los puntos raros se aíslan rápido. Huan y colegas pasaron una criba así sobre un superconjunto de 105 muestras de este corpus y marcaron cinco, que eliminaron. Aquí se corre sobre las siete variables y el logaritmo del tamaño medido, con la misma tasa, y marca ${flagged.length || notAvailable()} de ${d?.outliers.n_blasts ?? notAvailable()}, en ${bySite.length || notAvailable()} campañas (${bySite.map(([site, n]) => `${site} ${n}`).join(', ')}). Se informa y nunca se aplica como filtro, porque quitar esas filas quitaría la parte más difícil de la pregunta entre sitios.`,
        )}{' '}
        <Cite id="liu2008" />{' '}
        <Cite id="huan2025" />
      </p>
      {b ? (
        <div className="fr-scroll-x">
          <table className="fr-table">
            <thead>
              <tr>
                <th>{t('blast', 'tiro')}</th>
                <th>{t('site', 'sitio')}</th>
                <th>{t('isolation score', 'puntaje de aislamiento')}</th>
              </tr>
            </thead>
            <tbody>
              {flagged.map((row) => (
                <tr key={row.id}>
                  <td><code>{row.id}</code></td>
                  <td>{row.site}</td>
                  <td>{f(row.score)}</td>
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
          'Two views of which inputs matter. The first reads the internal importance of a forest and a boosting model fitted on the 97 blasts, to compare it with what the 2025 source publishes. The second asks how much worse each arm does on a campaign it has not seen when one of that campaign’s inputs is replaced by values from the training campaigns.',
          'Dos vistas de qué entradas pesan. La primera lee la importancia interna de un bosque y de un modelo de potenciación ajustados sobre los 97 tiros, para compararla con la que publica la fuente de 2025. La segunda pregunta cuánto empeora cada predictor en una campaña que no vio cuando una entrada de esa campaña se reemplaza por valores de las de entrenamiento.',
        )}{' '}
        <Cite id="breiman2001" />{' '}
        <Cite id="chen2016" />{' '}
        <Cite id="sui2025" />
      </p>
      {d ? (
        <RatioTable
          title={t('Importance by feature', 'Importancia por variable')}
          columns={FEATURES.map(featureLabel)}
          rows={[
            { id: 'rf', label: `${armLabel('random-forest', lang)} (${t('impurity', 'impureza')})`, values: FEATURES.map((n) => native['random-forest']?.values[n] ?? null) },
            { id: 'xgb', label: `${armLabel('xgboost', lang)} (${native.xgboost?.kind ?? ''})`, values: FEATURES.map((n) => native.xgboost?.values[n] ?? null) },
            ...Object.entries(resampling).map(([arm, report]) => ({
              id: `r-${arm}`,
              label: `${armLabel(arm, lang)} (${t('site held out', 'sitio excluido')})`,
              values: FEATURES.map((n) => report.share[n] ?? null),
            })),
          ]}
          reference={FEATURES.map(() => null)}
          format={(v) => num(v, 3)}
        />
      ) : (
        <Loading es={es} />
      )}
      <p>
        {t(
          `The 2025 source publishes ${f(published['random-forest']?.E_GPa, 4)} for the modulus in its forest and ${f(published.xgboost?.E_GPa, 4)} in its boosting model, first in both; here the forest gives it ${f(native['random-forest']?.values.E_GPa)}, with the same ordering. With the site held out, the learned arms lean on the modulus far more than the equations do. In this corpus the modulus is a constant per campaign: every blast of a campaign has the same value and ${distinct || notAvailable()} values cover ${moduli.length || notAvailable()} campaigns. On a random split it identifies the campaign of a test row; when the campaign is held out, ${unique || notAvailable()} of the ${moduli.length || notAvailable()} have a modulus no training blast has.`,
          `La fuente de 2025 publica ${f(published['random-forest']?.E_GPa, 4)} para el módulo en su bosque y ${f(published.xgboost?.E_GPa, 4)} en su potenciación, ambos primeros; aquí el bosque le da ${f(native['random-forest']?.values.E_GPa)}, con el mismo orden. Con el sitio excluido, los aprendidos se apoyan en el módulo mucho más que las ecuaciones. En este corpus el módulo es una constante por campaña: cada tiro de una campaña tiene el mismo valor y ${distinct || notAvailable()} valores cubren ${moduli.length || notAvailable()} campañas. En una partición aleatoria identifica la campaña de una fila de prueba; al retenerla, ${unique || notAvailable()} de las ${moduli.length || notAvailable()} tienen un módulo que ningún tiro de entrenamiento tiene.`,
        )}
      </p>
      <Callout variant="honest" title={t('A mechanism, not a proof', 'Un mecanismo, no una prueba')}>
        {t(
          'That the modulus works as a campaign label is consistent with the learned arms’ drop when sites are held out, and it is read from these measurements. It is not claimed as the only cause: each campaign’s measurement method and scale change with it too.',
          'Que el módulo funcione como etiqueta de campaña es consistente con la caída de los aprendidos al retener sitios, y se lee de estas mediciones. No se afirma como la única causa: el método de medición y la escala de cada campaña también cambian con ella.',
        )}
      </Callout>
    </DocSection>
  );
}
