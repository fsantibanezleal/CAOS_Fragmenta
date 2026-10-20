/**
 * Topic 3, the published reproductions: three published models and a null on the paper's own hold-out, where the classical
 * equation stands beside the learned ones on the same twelve rows (area `comparison`); and how robust the published network is
 * to its seed and to its hidden width (area `robustness`). The width sweep keeps its `data-width-sweep` declaration, which the
 * product browser gate reads on this topic.
 */

import { Callout, Cite, DocSection, Equation, useShellLang } from '@fasl-work/caos-app-shell';

import { SECTION_REFS } from '../../data/citations';
import { formatSize } from '../../lib/artifacts';
import type { BenchmarkArtifact, GroupedArmBlock, ReproductionBlock } from '../../lib/contract.types';
import { f } from '../../lib/facts';
import { notAvailable, num } from '../../lib/format';
import { Lines, type LineSpec } from '../../viz/plots';
import { BarsFigure } from '../../viz/figures/benchmark';
import { tr, type TopicData } from './shared';

/** The published network's hidden width: the source's own selection, reproduced, and every width held out by site. */
function WidthSweep({ es, b }: { es: boolean; b: BenchmarkArtifact }) {
  const t = tr(es);
  const ws = b.network_width_sweep;
  const held = ws.leave_one_site_out.filter((row) => !row.published);
  const pub = ws.leave_one_site_out.find((row) => row.published);
  const nullScore = (b.protocols['leave-one-site-out'].arms.null as GroupedArmBlock).r2_identity;
  const series: LineSpec[] = [
    { id: 'all', label: t('every blast', 'cada tiro'), values: held.map((row) => row.supports.all.r2_identity) },
    { id: 'geometry', label: t('with geometry', 'con geometría'), values: held.map((row) => row.supports.geometry.r2_identity) },
    {
      id: 'published',
      label: es ? `par publicado (${ws.published_widths['1']} y ${ws.published_widths['2']})` : `published pair (${ws.published_widths['1']} and ${ws.published_widths['2']})`,
      values: held.map(() => pub?.supports.all.r2_identity ?? null),
      dashed: true,
    },
    { id: 'null', label: t('null: the training mean', 'nulo: la media de entrenamiento'), values: held.map(() => nullScore), dashed: true },
  ];
  const groups: [string, string][] = [
    ['1', t('1, high modulus', '1, módulo alto')],
    ['2', t('2, low modulus', '2, módulo bajo')],
  ];
  return (
    <div data-width-sweep={held.length}>
      <h3>{t('The width of the hidden layer', 'El ancho de la capa oculta')}</h3>
      <p>
        {t(
          `The source swept ${ws.widths[0]} to ${ws.widths[ws.widths.length - 1]} hidden units, ${ws.n_simulations} simulations each, and chose each group's width on its own hold-out. The same procedure, reproduced, does not land on the published widths; and held out by site no width explains any variance or does better than the null, which predicts the training mean.`,
          `La fuente barrió de ${ws.widths[0]} a ${ws.widths[ws.widths.length - 1]} unidades ocultas, ${ws.n_simulations} simulaciones cada una, y eligió el ancho de cada grupo sobre su propio conjunto de validación. El mismo procedimiento, reproducido, no cae en los anchos publicados; y con el sitio excluido ningún ancho explica varianza alguna ni supera al nulo, que predice la media de entrenamiento.`,
        )}
      </p>
      <Lines
        x={held.map((row) => row.hidden['1'])}
        series={series}
        xLabel={t('hidden units, the same in both groups', 'unidades ocultas, igual en ambos grupos')}
        yLabel={t('variance explained, site held out', 'varianza explicada, sitio excluido')}
        height={240}
        zeroLine
        xFormat={{ decimals: 0, grouping: false }}
        xText={(v) => String(Math.round(v))}
        valueText={(v) => f(v)}
      />
      <table className="fr-table">
        <thead>
          <tr>
            <th>{t('group', 'grupo')}</th>
            <th>{t('published', 'publicado')}</th>
            <th>{t('reproduced', 'reproducido')}</th>
            <th>{t('RMSE at the reproduced width, cm', 'RMSE en el reproducido, cm')}</th>
            <th>{t('RMSE at the published width, cm', 'RMSE en el publicado, cm')}</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(([g, name]) => {
            const e = ws.published_protocol[g];
            const atPublished = e.table.find((row) => row.hidden === e.published_optimum)?.rmse ?? null;
            return (
              <tr key={g}>
                <td>{name}</td>
                <td>{e.published_optimum}</td>
                <td>{e.best_hidden}</td>
                <td>{num(e.best_rmse * 100, 1)}</td>
                <td>{atPublished === null ? notAvailable() : num(atPublished * 100, 1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Published({ b }: TopicData) {
  const lang = useShellLang();
  const es = lang === 'es';
  const t = tr(es);
  const arms = b.published_reproduction.published_holdout_arms;
  const without = b.published_reproduction.without_the_leaked_row;
  const order = ['classical', 'regression', 'neural-net', 'null'];
  const names: Record<string, string> = {
    classical: t('classical, as published', 'clásico, como se publicó'),
    regression: t('regression, as published', 'regresión, como se publicó'),
    'neural-net': t('neural network, as published', 'red neuronal, como se publicó'),
    null: t('null: the training mean', 'nulo: la media de entrenamiento'),
  };
  const gain = arms.classical?.rmse_m && arms.null?.rmse_m ? 1 - arms.classical.rmse_m / arms.null.rmse_m : null;
  const sweep = b.network_seed_sweep;
  const sorted = [...sweep.r2_identity].filter((v): v is number => v !== null).sort((x, y) => x - y);
  const series: LineSpec[] = [
    { id: 'seeds', label: t('reproduction, per seed', 'reproducción, por semilla'), values: sorted },
    { id: 'published', label: t('published', 'publicado'), values: sorted.map(() => sweep.published), dashed: true },
  ];
  return (
    <>
      <DocSection title={{ en: 'The published hold-outs', es: 'Las validaciones publicadas' }} area="comparison" refs={SECTION_REFS['b-published']}>
        <p>
          {t(
            `The 2012 paper prints, in one table and on the same twelve rows, the predictions of three models. Scored here with a null beside them, the classical equation is the worst of the three and improves on the error of predicting a constant by ${gain === null ? notAvailable() : num(gain * 100, 0)} percent. Those twelve rows come from the same sites as the training rows, so this is the validation the literature reports and not a transfer test.`,
            `El artículo de 2012 imprime, en una misma tabla y sobre las mismas doce filas, las predicciones de tres modelos. Puntuadas aquí con un nulo al lado, la ecuación clásica es la peor de las tres y mejora en ${gain === null ? notAvailable() : num(gain * 100, 0)} por ciento el error de predecir una constante. Esas doce filas son de los mismos sitios que el entrenamiento, así que esta es la validación que reporta la literatura y no una prueba de transferencia.`,
          )}{' '}
          <Cite id="kulatilake2012" />
        </p>
        <BarsFigure
          rows={order.map((key) => ({
            id: key,
            label: names[key],
            value: arms[key]?.r2_identity ?? 0,
            text: f(arms[key]?.r2_identity),
            tone: key === 'null' ? 'muted' : (arms[key]?.r2_identity ?? 0) > 0.5 ? 'good' : 'accent',
          }))}
          domain={[-0.2, 1]}
          ticks={[0, 0.5, 1]}
          tickText={(v) => num(v, 1)}
          axisLabel={t('variance explained on the twelve published rows', 'varianza explicada en las doce filas publicadas')}
          ariaLabel={t('Variance explained by the three published models and the null on the 2012 hold-out', 'Varianza explicada por los tres modelos publicados y el nulo en la validación de 2012')}
          caption={t(
            'The three models the 2012 paper prints for the same twelve hold-out rows, and a null that predicts the training mean, scored here as variance explained about the identity line. The bar is the score; zero is predicting the mean of the twelve rows.',
            'Los tres modelos que el artículo de 2012 imprime para las mismas doce filas de validación, y un nulo que predice la media de entrenamiento, puntuados aquí como varianza explicada respecto de la recta identidad. La barra es el puntaje; el cero es predecir la media de las doce filas.',
          )}
        />
        <table className="fr-table">
          <thead>
            <tr>
              <th>{t('model', 'modelo')}</th>
              <th>{t('variance explained', 'varianza explicada')}</th>
              <th>{t('squared correlation', 'correlación al cuadrado')}</th>
              <th>RMSE</th>
              <th>MAPE</th>
            </tr>
          </thead>
          <tbody>
            {order.map((key) => (
              <tr key={key} className={key === 'null' ? 'fr-row-null' : ''}>
                <td>{names[key]}</td>
                <td className={(arms[key]?.r2_identity ?? 0) > 0 ? 'fr-ok' : 'fr-bad'}>{f(arms[key]?.r2_identity)}</td>
                <td>{f(arms[key]?.pearson_r2)}</td>
                <td>{formatSize(arms[key]?.rmse_m)}</td>
                <td>{arms[key]?.mape_pct === null || arms[key]?.mape_pct === undefined ? notAvailable() : `${num(arms[key]?.mape_pct, 1)}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Equation
          tex={String.raw`\mathrm{MAPE} = \frac{100}{n}\sum_{i=1}^{n}\frac{\lvert y_i - \hat y_i\rvert}{y_i}, \qquad r^2 = \operatorname{corr}(y, \hat y)^2`}
          caption={t(
            'The two other columns of the table: MAPE is the mean absolute percentage error over the n hold-out rows, with y_i the measured size and ŷ_i the prediction; r² is the squared Pearson correlation between measurements and predictions, which ignores a constant offset and so can exceed the variance explained about the identity line.',
            'Las otras dos columnas de la tabla: MAPE es el error porcentual absoluto medio sobre las n filas de validación, con y_i el tamaño medido y ŷ_i la predicción; r² es la correlación de Pearson al cuadrado entre mediciones y predicciones, que ignora un desplazamiento constante y por eso puede superar la varianza explicada respecto de la recta identidad.',
          )}
        />
        <h3>{t('The published equation, recomputed, beats its own table', 'La ecuación publicada, recalculada, supera a su propia tabla')}</h3>
        <table className="fr-table">
          <thead>
            <tr>
              <th>{t('hold-out', 'conjunto')}</th>
              <th>{t('rows', 'filas')}</th>
              <th>{t('the paper’s table', 'tabla del artículo')}</th>
              <th>{t('recomputed', 'recalculada')}</th>
            </tr>
          </thead>
          <tbody>
            {(['2010', '2012'] as const).map((key) => {
              const block = b.published_reproduction[key] as ReproductionBlock | undefined;
              if (!block) return null;
              return (
                <tr key={key}>
                  <td>{key}</td>
                  <td>{block.n_rows}</td>
                  <td>{f(block.as_published.r2_identity)}</td>
                  <td className="fr-ok">{f(block.recomputed.r2_identity)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <h3>{t('One row in both training and validation', 'Una fila en entrenamiento y en validación')}</h3>
        <p>
          {t(
            'Blast Rc1 appears in the 2010 paper’s training table and in the 2012 paper’s hold-out. Removing it barely moves the learned models and adds a great deal to the classical one, because it is that model’s second-worst row.',
            'El tiro Rc1 aparece en la tabla de entrenamiento del artículo de 2010 y en el conjunto de validación del de 2012. Quitarlo apenas mueve los modelos aprendidos y le suma mucho al clásico, porque es su segunda peor fila.',
          )}{' '}
          <Cite id="hudaverdi2010" />
        </p>
        <table className="fr-table">
          <thead>
            <tr>
              <th>{t('model', 'modelo')}</th>
              <th>{t('with Rc1', 'con Rc1')}</th>
              <th>{t('without Rc1', 'sin Rc1')}</th>
            </tr>
          </thead>
          <tbody>
            {['classical', 'regression', 'neural-net'].map((key) => (
              <tr key={key}>
                <td>{names[key]}</td>
                <td>{f(arms[key]?.r2_identity)}</td>
                <td>{f(without[key]?.r2_identity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DocSection>
      <DocSection title={{ en: 'The published network, across seeds and widths', es: 'La red publicada, a lo largo de las semillas y los anchos' }} area="robustness" refs={SECTION_REFS['b-network']}>
        <p>
          {t(
            `The 2012 network is fully specified, so it can be reproduced rather than only reimplemented. Reproduced over ${sweep.n_seeds} seeds, its variance explained on the published hold-out runs from ${f(sweep.min)} to ${f(sweep.max)}, with a median of ${f(sweep.median)}; the published ${f(sweep.published)} lies above every one.`,
            `La red de 2012 está especificada por completo, así que se puede reproducir y no solo reimplementar. Reproducida sobre ${sweep.n_seeds} semillas, su varianza explicada en el conjunto publicado va de ${f(sweep.min)} a ${f(sweep.max)}, con mediana ${f(sweep.median)}; el ${f(sweep.published)} publicado queda por encima de todas.`,
          )}{' '}
          <Cite id="kulatilake2012" />
        </p>
        <Lines
          x={sorted.map((_, i) => i)}
          series={series}
          xLabel={t('seed, sorted', 'semilla, ordenada')}
          yLabel={t('variance explained', 'varianza explicada')}
          height={240}
          xFormat={{ decimals: 0 }}
          xText={(v) => `#${Math.round(v)}`}
          valueText={(v) => f(v)}
        />
        <table className="fr-table">
          <thead>
            <tr>
              <th>{t('blast', 'tiro')}</th>
              <th>{t('measured', 'medido')}</th>
              <th>{t('published', 'publicado')}</th>
              <th>{t('range across seeds', 'rango en las semillas')}</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(sweep.per_blast).map(([id, row]) => {
              const outside = row.min_m !== null && row.max_m !== null && (row.published_m < row.min_m || row.published_m > row.max_m);
              return (
                <tr key={id} className={outside ? 'fr-row-bad' : ''}>
                  <td><code>{id}</code></td>
                  <td>{formatSize(row.measured_m)}</td>
                  <td>{formatSize(row.published_m)}</td>
                  <td>
                    {row.min_m === null ? notAvailable() : `${formatSize(row.min_m)} ${t('to', 'a')} ${formatSize(row.max_m)}`}
                    {outside ? <span className="fr-badge fr-badge-warn">{t('outside the range', 'fuera del rango')}</span> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Callout variant="note" title={t('What is claimed, and what is not', 'Qué se afirma, y qué no')}>
          {t(
            'It is not claimed that the published result is wrong. What the sweep establishes is that it is not robust to the seed; the marked rows, where the published value falls outside everything the reproduction reached, are the rows the source itself reports as its most unstable.',
            'No se afirma que el resultado publicado sea falso. Lo que el barrido establece es que no es robusto a la semilla; las filas marcadas, donde lo publicado queda fuera de todo lo que alcanzó la reproducción, son las que la propia fuente reporta como sus más inestables.',
          )}
        </Callout>
        <WidthSweep es={es} b={b} />
      </DocSection>
    </>
  );
}
