/**
 * Topic 4, robustness: how far a score moves from draw to draw of a random split, and the gap between a random split and
 * a campaign held out. The sorted draws are the page's protocol-sensitivity curve (area `robustness`, a chart); the
 * histogram, the readout and the gap table read the same committed draws.
 */

import { Cite, DocSection, Equation, Figure, useShellLang } from '@fasl-work/caos-app-shell';
import { useState } from 'react';

import { SECTION_REFS } from '../../data/citations';
import { f, facts } from '../../lib/facts';
import { notAvailable, num, signed } from '../../lib/format';
import { Lines, type LineSpec } from '../../viz/plots';
import { DrawHistogram } from '../../viz/Evidence';
import { label, ORDER, tr, type TopicData } from './shared';

export default function Robustness({ b }: TopicData) {
  const lang = useShellLang();
  const es = lang === 'es';
  const t = tr(es);
  const F = facts(b);
  const [arm, setArm] = useState('stacking');
  const [protocol, setProtocol] = useState<'random' | 'dedup'>('random');
  const block = protocol === 'random' ? F.random(arm) : F.dedup(arm);
  const published = protocol === 'random' ? b.verdict.published_random_split_figures[arm]?.published : undefined;
  const arms = ORDER.filter((a) => a !== 'null' && F.random(a));
  const draws = block ? block.draws.filter((d): d is number => d !== null) : [];
  const drawn = [...draws].sort((x, y) => x - y);
  const stacking = b.verdict.published_random_split_figures.stacking;
  const seed0 = F.random('null')?.seed0;
  const testRows = seed0 ? seed0.n_scored + seed0.n_abstained : null;
  const kernelShift = Math.max(...['random-forest', 'xgboost', 'stacking', 'svr-rbf', 'svr-poly'].map((a) => Math.abs(b.verdict.dedup_minus_random_median[a] ?? 0)));
  const gapArms = ORDER.filter((a) => a !== 'null' && b.verdict.protocol_gap_random_minus_grouped[a] !== undefined);
  const series: LineSpec[] = block
    ? [
        { id: 'draws', label: t('the draws, sorted', 'los sorteos, ordenados'), values: drawn },
        { id: 'median', label: t('median', 'mediana'), values: drawn.map(() => block.repeats.median ?? null), dashed: true },
        { id: 'site', label: t('site held out', 'sitio excluido'), values: drawn.map(() => F.site(arm)), dashed: true },
        ...(published !== undefined ? [{ id: 'published', label: t('published, one draw', 'publicado, un sorteo'), values: drawn.map(() => published), dashed: true }] : []),
      ]
    : [];
  return (
    <DocSection title={{ en: 'Robustness: how far a score moves from draw to draw', es: 'Robustez: cuánto se mueve un puntaje de sorteo a sorteo' }} area="robustness" refs={SECTION_REFS['b-robustness']}>
      <p>
        {t(
          `A single draw of ${testRows ?? notAvailable()} test rows does not measure a protocol. The histogram shows an arm’s hundred draws, with their median, the score with each site held out and, where there is one, the figure the source published from a single draw; the curve below it is the same draws sorted, so the spread reads as a slope.`,
          `Un solo sorteo de ${testRows ?? notAvailable()} filas de prueba no mide un protocolo. El histograma muestra los cien sorteos de un brazo, con su mediana, el puntaje con cada sitio excluido y, donde existe, la cifra que la fuente publicó de un único sorteo; la curva de abajo son los mismos sorteos ordenados, de modo que la dispersión se lee como una pendiente.`,
        )}{' '}
        <Cite id="sui2025" />
      </p>
      <div className="fr-inline-controls">
        <label className="fr-control">
          {t('Arm', 'Brazo')}
          <select value={arm} onChange={(e) => setArm(e.target.value)}>
            {arms.map((a) => (
              <option key={a} value={a}>{label(a, lang)}</option>
            ))}
          </select>
        </label>
        <label className="fr-control">
          {t('Protocol', 'Protocolo')}
          <select value={protocol} onChange={(e) => setProtocol(e.target.value as 'random' | 'dedup')}>
            <option value="random">{t('random 80/20', 'aleatorio 80/20')}</option>
            <option value="dedup">{t('deduplicated', 'deduplicado')}</option>
          </select>
        </label>
      </div>
      {block ? (
        <>
          <Figure
            caption={t(
              `The ${block.draws.length} draws of ${label(arm, 'en')} under the ${protocol === 'random' ? 'random 80/20' : 'deduplicated'} protocol, binned by variance explained, with the median of the draws, the pooled score with each site held out and, where the source reports one, its figure from a single split.`,
              `Los ${block.draws.length} sorteos de ${label(arm, 'es')} bajo el protocolo ${protocol === 'random' ? 'aleatorio 80/20' : 'deduplicado'}, agrupados por varianza explicada, con la mediana de los sorteos, el puntaje agrupado con cada sitio excluido y, donde la fuente informa uno, su cifra de una sola partición.`,
            )}
          >
            <DrawHistogram
              draws={draws}
              marks={[
                { value: block.repeats.median, label: t('median', 'mediana'), colour: 'accent' },
                { value: F.site(arm), label: t('site held out', 'sitio excluido'), colour: 'warn' },
                ...(published !== undefined ? [{ value: published, label: t('published', 'publicado'), colour: 'bad' as const }] : []),
              ]}
            />
          </Figure>
          <Lines
            x={drawn.map((_, i) => i + 1)}
            series={series}
            xLabel={t('draw, sorted by score', 'sorteo, ordenado por puntaje')}
            yLabel={t('variance explained', 'varianza explicada')}
            height={240}
            zeroLine
            xFormat={{ decimals: 0 }}
            xText={(v) => `#${Math.round(v)}`}
            solo
            valueText={(v) => f(v)}
          />
        </>
      ) : null}
      <p>
        {t(
          `For the stacked ensemble the median is ${f(F.random('stacking')?.r2_identity)} and the 95th percentile ${f(F.random('stacking')?.repeats.p95)}; the published ${f(stacking?.published)} lies above ${num((stacking?.share_of_draws_below ?? 0) * 100, 0)} of 100 draws. For the classical arm, the draws run from ${f(F.random('kuznetsov')?.repeats.p05, 2)} to ${f(F.random('kuznetsov')?.repeats.p95, 2)} between the 5th and 95th percentiles: a single draw can land on either side of zero, and seed 0 landed below it.`,
          `Para el ensamble apilado la mediana es ${f(F.random('stacking')?.r2_identity)} y el percentil 95, ${f(F.random('stacking')?.repeats.p95)}; el ${f(stacking?.published)} publicado queda por encima de ${num((stacking?.share_of_draws_below ?? 0) * 100, 0)} de cada 100 sorteos. Para el brazo clásico, los sorteos van de ${f(F.random('kuznetsov')?.repeats.p05, 2)} a ${f(F.random('kuznetsov')?.repeats.p95, 2)} entre los percentiles 5 y 95: un único sorteo puede caer a cualquier lado de cero, y la semilla 0 cayó bajo cero.`,
        )}
      </p>
      <Equation
        tex={String.raw`\Delta_a = \operatorname{median}_{r=1,\dots,100}\, R²_{a,r} - R^2_{\mathrm{LOSO}}(a)`}
        caption={t(
          'The protocol gap of an arm a: the median over the hundred random 80/20 draws r of the variance explained R²_{a,r}, minus the pooled score of the same arm with one campaign held out at a time, R²_LOSO(a). A positive gap is what a random split promises and a campaign hold-out does not deliver.',
          'La brecha de protocolo de un brazo a: la mediana, sobre los cien sorteos aleatorios r 80/20, de la varianza explicada R²_{a,r}, menos el puntaje agrupado del mismo brazo con una campaña retenida a la vez, R²_LOSO(a). Una brecha positiva es lo que promete una partición aleatoria y una retención de campaña no cumple.',
        )}
      />
      <p>
        {t(
          `Taken over the learned arms, the median gap is ${f(b.verdict.median_protocol_gap)}. The table lists it for each arm, with the change the deduplicated draws make to the random median: removing the repeated input vectors moves the forest, boosting, stacking and kernel arms by at most ${f(kernelShift)}, and the published network, at ${signed(b.verdict.dedup_minus_random_median['published-neural-net'])}, by the most. The polynomial support vector and the refitted regression show the largest gaps because they fail under the campaign hold-out, at ${f(F.site('svr-poly'))} and ${f(F.site('refitted-regression'))}, not because they excel on the random draws.`,
          `Tomada sobre los brazos aprendidos, la brecha mediana es ${f(b.verdict.median_protocol_gap)}. La tabla la da para cada brazo, con el cambio que hacen los sorteos deduplicados a la mediana aleatoria: quitar los vectores de entrada repetidos mueve al bosque, la potenciación, el apilado y los brazos de núcleos en ${f(kernelShift)} como máximo, y a la red publicada, con ${signed(b.verdict.dedup_minus_random_median['published-neural-net'])}, en lo máximo. El vector de soporte polinomial y la regresión reajustada muestran las mayores brechas porque fallan con la retención de campaña, con ${f(F.site('svr-poly'))} y ${f(F.site('refitted-regression'))}, no porque destaquen en los sorteos aleatorios.`,
        )}{' '}
        <Cite id="roberts2017" />
      </p>
      <table className="fr-table">
        <thead>
          <tr>
            <th>{t('arm', 'brazo')}</th>
            <th>{t('random median', 'mediana aleatoria')}</th>
            <th>{t('deduplicated minus random', 'deduplicado menos aleatorio')}</th>
            <th>{t('random minus held out by site', 'aleatorio menos sitio excluido')}</th>
          </tr>
        </thead>
        <tbody>
          {gapArms.map((a) => (
            <tr key={a}>
              <td>{label(a, lang)}</td>
              <td>{f(F.random(a)?.r2_identity)}</td>
              <td>{signed(b.verdict.dedup_minus_random_median[a])}</td>
              <td>{signed(b.verdict.protocol_gap_random_minus_grouped[a])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DocSection>
  );
}
