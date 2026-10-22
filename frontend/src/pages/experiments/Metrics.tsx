/**
 * The metrics (area `metrics`): the exact equations every score is computed with, the constants of the run read from the
 * committed benchmark, the null, the pooled and repeated summaries, the site-resampled interval and the criterion. The
 * validation metrics that used to sit on the Methodology page are here.
 */

import { Callout, Cite, DocSection, Equation } from '@fasl-work/caos-app-shell';

import { EXPERIMENTS_REFS } from '../../data/citations/experiments';
import { f } from '../../lib/facts';
import { notAvailable } from '../../lib/format';
import { tr, type TopicProps } from './shared';

export function Metrics({ es, b }: TopicProps) {
  const t = tr(es);
  const v = b?.verdict;
  const classical = b?.published_reproduction.published_holdout_arms.classical;
  const miami = b?.site_meta.Miami;
  const reocin = b?.site_meta.Reocin;
  const largest = b ? Math.max(...Object.values(b.site_counts)) : undefined;
  return (
    <DocSection
      title={{ en: 'The metrics, with their constants', es: 'Las métricas, con sus constantes' }}
      area="metrics"
      refs={EXPERIMENTS_REFS['e-metrics']}
    >
      <p>
        {t(
          `Every arm, in every case and protocol, is scored by the same engine functions, and the statistic this product quotes as variance explained is the one about the identity line, which penalises a bias and a wrong scale. The squared correlation the literature reports as R2 is carried beside it, because it does not penalise either. On the ${classical?.n_scored ?? notAvailable()} published hold-out blasts, the classical column has a squared correlation of ${f(classical?.pearson_r2)} and a variance explained of ${f(classical?.r2_identity)}: the same predictions read as fairly good or as barely better than a constant, depending on which statistic is called R2.`,
          `Cada predictor, en cada caso y protocolo, se puntúa con las mismas funciones del motor, y el estadístico que este producto cita como varianza explicada es el respecto de la línea de identidad, que penaliza un sesgo y una escala equivocada. La correlación al cuadrado que la literatura reporta como R2 se lleva al lado, porque no penaliza ninguno de los dos. Sobre los ${classical?.n_scored ?? notAvailable()} tiros de validación publicados, la columna clásica tiene una correlación al cuadrado de ${f(classical?.pearson_r2)} y una varianza explicada de ${f(classical?.r2_identity)}: las mismas predicciones parecen bastante buenas o apenas mejores que una constante, según cuál estadístico se llame R2.`,
        )}{' '}
        <Cite id="kulatilake2012" />
      </p>
      <Equation
        tex={String.raw`R^2_{\mathrm{id}} = 1 - \frac{\sum_i (y_i-\hat y_i)^2}{\sum_i (y_i-\bar y)^2},\qquad r = \frac{\sum_i (y_i-\bar y)(\hat y_i-\bar{\hat y})}{\sqrt{\sum_i (y_i-\bar y)^2\,\sum_i (\hat y_i-\bar{\hat y})^2}}`}
        caption={t(
          'Variance explained about the identity line (1 for a perfect prediction, 0 for the mean of the scored rows, negative for worse) and Pearson correlation, whose square is the literature’s R2. y_i is the measured size, ŷ_i the prediction, and the bars are means over the scored rows.',
          'Varianza explicada respecto de la línea de identidad (1 para una predicción perfecta, 0 para la media de las filas puntuadas, negativa si es peor) y correlación de Pearson, cuyo cuadrado es el R2 de la literatura. y_i es el tamaño medido, ŷ_i la predicción, y las barras son medias sobre las filas puntuadas.',
        )}
      />
      <p>
        {t(
          `Errors are also reported in the unit of the target. The root mean square error is reported per site, next to each campaign’s mean measured size, because an error of 0.1 m means something different at Miami, where the mean is ${f(miami?.mean_x50_m, 2)} m, than at Reocin, where it is ${f(reocin?.mean_x50_m, 2)} m. The mean absolute percentage error and the signed bias complete the set. Abstentions are counted and excluded, never replaced by a number; every score carries how many rows were scored and how many were refused, which is why the pooled scores are also reported on a common row set.`,
          `Los errores también se informan en la unidad del objetivo. El error cuadrático medio se informa por sitio, junto al tamaño medio medido de cada campaña, porque un error de 0,1 m significa algo distinto en Miami, donde la media es ${f(miami?.mean_x50_m, 2)} m, que en Reocin, donde es ${f(reocin?.mean_x50_m, 2)} m. El error porcentual absoluto medio y el sesgo con signo completan el conjunto. Las abstenciones se cuentan y se excluyen, nunca se reemplazan por un número; cada puntaje lleva cuántas filas se puntuaron y cuántas se rechazaron, y por eso los puntajes agrupados se informan además sobre un conjunto común de filas.`,
        )}
      </p>
      <Equation
        tex={String.raw`\mathrm{RMSE} = \sqrt{\tfrac{1}{n}\textstyle\sum_i (y_i-\hat y_i)^2},\quad \mathrm{MAE} = \tfrac{1}{n}\textstyle\sum_i |y_i-\hat y_i|,\quad \mathrm{MAPE} = \tfrac{100}{n}\textstyle\sum_i \left|\tfrac{y_i-\hat y_i}{y_i}\right|,\quad \mathrm{bias} = \tfrac{1}{n}\textstyle\sum_i(\hat y_i - y_i)`}
        caption={t(
          'Root mean square error, mean absolute error and bias, in metres, and mean absolute percentage error, in percent, over the n scored rows.',
          'Error cuadrático medio, error absoluto medio y sesgo, en metros, y error porcentual absoluto medio, en porcentaje, sobre las n filas puntuadas.',
        )}
      />
      <p>
        {t(
          `Constants of this run: ${b?.n_repeats ?? notAvailable()} draws per random protocol with consecutive seeds from ${b?.seed ?? notAvailable()}, 20 percent of the rows to test in each draw, ${b?.n_boot ?? notAvailable()} site resamples per interval with the seed 0, and a plausible range of 0.001 to 3 m, outside which a prediction is an abstention with its reason. The null model predicts the mean of each split’s training rows. It is the reference every score is read against, and the oracle, which returns the measurement, must score exactly 1 under every protocol: anything else means the scoring code and not a model is wrong.`,
          `Constantes de esta corrida: ${b?.n_repeats ?? notAvailable()} sorteos por protocolo aleatorio con semillas consecutivas desde ${b?.seed ?? notAvailable()}, 20 por ciento de las filas a prueba en cada sorteo, ${b?.n_boot ?? notAvailable()} remuestreos de sitios por intervalo con la semilla 0, y un rango plausible de 0,001 a 3 m, fuera del cual una predicción es una abstención con su razón. El nulo predice la media de las filas de entrenamiento de cada partición. Es la referencia contra la que se lee cada puntaje, y el oráculo, que devuelve la medición, debe puntuar exactamente 1 bajo todo protocolo: cualquier otro valor significa que el código de puntaje y no un modelo está equivocado.`,
        )}
      </p>
      <Equation
        tex={String.raw`\hat y_i^{\,\mathrm{null}} = \frac{1}{|\mathcal T|}\sum_{j\in\mathcal T} y_j,\qquad \hat y_i^{\,\mathrm{oracle}} = y_i`}
        caption={t(
          'The two controls: the null predicts the mean measured size of the training rows T of the split; the oracle returns the measurement of blast i and scores exactly 1.',
          'Los dos controles: el nulo predice el tamaño medido medio de las filas de entrenamiento T de la partición; el oráculo devuelve la medición del tiro i y puntúa exactamente 1.',
        )}
      />
      <p>
        {t(
          'A repeated protocol is never pooled, because a row lands in several test sets: each draw is scored on its own test rows and the protocol is reported by the median of its draws and their 5th and 95th percentiles, with the quantile interpolated between neighbouring order statistics. Pooling is reserved for the leave-one-site-out protocol, where every blast is predicted exactly once.',
          'Un protocolo repetido nunca se agrupa, porque una fila cae en varios conjuntos de prueba: cada sorteo se puntúa sobre sus propias filas de prueba y el protocolo se informa por la mediana de sus sorteos y sus percentiles 5 y 95, con el cuantil interpolado entre estadísticos de orden vecinos. Agrupar se reserva para el protocolo de dejar un sitio fuera, donde cada tiro se predice exactamente una vez.',
        )}
      </p>
      <Equation
        tex={String.raw`\tilde R^2 = q_{0.5}\{R^2_{\mathrm{id},k}\}_{k=1}^{K},\qquad [\,q_{0.05},\ q_{0.95}\,],\qquad q_p(v) = v_{(\lfloor h \rfloor)} + (h - \lfloor h \rfloor)\big(v_{(\lceil h\rceil)} - v_{(\lfloor h \rfloor)}\big),\ h = (K-1)p`}
        caption={t(
          'A repeated protocol: the median of the K draws and their 5th and 95th percentiles, with the interpolated quantile q_p of the sorted draws v.',
          'Un protocolo repetido: la mediana de los K sorteos y sus percentiles 5 y 95, con el cuantil interpolado q_p de los sorteos ordenados v.',
        )}
      />
      <p>
        {t(
          'Each blast is predicted once, by an arm fitted on the other nine sites, and the pooled out-of-fold predictions are scored together. Averaging per-fold scores instead would weight a six-blast site like the 22-blast quarry, and a per-fold score on six rows of one campaign mostly measures how little that campaign varies. Everything that is fitted is fitted on the training rows of the fold: the input standardisation, the weights, the trees, the meta-learner and the transfer rock-factor line.',
          'Cada tiro se predice una vez, con un predictor ajustado sobre los otros nueve sitios, y las predicciones fuera de pliegue agrupadas se puntúan juntas. Promediar en cambio los puntajes por pliegue le daría a un sitio de seis tiros el mismo peso que a la cantera de 22, y un puntaje por pliegue sobre seis filas de una campaña mide sobre todo cuán poco varía esa campaña. Todo lo que se ajusta se ajusta con las filas de entrenamiento del pliegue: la estandarización de las entradas, los pesos, los árboles, el metaaprendiz y la recta del factor de roca de transferencia.',
        )}
      </p>
      <Equation
        tex={String.raw`R^2_{\mathrm{LOSO}} = 1 - \frac{\sum_{i} \left(y_i - \hat y_i^{(-s(i))}\right)^2}{\sum_i (y_i - \bar y)^2}`}
        caption={t(
          'The pooled leave-one-site-out score: ŷ with superscript −s(i) is the prediction of a model fitted without the site s(i) of blast i, and the sums run over every scored blast once.',
          'El puntaje agrupado de dejar un sitio fuera: ŷ con el superíndice −s(i) es la predicción de un modelo ajustado sin el sitio s(i) del tiro i, y las sumas recorren una vez cada tiro puntuado.',
        )}
      />
      <p>
        {t(
          `The interval of a pooled score resamples campaigns and not blasts: ten sites are drawn with replacement, every blast of each drawn site is kept, the pooled score is recomputed from the out-of-fold predictions already made, and the 2.5th and 97.5th percentiles of the ${b?.n_boot ?? notAvailable()} repetitions are the interval. Resampling blasts would treat the ${largest ?? notAvailable()} blasts of the largest quarry as ${largest ?? notAvailable()} independent observations of how a model transfers to a new mine; they are one observation, repeated. It is a cluster bootstrap, the appropriate one when the rows of a campaign are not independent.`,
          `El intervalo de un puntaje agrupado remuestrea campañas y no tiros: se sortean diez sitios con reposición, se conservan todos los tiros de cada sitio sorteado, el puntaje agrupado se recalcula con las predicciones fuera de pliegue ya hechas, y los percentiles 2,5 y 97,5 de las ${b?.n_boot ?? notAvailable()} repeticiones son el intervalo. Remuestrear tiros trataría los ${largest ?? notAvailable()} tiros de la mayor cantera como ${largest ?? notAvailable()} observaciones independientes de cómo un modelo llega a una mina nueva; son una observación repetida. Es un bootstrap por conglomerados, el adecuado cuando las filas de una campaña no son independientes.`,
        )}{' '}
        <Cite id="efron1979" />{' '}
        <Cite id="field2007" />
      </p>
      <Equation
        tex={String.raw`\left[\,q_{0.025},\ q_{0.975}\,\right]\ \text{of}\ \left\{R^2_{\mathrm{LOSO}}\big(\mathcal S^{*}_k\big)\right\}_{k=1}^{B},\qquad \mathcal S^{*}_k \sim \text{ten sites drawn with replacement},\quad B = 2000`}
        caption={t(
          'The site-resampled interval: B resamples S*_k of the ten sites, each scored with the pooled out-of-fold predictions, and the 2.5th and 97.5th percentiles of the B scores.',
          'El intervalo por remuestreo de sitios: B remuestras S*_k de los diez sitios, cada una puntuada con las predicciones fuera de pliegue agrupadas, y los percentiles 2,5 y 97,5 de los B puntajes.',
        )}
      />
      <p>
        {t(
          `The criterion turns these scores into one decision. The learned tier counts as generalising across sites only if the best learned arm’s pooled score is both positive and at least 0.10 above the null model’s; both halves are required, because a margin over a null that is itself deeply negative is two models failing by different amounts. The pooled null is ${f(v?.supports.all.null_r2_identity)} over every blast and correlates with the measurements at ${f(v?.supports.all.null_pearson_r, 2)}.`,
          `El criterio convierte esos puntajes en una decisión. El nivel aprendido cuenta como generalizando entre sitios solo si el puntaje agrupado del mejor predictor aprendido es positivo y está al menos 0,10 sobre el del modelo nulo; se exigen las dos mitades, porque un margen sobre un nulo que es en sí mismo muy negativo son dos modelos que fallan por cantidades distintas. El nulo agrupado es ${f(v?.supports.all.null_r2_identity)} sobre todos los tiros y se correlaciona con las mediciones en ${f(v?.supports.all.null_pearson_r, 2)}.`,
        )}
      </p>
      <Equation
        tex={String.raw`\text{generalises} \iff R^2_{\mathrm{LOSO}}(\text{best learned}) > 0 \ \wedge\ R^2_{\mathrm{LOSO}}(\text{best learned}) - R^2_{\mathrm{LOSO}}(\text{null}) \ge 0.10`}
        caption={t(
          'The declared criterion, with the margin of 0.10 as the engine writes it: a positive pooled score and a margin of at least 0.10 over the pooled null, both on the same row set.',
          'El criterio declarado, con el margen de 0,10 tal como lo escribe el motor: un puntaje agrupado positivo y un margen de al menos 0,10 sobre el nulo agrupado, ambos sobre el mismo conjunto de filas.',
        )}
      />
      <Callout variant="honest" title={t('A margin over the null is not skill', 'Un margen sobre el nulo no es destreza')}>
        {t(
          `Under leave-one-site-out the null has a property that inflates its margin: holding out a coarse site lowers the training mean, so the null predicts low exactly where the measurement is high, and its pooled predictions correlate with the measurements at ${f(v?.supports.all.null_pearson_r, 2)}. That is why the positivity half of the criterion carries the weight, and why a margin alone is never reported as skill. The squared correlation is exact as a statistic and still not variance explained.`,
          `Bajo dejar un sitio fuera el nulo tiene una propiedad que infla su margen: excluir un sitio grueso baja la media de entrenamiento, así que el nulo predice bajo justo donde la medición es alta, y sus predicciones agrupadas se correlacionan con las mediciones en ${f(v?.supports.all.null_pearson_r, 2)}. Por eso la mitad de positividad del criterio es la que pesa, y por eso un margen solo nunca se informa como destreza. La correlación al cuadrado es exacta como estadístico y aun así no es varianza explicada.`,
        )}
      </Callout>
      <Callout variant="note" title={t('What a curve would need', 'Lo que una curva necesitaría')}>
        {t(
          'For full distributions, the metric would be the mean absolute deviation of the passing fraction over a shared logarithmic grid and the error at P20, P50 and P80. It is not computed because no available set carries a measured curve.',
          'Para las distribuciones completas, la métrica sería la desviación absoluta media de la fracción pasante sobre un enrejado logarítmico común y el error en P20, P50 y P80. No se calcula porque ningún conjunto disponible trae una curva medida.',
        )}
      </Callout>
    </DocSection>
  );
}
