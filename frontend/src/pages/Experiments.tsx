/**
 * Experiments: the questions, the exact metrics, the protocol, the datasets and the cases, and what the benchmark
 * answers about transfer to a new site, the protocol, each site, the design levers and the diagnostics. A DocPage of
 * eight topics in two groups, each topic a DocSection that declares the area of ADR-0017 section 2.1 it covers (metrics,
 * protocol, datasets, and five questions), with its text in both languages, its equations with captions, its figure or
 * table, its callout and its references. The topics live in ./experiments/, one file each. Benchmark asks which model to
 * trust; this page shows how the experiment that answers it was built and how it behaves.
 */

import { DocPage, TabGroups, useShellLang } from '@fasl-work/caos-app-shell';
import type { TabGroupDef } from '@fasl-work/caos-app-shell';
import { Link } from 'react-router';

import { useBenchmark, useIndex } from '../lib/facts';
import { notAvailable } from '../lib/format';
import { GROUPS, TOPICS } from './experiments/topics';

export default function Experiments() {
  const es = useShellLang() === 'es';
  const b = useBenchmark();
  const index = useIndex();
  const lang = es ? 'es' : 'en';
  const n = index?.n_cases ?? notAvailable();
  const groups: TabGroupDef[] = GROUPS.map((g) => ({
    id: g.id,
    label: g.label[lang],
    tabs: TOPICS.filter((topic) => topic.group === g.id).map(({ id, label, Component }) => ({
      id,
      label: label[lang],
      content: <Component es={es} b={b} index={index} />,
    })),
  }));
  return (
    <DocPage
      title={{ en: 'Experiments', es: 'Experimentos' }}
      lede={
        <>
          {es
            ? `Cómo se construyó el experimento que responde qué modelo merece confianza: las métricas exactas con sus constantes, el protocolo con datos retenidos y la fuga que descarta, los conjuntos de datos y los ${n} casos con su clase de redistribución y su estado, y cinco preguntas con su respuesta leída del benchmark: llegar a un sitio que no vio, cuánto depende el puntaje del protocolo, cómo se comporta cada sitio, cómo responde el diseño a sus palancas y qué dicen los diagnósticos. Los puntajes finales están en `
            : `How the experiment that answers which model deserves trust was built: the exact metrics with their constants, the held-out protocol and the leakage it rules out, the datasets and the ${n} cases with their redistribution class and status, and five questions with their answers read from the benchmark: reaching a site it has not seen, how much the score depends on the protocol, how each site behaves, how the design responds to its levers and what the diagnostics say. The final scores are on `}
          <Link to="/benchmark">Benchmark</Link>.
        </>
      }
    >
      <TabGroups groups={groups} ariaLabel={es ? 'temas de experimentos' : 'experiment topics'} />
    </DocPage>
  );
}
