/**
 * The question of how the predictions respond to the design levers (area `question`): the response map over the burden
 * and spacing plane, the P80 equation behind it, and the two synthetic sweeps that move one lever alone. The sweeps are
 * read from the committed case artifacts; no synthetic blast has a measurement, so a response is shown and no score.
 */

import { Callout, Cite, DocSection, Equation } from '@fasl-work/caos-app-shell';
import { useEffect, useState } from 'react';

import { EXPERIMENTS_REFS } from '../../data/citations/experiments';
import { formatSize, loadCase } from '../../lib/artifacts';
import type { CaseArtifact } from '../../lib/contract.types';
import { f, facts, iv } from '../../lib/facts';
import { num } from '../../lib/format';
import { LineChart, type SeriesSpec } from '../../viz/Charts';
import { ResponseHeatmap } from '../../viz/Evidence';
import { armLabel, Loading, tr, type TopicProps } from './shared';

const SWEPT_ARMS = ['kuznetsov', 'kuznetsov-transfer', 'kuznetsov-capped', 'published-regression', 'random-forest', 'stacking', 'published-neural-net'];

export function Response({ es, b }: TopicProps) {
  const t = tr(es);
  const lang = es ? 'es' : 'en';
  const [powder, setPowder] = useState<CaseArtifact | null>(null);
  const [burden, setBurden] = useState<CaseArtifact | null>(null);
  useEffect(() => {
    loadCase('synth-sweep-powder').then(setPowder).catch(() => setPowder(null));
    loadCase('synth-sweep-burden').then(setBurden).catch(() => setBurden(null));
  }, []);
  const sweep = (artifact: CaseArtifact | null, field: 'Pf_kg_m3' | 'B_over_D') => {
    if (!artifact) return null;
    const x = artifact.blasts.map((blast) => blast.features[field]);
    const series: SeriesSpec[] = SWEPT_ARMS.filter((a) => artifact.predictions[a]).map((a) => ({
      id: a,
      label: armLabel(a, lang),
      values: artifact.blasts.map((blast) => artifact.predictions[a][blast.blast_id]?.x50_m ?? null),
    }));
    return { x, series };
  };
  const p = sweep(powder, 'Pf_kg_m3');
  const bd = sweep(burden, 'B_over_D');
  const F = b ? facts(b) : null;
  const classical = F?.site('kuznetsov') ?? null;
  const classicalInterval = F?.interval('kuznetsov');
  return (
    <DocSection
      title={{ en: 'How do the predictions respond to the design levers?', es: '¿Cómo responden las predicciones a las palancas del diseño?' }}
      area="question"
      refs={EXPERIMENTS_REFS['e-response']}
    >
      <p>
        {t(
          'An engineer does not choose a burden or a spacing on its own, but a point in the plane of both. The map computes in your browser the classical equation’s P80, with the two-parameter curve, for every combination of burden over diameter and spacing over burden inside the corpus envelope, with the other ratios at their central values; the white line marks the designs that deliver the target P80.',
          'Un ingeniero no elige un bordo o un espaciamiento por separado, sino un punto en el plano de los dos. El mapa calcula en su navegador el P80 de la ecuación clásica con la curva de dos parámetros para cada combinación de bordo sobre diámetro y espaciamiento sobre bordo dentro de la envolvente del corpus, con las demás razones en su valor central; la línea blanca marca los diseños que entregan el P80 objetivo.',
        )}{' '}
        <Cite id="kuznetsov1973" />
      </p>
      <ResponseHeatmap />
      <Equation
        tex={String.raw`P_{80}(B/D,\,S/B) = x_{50}\,\left(\frac{-\ln 0.2}{\ln 2}\right)^{1/n},\qquad x_{50},\ n\ \text{from the reconstructed pattern}`}
        caption={t(
          'The P80 of the two-parameter curve, from the design’s mean size x50 and uniformity index n.',
          'El P80 de la curva de dos parámetros, a partir del tamaño medio x50 y del índice de uniformidad n del diseño.',
        )}
      />
      <p>
        {t(
          'The two synthetic sweeps move one lever alone and compare every arm along the same path. No synthetic blast has a measurement, so a response is shown rather than a score. More explosive must predict finer rock and a wider burden coarser rock; an arm that inverts the sign has a problem, and the product’s tests check it for the classical arms.',
          'Los dos barridos sintéticos mueven una sola palanca y comparan a todos los brazos sobre el mismo recorrido. Ningún tiro sintético tiene medición, así que se muestra una respuesta y no un puntaje. Más explosivo debe predecir roca más fina y un bordo mayor, roca más gruesa; un brazo que invierta el signo tiene un problema, y las pruebas del producto lo comprueban para los brazos clásicos.',
        )}{' '}
        <Cite id="hudaverdi2010" />
      </p>
      {p ? (
        <>
          <h3>{t('Powder factor', 'Factor de carga')}</h3>
          <LineChart x={p.x} series={p.series} xLabel={t('powder factor, kg/m³', 'factor de carga, kg/m³')} yLabel={t('predicted x50', 'x50 predicho')} height={280} legend xTickFormat={(v) => num(v, 2)} yTickFormat={(v) => num(v, 1)} valueFormat={(v) => formatSize(v)} />
        </>
      ) : (
        <Loading es={es} />
      )}
      {bd ? (
        <>
          <h3>{t('Burden over hole diameter', 'Bordo sobre diámetro')}</h3>
          <LineChart x={bd.x} series={bd.series} xLabel="B/D" yLabel={t('predicted x50', 'x50 predicho')} height={280} legend xTickFormat={(v) => num(v, 1)} yTickFormat={(v) => num(v, 1)} valueFormat={(v) => formatSize(v)} />
        </>
      ) : (
        <Loading es={es} />
      )}
      <p>
        {t(
          'The arms do not answer a lever in the same way, and the shape of the answer is a property of the method. The classical equation and the published regression are smooth power laws of the ratios, so a lever moves them continuously and monotonically. The trees and the stacked ensemble are piecewise constant in every input, so along a sweep they step between the values their training blasts support, and the network bends where its hidden units saturate. A step is therefore not a physical threshold, and a response outside the training envelope is a statement about the method.',
          'Los brazos no responden a una palanca de la misma manera, y la forma de la respuesta es una propiedad del método. La ecuación clásica y la regresión publicada son leyes de potencia suaves de las razones, así que una palanca las mueve de forma continua y monótona. Los árboles y el ensamble apilado son constantes por tramos en cada entrada, así que a lo largo de un barrido saltan entre los valores que sostienen sus tiros de entrenamiento, y la red se curva donde sus unidades ocultas se saturan. Un salto no es entonces un umbral físico, y una respuesta fuera de la envolvente de entrenamiento es una afirmación sobre el método.',
        )}
      </p>
      <Callout variant="honest" title={t('What the map does not say', 'Lo que el mapa no dice')}>
        {t(
          `It is the response of an equation with a rock factor you choose, not a prediction validated for a mine. The classical equation explains ${f(classical)} of the variance across sites on this corpus, and its site-resampled interval runs ${iv(classicalInterval)}; how it responds to the pattern is what the map shows, not how accurate it is.`,
          `Es la respuesta de una ecuación con un factor de roca elegido por usted, no una predicción validada para una mina. La ecuación clásica explica ${f(classical)} de la varianza entre sitios en este corpus, y su intervalo por remuestreo de sitios va de ${iv(classicalInterval, 2, true)}; su forma de responder a la malla es lo que el mapa muestra, no su exactitud.`,
        )}
      </Callout>
    </DocSection>
  );
}
