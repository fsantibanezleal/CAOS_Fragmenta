/**
 * Benchmark: across every blast there is, which model is worth trusting, with how much uncertainty. Six topics on the
 * shell's DocPage and SubTabs, each its `DocSection`s with their area (ADR-0017 section 2.1): the verdict with its limits, every
 * arm and the comparison on common rows, the published reproductions, robustness, the live check and the provenance. The
 * topics live in `benchmark/`.
 *
 * Every number on this page is read from the committed benchmark artifact or computed live in the browser from the
 * committed model files. The verdict leads, on both row sets it depends on.
 */

import { DocPage, SubTabs, useShellLang } from '@fasl-work/caos-app-shell';
import type { SubTabDef } from '@fasl-work/caos-app-shell';

import { facts, useBenchmark, useModels } from '../lib/facts';
import { TOPICS, type TopicData } from './benchmark/index';

/** The page once the benchmark has loaded; the models file may still be on its way (the live check says so). */
export function BenchmarkPage({ b, corpus }: TopicData) {
  const es = useShellLang() === 'es';
  const tabs: SubTabDef[] = TOPICS.map(({ id, label, Body }) => ({
    id,
    label: es ? label.es : label.en,
    content: <Body b={b} corpus={corpus} />,
  }));
  return (
    <DocPage
      title={{ en: 'Benchmark', es: 'Benchmark' }}
      lede={
        es
          ? `Los mismos ${facts(b).nBlasts} tiros, los mismos predictores y tres formas de partirlos: cien sorteos aleatorios, cien deduplicados y diez retenciones de campaña completa con un intervalo por remuestreo de sitios. Cada número sale del artefacto comprometido o se recalcula en su navegador desde los modelos comprometidos. El veredicto va primero, sobre los dos conjuntos de filas de los que depende.`
          : `The same ${facts(b).nBlasts} blasts, the same arms and three ways of splitting them: a hundred random draws, a hundred deduplicated draws and ten whole-campaign hold-outs with a site-resampled interval. Every number comes from the committed artifact or is recomputed in your browser from the committed models. The verdict leads, on the two row sets it depends on.`
      }
    >
      <SubTabs tabs={tabs} ariaLabel={es ? 'secciones del benchmark' : 'benchmark sections'} orientation="vertical" />
    </DocPage>
  );
}

export default function Benchmark() {
  const es = useShellLang() === 'es';
  const b = useBenchmark();
  const corpus = useModels('corpus');
  if (!b) return <div className="page-body fr-loading">{es ? 'Cargando' : 'Loading'}</div>;
  return <BenchmarkPage b={b} corpus={corpus} />;
}
