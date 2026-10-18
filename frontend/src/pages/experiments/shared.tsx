/**
 * What every topic of the Experiments page shares: its props, the registry entry it is listed by and the language
 * picker. A topic is a leaf panel of the page (one top-level group's sub-tab); it holds one `DocSection`, which declares
 * the area of ADR-0017 section 2.1 it covers.
 */

import type { ReactElement } from 'react';

import { ARM_BY_ID } from '../../lib/artifacts';
import type { BenchmarkArtifact, CaseIndex, Lang } from '../../lib/contract.types';

/** What a topic reads: the language, the benchmark and the case index (each null until the committed document loads). */
export interface TopicProps {
  es: boolean;
  b: BenchmarkArtifact | null;
  index: CaseIndex | null;
}

/** The four areas of the Experiments page (the shell's `DOC_AREAS['/experiments']`). */
export type Area = 'question' | 'metrics' | 'protocol' | 'datasets';

export interface Bi {
  en: string;
  es: string;
}

export interface TopicSpec {
  id: string;
  /** The id of the top-level group the topic sits in. */
  group: string;
  label: Bi;
  /** The areas its sections declare, as the gate reads them. */
  areas: Area[];
  /** The key of the topic's reference list in `data/citations/experiments.ts`. */
  refsKey: string;
  Component: (props: TopicProps) => ReactElement;
}

/** The picker of the interface language: `tr(es)(english, spanish)`. */
export const tr = (es: boolean) => (en: string, sp: string) => (es ? sp : en);

/** The loading line a chart or a table shows until its committed document has loaded (never an empty chart). */
export function Loading({ es }: { es: boolean }) {
  return <div className="fr-loading">{es ? 'Cargando' : 'Loading'}</div>;
}

/** The interface label of an arm, or its id when the registry does not know it. */
export const armLabel = (arm: string, lang: Lang) => ARM_BY_ID.get(arm)?.label[lang] ?? arm;
