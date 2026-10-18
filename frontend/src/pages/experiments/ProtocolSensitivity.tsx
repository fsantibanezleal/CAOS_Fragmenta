/**
 * The question of how much the score depends on the protocol (area `question`): every arm across the three protocols, the
 * deduplication shift, the drop when a campaign is held out, and where the published random-split figures fall among
 * the reproduced draws. Every value is read from the committed benchmark.
 */

import { Callout, Cite, DocSection } from '@fasl-work/caos-app-shell';

import { EXPERIMENTS_REFS } from '../../data/citations/experiments';
import { f, facts } from '../../lib/facts';
import { notAvailable, num } from '../../lib/format';
import { LineChart, type SeriesSpec } from '../../viz/Charts';
import { armLabel, Loading, tr, type TopicProps } from './shared';

const TREES_AND_KERNELS = ['random-forest', 'xgboost', 'stacking', 'svr-rbf', 'svr-poly'];

export function ProtocolSensitivity({ es, b }: TopicProps) {
  const t = tr(es);
  const lang = es ? 'es' : 'en';
  const F = b ? facts(b) : null;
  const order: ('random' | 'dedup' | 'site')[] = ['random', 'dedup', 'site'];
  const value = (arm: string, p: 'random' | 'dedup' | 'site') =>
    !F ? null : p === 'random' ? F.random(arm)?.r2_identity ?? null : p === 'dedup' ? F.dedup(arm)?.r2_identity ?? null : F.site(arm);
  const series: SeriesSpec[] = F
    ? [
        ...F.learned.map((arm) => ({
          id: arm,
          label: armLabel(arm, lang),
          values: order.map((p) => {
            const v = value(arm, p);
            return v === null ? null : Math.max(v, -1.05);
          }),
        })),
        { id: 'kuznetsov', label: armLabel('kuznetsov', lang), values: order.map((p) => value('kuznetsov', p)), width: 3 },
      ]
    : [];
  const shifts = b?.verdict.dedup_minus_random_median ?? {};
  const shiftOfTrees = Math.max(...TREES_AND_KERNELS.map((a) => Math.abs(shifts[a] ?? 0)));
  const placed = Object.entries(b?.verdict.published_random_split_figures ?? {});
  const draws = b?.n_repeats;
  return (
    <DocSection
      title={{ en: 'How much does the score depend on the protocol?', es: '¿Cuánto depende el puntaje del protocolo?' }}
      area="question"
      refs={EXPERIMENTS_REFS['e-sensitivity']}
    >
      <p>
        {t(
          'Each line is one arm across the three protocols: the median of a hundred random draws, the median of a hundred deduplicated draws, and the pooled score with each campaign held out. The axis is cut at −1 and anything lower is drawn at the floor, with its value on Benchmark.',
          'Cada línea es un brazo, cruzando los tres protocolos: la mediana de cien sorteos aleatorios, la mediana de cien deduplicados y el puntaje agrupado con cada campaña retenida. El eje se corta en −1 y lo que cae más abajo se dibuja en el piso, con su valor en Benchmark.',
        )}
      </p>
      {F ? (
        <LineChart
          x={[0, 1, 2]}
          series={series}
          xLabel={t('protocol', 'protocolo')}
          yLabel={t('variance explained', 'varianza explicada')}
          height={320}
          zeroLine
          legend
          yRange={[-1.1, 1]}
          xTicks={[0, 1, 2]}
          xRange={[-0.12, 2.12]}
          xTickFormat={(x) => [t('random', 'aleatorio'), t('deduplicated', 'deduplicado'), t('site held out', 'sitio excluido')][Math.round(x)] ?? ''}
          yTickFormat={(x) => num(x, 1)}
          valueFormat={(x) => f(x)}
        />
      ) : (
        <Loading es={es} />
      )}
      <p>
        {t(
          `Deduplicating barely moves anything: each arm’s median shifts by what the table shows, and for the trees, the boosting model and the kernels the shift is at most ${f(shiftOfTrees, 3)}. The drop is in the third column: holding out the whole campaign takes between ${f(F?.learnedGapRange[0], 2)} and ${f(F?.learnedGapRange[1], 2)} of variance explained from every learned arm. The classical arm, with fixed coefficients, predicts the same value for a blast under every protocol, which is why its line is nearly flat.`,
          `Deduplicar casi no mueve nada: la mediana de cada brazo cambia en lo que muestra la tabla, y para los árboles, la potenciación y los núcleos el cambio no pasa de ${f(shiftOfTrees, 3)}. La caída está en la tercera columna: retener la campaña completa le quita a cada brazo aprendido entre ${f(F?.learnedGapRange[0], 2)} y ${f(F?.learnedGapRange[1], 2)} de varianza explicada. El brazo clásico, con coeficientes fijos, predice lo mismo para un tiro bajo cualquier protocolo, y por eso su línea es casi horizontal.`,
        )}
      </p>
      {F && b ? (
        <div className="fr-scroll-x">
          <table className="fr-table">
            <thead>
              <tr>
                <th>{t('arm', 'brazo')}</th>
                <th>{t('random, median', 'aleatorio, mediana')}</th>
                <th>{t('deduplicated minus random', 'deduplicado menos aleatorio')}</th>
                <th>{t('random minus site held out', 'aleatorio menos sitio excluido')}</th>
              </tr>
            </thead>
            <tbody>
              {[...F.learned, 'kuznetsov', 'kuznetsov-transfer', 'kuznetsov-capped'].map((arm) => (
                <tr key={arm}>
                  <td>{armLabel(arm, lang)}</td>
                  <td>{f(F.random(arm)?.r2_identity)}</td>
                  <td>{shifts[arm] === undefined ? notAvailable() : `${shifts[arm] >= 0 ? '+' : ''}${num(shifts[arm], 3)}`}</td>
                  <td>{f(b.verdict.protocol_gap_random_minus_grouped[arm])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <p>
        {t(
          `Where a source reports a figure from one random split of this corpus, the figure is placed among the reproduced draws, by the share of draws below it. ${placed.length ? placed.map(([arm, p]) => `${armLabel(arm, 'en')}: published ${f(p.published)}, median of the reproduced draws ${f(p.median_draw)}, ${Math.round(p.share_of_draws_below * (draws ?? 0))} of ${draws ?? notAvailable()} draws below the published figure`).join('; ') : notAvailable()}. A published figure that sits above nearly every draw is a figure from one favourable split, which is the reading of a single random split that this protocol is built to prevent.`,
          `Donde una fuente informa una cifra de una partición aleatoria de este corpus, la cifra se ubica entre los sorteos reproducidos, por la fracción de sorteos que quedan bajo ella. ${placed.length ? placed.map(([arm, p]) => `${armLabel(arm, 'es')}: publicado ${f(p.published)}, mediana de los sorteos reproducidos ${f(p.median_draw)}, ${Math.round(p.share_of_draws_below * (draws ?? 0))} de ${draws ?? notAvailable()} sorteos bajo la cifra publicada`).join('; ') : notAvailable()}. Una cifra publicada que queda sobre casi todos los sorteos es la cifra de una partición favorable, que es la lectura de una sola partición aleatoria que este protocolo está construido para impedir.`,
        )}{' '}
        <Cite id="sui2025" />{' '}
        <Cite id="roberts2017" />
      </p>
      <p>
        {t(
          'The reason the drop is so large is the structure of the corpus and not a flaw of one learner. Rows of a campaign share a rock, a rig, an explosive supply and a measurement method, so a random split lets a model recognise the campaign of a test row from its training rows, and the learned arms score well; holding the campaign out removes that shortcut and leaves what transfers. Leakage of this kind inflates reported performance in machine-learning-based science generally, and a hundred draws are run precisely so that the inflation is measured here.',
          'La razón de que la caída sea tan grande es la estructura del corpus y no un defecto de un aprendiz. Las filas de una campaña comparten roca, equipo, suministro de explosivo y método de medición, así que una partición aleatoria deja que un modelo reconozca la campaña de una fila de prueba desde sus filas de entrenamiento, y los brazos aprendidos puntúan bien; retener la campaña quita ese atajo y deja lo que transfiere. La fuga de este tipo infla el desempeño informado en la ciencia con aprendizaje automático en general, y se corren cien sorteos justamente para que la inflación se mida aquí.',
        )}{' '}
        <Cite id="kapoor2023" />
      </p>
      <Callout variant="honest" title={t('Two claims withdrawn', 'Dos afirmaciones retiradas')}>
        {t(
          'Before 0.05.000 this page said the classical model improves with a site held out and that deduplication raises the learned scores. Both readings came from the seed-0 draw; over a hundred draws neither holds, and the table shows why.',
          'Antes de la versión 0.05.000 esta página decía que el modelo clásico mejora al excluir un sitio y que deduplicar sube los puntajes aprendidos. Las dos lecturas venían del sorteo de la semilla 0; sobre cien sorteos ninguna se sostiene, y la tabla muestra por qué.',
        )}
      </Callout>
    </DocSection>
  );
}
