/**
 * Implementation: how every number on this site is produced, where it runs and what checks it. A DocPage of twelve
 * topics in four groups, each topic a DocSection that declares the area of ADR-0017 section 2.1 it covers (architecture,
 * the contracts, four engine topics and the live closed forms, the lanes, reproducibility, the leakage guards and the
 * deploy), each with its text in both languages, its equations with captions, its figure or table, its callout and its
 * references. The topics live in ./implementation/, one file each.
 */

import { DocPage, TabGroups, useShellLang } from '@fasl-work/caos-app-shell';
import type { TabGroupDef } from '@fasl-work/caos-app-shell';

import { useBenchmark, useIndex } from '../lib/facts';
import { GROUPS, TOPICS } from './implementation/topics';

export default function Implementation() {
  const es = useShellLang() === 'es';
  const b = useBenchmark();
  const index = useIndex();
  const lang = es ? 'es' : 'en';
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
      title={{ en: 'Implementation', es: 'Implementación' }}
      lede={
        es
          ? 'Cómo se produce cada número de este sitio, dónde corre y qué lo verifica. Nada se calcula al desplegar: un horneado sin conexión, con versiones fijadas, escribe artefactos direccionados por contenido, y el navegador los reproduce y recalcula en vivo las ecuaciones y los modelos ajustados cuando usted cambia un diseño, atado por pruebas a los números horneados. La ciencia vive en un paquete aparte que este producto fija y consume.'
          : 'How every number on this site is produced, where it runs and what checks it. Nothing is computed at deploy time: an offline bake against pinned versions writes content-addressed artifacts, and the browser replays them and recomputes the equations and the fitted models live when you change a design, held by tests to the baked numbers. The science lives in a separate package this product pins and consumes.'
      }
    >
      <TabGroups groups={groups} ariaLabel={es ? 'temas de implementación' : 'implementation topics'} />
    </DocPage>
  );
}
