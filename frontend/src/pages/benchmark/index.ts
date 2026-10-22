/**
 * The six topics of the Benchmark page, each the leaf panel of a sub-tab (ADR-0017 section 2.1; at most six peers,
 * ADR-0071 rule 5). The areas each topic carries, in the order of its sections: the verdict is the caveat and the results;
 * the arms are results twice and the comparison; the published reproductions are the comparison and a robustness curve; the
 * robustness topic is the protocol-sensitivity curve; the live check is the panel; the provenance is two tables.
 */

import type { ComponentType } from 'react';

import Arms from './Arms';
import Live from './Live';
import Provenance from './Provenance';
import Published from './Published';
import Robustness from './Robustness';
import type { TopicData } from './shared';
import Verdict from './Verdict';

export type { TopicData } from './shared';

export interface Topic {
  id: string;
  label: { en: string; es: string };
  /** The areas of the topic's sections, in order. */
  areas: string[];
  Body: ComponentType<TopicData>;
}

export const TOPICS: Topic[] = [
  { id: 'verdict', label: { en: 'The verdict', es: 'El veredicto' }, areas: ['caveat', 'results'], Body: Verdict },
  { id: 'arms', label: { en: 'Every arm', es: 'Cada predictor' }, areas: ['results', 'results', 'comparison'], Body: Arms },
  { id: 'published', label: { en: 'Published reproductions', es: 'Reproducciones publicadas' }, areas: ['comparison', 'robustness'], Body: Published },
  { id: 'robustness', label: { en: 'Robustness', es: 'Robustez' }, areas: ['robustness'], Body: Robustness },
  { id: 'live', label: { en: 'Live check', es: 'Comprobación en vivo' }, areas: ['live'], Body: Live },
  { id: 'provenance', label: { en: 'Provenance', es: 'Procedencia' }, areas: ['provenance', 'provenance'], Body: Provenance },
];
